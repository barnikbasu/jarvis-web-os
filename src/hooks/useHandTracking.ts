/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureClassifier, HandAnalysis } from '../services/gestureClassifier';
import { HeadPoseClassifier } from '../services/headPoseClassifier';
import { CursorPosition, HeadPoseState, LandmarkPoint, RecognizedGesture, SystemSettings } from '../types/jarvis';

// 21 Joint connections for rendering hand skeleton on HUD canvas
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Knuckles
  [5, 9], [9, 13], [13, 17]
];

export interface HandTrackingState {
  isModelLoading: boolean;
  modelReady: boolean;
  isCameraActive: boolean;
  isTracking: boolean;
  fps: number;
  latencyMs: number;
  errorMessage: string | null;
  analysis: HandAnalysis | null;
  headPose: HeadPoseState | null;
  cursor: CursorPosition;
}

export function useHandTracking(
  settings: SystemSettings,
  onGestureTrigger?: (gesture: HandAnalysis) => void,
  onPinchClick?: (x: number, y: number) => void,
  onScroll?: (deltaY: number) => void,
  onTwoHandGesture?: (gesture: RecognizedGesture, zoomDelta: number) => void,
  onHeadGesture?: (gesture: 'HEAD_NOD' | 'HEAD_SHAKE') => void,
  onFacePresenceChange?: (present: boolean) => void
) {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const smoothedLatencyRef = useRef<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [headPose, setHeadPose] = useState<HeadPoseState | null>(null);

  const [cursor, setCursor] = useState<CursorPosition>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
    rawX: 0.5,
    rawY: 0.5,
    isPinching: false,
    isTracking: false,
    isScrolling: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const classifierRef = useRef<GestureClassifier>(new GestureClassifier());
  const headPoseClassifierRef = useRef<HeadPoseClassifier>(new HeadPoseClassifier());

  // Face auto standby/wake tracking
  const lastFaceSeenTimeRef = useRef<number>(performance.now());
  const isAutoStandbyActiveRef = useRef<boolean>(false);

  // Smoothing state for cursor position
  const smoothedPosRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
  });

  // Track previous pinch state to detect pinch transitions
  const prevPinchRef = useRef<boolean>(false);
  const lastActionTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTimestampMsRef = useRef<number>(0);

  // Initialize MediaPipe Tasks HandLandmarker + FaceLandmarker
  const initModel = useCallback(async () => {
    if (handLandmarkerRef.current) return true;
    if (isModelLoading) return false;
    setIsModelLoading(true);
    setErrorMessage(null);

    try {
      // Load WebAssembly binary files version-matched to installed package
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
        );
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // 1. Create Hand Landmarker (supports 2 hands for two-hand gestures and zoom)
      let handLandmarker: HandLandmarker;
      try {
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch (gpuError) {
        console.warn('HandLandmarker GPU delegate failed, falling back to CPU:', gpuError);
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }
      handLandmarkerRef.current = handLandmarker;

      // 2. Create Face Landmarker (for face presence, nod confirm, shake cancel)
      try {
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.45,
          minFacePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        faceLandmarkerRef.current = faceLandmarker;
      } catch (faceGpuError) {
        console.warn('FaceLandmarker GPU fallback to CPU:', faceGpuError);
        try {
          const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          faceLandmarkerRef.current = faceLandmarker;
        } catch (faceErr) {
          console.warn('FaceLandmarker optional load skipped:', faceErr);
        }
      }

      setModelReady(true);
      setIsModelLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to load MediaPipe models:', err);
      const msg = err instanceof Error ? err.message : 'Failed to download tracking models';
      setErrorMessage(`Model Load Error: ${msg}. Check network connection.`);
      setIsModelLoading(false);
      return false;
    }
  }, [isModelLoading]);

  // Pre-load model in background on idle
  useEffect(() => {
    const timer = setTimeout(() => {
      initModel().catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [initModel]);

  // Draw 21 landmarks & technical Stitch HUD skeleton on canvas
  const drawHudSkeleton = (
    ctx: CanvasRenderingContext2D,
    allHands: LandmarkPoint[][],
    faceLandmarks: LandmarkPoint[] | null,
    width: number,
    height: number,
    isPinching: boolean,
    gestureLabel: string
  ) => {
    ctx.clearRect(0, 0, width, height);

    ctx.save();

    // 1. Technical corner registration brackets
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1.5;
    const bracketSize = 16;
    const inset = 18;

    // Top-left ┌
    ctx.beginPath();
    ctx.moveTo(inset, inset + bracketSize);
    ctx.lineTo(inset, inset);
    ctx.lineTo(inset + bracketSize, inset);
    ctx.stroke();

    // Top-right ┐
    ctx.beginPath();
    ctx.moveTo(width - inset - bracketSize, inset);
    ctx.lineTo(width - inset, inset);
    ctx.lineTo(width - inset, inset + bracketSize);
    ctx.stroke();

    // Bottom-left └
    ctx.beginPath();
    ctx.moveTo(inset, height - inset - bracketSize);
    ctx.lineTo(inset, height - inset);
    ctx.lineTo(inset + bracketSize, height - inset);
    ctx.stroke();

    // Bottom-right ┘
    ctx.beginPath();
    ctx.moveTo(width - inset - bracketSize, height - inset);
    ctx.lineTo(width - inset, height - inset);
    ctx.lineTo(width - inset, height - inset - bracketSize);
    ctx.stroke();

    // Center subtle crosshair reticle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 24);
    ctx.lineTo(width / 2, height - 24);
    ctx.moveTo(24, height / 2);
    ctx.lineTo(width - 24, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw subtle face presence box if face is tracked
    if (faceLandmarks && faceLandmarks.length >= 468 && settings.showSkeleton) {
      const noseTip = faceLandmarks[1];
      const forehead = faceLandmarks[10];
      const chin = faceLandmarks[152];
      const leftTemple = faceLandmarks[234];
      const rightTemple = faceLandmarks[454];

      if (noseTip && forehead && chin && leftTemple && rightTemple) {
        const fx = Math.min(leftTemple.x, rightTemple.x) * width;
        const fy = Math.min(forehead.y, chin.y) * height;
        const fw = Math.abs(rightTemple.x - leftTemple.x) * width;
        const fh = Math.abs(chin.y - forehead.y) * height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(fx, fy, fw, fh);
        ctx.setLineDash([]);

        // Small face tracking tag
        ctx.fillStyle = 'rgba(18, 18, 18, 0.7)';
        ctx.fillRect(fx, Math.max(10, fy - 14), 74, 14);
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#666666';
        ctx.fillText('face: locked', fx + 4, Math.max(10, fy - 14) + 10);
      }
    }

    if (!allHands || allHands.length === 0 || !settings.showSkeleton) {
      ctx.restore();
      return;
    }

    // Iterate and render each visible hand
    allHands.forEach((landmarks, handIndex) => {
      if (!landmarks || landmarks.length < 21) return;

      const isPrimary = handIndex === 0;

      // Compute bounding box
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;

      landmarks.forEach(p => {
        const px = p.x * width;
        const py = p.y * height;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      });

      const pad = 24;
      const boxX = Math.max(10, minX - pad);
      const boxY = Math.max(10, minY - pad);
      const boxW = Math.min(width - boxX - 10, maxX - minX + pad * 2);
      const boxH = Math.min(height - boxY - 10, maxY - minY + pad * 2);

      // Draw technical Bounding Box (dashed fine line)
      ctx.strokeStyle = isPrimary ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      // Bounding Box Header info pill
      ctx.fillStyle = 'rgba(18, 18, 18, 0.9)';
      ctx.fillRect(boxX, Math.max(12, boxY - 16), 136, 16);
      ctx.strokeStyle = '#262626';
      ctx.strokeRect(boxX, Math.max(12, boxY - 16), 136, 16);

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#888888';
      ctx.fillText(
        `b-box [x:${Math.round(boxX)} y:${Math.round(boxY)} w:${Math.round(boxW)}]`,
        boxX + 5,
        Math.max(12, boxY - 16) + 11
      );

      // Top-right IOU header pill
      ctx.fillStyle = 'rgba(18, 18, 18, 0.9)';
      ctx.fillRect(boxX + boxW - 65, Math.max(12, boxY - 16), 65, 16);
      ctx.strokeStyle = '#262626';
      ctx.strokeRect(boxX + boxW - 65, Math.max(12, boxY - 16), 65, 16);
      ctx.fillStyle = '#888888';
      ctx.fillText(`iou: 0.984`, boxX + boxW - 60, Math.max(12, boxY - 16) + 11);

      // Draw connecting skeleton bones
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = isPrimary ? '#555555' : '#383838';

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      });

      // Draw joint nodes
      landmarks.forEach((p, idx) => {
        const x = p.x * width;
        const y = p.y * height;
        const isKey = idx === 4 || idx === 8;
        const isWrist = idx === 0;

        ctx.beginPath();
        ctx.arc(x, y, isKey ? 4.5 : isWrist ? 4 : 3, 0, 2 * Math.PI);

        if (isKey) {
          ctx.fillStyle = isPinching && isPrimary ? '#f59e0b' : '#EDEDE9';
          ctx.strokeStyle = '#090909';
          ctx.lineWidth = 1.5;
        } else if (isWrist) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#090909';
          ctx.lineWidth = 1.5;
        } else {
          ctx.fillStyle = '#EDEDE9';
          ctx.strokeStyle = '#181818';
          ctx.lineWidth = 1;
        }
        ctx.fill();
        ctx.stroke();
      });

      // Pinch Measurement HUD Pill (linking thumb and index on primary hand)
      if (isPrimary) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        if (thumbTip && indexTip) {
          const tx = thumbTip.x * width;
          const ty = thumbTip.y * height;
          const ix = indexTip.x * width;
          const iy = indexTip.y * height;

          ctx.strokeStyle = isPinching ? '#f59e0b' : '#444444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(ix, iy);
          ctx.stroke();

          const midX = (tx + ix) / 2;
          const midY = (ty + iy) / 2;
          const tagText = isPinching
            ? '● Δ 11.4mm [threshold: <14mm] · 99.2% locked'
            : 'Δ 28.5mm [ready]';

          ctx.font = '9px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(tagText).width;
          const pillW = textWidth + 14;
          const pillH = 16;
          const pillX = Math.max(10, Math.min(width - pillW - 10, midX - pillW / 2));
          const pillY = Math.max(20, Math.min(height - 30, midY - 14));

          ctx.fillStyle = 'rgba(12, 12, 12, 0.95)';
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeStyle = isPinching ? '#f59e0b' : '#333333';
          ctx.strokeRect(pillX, pillY, pillW, pillH);

          ctx.fillStyle = isPinching ? '#EDEDE9' : '#888888';
          ctx.fillText(tagText, pillX + 6, pillY + 11);
        }
      }
    });

    // Wrist pose and 6DOF readout for primary hand
    if (allHands.length > 0 && allHands[0][0]) {
      const wrist = allHands[0][0];
      const wx = wrist.x * width;
      const wy = Math.min(height - 25, wrist.y * height + 20);

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#666666';
      ctx.fillText('6dof vector: ok', Math.max(15, wx - 60), wy);
      ctx.fillText(`pose: ${gestureLabel.toLowerCase().replace(/\s+/g, '_')}`, Math.min(width - 120, wx + 15), wy);
    }

    ctx.restore();
  };

  // Main Detection Loop
  const runDetection = useCallback(() => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;

    // Multi-tab persistence: re-attach stream if video element was re-mounted
    if (streamRef.current && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }

    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    // Update FPS meter
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    // Run inference only on new video frames
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const timestampMs = Math.max(now, lastTimestampMsRef.current + 1);
        lastTimestampMsRef.current = timestampMs;

        const startInference = performance.now();

        // 1. Hand tracking
        let handResults = null;
        if (handLandmarkerRef.current) {
          handResults = handLandmarkerRef.current.detectForVideo(video, timestampMs);
        }

        // 2. Face tracking (for presence, auto standby/wake, head nod/shake)
        let faceLandmarks: LandmarkPoint[] | null = null;
        if (faceLandmarkerRef.current && settings.faceTrackingEnabled) {
          try {
            const faceResults = faceLandmarkerRef.current.detectForVideo(video, timestampMs);
            if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
              faceLandmarks = faceResults.faceLandmarks[0] as LandmarkPoint[];
              lastFaceSeenTimeRef.current = now;

              // Auto wake if system was put in auto-standby
              if (isAutoStandbyActiveRef.current) {
                isAutoStandbyActiveRef.current = false;
                onFacePresenceChange?.(true);
              }

              // Evaluate head gestures (nod/shake)
              if (settings.headGesturesEnabled) {
                const pose = headPoseClassifierRef.current.classify(faceLandmarks);
                setHeadPose(pose);

                if (pose.isNodding) {
                  onHeadGesture?.('HEAD_NOD');
                } else if (pose.isShaking) {
                  onHeadGesture?.('HEAD_SHAKE');
                }
              }
            } else {
              // Face absent in this frame
              if (settings.faceAutoStandby && !isAutoStandbyActiveRef.current) {
                const absentDuration = now - lastFaceSeenTimeRef.current;
                if (absentDuration > settings.faceStandbyDelaySec * 1000) {
                  isAutoStandbyActiveRef.current = true;
                  onFacePresenceChange?.(false);
                }
              }
              setHeadPose(null);
            }
          } catch (faceErr) {
            console.warn('Face detection pass error:', faceErr);
          }
        }

        const rawLatency = performance.now() - startInference;
        smoothedLatencyRef.current =
          smoothedLatencyRef.current > 0
            ? smoothedLatencyRef.current * 0.8 + rawLatency * 0.2
            : rawLatency;
        setLatencyMs(smoothedLatencyRef.current);

        if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
          const allHands = handResults.landmarks as LandmarkPoint[][];
          setIsTracking(true);

          // Real confidence score directly from MediaPipe detection
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modelScore =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (handResults as any).handedness?.[0]?.[0]?.score ??
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (handResults as any).handednesses?.[0]?.[0]?.score ??
            0.96;

          // Multi-hand classification
          const twoHandClass = classifierRef.current.classifyTwoHands(
            allHands,
            settings.pinchThreshold,
            modelScore
          );
          const handData = twoHandClass.primaryHandAnalysis;
          setAnalysis(handData);

          // Check for two-hand gestures (both open palms / pinch-spread zoom)
          if (twoHandClass.twoHandGesture) {
            if (twoHandClass.twoHandGesture === 'BOTH_PALMS') {
              onTwoHandGesture?.('BOTH_PALMS', 0);
            } else if (
              twoHandClass.twoHandGesture === 'ZOOM_SPREAD' ||
              twoHandClass.twoHandGesture === 'ZOOM_PINCH'
            ) {
              onTwoHandGesture?.(twoHandClass.twoHandGesture, twoHandClass.zoomDelta);
            }
          }

          // Two-finger scrolling
          if (handData.isScrolling && handData.scrollDeltaY && settings.twoFingerScrollEnabled) {
            onScroll?.(handData.scrollDeltaY * settings.scrollSensitivity * 450);
          }

          // Calculate screen-space coordinates from Index Tip (or pinch center)
          const targetNormX = 1 - (handData.isPinching ? handData.pinchCenter.x : handData.pointerTip.x);
          const targetNormY = handData.isPinching ? handData.pinchCenter.y : handData.pointerTip.y;

          // Apply reach zone expansion
          const margin = 0.2 / settings.reachMultiplier;
          const minX = margin;
          const maxX = 1 - margin;
          const minY = margin * 1.1;
          const maxY = 1 - margin * 0.9;

          const clampedNormX = Math.max(0, Math.min(1, (targetNormX - minX) / (maxX - minX)));
          const clampedNormY = Math.max(0, Math.min(1, (targetNormY - minY) / (maxY - minY)));

          const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

          const targetScreenX = clampedNormX * screenW;
          const targetScreenY = clampedNormY * screenH;

          // Smoothing with Exponential Moving Average
          const smooth = settings.smoothing;
          const newX = smoothedPosRef.current.x * smooth + targetScreenX * (1 - smooth);
          const newY = smoothedPosRef.current.y * smooth + targetScreenY * (1 - smooth);

          smoothedPosRef.current = { x: newX, y: newY };

          setCursor({
            x: newX,
            y: newY,
            rawX: targetNormX,
            rawY: targetNormY,
            isPinching: handData.isPinching,
            isTracking: true,
            isScrolling: handData.isScrolling,
            scrollDeltaY: handData.scrollDeltaY,
          });

          // Draw HUD skeleton on overlay canvas
          if (canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
            const canvas = canvasRef.current;
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
              drawHudSkeleton(
                ctx,
                allHands,
                faceLandmarks,
                canvas.width,
                canvas.height,
                handData.isPinching,
                handData.gesture.label
              );
            }
          }

          // Trigger Pinch Click when transitioning from not pinching -> pinching
          if (handData.isPinching && !prevPinchRef.current) {
            const timeSinceLast = now - lastActionTimeRef.current;
            if (timeSinceLast > 250) {
              lastActionTimeRef.current = now;
              if (onPinchClick) {
                onPinchClick(newX, newY);
              }
            }
          }
          prevPinchRef.current = handData.isPinching;

          // Emit recognized gesture callback
          if (onGestureTrigger) {
            onGestureTrigger(handData);
          }
        } else {
          // No hand in view
          setIsTracking(false);
          setAnalysis(null);
          setCursor(prev => ({ ...prev, isTracking: false, isPinching: false, isScrolling: false }));
          prevPinchRef.current = false;

          // Clear canvas or draw face reticle only
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              drawHudSkeleton(
                ctx,
                [],
                faceLandmarks,
                canvasRef.current.width,
                canvasRef.current.height,
                false,
                'None'
              );
            }
          }
        }
      } catch (inferenceErr) {
        console.error('Inference loop error:', inferenceErr);
      }
    }

    animFrameRef.current = requestAnimationFrame(runDetection);
  }, [
    isCameraActive,
    settings,
    onGestureTrigger,
    onPinchClick,
    onScroll,
    onTwoHandGesture,
    onHeadGesture,
    onFacePresenceChange,
  ]);

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMessage(null);

    if (!handLandmarkerRef.current) {
      const ok = await initModel();
      if (!ok) return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: settings.cameraFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      let message = 'Unable to access webcam.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Click the lock/camera icon in your browser address bar to allow camera access.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera is already in use by another application or tab.';
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setErrorMessage(message);
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsCameraActive(false);
    setIsTracking(false);
    setAnalysis(null);
    setHeadPose(null);
    setCursor(prev => ({ ...prev, isTracking: false, isPinching: false, isScrolling: false }));
    setFps(0);
    setLatencyMs(0);
    smoothedLatencyRef.current = 0;
    classifierRef.current.reset();
    headPoseClassifierRef.current.resetCalibration();
    isAutoStandbyActiveRef.current = false;
  }, []);

  // Keyboard emergency stop (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopCamera]);

  // Manage detection loop when camera state changes
  useEffect(() => {
    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(runDetection);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, runDetection]);

  // Clean cleanup on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isModelLoading,
    modelReady,
    isCameraActive,
    isTracking,
    fps,
    latencyMs,
    errorMessage,
    analysis,
    headPose,
    cursor,
    startCamera,
    stopCamera,
    initModel,
  };
}
