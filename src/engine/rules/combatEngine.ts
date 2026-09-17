/**
 * Combat Engine: Initiative Queue, Missiles, Dice Rolls, Damage Allocation, and Reputation
 */

import { CombatRoll, CombatState } from '../types/state';
import { SectorShip, SectorTile } from '../types/galaxy';
import { PlayerState } from '../types/player';
import { calculateBlueprintStats } from './shipValidation';

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
    color: 'yellow' | 'orange' | 'blue' | 'red';
    damage: number;
    count: number;
    isMissile?: boolean;
  }[];
}

export function buildCombatUnitsForSector(
  sector: SectorTile,
  players: PlayerState[]
): CombatUnit[] {
  const units: CombatUnit[] = [];

  for (const ship of sector.ships) {
    if (ship.type === 'ancient') {
      units.push({
        id: ship.id,
        ownerId: 'ancient',
        type: 'ancient',
        initiative: 2,
        maxHull: 2,
        currentDamage: ship.damage,
        computerBonus: 1,
        shieldBonus: 0,
        weapons: [{ color: 'yellow', damage: 1, count: 2 }],
      });
    } else if (ship.type === 'gcds') {
      units.push({
        id: ship.id,
        ownerId: 'gcds',
        type: 'gcds',
        initiative: 0,
        maxHull: 7,
        currentDamage: ship.damage,
        computerBonus: 2,
        shieldBonus: 0,
        weapons: [{ color: 'orange', damage: 2, count: 4 }],
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
      });
    }
  }

  return units;
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function executeCombatStep(
  units: CombatUnit[],
  activeCombat: CombatState
): {
  updatedUnits: CombatUnit[];
  rolls: CombatRoll[];
  isCombatOver: boolean;
  winnerOwnerId?: string;
} {
  const rolls: CombatRoll[] = [];
  const aliveUnits = units.filter((u) => u.currentDamage < u.maxHull);

  // Group alive units by owner
  const owners = Array.from(new Set(aliveUnits.map((u) => u.ownerId)));
  if (owners.length <= 1) {
    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: owners[0],
    };
  }

  // Sort units by initiative descending
  aliveUnits.sort((a, b) => b.initiative - a.initiative);

  // Pick the current attacking unit based on initiative order
  const unitIndex = activeCombat.currentTurnIndex % aliveUnits.length;
  const attacker = aliveUnits[unitIndex];

  if (!attacker) {
    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: owners[0],
    };
  }

  // Choose eligible enemy target
  const enemyTargets = aliveUnits.filter((u) => u.ownerId !== attacker.ownerId);
  if (enemyTargets.length === 0) {
    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: true,
      winnerOwnerId: attacker.ownerId,
    };
  }

  // Target selection: pick lowest remaining health first to score kills
  enemyTargets.sort(
    (a, b) => a.maxHull - a.currentDamage - (b.maxHull - b.currentDamage)
  );
  let target = enemyTargets[0]!;

  // Fire weapons
  for (const weapon of attacker.weapons) {
    for (let i = 0; i < weapon.count; i++) {
      if (target.currentDamage >= target.maxHull) {
        // Find next target if current is destroyed
        const nextTarget = enemyTargets.find((u) => u.currentDamage < u.maxHull);
        if (!nextTarget) break;
        target = nextTarget;
      }

      const rawRoll = rollD6();
      const modified = rawRoll + attacker.computerBonus - target.shieldBonus;

      // Natural 6 always hits, Natural 1 always misses
      let isHit = false;
      if (rawRoll === 6) {
        isHit = true;
      } else if (rawRoll === 1) {
        isHit = false;
      } else {
        isHit = modified >= 6;
      }

      const damageDealt = isHit ? weapon.damage : 0;
      target.currentDamage += damageDealt;

      rolls.push({
        shipId: attacker.id,
        shipOwner: attacker.ownerId,
        dieColor: weapon.color,
        roll: rawRoll,
        modifiedRoll: modified,
        isHit,
        damage: damageDealt,
      });
    }
  }

  const remainingOwners = Array.from(
    new Set(aliveUnits.filter((u) => u.currentDamage < u.maxHull).map((u) => u.ownerId))
  );

  return {
    updatedUnits: units,
    rolls,
    isCombatOver: remainingOwners.length <= 1,
    winnerOwnerId: remainingOwners.length === 1 ? remainingOwners[0] : undefined,
  };
}
