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
  pendingExploreActivations?: number;
  onConfirmAction?: () => void;
  onRevertAction?: () => void;
  nextPassTileNum?: number;
  isTurnOrderVariant?: boolean;
  onOpenPulsar?: () => void;
  hasPulsarAvailable?: boolean;
  currentRound?: number;
  delayedBlackHoleShips?: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip[];
  onOpenBlackHoleReturn?: (ship: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip) => void;
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
  pendingExploreActivations,
  onConfirmAction,
  onRevertAction,
  nextPassTileNum,
  isTurnOrderVariant = false,
  onOpenPulsar,
  hasPulsarAvailable = false,
  currentRound,
  delayedBlackHoleShips = [],
  onOpenBlackHoleReturn,
}) => {
  const readyBlackHoleShip = (delayedBlackHoleShips || []).find(
    (ds) => ds.ownerId === activePlayer.id && currentRound !== undefined && currentRound >= ds.returnRound
  );
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
          {pendingConfirmation.actionType === 'INFLUENCE' && (
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              {pendingConfirmation.influenceRefreshesRemaining && pendingConfirmation.influenceRefreshesRemaining > 0
                ? `You may colonize hex planets (${pendingConfirmation.influenceRefreshesRemaining} flip-back refresh available)!`
                : 'You may colonize hex planets before confirming!'}
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
                title={
                  pendingConfirmation.actionPayload?.type === 'DISCOVERY_CHOICE'
                    ? 'Change your mind about +2 VP or reward'
                    : 'Undo action and reset turn'
                }
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {pendingConfirmation.actionPayload?.type === 'DISCOVERY_CHOICE'
                    ? 'Change Discovery'
                    : 'Revert'}
                </span>
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
  const hasPendingExplore = Boolean(pendingExploreActivations && pendingExploreActivations > 0);
  const canExplore = (!isTurnGated && hasDiscs && !hasPassed) || (!isTurnGated && hasPendingExplore);
  const canActNormal = !isTurnGated && hasDiscs && !hasPassed && !hasPendingExplore;
  const canActReaction = !isTurnGated && hasDiscs && hasPassed && !hasPendingExplore;
  const canPass = !isTurnGated && !hasPendingExplore;

  const maxExplore = getMaxExploreActivations(activePlayer);
  const maxResearch = getMaxResearchActivations(activePlayer);
  const maxUpgrade = hasPassed ? 1 : getMaxUpgradeActivations(activePlayer);
  const maxBuild = hasPassed ? 1 : getMaxBuildActivations(activePlayer);
  const maxMoves = hasPassed ? 1 : getMaxMoveActivations(activePlayer);
  const maxInfluence = getMaxInfluenceActivations(activePlayer);

  return (
    <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 bg-slate-950/95 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl w-[calc(100vw-12px)] max-w-fit">
      {/* Status Header */}
      <div className="w-full flex items-center justify-between gap-3 px-2 pb-1 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 shrink-0"
            style={{ backgroundColor: activePlayer.color }}
          />
          <span className="font-bold text-slate-100 text-xs truncate max-w-[130px] sm:max-w-[160px]">{activePlayer.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 uppercase font-semibold">
            {hasPassed ? 'Reaction' : 'Active'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isTurnGated && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ⏳ Opponent's Turn
            </span>
          )}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-cyan-300">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{activePlayer.influenceTrack.discsOnTrack} Discs</span>
          </div>

          {/* Spacetime Anomaly Indicator (Bug 145) */}
          {delayedBlackHoleShips.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-[10px] font-bold text-indigo-300">
              <span className="text-indigo-400">🌀</span>
              <span className="hidden sm:inline">Black Hole:</span>
              {delayedBlackHoleShips.map((ds) => {
                const canRet = currentRound !== undefined && currentRound >= ds.returnRound;
                const isMine = ds.ownerId === activePlayer.id;
                return (
                  <span
                    key={ds.shipId}
                    onClick={() => {
                      if (canRet && isMine && onOpenBlackHoleReturn) {
                        onOpenBlackHoleReturn(ds);
                      }
                    }}
                    className={`px-1 py-0.2 rounded font-mono text-[9px] ${
                      canRet && isMine
                        ? 'bg-indigo-500 text-slate-950 cursor-pointer animate-pulse font-black shadow'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                    title={`${ds.shipType.toUpperCase()} in Black Hole ${ds.blackHoleSectorNumber}. Returns Round ${ds.returnRound}${canRet && isMine ? ' (Click to Return Now)' : ''}`}
                  >
                    {ds.shipType.slice(0, 3).toUpperCase()} &rarr; R{ds.returnRound}
                    {canRet && isMine && ' ⚡'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div
        className={`grid ${
          hasPulsarAvailable && readyBlackHoleShip
            ? 'grid-cols-9'
            : hasPulsarAvailable || readyBlackHoleShip
            ? 'grid-cols-8'
            : 'grid-cols-7'
        } gap-1 sm:gap-1.5 w-full`}
      >
        {/* Explore */}
        <button
          disabled={!canExplore}
          onClick={onToggleExplore}
          title={
            isExploreMode
              ? hasPendingExplore
                ? 'Cancel Explore & finish turn'
                : 'Cancel Explore Target'
              : hasPendingExplore
              ? 'Finish Explore action & end turn'
              : `Explore (EXP) - Discover new sectors (${maxExplore} activation)`
          }
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            isExploreMode
              ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300'
              : canExplore
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span className="leading-tight">{isExploreMode ? 'Cancel' : hasPendingExplore ? 'Finish' : 'EXP'}</span>
          {!isExploreMode ? (
            <span className="text-[8.5px] opacity-80 leading-none">
              ({hasPendingExplore ? pendingExploreActivations : maxExplore})
            </span>
          ) : (
            <span className="text-[8.5px] opacity-0 leading-none">(-)</span>
          )}
        </button>

        {/* Research */}
        <button
          disabled={!canActNormal}
          onClick={onOpenResearch}
          title={`Research (RES) - Acquire technologies (${maxResearch} activation)`}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4 shrink-0" />
          <span className="leading-tight">RES</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxResearch})</span>
        </button>

        {/* Upgrade */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenUpgrade}
          title={hasPassed ? 'Reaction Upgrade (UPG) - 1 ship component' : `Upgrade (UPG) - Up to ${maxUpgrade} ship component upgrades`}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span className="leading-tight">UPG</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxUpgrade})</span>
        </button>

        {/* Build */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenBuild}
          title={hasPassed ? 'Reaction Build (BLD) - 1 ship or structure' : `Build (BLD) - Up to ${maxBuild} ships or structures`}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Hammer className="w-4 h-4 shrink-0" />
          <span className="leading-tight">BLD</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxBuild})</span>
        </button>

        {/* Move */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenMove}
          title={hasPassed ? 'Reaction Move (MOV) - 1 ship movement' : `Move (MOV) - Up to ${maxMoves} ship movements`}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Rocket className="w-4 h-4 shrink-0" />
          <span className="leading-tight">MOV</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxMoves})</span>
        </button>

        {/* Influence */}
        <button
          disabled={!canActNormal}
          onClick={onOpenInfluence}
          title={`Influence (INF) - Up to ${maxInfluence} disc actions`}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <CircleDot className="w-4 h-4 shrink-0 text-cyan-400" />
          <span className="leading-tight">INF</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxInfluence})</span>
        </button>

        {/* Pulsar Special Action */}
        {hasPulsarAvailable && (
          <button
            type="button"
            onClick={onOpenPulsar}
            title="Activate Pulsar Sector (Free Action without taking an Influence Disc)"
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer bg-gradient-to-b from-cyan-950 to-slate-900 border-2 border-cyan-400 text-cyan-200 animate-pulse hover:scale-105 min-w-[44px] sm:min-w-[52px]"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-300" />
            <span className="leading-tight">PULSAR</span>
            <span className="text-[8.5px] text-cyan-400 font-mono leading-none">FREE</span>
          </button>
        )}

        {/* Black Hole Return Action (Bug 145) */}
        {readyBlackHoleShip && onOpenBlackHoleReturn && (
          <button
            type="button"
            onClick={() => onOpenBlackHoleReturn(readyBlackHoleShip)}
            title={`Return ${readyBlackHoleShip.shipType.toUpperCase()} from Black Hole to board (Round ${currentRound})`}
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-indigo-400 text-indigo-200 animate-pulse hover:scale-105 min-w-[44px] sm:min-w-[52px]"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-300 animate-spin" />
            <span className="leading-tight">RETURN</span>
            <span className="text-[8.5px] text-indigo-400 font-mono leading-none">FREE</span>
          </button>
        )}

        {/* Pass */}
        <button
          disabled={!canPass}
          onClick={onPass}
          title={
            hasPendingExplore
              ? 'Must finish exploration before passing'
              : hasPassed
              ? 'Pass reaction turn'
              : isTurnOrderVariant && nextPassTileNum
              ? `Pass turn (claims Next Turn Order Tile #${nextPassTileNum}${nextPassTileNum === 1 ? ' & +2 Credits bonus' : ''})`
              : 'Pass turn (receive 2 Credits for 1st pass)'
          }
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canPass
              ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <CircleOff className="w-4 h-4 shrink-0" />
          <span className="leading-tight">PASS</span>
          {isTurnOrderVariant && nextPassTileNum && !hasPassed ? (
            <span className="text-[8.5px] text-purple-400 font-mono font-bold leading-none">
              #{nextPassTileNum}
            </span>
          ) : (
            <span className="text-[8.5px] opacity-0 leading-none">(-)</span>
          )}
        </button>
      </div>
    </div>
  );
};
