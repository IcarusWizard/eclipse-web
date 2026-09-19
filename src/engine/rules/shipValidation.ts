/**
 * Ship Blueprint Validation and Stat Calculation
 */

import { ShipBlueprint, BlueprintValidationResult } from '../types/blueprints';
import { SHIP_PARTS } from './partData';
import { SectorTile, ShipType } from '../types/galaxy';

export const SHIP_LIMITS: Record<ShipType, number> = {
  interceptor: 8,
  cruiser: 4,
  dreadnought: 2,
  starbase: 4,
};

export function countPlayerShips(sectors: SectorTile[], playerId: string): Record<ShipType, number> {
  const counts: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
  };
  for (const s of sectors) {
    for (const ship of s.ships) {
      if (ship.ownerId === playerId && ship.type in counts) {
        counts[ship.type as ShipType]++;
      }
    }
  }
  return counts;
}

export function getRemainingShipSupply(sectors: SectorTile[], playerId: string): Record<ShipType, number> {
  const built = countPlayerShips(sectors, playerId);
  return {
    interceptor: Math.max(0, SHIP_LIMITS.interceptor - built.interceptor),
    cruiser: Math.max(0, SHIP_LIMITS.cruiser - built.cruiser),
    dreadnought: Math.max(0, SHIP_LIMITS.dreadnought - built.dreadnought),
    starbase: Math.max(0, SHIP_LIMITS.starbase - built.starbase),
  };
}

export function calculateBlueprintStats(blueprint: ShipBlueprint): BlueprintValidationResult {
  let totalPowerProduced = blueprint.preprintedPower ?? 0;
  let totalPowerConsumed = 0;
  let bonusHull = 0;
  let bonusInitiative = 0;
  let totalDriveSpeed = 0;
  let computerBonus = blueprint.preprintedComputer ?? 0;
  let shieldBonus = 0;
  const errors: string[] = [];

  for (const part of blueprint.slots) {
    if (!part) continue;
    totalPowerProduced += part.powerProduced;
    totalPowerConsumed += part.powerConsumed;
    bonusHull += part.hullBonus;
    bonusInitiative += part.initiativeBonus;
    if (part.driveSpeed) {
      totalDriveSpeed += part.driveSpeed;
    }
    computerBonus += part.computerBonus;
    shieldBonus += part.shieldBonus;
  }

  // Base hull: in Eclipse, all ships have a base damage capacity of 1 (destroyed with 1 hit if no hull).
  // Each Hull component adds +1 damage capacity (e.g. Interceptor 1 HP, Cruiser 2 HP, Dreadnought 3 HP).
  const baseHull = 1;
  const totalHull = baseHull + bonusHull;
  const totalInitiative = blueprint.baseInitiative + bonusInitiative;

  // Validation Rules:
  // 1. Power Balance: Total power produced must be >= total power consumed
  if (totalPowerProduced < totalPowerConsumed) {
    errors.push(
      `Insufficient power: consuming ${totalPowerConsumed} energy, but producing only ${totalPowerProduced}.`
    );
  }

  // 2. Drive requirement: Interceptor, Cruiser, and Dreadnought MUST have at least 1 drive
  if (blueprint.type !== 'starbase' && totalDriveSpeed <= 0) {
    errors.push(`${blueprint.type.toUpperCase()} must have at least one drive to move.`);
  }

  return {
    isValid: errors.length === 0,
    totalPowerProduced,
    totalPowerConsumed,
    totalHull,
    totalInitiative,
    totalDriveSpeed,
    computerBonus,
    shieldBonus,
    errors,
  };
}

export function createDefaultHumanBlueprints(): Record<string, ShipBlueprint> {
  return {
    interceptor: {
      type: 'interceptor',
      maxSlots: 4,
      baseInitiative: 2,
      baseBuildCost: 3,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.nuclear_source,
        SHIP_PARTS.nuclear_drive,
        null,
      ],
    },
    cruiser: {
      type: 'cruiser',
      maxSlots: 6,
      baseInitiative: 1,
      baseBuildCost: 5,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.nuclear_source,
        SHIP_PARTS.nuclear_drive,
        null,
      ],
    },
    dreadnought: {
      type: 'dreadnought',
      maxSlots: 8,
      baseInitiative: 0,
      baseBuildCost: 8,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.hull,
        SHIP_PARTS.nuclear_source,
        SHIP_PARTS.nuclear_drive,
        null,
      ],
    },
    starbase: {
      type: 'starbase',
      maxSlots: 5,
      baseInitiative: 4,
      baseBuildCost: 3,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.nuclear_source,
        null,
      ],
    },
  };
}

export function createFactionBlueprints(factionId: string): Record<string, ShipBlueprint> {
  switch (factionId) {
    case 'eridani_empire':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 2,
          baseBuildCost: 3,
          preprintedPower: 1,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 1,
          baseBuildCost: 5,
          preprintedPower: 1,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 8,
          baseInitiative: 0,
          baseBuildCost: 8,
          preprintedPower: 1,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            null,
          ],
        },
      };

    case 'planta':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 3,
          baseInitiative: 1,
          baseBuildCost: 3,
          preprintedComputer: 1,
          preprintedPower: 2,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 5,
          baseInitiative: 0,
          baseBuildCost: 5,
          preprintedComputer: 1,
          preprintedPower: 2,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 7,
          baseInitiative: -1,
          baseBuildCost: 8,
          preprintedComputer: 1,
          preprintedPower: 2,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 4,
          baseInitiative: 3,
          baseBuildCost: 3,
          preprintedComputer: 1,
          preprintedPower: 5,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.hull,
            null,
            null,
          ],
        },
      };

    case 'descendants_of_draco':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 2,
          baseBuildCost: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 1,
          baseBuildCost: 5,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 8,
          baseInitiative: 0,
          baseBuildCost: 8,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.fusion_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            null,
          ],
        },
      };

    case 'mechanema':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 2,
          baseBuildCost: 2, // 2 materials
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 1,
          baseBuildCost: 4, // 4 materials
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 8,
          baseInitiative: 0,
          baseBuildCost: 7, // 7 materials
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 2, // 2 materials
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            null,
          ],
        },
      };

    case 'orion_hegemony':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 3, // +1 increased initiative
          baseBuildCost: 3,
          preprintedPower: 1, // +1 preprinted power
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 2, // +1 increased initiative
          baseBuildCost: 5,
          preprintedPower: 2, // +2 preprinted power
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 8,
          baseInitiative: 1, // +1 increased initiative
          baseBuildCost: 8,
          preprintedPower: 3, // +3 preprinted power
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 5, // +1 increased initiative
          baseBuildCost: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            null,
          ],
        },
      };

    default:
      return createDefaultHumanBlueprints();
  }
}
