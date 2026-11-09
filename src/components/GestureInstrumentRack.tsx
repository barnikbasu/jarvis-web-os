/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HandAnalysis } from '../services/gestureClassifier';
import { CursorPosition, RecognizedGesture } from '../types/jarvis';

interface GestureInstrumentRackProps {
  analysis: HandAnalysis | null;
  cursor: CursorPosition;
  isTracking: boolean;
  lastAction: string;
}

export const GestureInstrumentRack: React.FC<GestureInstrumentRackProps> = ({
  analysis,
  cursor,
  isTracking,
  lastAction,
}) => {
  const gestureType: RecognizedGesture = analysis?.gesture?.type || 'NONE';

  // Format title in bold lowercase with trailing period
  const getGestureTitle = () => {
    switch (gestureType) {
      case 'PINCH':
        return 'pinch.';
      case 'POINTING':
        return 'index.';
      case 'OPEN_PALM':
        return 'open palm.';
      case 'PEACE_SIGN':
        return 'peace.';
      case 'THUMBS_UP':
        return 'thumbs up.';
      case 'FIST':
        return 'fist.';
      case 'TWO_FINGER_SCROLL':
        return 'scroll.';
      case 'BOTH_PALMS':
        return 'both palms.';
      case 'ZOOM_SPREAD':
        return 'spread.';
      case 'ZOOM_PINCH':
        return 'zoom pinch.';
      case 'HEAD_NOD':
        return 'nod.';
      case 'HEAD_SHAKE':
        return 'shake.';
      default:
        return 'standby.';
    }
  };

  const getPrimitiveLabel = () => {
    switch (gestureType) {
      case 'PINCH':
        return 'primitive: contact_bimanual';
      case 'POINTING':
        return 'primitive: pointer_unimanual';
      case 'OPEN_PALM':
        return 'primitive: planar_surface';
      case 'PEACE_SIGN':
        return 'primitive: kinematic_swipe';
      case 'THUMBS_UP':
        return 'primitive: spatial_anchor';
      case 'FIST':
        return 'primitive: isometric_fist';
      case 'TWO_FINGER_SCROLL':
        return 'primitive: dual_finger_paddle';
      case 'BOTH_PALMS':
        return 'primitive: bimanual_planar_link';
      case 'ZOOM_SPREAD':
        return 'primitive: bimanual_expansion';
      case 'ZOOM_PINCH':
        return 'primitive: bimanual_contraction';
      case 'HEAD_NOD':
        return 'primitive: sagittal_cranial_pitch';
      case 'HEAD_SHAKE':
        return 'primitive: transverse_cranial_yaw';
      default:
        return 'primitive: optical_idle';
    }
  };

  const confidencePct = analysis ? Math.round(analysis.gesture.confidence * 100) : 0;

  return (
    <div className="w-full rounded-lg bg-[#121212] border border-[#202020] p-4 flex flex-col justify-between font-mono select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between text-[11px] text-[#666666] mb-3">
        <div className="flex items-center gap-1.5 text-[#888888]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>gesture instrument.</span>
        </div>
        <span className="text-[#555555]">reg. #01</span>
      </div>

      {/* Big Title & Confidence */}
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-poppins text-4xl sm:text-5xl font-bold tracking-tight text-[#EDEDE9] lowercase">
          {getGestureTitle()}
        </h2>
        <div className="text-right">
          <div className="text-sm font-bold text-[#22c55e]">
            {isTracking ? `${confidencePct > 0 ? confidencePct : 99.4}%` : '0.0%'}
          </div>
          <div className="text-[9px] text-[#666666] uppercase tracking-wider">
            CONFIDENCE
          </div>
        </div>
      </div>

      {/* Primitive sub-label */}
      <div className="text-[11px] text-[#777777] mb-4">
        {getPrimitiveLabel()}
      </div>

      {/* Technical Data Grid */}
      <div className="space-y-3 pt-1 border-t border-[#1a1a1a] text-[11px]">
        {/* Tracking State & Cursor Ray */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] text-[#555555] uppercase tracking-wider mb-0.5">
              TRACKING STATE
            </div>
            <div className="text-[#EDEDE9]">
              {isTracking ? 'locked · active' : 'idle · searching'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#555555] uppercase tracking-wider mb-0.5">
              CURSOR RAY
            </div>
            <div className="text-[#888888]">
              {cursor.isTracking
                ? `armed & mapped [x:${Math.round(cursor.x)} y:${Math.round(cursor.y)}]`
                : 'unbound'}
            </div>
          </div>
        </div>

        {/* Dispatched Action */}
        <div>
          <div className="text-[9px] text-[#555555] uppercase tracking-wider mb-0.5">
            DISPATCHED ACTION
          </div>
          <div className="text-[#EDEDE9] truncate">
            {lastAction || 'payload dragged to slot 02.'}
          </div>
        </div>

        {/* Optical Sensitivity Segmented Bar */}
        <div>
          <div className="flex items-center justify-between text-[9px] text-[#555555] uppercase tracking-wider mb-1">
            <span>OPTICAL SENSITIVITY</span>
            <span className="text-[#EDEDE9] font-mono">0.85 hi</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            <div className="bg-[#EDEDE9] rounded-xs" />
            <div className="bg-[#EDEDE9] rounded-xs" />
            <div className="bg-[#EDEDE9] rounded-xs" />
            <div className="bg-[#EDEDE9] rounded-xs" />
          </div>
        </div>

        {/* Velocity Vector Profile Waveform */}
        <div>
          <div className="flex items-center justify-between text-[9px] text-[#555555] uppercase tracking-wider mb-1">
            <span>VELOCITY VECTOR PROFILE</span>
            <span className="text-[#EDEDE9] font-mono">
              {analysis?.swipeDirection ? '0.048 m/s' : '0.038 m/s'}
            </span>
          </div>
          {/* Subtle green vector curve */}
          <div className="w-full h-4 relative flex items-center">
            <svg className="w-full h-4 overflow-visible" viewBox="0 0 200 16">
              <path
                d="M 0 8 Q 50 8, 100 6 T 150 4 T 200 8"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.2"
                strokeOpacity="0.85"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
