/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Tv } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { SlideItem } from '../types/jarvis';

export const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 1,
    tag: 'protocol 01',
    title: 'neural optic engine.',
    subtitle: 'zero-install in-browser computer vision operating system',
    summary:
      'A spatial computing interface operating completely within modern web browsers. Built for zero-friction edge deployment to Vercel with instant accessibility.',
    bulletPoints: [
      'client-side inference: hand landmarks computed locally via wasm 120fps direct.',
      'teenage engineering aesthetic: designed with tactile monochrome precision.',
      'privacy hardened: video frames never leave local machine memory.',
    ],
    metricLabel: 'processing latency',
    metricValue: '< 16 ms / frame',
  },
  {
    id: 2,
    tag: 'kinematics 02',
    title: 'mediapipe 21-node matrix.',
    subtitle: 'real-time geometric kinematics & sub-pixel joint tracking',
    summary:
      'The optical pipeline maps 21 three-dimensional skeletal coordinates across wrist, carpals, metacarpals, interphalangeal, and distal fingertip joints.',
    bulletPoints: [
      'scale-invariant normalization: automatically adapts to hand distance from sensor.',
      'exponential moving average smoothing: eliminates jitter while preserving snappy response.',
      'active reach box: maps natural hand range to the full viewport perimeter.',
    ],
    metricLabel: 'joint accuracy',
    metricValue: '99.2% sub-pixel',
  },
  {
    id: 3,
    tag: 'interaction 03',
    title: 'spatial gesture lexicon.',
    subtitle: 'intuitive kinematic commands with multi-frame confirmation',
    summary:
      'A deterministic state machine translates dynamic finger configurations into deterministic OS actions with built-in hysteresis and action cooldowns.',
    bulletPoints: [
      'open palm: toggle jarvis active / standby telemetry link.',
      'index pointing: direct virtual holographic cursor position.',
      'thumb-index pinch: dispatches synthetic pointerdown & click events on dom nodes.',
      'peace sign (v): swipes presentation slides left / right.',
      'thumbs up: instantly deploys study workspace & research hub.',
      'closed fist: toggles pomodoro focus timer.',
    ],
    metricLabel: 'false trigger rate',
    metricValue: '< 0.05% guarded',
  },
  {
    id: 4,
    tag: 'virtual desktop 04',
    title: 'true spatial reticle system.',
    subtitle: 'hardware-accelerated in-browser virtual pointer & ripple clicker',
    summary:
      'Unlike passive animated cursors, the jarvis virtual reticle dynamically probes the DOM using elementFromPoint, allowing touchless hand-control of real buttons, sliders, and navigation.',
    bulletPoints: [
      'precision reticle: floating target with rotating telemetry rings and coordinate readouts.',
      'pinch detection: dynamic micro-distance threshold triggering real interactive clicks.',
      'visual ripple feedback: shockwave expands upon successful selection confirmation.',
    ],
    metricLabel: 'resolution',
    metricValue: 'sub-pixel viewport',
  },
  {
    id: 5,
    tag: 'privacy 05',
    title: 'zero-server privacy guarantee.',
    subtitle: 'confidentiality by design — no telemetry, no cloud streams',
    summary:
      'Designed to run strictly on the client. All webcam frames remain ephemeral in local GPU/CPU texture buffers and are immediately overwritten.',
    bulletPoints: [
      'no video storage: streams terminate instantly on emergency stop or camera shutdown.',
      'vercel edge ready: single-command deployment with zero backend dependencies.',
      'offline resilient: operates seamlessly without persistent internet once assets are cached.',
    ],
    metricLabel: 'data transmitted',
    metricValue: '0.00 kb external',
  },
];

