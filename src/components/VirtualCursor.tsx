/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { CursorPosition } from '../types/jarvis';

interface VirtualCursorProps {
  cursor: CursorPosition;
  enabled: boolean;
  isPinching: boolean;
  gestureName: string;
  dwellClickEnabled?: boolean;
  dwellDurationMs?: number;
  onDwellClick?: (x: number, y: number) => void;
  headActionTag?: string | null;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
  color?: string;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({
  cursor,
  enabled,
  isPinching,
  gestureName,
  dwellClickEnabled = false,
  dwellDurationMs = 1000,
  onDwellClick,
  headActionTag,
}) => {
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  const anchorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dwellStartTimeRef = useRef<number>(0);
  const dwellTriggeredRef = useRef<boolean>(false);
  const dwellCooldownRef = useRef<number>(0);

  // Trigger ripple when pinch starts
  useEffect(() => {
    if (isPinching && enabled && cursor.isTracking) {
      const newRipple = {
        id: Date.now(),
        x: cursor.x,
        y: cursor.y,
        color: '#f59e0b',
      };
      setRipples(prev => [...prev.slice(-3), newRipple]);

      const timer = setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPinching, enabled, cursor.isTracking, cursor.x, cursor.y]);

  // Dwell-to-click detection loop
  useEffect(() => {
    if (!dwellClickEnabled || !enabled || !cursor.isTracking || isPinching || cursor.isScrolling) {
      setDwellProgress(0);
      dwellTriggeredRef.current = false;
      return;
    }

    const now = performance.now();
    if (now < dwellCooldownRef.current) {
      setDwellProgress(0);
      return;
    }

    const dist = Math.hypot(cursor.x - anchorPosRef.current.x, cursor.y - anchorPosRef.current.y);

    // Jitter tolerance: 18px radius
    if (dist > 18) {
      anchorPosRef.current = { x: cursor.x, y: cursor.y };
      dwellStartTimeRef.current = now;
      dwellTriggeredRef.current = false;
      setDwellProgress(0);
      return;
    }

    // Still hovering in place
    const elapsed = now - dwellStartTimeRef.current;
    const progress = Math.min(1, elapsed / dwellDurationMs);
    setDwellProgress(progress);

    if (progress >= 1 && !dwellTriggeredRef.current) {
      dwellTriggeredRef.current = true;
      dwellCooldownRef.current = now + 600; // 600ms cooldown to prevent double clicks

      const clickX = cursor.x;
      const clickY = cursor.y;

      // Create ripple
      const newRipple = {
        id: Date.now(),
        x: clickX,
        y: clickY,
        color: '#22c55e',
      };
      setRipples(prev => [...prev.slice(-3), newRipple]);

      if (onDwellClick) {
        onDwellClick(clickX, clickY);
      }
    }
  }, [
    cursor.x,
    cursor.y,
    cursor.isTracking,
    cursor.isScrolling,
    isPinching,
    dwellClickEnabled,
    dwellDurationMs,
    enabled,
    onDwellClick,
  ]);

  if (!enabled || !cursor.isTracking) {
    return null;
  }

  // Circular progress calculation for Dwell ring
  const ringRadius = 22;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - dwellProgress * circumference;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Click ripples */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none animate-ping"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '40px',
            height: '40px',
            borderColor: ripple.color || '#f59e0b',
            backgroundColor: ripple.color ? `${ripple.color}15` : 'rgba(245,158,11,0.1)',
            animationDuration: '0.45s',
          }}
        />
      ))}

      {/* Main Holographic Reticle */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: `${cursor.x}px`,
          top: `${cursor.y}px`,
          transform: `translate(-50%, -50%) scale(${isPinching ? 0.9 : 1})`,
        }}
      >
        {/* Dwell-to-click Circular Progress Ring */}
        {dwellClickEnabled && dwellProgress > 0 && (
          <svg className="absolute -top-[7px] -left-[7px] w-[50px] h-[50px] -rotate-90 pointer-events-none">
            <circle
              cx="25"
              cy="25"
              r={ringRadius}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2"
              fill="transparent"
            />
            <circle
              cx="25"
              cy="25"
              r={ringRadius}
              stroke="#EDEDE9"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Outer Circular Reticle */}
        <div
          className={`w-9 h-9 rounded-full border transition-all duration-150 flex items-center justify-center ${
            isPinching
              ? 'border-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : cursor.isScrolling
              ? 'border-[#22c55e] bg-[#22c55e]/10'
              : 'border-white/60'
          }`}
        >
          {cursor.isScrolling ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-[#22c55e]" />
          ) : (
            <>
              {/* Crosshair lines */}
              <div className="w-1.5 h-px bg-white/70 absolute -left-1" />
              <div className="w-1.5 h-px bg-white/70 absolute -right-1" />
              <div className="h-1.5 w-px bg-white/70 absolute -top-1" />
              <div className="h-1.5 w-px bg-white/70 absolute -bottom-1" />
            </>
          )}
        </div>

        {/* Center dot */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            isPinching
              ? 'w-2 h-2 bg-[#f59e0b]'
              : cursor.isScrolling
              ? 'w-1.5 h-1.5 bg-[#22c55e]'
              : 'w-1.5 h-1.5 bg-white'
          }`}
        />

        {/* Technical coordinates label */}
        <div className="absolute top-6 left-6 px-1.5 py-0.5 rounded bg-[#090909]/90 border border-[#2b2b2b] text-[9px] font-mono text-[#888888] whitespace-nowrap flex items-center gap-1">
          <span>[x:{Math.round(cursor.x)} y:{Math.round(cursor.y)}]</span>
          <span className="text-[#EDEDE9]">
            {isPinching
              ? 'pinch'
              : cursor.isScrolling
              ? 'scrolling'
              : dwellClickEnabled && dwellProgress > 0
              ? `dwell ${Math.round(dwellProgress * 100)}%`
              : 'armed'}
          </span>
        </div>

        {/* Head Action Temporary Confirmation Tag */}
        {headActionTag && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#111111] border border-[#22c55e] text-[9px] font-mono text-[#22c55e] whitespace-nowrap animate-pulse">
            {headActionTag}
          </div>
        )}
      </div>
    </div>
  );
};
