/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Camera, Clock, Command, Mic, Settings, User } from 'lucide-react';

interface TopHeaderProps {
  isCameraActive: boolean;
  onToggleCamera: () => void;
  onEmergencyHalt: () => void;
  onOpenSettings: () => void;
  onOpenLauncher?: () => void;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isCameraActive,
  onToggleCamera,
  onEmergencyHalt,
  onOpenSettings,
  onOpenLauncher,
  isVoiceActive = false,
  onToggleVoice,
}) => {
  const [timeStr, setTimeStr] = useState<string>('10:42:16 utc · tues');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcTime = now.toTimeString().split(' ')[0];
      const days = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
      const day = days[now.getUTCDay()];
      setTimeStr(`${utcTime} utc · ${day}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full h-14 bg-[#090909] border-b border-[#1c1c1c] flex items-center justify-between px-5 select-none z-30 shrink-0">
      {/* Left Branding */}
      <div className="flex items-center gap-2 font-poppins">
        <span className="text-sm font-bold tracking-tight text-[#EDEDE9]">
          jarvis.
        </span>
        <span className="text-xs text-[#888888] flex items-center gap-1.5 font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
          personal workspace.
        </span>
      </div>

      {/* Right Controls and Telemetry */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-[#888888]">
          <Clock className="w-3.5 h-3.5 text-[#666666]" />
          <span>{timeStr}</span>
        </div>

        {/* Quick Launcher Button */}
        {onOpenLauncher && (
          <button
            onClick={onOpenLauncher}
            title="Quick Launcher (Press J or Q)"
            className="px-2 py-1 rounded bg-[#141414] hover:bg-[#1f1f1f] text-[#888888] hover:text-[#EDEDE9] border border-[#242424] font-mono text-[11px] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Command className="w-3 h-3 text-[#666666]" />
            <span className="hidden sm:inline">launcher</span>
            <span className="text-[9px] text-[#555555]">j</span>
          </button>
        )}

        {/* Voice Assistant Toggle */}
        {onToggleVoice && (
          <button
            onClick={onToggleVoice}
            title={isVoiceActive ? 'Voice Assistant Listening (Click to mute)' : 'Voice Assistant Muted (Click to start)'}
            className={`p-1.5 rounded border transition cursor-pointer relative ${
              isVoiceActive
                ? 'bg-[#181818] border-[#333333] text-[#EDEDE9]'
                : 'hover:bg-[#161616] border-transparent text-[#666666] hover:text-[#EDEDE9]'
            }`}
          >
            <Mic className="w-4 h-4" />
            {isVoiceActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            )}
          </button>
        )}

        {/* Halt Button */}
        <button
          onClick={onEmergencyHalt}
          title="Emergency Stop (Esc)"
          className="px-2 py-0.5 rounded bg-[#161616] hover:bg-[#202020] text-[#999999] hover:text-[#EDEDE9] border border-[#262626] font-mono text-[11px] transition cursor-pointer"
        >
          esc · halt
        </button>

        {/* Camera indicator toggle button */}
        <button
          onClick={onToggleCamera}
          title={isCameraActive ? 'Camera Active (Click to stop)' : 'Camera Idle (Click to start)'}
          className="p-1.5 rounded hover:bg-[#161616] text-[#888888] hover:text-[#EDEDE9] transition cursor-pointer relative"
        >
          <Camera className="w-4 h-4" />
          {isCameraActive && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 rounded hover:bg-[#161616] text-[#888888] hover:text-[#EDEDE9] transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User avatar circle */}
        <div className="w-6 h-6 rounded-full bg-[#EDEDE9] flex items-center justify-center text-[#090909] font-bold text-xs ml-1">
          <User className="w-3.5 h-3.5" />
        </div>
      </div>
    </header>
  );
};
