/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHandTracking } from './hooks/useHandTracking';
import { useFocusTimer } from './hooks/useFocusTimer';
import { HandAnalysis } from './services/gestureClassifier';
import { soundEffects } from './services/soundEffects';
import { voiceAssistant, VoiceCommandMatch } from './services/voiceAssistant';
import { ActionLogItem, ActiveTab, RecognizedGesture, SystemSettings } from './types/jarvis';
import { TopHeader } from './components/TopHeader';
import { SidebarRail } from './components/SidebarRail';
import { HeroMasthead } from './components/HeroMasthead';
import { OpticalBenchViewport } from './components/OpticalBenchViewport';
import { GestureInstrumentRack } from './components/GestureInstrumentRack';
import { FocusMotorPanel } from './components/FocusMotorPanel';
import { GestureMatrixPanel } from './components/GestureMatrixPanel';
import { ActivityLogTerminal } from './components/ActivityLogTerminal';
import { PresentationViewer } from './components/PresentationViewer';
import { StudyWorkspace } from './components/StudyWorkspace';
import { VirtualCursor } from './components/VirtualCursor';
import { SettingsModal } from './components/SettingsModal';
import { QuickLauncherModal } from './components/QuickLauncherModal';

const DEFAULT_SETTINGS: SystemSettings = {
  gestureControlEnabled: true,
  sensitivity: 1.8,
  smoothing: 0.75,
  pinchThreshold: 0.07,
  cooldownMs: 900,
  soundEffects: true,
  reachMultiplier: 1.5,
  showVirtualCursor: true,
  showSkeleton: true,
  cameraFacingMode: 'user',
  dwellClickEnabled: false,
  dwellDurationMs: 1000,
  twoFingerScrollEnabled: true,
  scrollSensitivity: 1.5,
  faceTrackingEnabled: true,
  faceAutoStandby: false,
  faceStandbyDelaySec: 5,
  headGesturesEnabled: true,
  twoHandZoomEnabled: true,
  voiceControlEnabled: false,
  gestureActions: {
    OPEN_PALM: 'TOGGLE_SYSTEM',
    POINTING: 'CURSOR_MOVE',
    PINCH: 'CLICK_SELECT',
    PEACE_SIGN: 'SLIDE_NAV',
    THUMBS_UP: 'OPEN_WORKSPACE',
    FIST: 'TOGGLE_TIMER',
    TWO_FINGER_SCROLL: 'SCROLL_PAGE',
    BOTH_PALMS: 'HANDS_FREE_TOGGLE',
    HEAD_NOD: 'CONFIRM_ACTION',
    HEAD_SHAKE: 'CANCEL_ACTION',
  },
};

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_settings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [systemActive, setSystemActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('gesture');
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [lastDispatchedAction, setLastDispatchedAction] = useState<string>('payload dragged to slot 02.');
  const [presentationZoomScale, setPresentationZoomScale] = useState<number>(1.0);
  const [headActionTag, setHeadActionTag] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  // Slide navigation trigger for presentation
  const [slideNavTrigger, setSlideNavTrigger] = useState<{
    direction: 'next' | 'prev';
    timestamp: number;
  } | null>(null);

  // Gesture cooldown management
  const lastGestureActionRef = useRef<number>(0);
  const lastTriggeredGestureRef = useRef<string>('NONE');

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_settings', JSON.stringify(newSettings));
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jarvis_settings');
    }
    soundEffects.playPinchClick();
  };

  // Add item to Activity Log Terminal
  const addActionLog = useCallback(
    (
      action: string,
      gesture: ActionLogItem['gesture'],
      category: ActionLogItem['category'] = 'IO',
      highlight = false,
      source: ActionLogItem['source'] = 'GESTURE'
    ) => {
      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      const newItem: ActionLogItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: timeStr,
        category,
        action,
        gesture,
        source,
        highlight,
      };
      setLastDispatchedAction(action);
      setLogs(prev => [newItem, ...prev.slice(0, 49)]);
    },
    []
  );

  // Shared Focus Timer hook
  const focusTimer = useFocusTimer(
    useCallback(
      (msg: string) => {
        addActionLog(msg.toLowerCase(), 'FIST', 'EXEC');
      },
      [addActionLog]
    )
  );

  // Handle Virtual Pinch & Dwell Click
  const handlePinchClick = useCallback(
    (clientX: number, clientY: number) => {
      if (!settings.gestureControlEnabled || !systemActive) return;

      soundEffects.playPinchClick();

      const targetElement = document.elementFromPoint(clientX, clientY);
      if (targetElement) {
        const clickable =
          targetElement.closest<HTMLElement>(
            'button, a, input, textarea, select, [role="button"], [tabindex]'
          ) || (targetElement as HTMLElement);

        const elementDescription =
          clickable.getAttribute('aria-label') ||
          clickable.getAttribute('title') ||
          clickable.textContent?.trim().slice(0, 20) ||
          clickable.tagName.toLowerCase();

        addActionLog(`pinch dispatched -> #${elementDescription}`, 'PINCH', 'EXEC', true);

        try {
          const eventInit: MouseEventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX,
            clientY,
          };
          clickable.dispatchEvent(new PointerEvent('pointerdown', eventInit));
          clickable.dispatchEvent(new MouseEvent('mousedown', eventInit));
          clickable.dispatchEvent(new PointerEvent('pointerup', eventInit));
          clickable.dispatchEvent(new MouseEvent('mouseup', eventInit));
          clickable.click();
          clickable.focus();
        } catch (e) {
          console.warn('Click dispatch error:', e);
        }
      } else {
        addActionLog(`pinch at [x:${Math.round(clientX)} y:${Math.round(clientY)}]`, 'PINCH', 'EXEC');
      }
    },
    [settings.gestureControlEnabled, systemActive, addActionLog]
  );

  // Handle Hand Scrolling (index/middle finger vertical movement)
  const handleScroll = useCallback(
    (deltaY: number) => {
      if (!settings.twoFingerScrollEnabled || !systemActive) return;
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollBy({ top: deltaY, behavior: 'auto' });
      } else {
        window.scrollBy({ top: deltaY, behavior: 'auto' });
      }
    },
    [settings.twoFingerScrollEnabled, systemActive]
  );

  // Handle Two-Hand gestures (Both palms, pinch/spread zoom)
  const handleTwoHandGesture = useCallback(
    (gesture: RecognizedGesture, zoomDelta: number) => {
      if (!settings.gestureControlEnabled) return;

      const now = performance.now();
      if (now - lastGestureActionRef.current < 800 && gesture === 'BOTH_PALMS') return;

      if (gesture === 'BOTH_PALMS') {
        lastGestureActionRef.current = now;
        setSystemActive(prev => {
          const next = !prev;
          soundEffects.playSystemToggle(next);
          addActionLog(
            next ? 'both open palms -> hands-free mode engaged.' : 'both open palms -> hands-free link standby.',
            'BOTH_PALMS',
            'SYNC',
            next
          );
          return next;
        });
      } else if (gesture === 'ZOOM_SPREAD') {
        if (settings.twoHandZoomEnabled) {
          setPresentationZoomScale(z => Math.min(2.0, z + Math.max(0.04, Math.abs(zoomDelta))));
          addActionLog('two-hand spread -> zoom in view.', 'ZOOM_SPREAD', 'OPTIC');
        }
      } else if (gesture === 'ZOOM_PINCH') {
        if (settings.twoHandZoomEnabled) {
          setPresentationZoomScale(z => Math.max(0.6, z - Math.max(0.04, Math.abs(zoomDelta))));
          addActionLog('two-hand pinch -> zoom out view.', 'ZOOM_PINCH', 'OPTIC');
        }
      }
    },
    [settings, addActionLog]
  );

  // Handle Head Gestures (Nod to confirm, Shake to cancel)
  const handleHeadGesture = useCallback(
    (gesture: 'HEAD_NOD' | 'HEAD_SHAKE') => {
      if (!settings.headGesturesEnabled || !systemActive) return;

      if (gesture === 'HEAD_NOD') {
        setHeadActionTag('nod: confirmed');
        setTimeout(() => setHeadActionTag(null), 1400);
        soundEffects.playTimerChime();

        // Macro action
        const action = settings.gestureActions.HEAD_NOD || 'CONFIRM_ACTION';
        if (action === 'CONFIRM_ACTION') {
          if (!focusTimer.isRunning) {
            focusTimer.toggleTimer();
            addActionLog('head nod confirmed -> focus motor cycle started.', 'HEAD_NOD', 'EXEC', true, 'HEAD');
          } else {
            addActionLog('head nod confirmed.', 'HEAD_NOD', 'EXEC', true, 'HEAD');
          }
        } else if (action === 'NEXT_SLIDE') {
          setSlideNavTrigger({ direction: 'next', timestamp: performance.now() });
          addActionLog('head nod -> advanced slide.', 'HEAD_NOD', 'OPTIC', false, 'HEAD');
        }
      } else if (gesture === 'HEAD_SHAKE') {
        setHeadActionTag('shake: cancelled');
        setTimeout(() => setHeadActionTag(null), 1400);
        soundEffects.playPinchClick();

        const action = settings.gestureActions.HEAD_SHAKE || 'CANCEL_ACTION';
        if (action === 'CANCEL_ACTION') {
          if (isLauncherOpen) {
            setIsLauncherOpen(false);
          } else if (isSettingsOpen) {
            setIsSettingsOpen(false);
          } else if (focusTimer.isRunning) {
            focusTimer.toggleTimer();
            addActionLog('head shake cancelled -> focus motor paused.', 'HEAD_SHAKE', 'EXEC', false, 'HEAD');
          } else {
            addActionLog('head shake cancelled current action.', 'HEAD_SHAKE', 'EXEC', false, 'HEAD');
          }
        } else if (action === 'STANDBY') {
          setSystemActive(false);
          addActionLog('head shake -> placed on standby.', 'HEAD_SHAKE', 'SYNC', false, 'HEAD');
        }
      }
    },
    [settings, systemActive, focusTimer, isLauncherOpen, isSettingsOpen, addActionLog]
  );

  // Handle Face Presence Changes (Auto Standby / Wake)
  const handleFacePresenceChange = useCallback(
    (present: boolean) => {
      if (!settings.faceAutoStandby) return;

      if (!present) {
        setSystemActive(false);
        soundEffects.playSystemToggle(false);
        addActionLog('operator absence detected -> automatic standby engaged.', 'NONE', 'SYNC', false);
      } else {
        setSystemActive(true);
        soundEffects.playSystemToggle(true);
        addActionLog('operator face acquired -> automatic wake engaged.', 'NONE', 'SYNC', true);
      }
    },
    [settings.faceAutoStandby, addActionLog]
  );

  // Handle gesture classification triggers
  const handleGestureTrigger = useCallback(
    (analysis: HandAnalysis) => {
      if (!settings.gestureControlEnabled || !systemActive) return;

      const now = performance.now();
      const gestureType = analysis.gesture.type;

      if (
        gestureType === 'NONE' ||
        gestureType === 'POINTING' ||
        gestureType === 'PINCH' ||
        gestureType === 'TWO_FINGER_SCROLL'
      ) {
        lastTriggeredGestureRef.current = gestureType;
        return;
      }

      if (gestureType === lastTriggeredGestureRef.current && gestureType !== 'PEACE_SIGN') {
        return;
      }

      const elapsed = now - lastGestureActionRef.current;
      if (elapsed < settings.cooldownMs) {
        return;
      }

      lastGestureActionRef.current = now;
      lastTriggeredGestureRef.current = gestureType;

      switch (gestureType) {
        case 'OPEN_PALM': {
          setSystemActive(prev => {
            const next = !prev;
            soundEffects.playSystemToggle(next);
            addActionLog(
              next ? 'gesture mode activated.' : 'gesture mode placed on standby.',
              'OPEN_PALM',
              'SYNC',
              next
            );
            return next;
          });
          break;
        }

        case 'PEACE_SIGN': {
          const dir: 'next' | 'prev' = analysis.swipeDirection === 'left' ? 'prev' : 'next';
          setSlideNavTrigger({
            direction: dir,
            timestamp: now,
          });
          if (activeTab !== 'present') {
            setActiveTab('present');
          }
          addActionLog(
            dir === 'next' ? 'slide advanced -> next.' : 'slide moved -> prev.',
            'PEACE_SIGN',
            'OPTIC'
          );
          break;
        }

        case 'THUMBS_UP': {
          setActiveTab('workspace');
          soundEffects.playPinchClick();
          addActionLog('workspace command center deployed.', 'THUMBS_UP', 'CLASS');
          break;
        }

        case 'FIST': {
          focusTimer.toggleTimer();
          addActionLog('focus motor state toggled via fist.', 'FIST', 'EXEC');
          break;
        }

        default:
          break;
      }
    },
    [settings, systemActive, activeTab, addActionLog, focusTimer]
  );

  // Computer Vision Hook
  const {
    videoRef,
    canvasRef,
    isModelLoading,
    isCameraActive,
    isTracking,
    fps,
    latencyMs,
    errorMessage,
    analysis,
    cursor,
    startCamera,
    stopCamera,
  } = useHandTracking(
    settings,
    handleGestureTrigger,
    handlePinchClick,
    handleScroll,
    handleTwoHandGesture,
    handleHeadGesture,
    handleFacePresenceChange
  );

  // Emergency Halt
  const handleEmergencyHalt = useCallback(() => {
    stopCamera();
    soundEffects.playEmergencyStop();
    addActionLog('emergency halt executed.', 'NONE', 'IO', true);
  }, [stopCamera, addActionLog]);

  // Voice command execution
  const handleVoiceCommand = useCallback(
    (match: VoiceCommandMatch) => {
      addActionLog(match.description, 'NONE', 'VOICE', true, 'VOICE');
      soundEffects.playPinchClick();

      switch (match.type) {
        case 'TIMER_START':
          if (!focusTimer.isRunning) focusTimer.toggleTimer();
          break;
        case 'TIMER_PAUSE':
          if (focusTimer.isRunning) focusTimer.toggleTimer();
          break;
        case 'TIMER_RESET':
          focusTimer.resetTimer();
          break;
        case 'SLIDE_NEXT':
          setSlideNavTrigger({ direction: 'next', timestamp: performance.now() });
          break;
        case 'SLIDE_PREV':
          setSlideNavTrigger({ direction: 'prev', timestamp: performance.now() });
          break;
        case 'TAB_OVERVIEW':
          setActiveTab('overview');
          break;
        case 'TAB_GESTURE':
          setActiveTab('gesture');
          break;
        case 'TAB_FOCUS':
          setActiveTab('focus');
          break;
        case 'TAB_PRESENT':
          setActiveTab('present');
          break;
        case 'TAB_WORKSPACE':
          setActiveTab('workspace');
          break;
        case 'TAB_SETTINGS':
          setIsSettingsOpen(true);
          break;
        case 'SCROLL_DOWN':
          mainScrollRef.current?.scrollBy({ top: 350, behavior: 'smooth' });
          break;
        case 'SCROLL_UP':
          mainScrollRef.current?.scrollBy({ top: -350, behavior: 'smooth' });
          break;
        case 'CAMERA_START':
          startCamera();
          break;
        case 'CAMERA_STOP':
          stopCamera();
          break;
        case 'SYSTEM_STANDBY':
          setSystemActive(false);
          break;
        case 'SYSTEM_WAKE':
          setSystemActive(true);
          break;
        case 'QUICK_LAUNCHER':
          setIsLauncherOpen(true);
          break;
        case 'EMERGENCY_HALT':
          handleEmergencyHalt();
          break;
      }
    },
    [focusTimer, startCamera, stopCamera, handleEmergencyHalt, addActionLog]
  );

  // Toggle voice assistant listener
  const toggleVoiceAssistant = useCallback(() => {
    if (isVoiceActive) {
      voiceAssistant.stop();
      setIsVoiceActive(false);
      addActionLog('voice recognition listener muted.', 'NONE', 'VOICE');
    } else {
      const ok = voiceAssistant.start(handleVoiceCommand, (listening, err) => {
        setIsVoiceActive(listening);
        if (err) {
          addActionLog(`voice error: ${err}`, 'NONE', 'IO');
        }
      });
      if (ok) {
        setIsVoiceActive(true);
        addActionLog('voice command recognition active. say "start timer", "next slide"...', 'NONE', 'VOICE', true);
      }
    }
  }, [isVoiceActive, handleVoiceCommand, addActionLog]);

  // Sync voice assistant with settings.voiceControlEnabled
  useEffect(() => {
    if (settings.voiceControlEnabled && !isVoiceActive) {
      toggleVoiceAssistant();
    } else if (!settings.voiceControlEnabled && isVoiceActive) {
      voiceAssistant.stop();
      setIsVoiceActive(false);
    }
  }, [settings.voiceControlEnabled, isVoiceActive, toggleVoiceAssistant]);

  // Global Keyboard listener: Escape, J, Q
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Escape') {
        if (isLauncherOpen) {
          setIsLauncherOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else {
          handleEmergencyHalt();
        }
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsLauncherOpen(prev => !prev);
        soundEffects.playPinchClick();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleEmergencyHalt, isLauncherOpen, isSettingsOpen]);

  return (
    <div className="min-h-screen bg-[#090909] text-[#EDEDE9] flex flex-col font-poppins selection:bg-[#222222] selection:text-[#EDEDE9] overflow-x-hidden">
      {/* Interactive Virtual Reticle */}
      <VirtualCursor
        cursor={cursor}
        enabled={settings.showVirtualCursor && systemActive}
        isPinching={cursor.isPinching}
        gestureName={analysis?.gesture?.label || 'POINTING'}
        dwellClickEnabled={settings.dwellClickEnabled}
        dwellDurationMs={settings.dwellDurationMs}
        onDwellClick={handlePinchClick}
        headActionTag={headActionTag}
      />

      {/* Top Header Bar */}
      <TopHeader
        isCameraActive={isCameraActive}
        onToggleCamera={() => {
          if (isCameraActive) {
            stopCamera();
          } else {
            startCamera();
          }
        }}
        onEmergencyHalt={handleEmergencyHalt}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLauncher={() => setIsLauncherOpen(true)}
        isVoiceActive={isVoiceActive}
        onToggleVoice={toggleVoiceAssistant}
      />

      {/* Main Layout Body: Left Sidebar + Central Work Area */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Navigation Rail */}
        <SidebarRail
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
            soundEffects.playPinchClick();
          }}
        />

        {/* Center & Right Workspace Container */}
        <main
          ref={mainScrollRef}
          className="flex-1 flex flex-col justify-between overflow-y-auto min-w-0"
        >
          <div className="w-full max-w-[1520px] mx-auto p-4 sm:p-6 lg:p-7 flex flex-col gap-5">
            {/* Hero Masthead */}
            <HeroMasthead
              fps={fps}
              isTracking={isTracking}
              latencyMs={
                !isCameraActive
                  ? 'standby'
                  : latencyMs > 0
                  ? `${latencyMs.toFixed(1)}ms`
                  : '1.4ms'
              }
            />

            {/* Standby Alert banner if gesture link is paused */}
            {!systemActive && (
              <div className="w-full p-2.5 rounded bg-[#1c1410] border border-[#f59e0b]/30 flex items-center justify-between font-mono text-xs text-[#f59e0b]">
                <span>jarvis telemetry link in standby. gesture interactions paused.</span>
                <button
                  onClick={() => setSystemActive(true)}
                  className="px-2.5 py-1 rounded bg-[#f59e0b] text-[#090909] font-semibold text-[10px] uppercase cursor-pointer"
                >
                  re-arm link
                </button>
              </div>
            )}

            {/* Main Stage & Instrument Rack Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Optical Bench Viewport OR Tab Content */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                {activeTab === 'gesture' || activeTab === 'overview' ? (
                  <OpticalBenchViewport
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isCameraActive={isCameraActive}
                    isTracking={isTracking}
                    isModelLoading={isModelLoading}
                    fps={fps}
                    errorMessage={errorMessage}
                    analysis={analysis}
                    settings={settings}
                    onStartCamera={startCamera}
                    onStopCamera={stopCamera}
                    onEmergencyHalt={handleEmergencyHalt}
                    onUpdateSettings={handleUpdateSettings}
                  />
                ) : activeTab === 'present' ? (
                  <PresentationViewer
                    externalNavTrigger={slideNavTrigger}
                    externalZoomScale={presentationZoomScale}
                  />
                ) : activeTab === 'workspace' ? (
                  <StudyWorkspace
                    onOpenExternalLink={name => {
                      addActionLog(`external portal deployed -> ${name.toLowerCase()}`, 'PINCH', 'IO');
                    }}
                  />
                ) : activeTab === 'focus' ? (
                  <div className="space-y-4">
                    <FocusMotorPanel timer={focusTimer} />
                    <OpticalBenchViewport
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      isCameraActive={isCameraActive}
                      isTracking={isTracking}
                      isModelLoading={isModelLoading}
                      fps={fps}
                      errorMessage={errorMessage}
                      analysis={analysis}
                      settings={settings}
                      onStartCamera={startCamera}
                      onStopCamera={stopCamera}
                      onEmergencyHalt={handleEmergencyHalt}
                      onUpdateSettings={handleUpdateSettings}
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-[#121212] border border-[#202020] font-mono text-xs text-[#888888]">
                    <div className="text-sm font-poppins font-bold text-[#EDEDE9] mb-2 lowercase">
                      system parameters.
                    </div>
                    <p className="mb-4">
                      configure spatial recognition sensitivity, threshold gates, and optical smoothing.
                    </p>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="px-3.5 py-1.5 rounded bg-[#EDEDE9] text-[#090909] font-medium cursor-pointer"
                    >
                      open calibration dialog.
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: 3-Module Instrument Rack */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                {/* 1. Gesture Instrument */}
                <GestureInstrumentRack
                  analysis={analysis}
                  cursor={cursor}
                  isTracking={isTracking}
                  lastAction={lastDispatchedAction}
                />

                {/* 2. Focus Motor */}
                <FocusMotorPanel timer={focusTimer} />

                {/* 3. Gesture Matrix */}
                <GestureMatrixPanel
                  currentGesture={analysis?.gesture?.type || 'NONE'}
                  isTracking={isTracking}
                  onSelectGestureSlot={slot => {
                    addActionLog(`gesture slot 0${slot} inspected.`, 'PINCH', 'CLASS');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Activity Log / Terminal Bar */}
          <ActivityLogTerminal logs={logs} />
        </main>
      </div>

      {/* Quick Command Launcher Palette */}
      <QuickLauncherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        onSelectTab={tab => setActiveTab(tab)}
        onToggleCamera={() => {
          if (isCameraActive) stopCamera();
          else startCamera();
        }}
        isCameraActive={isCameraActive}
        onToggleTimer={focusTimer.toggleTimer}
        onResetTimer={focusTimer.resetTimer}
        onToggleVoice={toggleVoiceAssistant}
        isVoiceActive={isVoiceActive}
        onReZero={() => {
          handleUpdateSettings({ ...settings, smoothing: 0.75 });
          addActionLog('spatial origin re-zeroed.', 'NONE', 'IO');
        }}
        onEmergencyHalt={handleEmergencyHalt}
      />

      {/* Settings & Calibration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetDefaults}
      />
    </div>
  );
}
