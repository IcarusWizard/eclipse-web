/**
 * Modular Ship Blueprints and Ship Part Definitions
 */

import { ShipType } from './galaxy';

export type PartCategory =
  | 'cannon'
  | 'missile'
  | 'shield'
  | 'computer'
  | 'drive'
  | 'reactor'
  | 'hull';

export type DieColor = 'yellow' | 'orange' | 'blue' | 'red';

export interface WeaponDice {
  readonly color: DieColor;
  readonly count: number;
  readonly damagePerHit: number; // yellow=1, orange=2, blue=3, red=4
  readonly isMissile?: boolean;
}

export interface ShipPart {
  readonly id: string;
  readonly name: string;
  readonly category: PartCategory;
  readonly powerProduced: number; // Positive for reactors
  readonly powerConsumed: number; // Consumed by weapons, drives, computers, shields
  readonly initiativeBonus: number;
  readonly computerBonus: number; // +1, +2, +3 to hit
  readonly shieldBonus: number; // -1, -2 to opponent hit rolls
  readonly hullBonus: number; // +1, +2, +3 hit points
  readonly dice?: WeaponDice[];
  readonly driveSpeed?: number; // Movement points (e.g. 1, 2, 3)
}

export interface ShipBlueprint {
  readonly type: ShipType;
  readonly maxSlots: number;
  readonly baseInitiative: number;
  readonly baseBuildCost: number; // Materials
  slots: (ShipPart | null)[];
}

export interface BlueprintValidationResult {
  isValid: boolean;
  totalPowerProduced: number;
  totalPowerConsumed: number;
  totalHull: number; // Base hull + bonus hull
  totalInitiative: number;
  totalDriveSpeed: number;
  computerBonus: number;
  shieldBonus: number;
  errors: string[];
}
