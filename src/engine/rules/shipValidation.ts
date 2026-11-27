/**
 * Ship Blueprint Validation and Stat Calculation
 */

import { ShipBlueprint, ShipPart, BlueprintValidationResult } from '../types/blueprints';
import { SHIP_PARTS, ALL_ANCIENT_PART_IDS, getEffectiveShipPart, getShiftPortResolvedPart } from './partData';
import { SectorTile, ShipType } from '../types/galaxy';
import type { PlayerState } from '../types/player';
import type { NeutralShipConfig, NeutralShipVariant } from './neutralShips';

export const SHIP_LIMITS: Record<ShipType, number> = {
  interceptor: 8,
  cruiser: 4,
  dreadnought: 2,
  starbase: 4,
  orbital: 10,
  ancient: 0,
};

export function countPlayerShips(sectors: SectorTile[], playerId: string): Record<ShipType, number> {
  const counts: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
    orbital: 0,
    ancient: 0,
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
    cruiser: factionId === 'children_of_light' ? 0 : Math.max(0, SHIP_LIMITS.cruiser - built.cruiser),
    dreadnought: factionId === 'rho_indi_syndicate' ? 0 : Math.max(0, SHIP_LIMITS.dreadnought - built.dreadnought),
    starbase: factionId === 'the_exiles' ? 0 : Math.max(0, SHIP_LIMITS.starbase - built.starbase),
    orbital: Math.max(0, SHIP_LIMITS.orbital - built.orbital),
    ancient: 0,
  };
}

