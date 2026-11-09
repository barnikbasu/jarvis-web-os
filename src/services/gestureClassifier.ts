/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GestureInfo, LandmarkPoint, RecognizedGesture } from '../types/jarvis';

// Euclidean distance helper in normalized 3D space
export function getDistance(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface HandAnalysis {
  gesture: GestureInfo;
  isPinching: boolean;
  pinchDistance: number;
  pinchCenter: { x: number; y: number };
  pointerTip: { x: number; y: number };
  handCenter: { x: number; y: number };
  extendedFingers: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  swipeDirection?: 'left' | 'right' | null;
  isScrolling?: boolean;
  scrollDeltaY?: number;
  twoHandGesture?: RecognizedGesture | null;
  zoomFactor?: number;
}

export class GestureClassifier {
  // Stabilizer queue for multi-frame consensus
  private history: RecognizedGesture[] = [];
  private readonly historyCapacity = 4;
  private prevHandCenters: { x: number; time: number }[] = [];
  // Hysteresis state to prevent pinch jitter at threshold boundary
  private isPinchingActive: boolean = false;
  // Two-finger scroll tracking
  private prevScrollFingerY: number | null = null;
  // Two-hand span tracking for pinch/spread zoom
  private prevTwoHandSpan: number | null = null;
  private lastSpanTime: number = 0;

  public classify(
    landmarks: LandmarkPoint[],
    customPinchThreshold = 0.07,
    modelScore: number = 0.95
  ): HandAnalysis {
    if (!landmarks || landmarks.length < 21) {
      return this.emptyResult();
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];

    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];

    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];

    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];

    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];

    // Palm scale reference based on wrist to middle knuckle distance
    const palmScale = Math.max(0.05, getDistance(wrist, middleMcp));

    // Finger extensions detection based on tip-to-wrist distance relative to pip joint
    const indexExtended = 
      getDistance(indexTip, wrist) > getDistance(indexPip, wrist) * 1.12 &&
      getDistance(indexTip, indexMcp) > palmScale * 0.65;

    const middleExtended = 
      getDistance(middleTip, wrist) > getDistance(middlePip, wrist) * 1.12 &&
      getDistance(middleTip, middleMcp) > palmScale * 0.65;

    const ringExtended = 
      getDistance(ringTip, wrist) > getDistance(ringPip, wrist) * 1.1 &&
      getDistance(ringTip, ringMcp) > palmScale * 0.6;

    const pinkyExtended = 
      getDistance(pinkyTip, wrist) > getDistance(pinkyPip, wrist) * 1.1 &&
      getDistance(pinkyTip, pinkyMcp) > palmScale * 0.6;

    // Thumb extended outward from palm
    const thumbExtended = 
      getDistance(thumbTip, pinkyMcp) > palmScale * 1.05 &&
      getDistance(thumbTip, indexMcp) > palmScale * 0.6;

    // True when all 4 fingers (Index, Middle, Ring, Pinky) are curled into the palm
    const allFourFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    // Raw Euclidean distance between thumb and index tips
    const rawPinchDist = getDistance(thumbTip, indexTip);
    const normalizedPinchDist = rawPinchDist / palmScale;

    // Pinch calculation with hysteresis:
    // If all fingers are curled (as in a fist), it is NEVER a pinch!
    if (allFourFingersCurled) {
      this.isPinchingActive = false;
    } else {
      const enterThreshold = Math.min(customPinchThreshold, palmScale * 0.32);
      const exitThreshold = enterThreshold * 1.35;

      if (this.isPinchingActive) {
        this.isPinchingActive = rawPinchDist < exitThreshold;
      } else {
        // To enter pinch, fingers must not be in a fist ball and distance must be below threshold
        this.isPinchingActive = rawPinchDist < enterThreshold || normalizedPinchDist < 0.28;
      }
    }

    const isPinching = this.isPinchingActive;

    const pinchCenter = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
    };

    const pointerTip = {
      x: indexTip.x,
      y: indexTip.y,
    };

    const handCenter = {
      x: (wrist.x + indexMcp.x + pinkyMcp.x) / 3,
      y: (wrist.y + indexMcp.y + pinkyMcp.y) / 3,
    };

    // Calculate swipe velocity for Peace Sign swipes
    // Note: Video is mirrored with CSS (-scale-x-100).
    // Moving hand physically to user's right decreases raw camera X.
    // Therefore screen-space deltaX is -(handCenter.x - oldest.x).
    const now = performance.now();
    this.prevHandCenters.push({ x: handCenter.x, time: now });
    // Keep last 400ms
    this.prevHandCenters = this.prevHandCenters.filter(p => now - p.time <= 400);

    let swipeDirection: 'left' | 'right' | null = null;
    if (this.prevHandCenters.length >= 3) {
      const oldest = this.prevHandCenters[0];
      const screenDeltaX = -(handCenter.x - oldest.x);
      if (screenDeltaX > 0.04) {
        swipeDirection = 'right';
      } else if (screenDeltaX < -0.04) {
        swipeDirection = 'left';
      }
    }

    // Determine Gesture
    let rawGesture: RecognizedGesture = 'NONE';
    const baseScore = Math.max(0.65, Math.min(0.994, modelScore));
    let confidence = baseScore;

    // 1. THUMBS UP: All 4 fingers curled, thumb pointing vertically up toward ceiling
    if (
      allFourFingersCurled &&
      thumbTip.y < thumbMcp.y - palmScale * 0.25 &&
      thumbTip.y < indexMcp.y - palmScale * 0.2 &&
      getDistance(thumbTip, wrist) > palmScale * 0.75
    ) {
      rawGesture = 'THUMBS_UP';
      confidence = Math.min(0.994, baseScore * 0.98);
    }
    // 2. FIST: All 4 fingers curled tightly into palm, thumb folded
    else if (allFourFingersCurled) {
      rawGesture = 'FIST';
      confidence = Math.min(0.994, baseScore * 0.99);
    }
    // 3. PINCH: Index and thumb tip touching, ring and pinky curled
    else if (isPinching && !ringExtended && !pinkyExtended) {
      rawGesture = 'PINCH';
      confidence = Math.min(0.994, Math.max(0.7, baseScore * (1 - (rawPinchDist / customPinchThreshold) * 0.15)));
    }
    // 4. PEACE SIGN (V) vs TWO-FINGER SCROLL: Index + Middle extended, Ring + Pinky curled
    else if (
      indexExtended && 
      middleExtended && 
      !ringExtended && 
      !pinkyExtended
    ) {
      const tipDist = getDistance(indexTip, middleTip);
      if (tipDist > palmScale * 0.22) {
        rawGesture = 'PEACE_SIGN';
        confidence = Math.min(0.994, baseScore * 0.97);
      } else {
        rawGesture = 'TWO_FINGER_SCROLL';
        confidence = Math.min(0.994, baseScore * 0.98);
      }
    }
    // 5. OPEN PALM: All 4 main fingers extended outward facing camera
    else if (
      indexExtended && 
      middleExtended && 
      ringExtended && 
      pinkyExtended
    ) {
      rawGesture = 'OPEN_PALM';
      confidence = Math.min(0.994, baseScore * 0.99);
    }
    // 6. POINTING: Index finger extended, other fingers curled
    else if (
      indexExtended && 
      !middleExtended && 
      !ringExtended && 
      !pinkyExtended &&
      !isPinching
    ) {
      rawGesture = 'POINTING';
      confidence = Math.min(0.994, baseScore * 0.98);
    }

    // Two-finger vertical scroll delta computation
    let isScrolling = false;
    let scrollDeltaY = 0;
    if (rawGesture === 'TWO_FINGER_SCROLL') {
      isScrolling = true;
      if (this.prevScrollFingerY !== null) {
        // Since Y goes from 0 (top) to 1 (bottom), moving fingers downward increases Y
        scrollDeltaY = indexTip.y - this.prevScrollFingerY;
      }
      this.prevScrollFingerY = indexTip.y;
    } else {
      this.prevScrollFingerY = null;
    }

    // Stabilization filter: require stability
    this.history.push(rawGesture);
    if (this.history.length > this.historyCapacity) {
      this.history.shift();
    }

    // Determine consensus
    const counts = this.history.reduce((acc, g) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<RecognizedGesture, number>);

    let stabilizedGesture: RecognizedGesture = rawGesture;
    let maxCount = 0;
    for (const [g, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        stabilizedGesture = g as RecognizedGesture;
      }
    }

    // Fast-path override for pointer & scroll responsiveness
    if (rawGesture === 'POINTING' || rawGesture === 'PINCH' || rawGesture === 'TWO_FINGER_SCROLL') {
      stabilizedGesture = rawGesture;
    }

    return {
      gesture: this.buildGestureInfo(stabilizedGesture, confidence),
      isPinching,
      pinchDistance: rawPinchDist,
      pinchCenter,
      pointerTip,
      handCenter,
      extendedFingers: {
        thumb: thumbExtended,
        index: indexExtended,
        middle: middleExtended,
        ring: ringExtended,
        pinky: pinkyExtended,
      },
      swipeDirection,
      isScrolling,
      scrollDeltaY,
    };
  }

  public classifyTwoHands(
    hands: LandmarkPoint[][],
    customPinchThreshold = 0.07,
    modelScore = 0.95
  ): {
    twoHandGesture: RecognizedGesture | null;
    zoomDelta: number;
    primaryHandAnalysis: HandAnalysis;
  } {
    if (!hands || hands.length === 0) {
      return {
        twoHandGesture: null,
        zoomDelta: 0,
        primaryHandAnalysis: this.emptyResult(),
      };
    }

    const primaryAnalysis = this.classify(hands[0], customPinchThreshold, modelScore);

    if (hands.length < 2) {
      this.prevTwoHandSpan = null;
      return {
        twoHandGesture: null,
        zoomDelta: 0,
        primaryHandAnalysis: primaryAnalysis,
      };
    }

    // Both hands present
    const hand1 = hands[0];
    const hand2 = hands[1];
    const analysis2 = this.classify(hand2, customPinchThreshold, modelScore);

    const now = performance.now();
    let twoHandGesture: RecognizedGesture | null = null;
    let zoomDelta = 0;

    // 1. Both open palms: hands-free mode toggle
    if (primaryAnalysis.gesture.type === 'OPEN_PALM' && analysis2.gesture.type === 'OPEN_PALM') {
      twoHandGesture = 'BOTH_PALMS';
    }

    // 2. Measure span between hands for Zoom Spread / Pinch
    const center1 = hand1[8] || hand1[0];
    const center2 = hand2[8] || hand2[0];
    const currentSpan = getDistance(center1, center2);

    if (this.prevTwoHandSpan !== null && now - this.lastSpanTime < 400) {
      const delta = currentSpan - this.prevTwoHandSpan;
      // If hands spread apart significantly
      if (delta > 0.035) {
        twoHandGesture = 'ZOOM_SPREAD';
        zoomDelta = delta * 4;
      } else if (delta < -0.035) {
        twoHandGesture = 'ZOOM_PINCH';
        zoomDelta = delta * 4;
      }
    }

    this.prevTwoHandSpan = currentSpan;
    this.lastSpanTime = now;

    primaryAnalysis.twoHandGesture = twoHandGesture;
    primaryAnalysis.zoomFactor = zoomDelta;

    return {
      twoHandGesture,
      zoomDelta,
      primaryHandAnalysis: primaryAnalysis,
    };
  }

  private buildGestureInfo(type: RecognizedGesture, confidence: number): GestureInfo {
    switch (type) {
      case 'OPEN_PALM':
        return {
          type,
          label: 'Open Palm',
          description: 'Toggle Gesture Mode / Standby',
          confidence,
          iconName: 'Hand',
        };
      case 'POINTING':
        return {
          type,
          label: 'Index Pointing',
          description: 'Controlling Virtual Cursor',
          confidence,
          iconName: 'MousePointer',
        };
      case 'PINCH':
        return {
          type,
          label: 'Thumb-Index Pinch',
          description: 'Click / Select Element',
          confidence,
          iconName: 'Target',
        };
      case 'PEACE_SIGN':
        return {
          type,
          label: 'Peace Sign (V)',
          description: 'Presentation Slide Navigation',
          confidence,
          iconName: 'Sparkles',
        };
      case 'THUMBS_UP':
        return {
          type,
          label: 'Thumbs Up',
          description: 'Open Study Workspace',
          confidence,
          iconName: 'ThumbsUp',
        };
      case 'FIST':
        return {
          type,
          label: 'Closed Fist',
          description: 'Pause / Resume Focus Timer',
          confidence,
          iconName: 'Square',
        };
      case 'TWO_FINGER_SCROLL':
        return {
          type,
          label: 'Two-Finger Scroll',
          description: 'Smooth Viewport Scrolling',
          confidence,
          iconName: 'ArrowUpDown',
        };
      case 'BOTH_PALMS':
        return {
          type,
          label: 'Both Open Palms',
          description: 'Toggle Hands-Free System Link',
          confidence,
          iconName: 'Maximize2',
        };
      case 'ZOOM_SPREAD':
        return {
          type,
          label: 'Two-Hand Spread',
          description: 'Zoom In Viewport / Slide',
          confidence,
          iconName: 'ZoomIn',
        };
      case 'ZOOM_PINCH':
        return {
          type,
          label: 'Two-Hand Pinch',
          description: 'Zoom Out Viewport / Slide',
          confidence,
          iconName: 'ZoomOut',
        };
      case 'HEAD_NOD':
        return {
          type,
          label: 'Head Nod',
          description: 'Confirm Action / Start',
          confidence,
          iconName: 'CheckCircle',
        };
      case 'HEAD_SHAKE':
        return {
          type,
          label: 'Head Shake',
          description: 'Cancel Action / Dismiss',
          confidence,
          iconName: 'XCircle',
        };
      case 'NONE':
      default:
        return {
          type: 'NONE',
          label: 'Searching Hand',
          description: 'Position hand within camera viewport',
          confidence: 0,
          iconName: 'HelpCircle',
        };
    }
  }

  private emptyResult(): HandAnalysis {
    return {
      gesture: this.buildGestureInfo('NONE', 0),
      isPinching: false,
      pinchDistance: 1.0,
      pinchCenter: { x: 0.5, y: 0.5 },
      pointerTip: { x: 0.5, y: 0.5 },
      handCenter: { x: 0.5, y: 0.5 },
      extendedFingers: {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      },
      swipeDirection: null,
      isScrolling: false,
      scrollDeltaY: 0,
    };
  }

  public reset() {
    this.history = [];
    this.prevHandCenters = [];
    this.isPinchingActive = false;
    this.prevScrollFingerY = null;
    this.prevTwoHandSpan = null;
  }
}
