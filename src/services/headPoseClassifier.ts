/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HeadPoseState, LandmarkPoint } from '../types/jarvis';

export class HeadPoseClassifier {
  private lastNodTimestamp: number = 0;
  private lastShakeTimestamp: number = 0;
  private readonly gestureCooldownMs: number = 1200;

  // History buffer for kinematic trajectory
  private pitchHistory: { val: number; time: number }[] = [];
  private yawHistory: { val: number; time: number }[] = [];

  // Baseline calibration
  private baselinePitch: number = 0;
  private baselineYaw: number = 0.5;
  private hasCalibrated: boolean = false;
  private calibrationSamples: { pitch: number; yaw: number }[] = [];

  public classify(faceLandmarks: LandmarkPoint[] | null): HeadPoseState {
    const now = performance.now();

    if (!faceLandmarks || faceLandmarks.length < 468) {
      // Clean history when face is absent
      this.pitchHistory = [];
      this.yawHistory = [];
      return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        isNodding: false,
        isShaking: false,
        facePresent: false,
        confidence: 0,
      };
    }

    const noseTip = faceLandmarks[1];
    const forehead = faceLandmarks[10];
    const chin = faceLandmarks[152];
    const leftTemple = faceLandmarks[234];
    const rightTemple = faceLandmarks[454];

    if (!noseTip || !forehead || !chin || !leftTemple || !rightTemple) {
      return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        isNodding: false,
        isShaking: false,
        facePresent: true,
        confidence: 0.5,
      };
    }

    // 1. Calculate Face Scale
    const faceHeight = Math.max(0.05, Math.abs(chin.y - forehead.y));
    const faceWidth = Math.max(0.05, Math.abs(rightTemple.x - leftTemple.x));

    // 2. Pitch: vertical relative position of nose tip between forehead and chin
    // midpoint between forehead and chin
    const midY = (forehead.y + chin.y) / 2;
    const rawPitch = (noseTip.y - midY) / faceHeight;

    // 3. Yaw: horizontal relative position of nose between temples
    const minTempleX = Math.min(leftTemple.x, rightTemple.x);
    const rawYaw = (noseTip.x - minTempleX) / faceWidth;

    // Auto-calibrate resting neutral posture over first 15 frames
    if (!this.hasCalibrated) {
      this.calibrationSamples.push({ pitch: rawPitch, yaw: rawYaw });
      if (this.calibrationSamples.length >= 15) {
        const avgPitch = this.calibrationSamples.reduce((a, b) => a + b.pitch, 0) / 15;
        const avgYaw = this.calibrationSamples.reduce((a, b) => a + b.yaw, 0) / 15;
        this.baselinePitch = avgPitch;
        this.baselineYaw = avgYaw;
        this.hasCalibrated = true;
      }
    }

    // Normalized deviations from neutral
    const normPitch = rawPitch - this.baselinePitch;
    const normYaw = rawYaw - this.baselineYaw;

    // Record history (keep last 700ms)
    this.pitchHistory.push({ val: normPitch, time: now });
    this.yawHistory.push({ val: normYaw, time: now });
    this.pitchHistory = this.pitchHistory.filter(p => now - p.time <= 700);
    this.yawHistory = this.yawHistory.filter(y => now - y.time <= 700);

    let isNodding = false;
    let isShaking = false;

    // Check Nod: Pitch dips down significantly (downward dip > +0.075) and rebounds back
    if (now - this.lastNodTimestamp > this.gestureCooldownMs && this.pitchHistory.length >= 5) {
      const maxDip = Math.max(...this.pitchHistory.map(p => p.val));
      const currentVal = normPitch;

      // When head nods down, noseTip.y increases relative to midpoint -> positive dip
      if (maxDip > 0.075 && currentVal < maxDip * 0.45) {
        isNodding = true;
        this.lastNodTimestamp = now;
        this.pitchHistory = [];
      }
    }

    // Check Shake: Yaw oscillates left (< -0.065) and right (> +0.065) within window
    if (now - this.lastShakeTimestamp > this.gestureCooldownMs && this.yawHistory.length >= 6) {
      const minYaw = Math.min(...this.yawHistory.map(y => y.val));
      const maxYaw = Math.max(...this.yawHistory.map(y => y.val));

      // Check peak-to-peak amplitude
      if (maxYaw - minYaw > 0.13 && minYaw < -0.05 && maxYaw > 0.05) {
        isShaking = true;
        this.lastShakeTimestamp = now;
        this.yawHistory = [];
      }
    }

    return {
      pitch: normPitch,
      yaw: normYaw,
      roll: 0,
      isNodding,
      isShaking,
      facePresent: true,
      confidence: 0.95,
    };
  }

  public resetCalibration() {
    this.hasCalibrated = false;
    this.calibrationSamples = [];
    this.pitchHistory = [];
    this.yawHistory = [];
  }
}
