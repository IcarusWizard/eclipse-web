/**
 * Combat Engine: Initiative Queue, Missiles, Dice Rolls, Damage Allocation, and Reputation
 */

import { CombatRoll, CombatState, CombatDamageAssignment, PendingDamageAssignment } from '../types/state';
import { SectorShip, SectorTile } from '../types/galaxy';
import { PlayerState } from '../types/player';
import { calculateBlueprintStats } from './shipValidation';
import { getNeutralShipBlueprint, NeutralShipConfig, NeutralShipType } from './neutralShips';

export interface CombatUnit {
  id: string;
  ownerId: string;
  type: string;
  initiative: number;
  maxHull: number;
  currentDamage: number;
  computerBonus: number;
  shieldBonus: number;
  weapons: {
    color: 'yellow' | 'orange' | 'blue' | 'red' | 'purple';
    damage: number;
    count: number;
    isMissile?: boolean;
  }[];
  hasMorphShield?: boolean;
  hasAntimatterSplitter?: boolean;
}

export function buildCombatUnitsForSector(
  sector: SectorTile,
  players: PlayerState[],
  filterOwnerIds?: string[],
  neutralShipBlueprints?: Partial<NeutralShipConfig>,
  activeExpansions?: string[]
): CombatUnit[] {
  const units: CombatUnit[] = [];

  for (const ship of sector.ships) {
    if (filterOwnerIds && !filterOwnerIds.includes(ship.ownerId)) {
      continue;
    }
    if (ship.type === 'ancient' || ship.type === 'guardian' || ship.type === 'gcds') {
      const bp = getNeutralShipBlueprint(
        ship.type as NeutralShipType,
        neutralShipBlueprints?.[ship.type as NeutralShipType]
      );
      units.push({
        id: ship.id,
        ownerId: ship.ownerId,
        type: ship.type,
        initiative: bp.initiative,
        maxHull: bp.maxHull,
        currentDamage: ship.damage,
        computerBonus: bp.computerBonus,
        shieldBonus: bp.shieldBonus,
        weapons: bp.weapons.map((w) => ({ ...w })),
      });
    } else {
      const player = players.find((p) => p.id === ship.ownerId);
      if (!player) continue;
      const bp = player.blueprints[ship.type];
      if (!bp) continue;
      const stats = calculateBlueprintStats(bp, activeExpansions || bp.activeExpansions);

      const allParts = [...bp.slots, ...(bp.externalParts || [])];
      const weapons: CombatUnit['weapons'] = [];
      for (const slot of allParts) {
        if (slot?.dice) {
          for (const d of slot.dice) {
            weapons.push({
              color: d.color,
              damage: d.damagePerHit,
              count: d.count,
              isMissile: d.isMissile,
            });
          }
        }
      }

      const hasMorphShield = allParts.some((s) => s?.id === 'morph_shield' || s?.morphShield);
      const hasAntimatterSplitter = Boolean(
        player.techTrack?.researched?.some((t) => t.id === 'antimatter_splitter')
      );

      units.push({
        id: ship.id,
        ownerId: ship.ownerId,
        type: ship.type,
        initiative: stats.totalInitiative,
        maxHull: stats.totalHull,
        currentDamage: ship.damage,
        computerBonus: stats.computerBonus,
        shieldBonus: stats.shieldBonus,
        weapons,
        hasMorphShield,
        hasAntimatterSplitter,
      });
    }
  }

  return units;
}

export function getSectorDefenderOwnerId(sector: SectorTile, players?: PlayerState[]): string | undefined {
  if (players) {
    const dracoPlayer = players.find((p) => p.faction.id === 'descendants_of_draco');
    if (dracoPlayer && sector.ships.some((s) => s.ownerId === dracoPlayer.id)) {
      return dracoPlayer.id;
    }
  }
  if (sector.ancientsCount > 0 || sector.ships.some((s) => s.ownerId === 'ancient' || s.type === 'ancient')) {
    return 'ancient';
  }
  if (sector.ships.some((s) => s.ownerId === 'guardian' || s.type === 'guardian')) {
    return 'guardian';
  }
  if (sector.hasGCDS || sector.ships.some((s) => s.ownerId === 'gcds' || s.type === 'gcds')) {
    return 'gcds';
  }
  if (sector.discOwner) {
    return sector.discOwner;
  }
  if (sector.ships.length > 0) {
    return sector.ships[0].ownerId;
  }
  return undefined;
}

export function sortUnitsByInitiative(units: CombatUnit[], defenderOwnerId?: string): CombatUnit[] {
  return [...units].sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    // Initiative ties between opponents are resolved in favor of the Defender
    if (defenderOwnerId) {
      if (a.ownerId === defenderOwnerId && b.ownerId !== defenderOwnerId) {
        return -1;
      }
      if (b.ownerId === defenderOwnerId && a.ownerId !== defenderOwnerId) {
        return 1;
      }
    }
    return 0;
  });
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export const SHIP_SIZE_RANK: Record<string, number> = {
  gcds: 5,
  guardian: 4,
  dreadnought: 4,
  ancient: 3,
  cruiser: 3,
  starbase: 2,
  orbital: 2,
  interceptor: 1,
};

