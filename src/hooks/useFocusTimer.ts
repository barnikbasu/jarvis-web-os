/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { soundEffects } from '../services/soundEffects';
import { PomodoroMode, PomodoroSessionRecord } from '../types/jarvis';

export const MODE_DURATIONS: Record<PomodoroMode, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export function useFocusTimer(onLogAction?: (action: string) => void) {
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.work);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<PomodoroSessionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_pomodoro_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Synchronize sound effects
  useEffect(() => {
    soundEffects.enabled = soundEnabled;
  }, [soundEnabled]);

  // Persist history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_pomodoro_history', JSON.stringify(history));
    }
  }, [history]);

  // Interval ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            soundEffects.playTimerChime();

            // Record completed session
            const record: PomodoroSessionRecord = {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mode,
              durationMinutes: Math.round(MODE_DURATIONS[mode] / 60),
            };
            setHistory(h => [record, ...h.slice(0, 19)]);

            if (mode === 'work') {
              const nextCount = sessionCount + 1;
              setSessionCount(nextCount);
              // Switch to break
              const nextMode: PomodoroMode = nextCount % 4 === 0 ? 'long_break' : 'short_break';
              setMode(nextMode);
              setTimeLeft(MODE_DURATIONS[nextMode]);
              if (onLogAction) {
                onLogAction(`deep work cycle complete. ${nextMode === 'long_break' ? 'long break (15m)' : 'short break (5m)'} queued.`);
              }
            } else {
              // Return to work
              setMode('work');
              setTimeLeft(MODE_DURATIONS.work);
              if (onLogAction) {
                onLogAction('break concluded. ready for deep work cycle.');
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, sessionCount, onLogAction]);

  const toggleTimer = useCallback(() => {
    setIsRunning(prev => {
      const next = !prev;
      soundEffects.playTimerChime();
      if (onLogAction) {
        onLogAction(next ? `focus motor started: ${mode.replace('_', ' ')}.` : 'focus motor paused.');
      }
      return next;
    });
  }, [mode, onLogAction]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
    soundEffects.playPinchClick();
    if (onLogAction) {
      onLogAction(`focus motor reset to ${Math.round(MODE_DURATIONS[mode] / 60)}m.`);
    }
  }, [mode, onLogAction]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      setMode(newMode);
      setTimeLeft(MODE_DURATIONS[newMode]);
      soundEffects.playPinchClick();
      if (onLogAction) {
        onLogAction(`mode switched -> ${newMode.replace('_', ' ')} (${Math.round(MODE_DURATIONS[newMode] / 60)}m).`);
      }
    },
    [onLogAction]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jarvis_pomodoro_history');
    }
  }, []);

  return {
    mode,
    timeLeft,
    isRunning,
    sessionCount,
    history,
    soundEnabled,
    setSoundEnabled,
    toggleTimer,
    resetTimer,
    switchMode,
    clearHistory,
    totalDuration: MODE_DURATIONS[mode],
  };
}
