import React, { useState, useEffect } from 'react';
import { GameState, CombatState, CombatDamageAssignment, CombatRoll, PlayerState, ShiftPortMode } from '../../engine/types/state';
import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { Crosshair, Shield, Dices, Skull, Zap, CheckCircle2, X, Navigation, ArrowRight, Minimize2, Maximize2, RotateCcw, Swords } from 'lucide-react';
import {
  buildCombatUnitsForSector,
  sortUnitsByInitiative,
  getSectorDefenderOwnerId,
  getCombatShipTypeGroups,
  getActiveCombatGroup,
  isAntimatterSplitterRoll,
  SHIP_SIZE_RANK,
  CombatUnit,
  getPendingSpiralShiftPlayerId,
  getPendingTechnoMagicPlayerId,
  getPendingDivineInspirationPlayerId,
  getDefaultShiftPortMode,
} from '../../engine/rules/combatEngine';
import {
  canBlueprintPowerShiftMode,
  getShiftPortSlotIndex,
  getEligibleTechnoMagicParts,
  calculateBlueprintStats,
} from '../../engine/rules/shipValidation';
import { SHIP_PARTS, getShiftPortResolvedPart, isSpiralPhase2 } from '../../engine/rules/partData';
import { getEligibleRetreatSectors, getPlayerShortName, getPlayerDisplayName, getFactionDisplayColor } from '../../engine/rules/gameReducer';
import { CombatDieFaceGraphic, ShipPartSlotGraphic, getPartTooltip } from '../common/PhysicalTileIconography';
import { getEffectiveShipPart } from '../../engine/rules/partData';
import { getNeutralShipBlueprint, NeutralShipType } from '../../engine/rules/neutralShips';
import { ShipBlueprintSlotsLayout } from '../blueprints/ShipBlueprintSlotsLayout';
import { NeutralShipBlueprintLayout } from '../blueprints/NeutralShipBlueprintLayout';
import { ShipTypeIcon, shouldShowShipTypeIcon } from '../common/ShipTypeIcon';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateNeutralBlueprintTitle,
  translateShipType,
} from '../../i18n/catalogTranslations';

export interface CombatUnitDisplayGroup {
  key: string;
  ownerId: string;
  type: string;
  count: number;
  shipIds: string[];
  maxHull: number;
  currentDamage: number;
  currentHp: number;
  initiative: number;
  weapons: { count: number; damage: number; color: string; isMissile?: boolean }[];
  isAttacking: boolean;
  isRetreating: boolean;
  isDestroyed: boolean;
  retreatDestinationSectorNumber?: number;
}

/**
 * Groups identical combat units of the same owner, type, and damage status together.
 * If one unit takes damage or differs in status, it is displayed as a separate group.
 */
