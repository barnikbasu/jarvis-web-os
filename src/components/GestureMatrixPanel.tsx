/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RecognizedGesture } from '../types/jarvis';

interface GestureMatrixPanelProps {
  currentGesture: RecognizedGesture;
  isTracking: boolean;
  onSelectGestureSlot?: (slotId: number) => void;
}

interface GestureSlot {
  id: string;
  slotNum: string;
  type: RecognizedGesture;
  icon: string;
  name: string;
  action: string;
  statusLabel: string;
}

export const GestureMatrixPanel: React.FC<GestureMatrixPanelProps> = ({
  currentGesture,
  isTracking,
  onSelectGestureSlot,
}) => {
  const slots: GestureSlot[] = [
    {
      id: 'open_palm',
      slotNum: '01',
      type: 'OPEN_PALM',
      icon: '✋',
      name: 'open palm',
      action: 'activate / deactivate.',
      statusLabel: 'ARMED',
    },
    {
      id: 'index_finger',
      slotNum: '02',
      type: 'POINTING',
      icon: '☝',
      name: 'index finger',
      action: 'move cursor.',
      statusLabel: 'TRACKING',
    },
    {
      id: 'pinch',
      slotNum: '03',
      type: 'PINCH',
      icon: '🤏',
      name: 'pinch',
      action: 'select & drag.',
      statusLabel: 'ACTIVE',
    },
    {
      id: 'peace_sign',
      slotNum: '04',
      type: 'PEACE_SIGN',
      icon: '✌',
      name: 'peace sign',
      action: 'change slide.',
      statusLabel: 'READY',
    },
    {
      id: 'thumbs_up',
      slotNum: '05',
      type: 'THUMBS_UP',
      icon: '👍',
      name: 'thumbs up',
      action: 'open workspace.',
      statusLabel: 'READY',
    },
    {
      id: 'fist',
      slotNum: '06',
      type: 'FIST',
      icon: '✊',
      name: 'fist',
      action: 'pause / resume focus.',
      statusLabel: 'READY',
    },
  ];

  return (
    <div className="w-full rounded-lg bg-[#121212] border border-[#202020] p-4 flex flex-col justify-between font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] text-[#666666] mb-2.5">
        <span className="text-[#888888]">gesture matrix.</span>
        <span className="text-[#555555]">06 mapped</span>
      </div>

      {/* 6 Gesture Slots List */}
      <div className="flex flex-col divide-y divide-[#1a1a1a]">
        {slots.map((slot, idx) => {
          const isActive = isTracking && currentGesture === slot.type;
          return (
            <div
              key={slot.id}
              onClick={() => onSelectGestureSlot && onSelectGestureSlot(idx + 1)}
              className={`py-2 px-1 flex items-center justify-between text-[11px] transition cursor-pointer ${
                isActive
                  ? 'text-[#EDEDE9] font-medium bg-[#161616]'
                  : 'text-[#888888] hover:text-[#bbbbbb] hover:bg-[#141414]'
              }`}
            >
              {/* Left slot number, icon, and name/action */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-[#555555] shrink-0 font-mono">
                  {slot.slotNum}
                </span>
                <span className="text-xs shrink-0">{slot.icon}</span>
                <span className="truncate lowercase">
                  <span className={isActive ? 'text-[#EDEDE9]' : 'text-[#aaaaaa]'}>
                    {slot.name}
                  </span>{' '}
                  <span className="text-[#555555]">— {slot.action}</span>
                </span>
              </div>

              {/* Right Status Badge */}
              <div className="shrink-0 ml-2">
                {isActive ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#22c55e] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    ACTIVE
                  </span>
                ) : slot.type === 'POINTING' && isTracking ? (
                  <span className="text-[10px] text-[#22c55e]">
                    TRACKING
                  </span>
                ) : slot.type === 'OPEN_PALM' ? (
                  <span className="text-[10px] text-[#666666]">
                    ARMED
                  </span>
                ) : (
                  <span className="text-[10px] text-[#555555]">
                    READY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
