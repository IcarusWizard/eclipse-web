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
}

export function buildCombatUnitsForSector(
  sector: SectorTile,
  players: PlayerState[],
  filterOwnerIds?: string[],
  neutralShipBlueprints?: Partial<NeutralShipConfig>
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
      const stats = calculateBlueprintStats(bp);

      const weapons: CombatUnit['weapons'] = [];
      for (const slot of bp.slots) {
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

      const hasMorphShield = bp.slots.some((s) => s?.id === 'morph_shield' || s?.morphShield);

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
  dreadnought: 4,
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
      });
    } else {
      const g = groupMap.get(key)!;
      g.shipIds.push(u.id);
      g.ships.push(u);
      for (const w of u.weapons) {
        g.weapons.push({ ...w });
      }
      if (u.hasMorphShield) g.hasMorphShield = true;
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

export function autoAssignSalvoDamage(
  rolls: CombatRoll[],
  activeGroup: CombatShipGroup,
  enemyTargets: CombatUnit[],
  activeCombat: CombatState,
  allUnits: CombatUnit[]
): void {
  const isNpc = !activeGroup.ownerId.startsWith('player_');

  for (const r of rolls) {
    if (r.dieColor === 'purple') {
      if (r.selfDamage && r.selfDamage > 0) {
        applyRiftSelfDamage(allUnits, activeGroup.ownerId, r.selfDamage, activeCombat);
      }
    }

    const aliveTargets = enemyTargets.filter((u) => u.currentDamage < u.maxHull);
    if (aliveTargets.length === 0) {
      if (enemyTargets.length > 0) {
        r.targetShipId = enemyTargets[0]!.id;
      }
      continue;
    }

    // Sort target candidates
    const candidates = [...aliveTargets].sort((a, b) => {
      const hpA = a.maxHull - a.currentDamage;
      const hpB = b.maxHull - b.currentDamage;
      const rankA = SHIP_SIZE_RANK[a.type] ?? 0;
      const rankB = SHIP_SIZE_RANK[b.type] ?? 0;

      if (isNpc) {
        // Official NPC rule (p. 19): destroy largest to smallest; if none destroyed, max damage largest to smallest
        if (rankB !== rankA) return rankB - rankA;
        return hpA - hpB;
      } else {
        // Player default auto-assign: destroy ships first (lowest remaining HP first to kill), else largest rank
        if (hpA !== hpB) return hpA - hpB;
        return rankB - rankA;
      }
    });

    let chosenTarget: CombatUnit | null = null;
    for (const cand of candidates) {
      if (r.dieColor === 'purple') {
        if (r.damage > 0) chosenTarget = cand;
        break;
      }
      let isHit = false;
      if (r.roll === 6) isHit = true;
      else if (r.roll === 1) isHit = false;
      else isHit = r.roll + activeGroup.computerBonus - cand.shieldBonus >= 6;

      if (isHit) {
        chosenTarget = cand;
        break;
      }
    }

    if (!chosenTarget) {
      chosenTarget = candidates[0]!;
    }

    r.targetShipId = chosenTarget.id;
    if (r.dieColor === 'purple') {
      r.isHit = r.damage > 0;
      r.modifiedRoll = r.roll;
      if (r.isHit) {
        chosenTarget.currentDamage += r.damage;
      }
    } else {
      const modified = r.roll + activeGroup.computerBonus - chosenTarget.shieldBonus;
      r.modifiedRoll = modified;
      if (r.roll === 6) r.isHit = true;
      else if (r.roll === 1) r.isHit = false;
      else r.isHit = modified >= 6;

      if (r.isHit) {
        chosenTarget.currentDamage += r.damage;
      }
    }

    if (chosenTarget.currentDamage >= chosenTarget.maxHull) {
      activeCombat.destroyedShips = activeCombat.destroyedShips || [];
      if (!activeCombat.destroyedShips.some((d) => d.shipId === chosenTarget!.id)) {
        activeCombat.destroyedShips.push({
          shipId: chosenTarget.id,
          type: chosenTarget.type,
          ownerId: chosenTarget.ownerId,
          killerId: activeGroup.ownerId,
        });
      }
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
    const targetShipId = assign?.targetShipId;
    const target = targetShipId ? enemyTargets.find((u) => u.id === targetShipId) : null;

    if (roll.dieColor === 'purple') {
      if (roll.selfDamage && roll.selfDamage > 0) {
        applyRiftSelfDamage(allUnits, pendingSalvo.attackerOwnerId, roll.selfDamage, activeCombat);
      }
      if (target) {
        roll.targetShipId = target.id;
        roll.isHit = roll.damage > 0;
        if (roll.isHit) {
          target.currentDamage += roll.damage;
          if (target.currentDamage >= target.maxHull) {
            activeCombat.destroyedShips = activeCombat.destroyedShips || [];
            if (!activeCombat.destroyedShips.some((d) => d.shipId === target.id)) {
              activeCombat.destroyedShips.push({
                shipId: target.id,
                type: target.type,
                ownerId: target.ownerId,
                killerId: pendingSalvo.attackerOwnerId,
              });
            }
          }
        }
      }
    } else {
      if (target) {
        roll.targetShipId = target.id;
        const modified = roll.roll + pendingSalvo.computerBonus - target.shieldBonus;
        roll.modifiedRoll = modified;
        if (roll.roll === 6) roll.isHit = true;
        else if (roll.roll === 1) roll.isHit = false;
        else roll.isHit = modified >= 6;

        if (roll.isHit) {
          target.currentDamage += roll.damage;
          if (target.currentDamage >= target.maxHull) {
            activeCombat.destroyedShips = activeCombat.destroyedShips || [];
            if (!activeCombat.destroyedShips.some((d) => d.shipId === target.id)) {
              activeCombat.destroyedShips.push({
                shipId: target.id,
                type: target.type,
                ownerId: target.ownerId,
                killerId: pendingSalvo.attackerOwnerId,
              });
            }
          }
        }
      } else {
        roll.isHit = false;
      }
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

      const groups = getCombatShipTypeGroups(remainingAlive, effectiveDefenderId);
      const unitIndex = activeCombat.currentTurnIndex % (groups.length || 1);
      if (unitIndex + 1 >= groups.length) {
        activeCombat.roundNumber += 1;
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
              });
            } else {
              const raw = rollD6();
              salvoRolls.push({
                shipId: ship.id,
                shipOwner: activeGroup.ownerId,
                dieColor: weapon.color,
                roll: raw,
                modifiedRoll: raw + activeGroup.computerBonus,
                isHit: raw === 6,
                damage: weapon.damage,
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

  const groupIndex = activeCombat.currentTurnIndex % groups.length;
  const activeGroup = groups[groupIndex];

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
          });
        } else {
          const raw = rollD6();
          salvoRolls.push({
            shipId: ship.id,
            shipOwner: activeGroup.ownerId,
            dieColor: weapon.color,
            roll: raw,
            modifiedRoll: raw + activeGroup.computerBonus,
            isHit: raw === 6,
            damage: weapon.damage,
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

  // Check round completion
  if (groupIndex + 1 >= groups.length) {
    activeCombat.roundNumber += 1;
    for (const u of aliveUnits) {
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