interface PresentationViewerProps {
  externalNavTrigger?: { direction: 'next' | 'prev'; timestamp: number } | null;
  externalZoomScale?: number;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  externalNavTrigger,
  externalZoomScale = 1.0,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localZoom, setLocalZoom] = useState(1.0);
  const lastNavTimestampRef = React.useRef<number>(0);

  // Sync external zoom scale when two-hand zoom is active
  useEffect(() => {
    if (externalZoomScale && externalZoomScale !== 1.0) {
      setLocalZoom(z => Math.max(0.6, Math.min(2.0, z * externalZoomScale)));
    }
  }, [externalZoomScale]);

  const goToNext = React.useCallback(() => {
    setCurrentSlideIndex(prev => {
      const next = (prev + 1) % DEFAULT_SLIDES.length;
      soundEffects.playSlideNav('next');
      return next;
    });
  }, []);

  const goToPrev = React.useCallback(() => {
    setCurrentSlideIndex(prev => {
      const next = (prev - 1 + DEFAULT_SLIDES.length) % DEFAULT_SLIDES.length;
      soundEffects.playSlideNav('prev');
      return next;
    });
  }, []);

  // Handle external navigation from Peace Sign gesture
  useEffect(() => {
    if (
      externalNavTrigger &&
      externalNavTrigger.timestamp > 0 &&
      externalNavTrigger.timestamp > lastNavTimestampRef.current
    ) {
      lastNavTimestampRef.current = externalNavTrigger.timestamp;
      if (externalNavTrigger.direction === 'next') {
        goToNext();
      } else {
        goToPrev();
      }
    }
  }, [externalNavTrigger, goToNext, goToPrev]);

  // Keyboard navigation fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const currentSlide = DEFAULT_SLIDES[currentSlideIndex];

  return (
    <div
      className={`rounded-lg bg-[#121212] border border-[#202020] p-5 flex flex-col justify-between font-mono select-none ${
        isFullscreen
          ? 'fixed inset-4 z-40 bg-[#0c0c0c] p-6 border-[#333333]'
          : 'w-full'
      }`}
    >
      {/* Top Slide Header Bar */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-[#888888]" />
          <span className="text-xs font-mono text-[#EDEDE9] lowercase">
            presentation viewer.
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[#888888]">
            <span>zoom:</span>
            <span className="text-[#EDEDE9] font-bold">{Math.round(localZoom * 100)}%</span>
            <button
              onClick={() => setLocalZoom(z => Math.max(0.6, z - 0.1))}
              className="px-1 hover:text-[#EDEDE9] cursor-pointer"
            >
              -
            </button>
            <button
              onClick={() => setLocalZoom(1.0)}
              className="px-1 hover:text-[#EDEDE9] cursor-pointer"
            >
              1:1
            </button>
            <button
              onClick={() => setLocalZoom(z => Math.min(2.0, z + 0.1))}
              className="px-1 hover:text-[#EDEDE9] cursor-pointer"
            >
              +
            </button>
          </div>

          <div className="px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[#888888]">
            ✌ peace: swipe · 👐 zoom
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-[#181818] hover:bg-[#202020] text-[#888888] hover:text-[#EDEDE9] border border-[#262626] transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Slide Card Content */}
      <div
        className="my-2 flex-1 flex flex-col justify-center transition-transform duration-200"
        style={{ transform: `scale(${localZoom})`, transformOrigin: 'top center' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-[#888888] px-2 py-0.5 rounded bg-[#181818] border border-[#242424]">
            {currentSlide.tag}
          </span>
          <span className="text-xs text-[#666666]">
            slide <span className="text-[#EDEDE9] font-bold">0{currentSlideIndex + 1}</span> / 0{DEFAULT_SLIDES.length}
          </span>
        </div>

        <h3 className="font-poppins text-2xl sm:text-3xl font-bold tracking-tight text-[#EDEDE9] mb-1 lowercase">
          {currentSlide.title}
        </h3>
        <p className="text-xs text-[#777777] mb-4 lowercase">
          {currentSlide.subtitle}
        </p>

        <p className="text-xs sm:text-sm text-[#aaaaaa] leading-relaxed mb-4 p-3.5 rounded bg-[#0e0e0e] border border-[#1a1a1a]">
          {currentSlide.summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            {currentSlide.bulletPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-[#888888] font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDE9] mt-1.5 shrink-0" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          {currentSlide.metricValue && (
            <div className="flex flex-col items-center justify-center p-3 rounded bg-[#161616] border border-[#262626] text-center">
              <span className="text-[10px] text-[#666666] uppercase tracking-wider mb-1">
                {currentSlide.metricLabel}
              </span>
              <span className="font-mono text-base font-bold text-[#EDEDE9]">
                {currentSlide.metricValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#1c1c1c] mt-4">
        {/* Slide Dots */}
        <div className="flex items-center gap-1.5">
          {DEFAULT_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => {
                setCurrentSlideIndex(idx);
                soundEffects.playPinchClick();
              }}
              className={`h-1.5 rounded-xs transition-all cursor-pointer ${
                idx === currentSlideIndex
                  ? 'w-6 bg-[#EDEDE9]'
                  : 'w-2 bg-[#262626] hover:bg-[#444444]'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="px-3 py-1.5 rounded bg-[#181818] hover:bg-[#202020] text-[#EDEDE9] border border-[#282828] transition flex items-center gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>prev.</span>
          </button>

          <button
            onClick={goToNext}
            className="px-4 py-1.5 rounded bg-[#EDEDE9] hover:bg-white text-[#090909] font-medium transition flex items-center gap-1 text-xs cursor-pointer"
          >
            <span>next.</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
