/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RecognizedGesture = 
  | 'OPEN_PALM'
  | 'POINTING'
  | 'PINCH'
  | 'PEACE_SIGN'
  | 'THUMBS_UP'
  | 'FIST'
  | 'TWO_FINGER_SCROLL'
  | 'BOTH_PALMS'
  | 'ZOOM_PINCH'
  | 'ZOOM_SPREAD'
  | 'HEAD_NOD'
  | 'HEAD_SHAKE'
  | 'NONE';

export interface GestureInfo {
  type: RecognizedGesture;
  label: string;
  description: string;
  confidence: number;
  iconName: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  isPinching: boolean;
  isTracking: boolean;
  isScrolling?: boolean;
  scrollDeltaY?: number;
}

export interface ActionLogItem {
  id: string;
  timestamp: string;
  category: 'IO' | 'OPTIC' | 'CLASS' | 'SYNC' | 'EXEC' | 'VOICE';
  action: string;
  gesture: RecognizedGesture;
  source: 'GESTURE' | 'KEYBOARD' | 'MANUAL' | 'VOICE' | 'HEAD';
  highlight?: boolean;
}

export type PomodoroMode = 'work' | 'short_break' | 'long_break';

export interface PomodoroSessionRecord {
  id: string;
  completedAt: string;
  mode: PomodoroMode;
  durationMinutes: number;
}

export interface HeadPoseState {
  pitch: number;
  yaw: number;
  roll: number;
  isNodding: boolean;
  isShaking: boolean;
  facePresent: boolean;
  confidence: number;
}

export interface SystemSettings {
  gestureControlEnabled: boolean;
  sensitivity: number; // 1.0 to 3.0
  smoothing: number; // 0.1 to 0.95
  pinchThreshold: number; // 0.03 to 0.09
  cooldownMs: number; // 500 to 2000
  soundEffects: boolean;
  reachMultiplier: number; // 1.0 to 2.0 (inner bounding box margin)
  showVirtualCursor: boolean;
  showSkeleton: boolean;
  cameraFacingMode: 'user' | 'environment';
  exposureEv?: number; // ±0 ev
  gateThreshold?: number; // 0.85
  wireframeOnly?: boolean;

  // 1. Dwell-to-click
  dwellClickEnabled: boolean;
  dwellDurationMs: number; // 600 - 2000ms

  // 2. Hand-controlled scrolling
  twoFingerScrollEnabled: boolean;
  scrollSensitivity: number; // 0.5 to 3.0

  // 3. Face presence & auto standby
  faceTrackingEnabled: boolean;
  faceAutoStandby: boolean;
  faceStandbyDelaySec: number; // 3 to 15 seconds

  // 4. Head gestures
  headGesturesEnabled: boolean;

  // 5. Two-hand zoom
  twoHandZoomEnabled: boolean;

  // 7. Voice commands
  voiceControlEnabled: boolean;

  // 8. Custom gesture macros
  gestureActions: {
    OPEN_PALM?: string;
    POINTING?: string;
    PINCH?: string;
    PEACE_SIGN?: string;
    THUMBS_UP?: string;
    FIST?: string;
    TWO_FINGER_SCROLL?: string;
    BOTH_PALMS?: string;
    HEAD_NOD?: string;
    HEAD_SHAKE?: string;
  };
}

export type ActiveTab = 'overview' | 'gesture' | 'focus' | 'present' | 'workspace' | 'settings';

export interface SlideItem {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  summary: string;
  bulletPoints: string[];
  metricLabel?: string;
  metricValue?: string;
  codeSnippet?: string;
}
