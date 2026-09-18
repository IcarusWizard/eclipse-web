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

export function getSectorDefenderOwnerId(sector: SectorTile): string | undefined {
  if (sector.ancientsCount > 0 || sector.ships.some((s) => s.ownerId === 'ancient' || s.type === 'ancient')) {
    return 'ancient';
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
  declaredRetreat?: {
    shipIds: string[];
    destinationSectorId: string;
    ownerId: string;
  };
}

export function executeCombatStep(
  units: CombatUnit[],
  activeCombat: CombatState,
  retreatOptions?: {
    retreatShipIds?: string[];
    retreatDestinationSectorId?: string;
  },
  defenderOwnerId?: string
): CombatStepResult {
  const rolls: CombatRoll[] = [];
  const aliveUnits = sortUnitsByInitiative(
    units.filter((u) => u.currentDamage < u.maxHull),
    defenderOwnerId || activeCombat.defenderOwnerId
  );

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

  // Check 1: Did the user declare retreat this step for this ship / type?
  if (
    retreatOptions?.retreatShipIds &&
    retreatOptions.retreatShipIds.length > 0 &&
    retreatOptions.retreatDestinationSectorId
  ) {
    activeCombat.retreatDeclared = activeCombat.retreatDeclared || {};
    for (const sid of retreatOptions.retreatShipIds) {
      activeCombat.retreatDeclared[sid] = retreatOptions.retreatDestinationSectorId;
    }

    // Check if ALL remaining ships of this player attempted retreat (retreat penalty applies)
    const playerUnits = aliveUnits.filter((u) => u.ownerId === attacker.ownerId);
    const allRetreating = playerUnits.every((u) => !!activeCombat.retreatDeclared[u.id]);
    if (allRetreating) {
      activeCombat.retreatAttemptedPlayerIds = activeCombat.retreatAttemptedPlayerIds || [];
      if (!activeCombat.retreatAttemptedPlayerIds.includes(attacker.ownerId)) {
        activeCombat.retreatAttemptedPlayerIds.push(attacker.ownerId);
      }
    }

    return {
      updatedUnits: units,
      rolls: [],
      isCombatOver: false,
      declaredRetreat: {
        shipIds: retreatOptions.retreatShipIds,
        destinationSectorId: retreatOptions.retreatDestinationSectorId,
        ownerId: attacker.ownerId,
      },
    };
  }

  // Check 2: Was retreat already declared for this ship in a previous activation?
  // If so, on this activation, the ship completes its retreat into the destination sector!
  if (activeCombat.retreatDeclared && activeCombat.retreatDeclared[attacker.id]) {
    const destSecId = activeCombat.retreatDeclared[attacker.id]!;
    // Remove this unit from alive units in this battle
    const remainingUnits = units.filter((u) => u.id !== attacker.id);
    const remainingAlive = remainingUnits.filter((u) => u.currentDamage < u.maxHull);
    const remainingOwners = Array.from(new Set(remainingAlive.map((u) => u.ownerId)));

    return {
      updatedUnits: remainingUnits,
      rolls: [],
      isCombatOver: remainingOwners.length <= 1,
      winnerOwnerId: remainingOwners.length === 1 ? remainingOwners[0] : undefined,
      completedRetreat: {
        shipId: attacker.id,
        ownerId: attacker.ownerId,
        destinationSectorId: destSecId,
      },
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

  activeCombat.destroyedShips = activeCombat.destroyedShips || [];

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

      if (target.currentDamage >= target.maxHull) {
        // Record destroyed ship casualty with killer info
        activeCombat.destroyedShips.push({
          shipId: target.id,
          type: target.type,
          ownerId: target.ownerId,
          killerId: attacker.ownerId,
        });
      }

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
