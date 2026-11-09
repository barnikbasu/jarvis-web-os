/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HeroMastheadProps {
  fps: number;
  isTracking: boolean;
  latencyMs?: string;
}

export const HeroMasthead: React.FC<HeroMastheadProps> = ({
  fps,
  isTracking,
  latencyMs = '1.4ms',
}) => {
  return (
    <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 select-none pb-2">
      {/* Left Masthead Text */}
      <div className="flex flex-col">
        {/* Optical Engine Status Tag */}
        <div className="flex items-center gap-2 mb-2 font-mono text-[10px] tracking-widest text-[#888888] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>NEURAL OPTIC ENGINE · {isTracking ? 'ONLINE' : 'STANDBY'}</span>
        </div>

        {/* Huge Bold Title */}
        <h1 className="font-poppins text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#EDEDE9] leading-[1.05] lowercase">
          your hands. your<br />workspace.
        </h1>

        {/* Subtitle */}
        <p className="font-poppins text-xs sm:text-sm text-[#888888] mt-2 lowercase">
          an interface that moves with you.
        </p>
      </div>

      {/* Right Technical Metrics Chips */}
      <div className="flex flex-wrap items-center gap-2 self-start md:self-end font-mono text-[11px]">
        <div className="px-3 py-1.5 rounded-md bg-[#121212] border border-[#202020] text-[#777777]">
          engine: <span className="text-[#EDEDE9] font-medium">v4.2-core</span>
        </div>

        <div className="px-3 py-1.5 rounded-md bg-[#121212] border border-[#202020] text-[#777777]">
          pipeline: <span className="text-[#EDEDE9] font-medium">wasm {fps > 0 ? `${fps}fps` : '120fps'} direct</span>
        </div>

        <div className="px-3 py-1.5 rounded-md bg-[#121212] border border-[#202020] text-[#777777]">
          sync: <span className="text-[#22c55e] font-medium">{latencyMs} lat</span>
        </div>
      </div>
    </div>
  );
};
