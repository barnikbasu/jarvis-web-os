/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, FileText, Github, Layers, Save, Sparkles, Trash2 } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface StudyWorkspaceProps {
  onOpenExternalLink?: (name: string, url: string) => void;
}

export const StudyWorkspace: React.FC<StudyWorkspaceProps> = ({
  onOpenExternalLink,
}) => {
  const [notes, setNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jarvis_study_notes') || 
`# MISSION OBJECTIVES & STUDY PLAN
1. review mediapipe tasks vision 21-landmark kinematics.
2. verify scale-invariant joint euclidean distances.
3. test touchless pinch click and slide navigation gestures.
4. complete 25-minute pomodoro deep work focus cycle.`;
    }
    return '';
  });

  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const saveNotes = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_study_notes', notes);
      setSavedFeedback(true);
      soundEffects.playPinchClick();
      setTimeout(() => setSavedFeedback(false), 2000);
    }
  };

  const clearNotes = () => {
    setNotes('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jarvis_study_notes');
    }
    soundEffects.playPinchClick();
  };

  const handleLinkClick = (name: string, url: string) => {
    soundEffects.playPinchClick();
    if (onOpenExternalLink) {
      onOpenExternalLink(name, url);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full rounded-lg bg-[#121212] border border-[#202020] p-5 flex flex-col justify-between font-mono select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#888888]" />
          <span className="text-xs font-mono text-[#EDEDE9] lowercase">
            workspace command center.
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[10px] text-[#888888]">
          <span>👍 thumbs up: open workspace.</span>
        </div>
      </div>

      {/* External Portals Grid */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-[#666666] mb-2 font-mono">
          high-priority workspace portals (direct interaction)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Google Drive */}
          <button
            onClick={() => handleLinkClick('Google Drive', 'https://drive.google.com')}
            className="flex flex-col items-center justify-center p-3.5 rounded bg-[#0e0e0e] hover:bg-[#161616] border border-[#1f1f1f] hover:border-[#333333] transition group cursor-pointer text-center"
          >
            <div className="w-7 h-7 rounded bg-[#161616] border border-[#262626] flex items-center justify-center mb-2 text-[#EDEDE9]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-medium text-[#EDEDE9] flex items-center gap-1">
              google drive.
              <ExternalLink className="w-2.5 h-2.5 text-[#555555] group-hover:text-[#EDEDE9]" />
            </div>
            <div className="text-[10px] text-[#555555]">cloud notes</div>
          </button>

          {/* GitHub */}
          <button
            onClick={() => handleLinkClick('GitHub', 'https://github.com')}
            className="flex flex-col items-center justify-center p-3.5 rounded bg-[#0e0e0e] hover:bg-[#161616] border border-[#1f1f1f] hover:border-[#333333] transition group cursor-pointer text-center"
          >
            <div className="w-7 h-7 rounded bg-[#161616] border border-[#262626] flex items-center justify-center mb-2 text-[#EDEDE9]">
              <Github className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-medium text-[#EDEDE9] flex items-center gap-1">
              github.
              <ExternalLink className="w-2.5 h-2.5 text-[#555555] group-hover:text-[#EDEDE9]" />
            </div>
            <div className="text-[10px] text-[#555555]">repositories</div>
          </button>

          {/* ChatGPT */}
          <button
            onClick={() => handleLinkClick('ChatGPT', 'https://chatgpt.com')}
            className="flex flex-col items-center justify-center p-3.5 rounded bg-[#0e0e0e] hover:bg-[#161616] border border-[#1f1f1f] hover:border-[#333333] transition group cursor-pointer text-center"
          >
            <div className="w-7 h-7 rounded bg-[#161616] border border-[#262626] flex items-center justify-center mb-2 text-[#EDEDE9]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-medium text-[#EDEDE9] flex items-center gap-1">
              chatgpt.
              <ExternalLink className="w-2.5 h-2.5 text-[#555555] group-hover:text-[#EDEDE9]" />
            </div>
            <div className="text-[10px] text-[#555555]">research ai</div>
          </button>
        </div>
      </div>

      {/* Technical Scratchpad */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between text-xs text-[#888888] mb-2 font-mono">
          <span>scratchpad memo.</span>
          <div className="flex items-center gap-2">
            {savedFeedback && (
              <span className="text-[10px] text-[#22c55e]">
                saved to local storage.
              </span>
            )}
            <button
              onClick={clearNotes}
              title="Clear scratchpad"
              className="p-1 rounded text-[#555555] hover:text-[#EDEDE9] transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={saveNotes}
              title="Save notes"
              className="p-1 rounded text-[#888888] hover:text-[#EDEDE9] transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="jot down technical memos, research notes, equations..."
          rows={6}
          className="w-full p-3 rounded bg-[#0a0a0a] border border-[#1c1c1c] text-xs font-mono text-[#EDEDE9] placeholder-[#444444] focus:outline-none focus:border-[#3b3b3b] resize-none"
        />
      </div>
    </div>
  );
};