export function calculateBlueprintStats(
  blueprint: ShipBlueprint,
  activeExpansions?: string[]
): BlueprintValidationResult {
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

  const expansions = activeExpansions || blueprint.activeExpansions;

  for (const rawPart of blueprint.slots) {
    if (!rawPart) continue;
    const part = getEffectiveShipPart(rawPart, expansions);
    if (part.id === 'muon_source') {
      errors.push('Muon Source must be placed outside the blueprint grid, not in a standard slot.');
    }
    if ((blueprint.noDrives || blueprint.type === 'starbase' || blueprint.type === 'orbital') && (part.category === 'drive' || Boolean(part.driveSpeed) || part.id === 'jump_drive' || Boolean(part.isJumpDrive))) {
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

  if (blueprint.externalParts) {
    for (const rawPart of blueprint.externalParts) {
      if (!rawPart) continue;
      const part = getEffectiveShipPart(rawPart, expansions);
      if (part.id !== 'muon_source') {
        errors.push(`${part.name} cannot be placed outside the blueprint grid.`);
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
  // Starbases, Orbitals, and Children of Light Ancients do not require drives (Ancients with 0 Drive cannot move).
  if (blueprint.type !== 'starbase' && blueprint.type !== 'orbital' && blueprint.type !== 'ancient' && totalDriveSpeed <= 0 && !hasJumpDrive) {
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

export function getShiftPortSlotIndex(blueprint?: ShipBlueprint | null): number {
  if (!blueprint) return -1;
  return blueprint.slots.findIndex((s) => s?.id === 'shift_port');
}

export function canBlueprintPowerShiftMode(
  blueprint: ShipBlueprint,
  mode: 'cannon' | 'computer' | 'hull',
  phase2: boolean,
  activeExpansions?: string[]
): { allowed: boolean; sparePower: number; requiredPower: number; part: ShipPart } {
  const stats = calculateBlueprintStats(blueprint, activeExpansions);
  const sparePower = Math.max(0, stats.totalPowerProduced - stats.totalPowerConsumed);
  const part = getShiftPortResolvedPart(mode, phase2);
  return {
    allowed: sparePower >= part.powerConsumed,
    sparePower,
    requiredPower: part.powerConsumed,
    part,
  };
}

export function isShipBlueprintValid(blueprint: ShipBlueprint, activeExpansions?: string[]): boolean {
  return calculateBlueprintStats(blueprint, activeExpansions).isValid;
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

export function createChildrenAncientBlueprint(
  variant: NeutralShipVariant = 'default'
): ShipBlueprint {
  if (variant === 'advanced') {
    return {
      type: 'ancient',
      maxSlots: 5,
      baseInitiative: 0,
      baseBuildCost: 0,
      preprintedPower: 3,
      slots: [
        SHIP_PARTS.plasma_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.hull,
        SHIP_PARTS.nuclear_drive,
      ],
    };
  }
  if (variant === 'expert') {
    return {
      type: 'ancient',
      maxSlots: 5,
      baseInitiative: 2,
      baseBuildCost: 0,
      preprintedPower: 3,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.nuclear_drive,
      ],
    };
  }
  return {
    type: 'ancient',
    maxSlots: 5,
    baseInitiative: 1,
    baseBuildCost: 0,
    preprintedPower: 3,
    slots: [
      SHIP_PARTS.ion_cannon,
      SHIP_PARTS.ion_cannon,
      SHIP_PARTS.hull,
      SHIP_PARTS.electron_computer,
      SHIP_PARTS.nuclear_drive,
    ],
  };
}

export function createFactionBlueprints(
  factionId: string,
  activeExpansions?: string[],
  neutralShipBlueprints?: Partial<NeutralShipConfig>
): Record<string, ShipBlueprint> {
  const bps = getRawFactionBlueprints(factionId, neutralShipBlueprints);
  if (activeExpansions && activeExpansions.length > 0) {
    for (const key of Object.keys(bps)) {
      (bps[key] as any).activeExpansions = activeExpansions;
    }
  }
  return bps;
}

function getRawFactionBlueprints(
  factionId: string,
  neutralShipBlueprints?: Partial<NeutralShipConfig>
): Record<string, ShipBlueprint> {
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
          baseInitiative: 0,
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
          baseInitiative: 0,
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
          baseInitiative: 2,
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
          preprintedPower: 1, // 1 preprinted power (Bug 146)
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_source,
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

    case 'mega_war_inc':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 1, // 1 less than Terran's 2
          baseBuildCost: 2, // 2 Materials instead of 3
          slots: [
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            SHIP_PARTS.ion_cannon,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 1,
          baseBuildCost: 5,
          slots: [
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            SHIP_PARTS.ion_cannon,
            null,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
          ],
        },
        dreadnought: {
          type: 'dreadnought',
          maxSlots: 8,
          baseInitiative: 1, // 2 Initiative total with starting Nuclear Drive (instead of 1)
          baseBuildCost: 8,
          slots: [
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            SHIP_PARTS.ion_cannon,
            null,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.hull,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 3,
          preprintedPower: 3,
          noDrives: true,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.hull,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.hull,
            null,
          ],
        },
      };

    case 'the_horde': {
      const base = createDefaultHumanBlueprints();
      return {
        ...base,
        interceptor: { ...base.interceptor!, baseInitiative: 1 },
        cruiser: { ...base.cruiser!, baseInitiative: 0 },
        dreadnought: { ...base.dreadnought!, baseInitiative: 0 },
        starbase: { ...base.starbase!, baseInitiative: 3 },
      };
    }

    case 'the_spiral':
      return {
        interceptor: {
          type: 'interceptor',
          maxSlots: 4,
          baseInitiative: 2,
          baseBuildCost: 3,
          slots: [
            SHIP_PARTS.shift_port,
            SHIP_PARTS.nuclear_source,
            null,
            SHIP_PARTS.nuclear_drive,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 6,
          baseInitiative: 1,
          baseBuildCost: 5,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.shift_port,
            null,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
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
            SHIP_PARTS.shift_port,
            null,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
          ],
        },
        starbase: {
          type: 'starbase',
          maxSlots: 5,
          baseInitiative: 4,
          baseBuildCost: 3,
          preprintedPower: 3,
          noDrives: true,
          slots: [
            SHIP_PARTS.shift_port,
            SHIP_PARTS.ion_cannon,
            null,
            SHIP_PARTS.hull,
            SHIP_PARTS.hull,
          ],
        },
      };

    case 'heralds_of_ragnarok': {
      const base = createDefaultHumanBlueprints();
      return {
        ...base,
        interceptor: {
          type: 'interceptor',
          maxSlots: 5,
          baseInitiative: 1,
          baseBuildCost: 4,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            SHIP_PARTS.hull,
            null,
          ],
        },
        cruiser: {
          type: 'cruiser',
          maxSlots: 5,
          baseInitiative: 2,
          baseBuildCost: 4,
          slots: [
            SHIP_PARTS.ion_cannon,
            SHIP_PARTS.electron_computer,
            SHIP_PARTS.nuclear_source,
            SHIP_PARTS.nuclear_drive,
            null,
          ],
        },
      };
    }

    case 'kurita_prefecture': {
      const base = createDefaultHumanBlueprints();
      return {
        interceptor: { ...base.interceptor, preprintedComputer: 1 },
        cruiser: { ...base.cruiser, preprintedComputer: 1 },
        dreadnought: { ...base.dreadnought, preprintedComputer: 1 },
        starbase: { ...base.starbase, preprintedComputer: 1, preprintedHull: 1 },
      };
    }

    case 'children_of_light': {
      const base = createDefaultHumanBlueprints();
      const ancientVariant = neutralShipBlueprints?.ancient || 'default';
      return {
        interceptor: { ...base.interceptor },
        dreadnought: { ...base.dreadnought },
        starbase: { ...base.starbase },
        ancient: createChildrenAncientBlueprint(ancientVariant),
      };
    }

    case 'wardens_of_magellan':
    case 'enlightened_of_lyra':
    case 'atlantians':
    default:
      return createDefaultHumanBlueprints();
  }
}

/**
 * Returns all blueprint (shipType, slotIndex) pairs linked to the given slot
 * under Mega War Inc.'s modular chassis architecture:
 * - M0..M3: Interceptor[0..3] === Cruiser[0..3] === Dreadnought[0..3]
 * - M4..M5: Cruiser[4..5] === Dreadnought[4..5]
 * - M6..M7: Dreadnought[6..7] === Starbase[0..1]
 * - M8..M10: Starbase[2..4]
 */
export function getLinkedModularSlots(
  shipType: ShipType,
  slotIndex: number
): { shipType: ShipType; slotIndex: number }[] {
  if (
    (shipType === 'interceptor' || shipType === 'cruiser' || shipType === 'dreadnought') &&
    slotIndex >= 0 &&
    slotIndex <= 3
  ) {
    return [
      { shipType: 'interceptor', slotIndex },
      { shipType: 'cruiser', slotIndex },
      { shipType: 'dreadnought', slotIndex },
    ];
  }
  if ((shipType === 'cruiser' || shipType === 'dreadnought') && slotIndex >= 4 && slotIndex <= 5) {
    return [
      { shipType: 'cruiser', slotIndex },
      { shipType: 'dreadnought', slotIndex },
    ];
  }
  if (shipType === 'dreadnought' && slotIndex >= 6 && slotIndex <= 7) {
    return [
      { shipType: 'dreadnought', slotIndex },
      { shipType: 'starbase', slotIndex: slotIndex - 6 },
    ];
  }
  if (shipType === 'starbase' && slotIndex >= 0 && slotIndex <= 1) {
    return [
      { shipType: 'starbase', slotIndex },
      { shipType: 'dreadnought', slotIndex: slotIndex + 6 },
    ];
  }
  return [{ shipType, slotIndex }];
}

/**
 * Canonical module slot identifier M0..M10 for deduplicating modular upgrade activations.
 */
export function getCanonicalModularSlotKey(shipType: ShipType, slotIndex: number): string {
  if (
    (shipType === 'interceptor' || shipType === 'cruiser' || shipType === 'dreadnought') &&
    slotIndex >= 0 &&
    slotIndex <= 3
  ) {
    return `M${slotIndex}`;
  }
  if ((shipType === 'cruiser' || shipType === 'dreadnought') && slotIndex >= 4 && slotIndex <= 5) {
    return `M${slotIndex}`;
  }
  if (shipType === 'dreadnought' && slotIndex >= 6 && slotIndex <= 7) {
    return `M${slotIndex}`;
  }
  if (shipType === 'starbase' && slotIndex >= 0 && slotIndex <= 1) {
    return `M${slotIndex + 6}`;
  }
  if (shipType === 'starbase' && slotIndex >= 2 && slotIndex <= 4) {
    return `M${slotIndex + 6}`;
  }
  return `${shipType}_${slotIndex}`;
}

export type MegaWarModularGroupId = 'int_cru_dre' | 'cru_dre' | 'dre_sb' | 'sb_only';

export interface MegaWarModularGroupInfo {
  /** 1-based physical strip position (1..11) */
  readonly moduleNumber: number;
  /** Canonical M0..M10 key */
  readonly code: string;
  readonly groupId: MegaWarModularGroupId;
  readonly ships: ShipType[];
  readonly shortLabel: string;
  readonly shortLabelZh: string;
  readonly allowsDrives: boolean;
  /** Tailwind border/tint classes for blueprint slots */
  readonly slotAccentClass: string;
  /** Tailwind pill classes for corner M1..M11 badge */
  readonly badgeClass: string;
}

export interface MegaWarModularSlotSpec {
  readonly moduleIndex: number; // 0..10
  readonly representativeShipType: ShipType;
  readonly representativeSlotIndex: number;
  readonly group: MegaWarModularGroupInfo;
}

const MEGA_WAR_GROUP_STYLE: Record<
  MegaWarModularGroupId,
  Pick<
    MegaWarModularGroupInfo,
    'ships' | 'shortLabel' | 'shortLabelZh' | 'allowsDrives' | 'slotAccentClass' | 'badgeClass'
  >
> = {
  int_cru_dre: {
    ships: ['interceptor', 'cruiser', 'dreadnought'],
    shortLabel: 'INT • CRU • DRE',
    shortLabelZh: '拦 • 巡 • 无',
    allowsDrives: true,
    slotAccentClass: 'border-2 border-amber-400/80 ring-1 ring-amber-400/30',
    badgeClass: 'bg-amber-950/95 text-amber-300 border-amber-500/80',
  },
  cru_dre: {
    ships: ['cruiser', 'dreadnought'],
    shortLabel: 'CRU • DRE',
    shortLabelZh: '巡 • 无',
    allowsDrives: true,
    slotAccentClass: 'border-2 border-orange-500/85 ring-1 ring-orange-500/30',
    badgeClass: 'bg-orange-950/95 text-orange-300 border-orange-500/80',
  },
  dre_sb: {
    ships: ['dreadnought', 'starbase'],
    shortLabel: 'DRE • SB',
    shortLabelZh: '无 • 站',
    allowsDrives: false,
    slotAccentClass: 'border-2 border-fuchsia-500/85 ring-1 ring-fuchsia-500/30',
    badgeClass: 'bg-fuchsia-950/95 text-fuchsia-300 border-fuchsia-500/80',
  },
  sb_only: {
    ships: ['starbase'],
    shortLabel: 'SB ONLY',
    shortLabelZh: '仅基地',
    allowsDrives: false,
    slotAccentClass: 'border-2 border-sky-400/85 ring-1 ring-sky-400/30',
    badgeClass: 'bg-sky-950/95 text-sky-300 border-sky-500/80',
  },
};

/**
 * Returns modular sharing & color-coding metadata for any Mega War Inc. blueprint slot.
 */
export function getMegaWarModularGroupInfo(
  shipType: ShipType,
  slotIndex: number
): MegaWarModularGroupInfo | null {
  let modIdx = -1;
  let groupId: MegaWarModularGroupId | null = null;
  if (
    (shipType === 'interceptor' || shipType === 'cruiser' || shipType === 'dreadnought') &&
    slotIndex >= 0 &&
    slotIndex <= 3
  ) {
    modIdx = slotIndex;
    groupId = 'int_cru_dre';
  } else if ((shipType === 'cruiser' || shipType === 'dreadnought') && slotIndex >= 4 && slotIndex <= 5) {
    modIdx = slotIndex;
    groupId = 'cru_dre';
  } else if (shipType === 'dreadnought' && slotIndex >= 6 && slotIndex <= 7) {
    modIdx = slotIndex;
    groupId = 'dre_sb';
  } else if (shipType === 'starbase' && slotIndex >= 0 && slotIndex <= 1) {
    modIdx = slotIndex + 6;
    groupId = 'dre_sb';
  } else if (shipType === 'starbase' && slotIndex >= 2 && slotIndex <= 4) {
    modIdx = slotIndex + 6;
    groupId = 'sb_only';
  }

  if (modIdx < 0 || !groupId) return null;
  const meta = MEGA_WAR_GROUP_STYLE[groupId];
  return {
    moduleNumber: modIdx + 1,
    code: `M${modIdx + 1}`,
    groupId,
    ...meta,
  };
}

/**
 * Canonical 11-slot physical board strip order (M1..M11 left-to-right) for Mega War Inc.
 */
export const MEGA_WAR_MODULAR_STRIP_SPECS: MegaWarModularSlotSpec[] = [
  ...([0, 1, 2, 3] as const).map((i) => ({
    moduleIndex: i,
    representativeShipType: 'interceptor' as ShipType,
    representativeSlotIndex: i,
    group: getMegaWarModularGroupInfo('interceptor', i)!,
  })),
  ...([4, 5] as const).map((i) => ({
    moduleIndex: i,
    representativeShipType: 'cruiser' as ShipType,
    representativeSlotIndex: i,
    group: getMegaWarModularGroupInfo('cruiser', i)!,
  })),
  ...([6, 7] as const).map((i) => ({
    moduleIndex: i,
    representativeShipType: 'dreadnought' as ShipType,
    representativeSlotIndex: i,
    group: getMegaWarModularGroupInfo('dreadnought', i)!,
  })),
  ...([2, 3, 4] as const).map((sbIdx, offset) => ({
    moduleIndex: 8 + offset,
    representativeShipType: 'starbase' as ShipType,
    representativeSlotIndex: sbIdx,
    group: getMegaWarModularGroupInfo('starbase', sbIdx)!,
  })),
];

export interface MegaWarExternalGroupMeta {
  readonly id: MegaWarModularGroupId;
  readonly colorName: string;
  readonly colorNameZh: string;
  readonly ships: ShipType[];
  readonly shortLabel: string;
  readonly shortLabelZh: string;
  readonly badgeClass: string;
  readonly buttonClass: string;
  readonly extCardClass: string;
}

export const MEGA_WAR_EXTERNAL_GROUPS: MegaWarExternalGroupMeta[] = [
  {
    id: 'int_cru_dre',
    colorName: 'Yellow',
    colorNameZh: '黄区',
    ships: ['interceptor', 'cruiser', 'dreadnought'],
    shortLabel: 'INT + CRU + DRE',
    shortLabelZh: '拦截 + 巡洋 + 无畏',
    badgeClass: MEGA_WAR_GROUP_STYLE.int_cru_dre.badgeClass,
    buttonClass: 'border-amber-400/80 bg-amber-950/40 text-amber-200 hover:bg-amber-950/60',
    extCardClass: 'border-2 border-amber-400/85 bg-amber-950/45 text-amber-200 ring-1 ring-amber-400/40',
  },
  {
    id: 'cru_dre',
    colorName: 'Orange',
    colorNameZh: '橙区',
    ships: ['cruiser', 'dreadnought'],
    shortLabel: 'CRU + DRE',
    shortLabelZh: '巡洋 + 无畏',
    badgeClass: MEGA_WAR_GROUP_STYLE.cru_dre.badgeClass,
    buttonClass: 'border-orange-500/80 bg-orange-950/40 text-orange-200 hover:bg-orange-950/60',
    extCardClass: 'border-2 border-orange-500/85 bg-orange-950/45 text-orange-200 ring-1 ring-orange-500/40',
  },
  {
    id: 'dre_sb',
    colorName: 'Purple',
    colorNameZh: '紫区',
    ships: ['dreadnought', 'starbase'],
    shortLabel: 'DRE + SB',
    shortLabelZh: '无畏 + 星际基地',
    badgeClass: MEGA_WAR_GROUP_STYLE.dre_sb.badgeClass,
    buttonClass: 'border-fuchsia-500/80 bg-fuchsia-950/40 text-fuchsia-200 hover:bg-fuchsia-950/60',
    extCardClass: 'border-2 border-fuchsia-500/85 bg-fuchsia-950/45 text-fuchsia-200 ring-1 ring-fuchsia-500/40',
  },
  {
    id: 'sb_only',
    colorName: 'Blue',
    colorNameZh: '蓝区',
    ships: ['starbase'],
    shortLabel: 'SB Only',
    shortLabelZh: '仅星际基地',
    badgeClass: MEGA_WAR_GROUP_STYLE.sb_only.badgeClass,
    buttonClass: 'border-sky-400/80 bg-sky-950/40 text-sky-200 hover:bg-sky-950/60',
    extCardClass: 'border-2 border-sky-400/85 bg-sky-950/45 text-sky-200 ring-1 ring-sky-400/40',
  },
];

export function getDefaultModularGroupForShip(shipType: ShipType): MegaWarModularGroupId {
  if (shipType === 'interceptor') return 'int_cru_dre';
  if (shipType === 'cruiser') return 'cru_dre';
  if (shipType === 'dreadnought') return 'dre_sb';
  return 'sb_only';
}

/**
 * Infers which Mega War Inc. modular color group currently holds a given external part (e.g. Muon Source)
 * from the unique subset of ship classes carrying it in `externalParts`.
 */
export function inferModularExternalGroup(
  blueprints: Record<string, ShipBlueprint>,
  partId: string = 'muon_source'
): MegaWarModularGroupId | null {
  const present = (['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).filter((st) =>
    Boolean(blueprints[st]?.externalParts?.some((p) => p.id === partId))
  );
  if (present.length === 0) return null;
  const exact = MEGA_WAR_EXTERNAL_GROUPS.find(
    (g) => g.ships.length === present.length && g.ships.every((st) => present.includes(st))
  );
  if (exact) return exact.id;
  // Fallback if an older/custom state only placed it on a single hull
  return getDefaultModularGroupForShip(present[0]!);
}

/**
 * Attaches or removes an external ship part (e.g. Muon Source) across all hulls in the target
 * Mega War Inc. modular color group (`Yellow`, `Orange`, `Purple`, or `Blue`).
 */
export function applyModularExternalChange(
  blueprints: Record<string, ShipBlueprint>,
  shipType: ShipType,
  part: ShipPart | null,
  modularGroupId?: MegaWarModularGroupId
): MegaWarModularGroupId {
  const targetGroupId = modularGroupId || getDefaultModularGroupForShip(shipType);
  const groupMeta =
    MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === targetGroupId) || MEGA_WAR_EXTERNAL_GROUPS[0]!;

  if (part) {
    // A single Muon Source moves between modular groups rather than duplicating on unlinked hulls
    for (const st of ['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]) {
      const bp = blueprints[st];
      if (!bp) continue;
      if (groupMeta.ships.includes(st)) {
        bp.externalParts = [part];
      } else {
        bp.externalParts = [];
      }
    }
  } else {
    // Remove external part from all linked hulls (or from whichever group held it)
    const activeGroup = modularGroupId ? groupMeta : MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === (inferModularExternalGroup(blueprints) || targetGroupId)) || groupMeta;
    for (const st of activeGroup.ships) {
      const bp = blueprints[st];
      if (bp) {
        bp.externalParts = [];
      }
    }
  }

  return groupMeta.id;
}

/**
 * Propagates a single slot change to all linked modular slots across a player's blueprints in-place.
 */
export function applyModularSlotChange(
  blueprints: Record<string, ShipBlueprint>,
  shipType: ShipType,
  slotIndex: number,
  part: ShipPart | null
): void {
  for (const link of getLinkedModularSlots(shipType, slotIndex)) {
    const bp = blueprints[link.shipType];
    if (bp && link.slotIndex >= 0 && link.slotIndex < bp.maxSlots) {
      bp.slots[link.slotIndex] = part;
    }
  }
}

/**
 * Counts Discovery Tile ship parts (ancient parts) currently placed on a ship blueprint
 * across both interior slots and external parts (e.g. Muon Source).
 */
export function countDiscoveryPartsOnBlueprint(blueprint?: ShipBlueprint | null): number {
  if (!blueprint) return 0;
  let count = 0;
  for (const part of blueprint.slots) {
    if (part && ALL_ANCIENT_PART_IDS.has(part.id)) {
      count += 1;
    }
  }
  if (blueprint.externalParts) {
    for (const part of blueprint.externalParts) {
      if (part && ALL_ANCIENT_PART_IDS.has(part.id)) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Counts all Discovery Tile ship parts currently placed across all of a player's ship blueprints.
 */
export function getPlayerDiscoveryShipPartsCount(player: Pick<PlayerState, 'blueprints'>): number {
  let total = 0;
  for (const bp of Object.values(player.blueprints || {})) {
    total += countDiscoveryPartsOnBlueprint(bp);
  }
  return total;
}

/**
 * Computes base Material build cost for a ship or structure before Minor Species discounts.
 * Applies faction build modifiers (Mechanema, Rho Indi Syndicate, The Exiles, Mega War Inc.) and
 * Atlantians' Price of Power (+1 Material per Discovery Tile beyond the first on that ship class).
 */
export function getBaseBuildItemCost(
  player: Pick<PlayerState, 'faction' | 'blueprints'>,
  itemType: ShipType | 'orbital' | 'monolith',
  isUpgradeBuild?: boolean
): number {
  const factionId = player.faction.id;
  if (isUpgradeBuild && factionId === 'mega_war_inc' && (itemType === 'cruiser' || itemType === 'dreadnought')) {
    return 3;
  }
  const isMechanema = factionId === 'mechanema';
  const isRhoIndi = factionId === 'rho_indi_syndicate';
  const isExiles = factionId === 'the_exiles';
  const isMegaWar = factionId === 'mega_war_inc';
  const isHeralds = factionId === 'heralds_of_ragnarok';

  let cost = 3;
  if (itemType === 'interceptor') cost = isMechanema || isMegaWar ? 2 : (isRhoIndi || isHeralds ? 4 : 3);
  else if (itemType === 'cruiser') cost = isMechanema || isHeralds ? 4 : (isRhoIndi ? 6 : 5);
  else if (itemType === 'dreadnought') cost = isMechanema ? 7 : 8;
  else if (itemType === 'starbase') cost = isMechanema ? 2 : (isRhoIndi ? 4 : 3);
  else if (itemType === 'orbital') cost = isMechanema ? 3 : (isExiles ? 5 : 4);
  else if (itemType === 'monolith') cost = isMechanema ? 8 : 10;

  if (
    factionId === 'atlantians' &&
    (itemType === 'interceptor' || itemType === 'cruiser' || itemType === 'dreadnought' || itemType === 'starbase')
  ) {
    const bp = player.blueprints?.[itemType];
    const discCount = countDiscoveryPartsOnBlueprint(bp);
    if (discCount > 1) {
      cost += discCount - 1;
    }
  }

  return cost;
}
