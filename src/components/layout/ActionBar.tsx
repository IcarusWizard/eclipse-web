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
      <div className="fixed md:absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col md:flex-row items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur-md p-3 md:px-5 md:py-3 rounded-2xl border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/50 animate-in fade-in slide-in-from-bottom-3 duration-200 w-[calc(100vw-12px)] max-w-xl md:w-auto md:max-w-fit">
        {/* Active Commander Indicator */}
        <div className="flex items-center justify-between w-full md:w-auto md:pr-3 md:border-r md:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-white/20 shrink-0"
              style={{ backgroundColor: activePlayer.color }}
            />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Action Taken</span>
              <span className="font-bold text-slate-100 leading-none">{activePlayer.name}</span>
            </div>
          </div>
          {/* Action Completed badge on mobile */}
          <div className="md:hidden">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Done
            </span>
          </div>
        </div>

        {/* Action Summary */}
        <div className="flex flex-col text-left w-full md:w-auto md:pr-3 md:border-r md:border-slate-800 max-w-full md:max-w-sm">
          <span className="hidden md:flex text-[10px] uppercase font-bold text-emerald-400 tracking-wider items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Action Completed
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate" title={pendingConfirmation.description}>
            {pendingConfirmation.description}
          </span>
          {pendingConfirmation.actionType === 'EXPLORE' && activePlayer.colonyShips.ready > 0 && (
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              You may colonize hex planets before confirming!
            </span>
          )}
        </div>

        {/* Controls */}
        {isMyAction ? (
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {pendingConfirmation.canRevert ? (
              <button
                type="button"
                onClick={onRevertAction}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-rose-800/80 transition shadow cursor-pointer"
                title="Undo action and reset turn"
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
                <span>Revert</span>
              </button>
            ) : (
              <span className="flex-1 md:flex-initial px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-1 text-center">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" /> Non-Reversible
              </span>
            )}

            <button
              type="button"
              onClick={onConfirmAction}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/80 cursor-pointer"
              title="Finalize action and pass turn to next player"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Confirm & End Turn</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold w-full md:w-auto">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">Waiting for {activePlayer.name} to confirm or revert...</span>
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
    <div className="fixed md:absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col md:flex-row items-center gap-1 md:gap-2 bg-slate-950/95 backdrop-blur-md p-1.5 md:p-2 rounded-2xl border border-slate-800 shadow-2xl w-[calc(100vw-12px)] max-w-lg md:w-auto md:max-w-fit">
      {/* Mobile Status Header (hidden on md+) */}
      <div className="flex md:hidden w-full items-center justify-between px-1.5 pb-1 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 shrink-0"
            style={{ backgroundColor: activePlayer.color }}
          />
          <span className="font-bold text-slate-100 text-xs truncate max-w-[110px]">{activePlayer.name}</span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900 text-slate-400 uppercase font-semibold">
            {hasPassed ? 'Reaction' : 'Active'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isTurnGated && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              ⏳ Wait
            </span>
          )}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-cyan-300">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{activePlayer.influenceTrack.discsOnTrack} Discs</span>
          </div>
        </div>
      </div>

      {/* Desktop Active Commander Indicator (hidden on mobile) */}
      <div className="hidden md:flex px-2.5 sm:px-3 py-1 items-center gap-2 border-r border-slate-800 text-xs shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
          style={{ backgroundColor: activePlayer.color }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[8.5px] sm:text-[9px] text-slate-400 uppercase tracking-widest font-semibold">
            {hasPassed ? 'Reaction Turn' : 'Active Turn'}
          </span>
          <span className="font-bold text-slate-100 text-xs leading-none">{activePlayer.name}</span>
        </div>
      </div>

      {/* Desktop Disc Cost Indicator (hidden on mobile) */}
      <div className="hidden md:flex px-2.5 sm:px-3 py-1.5 items-center gap-1.5 border-r border-slate-800 text-xs font-bold text-slate-400 shrink-0">
        <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
        <span>{activePlayer.influenceTrack.discsOnTrack} Discs</span>
      </div>

      {isTurnGated && (
        <div className="hidden md:flex px-2.5 sm:px-3 py-1 items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold shrink-0">
          <span>⏳ Opponent's Turn</span>
        </div>
      )}

      {/* Actions Grid (mobile) / Flex Row (desktop) */}
      <div className="grid grid-cols-7 gap-1 w-full md:flex md:items-center md:gap-2 md:w-auto overflow-x-auto scrollbar-none">
        {/* Explore */}
        <button
          disabled={!canActNormal}
          onClick={onToggleExplore}
          title={isExploreMode ? 'Cancel Explore Target' : `Explore (EXP) - Discover new sectors (${maxExplore} activation)`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            isExploreMode
              ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300'
              : canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">{isExploreMode ? 'EXP (Cancel)' : `EXP (${maxExplore})`}</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>{isExploreMode ? 'Cancel' : 'EXP'}</span>
            {!isExploreMode && <span className="text-[8.5px] opacity-80">({maxExplore})</span>}
          </span>
        </button>

        {/* Research */}
        <button
          disabled={!canActNormal}
          onClick={onOpenResearch}
          title={`Research (RES) - Acquire technologies (${maxResearch} activation)`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">RES ({maxResearch})</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>RES</span>
            <span className="text-[8.5px] opacity-80">({maxResearch})</span>
          </span>
        </button>

        {/* Upgrade */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenUpgrade}
          title={hasPassed ? 'Reaction Upgrade (UPG) - 1 ship component' : `Upgrade (UPG) - Up to ${maxUpgrade} ship component upgrades`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">UPG ({maxUpgrade})</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>UPG</span>
            <span className="text-[8.5px] opacity-80">({maxUpgrade})</span>
          </span>
        </button>

        {/* Build */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenBuild}
          title={hasPassed ? 'Reaction Build (BLD) - 1 ship or structure' : `Build (BLD) - Up to ${maxBuild} ships or structures`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Hammer className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">BLD ({maxBuild})</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>BLD</span>
            <span className="text-[8.5px] opacity-80">({maxBuild})</span>
          </span>
        </button>

        {/* Move */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenMove}
          title={hasPassed ? 'Reaction Move (MOV) - 1 ship movement' : `Move (MOV) - Up to ${maxMoves} ship movements`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Rocket className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">MOV ({maxMoves})</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>MOV</span>
            <span className="text-[8.5px] opacity-80">({maxMoves})</span>
          </span>
        </button>

        {/* Influence */}
        <button
          disabled={!canActNormal}
          onClick={onOpenInfluence}
          title={`Influence (INF) - Up to ${maxInfluence} disc actions`}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <CircleDot className="w-4 h-4 shrink-0 text-cyan-400" />
          <span className="hidden md:inline">INF ({maxInfluence})</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>INF</span>
            <span className="text-[8.5px] opacity-80">({maxInfluence})</span>
          </span>
        </button>

        {/* Desktop Separator */}
        <div className="hidden md:block h-6 w-[1px] bg-slate-800 mx-0.5 sm:mx-1 shrink-0" />

        {/* Pass */}
        <button
          disabled={!canPass}
          onClick={onPass}
          title={hasPassed ? 'Pass reaction turn' : 'Pass turn (receive 2 Credits for 1st pass)'}
          className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-1 md:px-3.5 py-1.5 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed ${
            canPass
              ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <CircleOff className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">PASS</span>
          <span className="md:hidden flex flex-col items-center leading-tight">
            <span>PASS</span>
            <span className="text-[8.5px] opacity-0">(-)</span>
          </span>
        </button>
      </div>
    </div>
  );
};
