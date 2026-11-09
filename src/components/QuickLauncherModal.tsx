/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Camera, 
  Focus, 
  Hand, 
  Layers, 
  LayoutGrid, 
  Mic, 
  RotateCcw, 
  Search, 
  SlidersHorizontal, 
  Tv, 
  X 
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { ActiveTab } from '../types/jarvis';

interface QuickLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onToggleCamera: () => void;
  isCameraActive: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onToggleVoice: () => void;
  isVoiceActive: boolean;
  onReZero: () => void;
  onEmergencyHalt: () => void;
}

interface LauncherAction {
  id: string;
  title: string;
  category: 'NAVIGATION' | 'HARDWARE' | 'PRODUCTIVITY';
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const QuickLauncherModal: React.FC<QuickLauncherModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onToggleCamera,
  isCameraActive,
  onToggleTimer,
  onResetTimer,
  onToggleVoice,
  isVoiceActive,
  onReZero,
  onEmergencyHalt,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: LauncherAction[] = [
    {
      id: 'tab-overview',
      title: 'jump to overview dashboard',
      category: 'NAVIGATION',
      shortcut: '1',
      icon: <LayoutGrid className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('overview'),
    },
    {
      id: 'tab-gesture',
      title: 'jump to optical gesture bench',
      category: 'NAVIGATION',
      shortcut: '2',
      icon: <Hand className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('gesture'),
    },
    {
      id: 'tab-focus',
      title: 'jump to focus motor chronometer',
      category: 'NAVIGATION',
      shortcut: '3',
      icon: <Focus className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('focus'),
    },
    {
      id: 'tab-present',
      title: 'jump to presentation slide viewer',
      category: 'NAVIGATION',
      shortcut: '4',
      icon: <Tv className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('present'),
    },
    {
      id: 'tab-workspace',
      title: 'jump to study workspace & portals',
      category: 'NAVIGATION',
      shortcut: '5',
      icon: <Layers className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('workspace'),
    },
    {
      id: 'tab-settings',
      title: 'open calibration parameters & settings',
      category: 'NAVIGATION',
      shortcut: '6',
      icon: <SlidersHorizontal className="w-4 h-4 text-[#888888]" />,
      run: () => onSelectTab('settings'),
    },
    {
      id: 'act-camera',
      title: isCameraActive ? 'stop camera video stream' : 'start camera video stream',
      category: 'HARDWARE',
      shortcut: 'c',
      icon: <Camera className="w-4 h-4 text-[#22c55e]" />,
      run: onToggleCamera,
    },
    {
      id: 'act-timer-toggle',
      title: 'start / pause focus motor',
      category: 'PRODUCTIVITY',
      shortcut: 'spc',
      icon: <Focus className="w-4 h-4 text-[#EDEDE9]" />,
      run: onToggleTimer,
    },
    {
      id: 'act-timer-reset',
      title: 'reset focus motor cycle',
      category: 'PRODUCTIVITY',
      shortcut: 'r',
      icon: <RotateCcw className="w-4 h-4 text-[#888888]" />,
      run: onResetTimer,
    },
    {
      id: 'act-voice',
      title: isVoiceActive ? 'disable voice recognition' : 'enable voice commands recognition',
      category: 'HARDWARE',
      shortcut: 'v',
      icon: <Mic className={`w-4 h-4 ${isVoiceActive ? 'text-[#22c55e]' : 'text-[#888888]'}`} />,
      run: onToggleVoice,
    },
    {
      id: 'act-rezero',
      title: 're-zero spatial coordinate origin',
      category: 'HARDWARE',
      shortcut: 'z',
      icon: <RotateCcw className="w-4 h-4 text-[#888888]" />,
      run: onReZero,
    },
    {
      id: 'act-halt',
      title: 'emergency optical halt',
      category: 'HARDWARE',
      shortcut: 'esc',
      icon: <X className="w-4 h-4 text-[#f59e0b]" />,
      run: onEmergencyHalt,
    },
  ];

  const filtered = actions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside launcher
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].run();
          soundEffects.playPinchClick();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl rounded-xl bg-[#0e0e0e] border border-[#262626] shadow-2xl flex flex-col overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1f1f1f] bg-[#121212]">
          <Search className="w-4 h-4 text-[#666666] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="type a command, tab, or gesture action..."
            className="w-full bg-transparent text-[#EDEDE9] placeholder-[#555555] focus:outline-none font-mono text-xs"
          />
          <span className="text-[10px] text-[#555555] px-1.5 py-0.5 rounded border border-[#262626] shrink-0">
            esc
          </span>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[#555555]">
              no matching commands found in registry.
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    soundEffects.playPinchClick();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#1a1a1a] text-[#EDEDE9] border border-[#333333]'
                      : 'text-[#888888] hover:bg-[#141414] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#555555] uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <span className="text-[10px] text-[#777777] px-1.5 py-0.5 rounded bg-[#101010] border border-[#262626] uppercase">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info line */}
        <div className="px-4 py-2 border-t border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between text-[10px] text-[#555555]">
          <span>navigate: [↑ ↓] · execute: [enter]</span>
          <span>quick launcher · jarvis v4.2</span>
        </div>
      </div>
    </div>
  );
};
