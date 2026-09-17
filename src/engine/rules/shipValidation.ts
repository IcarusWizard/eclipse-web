/**
 * Ship Blueprint Validation and Stat Calculation
 */

import { ShipBlueprint, BlueprintValidationResult } from '../types/blueprints';
import { SHIP_PARTS } from './partData';

export function calculateBlueprintStats(blueprint: ShipBlueprint): BlueprintValidationResult {
  let totalPowerProduced = 0;
  let totalPowerConsumed = 0;
  let bonusHull = 0;
  let bonusInitiative = 0;
  let totalDriveSpeed = 0;
  let computerBonus = 0;
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

  // Base hull based on ship class:
  // Interceptor: 1, Cruiser: 2, Dreadnought: 3, Starbase: 2
  let baseHull = 1;
  if (blueprint.type === 'cruiser') baseHull = 2;
  else if (blueprint.type === 'dreadnought') baseHull = 3;
  else if (blueprint.type === 'starbase') baseHull = 2;

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
      baseInitiative: 3,
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
      baseInitiative: 2,
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
      baseInitiative: 1,
      baseBuildCost: 8,
      slots: [
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.ion_cannon,
        SHIP_PARTS.electron_computer,
        SHIP_PARTS.hull,
        SHIP_PARTS.nuclear_source,
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
