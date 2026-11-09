/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Focus, 
  Hand, 
  Layers, 
  LayoutGrid, 
  SlidersHorizontal, 
  Tv 
} from 'lucide-react';
import { ActiveTab } from '../types/jarvis';

interface SidebarRailProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'overview', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'gesture', label: 'gesture', icon: <Hand className="w-4 h-4" /> },
    { id: 'focus', label: 'focus', icon: <Focus className="w-4 h-4" /> },
    { id: 'present', label: 'present', icon: <Tv className="w-4 h-4" /> },
    { id: 'workspace', label: 'workspace', icon: <Layers className="w-4 h-4" /> },
    { id: 'settings', label: 'settings', icon: <SlidersHorizontal className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-[68px] sm:w-[76px] bg-[#090909] border-r border-[#1c1c1c] flex flex-col justify-between py-4 select-none shrink-0 z-20">
      {/* Navigation items list */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#181818] text-[#EDEDE9] font-medium shadow-sm'
                  : 'text-[#666666] hover:text-[#aaaaaa] hover:bg-[#121212]'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-poppins tracking-tight lowercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Version Tag and jv stamp */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] font-mono text-[#666666]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>v4.2</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-[#151515] border border-[#222222] text-[10px] font-mono text-[#888888]">
          jv
        </div>
      </div>
    </aside>
  );
};
