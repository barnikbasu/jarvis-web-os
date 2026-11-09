/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bot, 
  Eye, 
  Hand, 
  Mic, 
  RotateCcw, 
  Sliders, 
  Smile, 
  X 
} from 'lucide-react';
import { voiceAssistant } from '../services/voiceAssistant';
import { SystemSettings } from '../types/jarvis';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'hands_free' | 'optical' | 'face_voice' | 'macros'>('hands_free');

  if (!isOpen) return null;

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleMacroChange = (gestureKey: string, actionValue: string) => {
    onUpdateSettings({
      ...settings,
      gestureActions: {
        ...settings.gestureActions,
        [gestureKey]: actionValue,
      },
    });
  };

  const isVoiceSupported = voiceAssistant.isSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090909]/80 backdrop-blur-xs select-none font-mono">
      <div className="relative w-full max-w-xl rounded-xl bg-[#121212] border border-[#262626] p-6 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#181818] border border-[#2b2b2b] flex items-center justify-center text-[#EDEDE9]">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-poppins text-sm tracking-tight text-[#EDEDE9] font-bold lowercase">
                settings & hands-free control.
              </h2>
              <p className="text-[10px] text-[#666666]">
                tune optical vision, dwell duration, head pose & voice parameters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#666666] hover:text-[#EDEDE9] hover:bg-[#181818] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[#1c1c1c] pb-2 mb-3 text-xs shrink-0 overflow-x-auto">
          {[
            { id: 'hands_free', label: 'hands-free', icon: <Bot className="w-3.5 h-3.5" /> },
            { id: 'optical', label: 'optical ray', icon: <Hand className="w-3.5 h-3.5" /> },
            { id: 'face_voice', label: 'face & voice', icon: <Smile className="w-3.5 h-3.5" /> },
            { id: 'macros', label: 'gesture macros', icon: <Eye className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#1e1e1e] text-[#EDEDE9] font-medium border border-[#333333]'
                  : 'text-[#666666] hover:text-[#aaaaaa]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs">
          {/* TAB 1: Hands-Free Productivity */}
          {activeTab === 'hands_free' && (
            <div className="space-y-3">
              {/* Dwell-to-click toggle */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[#EDEDE9] block font-medium">dwell-to-click</span>
                    <span className="text-[10px] text-[#666666]">
                      hover reticle over element to automatically trigger click
                    </span>
                  </div>
                  <button
                    onClick={() => handleChange('dwellClickEnabled', !settings.dwellClickEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      settings.dwellClickEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        settings.dwellClickEnabled
                          ? 'bg-[#090909] translate-x-5'
                          : 'bg-[#555555] translate-x-1'
                      } absolute top-0.5`}
                    />
                  </button>
                </div>

                {settings.dwellClickEnabled && (
                  <div className="pt-2 border-t border-[#181818] mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#777777]">hover dwell duration:</span>
                      <span className="text-[#EDEDE9] font-bold">
                        {settings.dwellDurationMs} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="600"
                      max="2000"
                      step="100"
                      value={settings.dwellDurationMs}
                      onChange={e => handleChange('dwellDurationMs', parseInt(e.target.value))}
                      className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
                    />
                  </div>
                )}
              </div>

              {/* Two-finger scrolling */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[#EDEDE9] block font-medium">two-finger scrolling</span>
                    <span className="text-[10px] text-[#666666]">
                      extend index & middle fingers together to scroll viewports
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleChange('twoFingerScrollEnabled', !settings.twoFingerScrollEnabled)
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      settings.twoFingerScrollEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        settings.twoFingerScrollEnabled
                          ? 'bg-[#090909] translate-x-5'
                          : 'bg-[#555555] translate-x-1'
                      } absolute top-0.5`}
                    />
                  </button>
                </div>

                {settings.twoFingerScrollEnabled && (
                  <div className="pt-2 border-t border-[#181818] mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#777777]">scroll velocity multiplier:</span>
                      <span className="text-[#EDEDE9] font-bold">
                        {settings.scrollSensitivity.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.25"
                      value={settings.scrollSensitivity}
                      onChange={e =>
                        handleChange('scrollSensitivity', parseFloat(e.target.value))
                      }
                      className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
                    />
                  </div>
                )}
              </div>

              {/* Two-hand Zoom */}
              <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div>
                  <span className="text-[#EDEDE9] block font-medium">
                    two-hand pinch / spread zoom
                  </span>
                  <span className="text-[10px] text-[#666666]">
                    move both hands closer or further to zoom presentation view
                  </span>
                </div>
                <button
                  onClick={() => handleChange('twoHandZoomEnabled', !settings.twoHandZoomEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.twoHandZoomEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      settings.twoHandZoomEnabled
                        ? 'bg-[#090909] translate-x-5'
                        : 'bg-[#555555] translate-x-1'
                    } absolute top-0.5`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Optical Ray & Tracking */}
          {activeTab === 'optical' && (
            <div className="space-y-3">
              {/* Master Gesture Toggle */}
              <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div>
                  <span className="text-[#EDEDE9] block font-medium">gesture recognition</span>
                  <span className="text-[10px] text-[#666666]">
                    enable or pause optical gesture kinematics
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleChange('gestureControlEnabled', !settings.gestureControlEnabled)
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.gestureControlEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      settings.gestureControlEnabled
                        ? 'bg-[#090909] translate-x-5'
                        : 'bg-[#555555] translate-x-1'
                    } absolute top-0.5`}
                  />
                </button>
              </div>

              {/* Virtual Reticle */}
              <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div>
                  <span className="text-[#EDEDE9] block font-medium">holographic reticle</span>
                  <span className="text-[10px] text-[#666666]">
                    floating target reticle and screen coordinates
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleChange('showVirtualCursor', !settings.showVirtualCursor)
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.showVirtualCursor ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      settings.showVirtualCursor
                        ? 'bg-[#090909] translate-x-5'
                        : 'bg-[#555555] translate-x-1'
                    } absolute top-0.5`}
                  />
                </button>
              </div>

              {/* 21-Node Skeleton */}
              <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div>
                  <span className="text-[#EDEDE9] block font-medium">21-node skeleton</span>
                  <span className="text-[10px] text-[#666666]">
                    render joint connections over optical bench
                  </span>
                </div>
                <button
                  onClick={() => handleChange('showSkeleton', !settings.showSkeleton)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.showSkeleton ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      settings.showSkeleton
                        ? 'bg-[#090909] translate-x-5'
                        : 'bg-[#555555] translate-x-1'
                    } absolute top-0.5`}
                  />
                </button>
              </div>

              {/* Cursor Smoothing Slider */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#888888]">cursor smoothing (ema):</span>
                  <span className="text-[#EDEDE9] font-bold">
                    {Math.round(settings.smoothing * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={settings.smoothing}
                  onChange={e => handleChange('smoothing', parseFloat(e.target.value))}
                  className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
                />
              </div>

              {/* Pinch Trigger Threshold */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#888888]">pinch trigger gate:</span>
                  <span className="text-[#EDEDE9] font-bold">
                    {(settings.pinchThreshold * 100).toFixed(0)}mm
                  </span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.12"
                  step="0.01"
                  value={settings.pinchThreshold}
                  onChange={e => handleChange('pinchThreshold', parseFloat(e.target.value))}
                  className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Face & Voice */}
          {activeTab === 'face_voice' && (
            <div className="space-y-3">
              {/* Face Tracking & Auto Standby */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[#EDEDE9] block font-medium">
                      face presence auto standby / wake
                    </span>
                    <span className="text-[10px] text-[#666666]">
                      automatically puts system on standby when operator steps away
                    </span>
                  </div>
                  <button
                    onClick={() => handleChange('faceAutoStandby', !settings.faceAutoStandby)}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      settings.faceAutoStandby ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        settings.faceAutoStandby
                          ? 'bg-[#090909] translate-x-5'
                          : 'bg-[#555555] translate-x-1'
                      } absolute top-0.5`}
                    />
                  </button>
                </div>

                {settings.faceAutoStandby && (
                  <div className="pt-2 border-t border-[#181818] mt-2">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#777777]">absence standby delay:</span>
                      <span className="text-[#EDEDE9] font-bold">
                        {settings.faceStandbyDelaySec} seconds
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="1"
                      value={settings.faceStandbyDelaySec}
                      onChange={e =>
                        handleChange('faceStandbyDelaySec', parseInt(e.target.value))
                      }
                      className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
                    />
                  </div>
                )}
              </div>

              {/* Head Nod / Shake Gestures */}
              <div className="flex items-center justify-between p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div>
                  <span className="text-[#EDEDE9] block font-medium">head nod & shake</span>
                  <span className="text-[10px] text-[#666666]">
                    nod to confirm action / start timer; shake to cancel / pause
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleChange('headGesturesEnabled', !settings.headGesturesEnabled)
                  }
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.headGesturesEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      settings.headGesturesEnabled
                        ? 'bg-[#090909] translate-x-5'
                        : 'bg-[#555555] translate-x-1'
                    } absolute top-0.5`}
                  />
                </button>
              </div>

              {/* Voice Recognition Assistant */}
              <div className="p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#EDEDE9] font-medium">voice command assistant</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border ${
                          isVoiceSupported
                            ? 'border-[#22c55e]/40 text-[#22c55e]'
                            : 'border-[#ef4444]/40 text-[#ef4444]'
                        }`}
                      >
                        {isVoiceSupported ? 'browser supported' : 'unsupported'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#666666]">
                      listen for "start timer", "next slide", "scroll down", "open workspace"
                    </span>
                  </div>
                  <button
                    disabled={!isVoiceSupported}
                    onClick={() =>
                      handleChange('voiceControlEnabled', !settings.voiceControlEnabled)
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer disabled:opacity-40 ${
                      settings.voiceControlEnabled ? 'bg-[#EDEDE9]' : 'bg-[#262626]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        settings.voiceControlEnabled
                          ? 'bg-[#090909] translate-x-5'
                          : 'bg-[#555555] translate-x-1'
                      } absolute top-0.5`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Gesture Macros Remapping */}
          {activeTab === 'macros' && (
            <div className="space-y-2.5">
              <p className="text-[11px] text-[#777777] mb-2">
                remap recognized kinematic postures to system actions and macros.
              </p>

              {[
                {
                  id: 'OPEN_PALM',
                  label: 'open palm',
                  current: settings.gestureActions.OPEN_PALM || 'TOGGLE_SYSTEM',
                  options: [
                    { value: 'TOGGLE_SYSTEM', label: 'toggle active / standby' },
                    { value: 'QUICK_LAUNCHER', label: 'open quick launcher' },
                    { value: 'NONE', label: 'no action' },
                  ],
                },
                {
                  id: 'FIST',
                  label: 'closed fist',
                  current: settings.gestureActions.FIST || 'TOGGLE_TIMER',
                  options: [
                    { value: 'TOGGLE_TIMER', label: 'pause / resume focus timer' },
                    { value: 'RESET_TIMER', label: 'reset focus timer' },
                    { value: 'HALT', label: 'emergency halt' },
                  ],
                },
                {
                  id: 'PEACE_SIGN',
                  label: 'peace sign (v)',
                  current: settings.gestureActions.PEACE_SIGN || 'SLIDE_NAV',
                  options: [
                    { value: 'SLIDE_NAV', label: 'presentation slide swipe' },
                    { value: 'OPEN_PRESENT', label: 'jump to presentation view' },
                  ],
                },
                {
                  id: 'THUMBS_UP',
                  label: 'thumbs up',
                  current: settings.gestureActions.THUMBS_UP || 'OPEN_WORKSPACE',
                  options: [
                    { value: 'OPEN_WORKSPACE', label: 'deploy study workspace' },
                    { value: 'QUICK_LAUNCHER', label: 'deploy quick launcher' },
                  ],
                },
                {
                  id: 'BOTH_PALMS',
                  label: 'both open palms',
                  current: settings.gestureActions.BOTH_PALMS || 'HANDS_FREE_TOGGLE',
                  options: [
                    { value: 'HANDS_FREE_TOGGLE', label: 'toggle hands-free mode' },
                    { value: 'HALT', label: 'emergency optical halt' },
                  ],
                },
                {
                  id: 'HEAD_NOD',
                  label: 'head nod',
                  current: settings.gestureActions.HEAD_NOD || 'CONFIRM_ACTION',
                  options: [
                    { value: 'CONFIRM_ACTION', label: 'confirm action / start timer' },
                    { value: 'NEXT_SLIDE', label: 'advance slide' },
                  ],
                },
                {
                  id: 'HEAD_SHAKE',
                  label: 'head shake',
                  current: settings.gestureActions.HEAD_SHAKE || 'CANCEL_ACTION',
                  options: [
                    { value: 'CANCEL_ACTION', label: 'cancel modal / pause timer' },
                    { value: 'STANDBY', label: 'place on standby' },
                  ],
                },
              ].map(macro => (
                <div
                  key={macro.id}
                  className="flex items-center justify-between p-2.5 rounded bg-[#0a0a0a] border border-[#1c1c1c]"
                >
                  <span className="text-[#EDEDE9] font-mono">{macro.label}:</span>
                  <select
                    value={macro.current}
                    onChange={e => handleMacroChange(macro.id, e.target.value)}
                    className="bg-[#161616] border border-[#2b2b2b] text-[#EDEDE9] text-[11px] rounded px-2 py-1 cursor-pointer focus:outline-none"
                  >
                    {macro.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#1c1c1c] shrink-0">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#EDEDE9] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>reset defaults.</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#EDEDE9] hover:bg-white text-[#090909] font-medium text-xs transition cursor-pointer"
          >
            done.
          </button>
        </div>
      </div>
    </div>
  );
};
