/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { PomodoroMode } from '../types/jarvis';

interface FocusMotorPanelProps {
  timer: ReturnType<typeof useFocusTimer>;
}

export const FocusMotorPanel: React.FC<FocusMotorPanelProps> = ({ timer }) => {
  const {
    mode,
    timeLeft,
    isRunning,
    sessionCount,
    history,
    toggleTimer,
    resetTimer,
    switchMode,
    totalDuration,
  } = timer;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.`;

  const elapsedPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalDuration - timeLeft) / totalDuration) * 100))
  );

  // Calculate 4-segment completion
  const segmentsFilled = Math.min(
    4,
    Math.floor((elapsedPercent / 100) * 4) + (elapsedPercent > 0 ? 1 : 0)
  );

  const getModeLabel = (m: PomodoroMode) => {
    switch (m) {
      case 'work':
        return 'deep work.';
      case 'short_break':
        return 'short break [5m].';
      case 'long_break':
        return 'long break [15m].';
    }
  };

  return (
    <div className="w-full rounded-lg bg-[#121212] border border-[#202020] p-4 flex flex-col justify-between font-mono select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between text-[11px] text-[#666666] mb-2">
        <div className="flex items-center gap-1.5 text-[#888888]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>focus motor.</span>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <span className="text-[10px] text-[#555555]">
              {history.length} done
            </span>
          )}
          <span className="text-[#555555]">cycle 0{sessionCount}/04</span>
        </div>
      </div>

      {/* Mode Selector Tabs (work / 5m break / 15m break) */}
      <div className="flex items-center gap-1 mb-2.5">
        {(['work', 'short_break', 'long_break'] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-2 py-0.5 rounded text-[10px] lowercase transition cursor-pointer ${
              mode === m
                ? 'bg-[#222222] text-[#EDEDE9] font-medium border border-[#333333]'
                : 'text-[#666666] hover:text-[#999999]'
            }`}
          >
            {m === 'work' ? 'work' : m === 'short_break' ? '5m break' : '15m break'}
          </button>
        ))}
      </div>

      {/* Big Timer Digits & Elapsed Badge */}
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-poppins text-4xl sm:text-5xl font-bold tracking-tight text-[#EDEDE9]">
          {formattedTime}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-[#EDEDE9]">{elapsedPercent}%</div>
          <div className="text-[9px] text-[#666666] uppercase tracking-wider">ELAPSED</div>
        </div>
      </div>

      {/* Sub-label */}
      <div className="text-[11px] text-[#777777] mb-3">{getModeLabel(mode)}</div>

      {/* 4-Segment Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 mb-4">
        {[0, 1, 2, 3].map(idx => (
          <div
            key={idx}
            className={`rounded-xs transition-colors duration-300 ${
              idx < segmentsFilled ? 'bg-[#EDEDE9]' : 'bg-[#202020]'
            }`}
          />
        ))}
      </div>

      {/* 3 Action Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Start button */}
        <button
          onClick={toggleTimer}
          className={`py-2 rounded font-mono text-xs transition cursor-pointer text-center ${
            !isRunning
              ? 'bg-[#EDEDE9] hover:bg-white text-[#090909] font-medium'
              : 'bg-[#181818] hover:bg-[#202020] text-[#888888] border border-[#242424]'
          }`}
        >
          start.
        </button>

        {/* Pause button */}
        <button
          onClick={toggleTimer}
          className={`py-2 rounded font-mono text-xs transition cursor-pointer text-center ${
            isRunning
              ? 'bg-[#EDEDE9] hover:bg-white text-[#090909] font-medium'
              : 'bg-[#181818] hover:bg-[#202020] text-[#888888] border border-[#242424]'
          }`}
        >
          pause.
        </button>

        {/* Reset button */}
        <button
          onClick={resetTimer}
          className="py-2 rounded bg-[#181818] hover:bg-[#202020] text-[#888888] hover:text-[#EDEDE9] border border-[#242424] font-mono text-xs transition cursor-pointer text-center"
        >
          reset.
        </button>
      </div>

      {/* Gesture Bind Legend */}
      <div className="text-[10px] text-[#666666] tracking-tight">
        gesture bind: <span className="text-[#888888]">fist hold [1.5s] to pause / resume.</span>
      </div>
    </div>
  );
};
