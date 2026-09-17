import React from 'react';
import { PlayerState } from '../../engine/types/player';
import {
  Compass,
  Cpu,
  Wrench,
  Hammer,
  Rocket,
  CircleOff,
  CircleDot,
} from 'lucide-react';

import { getMaxBuildActivations, getMaxMoveActivations } from '../../engine/rules/gameReducer';

interface ActionBarProps {
  activePlayer: PlayerState;
  isExploreMode: boolean;
  onToggleExplore: () => void;
  onOpenResearch: () => void;
  onOpenUpgrade: () => void;
  onOpenBuild: () => void;
  onOpenMove: () => void;
  onPass: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  activePlayer,
  isExploreMode,
  onToggleExplore,
  onOpenResearch,
  onOpenUpgrade,
  onOpenBuild,
  onOpenMove,
  onPass,
}) => {
  const hasDiscs = activePlayer.influenceTrack.discsOnTrack > 0;
  const hasPassed = activePlayer.hasPassed;
  const maxBuild = getMaxBuildActivations(activePlayer);
  const maxMoves = getMaxMoveActivations(activePlayer);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Active Commander Indicator */}
      <div className="px-3 py-1 flex items-center gap-2 border-r border-slate-800 text-xs">
        <div
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
          style={{ backgroundColor: activePlayer.color }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Active Turn</span>
          <span className="font-bold text-slate-100 leading-none">{activePlayer.name}</span>
        </div>
      </div>

      {/* Disc Cost Indicator */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-r border-slate-800 text-xs font-bold text-slate-400">
        <CircleDot className="w-4 h-4 text-cyan-400" />
        <span>{activePlayer.influenceTrack.discsOnTrack} Discs</span>
      </div>

      {/* Explore */}
      <button
        disabled={!hasDiscs || hasPassed}
        onClick={onToggleExplore}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          isExploreMode
            ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300'
            : hasDiscs && !hasPassed
            ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>{isExploreMode ? 'Select Target...' : 'Explore'}</span>
      </button>

      {/* Research */}
      <button
        disabled={!hasDiscs || hasPassed}
        onClick={onOpenResearch}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          hasDiscs && !hasPassed
            ? 'bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Cpu className="w-4 h-4" />
        <span>Research</span>
      </button>

      {/* Upgrade */}
      <button
        disabled={!hasDiscs || hasPassed}
        onClick={onOpenUpgrade}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          hasDiscs && !hasPassed
            ? 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Wrench className="w-4 h-4" />
        <span>Upgrade</span>
      </button>

      {/* Build */}
      <button
        disabled={!hasDiscs || hasPassed}
        onClick={onOpenBuild}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          hasDiscs && !hasPassed
            ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Hammer className="w-4 h-4" />
        <span>Build ({maxBuild})</span>
      </button>

      {/* Move */}
      <button
        disabled={!hasDiscs || hasPassed}
        onClick={onOpenMove}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          hasDiscs && !hasPassed
            ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Rocket className="w-4 h-4" />
        <span>Move ({maxMoves})</span>
      </button>

      <div className="h-6 w-[1px] bg-slate-800 mx-1" />

      {/* Pass */}
      <button
        disabled={hasPassed}
        onClick={onPass}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow ${
          !hasPassed
            ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <CircleOff className="w-4 h-4" />
        <span>{hasPassed ? 'Passed' : 'Pass Turn'}</span>
      </button>
    </div>
  );
};