export function groupCombatUnits(
  sideUnits: CombatUnit[],
  activeGroup: { shipIds: string[] } | null,
  pendingSalvo: { attackerShipIds: string[] } | null,
  retreatDeclared: Record<string, string> | undefined,
  sectors: SectorTile[]
): CombatUnitDisplayGroup[] {
  const map = new Map<string, CombatUnitDisplayGroup>();

  for (const unit of sideUnits) {
    const isDestroyed = unit.currentDamage >= unit.maxHull;
    const isAttacking = !isDestroyed && (
      pendingSalvo
        ? pendingSalvo.attackerShipIds.includes(unit.id)
        : activeGroup
        ? activeGroup.shipIds.includes(unit.id)
        : false
    );
    const isRetreating = !isDestroyed && !!retreatDeclared?.[unit.id];
    const destSecId = isRetreating ? retreatDeclared?.[unit.id] : undefined;
    const destSec = destSecId ? sectors.find((s) => s.id === destSecId) : undefined;
    const currentHp = Math.max(0, unit.maxHull - unit.currentDamage);

    // Grouping key: identical owner, ship type, max hull, current damage, and active state
    const key = [
      unit.ownerId,
      unit.type,
      unit.maxHull,
      unit.currentDamage,
      isDestroyed ? 'dead' : 'alive',
      isAttacking ? 'atk' : 'idle',
      isRetreating ? `ret_${destSecId}` : 'no_ret',
    ].join('_');

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.shipIds.push(unit.id);
    } else {
      map.set(key, {
        key,
        ownerId: unit.ownerId,
        type: unit.type,
        count: 1,
        shipIds: [unit.id],
        maxHull: unit.maxHull,
        currentDamage: unit.currentDamage,
        currentHp,
        initiative: unit.initiative,
        weapons: unit.weapons,
        isAttacking,
        isRetreating,
        isDestroyed,
        retreatDestinationSectorNumber: destSec?.sectorNumber,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    // 1. Living ships before destroyed ships
    if (a.isDestroyed !== b.isDestroyed) {
      return a.isDestroyed ? 1 : -1;
    }
    // 2. Higher initiative first
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    // 3. Healthier ships before damaged ships (higher currentHp first)
    if (b.currentHp !== a.currentHp) {
      return b.currentHp - a.currentHp;
    }
    return a.type.localeCompare(b.type);
  });
}

function getSideInfo(
  ownerIds: string[],
  role: 'attacker' | 'defender',
  players: PlayerState[],
  lang: 'en' | 'zh'
) {
  const l = (en: string, zh: string) => (lang === 'zh' ? zh : en);
  if (ownerIds.length === 0) {
    return {
      name: role === 'attacker' ? l('Attacker', '进攻方') : l('Defender', '防守方'),
      factionName: undefined,
      color: role === 'attacker' ? '#ef4444' : '#0ea5e9',
      isNpc: false,
    };
  }
  const primaryId = ownerIds[0]!;
  if (primaryId.startsWith('player_')) {
    const p = players.find((pl) => pl.id === primaryId);
    if (p) {
      const displayColor = getFactionDisplayColor(p.color, p.faction?.name);
      return {
        name: getPlayerDisplayName(p, { short: true }),
        factionName: p.faction ? translateFactionName(p.faction.id, p.faction.name, lang) : undefined,
        color: displayColor,
        isNpc: false,
      };
    }
  }
  if (primaryId === 'ancient') {
    return { name: l('Ancients', '远古舰船'), factionName: l('Ancient Guardians', '远古守卫'), color: '#f43f5e', isNpc: true };
  }
  if (primaryId === 'guardian') {
    return { name: l('Guardian', '星区守护者'), factionName: l('Galactic Guardian', '银河守护者'), color: '#f59e0b', isNpc: true };
  }
  if (primaryId === 'gcds') {
    return { name: l('GCDS', '银河中心防御系统'), factionName: l('Galactic Center Defense System', '银河中心防御系统'), color: '#a855f7', isNpc: true };
  }
  return {
    name: primaryId.toUpperCase(),
    factionName: undefined,
    color: role === 'attacker' ? '#ef4444' : '#0ea5e9',
    isNpc: false,
  };
}

/**
 * Renders the square-box blueprint view for either a player vessel or an NPC vessel in combat.
 */
export const CombatShipBlueprintPreview: React.FC<{
  state: GameState;
  ownerId: string;
  shipType: string;
}> = ({ state, ownerId, shipType }) => {
  const isNpc = ownerId === 'ancient' || ownerId === 'guardian' || ownerId === 'gcds';
  if (isNpc) {
    const npcBp = getNeutralShipBlueprint(
      ownerId as NeutralShipType,
      state.neutralShipBlueprints?.[ownerId as NeutralShipType]
    );
    return <NeutralShipBlueprintLayout blueprint={npcBp} size="sm" showInitiative={false} />;
  }

  const owner = state.players.find((p) => p.id === ownerId);
  const bp = owner?.blueprints?.[shipType];
  if (!owner || !bp) return null;

  const effectiveSlots = bp.slots.map((s) => (s ? getEffectiveShipPart(s, state.expansions) : null));
  const effectiveExternal = (bp.externalParts || []).map((p) =>
    getEffectiveShipPart(p, state.expansions)
  );

  return (
    <ShipBlueprintSlotsLayout
      shipType={bp.type}
      factionId={owner.faction.id}
      slots={effectiveSlots}
      maxSlots={bp.maxSlots}
      preprintedPower={bp.preprintedPower}
      preprintedComputer={bp.preprintedComputer}
      preprintedShield={bp.preprintedShield}
      preprintedHull={bp.preprintedHull}
      baseInitiative={bp.baseInitiative}
      externalParts={effectiveExternal}
      size="sm"
    />
  );
};

interface CombatModalProps {
  state: GameState;
  combat: CombatState;
  onStepCombat: (
    retreatShipIds?: string[],
    retreatDestinationSectorId?: string,
    concludeCombat?: boolean,
    rerollRollIndex?: number,
    autoAssign?: boolean,
    damageAssignments?: CombatDamageAssignment[]
  ) => void;
  onRerollDie?: (rollIndex: number) => void;
  onAutoResolve?: (playerId?: string) => void;
  onConfigureSpiralShiftPort?: (
    sectorId: string,
    choices: Partial<Record<ShipType, ShiftPortMode>>,
    playerId?: string
  ) => void;
  onSetTechnoMagicUpgrades?: (
    sectorId: string,
    upgrades: { shipType: ShipType; slotIndex: number; partId: string }[],
    playerId?: string
  ) => void;
  onSetDivineInspiration?: (
    sectorId: string,
    choice: 'hit' | 'shield',
    playerId?: string
  ) => void;
  currentSeat?: number | 'all' | 'spectator';
}

export const CombatModal: React.FC<CombatModalProps> = ({
  state,
  combat,
  onStepCombat,
  onRerollDie,
  onAutoResolve,
  onConfigureSpiralShiftPort,
  onSetTechnoMagicUpgrades,
  onSetDivineInspiration,
  currentSeat = 'all',
}) => {
  const { l, language } = useLanguage();
  const sector = state.sectors.find((s) => s.id === combat.sectorId);
  const scopedSectorForCombat = React.useMemo(() => {
    if (!sector) return null;
    return sector.isNebula && combat.subsector
      ? { ...sector, ships: sector.ships.filter((s) => (s.subsector ?? 1) === combat.subsector) }
      : sector;
  }, [sector, combat.subsector]);

  const pendingSpiralShiftId = sector
    ? getPendingSpiralShiftPlayerId(state.players, sector, combat)
    : null;
  const pendingSpiralPlayer = pendingSpiralShiftId
    ? state.players.find((p) => p.id === pendingSpiralShiftId) || null
    : null;
  const pendingTechnoMagicId = sector
    ? getPendingTechnoMagicPlayerId(state.players, sector, combat)
    : null;
  const pendingTechnoMagicPlayer = pendingTechnoMagicId
    ? state.players.find((p) => p.id === pendingTechnoMagicId) || null
    : null;
  const pendingDivineInspirationId = sector
    ? getPendingDivineInspirationPlayerId(state.players, sector, combat)
    : null;
  const pendingDivinePlayer = pendingDivineInspirationId
    ? state.players.find((p) => p.id === pendingDivineInspirationId) || null
    : null;

  const [technoMagicDraft, setTechnoMagicDraft] = useState<
    Partial<Record<ShipType, { slotIndex: number; partId: string }>>
  >({});
  const [activeTmShipType, setActiveTmShipType] = useState<ShipType | null>(null);
  const [tmSelectedSlots, setTmSelectedSlots] = useState<Partial<Record<ShipType, number | null>>>({});
  React.useEffect(() => {
    setTechnoMagicDraft({});
    setActiveTmShipType(null);
    setTmSelectedSlots({});
  }, [combat.sectorId, combat.subsector, pendingTechnoMagicId]);
  const spiralActiveShipClasses: ShipType[] = React.useMemo(() => {
    if (!pendingSpiralPlayer || !scopedSectorForCombat) return [];
    return (['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).filter(
      (st) =>
        getShiftPortSlotIndex(pendingSpiralPlayer.blueprints[st]) !== -1 &&
        scopedSectorForCombat.ships.some((sh) => sh.ownerId === pendingSpiralPlayer.id && sh.type === st)
    );
  }, [pendingSpiralPlayer, scopedSectorForCombat]);

  const [spiralDraftChoices, setSpiralDraftChoices] = useState<Partial<Record<ShipType, ShiftPortMode>>>({});
  React.useEffect(() => {
    if (!pendingSpiralPlayer) {
      setSpiralDraftChoices({});
      return;
    }
    const phase2 = isSpiralPhase2(pendingSpiralPlayer.techTrack.researched);
    const defaults: Partial<Record<ShipType, ShiftPortMode>> = {};
    for (const st of spiralActiveShipClasses) {
      const bp = pendingSpiralPlayer.blueprints[st];
      if (bp) {
        defaults[st] = getDefaultShiftPortMode(bp, phase2, state.expansions);
      }
    }
    setSpiralDraftChoices(defaults);
  }, [combat.sectorId, combat.subsector, pendingSpiralShiftId, spiralActiveShipClasses.join(',')]);

  if (!sector || !scopedSectorForCombat) return null;

  const units = buildCombatUnitsForSector(
    scopedSectorForCombat,
    state.players,
    combat.participatingPlayerIds,
    state.neutralShipBlueprints,
    state.expansions,
    combat.spiralShiftModes,
    combat.divineInspirationChoice
  );
  const defenderOwnerId = combat.defenderOwnerId || getSectorDefenderOwnerId(sector, state.players);
  const aliveUnits = sortUnitsByInitiative(
    units.filter((u) => u.currentDamage < u.maxHull),
    defenderOwnerId
  );

  const isResolved = combat.stage === 'resolved';
  const isMissileStage = combat.stage === 'missile';

  const attackerUnits = units.filter((u) => u.ownerId !== defenderOwnerId);
  const defenderUnits = units.filter((u) => u.ownerId === defenderOwnerId);

  const attackerOwnerIds = Array.from(new Set(attackerUnits.map((u) => u.ownerId)));
  const defenderOwnerIds = Array.from(new Set(defenderUnits.map((u) => u.ownerId)));

  const attackerSide = getSideInfo(attackerOwnerIds, 'attacker', state.players, language);
  const defenderSide = getSideInfo(defenderOwnerIds, 'defender', state.players, language);

  const groups = getCombatShipTypeGroups(aliveUnits, defenderOwnerId);
  const pendingMissileGroups = isMissileStage
    ? groups.filter(
        (g) => g.weapons.some((w) => w.isMissile) && !g.shipIds.every((id) => combat.missileFiredShipIds?.includes(id))
      )
    : [];

  const activeGroup = getActiveCombatGroup(combat, groups);

  const pendingSalvo = combat.pendingDamageAssignment;

  const effectiveAttackerOwnerId = pendingSalvo
    ? pendingSalvo.attackerOwnerId
    : activeGroup?.ownerId || null;

  const attackerOwner = effectiveAttackerOwnerId ? state.players.find((p) => p.id === effectiveAttackerOwnerId) : null;
  const isPlayerShip = !isResolved && !!(effectiveAttackerOwnerId && attackerOwner && effectiveAttackerOwnerId.startsWith('player_'));
  const isNpcShip = !isResolved && !isPlayerShip;
  const isSpectator = currentSeat === 'spectator';
  const isSeatedPlayer = typeof currentSeat === 'number';
  const myPlayer = isSeatedPlayer ? state.players[currentSeat] : null;
  const isMyShip = isPlayerShip && myPlayer ? effectiveAttackerOwnerId === myPlayer.id : false;
  const canCommandActiveShip = !isSpectator && (isResolved || currentSeat === 'all' || isNpcShip || isMyShip);
  const autoResolvePlayerIds = combat.autoResolvePlayerIds || [];
  const participatingHumanPlayers = React.useMemo(() => {
    const ids = new Set<string>(
      (combat.participatingPlayerIds || []).filter((id) => state.players.some((p) => p.id === id))
    );
    aliveUnits.forEach((u) => {
      if (state.players.some((p) => p.id === u.ownerId)) ids.add(u.ownerId);
    });
    return Array.from(ids)
      .map((id) => state.players.find((p) => p.id === id)!)
      .filter(Boolean);
  }, [combat.participatingPlayerIds, aliveUnits, state.players]);
  const actingAutoResolvePlayerId =
    isSeatedPlayer && myPlayer
      ? participatingHumanPlayers.some((p) => p.id === myPlayer.id)
        ? myPlayer.id
        : null
      : pendingSalvo?.attackerOwnerId ||
        (isPlayerShip && effectiveAttackerOwnerId
          ? effectiveAttackerOwnerId
          : participatingHumanPlayers.find((p) => !p.isBot && !autoResolvePlayerIds.includes(p.id))?.id ||
            participatingHumanPlayers.find((p) => !p.isBot)?.id ||
            participatingHumanPlayers.find((p) => !autoResolvePlayerIds.includes(p.id))?.id ||
            participatingHumanPlayers[0]?.id ||
            null);
  const isMyAutoResolveOn = Boolean(
    actingAutoResolvePlayerId && autoResolvePlayerIds.includes(actingAutoResolvePlayerId)
  );

  const [autoAssignDamage, setAutoAssignDamage] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eclipse_auto_assign_damage');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoAssign = (val: boolean) => {
    setAutoAssignDamage(val);
    try {
      localStorage.setItem('eclipse_auto_assign_damage', String(val));
    } catch {}
  };

  const eligibleEnemyTargets = React.useMemo(() => {
    if (!pendingSalvo) return [];
    return aliveUnits.filter((u) => u.ownerId !== pendingSalvo.attackerOwnerId);
  }, [pendingSalvo, aliveUnits]);

  const pendingAttackerPlayer = pendingSalvo
    ? state.players.find((p) => p.id === pendingSalvo.attackerOwnerId)
    : null;
  const hasPendingSplitter = Boolean(
    pendingSalvo?.hasAntimatterSplitter ||
      pendingAttackerPlayer?.techTrack?.researched?.some((t) => t.id === 'antimatter_splitter')
  );

  const [selectedTargets, setSelectedTargets] = useState<Record<number, string>>({});
  const [selectedSplits, setSelectedSplits] = useState<Record<number, Record<string, number>>>({});
  const prevSalvoKeyRef = React.useRef<string | null>(null);

  const computeOptimalAllocations = React.useCallback(() => {
    if (!pendingSalvo) {
      return {
        defaults: {} as Record<number, string>,
        splits: {} as Record<number, Record<string, number>>,
      };
    }

    const defaults: Record<number, string> = {};
    const splits: Record<number, Record<string, number>> = {};
    const mockTargets = eligibleEnemyTargets.map((u) => ({ ...u }));

    const canHitTarget = (roll: CombatRoll, target: CombatUnit) => {
      if (roll.dieColor === 'purple') return (roll.damage || 0) > 0;
      if (roll.roll === 6) return true;
      if (roll.roll === 1) return false;
      return roll.roll + pendingSalvo.computerBonus - target.shieldBonus >= 6;
    };

    const sortCandidates = (pool: CombatUnit[], dmgToConsider: number) =>
      [...pool].sort((a, b) => {
        const hpA = a.maxHull - a.currentDamage;
        const hpB = b.maxHull - b.currentDamage;
        const canKillA = hpA <= dmgToConsider;
        const canKillB = hpB <= dmgToConsider;
        if (canKillA !== canKillB) return canKillA ? -1 : 1;
        const rankA = SHIP_SIZE_RANK[a.type] ?? 0;
        const rankB = SHIP_SIZE_RANK[b.type] ?? 0;
        if (rankB !== rankA) return rankB - rankA;
        return hpA - hpB;
      });

    pendingSalvo.rolls.forEach((r, idx) => {
      const alive = mockTargets.filter((t) => t.currentDamage < t.maxHull);
      const validHits = alive.filter((t) => canHitTarget(r, t));

      if (isAntimatterSplitterRoll(hasPendingSplitter, r, pendingSalvo.isMissile) && validHits.length > 0) {
        let remDmg = r.damage;
        const rollSplits: Record<string, number> = {};
        while (remDmg > 0) {
          const currentValid = mockTargets.filter(
            (t) => t.currentDamage < t.maxHull && canHitTarget(r, t)
          );
          if (currentValid.length === 0) break;
          const chosen = sortCandidates(currentValid, remDmg)[0]!;
          const needed = chosen.maxHull - chosen.currentDamage;
          const applied = Math.min(remDmg, needed);
          chosen.currentDamage += applied;
          remDmg -= applied;
          rollSplits[chosen.id] = (rollSplits[chosen.id] || 0) + applied;
        }
        splits[idx] = rollSplits;
        defaults[idx] = Object.keys(rollSplits)[0] || validHits[0]?.id || '';
        return;
      }

      const pool = validHits.length > 0 ? validHits : alive.length > 0 ? alive : mockTargets;
      const chosen = sortCandidates(pool, r.damage)[0] || eligibleEnemyTargets[0];
      if (chosen) {
        defaults[idx] = chosen.id;
        if (canHitTarget(r, chosen)) {
          chosen.currentDamage += r.damage;
        }
      }
    });

    return { defaults, splits };
  }, [pendingSalvo, eligibleEnemyTargets, hasPendingSplitter]);

  useEffect(() => {
    if (!pendingSalvo) {
      if (prevSalvoKeyRef.current !== null) {
        prevSalvoKeyRef.current = null;
        setSelectedTargets({});
        setSelectedSplits({});
      }
      return;
    }

    const salvoKey = `${pendingSalvo.attackerOwnerId}_${pendingSalvo.rolls.map((r) => `${r.dieColor}:${r.roll}:${r.damage}:${r.selfDamage || 0}`).join(',')}`;
    if (prevSalvoKeyRef.current === salvoKey) {
      return;
    }
    prevSalvoKeyRef.current = salvoKey;

    const { defaults, splits } = computeOptimalAllocations();
    setSelectedTargets(defaults);
    setSelectedSplits(splits);
  }, [pendingSalvo, computeOptimalAllocations]);

  const handleAutoFillAssignments = () => {
    if (!pendingSalvo) return;
    const { defaults, splits } = computeOptimalAllocations();
    setSelectedTargets(defaults);
    setSelectedSplits(splits);
  };

  const handleAdjustSplitDamage = (
    rollIdx: number,
    targetShipId: string,
    delta: number,
    maxDamage: number
  ) => {
    setSelectedSplits((prev) => {
      const curRollSplits = { ...(prev[rollIdx] || {}) };
      const curVal = curRollSplits[targetShipId] || 0;
      const totalOther = Object.entries(curRollSplits).reduce(
        (sum, [id, dmg]) => (id === targetShipId ? sum : sum + dmg),
        0
      );
      const maxForTarget = Math.max(0, maxDamage - totalOther);
      const nextVal = Math.max(0, Math.min(maxForTarget, curVal + delta));
      if (nextVal === 0) {
        delete curRollSplits[targetShipId];
      } else {
        curRollSplits[targetShipId] = nextVal;
      }
      return { ...prev, [rollIdx]: curRollSplits };
    });
  };

  const handleConfirmDamage = () => {
    if (!pendingSalvo) return;
    const assignments: CombatDamageAssignment[] = pendingSalvo.rolls.map((r, idx) => {
      if (isAntimatterSplitterRoll(hasPendingSplitter, r, pendingSalvo.isMissile)) {
        const rollSplits = selectedSplits[idx] || {};
        const splitAssignments = Object.entries(rollSplits)
          .filter(([, dmg]) => dmg > 0)
          .map(([targetShipId, damage]) => ({ targetShipId, damage }));
        return {
          rollIndex: idx,
          targetShipId: splitAssignments[0]?.targetShipId || selectedTargets[idx] || eligibleEnemyTargets[0]?.id || '',
          splitAssignments,
        };
      }
      return {
        rollIndex: idx,
        targetShipId: selectedTargets[idx] || eligibleEnemyTargets[0]?.id || '',
      };
    });
    onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage, assignments);
  };

  // Determine eligible retreat destination sectors:
  // Must be adjacent, connected by wormhole (or wormhole generator), controlled by this player, with no opponent ships
  // (Descendants of Draco may retreat to controlled sectors containing only Ancients).
  const eligibleRetreatDestinations =
    !isResolved &&
    !isMissileStage &&
    isPlayerShip &&
    activeGroup &&
    activeGroup.type !== 'starbase' &&
    activeGroup.type !== 'orbital' &&
    attackerOwner
      ? getEligibleRetreatSectors(state, sector, attackerOwner.id)
      : [];

  const [selectedRetreatSectorId, setSelectedRetreatSectorId] = useState<string>(
    eligibleRetreatDestinations[0]?.id || ''
  );
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [hoveredShip, setHoveredShip] = useState<{
    group: CombatUnitDisplayGroup;
    rect: { left: number; right: number; top: number; bottom: number };
  } | null>(null);

  useEffect(() => {
    setHoveredShip(null);
  }, [combat.sectorId, combat.roundNumber, combat.stage, isMinimized]);

  const isAlreadyRetreating = activeGroup ? activeGroup.ships.some((s) => !!combat.retreatDeclared?.[s.id]) : false;
  const retreatDestination = isAlreadyRetreating && activeGroup
    ? state.sectors.find((s) => s.id === combat.retreatDeclared?.[activeGroup.shipIds[0] || ''])
    : null;

  const handleDeclareRetreat = () => {
    if (!activeGroup || !attackerOwner) return;
    const destId = selectedRetreatSectorId || eligibleRetreatDestinations[0]?.id;
    if (!destId) return;

    onStepCombat(activeGroup.shipIds, destId, undefined, undefined, autoAssignDamage);
  };

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-rose-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <Crosshair className="w-4 h-4 text-rose-400 animate-spin-slow" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-rose-300">
              {l(`FLEET ENGAGEMENT: SECTOR ${sector.sectorNumber}`, `舰队交火：星区 ${sector.sectorNumber}`)}
            </span>
            {combat.subsector && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
                {l(`SUB ${combat.subsector}`, `子星区 ${combat.subsector}`)}
              </span>
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
              {isResolved
                ? l('RESOLVED', '已结算')
                : isMissileStage
                ? l('MISSILE', '导弹阶段')
                : l(`RND ${combat.roundNumber}`, `第 ${combat.roundNumber} 回合`)}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center gap-1.5"
            title={l('Return to combat window', '返回战斗窗口')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{l('Return to Combat', '返回战斗')}</span>
          </button>
        </div>
      </div>
    );
  }

  const attackerGroups = groupCombatUnits(
    attackerUnits,
    activeGroup,
    pendingSalvo,
    combat.retreatDeclared,
    state.sectors
  );
  const defenderGroups = groupCombatUnits(
    defenderUnits,
    activeGroup,
    pendingSalvo,
    combat.retreatDeclared,
    state.sectors
  );

  const attackerActiveCount = attackerUnits.filter((u) => u.currentDamage < u.maxHull).length;
  const defenderActiveCount = defenderUnits.filter((u) => u.currentDamage < u.maxHull).length;

  const dieColorLabel = (c: string) => {
    switch (c) {
      case 'yellow':
        return l('Yellow', '黄骰');
      case 'orange':
        return l('Orange', '橙骰');
      case 'blue':
        return l('Blue', '蓝骰');
      case 'red':
        return l('Red', '红骰');
      case 'purple':
        return l('Purple', '紫骰');
      default:
        return c;
    }
  };

  const renderShipCard = (group: CombatUnitDisplayGroup, defaultColor: string) => {
    const owner = state.players.find((p) => p.id === group.ownerId);
    const color = owner ? getFactionDisplayColor(owner.color, owner.faction?.name) : defaultColor;

    return (
      <div
        key={group.key}
        data-testid={`combat-group-${group.type}-${group.currentHp}-${group.maxHull}`}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHoveredShip({
            group,
            rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          });
        }}
        onMouseLeave={() => {
          setHoveredShip((prev) => (prev?.group.key === group.key ? null : prev));
        }}
        className={`p-3 rounded-lg border transition-all relative ${
          group.isDestroyed
            ? 'bg-slate-950/40 border-slate-900 opacity-40'
            : group.isAttacking
            ? 'bg-slate-900 border-rose-500 hover:border-rose-400 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/60'
            : group.isRetreating
            ? 'bg-amber-950/20 border-amber-500/60 hover:border-amber-400 shadow'
            : 'bg-slate-950 border-slate-800 hover:border-cyan-500/60 shadow'
        }`}
      >
        {group.isAttacking && (
          <span
            className={`absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded text-white shadow ${
              isMissileStage ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300 animate-pulse' : 'bg-rose-600'
            }`}
          >
            {isMissileStage ? l('Firing Missiles', '发射导弹') : l('Attacking', '正在攻击')}
          </span>
        )}
        {group.isRetreating && !group.isAttacking && (
          <span className="absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500 text-slate-950 shadow">
            {l(`Retreating (Sec ${group.retreatDestinationSectorNumber || '?'})`, `撤退中 (星区 ${group.retreatDestinationSectorNumber || '?'})`)}
          </span>
        )}
        {group.isDestroyed && (
          <span className="absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-800 text-slate-400 border border-slate-700 shadow">
            {l('Destroyed', '已摧毁')} {group.count > 1 ? `x ${group.count}` : ''}
          </span>
        )}

        <div className="flex justify-between items-start gap-1">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {shouldShowShipTypeIcon(group.type, owner?.faction?.id) ? (
              <ShipTypeIcon
                shipType={group.type}
                factionId={owner?.faction?.id}
                size={14}
                color={color}
                className="drop-shadow-sm"
              />
            ) : (
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
            )}
            <span className="font-bold text-xs uppercase text-slate-200 font-display">
              {translateShipType(group.type, language)}
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {group.currentHp}/{group.maxHull} HP
            </span>
            {group.count > 1 && (
              <span className="font-mono font-black text-xs px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm">
                x {group.count}
              </span>
            )}
            {group.isRetreating && group.isAttacking && (
              <span className="text-[9px] font-bold text-amber-400 font-mono">
                {l('[Retreat Ready]', '[撤退就绪]')}
              </span>
            )}
          </div>
          <span className="text-[10px] text-indigo-400 font-bold font-mono shrink-0">
            {l('Init', '先攻')} {group.initiative >= 0 ? `+${group.initiative}` : group.initiative}
          </span>
        </div>

        {/* Health Bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>{l('Hull / HP', '舰体 / 耐久')}</span>
            <span className="font-mono font-bold text-slate-200">
              {group.currentHp} / {group.maxHull} HP
              {group.count > 1 && (
                <span className="text-slate-400 font-normal ml-1">
                  {l(`(${group.count} ships)`, `(${group.count} 艘)`)}
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                group.isDestroyed
                  ? 'bg-slate-600'
                  : group.currentDamage > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.max(
                  0,
                  (group.currentHp / group.maxHull) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Weapons list */}
        <div className="mt-2 flex flex-wrap gap-1">
          {group.weapons.map((w, idx) => (
            <span
              key={idx}
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                w.isMissile
                  ? isMissileStage && group.isAttacking
                    ? 'bg-amber-400 text-slate-950 font-black shadow ring-1 ring-amber-300'
                    : 'bg-purple-950 text-purple-300 border border-purple-800/80'
                  : !isMissileStage && group.isAttacking
                  ? 'ring-1 ring-rose-500 font-black ' +
                    (w.color === 'yellow'
                      ? 'bg-amber-950 text-amber-300'
                      : w.color === 'orange'
                      ? 'bg-orange-950 text-orange-300'
                      : 'bg-rose-950 text-rose-300')
                  : w.color === 'yellow'
                  ? 'bg-amber-950 text-amber-300'
                  : w.color === 'orange'
                  ? 'bg-orange-950 text-orange-300'
                  : 'bg-rose-950 text-rose-300'
              }`}
            >
              {w.isMissile ? '🚀 ' : ''}
              {w.count}x {w.damage} {l('Dmg', '伤害')} {dieColorLabel(w.color)}
              {w.isMissile ? l(' (Missile)', ' (导弹)') : ''}
              {group.count > 1 ? l(' (each)', ' (每艘)') : ''}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-[620px] md:w-[700px] lg:w-[780px] max-w-4xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="bg-slate-900/95 border-2 border-rose-600/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-90px)]">
        {/* Combat Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-rose-500 animate-spin-slow" />
            <div>
              <h2 className="text-lg font-bold text-rose-400 font-display flex items-center gap-2">
                {l(`FLEET ENGAGEMENT: SECTOR ${sector.sectorNumber}`, `舰队交火：星区 ${sector.sectorNumber}`)}
                {combat.subsector && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/80 text-indigo-300 font-mono font-bold">
                    {l(`SUBSECTOR ${combat.subsector}`, `子星区 ${combat.subsector}`)}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isResolved
                  ? l('Engagement resolved! Review the final salvo dice results below.', '战斗已分胜负！请查看下方最终齐射掷骰结果。')
                  : isMissileStage
                  ? l('Missile Stage: Ships armed with missiles launch one salvo in initiative order before regular combat.', '导弹阶段：装备导弹的舰船在常规炮击前按先攻顺序齐射一轮导弹。')
                  : sector.isNebula && combat.subsector
                  ? l(`Nebula battle localized to Subsector ${combat.subsector}. Ships in other subsectors do not participate.`, `星云战斗仅限子星区 ${combat.subsector} 内。其他子星区的舰船不参与交战。`)
                  : l(`Hostile forces have clashed in Ring ${sector.ring}. Tactical cannon engagement in progress.`, `敌对舰队在第 ${sector.ring} 环展开交锋，正在进行战术炮战。`)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSpectator && (
              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                {l('Spectator Observing', '旁观中')}
              </span>
            )}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded border uppercase ${
                isResolved
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : isMissileStage
                  ? 'bg-amber-950 border-amber-500 text-amber-300'
                  : 'bg-rose-950 border-rose-800 text-rose-300'
              }`}
            >
              {isResolved ? l('🏆 RESOLVED', '🏆 已结束') : isMissileStage ? l('🚀 MISSILE STAGE', '🚀 导弹阶段') : l(`Round ${combat.roundNumber}`, `第 ${combat.roundNumber} 回合`)}
            </span>
            <button
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              title={l('Minimize combat window to view galaxy map', '最小化战斗窗口以查看星系地图')}
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{l('View Map', '查看地图')}</span>
            </button>
          </div>
        </div>

        {/* Combat Field */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {!isResolved &&
            combat.roundNumber === 1 &&
            combat.kuritaDelayedPlayerIds &&
            combat.kuritaDelayedPlayerIds.length > 0 && (
              <div
                data-testid="kurita-first-shot-banner"
                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-950/50 border border-rose-500/60 text-xs text-rose-200"
              >
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/70 text-amber-300 font-black font-mono text-[10px] shrink-0">
                  2nd
                </span>
                <div>
                  <div className="font-bold text-rose-100">
                    {l('Honour your enemy with the first shot', '礼让先手（栗田武士荣耀法则）')}
                  </div>
                  <div className="text-[11px] text-rose-200/90 mt-0.5">
                    {l(
                      'In Round 1, opponents execute their Missile round and first Engagement cannons BEFORE Kurita shoots Missiles or cannons. Normal initiative speed applies from Round 2.',
                      '战斗第 1 回合中，对手先执行导弹阶段与首轮常规炮击，随后才轮到栗田幕府发射导弹与常规炮击。自第 2 回合起恢复正常先攻速度规则。'
                    )}
                  </div>
                </div>
              </div>
            )}
          {/* Opposing Forces Fleet Roster: Attacker (Left) vs Defender (Right) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>{l('Opposing Fleet Forces', '交战双方舰队')}</span>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  {l(`(${aliveUnits.length} active vessels)`, `(${aliveUnits.length} 艘存活舰船)`)}
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column: Attacker Forces */}
              <div
                data-testid="combat-attacker-column"
                className="bg-slate-950/40 rounded-xl p-3 border border-rose-900/40 flex flex-col gap-3"
              >
                {/* Attacker Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-rose-900/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shrink-0">
                      {l('Attacker', '进攻方')}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: attackerSide.color }}
                      />
                      <span className="font-bold text-xs text-slate-200 truncate">
                        {attackerSide.name}
                      </span>
                      {attackerSide.factionName && attackerSide.factionName !== attackerSide.name && (
                        <span className="text-[10px] text-slate-400 truncate">
                          ({attackerSide.factionName})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded shrink-0">
                    {l(`${attackerActiveCount} active`, `${attackerActiveCount} 艘作战`)}
                  </span>
                </div>

                {/* Attacker Ship Groups */}
                <div className="space-y-2.5">
                  {attackerGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                      {l('No attacking vessels', '无进攻方舰船')}
                    </div>
                  ) : (
                    attackerGroups.map((g) => renderShipCard(g, attackerSide.color))
                  )}
                </div>
              </div>

              {/* Right Column: Defender Forces */}
              <div
                data-testid="combat-defender-column"
                className="bg-slate-950/40 rounded-xl p-3 border border-sky-900/40 flex flex-col gap-3"
              >
                {/* Defender Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-sky-900/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white shadow-sm shrink-0">
                      {l('Defender', '防守方')}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: defenderSide.color }}
                      />
                      <span className="font-bold text-xs text-slate-200 truncate">
                        {defenderSide.name}
                      </span>
                      {defenderSide.factionName && defenderSide.factionName !== defenderSide.name && (
                        <span className="text-[10px] text-slate-400 truncate">
                          ({defenderSide.factionName})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-sky-300 font-bold bg-sky-950/60 border border-sky-800/80 px-1.5 py-0.5 rounded shrink-0">
                    {l(`${defenderActiveCount} active`, `${defenderActiveCount} 艘作战`)}
                  </span>
                </div>

                {/* Defender Ship Groups */}
                <div className="space-y-2.5">
                  {defenderGroups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                      {l('No defending vessels', '无防守方舰船')}
                    </div>
                  ) : (
                    defenderGroups.map((g) => renderShipCard(g, defenderSide.color))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resolved Engagement Banner */}
          {isResolved && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-300 font-display">
                    {l('ENGAGEMENT CONCLUDED', '战斗已结束')}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {l('Final salvo delivered. Victor:', '最终齐射已结算。胜者：')}{' '}
                    <strong className="text-emerald-300">
                      {state.players.find((p) => p.id === (combat as any).winnerOwnerId)?.name ||
                        ((combat as any).winnerOwnerId
                          ? ((combat as any).winnerOwnerId === 'ancient'
                              ? l('Ancients', '远古舰船')
                              : (combat as any).winnerOwnerId === 'guardian'
                              ? l('Guardian', '星区守护者')
                              : (combat as any).winnerOwnerId === 'gcds'
                              ? l('GCDS', '银河中心防御系统')
                              : (combat as any).winnerOwnerId.toUpperCase())
                          : l('Surviving Fleet', '幸存舰队'))}
                    </strong>
                    {l('. Review the lethal dice results below and conclude engagement to continue.', '。请查看下方致命一击的掷骰结果，点击确认结束战斗。')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onStepCombat(undefined, undefined, true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer shrink-0"
              >
                <span>{l('Conclude Engagement', '结束战斗')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pre-Combat Shift Port Selection for The Spiral */}
          {pendingSpiralPlayer && !isResolved && (
            <div
              data-testid="spiral-shift-port-panel"
              className="p-4 rounded-xl bg-slate-950/90 border-2 border-sky-400/80 shadow-xl space-y-3"
            >
              {(() => {
                const phase2 = isSpiralPhase2(pendingSpiralPlayer.techTrack.researched);
                const canConfigure =
                  !isSpectator &&
                  (currentSeat === 'all' || (myPlayer && myPlayer.id === pendingSpiralPlayer.id));
                const modes: { id: ShiftPortMode; label: string; labelZh: string }[] = [
                  { id: 'cannon', label: phase2 ? 'Plasma Cannon (2💥)' : 'Ion Cannon (1💥)', labelZh: phase2 ? '等离子炮 (2💥)' : '离子炮 (1💥)' },
                  { id: 'computer', label: phase2 ? 'Positron Computer (+2)' : 'Basic Computer (+1)', labelZh: phase2 ? '正电子电脑 (+2)' : '电子电脑 (+1)' },
                  { id: 'hull', label: phase2 ? 'Improved Hull (+2 HP)' : 'Hull (+1 HP)', labelZh: phase2 ? '改良船体 (+2 HP)' : '船体 (+1 HP)' },
                ];
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-900/70 pb-2">
                      <div>
                        <h3 className="text-xs font-black text-sky-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-sky-400" />
                          {l(
                            `Body — Configure Shift Ports Before Combat (${pendingSpiralPlayer.name})`,
                            `躯体法则 — 战前配置转换接口 (${pendingSpiralPlayer.name})`
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {l(
                            'Select one powerable module per active ship class for this sector engagement (and immediate post-combat planetary bombardment).',
                            '在当前星区交火前为每种参战舰船选择 1 项有足够剩余能量的转换接口形态（同时作用于战后立即结算的行星轰炸）。'
                          )}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${phase2 ? 'bg-amber-950/70 border-amber-500/80 text-amber-200' : 'bg-sky-950/70 border-sky-600/70 text-sky-200'}`}>
                        {phase2 ? l('Phase 2 (5+ Techs)', '第 2 阶段 (5+ 科技)') : l('Phase 1 (1–4 Techs)', '第 1 阶段 (1–4 科技)')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {spiralActiveShipClasses.map((st) => {
                        const bp = pendingSpiralPlayer.blueprints[st]!;
                        const shipCount = scopedSectorForCombat.ships.filter(
                          (sh) => sh.ownerId === pendingSpiralPlayer.id && sh.type === st
                        ).length;
                        const firstCheck = canBlueprintPowerShiftMode(bp, 'hull', phase2, state.expansions);
                        const activeMode = spiralDraftChoices[st] || 'hull';
                        return (
                          <div
                            key={`shift_${st}`}
                            className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                              <span className="uppercase">{shipCount}× {translateShipType(st, language)}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-emerald-300">
                                {l(`${firstCheck.sparePower}⚡ free`, `剩余 ${firstCheck.sparePower}⚡`)}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {modes.map((m) => {
                                const check = canBlueprintPowerShiftMode(bp, m.id, phase2, state.expansions);
                                const selected = activeMode === m.id && check.allowed;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    disabled={!canConfigure || !check.allowed}
                                    data-testid={`spiral-shift-${st}-${m.id}`}
                                    onClick={() =>
                                      setSpiralDraftChoices((prev) => ({
                                        ...prev,
                                        [st]: m.id,
                                      }))
                                    }
                                    className={`px-2 py-1.5 rounded-lg border text-[10.5px] font-bold transition ${
                                      !check.allowed
                                        ? 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                        : selected
                                        ? 'bg-sky-600 border-sky-400 text-white shadow'
                                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-500/70 cursor-pointer'
                                    }`}
                                    title={
                                      check.allowed
                                        ? `${getShiftPortResolvedPart(m.id, phase2).name} (${check.requiredPower}⚡)`
                                        : l(`Requires ${check.requiredPower}⚡ (only ${check.sparePower}⚡ free)`, `需消耗 ${check.requiredPower}⚡（当前仅剩 ${check.sparePower}⚡）`)
                                    }
                                  >
                                    <div>{language === 'zh' ? m.labelZh : m.label}</div>
                                    <div className="text-[9px] font-mono opacity-80">
                                      {check.requiredPower}⚡
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      {canConfigure && onConfigureSpiralShiftPort ? (
                        <button
                          type="button"
                          data-testid="spiral-shift-confirm-btn"
                          onClick={() =>
                            onConfigureSpiralShiftPort(combat.sectorId, spiralDraftChoices, pendingSpiralPlayer.id)
                          }
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {l('Lock Shift Ports & Begin Combat', '锁定转换接口并开始战斗')}
                        </button>
                      ) : (
                        <span className="text-xs text-sky-300 font-semibold">
                          {l(`Waiting for ${pendingSpiralPlayer.name} to configure Shift Ports...`, `正在等待 ${pendingSpiralPlayer.name} 配置转换接口...`)}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Pre-Combat Techno-Magic Temporary Upgrades for Techno-Mages */}
          {pendingTechnoMagicPlayer && !isResolved && (
            <div
              data-testid="techno-magic-panel"
              className="p-4 rounded-xl bg-slate-950/90 border-2 border-violet-400/80 shadow-xl space-y-3"
            >
              {(() => {
                const canConfigure =
                  !isSpectator &&
                  (currentSeat === 'all' || (myPlayer && myPlayer.id === pendingTechnoMagicPlayer.id));
                const eligibleParts = getEligibleTechnoMagicParts(pendingTechnoMagicPlayer, state.expansions);
                const shipClasses = (['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).filter(
                  (st) =>
                    Boolean(pendingTechnoMagicPlayer.blueprints?.[st]) &&
                    scopedSectorForCombat.ships.some(
                      (sh) => sh.ownerId === pendingTechnoMagicPlayer.id && sh.type === st
                    )
                );
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-900/70 pb-2">
                      <div>
                        <h3 className="text-xs font-black text-violet-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-violet-400" />
                          {l(
                            `Techno-Magic — Temporary Combat Upgrades (${pendingTechnoMagicPlayer.name})`,
                            `科技魔法 — 战前临时改装 (${pendingTechnoMagicPlayer.name})`
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {l(
                            'Optionally upgrade 1 slot (empty or occupied) on each participating ship blueprint with an unlocked non-Ancient part (normal power/drive rules apply; cannot remove parts; restored after combat and bombardment).',
                            '可为每型参战战舰蓝图的任一槽位（空槽或已有配件槽）临时升级 1 件已解锁的非远古配件（遵守能量/驱动限制，不可单纯移除配件，将在战斗与行星轰炸结束后恢复原状）。'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Box-based Ship Tabs + Blueprint + Graphical Part Palette */}
                    {shipClasses.length > 0 && (() => {
                      const activeTmShip =
                        activeTmShipType && shipClasses.includes(activeTmShipType)
                          ? activeTmShipType
                          : shipClasses[0]!;
                      const bp = pendingTechnoMagicPlayer.blueprints[activeTmShip]!;
                      const draftedForShip = technoMagicDraft[activeTmShip];
                      const firstEmptyIdx = bp.slots.findIndex((sl) => sl === null);
                      const fallbackSlotIdx = firstEmptyIdx !== -1 ? firstEmptyIdx : 0;
                      const selectedTmSlot =
                        tmSelectedSlots[activeTmShip] !== undefined
                          ? tmSelectedSlots[activeTmShip]!
                          : draftedForShip?.slotIndex ?? fallbackSlotIdx;

                      const previewRawSlots = bp.slots.map((sl, idx) =>
                        draftedForShip && draftedForShip.slotIndex === idx && SHIP_PARTS[draftedForShip.partId]
                          ? SHIP_PARTS[draftedForShip.partId]!
                          : sl
                      );
                      const previewEffectiveSlots = previewRawSlots.map((sl) =>
                        sl ? getEffectiveShipPart(sl, state.expansions) : null
                      );
                      const previewEffectiveExternal = (bp.externalParts || []).map((p) =>
                        getEffectiveShipPart(p, state.expansions)
                      );
                      const previewStats = calculateBlueprintStats(
                        { ...bp, slots: previewRawSlots },
                        state.expansions
                      );
                      const freePower = previewStats.totalPowerProduced - previewStats.totalPowerConsumed;

                      return (
                        <div className="space-y-3">
                          {/* Participating Ship Class Tabs */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {shipClasses.map((st) => {
                              const count = scopedSectorForCombat.ships.filter(
                                (sh) => sh.ownerId === pendingTechnoMagicPlayer.id && sh.type === st
                              ).length;
                              const hasTemp = Boolean(technoMagicDraft[st]?.partId);
                              const isSelectedTab = st === activeTmShip;
                              return (
                                <button
                                  key={`tm_tab_${st}`}
                                  type="button"
                                  data-testid={`techno-magic-tab-${st}`}
                                  onClick={() => setActiveTmShipType(st)}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                    isSelectedTab
                                      ? 'bg-violet-950/80 border-violet-400 text-violet-100 shadow ring-1 ring-violet-400/50'
                                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                                  }`}
                                >
                                  {shouldShowShipTypeIcon(st) && (
                                    <ShipTypeIcon
                                      shipType={st}
                                      factionId={pendingTechnoMagicPlayer.faction.id}
                                      color={pendingTechnoMagicPlayer.color}
                                      size={14}
                                    />
                                  )}
                                  <span className="uppercase">{count}× {translateShipType(st, language)}</span>
                                  {hasTemp && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-violet-500 text-slate-950 font-black">
                                      +1
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Blueprint Box Diagram + Live Stats (Left) and Part Tile Palette (Right) */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-xl bg-slate-900/75 border border-slate-800">
                            <div className="lg:col-span-6 flex flex-col justify-between gap-2.5">
                              {/* Mini Stats Strip */}
                              <div className="grid grid-cols-5 gap-1.5 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-center font-mono">
                                <div>
                                  <div className="text-[8.5px] text-slate-500 uppercase">{l('Hull', '船体')}</div>
                                  <div className="text-xs font-bold text-rose-300">{previewStats.totalHull} HP</div>
                                </div>
                                <div>
                                  <div className="text-[8.5px] text-slate-500 uppercase">{l('Init', '先攻')}</div>
                                  <div className="text-xs font-bold text-amber-300">+{previewStats.totalInitiative}</div>
                                </div>
                                <div>
                                  <div className="text-[8.5px] text-slate-500 uppercase">{l('Comp', '命中')}</div>
                                  <div className="text-xs font-bold text-indigo-300">+{previewStats.computerBonus}</div>
                                </div>
                                <div>
                                  <div className="text-[8.5px] text-slate-500 uppercase">{l('Shield', '护盾')}</div>
                                  <div className="text-xs font-bold text-teal-300">-{previewStats.shieldBonus}</div>
                                </div>
                                <div>
                                  <div className="text-[8.5px] text-slate-500 uppercase">{l('Power', '能量')}</div>
                                  <div className={`text-xs font-bold ${freePower >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    +{previewStats.totalPowerProduced}/-{previewStats.totalPowerConsumed}
                                  </div>
                                </div>
                              </div>

                              {/* Interactive Ship Blueprint Box Grid */}
                              <div
                                data-testid={`techno-magic-blueprint-${activeTmShip}`}
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 overflow-x-auto"
                              >
                                <ShipBlueprintSlotsLayout
                                  shipType={bp.type}
                                  factionId={pendingTechnoMagicPlayer.faction.id}
                                  slots={previewEffectiveSlots}
                                  maxSlots={bp.maxSlots}
                                  preprintedPower={bp.preprintedPower}
                                  preprintedComputer={bp.preprintedComputer}
                                  preprintedShield={bp.preprintedShield}
                                  preprintedHull={bp.preprintedHull}
                                  baseInitiative={bp.baseInitiative}
                                  externalParts={previewEffectiveExternal}
                                  interactive={canConfigure}
                                  selectedSlotIndex={selectedTmSlot}
                                  onSelectSlot={(idx) =>
                                    setTmSelectedSlots((prev) => ({ ...prev, [activeTmShip]: idx }))
                                  }
                                  modifiedSlotIndices={draftedForShip?.partId ? [draftedForShip.slotIndex] : []}
                                  onRevertSlot={() =>
                                    setTechnoMagicDraft((prev) => {
                                      const next = { ...prev };
                                      delete next[activeTmShip];
                                      return next;
                                    })
                                  }
                                  size="md"
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10.5px] text-slate-400 px-0.5">
                                <span>
                                  {selectedTmSlot !== null
                                    ? l(
                                        `Selected Box #${selectedTmSlot + 1} (${bp.slots[selectedTmSlot]?.name || 'Empty'})`,
                                        `已选格位 #${selectedTmSlot + 1}（${bp.slots[selectedTmSlot]?.name || '空槽'}）`
                                      )
                                    : l('Click a slot box above to upgrade', '请点击上方蓝图格位进行改装')}
                                </span>
                                {draftedForShip?.partId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTechnoMagicDraft((prev) => {
                                        const next = { ...prev };
                                        delete next[activeTmShip];
                                        return next;
                                      })
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    {l('Revert', '撤回')}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Graphical Ship Part Palette Boxes */}
                            <div className="lg:col-span-6 flex flex-col justify-between gap-2">
                              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                                {l(
                                  'Click a Part Tile to Install Temporarily (Non-Ancient)',
                                  '点击下方配件方块临时安装到选中格位（禁远古配件）'
                                )}
                              </div>
                              <div className="grid grid-cols-[repeat(auto-fill,64px)] gap-2 content-start max-h-[240px] overflow-y-auto p-1">
                                {eligibleParts.map((part) => {
                                  const canTest = selectedTmSlot !== null && selectedTmSlot >= 0 && selectedTmSlot < bp.slots.length;
                                  const candidateSlots = canTest
                                    ? bp.slots.map((sl, idx) => (idx === selectedTmSlot ? part : sl))
                                    : bp.slots;
                                  const candStats = calculateBlueprintStats(
                                    { ...bp, slots: candidateSlots },
                                    state.expansions
                                  );
                                  const isAllowed = canConfigure && canTest && candStats.isValid;
                                  const isCurrentlyChosen =
                                    Boolean(draftedForShip?.partId === part.id && draftedForShip?.slotIndex === selectedTmSlot);
                                  return (
                                    <button
                                      key={part.id}
                                      type="button"
                                      disabled={!isAllowed}
                                      data-testid={`techno-magic-part-${part.id}`}
                                      onClick={() => {
                                        if (selectedTmSlot === null) return;
                                        setTechnoMagicDraft((prev) => {
                                          const next = { ...prev };
                                          if (isCurrentlyChosen) {
                                            delete next[activeTmShip];
                                          } else {
                                            next[activeTmShip] = { slotIndex: selectedTmSlot, partId: part.id };
                                          }
                                          return next;
                                        });
                                      }}
                                      className={`relative w-[64px] h-[64px] p-0.5 rounded-lg border transition-all flex items-center justify-center overflow-hidden shrink-0 ${
                                        isCurrentlyChosen
                                          ? 'border-2 border-violet-400 ring-2 ring-violet-400/50 bg-violet-950/60 shadow-lg'
                                          : isAllowed
                                          ? 'border-slate-700 bg-slate-950/90 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/40 cursor-pointer'
                                          : 'border-slate-800 bg-slate-950/50 opacity-35 cursor-not-allowed'
                                      }`}
                                      title={
                                        isAllowed
                                          ? getPartTooltip(part)
                                          : `${part.name}: ${candStats.errors.join(' ') || l('Cannot install on selected slot', '无法安装至当前格位')}`
                                      }
                                    >
                                      <span className="sr-only">{part.name}</span>
                                      <ShipPartSlotGraphic part={part} size="md" className="w-full h-full" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-end pt-1">
                      {canConfigure && onSetTechnoMagicUpgrades ? (
                        <button
                          type="button"
                          data-testid="techno-magic-confirm-btn"
                          onClick={() => {
                            const list = Object.entries(technoMagicDraft)
                              .filter(([, v]) => Boolean(v && v.partId && SHIP_PARTS[v.partId]))
                              .map(([shipType, v]) => ({
                                shipType: shipType as ShipType,
                                slotIndex: v!.slotIndex,
                                partId: v!.partId,
                              }));
                            onSetTechnoMagicUpgrades(combat.sectorId, list, pendingTechnoMagicPlayer.id);
                          }}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {l('Confirm Techno-Magic & Begin Combat', '确认临时改装并开始战斗')}
                        </button>
                      ) : (
                        <span className="text-xs text-violet-300 font-semibold">
                          {l(
                            `Waiting for ${pendingTechnoMagicPlayer.name} to configure Techno-Magic...`,
                            `正在等待 ${pendingTechnoMagicPlayer.name} 选择科技魔法临时改装...`
                          )}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Pre-Combat Divine Inspiration Selection for Children of Light */}
          {pendingDivinePlayer && !isResolved && (
            <div
              data-testid="children-divine-inspiration-panel"
              className="p-4 rounded-xl bg-slate-950/90 border-2 border-fuchsia-400/80 shadow-xl space-y-3"
            >
              {(() => {
                const canChoose =
                  !isSpectator &&
                  (currentSeat === 'all' || (myPlayer && myPlayer.id === pendingDivinePlayer.id));
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fuchsia-900/70 pb-2">
                      <div>
                        <h3 className="text-xs font-black text-fuchsia-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-fuchsia-400" />
                          {l(
                            `Divine Inspiration — Choose Battle Blessing (${pendingDivinePlayer.name})`,
                            `神圣启迪 — 选择战前祝福 (${pendingDivinePlayer.name})`
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {l(
                            'An Ancient ship is present in this battle. Choose whether your non-Ancient ships gain +1 to Hit OR -1 Shield for the engagement.',
                            '本场战斗中有远古舰参战。请为你的非远古战舰选择全战斗获得 +1 命中或 -1 护盾。'
                          )}
                        </p>
                      </div>
                    </div>
                    {canChoose && onSetDivineInspiration ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          data-testid="divine-inspiration-hit-btn"
                          onClick={() => onSetDivineInspiration(combat.sectorId, 'hit', pendingDivinePlayer.id)}
                          className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/70 text-left transition cursor-pointer"
                        >
                          <div className="text-xs font-black text-amber-300 uppercase">
                            🎯 {l('+1 to Hit', '+1 命中')}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            {l('All non-Ancient Children ships gain +1 Computer bonus.', '所有非远古光明之子战舰获得 +1 电脑命中加成。')}
                          </div>
                        </button>
                        <button
                          type="button"
                          data-testid="divine-inspiration-shield-btn"
                          onClick={() => onSetDivineInspiration(combat.sectorId, 'shield', pendingDivinePlayer.id)}
                          className="p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/70 text-left transition cursor-pointer"
                        >
                          <div className="text-xs font-black text-sky-300 uppercase">
                            🛡️ {l('-1 Shield', '-1 护盾')}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            {l('All non-Ancient Children ships gain -1 Shield defense.', '所有非远古光明之子战舰获得 -1 护盾防御。')}
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-fuchsia-300 font-semibold">
                        {l(
                          `Waiting for ${pendingDivinePlayer.name} to choose Divine Inspiration (+1 to Hit or -1 Shield)...`,
                          `正在等待 ${pendingDivinePlayer.name} 选择神圣启迪（+1 命中或 -1 护盾）...`
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Pending Damage Assignment Panel (Manual Dice Allocation) */}
          {pendingSalvo && (
            <div className="p-4 rounded-xl bg-slate-950 border-2 border-cyan-500/80 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-cyan-950/80 pb-2">
                <div>
                  <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    {l(
                      `Target Damage Allocation (${pendingSalvo.attackerShipType.toUpperCase()} - ${pendingSalvo.rolls.length} Dice)`,
                      `目标伤害分配 (${translateShipType(pendingSalvo.attackerShipType, language)} - ${pendingSalvo.rolls.length} 枚骰子)`
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {l('Assign each die to an enemy target vessel. Attacker Computer:', '将每枚骰子分配给敌方目标舰船。进攻方计算机加成：')}{' '}
                    <strong className="text-cyan-300">+{pendingSalvo.computerBonus}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillAssignments}
                  className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer shrink-0"
                >
                  {l('Auto-Fill Optimal', '一键最优分配')}
                </button>
              </div>

              {/* Individual Dice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingSalvo.rolls.map((roll, idx) => {
                  const targetId = selectedTargets[idx] || eligibleEnemyTargets[0]?.id;
                  const targetUnit = (targetId ? eligibleEnemyTargets.find((u) => u.id === targetId) : null) || eligibleEnemyTargets[0];
                  const isPurple = roll.dieColor === 'purple' || (roll as any).diceColor === 'purple' || (roll as any).color === 'purple';
                  const shieldBonus = targetUnit?.shieldBonus || 0;
                  const modified = isPurple ? roll.roll : roll.roll + pendingSalvo.computerBonus - shieldBonus;
                  const isSplitCapable = isAntimatterSplitterRoll(hasPendingSplitter, roll, pendingSalvo.isMissile);
                  const splitHitTargets = isSplitCapable
                    ? eligibleEnemyTargets.filter(
                        (eu) => roll.roll === 6 || (roll.roll !== 1 && roll.roll + pendingSalvo.computerBonus - eu.shieldBonus >= 6)
                      )
                    : [];
                  const isSplitActive = isSplitCapable && splitHitTargets.length > 0;
                  const rollSplits = selectedSplits[idx] || {};
                  const totalSplitAssigned = Object.values(rollSplits).reduce((s, d) => s + d, 0);
                  const isHit = isSplitActive
                    ? true
                    : isPurple
                    ? (roll.damage || 0) > 0
                    : roll.roll === 6 || (roll.roll !== 1 && modified >= 6);

                  return (
                    (() => {
                      const effectiveDieColor = roll.dieColor || (roll as any).diceColor || (roll as any).color || 'yellow';
                      const colorName =
                        language === 'zh'
                          ? effectiveDieColor === 'red'
                            ? '红'
                            : effectiveDieColor === 'orange'
                            ? '橙'
                            : effectiveDieColor === 'blue'
                            ? '蓝'
                            : effectiveDieColor === 'purple'
                            ? '紫'
                            : '黄'
                          : effectiveDieColor.charAt(0).toUpperCase() + effectiveDieColor.slice(1);
                      return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex flex-col gap-2 transition ${
                        isHit
                          ? 'bg-slate-900/90 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/80 border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CombatDieFaceGraphic
                            color={effectiveDieColor}
                            roll={roll.roll}
                            size="sm"
                          />
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-black flex items-center gap-1.5 ${
                              effectiveDieColor === 'purple'
                                ? 'bg-purple-900 border border-purple-400 text-purple-100'
                                : effectiveDieColor === 'red'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : effectiveDieColor === 'orange'
                                ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                : effectiveDieColor === 'blue'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{
                                backgroundColor:
                                  effectiveDieColor === 'purple'
                                    ? '#a855f7'
                                    : effectiveDieColor === 'red'
                                    ? '#ef4444'
                                    : effectiveDieColor === 'orange'
                                    ? '#f97316'
                                    : effectiveDieColor === 'blue'
                                    ? '#0ea5e9'
                                    : '#eab308',
                              }}
                            />
                            <span className="capitalize font-bold">
                              {colorName}
                            </span>
                            <span>{isPurple ? l('Rift', '裂隙') : l(`Die #${idx + 1}`, `骰子 #${idx + 1}`)}</span>
                          </span>
                          {!isPurple && (
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                              ({l('Roll', '骰面')} {roll.roll} {pendingSalvo.computerBonus >= 0 ? `+${pendingSalvo.computerBonus}` : pendingSalvo.computerBonus} {shieldBonus > 0 ? `-${shieldBonus}` : ''} = {modified})
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold">
                            {roll.damage} {l('Dmg', '伤害')}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isHit
                              ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isHit ? l(`HIT (+${roll.damage})`, `命中 (+${roll.damage})`) : l('MISS', '未中')}
                        </span>
                      </div>

                      {/* Target Allocation: Split Steppers (Antimatter Splitter) OR Single Target Dropdown */}
                      {isSplitActive ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                            <span className="text-rose-300">
                              {l('Antimatter Splitter', '反物质分裂器')}
                            </span>
                            <span className="font-mono text-cyan-300">
                              {totalSplitAssigned} / {roll.damage} {l('Dmg assigned', '伤害已分配')}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                            {eligibleEnemyTargets.map((eu) => {
                              const pOwner = state.players.find((p) => p.id === eu.ownerId);
                              const ownerName = pOwner ? getPlayerDisplayName(pOwner, { short: true }) : eu.ownerId.toUpperCase();
                              const shipLabel = language === 'zh' ? translateShipType(eu.type, 'zh') : eu.type.toUpperCase();
                              const remHp = Math.max(0, eu.maxHull - eu.currentDamage);
                              const sameTypeShips = eligibleEnemyTargets.filter(
                                (t) => t.ownerId === eu.ownerId && t.type === eu.type
                              );
                              const shipNum = sameTypeShips.length > 1
                                ? ` #${sameTypeShips.findIndex((t) => t.id === eu.id) + 1}`
                                : '';
                              const canHitEu =
                                roll.roll === 6 ||
                                (roll.roll !== 1 && roll.roll + pendingSalvo.computerBonus - eu.shieldBonus >= 6);
                              const assignedToEu = rollSplits[eu.id] || 0;
                              const remBudget = Math.max(0, roll.damage - totalSplitAssigned);

                              return (
                                <div
                                  key={eu.id}
                                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded border text-[11px] ${
                                    canHitEu
                                      ? assignedToEu > 0
                                        ? 'bg-rose-950/30 border-rose-500/60 text-slate-100'
                                        : 'bg-slate-950/90 border-slate-800 text-slate-300'
                                      : 'bg-slate-950/50 border-slate-800/60 text-slate-500 opacity-60'
                                  }`}
                                >
                                  <div className="truncate">
                                    <span className="font-bold">
                                      {ownerName} {shipLabel}{shipNum}
                                    </span>{' '}
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      (HP {remHp}/{eu.maxHull}, {l('Sh', '盾')} -{eu.shieldBonus})
                                    </span>
                                  </div>
                                  {canHitEu ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        disabled={!canCommandActiveShip || assignedToEu <= 0}
                                        onClick={() => handleAdjustSplitDamage(idx, eu.id, -1, roll.damage)}
                                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-bold flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center font-mono font-bold text-rose-300">
                                        {assignedToEu}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={!canCommandActiveShip || remBudget <= 0}
                                        onClick={() => handleAdjustSplitDamage(idx, eu.id, 1, roll.damage)}
                                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-bold flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">
                                      {l('Shielded', '护盾拦截')}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            {l('Target Vessel:', '目标舰船：')}
                          </label>
                          <select
                            value={targetId}
                            disabled={!canCommandActiveShip}
                            onChange={(e) =>
                              setSelectedTargets((prev) => ({ ...prev, [idx]: e.target.value }))
                            }
                            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {eligibleEnemyTargets.map((eu) => {
                              const pOwner = state.players.find((p) => p.id === eu.ownerId);
                              const ownerName = pOwner ? getPlayerDisplayName(pOwner, { short: true }) : eu.ownerId.toUpperCase();
                              const shipLabel = language === 'zh' ? translateShipType(eu.type, 'zh') : eu.type.toUpperCase();
                              const remHp = Math.max(0, eu.maxHull - eu.currentDamage);
                              const sameTypeShips = eligibleEnemyTargets.filter(
                                (t) => t.ownerId === eu.ownerId && t.type === eu.type
                              );
                              const shipNum = sameTypeShips.length > 1
                                ? ` #${sameTypeShips.findIndex((t) => t.id === eu.id) + 1}`
                                : '';
                              return (
                                <option key={eu.id} value={eu.id}>
                                  {ownerName} {shipLabel}{shipNum} (HP: {remHp}/{eu.maxHull}, {l('Shield', '护盾')}: -{eu.shieldBonus})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Math Summary & Lyra Reroll */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                        <span>
                          {isPurple
                            ? l(`Rift: ${roll.damage} target dmg`, `裂隙：对目标造成 ${roll.damage} 伤害`)
                            : isSplitActive
                            ? l(`Roll ${roll.roll} + ${pendingSalvo.computerBonus} (split across hit targets)`, `骰面 ${roll.roll} + ${pendingSalvo.computerBonus}（在可命中目标间分配）`)
                            : l(`Roll ${roll.roll} + ${pendingSalvo.computerBonus} - ${shieldBonus} = ${modified}`, `骰面 ${roll.roll} + ${pendingSalvo.computerBonus} - ${shieldBonus} = ${modified}`)}
                        </span>

                        {(() => {
                          const rollPlayer = state.players.find((p) => p.id === pendingSalvo.attackerOwnerId);
                          const isLyra = rollPlayer?.faction.id === 'enlightened_of_lyra';
                          const hasReadyColonyShip = (rollPlayer?.colonyShips.ready || 0) > 0;
                          const canReroll =
                            !isSpectator &&
                            isLyra &&
                            hasReadyColonyShip &&
                            (currentSeat === 'all' || (myPlayer && myPlayer.id === pendingSalvo.attackerOwnerId));

                          if (!canReroll) return null;

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRerollDie) {
                                  onRerollDie(idx);
                                } else {
                                  onStepCombat(undefined, undefined, undefined, idx);
                                }
                              }}
                              title={l(
                                `Lyra Ability: Flip 1 Colony Ship (${rollPlayer.colonyShips.ready} ready) to reroll this die`,
                                `天琴座能力：横置 1 艘殖民船（可用 ${rollPlayer.colonyShips.ready}）重掷此骰`
                              )}
                              className="px-1.5 py-0.5 rounded bg-orange-600/30 hover:bg-orange-500/50 border border-orange-500 text-orange-200 text-[9px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-orange-300" />
                              <span>{l('Reroll', '重掷')}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              );
            })}
              </div>
            </div>
          )}

          {/* Dice Rolls Log */}
          {!pendingSalvo && combat.lastRolls && combat.lastRolls.length > 0 && (
            <div
              className={`p-4 rounded-lg border transition-all ${
                isResolved
                  ? 'bg-slate-950 border-emerald-600/60 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Dices className={`w-4 h-4 ${isResolved ? 'text-emerald-400' : 'text-cyan-400'}`} />{' '}
                {isResolved
                  ? l('Final Salvo Lethal Dice Results', '终结齐射致命投骰结果')
                  : l('Recent Salvo Dice Results', '本轮齐射投骰结果')}
              </h3>
              <div className="flex flex-wrap gap-2">
                 {combat.lastRolls.map((roll, idx) => {
                  const isPurple = roll.dieColor === 'purple' || (roll as any).diceColor === 'purple' || (roll as any).color === 'purple';
                  const hasSelfDmg = (roll.selfDamage || 0) > 0;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
                        isPurple
                          ? hasSelfDmg && roll.damage > 0
                            ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-1 ring-rose-500/50'
                            : hasSelfDmg
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                            : roll.isHit
                            ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-1 ring-purple-400/40'
                            : 'bg-purple-950/40 border-purple-800 text-purple-400/60'
                          : roll.isHit
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {(() => {
                        const histDieColor = roll.dieColor || (roll as any).diceColor || (roll as any).color || 'yellow';
                        const colorName =
                          language === 'zh'
                            ? histDieColor === 'red'
                              ? '红'
                              : histDieColor === 'orange'
                              ? '橙'
                              : histDieColor === 'blue'
                              ? '蓝'
                              : histDieColor === 'purple'
                              ? '紫'
                              : '黄'
                            : histDieColor.charAt(0).toUpperCase() + histDieColor.slice(1);
                        return (
                          <>
                            <CombatDieFaceGraphic
                              color={histDieColor}
                              roll={roll.roll}
                              size="sm"
                            />
                            <span
                              className={`font-mono text-xs px-2 py-0.5 rounded font-black flex items-center gap-1.5 ${
                                histDieColor === 'purple'
                                  ? 'bg-purple-900 border border-purple-400 text-purple-100'
                                  : histDieColor === 'red'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : histDieColor === 'orange'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : histDieColor === 'blue'
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                  : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{
                                  backgroundColor:
                                    histDieColor === 'purple'
                                      ? '#a855f7'
                                      : histDieColor === 'red'
                                      ? '#ef4444'
                                      : histDieColor === 'orange'
                                      ? '#f97316'
                                      : histDieColor === 'blue'
                                      ? '#0ea5e9'
                                      : '#eab308',
                                }}
                              />
                              <span className="capitalize font-bold text-[10.5px]">
                                {colorName}
                              </span>
                              <span className="font-extrabold text-xs">{isPurple ? l('Rift', '裂隙') : `#${roll.roll}`}</span>
                            </span>
                          </>
                        );
                      })()}

                      <span>
                        {isPurple ? (
                          roll.damage > 0 && hasSelfDmg ? (
                            <span className="flex items-center gap-1">
                              <span>{l(`HIT (+${roll.damage} dmg)`, `命中 (+${roll.damage} 伤害)`)}</span>
                              <span className="text-rose-400 font-extrabold">• 💥 {l('1 Self', '1 自伤')}</span>
                            </span>
                          ) : roll.damage > 0 ? (
                            l(`HIT (+${roll.damage} dmg)`, `命中 (+${roll.damage} 伤害)`)
                          ) : hasSelfDmg ? (
                            <span className="text-rose-400 font-extrabold">💥 {l('1 Self Dmg', '1 点自伤')}</span>
                          ) : (
                            l('NO DAMAGE', '无伤害')
                          )
                        ) : roll.isHit ? (
                          roll.splitAssignments && roll.splitAssignments.length > 1 ? (
                            l(
                              `HIT (Split ${roll.splitAssignments.map((s) => s.damage).join('+')})`,
                              `命中 (分裂 ${roll.splitAssignments.map((s) => s.damage).join('+')})`
                            )
                          ) : (
                            l(`HIT (+${roll.damage} dmg)`, `命中 (+${roll.damage} 伤害)`)
                          )
                        ) : (
                          l('MISS', '未中')
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {isResolved ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {l('Engagement completed • Victor:', '交火结束 • 胜者：')}{' '}
                <strong className="text-slate-100">
                  {state.players.find((p) => p.id === (combat as any).winnerOwnerId)?.name ||
                    ((combat as any).winnerOwnerId ? (combat as any).winnerOwnerId.toUpperCase() : l('Surviving Fleet', '幸存舰队'))}
                </strong>
              </span>
            ) : pendingSalvo ? (
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                {l(
                  `Assigning Salvo Damage • ${pendingSalvo.attackerShipType.toUpperCase()} (${pendingSalvo.rolls.length} Dice)`,
                  `正在分配齐射伤害 • ${translateShipType(pendingSalvo.attackerShipType, 'zh')} (${pendingSalvo.rolls.length} 颗骰子)`
                )}
              </span>
            ) : activeGroup ? (
              <span>
                {isMissileStage ? l('Missile Salvo', '导弹齐射') : l('Salvo', '常规齐射')}{' '}
                <strong className="text-slate-200">#{combat.currentTurnIndex + 1}</strong> • {l('Active Initiative:', '当前先攻：')}{' '}
                <strong className={isMissileStage ? 'text-amber-400' : 'text-rose-400'}>
                  {activeGroup.ships.length > 1 ? `${activeGroup.ships.length}x ` : ''}
                  {language === 'zh' ? translateShipType(activeGroup.type, 'zh') : activeGroup.type.toUpperCase()}
                </strong>{' '}
                ({activeGroup.initiative >= 0 ? `+${activeGroup.initiative}` : activeGroup.initiative})
                {isAlreadyRetreating && (
                  <span className="text-amber-400 ml-1">
                    {l(
                      `(Retreating to Sec ${retreatDestination?.sectorNumber || '?'})`,
                      `(正在撤退至星区 ${retreatDestination?.sectorNumber || '?'})`
                    )}
                  </span>
                )}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {isResolved ? (
              isSpectator ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300 shadow">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{l('Engagement resolved. Observing commanders...', '交火已结算，观战中...')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onStepCombat(undefined, undefined, true)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> {l('Conclude Engagement & Continue', '结束战斗并继续')}
                </button>
              )
            ) : pendingSpiralPlayer ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-950/60 border border-sky-700/70 text-xs text-sky-200">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>{l(`Configure Shift Ports above for ${pendingSpiralPlayer.name} before firing.`, `开火前请先在上方为 ${pendingSpiralPlayer.name} 配置转换接口。`)}</span>
              </div>
            ) : pendingTechnoMagicPlayer ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-950/60 border border-violet-700/70 text-xs text-violet-200">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span>{l(`Confirm Techno-Magic above for ${pendingTechnoMagicPlayer.name} before firing.`, `开火前请先在上方为 ${pendingTechnoMagicPlayer.name} 确认科技魔法临时改装。`)}</span>
              </div>
            ) : pendingDivinePlayer ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-fuchsia-950/60 border border-fuchsia-700/70 text-xs text-fuchsia-200">
                <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>{l(`Choose Divine Inspiration above for ${pendingDivinePlayer.name} before firing.`, `开火前请先在上方为 ${pendingDivinePlayer.name} 选择神圣启迪。`)}</span>
              </div>
            ) : (
              <>
                {autoResolvePlayerIds.length > 0 && (
                  <span
                    data-testid="combat-auto-resolve-status"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    {l('Auto-Resolve:', '自动结算：')}{' '}
                    {autoResolvePlayerIds
                      .map((id) => {
                        const p = state.players.find((pl) => pl.id === id);
                        return p ? getPlayerDisplayName(p) : id;
                      })
                      .join(', ')}
                  </span>
                )}

                {pendingSalvo ? (
                  !canCommandActiveShip ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {onAutoResolve && !isSpectator && actingAutoResolvePlayerId && (!isAlreadyRetreating || isMyAutoResolveOn) && (
                        <button
                          type="button"
                          onClick={() => onAutoResolve(actingAutoResolvePlayerId)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider uppercase border transition shadow cursor-pointer ${
                            isMyAutoResolveOn
                              ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-300'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                        >
                          <Zap className={`w-3.5 h-3.5 ${isMyAutoResolveOn ? 'text-emerald-400' : 'text-amber-400'}`} />{' '}
                          {isMyAutoResolveOn
                            ? l('Auto-Resolve: ON', '自动结算：已开启')
                            : l('Auto-Resolve', '一键自动结算')}
                        </button>
                      )}
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300 shadow">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>
                          {language === 'zh' ? (
                            <>
                              正在等待指挥官 <strong className="text-amber-300">{attackerOwner ? getPlayerDisplayName(attackerOwner) : '攻击方'}</strong> 分配伤害...
                            </>
                          ) : (
                            <>
                              Waiting for Commander <strong className="text-amber-300">{attackerOwner ? getPlayerDisplayName(attackerOwner) : 'attacker'}</strong> to assign damage...
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoFillAssignments}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs tracking-wider uppercase border border-slate-700 transition cursor-pointer"
                      >
                        {l('Auto-Fill', '自动填充')}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDamage}
                        disabled={!canCommandActiveShip}
                        className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl shadow-cyan-950 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> {l('Confirm Damage', '确认伤害分配')}
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    {/* Auto-assign damage toggle */}
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={autoAssignDamage}
                        onChange={(e) => handleToggleAutoAssign(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-slate-300">{l('Auto-assign', '自动分配伤害')}</span>
                    </label>
                    {!isSpectator &&
                      autoAssignDamage &&
                      participatingHumanPlayers.some(
                        (p) =>
                          p.faction.id === 'enlightened_of_lyra' &&
                          (p.colonyShips?.ready || 0) > 0 &&
                          (currentSeat === 'all' || (myPlayer && myPlayer.id === p.id))
                      ) && (
                        <span
                          data-testid="lyra-auto-assign-reroll-reminder"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-950/70 border border-orange-500/50 text-orange-200 text-[10px] font-semibold"
                        >
                          <RotateCcw className="w-3 h-3 text-orange-300 shrink-0" />
                          <span>
                            {l(
                              'Lyra: Turn off Auto-assign before firing if you want to reroll dice with Colony Ships.',
                              '天琴座：如需使用殖民船重掷骰子，请在开火前取消勾选「自动分配伤害」。'
                            )}
                          </span>
                        </span>
                      )}

                    {/* Auto-Resolve Option (per-player opt-in) */}
                    {onAutoResolve && !isSpectator && actingAutoResolvePlayerId && (!isAlreadyRetreating || isMyAutoResolveOn) && (
                      <button
                        type="button"
                        onClick={() => onAutoResolve(actingAutoResolvePlayerId)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wider uppercase border transition shadow cursor-pointer ${
                          isMyAutoResolveOn
                            ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/70 text-emerald-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${isMyAutoResolveOn ? 'text-emerald-400' : 'text-amber-400'}`} />{' '}
                        {isMyAutoResolveOn
                          ? l('Auto-Resolve: ON', '自动结算：已开启')
                          : l('Auto-Resolve', '一键自动结算')}
                      </button>
                    )}

                {!canCommandActiveShip ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300 shadow">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>
                        {isSpectator
                          ? language === 'zh'
                            ? `观战模式：正在等待${isNpcShip ? '双方指挥官' : attackerOwner ? `指挥官 ${getPlayerDisplayName(attackerOwner)}` : '当前舰船'}行动...`
                            : `Spectator Mode: Waiting for ${isNpcShip ? 'commanders' : attackerOwner ? `Commander ${getPlayerDisplayName(attackerOwner)}` : 'active ship'} to resolve...`
                          : language === 'zh'
                          ? `正在等待指挥官 ${attackerOwner ? getPlayerDisplayName(attackerOwner) : '对手'} 指挥其 ${activeGroup ? translateShipType(activeGroup.type, 'zh') : ''}...`
                          : `Waiting for Commander ${attackerOwner ? getPlayerDisplayName(attackerOwner) : 'opponent'} to command their ${activeGroup?.type.toUpperCase()}...`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Declare Retreat Option (If active unit is mobile player ship and has eligible retreat destination) */}
                    {!isAlreadyRetreating && isPlayerShip && eligibleRetreatDestinations.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-600/50 rounded-lg p-1">
                        <select
                          value={selectedRetreatSectorId || eligibleRetreatDestinations[0]?.id}
                          onChange={(e) => setSelectedRetreatSectorId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none"
                        >
                          {eligibleRetreatDestinations.map((dest) => (
                            <option key={dest.id} value={dest.id}>
                              {l(`Sector ${dest.sectorNumber}`, `星区 ${dest.sectorNumber}`)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleDeclareRetreat}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase shadow transition cursor-pointer"
                          title={l('Retreat all ships of this type to selected sector', '将该类型所有舰船撤退至所选星区')}
                        >
                          <Navigation className="w-3.5 h-3.5" /> {l('Retreat', '撤退')}
                        </button>
                      </div>
                    )}

                    {/* Complete Retreat or Fire Salvo */}
                    {isAlreadyRetreating ? (
                      <button
                        type="button"
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage)}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950 transition cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" /> {l('Complete Retreat', '完成撤退')}
                      </button>
                    ) : isNpcShip ? (
                      <button
                        type="button"
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, true)}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950 transition cursor-pointer"
                        title={l('Neutral ship attack can be triggered by any commander', '任何指挥官均可触发中立舰船开火')}
                      >
                        <Dices className="w-4 h-4" /> {l(`Roll Neutral Salvo (${activeGroup?.type.toUpperCase()})`, `投掷中立单位齐射 (${activeGroup ? translateShipType(activeGroup.type, 'zh') : ''})`)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage)}
                        className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg transition cursor-pointer ${
                          isMissileStage
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                        }`}
                      >
                        <Dices className="w-4 h-4" /> {isMissileStage ? l('Launch Missiles', '发射导弹') : l('Fire Salvo', '开火齐射')}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Hover Blueprint Box Preview Popover */}
      {hoveredShip && (() => {
        const { group, rect } = hoveredShip;
        const hoveredOwner = state.players.find((p) => p.id === group.ownerId);
        const isNpc = group.ownerId === 'ancient' || group.ownerId === 'guardian' || group.ownerId === 'gcds';
        const npcVariant = state.neutralShipBlueprints?.[group.ownerId as NeutralShipType] || 'default';
        const npcBp = isNpc
          ? getNeutralShipBlueprint(
              group.ownerId as NeutralShipType,
              npcVariant
            )
          : null;
        const titleLabel = isNpc && npcBp
          ? translateNeutralBlueprintTitle(group.ownerId as NeutralShipType, npcVariant, npcBp.name, language)
          : hoveredOwner
          ? `${getPlayerShortName(hoveredOwner)} ${translateShipType(group.type, language)}`
          : translateShipType(group.type, language);

        const hasWindow = typeof window !== 'undefined';
        const placeLeft = hasWindow && rect.left >= 270;
        const posStyle: React.CSSProperties = placeLeft
          ? {
              right: window.innerWidth - rect.left + 10,
              top: Math.max(12, Math.min(window.innerHeight - 210, rect.top)),
            }
          : hasWindow && rect.top >= 200
          ? {
              left: Math.max(12, Math.min(window.innerWidth - 260, rect.left)),
              bottom: window.innerHeight - rect.top + 8,
            }
          : {
              left: hasWindow ? Math.max(12, Math.min(window.innerWidth - 260, rect.left)) : 12,
              top: rect.bottom + 8,
            };

        return (
          <div
            data-testid="combat-ship-blueprint-hover"
            style={posStyle}
            className="fixed z-[70] pointer-events-none p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl shadow-black/80 backdrop-blur-md"
          >
            <div className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-300 mb-2 text-center">
              {l(`${titleLabel} Blueprint`, `${titleLabel} 蓝图`)}
            </div>
            <CombatShipBlueprintPreview
              state={state}
              ownerId={group.ownerId}
              shipType={group.type}
            />
          </div>
        );
      })()}
    </>
  );
};
