import React, { useEffect, useMemo, useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, SectorShip, HexEdge } from '../../engine/types/galaxy';
import { getEffectiveMoveActivationLimit, getTraitorTilePenalty, playerHasWormholeGenerator, ReachableMoveOption } from '../../engine/rules/gameReducer';
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import { MidasTouchBanner } from '../common/MidasTouchBanner';
import { JotunnDreadNoughtBanner, JotunnDreadNoughtTarget } from '../common/JotunnDreadNoughtBanner';
import { areSectorsConnected, getEdgeBetween } from '../../engine/rules/hexMath';
import { getNebulaSubsectorForOuterEdge } from '../../engine/rules/galacticEvents';
import type { WarpConduit } from '../../engine/rules/warpedUniverse';
import {
  Rocket,
  ArrowRight,
  CircleAlert,
  AlertTriangle,
  X,
  Trash2,
  Check,
  RotateCcw,
  FastForward,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateShipType, translatePartName } from '../../i18n/catalogTranslations';
import { ShipTypeIcon } from '../common/ShipTypeIcon';

export interface MoveStepPayload {
  shipId: string;
  fromSectorId: string;
  toSectorId: string;
  activationIndex?: number;
  targetSubsector?: 1 | 2 | 3;
}

export interface PlannedMove extends MoveStepPayload {
  id: string;
  shipType: string;
  fromSectorNumber: number;
  fromSubsector?: 1 | 2 | 3;
  toSectorNumber: number;
  activationIndex: number;
  stepInActivation?: number;
  driveSpeed?: number;
  targetSubsector?: 1 | 2 | 3;
}

