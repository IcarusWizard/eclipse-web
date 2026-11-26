import React from 'react';
import { PlayerState } from '../../engine/types/player';
import { PendingActionConfirmation } from '../../engine/types/state';
import { translateActionDescription } from '../../i18n/chronicleTranslator';
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
  Zap,
  AlertTriangle,
} from 'lucide-react';

import {
  getMaxExploreActivations,
  getMaxResearchActivations,
  getMaxUpgradeActivations,
  getMaxBuildActivations,
  getMaxMoveActivations,
  getMaxInfluenceActivations,
  getPlayerDisplayName,
  isRaidFaction,
  isRegroupFaction,
} from '../../engine/rules/gameReducer';
import { MidasTouchBanner } from '../common/MidasTouchBanner';
import { useLanguage } from '../../i18n/LanguageContext';

interface ActionBarProps {
  activePlayer: PlayerState;
  players?: PlayerState[];
  isExploreMode: boolean;
  onToggleExplore: () => void;
  useMidasTouchExplore?: boolean;
  onToggleMidasTouchExplore?: (next: boolean) => void;
  onOpenResearch: () => void;
  onOpenUpgrade: () => void;
  onOpenBuild: () => void;
  onOpenMove: () => void;
  onOpenInfluence: () => void;
  onPass: () => void;
  isTurnGated?: boolean;
  isSpectator?: boolean;
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
  autoPassReactions?: boolean;
  onToggleAutoPass?: () => void;
  isInvaded?: boolean;
  canToggleAutoPass?: boolean;
  passInAdvance?: boolean;
  onTogglePassInAdvance?: () => void;
  canTogglePassInAdvance?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  activePlayer,
  players,
  isExploreMode,
  onToggleExplore,
  useMidasTouchExplore = false,
  onToggleMidasTouchExplore,
  onOpenResearch,
  onOpenUpgrade,
  onOpenBuild,
  onOpenMove,
  onOpenInfluence,
  onPass,
  isTurnGated = false,
  isSpectator = false,
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
  autoPassReactions = false,
  onToggleAutoPass,
  isInvaded = false,
  canToggleAutoPass = true,
  passInAdvance = false,
  onTogglePassInAdvance,
  canTogglePassInAdvance = true,
}) => {
  const { language, l } = useLanguage();
  const actorPlayer =
    (players && pendingConfirmation?.playerId
      ? players.find((p) => p.id === pendingConfirmation.playerId)
      : null) || activePlayer;

  const readyBlackHoleShip = !isSpectator && !isTurnGated
    ? (delayedBlackHoleShips || []).find(
        (ds) => ds.ownerId === activePlayer.id && currentRound !== undefined && currentRound >= ds.returnRound
      )
    : undefined;

  if (pendingConfirmation) {
    const isMyAction = !isTurnGated && !isSpectator;
    return (
      <div className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col md:flex-row items-center gap-2 md:gap-3 bg-slate-950/95 backdrop-blur-md p-3 md:px-5 md:py-3 rounded-2xl border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/50 animate-in fade-in slide-in-from-bottom-3 duration-200 w-[calc(100vw-12px)] max-w-xl md:w-auto md:max-w-fit">
        {/* Active Commander Indicator */}
        <div className="flex items-center justify-between w-full md:w-auto md:pr-3 md:border-r md:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-white/20 shrink-0"
              style={{ backgroundColor: activePlayer.color }}
            />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{l('Action Taken', '已执行行动')}</span>
              <span className="font-bold text-slate-100 leading-none">{getPlayerDisplayName(activePlayer)}</span>
            </div>
          </div>
          {/* Action Completed badge on mobile */}
          <div className="md:hidden">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {l('Done', '已完成')}
            </span>
          </div>
        </div>

        {/* Action Summary */}
        <div className="flex flex-col text-left w-full md:w-auto md:pr-3 md:border-r md:border-slate-800 max-w-full md:max-w-sm">
          <span className="hidden md:flex text-[10px] uppercase font-bold text-emerald-400 tracking-wider items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {l('Action Completed', '行动已完成')}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate" title={translateActionDescription(pendingConfirmation.description, language)}>
            {translateActionDescription(pendingConfirmation.description, language)}
          </span>
          {pendingConfirmation.actionType === 'EXPLORE' && activePlayer.colonyShips.ready > 0 && (
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              {l('You can click population slot on the sector to colonize!', '可点击星区行星人口槽进行殖民！')}
            </span>
          )}
          {pendingConfirmation.actionType === 'INFLUENCE' && (
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              {pendingConfirmation.influenceRefreshesRemaining && pendingConfirmation.influenceRefreshesRemaining > 0
                ? l(
                    `You may colonize hex planets (${pendingConfirmation.influenceRefreshesRemaining} flip-back refresh available)!`,
                    `可在确认前进行行星殖民（可翻回刷新 ${pendingConfirmation.influenceRefreshesRemaining} 艘殖民船）！`
                  )
                : l('You may colonize hex planets before confirming!', '可在确认结束回合前对星区行星殖民！')}
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
                title={l('Undo action and reset turn', '撤销本次行动并重置回合')}
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
                <span>{l('Revert', '撤销')}</span>
              </button>
            ) : (
              <span className="flex-1 md:flex-initial px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-1 text-center">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" /> {l('Non-Reversible', '不可撤销')}
              </span>
            )}

            <button
              type="button"
              onClick={onConfirmAction}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 md:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/80 cursor-pointer"
              title={l('Finalize action and pass turn to next player', '确认行动并结束本回合')}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{l('Confirm & End Turn', '确认并结束回合')}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold w-full md:w-auto">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">
              {isSpectator
                ? l(`Observing: Waiting for ${activePlayer.name} to confirm or revert...`, `观战中：等待 ${activePlayer.name} 确认或撤销...`)
                : l(`Waiting for ${activePlayer.name} to confirm or revert...`, `等待 ${activePlayer.name} 确认或撤销...`)}
            </span>
          </div>
        )}
      </div>
    );
  }
  const hasDiscs = activePlayer.influenceTrack.discsOnTrack > 0;
  const hasPassed = activePlayer.hasPassed;
  const hasPendingExplore = Boolean(pendingExploreActivations && pendingExploreActivations > 0);
  const canExplore = (!isTurnGated && !isSpectator && hasDiscs && !hasPassed) || (!isTurnGated && !isSpectator && hasPendingExplore);
  const canActNormal = !isTurnGated && !isSpectator && hasDiscs && !hasPassed && !hasPendingExplore;
  const canActReaction = !isTurnGated && !isSpectator && hasDiscs && hasPassed && !hasPendingExplore;
  const canPass = !isTurnGated && !isSpectator && !hasPendingExplore;

  const maxExplore = getMaxExploreActivations(activePlayer, isExploreMode && !hasPendingExplore && useMidasTouchExplore);
  const maxResearch = getMaxResearchActivations(activePlayer);
  const maxUpgrade = hasPassed ? 1 : getMaxUpgradeActivations(activePlayer);
  const maxBuild = hasPassed ? 1 : getMaxBuildActivations(activePlayer);
  const maxMoves = hasPassed ? 1 : getMaxMoveActivations(activePlayer);
  const maxInfluence = getMaxInfluenceActivations(activePlayer);

  return (
    <div className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 bg-slate-950/95 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl w-[calc(100vw-12px)] max-w-fit">
      {/* Status Header */}
      <div className="w-full flex items-center justify-between gap-3 px-2 pb-1 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 shrink-0"
            style={{ backgroundColor: activePlayer.color }}
          />
          {isTurnGated && !isSpectator ? (
            <span
              className="font-bold text-amber-300 text-xs truncate max-w-[180px] sm:max-w-[260px]"
              title={getPlayerDisplayName(activePlayer)}
            >
              ⏳{' '}
              {l(
                `${getPlayerDisplayName(activePlayer, { short: true })}'s Turn`,
                `${getPlayerDisplayName(activePlayer, { short: true })} 的回合`
              )}
              {hasPassed ? ` (${l('Reaction', '反应')})` : ''}
            </span>
          ) : (
            <>
              <span
                className="font-bold text-slate-100 text-xs truncate max-w-[130px] sm:max-w-[200px]"
                title={getPlayerDisplayName(activePlayer)}
              >
                {getPlayerDisplayName(activePlayer, { short: true })}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 uppercase font-semibold">
                {hasPassed ? l('Reaction', '反应回合') : l('Active', '行动中')}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSpectator ? (
            <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              {l('👁️ Spectator Mode (Observing)', '👁️ 观战模式')}
            </span>
          ) : isTurnGated && onTogglePassInAdvance && !hasPassed ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canTogglePassInAdvance}
                onClick={onTogglePassInAdvance}
                title={
                  passInAdvance
                    ? l("Pass in Advance is ON: you will automatically pass when your turn arrives (Click to revert/cancel)", "提前跳过已开启：轮到你的回合时将自动跳过（点击取消）")
                    : l("Enable Pass in Advance: automatically pass your turn when it becomes your turn", "开启提前跳过：轮到你的回合时自动跳过")
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                  passInAdvance
                    ? 'bg-purple-950/90 border-purple-500 text-purple-200 hover:border-purple-400 ring-1 ring-purple-500'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <CircleOff className={`w-3 h-3 ${passInAdvance ? 'text-purple-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{l('Pass in Advance:', '提前跳过:')}</span>
                <span className={passInAdvance ? 'text-purple-300 font-black' : 'text-slate-400 font-bold'}>
                  {passInAdvance ? l('ON (Revert)', '开 (撤销)') : l('OFF', '关')}
                </span>
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-cyan-300">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{activePlayer.influenceTrack.discsOnTrack} {l('Discs', '圆片')}</span>
          </div>

          {/* Auto-Pass Reactions Toggle */}
          {onToggleAutoPass && (
            <button
              type="button"
              disabled={!canToggleAutoPass && (isSpectator || isTurnGated)}
              onClick={onToggleAutoPass}
              title={
                isInvaded
                  ? l(
                      "Hostile invasion detected! Auto-pass is paused so you can react and defend.",
                      "检测到敌军入侵！自动跳过反应已暂停，以便你做出防御反应。"
                    )
                  : autoPassReactions
                  ? l(
                      "Auto-Pass Reactions is ON: automatically passes subsequent reaction turns, and pauses if any of your sectors come under attack (click to turn OFF)",
                      "自动跳过反应已开启：将自动跳过后续反应回合，若你的星区遭到攻击会自动暂停并提醒（点击关闭）"
                    )
                  : l(
                      "Auto-Pass Reactions is OFF: enable to automatically pass subsequent reaction turns; pauses automatically if any of your sectors come under attack (click to turn ON)",
                      "自动跳过反应已关闭：开启后将自动跳过后续反应回合，若你的星区遭到攻击会自动暂停并提醒（点击开启）"
                    )
              }
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                isInvaded
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 animate-pulse'
                  : autoPassReactions
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:border-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Zap className={`w-3 h-3 ${autoPassReactions ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{l('Auto-Pass:', '自动跳过:')}</span>
              <span className={isInvaded ? 'text-rose-400 font-black' : autoPassReactions ? 'text-emerald-400 font-black' : 'text-slate-500'}>
                {isInvaded ? l('PAUSED', '暂停') : autoPassReactions ? l('ON', '开') : l('OFF', '关')}
              </span>
            </button>
          )}

          {/* Spacetime Anomaly Indicator (Bug 145) */}
          {delayedBlackHoleShips.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-[10px] font-bold text-indigo-300">
              <span className="text-indigo-400">🌀</span>
              <span className="hidden sm:inline">{l('Black Hole:', '黑洞:')}</span>
              {delayedBlackHoleShips.map((ds) => {
                const canRet = currentRound !== undefined && currentRound >= ds.returnRound;
                const isMine = !isSpectator && ds.ownerId === activePlayer.id;
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
                    title={l(
                      `${ds.shipType.toUpperCase()} in Black Hole ${ds.blackHoleSectorNumber}. Returns Round ${ds.returnRound}${canRet && isMine ? ' (Click to Return Now)' : ''}`,
                      `${ds.shipType.toUpperCase()} 位于黑洞星区 ${ds.blackHoleSectorNumber}，第 ${ds.returnRound} 回合返回${canRet && isMine ? '（点击立即返回）' : ''}`
                    )}
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

      {/* Midas Touch Explore Toggle (shown when selecting hex to Explore) */}
      {isExploreMode && !hasPendingExplore && !isTurnGated && !isSpectator && !hasPassed && activePlayer.faction.id === 'legion_of_midas' && onToggleMidasTouchExplore && (
        <MidasTouchBanner
          player={activePlayer}
          actionType="EXPLORE"
          enabled={useMidasTouchExplore}
          onToggle={onToggleMidasTouchExplore}
          className="w-full"
        />
      )}

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
                ? l('Cancel Explore & finish turn', '取消探索并结束回合')
                : l('Cancel Explore Target', '取消探索目标')
              : hasPendingExplore
              ? l('Finish Explore action & end turn', '完成探索并结束回合')
              : l(
                  `Explore (EXP) - Discover new sectors (${maxExplore} activation)`,
                  `探索 (EXP) - 发现新星区 (${maxExplore} 次激活)`
                )
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
          <span className="leading-tight">
            {isExploreMode ? l('Cancel', '取消') : hasPendingExplore ? l('Finish', '完成') : l('EXP', '探索')}
          </span>
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
          title={l(
            `Research (RES) - Acquire technologies (${maxResearch} activation)`,
            `研发 (RES) - 获取科技 (${maxResearch} 次激活)`
          )}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4 shrink-0" />
          <span className="leading-tight">{l('RES', '研发')}</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxResearch})</span>
        </button>

        {/* Upgrade */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenUpgrade}
          title={
            hasPassed
              ? l('Reaction Upgrade (UPG) - 1 ship component', '反应升级 (UPG) - 1 个飞船部件')
              : l(`Upgrade (UPG) - Up to ${maxUpgrade} ship component upgrades`, `升级 (UPG) - 最多升级 ${maxUpgrade} 个飞船部件`)
          }
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span className="leading-tight">{l('UPG', '升级')}</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxUpgrade})</span>
        </button>

        {/* Build */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenBuild}
          title={
            hasPassed
              ? l('Reaction Build (BLD) - 1 ship or structure', '反应建造 (BLD) - 1 个飞船或建筑')
              : l(`Build (BLD) - Up to ${maxBuild} ships or structures`, `建造 (BLD) - 最多建造 ${maxBuild} 个飞船或建筑`)
          }
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Hammer className="w-4 h-4 shrink-0" />
          <span className="leading-tight">{l('BLD', '建造')}</span>
          <span className="text-[8.5px] opacity-80 leading-none">
            ({maxBuild}{!hasPassed && isRegroupFaction(activePlayer.faction.id) ? '+1M' : ''})
          </span>
        </button>

        {/* Move */}
        <button
          disabled={!canActNormal && !canActReaction}
          onClick={onOpenMove}
          title={
            hasPassed
              ? l('Reaction Move (MOV) - 1 ship movement', '反应移动 (MOV) - 1 次飞船移动')
              : l(`Move (MOV) - Up to ${maxMoves} ship movements`, `移动 (MOV) - 最多 ${maxMoves} 次飞船移动`)
          }
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal || canActReaction
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <Rocket className="w-4 h-4 shrink-0" />
          <span className="leading-tight">{l('MOV', '移动')}</span>
          <span className="text-[8.5px] opacity-80 leading-none">
            ({maxMoves}{!hasPassed && isRaidFaction(activePlayer.faction.id) ? '+1B' : ''})
          </span>
        </button>

        {/* Influence */}
        <button
          disabled={!canActNormal}
          onClick={onOpenInfluence}
          title={l(`Influence (INF) - Up to ${maxInfluence} disc actions`, `扩张 (INF) - 最多 ${maxInfluence} 次影响力圆片操作`)}
          className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
            canActNormal
              ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:scale-105'
              : 'bg-slate-900/40 text-slate-600 border border-slate-900'
          }`}
        >
          <CircleDot className="w-4 h-4 shrink-0 text-cyan-400" />
          <span className="leading-tight">{l('INF', '扩张')}</span>
          <span className="text-[8.5px] opacity-80 leading-none">({maxInfluence})</span>
        </button>

        {/* Pulsar Special Action */}
        {hasPulsarAvailable && (
          <button
            type="button"
            onClick={onOpenPulsar}
            title={l(
              'Activate Pulsar Sector (Free Action without taking an Influence Disc)',
              '激活脉冲星星区（免费行动，不消耗影响力圆片）'
            )}
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer bg-gradient-to-b from-cyan-950 to-slate-900 border-2 border-cyan-400 text-cyan-200 animate-pulse hover:scale-105 min-w-[44px] sm:min-w-[52px]"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-300" />
            <span className="leading-tight">{l('PULSAR', '脉冲星')}</span>
            <span className="text-[8.5px] text-cyan-400 font-mono leading-none">{l('FREE', '免费')}</span>
          </button>
        )}

        {/* Black Hole Return Action (Bug 145) */}
        {readyBlackHoleShip && onOpenBlackHoleReturn && (
          <button
            type="button"
            onClick={() => onOpenBlackHoleReturn(readyBlackHoleShip)}
            title={l(
              `Return ${readyBlackHoleShip.shipType.toUpperCase()} from Black Hole to board (Round ${currentRound})`,
              `从黑洞将 ${readyBlackHoleShip.shipType.toUpperCase()} 返回至版图（第 ${currentRound} 回合）`
            )}
            className="flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer bg-gradient-to-b from-indigo-950 to-slate-900 border-2 border-indigo-400 text-indigo-200 animate-pulse hover:scale-105 min-w-[44px] sm:min-w-[52px]"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-300 animate-spin" />
            <span className="leading-tight">{l('RETURN', '归位')}</span>
            <span className="text-[8.5px] text-indigo-400 font-mono leading-none">{l('FREE', '免费')}</span>
          </button>
        )}

        {/* Pass / Pass in Advance (Bug 210) */}
        {isTurnGated && !isSpectator && !hasPassed && onTogglePassInAdvance ? (
          <button
            type="button"
            onClick={onTogglePassInAdvance}
            title={
              passInAdvance
                ? l('Pass in Advance is active: click to revert/cancel', '已开启预先跳过：点击可取消')
                : l('Pass in Advance: automatically pass when it becomes your turn', '预先跳过：轮到你时自动跳过回合')
            }
            className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer min-w-[44px] sm:min-w-[52px] ${
              passInAdvance
                ? 'bg-purple-950 hover:bg-purple-900 text-purple-200 border-2 border-purple-500 ring-1 ring-purple-400 hover:scale-105'
                : 'bg-slate-800 hover:bg-purple-950 hover:text-purple-300 text-slate-300 border border-slate-700 hover:scale-105'
            }`}
          >
            <CircleOff className={`w-4 h-4 shrink-0 ${passInAdvance ? 'text-purple-400 animate-pulse' : ''}`} />
            <span className="leading-tight">{l('PASS', '跳过')}</span>
            {isTurnOrderVariant && nextPassTileNum ? (
              <span className="text-[8.5px] text-purple-400 font-mono font-bold leading-none">
                #{nextPassTileNum}
              </span>
            ) : (
              <span className="text-[8.5px] opacity-0 leading-none">(-)</span>
            )}
          </button>
        ) : (
          <button
            disabled={!canPass}
            onClick={onPass}
            title={
              hasPendingExplore
                ? l('Must finish exploration before passing', '必须先完成探索才能跳过')
                : hasPassed
                ? l('Pass reaction turn', '跳过反应回合')
                : isTurnOrderVariant && nextPassTileNum
                ? l(
                    `Pass turn (claims Next Turn Order Tile #${nextPassTileNum}${nextPassTileNum === 1 ? ' & +2 Credits bonus' : ''})`,
                    `跳过回合（获取下回合顺位板块 #${nextPassTileNum}${nextPassTileNum === 1 ? ' 及 +2 信用点奖励' : ''}）`
                  )
                : l('Pass turn (receive 2 Credits for 1st pass)', '跳过回合（首位跳过获 2 信用点）')
            }
            className={`flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase transition-all shadow shrink-0 text-center cursor-pointer disabled:cursor-not-allowed min-w-[44px] sm:min-w-[52px] ${
              canPass
                ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-300 border border-slate-700 hover:scale-105'
                : 'bg-slate-900/40 text-slate-600 border border-slate-900'
            }`}
          >
            <CircleOff className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{l('PASS', '跳过')}</span>
            {isTurnOrderVariant && nextPassTileNum && !hasPassed ? (
              <span className="text-[8.5px] text-purple-400 font-mono font-bold leading-none">
                #{nextPassTileNum}
              </span>
            ) : (
              <span className="text-[8.5px] opacity-0 leading-none">(-)</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
