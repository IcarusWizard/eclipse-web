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
  orbital: 10,
};

export function countPlayerShips(sectors: SectorTile[], playerId: string): Record<ShipType, number> {
  const counts: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
    orbital: 0,
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

export function getRemainingShipSupply(sectors: SectorTile[], playerId: string, factionId?: string): Record<ShipType, number> {
  const built = countPlayerShips(sectors, playerId);
  return {
    interceptor: Math.max(0, SHIP_LIMITS.interceptor - built.interceptor),
    cruiser: Math.max(0, SHIP_LIMITS.cruiser - built.cruiser),
    dreadnought: factionId === 'rho_indi_syndicate' ? 0 : Math.max(0, SHIP_LIMITS.dreadnought - built.dreadnought),
    starbase: factionId === 'the_exiles' ? 0 : Math.max(0, SHIP_LIMITS.starbase - built.starbase),
    orbital: Math.max(0, SHIP_LIMITS.orbital - built.orbital),
  };
}

export function calculateBlueprintStats(blueprint: ShipBlueprint): BlueprintValidationResult {
  let totalPowerProduced = blueprint.preprintedPower ?? 0;
  let totalPowerConsumed = 0;
  let bonusHull = 0;
  let bonusInitiative = 0;
  let totalDriveSpeed = 0;
  let computerBonus = blueprint.preprintedComputer ?? 0;
  let shieldBonus = blueprint.preprintedShield ?? 0;
  let hasJumpDrive = false;
  let hasMorphShield = false;
  const errors: string[] = [];

  for (const part of blueprint.slots) {
    if (!part) continue;
    if (blueprint.noDrives && (part.category === 'drive' || Boolean(part.driveSpeed) || part.id === 'jump_drive' || Boolean(part.isJumpDrive))) {
      errors.push(`${blueprint.type.toUpperCase()} cannot equip Drive Ship Parts.`);
    }
    totalPowerProduced += part.powerProduced;
    totalPowerConsumed += part.powerConsumed;
    bonusHull += part.hullBonus;
    bonusInitiative += part.initiativeBonus;
    if (part.driveSpeed) {
      totalDriveSpeed += part.driveSpeed;
    }
    if (part.id === 'jump_drive' || part.isJumpDrive) {
      hasJumpDrive = true;
    }
    if (part.id === 'morph_shield' || part.morphShield) {
      hasMorphShield = true;
    }
    computerBonus += part.computerBonus;
    shieldBonus += part.shieldBonus;
  }

  // Base hull: in Eclipse, all standard ships have a base damage capacity of 1.
  // Modules like Exiles Orbital chassis specify preprintedHull (2 HP outside slots).
  const baseHull = blueprint.preprintedHull !== undefined ? blueprint.preprintedHull : 1;
  const totalHull = baseHull + bonusHull;
  const totalInitiative = blueprint.baseInitiative + bonusInitiative;

  // Validation Rules:
  // 1. Power Balance: Total power produced must be >= total power consumed
  if (totalPowerProduced < totalPowerConsumed) {
    errors.push(
      `Insufficient power: consuming ${totalPowerConsumed} energy, but producing only ${totalPowerProduced}.`
    );
  }

  // 2. Drive requirement: Interceptor, Cruiser, and Dreadnought MUST have at least 1 drive (or Jump Drive).
  // Starbases and Orbitals cannot move and do not require drives.
  if (blueprint.type !== 'starbase' && blueprint.type !== 'orbital' && totalDriveSpeed <= 0 && !hasJumpDrive) {
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
    hasJumpDrive,
    hasMorphShield,
    errors,
  };
}

export function isShipBlueprintValid(blueprint: ShipBlueprint): boolean {
  return calculateBlueprintStats(blueprint).isValid;
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
      preprintedPower: 3,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.hull,
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
            SHIP_PARTS.nuclear_drive,
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
            SHIP_PARTS.nuclear_drive,
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
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 3,
          preprintedPower: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
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
          preprintedPower: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
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
          preprintedPower: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
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
          preprintedPower: 2, // 2 preprinted power balances Ion Cannon (1) + Nuclear Drive (1)
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.nuclear_drive,
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
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
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
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 5, // +1 increased initiative
          baseBuildCost: 3,
          preprintedPower: 3,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.gauss_shield,
            SHIP_PARTS.hull,
            null,
          ],
        },
      };

    case 'the_exiles':
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
        orbital: {
          type: 'orbital',
          maxSlots: 3,
          baseInitiative: 0,
          baseBuildCost: 5,
          preprintedPower: 4,
          preprintedHull: 2,
          noDrives: true,
          slots: [
            SHIP_PARTS.hull,
            SHIP_PARTS.ion_turret,
            SHIP_PARTS.electron_computer,
          ],
        },
      };

    case 'rho_indi_syndicate':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 3, // +1 increased initiative bonus (3 before drive; +1 nuclear drive = 4 total in combat)
          baseBuildCost: 4,  // Increased build cost 4 (instead of 3)
          preprintedShield: 1, // Preprinted Gauss Shield (-1 to opponent hit rolls)
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
          baseInitiative: 2, // +1 increased initiative bonus (2 before drive; +1 nuclear drive = 3 total in combat)
          baseBuildCost: 6,  // Increased build cost 6 (instead of 5)
          preprintedShield: 1, // Preprinted Gauss Shield (-1 to opponent hit rolls)
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
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
          baseBuildCost: 4,  // Increased build cost 4 (instead of 3)
          preprintedPower: 3,
          preprintedShield: 1, // Preprinted Gauss Shield (-1 to opponent hit rolls)
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            null,
          ],
        },
      };

    case 'wardens_of_magellan':
    case 'enlightened_of_lyra':
    default:
      return createDefaultHumanBlueprints();
  }
}