export interface MoveModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  playerShips: { ship: SectorShip; initialSector: SectorTile }[];
  simulatedShipSector: Map<string, SectorTile>;
  connectedDestinations: SectorTile[];
  reachableDestinations?: ReachableMoveOption[];
  plannedMoves: PlannedMove[];
  activeActivationIndex: number;
  currentShipDriveSpeed: number;
  movePointsUsedInCurrentActivation: number;
  isShipPinned: (shipId: string) => boolean;
  onAddMove: (destSectorId: string, targetSubsector?: 1 | 2 | 3) => void;
  onRemoveMove: (index: number) => void;
  onClearMoves: () => void;
  selectedShipId: string;
  onSelectShipId: (shipId: string) => void;
  onFinishActivation: () => void;
  onMove: (
    moves: MoveStepPayload[],
    pulsarSectorId?: string,
    useMidasTouch?: boolean,
    jotunnDnTarget?: 'build' | 'upgrade'
  ) => void;
  onClose: () => void;
  pulsarSectorId?: string;
  warpConduits?: WarpConduit[];
  raidBuildLabel?: string | null;
  regroupBuildLabel?: string | null;
  onSkipRegroupMove?: () => void;
  useMidasTouch?: boolean;
  onToggleMidasTouch?: (next: boolean) => void;
  isJotunnDreadnoughtMove?: boolean;
  jotunnDreadnoughtMoveSourceLabel?: string | null;
  onSkipJotunnDreadnoughtBonus?: () => void;
  jotunnPreBuildLabel?: string | null;
  jotunnDnTarget?: 'same' | 'build' | 'upgrade';
  onToggleJotunnDnTarget?: (next: JotunnDreadNoughtTarget) => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  player,
  sectors,
  playerShips,
  simulatedShipSector,
  connectedDestinations,
  reachableDestinations,
  plannedMoves,
  activeActivationIndex,
  currentShipDriveSpeed,
  movePointsUsedInCurrentActivation,
  isShipPinned,
  onAddMove,
  onRemoveMove,
  onClearMoves,
  selectedShipId,
  onSelectShipId,
  onFinishActivation,
  onMove,
  onClose,
  pulsarSectorId,
  warpConduits,
  raidBuildLabel,
  regroupBuildLabel,
  onSkipRegroupMove,
  useMidasTouch: useMidasTouchProp,
  onToggleMidasTouch,
  isJotunnDreadnoughtMove,
  jotunnDreadnoughtMoveSourceLabel,
  onSkipJotunnDreadnoughtBonus,
  jotunnPreBuildLabel,
  jotunnDnTarget: jotunnDnTargetProp,
  onToggleJotunnDnTarget,
}) => {
  const { language, l } = useLanguage();
  const [localUseMidasTouch, setLocalUseMidasTouch] = useState<boolean>(false);
  const [localJotunnDnTarget, setLocalJotunnDnTarget] = useState<JotunnDreadNoughtTarget>('same');
  const useMidasTouch = useMidasTouchProp ?? localUseMidasTouch;
  const jotunnDnTarget = jotunnDnTargetProp ?? localJotunnDnTarget;
  const isPulsarActive = Boolean(pulsarSectorId);
  const isRegroupMoveStep = Boolean(regroupBuildLabel && onSkipRegroupMove);
  const isMidasTouchEligible = player.faction.id === 'legion_of_midas' && !isPulsarActive && !isRegroupMoveStep && !player.hasPassed;
  const effectiveMidasTouch = isMidasTouchEligible && useMidasTouch;
  const isJotunnBannerEligible =
    player.faction.id === 'jotunn' &&
    !isPulsarActive &&
    !isRegroupMoveStep &&
    !isJotunnDreadnoughtMove &&
    !jotunnPreBuildLabel &&
    !player.hasPassed;
  const effectiveJotunnTarget =
    isJotunnBannerEligible && (jotunnDnTarget === 'build' || jotunnDnTarget === 'upgrade')
      ? jotunnDnTarget
      : undefined;
  const maxMoves =
    isRegroupMoveStep || isJotunnDreadnoughtMove
      ? 1
      : getEffectiveMoveActivationLimit(
          player,
          pulsarSectorId,
          undefined,
          effectiveMidasTouch,
          Boolean(effectiveJotunnTarget) || Boolean(jotunnPreBuildLabel)
        );
  const hasImprovedLogistics = player.techTrack.researched.some((t) => t.id === 'improved_logistics');
  const hasWormholeGen = playerHasWormholeGenerator(player);

  const currentShipObj = playerShips.find((p) => p.ship.id === selectedShipId)?.ship;
  const currentSimSector = simulatedShipSector.get(selectedShipId);

  const currentBlueprint = currentShipObj ? player.blueprints[currentShipObj.type] : null;
  const currentShipStats = currentBlueprint ? calculateBlueprintStats(currentBlueprint) : null;
  const currentShipHasJumpDrive = Boolean(
    currentShipStats?.hasJumpDrive ||
      currentBlueprint?.slots.some((p) => p && (p.id === 'jump_drive' || p.isJumpDrive))
  );
  const enginePart = currentBlueprint?.slots.find((p) => p && p.category === 'drive');
  const translatedEngineName = enginePart ? translatePartName(enginePart.id, enginePart.name, language) : '';
  const engineName = enginePart
    ? currentShipHasJumpDrive && enginePart.id !== 'jump_drive'
      ? `${translatedEngineName} + ${translatePartName('jump_drive', 'Jump Drive', language)}`
      : translatedEngineName
    : currentShipHasJumpDrive
    ? translatePartName('jump_drive', 'Jump Drive', language)
    : l('No Engine', '无引擎');

  const effectiveMaxSteps = currentShipDriveSpeed + (currentShipHasJumpDrive ? 1 : 0);
  const reachableBySectorId = useMemo(() => {
    const map = new Map<string, ReachableMoveOption>();
    if (!reachableDestinations || !currentSimSector) return map;
    for (const opt of reachableDestinations) {
      if (opt.sectorId === currentSimSector.id) continue;
      const existing = map.get(opt.sectorId);
      if (
        !existing ||
        opt.totalSteps < existing.totalSteps ||
        (opt.totalSteps === existing.totalSteps && !opt.usesJumpDrive && existing.usesJumpDrive)
      ) {
        map.set(opt.sectorId, opt);
      }
    }
    return map;
  }, [reachableDestinations, currentSimSector]);
  const quickStepDestinations = useMemo(() => {
    if (!reachableDestinations) return connectedDestinations;
    return connectedDestinations.filter((sec) => reachableBySectorId.get(sec.id)?.totalSteps === 1);
  }, [connectedDestinations, reachableDestinations, reachableBySectorId]);

  // Group planned moves by activation index
  const activationGroups = useMemo(() => {
    const map = new Map<number, PlannedMove[]>();
    for (const m of plannedMoves) {
      const actIdx = m.activationIndex ?? 0;
      const list = map.get(actIdx) || [];
      list.push(m);
      map.set(actIdx, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [plannedMoves]);

  const distinctActivationsCount = activationGroups.length;
  const isSelectedShipPinned = selectedShipId ? isShipPinned(selectedShipId) : false;
  const canExecute = plannedMoves.length > 0;
  const [showUnusedWarning, setShowUnusedWarning] = useState(false);

  const allyIds = useMemo(
    () => (player.ambassadorTiles || []).filter((id) => !id.startsWith('minor_species_') && id !== player.id),
    [player.ambassadorTiles, player.id]
  );

  const doesSectorHaveAllyPresence = (sec: SectorTile, targetSubsector?: 1 | 2 | 3): boolean => {
    if (allyIds.length === 0) return false;
    if (sec.discOwner && allyIds.includes(sec.discOwner)) return true;
    if (sec.isNebula) {
      const sub = targetSubsector ?? 1;
      return sec.ships.some((sh) => allyIds.includes(sh.ownerId) && (sh.subsector ?? 1) === sub);
    }
    return sec.ships.some((sh) => allyIds.includes(sh.ownerId));
  };

  const willBreakAllianceAtEnd = useMemo(() => {
    if (plannedMoves.length === 0 || allyIds.length === 0) return false;
    for (const item of playerShips) {
      const movesForShip = plannedMoves.filter((m) => m.shipId === item.ship.id);
      if (movesForShip.length === 0) continue;
      const finalSec = simulatedShipSector.get(item.ship.id);
      if (!finalSec) continue;
      const lastMove = movesForShip[movesForShip.length - 1]!;
      if (doesSectorHaveAllyPresence(finalSec, lastMove.targetSubsector)) {
        return true;
      }
    }
    return false;
  }, [plannedMoves, allyIds, playerShips, simulatedShipSector]);

  const handleTriggerMove = () => {
    if (!canExecute) return;
    if (distinctActivationsCount < maxMoves && !showUnusedWarning) {
      setShowUnusedWarning(true);
      return;
    }
    onMove(
      plannedMoves.map((m) => ({
        shipId: m.shipId,
        fromSectorId: m.fromSectorId,
        toSectorId: m.toSectorId,
        activationIndex: m.activationIndex,
        targetSubsector: m.targetSubsector,
      })),
      pulsarSectorId,
      effectiveMidasTouch || undefined,
      effectiveJotunnTarget
    );
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showUnusedWarning) {
          setShowUnusedWarning(false);
        } else {
          onClose();
        }
      } else if (e.key === 'Enter' && canExecute) {
        e.preventDefault();
        handleTriggerMove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canExecute, plannedMoves, onMove, onClose, pulsarSectorId, distinctActivationsCount, maxMoves, showUnusedWarning, effectiveMidasTouch, effectiveJotunnTarget]);

  const currentShipSubsector = useMemo(() => {
    if (!currentShipObj || !currentSimSector || !currentSimSector.isNebula) return undefined;
    const movesForShip = plannedMoves.filter((m) => m.shipId === selectedShipId);
    if (movesForShip.length === 0) return (currentShipObj.subsector ?? 1) as 1 | 2 | 3;
    const lastMove = movesForShip[movesForShip.length - 1];
    if (lastMove && lastMove.toSectorId === currentSimSector.id && lastMove.targetSubsector) {
      return lastMove.targetSubsector;
    }
    return (currentShipObj.subsector ?? 1) as 1 | 2 | 3;
  }, [selectedShipId, currentShipObj, currentSimSector, plannedMoves]);

  const getShipSubsector = (shipId: string, initialSub?: number, simSec?: SectorTile): number | undefined => {
    if (!simSec?.isNebula) return undefined;
    const shipMoves = plannedMoves.filter((m) => m.shipId === shipId);
    if (shipMoves.length === 0) return (initialSub ?? 1) as 1 | 2 | 3;
    const lastMove = shipMoves[shipMoves.length - 1];
    if (lastMove && lastMove.toSectorId === simSec.id && lastMove.targetSubsector) {
      return lastMove.targetSubsector;
    }
    return (initialSub ?? 1) as 1 | 2 | 3;
  };

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 pointer-events-none font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-700/80 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto text-slate-100 p-4 pointer-events-auto flex flex-col gap-3 transition-all scrollbar-thin">
        {/* Pulsar Banner */}
        {isPulsarActive && (
          <div className="p-2 px-3 rounded-xl bg-cyan-950/60 border border-cyan-500/80 text-cyan-200 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold">🌟 {l('Pulsar Movement Activation', '脉冲星移动激活')}</span>
                <span className="text-cyan-300/80 text-[11px] block">
                  {l('1 Free Ship Movement activation. No Influence Disc will be deducted from your track.', '获得 1 次免费飞船移动激活，不消耗影响力轨上的圆片。')}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-200 font-mono text-[10px] font-bold uppercase border border-cyan-700">
              {l('1 Ship Limit', '限 1 艘飞船')}
            </span>
          </div>
        )}

        {isMidasTouchEligible && (
          <MidasTouchBanner
            player={player}
            actionType="MOVE"
            enabled={useMidasTouch}
            onToggle={(next) => {
              if (onToggleMidasTouch) {
                onToggleMidasTouch(next);
              } else {
                setLocalUseMidasTouch(next);
              }
            }}
          />
        )}

        {isJotunnBannerEligible && (
          <JotunnDreadNoughtBanner
            player={player}
            primaryAction="MOVE"
            selectedTarget={jotunnDnTarget}
            onSelectTarget={(next) => {
              if (onToggleJotunnDnTarget) {
                onToggleJotunnDnTarget(next as 'same' | 'build' | 'upgrade');
              } else {
                setLocalJotunnDnTarget(next);
              }
            }}
          />
        )}

        {isJotunnDreadnoughtMove && (
          <div
            data-testid="jotunn-dn-move-step-banner"
            className="p-2 px-3 rounded-xl bg-sky-950/60 border border-sky-500/80 text-sky-200 text-xs flex items-center justify-between gap-2"
          >
            <span>
              🛡️ <strong>{l('Dread Nought (+1 MOV) — Step 2:', '无畏雄心 (+1 移动) — 第二步：')}</strong>{' '}
              {jotunnDreadnoughtMoveSourceLabel || l('Move 1 Dreadnought ship', '移动 1 艘无畏舰')}
            </span>
            <span className="text-[10.5px] text-sky-300/90">
              {l('Dreadnought only • Skip to commit Step 1 only', '仅限无畏舰移动 • 跳过则仅确认第一步')}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide text-slate-200 uppercase font-display">
                  {l('FLEET MANEUVERS & MOVEMENT', '舰队机动与移动')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono font-bold">
                  {distinctActivationsCount} / {maxMoves}{l(' Activations', ' 次激活')}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {plannedMoves.length} {l(plannedMoves.length === 1 ? 'Step' : 'Steps', '步')}
                </span>
                {hasImprovedLogistics && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    {l('Logistics +1', '后勤 +1')}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-cyan-400/90 font-medium mt-0.5">
                {l('Each activation allows 1 ship to move up to its engine Drive Speed. Hostile sectors pin ships immediately.', '每次激活可移动 1 艘飞船，距离不超过其引擎航速。进入敌对星区会立即被牵制。')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title={l('Close (Esc)', '关闭 (Esc)')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {playerShips.length === 0 ? (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs text-center">
            {l('No active ships deployed in the galaxy! Build ships using the Build action first.', '银河系中尚无已部署飞船！请先执行建造行动。')}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5">
            {/* Planned Activations Group List */}
            {activationGroups.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                  <span>{l('Planned Activations Queue:', '已规划的移动队列：')}</span>
                  <span className="text-slate-500 font-normal">{l('Click trash to undo activation', '点击垃圾桶图标撤销该次激活')}</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {activationGroups.map(([actIdx, moves]) => {
                    const firstMove = moves[0];
                    const shipDrive = firstMove.driveSpeed || 1;
                    return (
                      <div
                        key={actIdx}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-900/80 flex items-center justify-between gap-2 text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                            {actIdx + 1}
                          </span>
                          <span className="font-bold text-[11px] text-slate-200 uppercase shrink-0">
                            {translateShipType(firstMove.shipType, language)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold shrink-0">
                            {moves.length}/{shipDrive} {l('MP', '移动力')}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 flex-wrap">
                            {moves.map((m, sIdx) => (
                              <React.Fragment key={m.id}>
                                {sIdx > 0 && <span className="text-slate-600">→</span>}
                                <span className="font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                                  {m.fromSectorId === m.toSectorId && m.targetSubsector ? (
                                    <>
                                      {l(`Sector ${m.fromSectorNumber}`, `星区 ${m.fromSectorNumber}`)}{m.fromSubsector ? ` ${l(`Sub ${m.fromSubsector}`, `子区 ${m.fromSubsector}`)}` : ''}{' '}
                                      <strong className="text-indigo-300">(➔ {l(`Sub ${m.targetSubsector}`, `子区 ${m.targetSubsector}`)})</strong>
                                    </>
                                  ) : (
                                    <>
                                      {l(`Sector ${m.fromSectorNumber}`, `星区 ${m.fromSectorNumber}`)}{m.fromSubsector ? ` ${l(`Sub ${m.fromSubsector}`, `子区 ${m.fromSubsector}`)}` : ''} ➔{' '}
                                      <strong className="text-cyan-300">
                                        {l(`Sector ${m.toSectorNumber}`, `星区 ${m.toSectorNumber}`)}{m.targetSubsector ? ` ${l(`Sub ${m.targetSubsector}`, `子区 ${m.targetSubsector}`)}` : ''}
                                      </strong>
                                    </>
                                  )}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const firstIndex = plannedMoves.findIndex((m) => m.id === firstMove.id);
                            onRemoveMove(firstIndex);
                          }}
                          className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors shrink-0"
                          title={l('Undo this activation', '撤销此次激活')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Activation & Destination Controls */}
            {activeActivationIndex < maxMoves ? (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                {/* Ship Switcher and Stats */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {l(`Activation #${activeActivationIndex + 1}:`, `第 ${activeActivationIndex + 1} 次激活：`)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/80 text-cyan-300 font-bold text-xs font-mono uppercase">
                      {currentShipObj ? translateShipType(currentShipObj.type, language) : ''} ({l(`Sector ${currentSimSector?.sectorNumber}`, `星区 ${currentSimSector?.sectorNumber}`)}
                      {currentSimSector?.isNebula ? ` ${l(`Sub ${currentShipSubsector ?? 1}`, `子区 ${currentShipSubsector ?? 1}`)}` : ''})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[11px] font-mono">
                      {engineName} ({l(`Speed ${currentShipDriveSpeed}`, `航速 ${currentShipDriveSpeed}`)})
                    </span>
                    {movePointsUsedInCurrentActivation > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/70 text-amber-300 font-bold text-[11px] font-mono">
                        {movePointsUsedInCurrentActivation} / {effectiveMaxSteps} {l('MP Used', '移动力已用')}
                      </span>
                    )}
                  </div>

                  {/* Early Activation Finish Button */}
                  {movePointsUsedInCurrentActivation > 0 &&
                    movePointsUsedInCurrentActivation < effectiveMaxSteps && (
                      <button
                        type="button"
                        onClick={onFinishActivation}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title={l("End this ship's movement and proceed to next activation", '结束当前飞船移动并进入下一次激活')}
                      >
                        <FastForward className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{l(`Finish Activation (${effectiveMaxSteps - movePointsUsedInCurrentActivation} MP Left)`, `结束本次激活（余 ${effectiveMaxSteps - movePointsUsedInCurrentActivation} 步）`)}</span>
                      </button>
                    )}
                </div>

                {/* Ship Switcher Fleet Row */}
                {playerShips.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {l('Fleet:', '舰队：')}
                    </span>
                    {playerShips.map((item) => {
                      const isSel = item.ship.id === selectedShipId;
                      const sim = simulatedShipSector.get(item.ship.id);
                      const shipBp = player.blueprints[item.ship.type];
                      const shipStats = shipBp ? calculateBlueprintStats(shipBp) : null;
                      const shipSpeed = shipStats ? shipStats.totalDriveSpeed : 0;
                      const pinned = isShipPinned(item.ship.id);
                      const isStarbase = item.ship.type === 'starbase' || shipSpeed <= 0;
                      const activeActHasMoves =
                        (activationGroups.find(([idx]) => idx === activeActivationIndex)?.[1].length ?? 0) > 0;
                      const lockedToMovingShip = !isSel && activeActHasMoves && activeActivationIndex + 1 >= maxMoves;
                      const lockedToDreadnought = Boolean(isJotunnDreadnoughtMove && item.ship.type !== 'dreadnought');

                      return (
                        <button
                          key={item.ship.id}
                          type="button"
                          disabled={pinned || isStarbase || lockedToMovingShip || lockedToDreadnought}
                          onClick={() => onSelectShipId(item.ship.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                            isSel
                              ? 'bg-cyan-500 text-slate-950 shadow-sm'
                              : pinned
                              ? 'bg-rose-950/50 border border-rose-900/60 text-rose-400 opacity-60 cursor-not-allowed'
                              : isStarbase || lockedToMovingShip || lockedToDreadnought
                              ? 'bg-slate-900 border border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                          title={
                            pinned
                              ? l('Ship is pinned by hostile forces and cannot move', '飞船被敌方牵制，无法移动')
                              : isStarbase
                              ? l('Starbases have Drive Speed 0 and cannot move', '星际基地航速为 0，无法移动')
                              : lockedToDreadnought
                              ? l('Dread Nought Move may only move Dreadnought ships', '无畏雄心移动仅限移动无畏舰')
                              : lockedToMovingShip
                              ? l('1-activation Move locked to the ship already moving — undo move to pick another ship', '单次移动激活已锁定当前移动飞船 — 请先撤销后再选其他飞船')
                              : l(`Select ${item.ship.type} (Speed ${shipSpeed})`, `选择${translateShipType(item.ship.type, language)}（航速 ${shipSpeed}）`)
                          }
                        >
                          <ShipTypeIcon
                            shipType={item.ship.type}
                            factionId={player.faction.id}
                            size={11}
                            className={isSel ? 'text-slate-950' : 'text-cyan-400'}
                          />
                          <span>
                            {language === 'zh' ? translateShipType(item.ship.type, language) : item.ship.type.slice(0, 3).toUpperCase()} ({l(`Sector ${sim?.sectorNumber}`, `星区 ${sim?.sectorNumber}`)}
                            {sim?.isNebula ? ` ${l(`Sub ${getShipSubsector(item.ship.id, item.ship.subsector, sim)}`, `子区 ${getShipSubsector(item.ship.id, item.ship.subsector, sim)}`)}` : ''})
                          </span>
                          {pinned && <span className="text-[8px] text-rose-400 font-bold">{l('PINNED', '牵制')}</span>}
                          {isStarbase && <span className="text-[8px] text-slate-400">{l('0 DRIVE', '无引擎')}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Connected Destinations Quick Bar (1-step only; multi-step destinations are selected on the map) */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-900/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    {l('Step Destination:', '下一步目的地：')}
                  </span>
                  {isSelectedShipPinned ? (
                    <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{l('This fleet is pinned by hostile forces and cannot move further!', '该舰队已被敌方牵制，无法继续移动！')}</span>
                    </div>
                  ) : currentShipDriveSpeed <= 0 && !currentShipHasJumpDrive ? (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
                      <CircleAlert className="w-3.5 h-3.5" />
                      <span>{l('This unit has Drive Speed 0 and cannot move.', '该单位航速为 0，无法移动。')}</span>
                    </div>
                  ) : quickStepDestinations.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {quickStepDestinations.map((sec) => {
                        const reachOpt = reachableBySectorId.get(sec.id);
                        const usesJump = reachOpt
                          ? reachOpt.usesJumpDrive
                          : currentSimSector
                          ? !areSectorsConnected(currentSimSector, sec, hasWormholeGen, warpConduits)
                          : false;
                        const nebulaTargetSub = reachOpt
                          ? reachOpt.targetSubsector
                          : sec.isNebula && currentSimSector
                          ? (() => {
                              const edge = getEdgeBetween(currentSimSector.coord, sec.coord);
                              if (edge === null) return undefined;
                              const entryEdge = ((edge + 3) % 6) as HexEdge;
                              return getNebulaSubsectorForOuterEdge(entryEdge, sec.rotation || 0);
                            })()
                          : undefined;
                        const willBreakAlly = doesSectorHaveAllyPresence(sec, nebulaTargetSub);
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => onAddMove(sec.id)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all group shadow-sm ${
                              willBreakAlly
                                ? 'bg-rose-950/70 hover:bg-rose-900/90 border-rose-600/80 text-rose-200'
                                : 'bg-emerald-950/70 hover:bg-emerald-900/90 border-emerald-700/80 text-emerald-300'
                            }`}
                          >
                            <ArrowRight className={`w-3 h-3 group-hover:translate-x-0.5 transition-transform ${willBreakAlly ? 'text-rose-400' : 'text-emerald-400'}`} />
                            <span>
                              {l(`Sector ${sec.sectorNumber}`, `星区 ${sec.sectorNumber}`)}
                              {nebulaTargetSub ? ` ${l(`Sub ${nebulaTargetSub}`, `子区 ${nebulaTargetSub}`)}` : ''}{' '}
                              ({sec.name || l(`Ring ${sec.ring}`, `第 ${sec.ring} 环`)})
                              {nebulaTargetSub && (
                                <span className="text-cyan-300 font-normal ml-1">{l('➔ Sub ', '➔ 子区 ')}{nebulaTargetSub}</span>
                              )}
                            </span>
                            {willBreakAlly && (
                              <span
                                className="text-[9px] px-1 py-0.5 rounded bg-rose-900/90 text-rose-200 border border-rose-500/70 font-mono"
                                title={l(`Ending movement here breaks diplomacy & gives Traitor Tile (${getTraitorTilePenalty(player)} VP)`, `在此结束移动将打破外交同盟并获得背叛者板块 (${getTraitorTilePenalty(player)} VP)`)}
                              >
                                {l('⚔️ Breaks Alliance', '⚔️ 破盟')}
                              </span>
                            )}
                            {usesJump && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                                {l('Jump ⚡', '跳跃 ⚡')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5">
                      <CircleAlert className="w-3.5 h-3.5" />
                      <span>{l('No connected wormholes aligned or movement step limit reached!', '无相连虫洞或已达移动步数上限！')}</span>
                    </div>
                  )}
                </div>

                {/* Nebula Subsector Internal Shifts */}
                {currentSimSector?.isNebula && !isSelectedShipPinned && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-900/80">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider shrink-0">
                      {l('Nebula Subsector Shift (1 MP):', '星云子区移动（1 移动力）：')}
                    </span>
                    {([1, 2, 3] as const)
                      .filter((sub) => sub !== (currentShipSubsector ?? 1))
                      .map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => onAddMove(currentSimSector.id, sub)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-700/80 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all group shadow-sm cursor-pointer"
                        >
                          <ArrowRight className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                          <span>{l(`Shift to Sector ${currentSimSector.sectorNumber} Sub ${sub}`, `移至星区 ${currentSimSector.sectorNumber} 子区 ${sub}`)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{l(`All ${maxMoves} Move activations planned (${plannedMoves.length} steps)! Ready to execute maneuvers.`, `全部 ${maxMoves} 次移动激活已规划完成（共 ${plannedMoves.length} 步）！可以执行机动。`)}</span>
              </div>
            )}
          </div>
        )}

        {raidBuildLabel && (
          <div className="p-2 px-3 rounded-xl bg-lime-950/50 border border-lime-500/70 text-lime-200 text-xs flex items-center justify-between gap-2">
            <span>
              ⚔️ <strong>{l('Raid Build Queued:', '已排入突袭建造：')}</strong> {raidBuildLabel}
            </span>
            <span className="text-[10.5px] text-lime-300/80">
              {l('Will apply together on Execute (Revert reverses both)', '执行移动时一并结算（撤回可同时还原）')}
            </span>
          </div>
        )}

        {jotunnPreBuildLabel && (
          <div
            data-testid="jotunn-move-prebuild-banner"
            className="p-2 px-3 rounded-xl bg-sky-950/55 border border-sky-500/75 text-sky-200 text-xs flex items-center justify-between gap-2"
          >
            <span>
              🛡️ <strong>{l('Dread Nought (+1 BUI) Queued:', '已排入无畏雄心建造：')}</strong> {jotunnPreBuildLabel}
            </span>
            <span className="text-[10.5px] text-sky-300/85">
              {l('Plan remaining Move(s) — new Dreadnought may move (Revert reverses both)', '规划剩余移动次数——可移动新建的无畏舰（撤回可同时还原）')}
            </span>
          </div>
        )}

        {regroupBuildLabel && (
          <div
            data-testid="ragnarok-regroup-move-banner"
            className="p-2 px-3 rounded-xl bg-slate-800/80 border border-slate-500/80 text-slate-100 text-xs flex items-center justify-between gap-2"
          >
            <span>
              ⚔️ <strong>{l('Regroup (+1 MOV) — Step 2:', '重整集结 (+1 移动) — 第二步：')}</strong> {regroupBuildLabel}
            </span>
            <span className="text-[10.5px] text-cyan-300/85">
              {l('Move 1 ship or Skip to finish Build (Revert reverses both)', '可移动 1 艘飞船或跳过以完成建造（撤回可同时还原）')}
            </span>
          </div>
        )}

        {willBreakAllianceAtEnd && (
          <div
            data-testid="move-betrayal-warning"
            className="px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-500/70 text-rose-200 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {l(
                `Act of Aggression: Ending movement in an allied sector (ship or control disc) will break your diplomatic alliance and give you the Traitor Tile (${getTraitorTilePenalty(player)} VP).`,
                `侵略行为警告：在盟友飞船或控制圆片所在星区结束移动将打破外交同盟，并使你获得背叛者板块（${getTraitorTilePenalty(player)} VP）。`
              )}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <div className="text-xs text-slate-400">
            {l('Activations to execute:', '即将执行的激活：')}{' '}
            <strong className="text-cyan-300 font-bold">
              {distinctActivationsCount} / {maxMoves}
            </strong>{' '}
            <span className="text-slate-500">
              ({plannedMoves.length} {l(plannedMoves.length === 1 ? 'total step' : 'total steps', '总步数')})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {plannedMoves.length > 0 && (
              <button
                type="button"
                onClick={onClearMoves}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800 flex items-center gap-1 transition-colors"
                title={l('Reset all planned moves', '清空所有已规划移动')}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{l('Clear', '清空')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              {l('Cancel', '取消')}
            </button>
            {isRegroupMoveStep && onSkipRegroupMove && (
              <button
                type="button"
                data-testid="regroup-skip-move-btn"
                onClick={onSkipRegroupMove}
                className="px-3.5 py-1.5 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {l('Skip Move & Build', '跳过移动直接建造')}
              </button>
            )}
            {isJotunnDreadnoughtMove && onSkipJotunnDreadnoughtBonus && (
              <button
                type="button"
                data-testid="jotunn-skip-dn-move-btn"
                onClick={onSkipJotunnDreadnoughtBonus}
                className="px-3.5 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 border border-sky-600/70 text-sky-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {l('Skip Dreadnought Move', '跳过无畏舰移动')}
              </button>
            )}
            <button
              disabled={!canExecute}
              onClick={handleTriggerMove}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              {isRegroupMoveStep
                ? l(`Build & Move (${plannedMoves.length} ${plannedMoves.length === 1 ? 'Step' : 'Steps'})`, `建造并移动 (${plannedMoves.length} 步)`)
                : effectiveJotunnTarget === 'build'
                ? l(`Move (${plannedMoves.length}) & Build Dreadnought ➔`, `移动 (${plannedMoves.length}) 并建造无畏舰 ➔`)
                : effectiveJotunnTarget === 'upgrade'
                ? l(`Move (${plannedMoves.length}) & Upgrade Dreadnought ➔`, `移动 (${plannedMoves.length}) 并升级无畏舰 ➔`)
                : isJotunnDreadnoughtMove
                ? l(`Move Dreadnought & Confirm`, `移动无畏舰并确认`)
                : l(`Execute ${plannedMoves.length} ${plannedMoves.length === 1 ? 'Step' : 'Steps'} (Enter)`, `执行 ${plannedMoves.length} 步移动 (Enter)`)}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Unused Activations Confirmation Dialog */}
    {showUnusedWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 font-display">
                {l('Unused Move Activation', '尚有未使用的移动激活')}
              </h3>
              <p className="text-xs text-slate-400">
                {l(`You have ${maxMoves - distinctActivationsCount} unused Move activation${maxMoves - distinctActivationsCount > 1 ? 's' : ''} remaining (${distinctActivationsCount} of ${maxMoves} used).`, `你还有 ${maxMoves - distinctActivationsCount} 次未使用的移动机会（已用 ${distinctActivationsCount}/${maxMoves}）。`)}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
            {l(`Are you sure you want to execute only ${distinctActivationsCount} move${distinctActivationsCount > 1 ? 's' : ''} and give up the extra activation?`, `确定只执行 ${distinctActivationsCount} 次移动并放弃剩余移动机会吗？`)}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowUnusedWarning(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
            >
              {l('Keep Moving (Plan More)', '继续规划更多移动')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUnusedWarning(false);
                onMove(
                  plannedMoves.map((m) => ({
                    shipId: m.shipId,
                    fromSectorId: m.fromSectorId,
                    toSectorId: m.toSectorId,
                    activationIndex: m.activationIndex,
                    targetSubsector: m.targetSubsector,
                  })),
                  pulsarSectorId,
                  effectiveMidasTouch || undefined,
                  effectiveJotunnTarget
                );
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              {l(`Confirm & Execute ${plannedMoves.length} Step${plannedMoves.length > 1 ? 's' : ''}`, `确认并执行 ${plannedMoves.length} 步`)}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
