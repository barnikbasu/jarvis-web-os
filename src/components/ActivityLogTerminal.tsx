/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActionLogItem } from '../types/jarvis';

interface ActivityLogTerminalProps {
  logs: ActionLogItem[];
}

export const ActivityLogTerminal: React.FC<ActivityLogTerminalProps> = ({ logs }) => {
  // Default initial feed items if empty
  const defaultLogs: ActionLogItem[] = [
    {
      id: 'd1',
      timestamp: '10:42:08.114',
      category: 'IO',
      action: 'camera initialised.',
      gesture: 'NONE',
      source: 'MANUAL',
    },
    {
      id: 'd2',
      timestamp: '10:42:11.492',
      category: 'OPTIC',
      action: 'hand detected in frame 01.',
      gesture: 'POINTING',
      source: 'GESTURE',
    },
    {
      id: 'd3',
      timestamp: '10:42:13.208',
      category: 'CLASS',
      action: 'open palm recognised.',
      gesture: 'OPEN_PALM',
      source: 'GESTURE',
    },
    {
      id: 'd4',
      timestamp: '10:42:16.882',
      category: 'SYNC',
      action: 'gesture mode activated.',
      gesture: 'OPEN_PALM',
      source: 'GESTURE',
      highlight: true,
    },
    {
      id: 'd5',
      timestamp: '10:42:24.015',
      category: 'EXEC',
      action: 'pinch dispatched -> #node-04',
      gesture: 'PINCH',
      source: 'GESTURE',
    },
  ];

  const [filter, setFilter] = useState<'all' | 'gestures' | 'errors' | 'io'>('all');
  const [heapMb, setHeapMb] = useState<string>('34.2mb');

  React.useEffect(() => {
    const updateMemory = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mem = (performance as any)?.memory;
      if (mem && mem.usedJSHeapSize) {
        setHeapMb(`${(mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)}mb`);
      }
    };
    updateMemory();
    const interval = setInterval(updateMemory, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'gestures') return item.source === 'GESTURE' || item.category === 'CLASS' || item.category === 'SYNC';
    if (filter === 'errors') return item.action.toLowerCase().includes('error') || item.action.toLowerCase().includes('halt');
    if (filter === 'io') return item.category === 'IO' || item.category === 'EXEC';
    return true;
  });

  const displayLogs = filteredLogs.length > 0 ? filteredLogs.slice(0, 5) : defaultLogs;

  return (
    <div className="w-full bg-[#0a0a0a] border-t border-[#1c1c1c] p-4 select-none font-mono">
      {/* Terminal Top Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#666666] mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[#888888]">activity log.</span>
          <span className="text-[#555555]">/ fifo buffer: 512 entries</span>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 ml-1">
            {(['all', 'gestures', 'errors', 'io'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-0.5 rounded text-[10px] lowercase transition cursor-pointer ${
                  filter === tab
                    ? 'bg-[#1c1c1c] text-[#EDEDE9] font-medium'
                    : 'text-[#666666] hover:text-[#888888]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Right Telemetry Health Indicators */}
        <div className="flex items-center gap-3 text-[10px] text-[#666666]">
          <span className="text-[#22c55e]">zero frame drops</span>
          <span>·</span>
          <span>wasm heap: {heapMb}</span>
          <span>·</span>
          <span>cpu: 4.8%</span>
        </div>
      </div>

      {/* 5 Horizontal Log Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {displayLogs.map(item => {
          const isHighlighted = item.highlight || item.category === 'SYNC';
          const isExec = item.category === 'EXEC';
          return (
            <div
              key={item.id}
              className={`p-2.5 rounded bg-[#111111] border transition text-left flex flex-col justify-between ${
                isExec
                  ? 'border-[#2e2e2e]'
                  : 'border-[#1a1a1a]'
              }`}
            >
              {/* Card Top: Timestamp & Category */}
              <div className="flex items-center justify-between text-[10px] text-[#555555] mb-1.5 font-mono">
                <span>{item.timestamp}</span>
                <span className="font-semibold uppercase tracking-wider text-[9px]">
                  {item.category}
                </span>
              </div>

              {/* Card Bottom: Action message */}
              <div
                className={`text-[11px] truncate font-mono ${
                  isHighlighted
                    ? 'text-[#22c55e]'
                    : isExec
                    ? 'text-[#EDEDE9] font-medium'
                    : 'text-[#888888]'
                }`}
              >
                {item.action}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
