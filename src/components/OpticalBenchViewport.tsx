/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { HandAnalysis } from '../services/gestureClassifier';
import { SystemSettings } from '../types/jarvis';

interface OpticalBenchViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  isTracking: boolean;
  isModelLoading: boolean;
  fps: number;
  errorMessage: string | null;
  analysis: HandAnalysis | null;
  settings: SystemSettings;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onEmergencyHalt: () => void;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

export const OpticalBenchViewport: React.FC<OpticalBenchViewportProps> = ({
  videoRef,
  canvasRef,
  isCameraActive,
  isTracking,
  isModelLoading,
  fps,
  errorMessage,
  analysis,
  settings,
  onStartCamera,
  onStopCamera,
  onEmergencyHalt,
  onUpdateSettings,
}) => {
  const [isFrozen, setIsFrozen] = useState(false);
  const [wireframeOnly, setWireframeOnly] = useState(false);
  const [depthMatrixActive, setDepthMatrixActive] = useState(false);
  const [telemetryStreamActive, setTelemetryStreamActive] = useState(true);
  const [reZeroActive, setReZeroActive] = useState(false);
  const [exposureEv, setExposureEv] = useState<number>(0);
  const [gateThreshold, setGateThreshold] = useState<number>(0.85);

  const toggleFreeze = () => {
    setIsFrozen(prev => !prev);
    if (videoRef.current) {
      if (!isFrozen) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const toggleWireframe = () => {
    setWireframeOnly(prev => !prev);
    onUpdateSettings({
      ...settings,
      showSkeleton: true,
    });
  };

  const handleReZero = () => {
    setReZeroActive(true);
    setTimeout(() => setReZeroActive(false), 500);
    onUpdateSettings({
      ...settings,
      smoothing: 0.75,
    });
  };

  // Keyboard shortcut listener for active bench operations [SPC, c, v, d, t]
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleFreeze();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleReZero();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        toggleWireframe();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setDepthMatrixActive(prev => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTelemetryStreamActive(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFrozen, wireframeOnly, settings]);

  return (
    <div className="w-full flex flex-col gap-2.5 select-none">
      {/* Viewport Top Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-[#888888]">
        {/* Status Mode Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Active Feed Chip */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] border transition ${
              isCameraActive && isTracking
                ? 'border-[#333333] text-[#EDEDE9]'
                : 'border-[#1f1f1f] text-[#666666]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCameraActive ? 'bg-[#22c55e]' : 'bg-[#555555]'
              }`}
            />
            <span>active feed (synced).</span>
          </div>

          {/* Camera Idle Chip */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] border transition ${
              !isCameraActive
                ? 'border-[#333333] text-[#EDEDE9]'
                : 'border-[#1f1f1f] text-[#666666]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full border border-[#555555]" />
            <span>camera idle.</span>
          </div>

          {/* Calibrating Chip */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] border border-[#1f1f1f] text-[#666666]">
            <span>↻ ○ calibrating.</span>
          </div>

          {/* Obstruction / Error Chip */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#241212] border border-[#ef4444]/40 text-[#fca5a5]">
              <AlertTriangle className="w-3 h-3 text-[#ef4444]" />
              <span>obstruction / error.</span>
            </div>
          )}
        </div>

        {/* Right Optical Telemetry Info */}
        <div className="text-[10px] text-[#666666] shrink-0 font-mono">
          focal: 28mm f/1.8 · res: 1920x1080@{fps > 0 ? `${fps}hz` : '120hz'}
        </div>
      </div>

      {/* Main Optical Bench Stage Frame */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[500px] rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#202020] bg-bench-grid shadow-inner group">
        {/* Hidden/Subtle HTML5 Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            isCameraActive && !wireframeOnly ? 'opacity-25 filter grayscale contrast-125' : 'opacity-0'
          }`}
        />

        {/* 21-Node Landmark Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
        />

        {/* Empty / Offline Optical Bench Wireframe Preview */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
            {/* Corner registration brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#333333]" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-[#333333]" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-[#333333]" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#333333]" />

            <div className="flex flex-col items-center max-w-sm">
              <span className="font-mono text-xs text-[#888888] tracking-widest uppercase mb-1">
                OPTICAL BENCH · STANDBY
              </span>
              <p className="font-poppins text-xs text-[#666666] mb-4 lowercase">
                {isModelLoading
                  ? 'loading wasm hand landmarker model...'
                  : 'position hand in sensor view to initiate 21-node spatial registration.'}
              </p>

              <button
                onClick={onStartCamera}
                disabled={isModelLoading}
                className="px-4 py-2 rounded bg-[#EDEDE9] hover:bg-white text-[#090909] font-mono text-xs font-semibold tracking-tight transition cursor-pointer disabled:opacity-50"
              >
                {isModelLoading ? 'initialising wasm...' : '● start camera.'}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Vector Telemetry Bar inside Viewport */}
        <div className="absolute inset-x-0 bottom-0 px-4 py-2 bg-[#090909]/90 border-t border-[#1c1c1c] flex items-center justify-between font-mono text-[10px] text-[#777777] z-10">
          <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="text-[#999999]">6DOF VECTOR:</span>
            <span>
              u: <span className="text-[#EDEDE9]">+{analysis ? (analysis.handCenter.x).toFixed(4) : '0.3842'}</span>
            </span>
            <span>
              v: <span className="text-[#EDEDE9]">-{analysis ? (analysis.handCenter.y).toFixed(4) : '0.1042'}</span>
            </span>
            <span className="hidden sm:inline">
              z: <span className="text-[#EDEDE9]">0.542m ±0.001</span>
            </span>
            <span className="hidden md:inline">
              vel: <span className="text-[#EDEDE9]">{analysis?.swipeDirection ? '0.048m/s' : '0.038m/s'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTracking ? 'bg-[#22c55e]' : isCameraActive ? 'bg-[#f59e0b]' : 'bg-[#555555]'
              }`}
            />
            <span className={isTracking ? 'text-[#EDEDE9]' : 'text-[#666666]'}>
              {isTracking ? 'TRACKING ACTIVE' : isCameraActive ? 'SEARCHING' : 'CAMERA IDLE'}
            </span>
          </div>
        </div>
      </div>

      {/* Viewport Control Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Camera live / toggle button */}
          {isCameraActive ? (
            <button
              onClick={onStopCamera}
              className="px-3 py-1.5 rounded bg-[#EDEDE9] hover:bg-white text-[#090909] font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#090909]" />
              camera live.
            </button>
          ) : (
            <button
              onClick={onStartCamera}
              className="px-3 py-1.5 rounded bg-[#181818] hover:bg-[#222222] text-[#EDEDE9] border border-[#2b2b2b] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              camera live.
            </button>
          )}

          {/* Freeze feed button */}
          <button
            onClick={toggleFreeze}
            className={`px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 cursor-pointer ${
              isFrozen
                ? 'bg-[#262626] border-[#444444] text-[#EDEDE9]'
                : 'bg-[#121212] hover:bg-[#181818] border-[#222222] text-[#888888]'
            }`}
          >
            <span>freeze feed.</span>
            <span className="text-[10px] text-[#555555] uppercase">spc</span>
          </button>

          {/* Re-zero coordinate button */}
          <button
            onClick={handleReZero}
            className={`px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 cursor-pointer ${
              reZeroActive
                ? 'bg-[#262626] border-[#444444] text-[#EDEDE9]'
                : 'bg-[#121212] hover:bg-[#181818] border-[#222222] text-[#888888] hover:text-[#EDEDE9]'
            }`}
          >
            <span>re-zero coordinate</span>
            <span className="text-[10px] text-[#555555] lowercase">c</span>
          </button>

          {/* Wireframe toggle */}
          <button
            onClick={toggleWireframe}
            className={`px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 cursor-pointer ${
              wireframeOnly
                ? 'bg-[#262626] border-[#444444] text-[#EDEDE9]'
                : 'bg-[#121212] hover:bg-[#181818] border-[#222222] text-[#888888]'
            }`}
          >
            <span>wireframe.</span>
            <span className="text-[10px] text-[#555555] lowercase">v</span>
          </button>

          {/* Depth isolator button */}
          <button
            onClick={() => setDepthMatrixActive(!depthMatrixActive)}
            className={`hidden sm:flex px-2.5 py-1.5 rounded border transition items-center gap-1.5 cursor-pointer ${
              depthMatrixActive
                ? 'bg-[#262626] border-[#444444] text-[#EDEDE9]'
                : 'bg-[#121212] hover:bg-[#181818] border-[#222222] text-[#888888]'
            }`}
          >
            <span>depth isolator.</span>
            <span className="text-[10px] text-[#555555] uppercase">d</span>
          </button>

          {/* Telemetry stream button */}
          <button
            onClick={() => setTelemetryStreamActive(prev => !prev)}
            className={`hidden md:flex px-2.5 py-1.5 rounded border transition items-center gap-1.5 cursor-pointer ${
              telemetryStreamActive
                ? 'bg-[#121212] hover:bg-[#181818] border-[#222222] text-[#888888] hover:text-[#EDEDE9]'
                : 'bg-[#262626] border-[#444444] text-[#EDEDE9]'
            }`}
          >
            <span>telemetry stream.</span>
            <span className="text-[10px] text-[#555555] uppercase">t</span>
          </button>
        </div>

        {/* Emergency Halt Button */}
        <button
          onClick={onEmergencyHalt}
          className="px-3 py-1.5 rounded bg-[#1a1310] hover:bg-[#251710] border border-[#f59e0b]/40 text-[#f59e0b] font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
          <span>emergency halt.</span>
          <span className="text-[10px] px-1 rounded border border-[#f59e0b]/30">ESC</span>
        </button>
      </div>

      {/* Bottom Technical Calibration Sliders (as in Image 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-md bg-[#111111] border border-[#1f1f1f] font-mono text-[11px] text-[#888888]">
        {/* Exposure slider */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#666666] shrink-0">exposure (ev):</span>
          <input
            type="range"
            min="-2"
            max="2"
            step="1"
            value={exposureEv}
            onChange={e => setExposureEv(parseInt(e.target.value))}
            className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
          />
          <span className="text-[#EDEDE9] shrink-0 text-right w-10">
            {exposureEv >= 0 ? `+${exposureEv}` : exposureEv} ev
          </span>
        </div>

        {/* Gate threshold slider */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#666666] shrink-0">gate threshold:</span>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={gateThreshold}
            onChange={e => setGateThreshold(parseFloat(e.target.value))}
            className="w-full accent-[#EDEDE9] cursor-pointer h-1 bg-[#262626] rounded"
          />
          <span className="text-[#EDEDE9] shrink-0 text-right w-12">
            {gateThreshold.toFixed(2)} hi
          </span>
        </div>

        {/* Kalman filter badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[#666666]">kalman filter:</span>
          <div className="px-2 py-0.5 rounded bg-[#181818] border border-[#2b2b2b] text-[#EDEDE9] text-[10px]">
            ema α=0.25 [active]
          </div>
        </div>
      </div>
    </div>
  );
};