export interface PurpleDieRollResult {
  rawRoll: number;
  targetDamage: number;
  selfDamage: number;
  isHit: boolean;
  symbol: string;
}

/**
 * Purple Rift Die Roll (Eclipse: Second Dawn / Shadow of the Rift)
 * 6 sides without numbers:
 * - 2 sides make no damage (sides 1, 2)
 * - 1 side makes 1 damage (side 3)
 * - 1 side makes 2 damages (side 4)
 * - 1 side makes 3 damage and 1 damage to itself (side 5)
 * - 1 side makes 1 damage to itself (side 6)
 * Computers and shields DO NOT modify purple dice rolls.
 */
export function rollPurpleDie(): PurpleDieRollResult {
  const rawRoll = rollD6();
  let targetDamage = 0;
  let selfDamage = 0;
  let symbol = '';

  if (rawRoll === 1 || rawRoll === 2) {
    targetDamage = 0;
    selfDamage = 0;
    symbol = 'miss';
  } else if (rawRoll === 3) {
    targetDamage = 1;
    selfDamage = 0;
    symbol = '1';
  } else if (rawRoll === 4) {
    targetDamage = 2;
    selfDamage = 0;
    symbol = '2';
  } else if (rawRoll === 5) {
    targetDamage = 3;
    selfDamage = 1;
    symbol = '3+💥';
  } else if (rawRoll === 6) {
    targetDamage = 0;
    selfDamage = 1;
    symbol = '💥';
  }

  return {
    rawRoll,
    targetDamage,
    selfDamage,
    isHit: targetDamage > 0,
    symbol,
  };
}

/**
 * Assigns self-damage from purple Rift dice.
 * Rule: Assigned to the player's own ships with purple dice, from largest to smallest.
 */
export function applyRiftSelfDamage(
  units: CombatUnit[],
  attackerOwnerId: string,
  selfDamageToAssign: number,
  activeCombat: CombatState
): void {
  let remainingSelfDmg = selfDamageToAssign;

  // Filter player's own ships in the battle that have purple dice and are alive
  const eligibleUnits = units.filter(
    (u) =>
      u.ownerId === attackerOwnerId &&
      u.weapons.some((w) => w.color === 'purple') &&
      u.currentDamage < u.maxHull
  );

  // Sort from largest to smallest ship (dreadnought > cruiser > starbase > interceptor)
  eligibleUnits.sort((a, b) => {
    const rankA = SHIP_SIZE_RANK[a.type] ?? 0;
    const rankB = SHIP_SIZE_RANK[b.type] ?? 0;
    if (rankB !== rankA) {
      return rankB - rankA;
    }
    // If same ship type, concentrate damage on already damaged ship first
    const remA = a.maxHull - a.currentDamage;
    const remB = b.maxHull - b.currentDamage;
    return remA - remB;
  });

  for (const unit of eligibleUnits) {
    if (remainingSelfDmg <= 0) break;
    const remainingHp = unit.maxHull - unit.currentDamage;
    const dmg = Math.min(remainingSelfDmg, remainingHp);
    unit.currentDamage += dmg;
    remainingSelfDmg -= dmg;

    if (unit.currentDamage >= unit.maxHull) {
      activeCombat.destroyedShips = activeCombat.destroyedShips || [];
      if (!activeCombat.destroyedShips.some((d) => d.shipId === unit.id)) {
        activeCombat.destroyedShips.push({
          shipId: unit.id,
          type: unit.type,
          ownerId: unit.ownerId,
          killerId: unit.ownerId, // Self-inflicted rift damage
        });
      }
    }
  }
}

export interface CombatStepResult {
  updatedUnits: CombatUnit[];
  rolls: CombatRoll[];
  isCombatOver: boolean;
  winnerOwnerId?: string;
  completedRetreat?: {
    shipId: string;
    ownerId: string;
    destinationSectorId: string;
  };
  completedRetreats?: {
    shipId: string;
    ownerId: string;
    destinationSectorId: string;
  }[];
  declaredRetreat?: {
    shipIds: string[];
    destinationSectorId: string;
    ownerId: string;
  };
  isPendingAssignment?: boolean;
}

export interface CombatShipGroup {
  groupKey: string; // `${ownerId}_${type}`
  ownerId: string;
  type: string;
  initiative: number;
  shipIds: string[];
  ships: CombatUnit[];
  computerBonus: number;
  shieldBonus: number;
  weapons: CombatUnit['weapons'];
  hasMorphShield?: boolean;
  hasAntimatterSplitter?: boolean;
}

