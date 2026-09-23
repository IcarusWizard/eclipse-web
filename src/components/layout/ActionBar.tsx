import React from 'react';
import { PlayerState } from '../../engine/types/player';
import { PendingActionConfirmation } from '../../engine/types/state';
import {
  Compass,
  Cpu,
  Wrench,
  Hammer,
  Rocket,
  CircleOff,
  CircleDot,
  CheckCircle2,
  Check,
  Undo2,
  Lock,
  Sparkles,
} from 'lucide-react';

import {
  getMaxExploreActivations,
  getMaxResearchActivations,
  getMaxUpgradeActivations,
  getMaxBuildActivations,
  getMaxMoveActivations,
  getMaxInfluenceActivations,
} from '../../engine/rules/gameReducer';

interface ActionBarProps {
  activePlayer: PlayerState;
  isExploreMode: boolean;
  onToggleExplore: () => void;
  onOpenResearch: () => void;
  onOpenUpgrade: () => void;
  onOpenBuild: () => void;
  onOpenMove: () => void;
  onOpenInfluence: () => void;
  onPass: () => void;
  isTurnGated?: boolean;
  pendingConfirmation?: PendingActionConfirmation | null;
  onConfirmAction?: () => void;
  onRevertAction?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  activePlayer,
  isExploreMode,
  onToggleExplore,
  onOpenResearch,
  onOpenUpgrade,
  onOpenBuild,
  onOpenMove,
  onOpenInfluence,
  onPass,
  isTurnGated = false,
  pendingConfirmation,
  onConfirmAction,
  onRevertAction,
}) => {
  if (pendingConfirmation) {
    const isMyAction = !isTurnGated;
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-950/95 backdrop-blur-md px-5 py-3 rounded-2xl border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/50 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-thin">
        {/* Active Commander Indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-800 text-xs">
          <div
            className="w-3 h-3 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: activePlayer.color }}
          />
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Action Taken</span>
            <span className="font-bold text-slate-100 leading-none">{activePlayer.name}</span>
          </div>
        </div>

        {/* Action Summary */}
        <div className="flex flex-col text-left pr-3 border-r border-slate-800 max-w-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Action Completed
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate" title={pendingConfirmation.description}>
            {pendingConfirmation.description}
          </span>
          {pendingConfirmation.actionType === 'EXPLORE' && activePlayer.colonyShips.ready > 0 && (
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              You may colonize hex planets before confirming!
            </span>
          )}
        </div>

        {/* Controls */}
        {isMyAction ? (
          <div className="flex items-center gap-2">
            {pendingConfirmation.canRevert ? (
              <button
                type="button"
                onClick={onRevertAction}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-rose-800/80 transition shadow cursor-pointer"
                title="Undo action and reset turn"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Revert Action</span>
              </button>
            ) : (
              <span className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" /> Non-Reversible (Secret Info)
              </span>
            )}

            <button
              type="button"
              onClick={onConfirmAction}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/80 cursor-pointer"
              title="Finalize action and pass turn to next player"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & End Turn</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Waiting for {activePlayer.name} to confirm or revert their action...</span>
          </div>
        )}
      </div>
    );
  }
  const hasDiscs = activePlayer.influenceTrack.discsOnTrack > 0;
  const hasPassed = activePlayer.hasPassed;
  const canActNormal = !isTurnGated && hasDiscs && !hasPassed;
  const canActReaction = !isTurnGated && hasDiscs && hasPassed;
  const canPass = !isTurnGated;

  const maxExplore = getMaxExploreActivations(activePlayer);
  const maxResearch = getMaxResearchActivations(activePlayer);
  const maxUpgrade = hasPassed ? 1 : getMaxUpgradeActivations(activePlayer);
  const maxBuild = hasPassed ? 1 : getMaxBuildActivations(activePlayer);
  const maxMoves = hasPassed ? 1 : getMaxMoveActivations(activePlayer);
  const maxInfluence = getMaxInfluenceActivations(activePlayer);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-thin">
      {/* Active Commander Indicator */}
      <div className="px-3 py-1 flex items-center gap-2 border-r border-slate-800 text-xs shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
          style={{ backgroundColor: activePlayer.color }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">
            {hasPassed ? 'Reaction Turn' : 'Active Turn'}
          </span>
          <span className="font-bold text-slate-100 leading-none">{activePlayer.name}</span>
        </div>
      </div>

      {/* Disc Cost Indicator */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-r border-slate-800 text-xs font-bold text-slate-400 shrink-0">
        <CircleDot className="w-4 h-4 text-cyan-400" />
        <span>{activePlayer.influenceTrack.discsOnTrack} Discs</span>
      </div>

      {isTurnGated && (
        <div className="px-3 py-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold shrink-0">
          <span>⏳ Opponent's Turn</span>
        </div>
      )}

      {/* Explore */}
      <button
        disabled={!canActNormal}
        onClick={onToggleExplore}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          isExploreMode
            ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300'
            : canActNormal
            ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>{isExploreMode ? 'Select Target...' : `Explore (${maxExplore})`}</span>
      </button>

      {/* Research */}
      <button
        disabled={!canActNormal}
        onClick={onOpenResearch}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canActNormal
            ? 'bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Cpu className="w-4 h-4" />
        <span>Research ({maxResearch})</span>
      </button>

      {/* Upgrade */}
      <button
        disabled={!canActNormal && !canActReaction}
        onClick={onOpenUpgrade}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canActNormal || canActReaction
            ? 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Wrench className="w-4 h-4" />
        <span>{hasPassed ? 'Reaction Upgrade (1)' : `Upgrade (${maxUpgrade})`}</span>
      </button>

      {/* Build */}
      <button
        disabled={!canActNormal && !canActReaction}
        onClick={onOpenBuild}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canActNormal || canActReaction
            ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Hammer className="w-4 h-4" />
        <span>{hasPassed ? 'Reaction Build (1)' : `Build (${maxBuild})`}</span>
      </button>

      {/* Move */}
      <button
        disabled={!canActNormal && !canActReaction}
        onClick={onOpenMove}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canActNormal || canActReaction
            ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <Rocket className="w-4 h-4" />
        <span>{hasPassed ? 'Reaction Move (1)' : `Move (${maxMoves})`}</span>
      </button>

      {/* Influence */}
      <button
        disabled={!canActNormal}
        onClick={onOpenInfluence}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canActNormal
            ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <CircleDot className="w-4 h-4 text-cyan-400" />
        <span>Influence ({maxInfluence})</span>
      </button>

      <div className="h-6 w-[1px] bg-slate-800 mx-1 shrink-0" />

      {/* Pass */}
      <button
        disabled={!canPass}
        onClick={onPass}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow shrink-0 ${
          canPass
            ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700'
            : 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
        }`}
      >
        <CircleOff className="w-4 h-4" />
        <span>{hasPassed ? 'Pass' : 'Pass Turn'}</span>
      </button>
    </div>
  );
};