export function getCombatShipTypeGroups(
  units: CombatUnit[],
  defenderOwnerId?: string
): CombatShipGroup[] {
  const alive = units.filter((u) => u.currentDamage < u.maxHull);
  const groupMap = new Map<string, CombatShipGroup>();

  for (const u of alive) {
    const key = `${u.ownerId}_${u.type}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        ownerId: u.ownerId,
        type: u.type,
        initiative: u.initiative,
        shipIds: [u.id],
        ships: [u],
        computerBonus: u.computerBonus,
        shieldBonus: u.shieldBonus,
        weapons: u.weapons.map((w) => ({ ...w })),
        hasMorphShield: u.hasMorphShield,
        hasAntimatterSplitter: u.hasAntimatterSplitter,
      });
    } else {
      const g = groupMap.get(key)!;
      g.shipIds.push(u.id);
      g.ships.push(u);
      for (const w of u.weapons) {
        g.weapons.push({ ...w });
      }
      if (u.hasMorphShield) g.hasMorphShield = true;
      if (u.hasAntimatterSplitter) g.hasAntimatterSplitter = true;
    }
  }

  const groups = Array.from(groupMap.values());
  groups.sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }
    // Defender wins initiative ties between opponents
    if (defenderOwnerId) {
      if (a.ownerId === defenderOwnerId && b.ownerId !== defenderOwnerId) return -1;
      if (b.ownerId === defenderOwnerId && a.ownerId !== defenderOwnerId) return 1;
    }
    const rankA = SHIP_SIZE_RANK[a.type] ?? 0;
    const rankB = SHIP_SIZE_RANK[b.type] ?? 0;
    return rankB - rankA;
  });

  return groups;
}

export function getActiveCombatGroup(
  combat: CombatState,
  groups: CombatShipGroup[]
): CombatShipGroup | null {
  if (combat.stage === 'resolved' || groups.length === 0) {
    return null;
  }
  if (combat.pendingDamageAssignment) {
    const key = `${combat.pendingDamageAssignment.attackerOwnerId}_${combat.pendingDamageAssignment.attackerShipType}`;
    const found = groups.find((g) => g.groupKey === key);
    if (found) return found;
  }
  if (combat.stage === 'missile') {
    const pendingMissileGroups = groups.filter(
      (g) =>
        g.weapons.some((w) => w.isMissile) &&
        !g.shipIds.every((id) => combat.missileFiredShipIds?.includes(id))
    );
    return pendingMissileGroups[0] || null;
  }
  // Regular stage
  const actedKeys = combat.roundActedGroupKeys || [];
  const pendingGroups = groups.filter((g) => !actedKeys.includes(g.groupKey));
  if (pendingGroups.length > 0) {
    return pendingGroups[0];
  }
  return groups[0] || null;
}

function canRollHitUnit(
  dieColor: CombatRoll['dieColor'],
  rawRoll: number,
  damage: number,
  computerBonus: number,
  target: CombatUnit
): { isHit: boolean; modified: number } {
  if (dieColor === 'purple') {
    return { isHit: damage > 0, modified: rawRoll };
  }
  const modified = rawRoll + computerBonus - target.shieldBonus;
  if (rawRoll === 6) return { isHit: true, modified };
  if (rawRoll === 1) return { isHit: false, modified };
  return { isHit: modified >= 6, modified };
}

function sortCombatTargetCandidates(pool: CombatUnit[], damageToConsider: number): CombatUnit[] {
  return [...pool].sort((a, b) => {
    const hpA = a.maxHull - a.currentDamage;
    const hpB = b.maxHull - b.currentDamage;
    const rankA = SHIP_SIZE_RANK[a.type] ?? 0;
    const rankB = SHIP_SIZE_RANK[b.type] ?? 0;
    const canKillA = hpA <= damageToConsider;
    const canKillB = hpB <= damageToConsider;

    // Priority 1: if damage can destroy a ship, destroy a ship!
    if (canKillA !== canKillB) {
      return canKillA ? -1 : 1;
    }

    // Priority 2: if both can be destroyed (or neither), target largest ship
    if (rankB !== rankA) {
      return rankB - rankA;
    }

    // Priority 3: tie-break with lowest remaining HP
    return hpA - hpB;
  });
}

function recordDestroyedShip(activeCombat: CombatState, target: CombatUnit, killerId: string): void {
  if (target.currentDamage < target.maxHull) return;
  activeCombat.destroyedShips = activeCombat.destroyedShips || [];
  if (!activeCombat.destroyedShips.some((d) => d.shipId === target.id)) {
    activeCombat.destroyedShips.push({
      shipId: target.id,
      type: target.type,
      ownerId: target.ownerId,
      killerId,
    });
  }
}

export function isAntimatterSplitterRoll(
  hasAntimatterSplitter: boolean | undefined,
  roll: { dieColor: string; damage: number; isMissile?: boolean },
  salvoIsMissile?: boolean
): boolean {
  return Boolean(
    hasAntimatterSplitter &&
      roll.dieColor === 'red' &&
      !salvoIsMissile &&
      !roll.isMissile &&
      roll.damage >= 2
  );
}

export function autoAssignSalvoDamage(
  rolls: CombatRoll[],
  activeGroup: CombatShipGroup,
  enemyTargets: CombatUnit[],
  activeCombat: CombatState,
  allUnits: CombatUnit[]
): void {
  for (const r of rolls) {
    if (r.dieColor === 'purple' && r.selfDamage && r.selfDamage > 0) {
      applyRiftSelfDamage(allUnits, activeGroup.ownerId, r.selfDamage, activeCombat);
    }

    const aliveTargets = enemyTargets.filter((u) => u.currentDamage < u.maxHull);
    if (aliveTargets.length === 0) {
      if (enemyTargets.length > 0) {
        r.targetShipId = enemyTargets[0]!.id;
      }
      continue;
    }

    const canHit = (cand: CombatUnit) =>
      canRollHitUnit(r.dieColor, r.roll, r.damage, activeGroup.computerBonus, cand).isHit;

    const validHitTargets = aliveTargets.filter(canHit);

    // Antimatter Splitter (official Second Dawn rule):
    // Allows dividing Antimatter Cannon damage (red cannon die) freely over valid hit targets.
    if (
      isAntimatterSplitterRoll(activeGroup.hasAntimatterSplitter, r, Boolean(r.isMissile)) &&
      validHitTargets.length > 0
    ) {
      let remDmg = r.damage;
      const splitAssignments: { targetShipId: string; damage: number }[] = [];

      while (remDmg > 0) {
        const currentValid = enemyTargets.filter(
          (u) => u.currentDamage < u.maxHull && canHit(u)
        );
        if (currentValid.length === 0) break;

        const chosen = sortCombatTargetCandidates(currentValid, remDmg)[0]!;
        const needed = chosen.maxHull - chosen.currentDamage;
        const applied = Math.min(remDmg, needed);
        chosen.currentDamage += applied;
        remDmg -= applied;
        splitAssignments.push({ targetShipId: chosen.id, damage: applied });
        recordDestroyedShip(activeCombat, chosen, activeGroup.ownerId);
      }

      const firstTarget =
        enemyTargets.find((u) => u.id === splitAssignments[0]?.targetShipId) || validHitTargets[0]!;
      r.splitAssignments = splitAssignments;
      r.targetShipId = firstTarget.id;
      r.modifiedRoll = canRollHitUnit(
        r.dieColor,
        r.roll,
        r.damage,
        activeGroup.computerBonus,
        firstTarget
      ).modified;
      r.isHit = splitAssignments.length > 0;
      continue;
    }

    const targetPool = validHitTargets.length > 0 ? validHitTargets : aliveTargets;
    const chosenTarget = sortCombatTargetCandidates(targetPool, r.damage)[0]!;

    r.targetShipId = chosenTarget.id;
    const hitCheck = canRollHitUnit(
      r.dieColor,
      r.roll,
      r.damage,
      activeGroup.computerBonus,
      chosenTarget
    );
    r.modifiedRoll = hitCheck.modified;
    r.isHit = hitCheck.isHit;
    if (r.isHit) {
      chosenTarget.currentDamage += r.damage;
      recordDestroyedShip(activeCombat, chosenTarget, activeGroup.ownerId);
    }
  }
}

export function applyManualDamageAssignments(
  assignments: CombatDamageAssignment[],
  pendingSalvo: PendingDamageAssignment,
  enemyTargets: CombatUnit[],
  activeCombat: CombatState,
  allUnits: CombatUnit[]
): CombatRoll[] {
  const resultRolls: CombatRoll[] = [];

  for (let idx = 0; idx < pendingSalvo.rolls.length; idx++) {
    const roll = { ...pendingSalvo.rolls[idx]! };
    const assign = assignments.find((a) => a.rollIndex === idx);

    if (roll.dieColor === 'purple' && roll.selfDamage && roll.selfDamage > 0) {
      applyRiftSelfDamage(allUnits, pendingSalvo.attackerOwnerId, roll.selfDamage, activeCombat);
    }

    if (
      isAntimatterSplitterRoll(pendingSalvo.hasAntimatterSplitter, roll, pendingSalvo.isMissile) &&
      assign?.splitAssignments &&
      assign.splitAssignments.length > 0
    ) {
      let remainingBudget = roll.damage;
      const appliedSplits: { targetShipId: string; damage: number }[] = [];

      for (const req of assign.splitAssignments) {
        if (remainingBudget <= 0) break;
        const reqDmg = Math.floor(req.damage || 0);
        if (reqDmg <= 0) continue;

        const target = enemyTargets.find((u) => u.id === req.targetShipId);
        if (!target) continue;

        const hitCheck = canRollHitUnit(
          roll.dieColor,
          roll.roll,
          roll.damage,
          pendingSalvo.computerBonus,
          target
        );
        if (!hitCheck.isHit) continue;

        const alloc = Math.min(reqDmg, remainingBudget);
        if (alloc <= 0) continue;

        target.currentDamage += alloc;
        remainingBudget -= alloc;
        const existing = appliedSplits.find((s) => s.targetShipId === target.id);
        if (existing) {
          existing.damage += alloc;
        } else {
          appliedSplits.push({ targetShipId: target.id, damage: alloc });
        }
        recordDestroyedShip(activeCombat, target, pendingSalvo.attackerOwnerId);
      }

      roll.splitAssignments = appliedSplits;
      if (appliedSplits.length > 0) {
        const firstTarget = enemyTargets.find((u) => u.id === appliedSplits[0]!.targetShipId)!;
        roll.targetShipId = firstTarget.id;
        roll.modifiedRoll = canRollHitUnit(
          roll.dieColor,
          roll.roll,
          roll.damage,
          pendingSalvo.computerBonus,
          firstTarget
        ).modified;
        roll.isHit = true;
      } else {
        const fallbackTarget =
          (assign.targetShipId ? enemyTargets.find((u) => u.id === assign.targetShipId) : null) ||
          enemyTargets[0] ||
          null;
        roll.targetShipId = fallbackTarget?.id;
        roll.modifiedRoll = fallbackTarget
          ? canRollHitUnit(roll.dieColor, roll.roll, roll.damage, pendingSalvo.computerBonus, fallbackTarget).modified
          : roll.roll;
        roll.isHit = false;
      }

      resultRolls.push(roll);
      continue;
    }

    const targetShipId = assign?.targetShipId;
    const target = (targetShipId ? enemyTargets.find((u) => u.id === targetShipId) : null) || enemyTargets[0] || null;
    if (target) {
      roll.targetShipId = target.id;
      const hitCheck = canRollHitUnit(
        roll.dieColor,
        roll.roll,
        roll.damage,
        pendingSalvo.computerBonus,
        target
      );
      roll.modifiedRoll = hitCheck.modified;
      roll.isHit = hitCheck.isHit;

      if (roll.isHit) {
        target.currentDamage += roll.damage;
        recordDestroyedShip(activeCombat, target, pendingSalvo.attackerOwnerId);
      }
    } else {
      roll.isHit = false;
    }

    resultRolls.push(roll);
  }

  return resultRolls;
}

export function executeCombatStep(
  units: CombatUnit[],
  activeCombat: CombatState,
  retreatOptions?: {
    retreatShipIds?: string[];
    retreatDestinationSectorId?: string;
  },
  defenderOwnerId?: string,
  autoAssign?: boolean,
  damageAssignments?: CombatDamageAssignment[]
): CombatStepResult {
  const effectiveDefenderId = defenderOwnerId || activeCombat.defenderOwnerId;
  const aliveUnits = sortUnitsByInitiative(
    units.filter((u) => u.currentDamage < u.maxHull),
    effectiveDefenderId
  );

  // Group alive units by owner
  const owners = Array.from(new Set(aliveUnits.map((u) => u.ownerId)));
  if (owners.length <= 1) {
    activeCombat.pendingDamageAssignment = null;
    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: owners[0],
    };
  }

  activeCombat.destroyedShips = activeCombat.destroyedShips || [];

  // -------------------------------------------------------------
  // Case A: Confirming manual damage assignments for a pending salvo
  // -------------------------------------------------------------
  if (activeCombat.pendingDamageAssignment && damageAssignments && damageAssignments.length > 0) {
    const pendingSalvo = activeCombat.pendingDamageAssignment;
    const enemyTargets = units.filter((u) => u.ownerId !== pendingSalvo.attackerOwnerId);
    const appliedRolls = applyManualDamageAssignments(
      damageAssignments,
      pendingSalvo,
      enemyTargets,
      activeCombat,
      units
    );
    activeCombat.pendingDamageAssignment = null;
    activeCombat.lastRolls = appliedRolls;

    if (pendingSalvo.isMissile) {
      activeCombat.missileFiredShipIds = activeCombat.missileFiredShipIds || [];
      for (const sid of pendingSalvo.attackerShipIds) {
        if (!activeCombat.missileFiredShipIds.includes(sid)) {
          activeCombat.missileFiredShipIds.push(sid);
        }
      }

      const remainingAlive = units.filter((u) => u.currentDamage < u.maxHull);
      const remainingOwners = Array.from(new Set(remainingAlive.map((u) => u.ownerId)));
      if (remainingOwners.length <= 1) {
        return {
          updatedUnits: units,
          rolls: appliedRolls,
          isCombatOver: true,
          winnerOwnerId: remainingOwners[0],
        };
      }

      const groups = getCombatShipTypeGroups(remainingAlive, effectiveDefenderId);
      const nextPendingMissileGroups = groups.filter(
        (g) =>
          g.weapons.some((w) => w.isMissile) &&
          !g.shipIds.every((id) => activeCombat.missileFiredShipIds!.includes(id))
      );
      if (nextPendingMissileGroups.length === 0) {
        activeCombat.stage = 'regular';
        activeCombat.roundNumber = 1;
        activeCombat.currentTurnIndex = -1;
        activeCombat.roundActedGroupKeys = [];
      }
      return {
        updatedUnits: units,
        rolls: appliedRolls,
        isCombatOver: false,
      };
    } else {
      const remainingAlive = units.filter((u) => u.currentDamage < u.maxHull);
      const remainingOwners = Array.from(new Set(remainingAlive.map((u) => u.ownerId)));
      if (remainingOwners.length <= 1) {
        return {
          updatedUnits: units,
          rolls: appliedRolls,
          isCombatOver: true,
          winnerOwnerId: remainingOwners[0],
        };
      }

      activeCombat.roundActedGroupKeys = activeCombat.roundActedGroupKeys || [];
      const key = `${pendingSalvo.attackerOwnerId}_${pendingSalvo.attackerShipType}`;
      if (!activeCombat.roundActedGroupKeys.includes(key)) {
        activeCombat.roundActedGroupKeys.push(key);
      }

      const groups = getCombatShipTypeGroups(remainingAlive, effectiveDefenderId);
      const nextPending = groups.filter(
        (g) => !activeCombat.roundActedGroupKeys!.includes(g.groupKey)
      );
      if (nextPending.length === 0) {
        activeCombat.roundNumber += 1;
        activeCombat.roundActedGroupKeys = [];
        for (const u of remainingAlive) {
          if (u.hasMorphShield && u.currentDamage > 0 && u.currentDamage < u.maxHull) {
            u.currentDamage = Math.max(0, u.currentDamage - 1);
          }
        }
      }

      return {
        updatedUnits: units,
        rolls: appliedRolls,
        isCombatOver: false,
      };
    }
  }

  // -------------------------------------------------------------
  // Group units by (ownerId, type) for coordinated ship type activations
  // -------------------------------------------------------------
  const groups = getCombatShipTypeGroups(aliveUnits, effectiveDefenderId);

  // =========================================================================
  // STAGE 1: MISSILE COMBAT STAGE (Fired once by ship type, Rulebook p. 20)
  // =========================================================================
  if (activeCombat.stage === 'missile') {
    activeCombat.missileFiredShipIds = activeCombat.missileFiredShipIds || [];

    const pendingMissileGroups = groups.filter(
      (g) =>
        g.weapons.some((w) => w.isMissile) &&
        !g.shipIds.every((id) => activeCombat.missileFiredShipIds!.includes(id))
    );

    if (pendingMissileGroups.length === 0) {
      activeCombat.stage = 'regular';
      activeCombat.roundNumber = 1;
      activeCombat.currentTurnIndex = 0;
      activeCombat.roundActedGroupKeys = [];
    } else {
      const activeGroup = pendingMissileGroups[0]!;
      for (const sid of activeGroup.shipIds) {
        if (!activeCombat.missileFiredShipIds.includes(sid)) {
          activeCombat.missileFiredShipIds.push(sid);
        }
      }

      const enemyTargets = aliveUnits.filter(
        (u) => u.ownerId !== activeGroup.ownerId && u.currentDamage < u.maxHull
      );

      if (enemyTargets.length === 0) {
        return {
          updatedUnits: units,
          rolls: [],
          isCombatOver: true,
          winnerOwnerId: activeGroup.ownerId,
        };
      }

      // Roll all missile weapons for all ships of this type
      const salvoRolls: CombatRoll[] = [];
      for (const ship of activeGroup.ships) {
        const missileWeapons = ship.weapons.filter((w) => w.isMissile);
        for (const weapon of missileWeapons) {
          for (let i = 0; i < weapon.count; i++) {
            if (weapon.color === 'purple') {
              const res = rollPurpleDie();
              salvoRolls.push({
                shipId: ship.id,
                shipOwner: activeGroup.ownerId,
                dieColor: 'purple',
                roll: res.rawRoll,
                modifiedRoll: res.rawRoll,
                isHit: res.isHit,
                damage: res.targetDamage,
                selfDamage: res.selfDamage,
                symbol: res.symbol,
                isMissile: true,
              });
            } else {
              const raw = rollD6();
              const canHitAny =
                enemyTargets.length === 0 ||
                enemyTargets.some((t) => raw + activeGroup.computerBonus - t.shieldBonus >= 6);
              const isHit = raw === 6 || (raw !== 1 && canHitAny);
              salvoRolls.push({
                shipId: ship.id,
                shipOwner: activeGroup.ownerId,
                dieColor: weapon.color,
                roll: raw,
                modifiedRoll: raw + activeGroup.computerBonus,
                isHit,
                damage: weapon.damage,
                isMissile: true,
              });
            }
          }
        }
      }

      // Check manual assignment requirement
      const isPlayerAttacker = activeGroup.ownerId.startsWith('player_');
      if (autoAssign === false && isPlayerAttacker) {
        activeCombat.pendingDamageAssignment = {
          attackerOwnerId: activeGroup.ownerId,
          attackerShipType: activeGroup.type,
          attackerShipIds: activeGroup.shipIds,
          computerBonus: activeGroup.computerBonus,
          rolls: salvoRolls,
          isMissile: true,
          hasAntimatterSplitter: activeGroup.hasAntimatterSplitter,
        };
        activeCombat.lastRolls = salvoRolls;
        return {
          updatedUnits: units,
          rolls: salvoRolls,
          isCombatOver: false,
          isPendingAssignment: true,
        };
      }

      // Auto-assign salvo damage
      autoAssignSalvoDamage(salvoRolls, activeGroup, enemyTargets, activeCombat, units);

      const remainingAlive = aliveUnits.filter((u) => u.currentDamage < u.maxHull);
      const remainingOwners = Array.from(new Set(remainingAlive.map((u) => u.ownerId)));
      if (remainingOwners.length <= 1) {
        return {
          updatedUnits: units,
          rolls: salvoRolls,
          isCombatOver: true,
          winnerOwnerId: remainingOwners[0],
        };
      }

      const nextPendingMissileGroups = getCombatShipTypeGroups(remainingAlive, effectiveDefenderId).filter(
        (g) =>
          g.weapons.some((w) => w.isMissile) &&
          !g.shipIds.every((id) => activeCombat.missileFiredShipIds!.includes(id))
      );

      if (nextPendingMissileGroups.length === 0) {
        activeCombat.stage = 'regular';
        activeCombat.roundNumber = 1;
        activeCombat.currentTurnIndex = -1;
        activeCombat.roundActedGroupKeys = [];
      }

      return {
        updatedUnits: units,
        rolls: salvoRolls,
        isCombatOver: false,
      };
    }
  }

  // =========================================================================
  // STAGE 2: REGULAR ENGAGEMENT ROUNDS (Cannons Only, Rulebook p. 20)
  // =========================================================================

  // Stalemate check
  const hasAnyCannons = aliveUnits.some((u) =>
    u.weapons.some((w) => !w.isMissile && w.count > 0 && (w.damage > 0 || w.color === 'purple'))
  );

  if (!hasAnyCannons) {
    const defenderId = effectiveDefenderId || aliveUnits[0]?.ownerId;
    const attackerUnits = aliveUnits.filter((u) => u.ownerId !== defenderId);
    for (const att of attackerUnits) {
      att.currentDamage = att.maxHull;
      activeCombat.destroyedShips.push({
        shipId: att.id,
        type: att.type,
        ownerId: att.ownerId,
        killerId: defenderId,
      });
    }

    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: defenderId,
    };
  }

  activeCombat.roundActedGroupKeys = activeCombat.roundActedGroupKeys || [];
  let pendingGroups = groups.filter((g) => !activeCombat.roundActedGroupKeys!.includes(g.groupKey));
  if (pendingGroups.length === 0) {
    activeCombat.roundNumber += 1;
    activeCombat.roundActedGroupKeys = [];
    for (const u of aliveUnits) {
      if (u.hasMorphShield && u.currentDamage > 0 && u.currentDamage < u.maxHull) {
        u.currentDamage = Math.max(0, u.currentDamage - 1);
      }
    }
    pendingGroups = groups;
  }

  const activeGroup = pendingGroups[0];

  if (!activeGroup) {
    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: owners[0],
    };
  }

  // Check 1: User declared retreat this step
  if (
    retreatOptions?.retreatShipIds &&
    retreatOptions.retreatShipIds.length > 0 &&
    retreatOptions.retreatDestinationSectorId
  ) {
    activeCombat.retreatDeclared = activeCombat.retreatDeclared || {};
    for (const sid of activeGroup.shipIds) {
      activeCombat.retreatDeclared[sid] = retreatOptions.retreatDestinationSectorId;
    }

    const playerUnits = aliveUnits.filter((u) => u.ownerId === activeGroup.ownerId);
    const allRetreating = playerUnits.every((u) => !!activeCombat.retreatDeclared[u.id]);
    if (allRetreating) {
      activeCombat.retreatAttemptedPlayerIds = activeCombat.retreatAttemptedPlayerIds || [];
      if (!activeCombat.retreatAttemptedPlayerIds.includes(activeGroup.ownerId)) {
        activeCombat.retreatAttemptedPlayerIds.push(activeGroup.ownerId);
      }
    }

    activeCombat.roundActedGroupKeys = activeCombat.roundActedGroupKeys || [];
    if (!activeCombat.roundActedGroupKeys.includes(activeGroup.groupKey)) {
      activeCombat.roundActedGroupKeys.push(activeGroup.groupKey);
    }

    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: false,
      declaredRetreat: {
        shipIds: activeGroup.shipIds,
        destinationSectorId: retreatOptions.retreatDestinationSectorId,
        ownerId: activeGroup.ownerId,
      },
    };
  }

  // Check 2: Was retreat declared for this ship type in a previous round?
  const retreatingShips = activeGroup.ships.filter((s) => activeCombat.retreatDeclared && activeCombat.retreatDeclared[s.id]);
  if (retreatingShips.length > 0) {
    const destSecId = activeCombat.retreatDeclared[retreatingShips[0]!.id]!;
    const retreatingIds = retreatingShips.map((s) => s.id);
    const remainingUnits = units.filter((u) => !retreatingIds.includes(u.id));
    const remainingAlive = remainingUnits.filter((u) => u.currentDamage < u.maxHull);
    const remainingOwners = Array.from(new Set(remainingAlive.map((u) => u.ownerId)));

    const completedRetreats = retreatingShips.map((s) => ({
      shipId: s.id,
      ownerId: s.ownerId,
      destinationSectorId: destSecId,
    }));

    return {
      updatedUnits: remainingUnits,
      rolls: [],
      isCombatOver: remainingOwners.length <= 1,
      winnerOwnerId: remainingOwners.length === 1 ? remainingOwners[0] : undefined,
      completedRetreat: completedRetreats[0],
      completedRetreats,
    };
  }

  // Choose eligible enemy target
  const enemyTargets = aliveUnits.filter((u) => u.ownerId !== activeGroup.ownerId);
  if (enemyTargets.length === 0) {
    activeCombat.roundActedGroupKeys = activeCombat.roundActedGroupKeys || [];
    if (!activeCombat.roundActedGroupKeys.includes(activeGroup.groupKey)) {
      activeCombat.roundActedGroupKeys.push(activeGroup.groupKey);
    }

    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: activeGroup.ownerId,
    };
  }

  // Roll non-missile cannons for all ships in activeGroup
  const salvoRolls: CombatRoll[] = [];
  for (const ship of activeGroup.ships) {
    const cannonWeapons = ship.weapons.filter((w) => !w.isMissile);
    for (const weapon of cannonWeapons) {
      for (let i = 0; i < weapon.count; i++) {
        if (weapon.color === 'purple') {
          const res = rollPurpleDie();
          salvoRolls.push({
            shipId: ship.id,
            shipOwner: activeGroup.ownerId,
            dieColor: 'purple',
            roll: res.rawRoll,
            modifiedRoll: res.rawRoll,
            isHit: res.isHit,
            damage: res.targetDamage,
            selfDamage: res.selfDamage,
            symbol: res.symbol,
            isMissile: false,
          });
        } else {
          const raw = rollD6();
          const canHitAny =
            enemyTargets.length === 0 ||
            enemyTargets.some((t) => raw + activeGroup.computerBonus - t.shieldBonus >= 6);
          const isHit = raw === 6 || (raw !== 1 && canHitAny);
          salvoRolls.push({
            shipId: ship.id,
            shipOwner: activeGroup.ownerId,
            dieColor: weapon.color,
            roll: raw,
            modifiedRoll: raw + activeGroup.computerBonus,
            isHit,
            damage: weapon.damage,
            isMissile: false,
          });
        }
      }
    }
  }

  // Check manual assignment requirement
  const isPlayerAttacker = activeGroup.ownerId.startsWith('player_');
  if (autoAssign === false && isPlayerAttacker) {
    activeCombat.pendingDamageAssignment = {
      attackerOwnerId: activeGroup.ownerId,
      attackerShipType: activeGroup.type,
      attackerShipIds: activeGroup.shipIds,
      computerBonus: activeGroup.computerBonus,
      rolls: salvoRolls,
      isMissile: false,
      hasAntimatterSplitter: activeGroup.hasAntimatterSplitter,
    };
    activeCombat.lastRolls = salvoRolls;
    return {
      updatedUnits: units,
      rolls: salvoRolls,
      isCombatOver: false,
      isPendingAssignment: true,
    };
  }

  // Auto-assign salvo damage
  autoAssignSalvoDamage(salvoRolls, activeGroup, enemyTargets, activeCombat, units);
  activeCombat.lastRolls = salvoRolls;

  activeCombat.roundActedGroupKeys = activeCombat.roundActedGroupKeys || [];
  if (!activeCombat.roundActedGroupKeys.includes(activeGroup.groupKey)) {
    activeCombat.roundActedGroupKeys.push(activeGroup.groupKey);
  }

  // Check round completion
  const survivingAlive = aliveUnits.filter((u) => u.currentDamage < u.maxHull);
  const remainingGroups = getCombatShipTypeGroups(survivingAlive, effectiveDefenderId);
  const remainingPending = remainingGroups.filter(
    (g) => !activeCombat.roundActedGroupKeys!.includes(g.groupKey)
  );
  if (remainingPending.length === 0) {
    activeCombat.roundNumber += 1;
    activeCombat.roundActedGroupKeys = [];
    for (const u of survivingAlive) {
      if (u.hasMorphShield && u.currentDamage > 0 && u.currentDamage < u.maxHull) {
        u.currentDamage = Math.max(0, u.currentDamage - 1);
      }
    }
  }

  const remainingOwners = Array.from(
    new Set(aliveUnits.filter((u) => u.currentDamage < u.maxHull).map((u) => u.ownerId))
  );

  return {
    updatedUnits: units,
    rolls: salvoRolls,
    isCombatOver: remainingOwners.length <= 1,
    winnerOwnerId: remainingOwners.length === 1 ? remainingOwners[0] : undefined,
  };
}

