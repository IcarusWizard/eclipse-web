/**
 * Neutral Ship (NPC) Blueprints: Ancients, Guardians, and GCDS
 * Supports Default and Advanced variants, with random selection support.
 */

export type NeutralShipType = 'ancient' | 'guardian' | 'gcds';
export type NeutralShipVariant = 'default' | 'advanced';
export type NeutralShipSelection = 'default' | 'advanced' | 'random';

export interface NeutralShipWeapon {
  color: 'yellow' | 'orange' | 'blue' | 'red' | 'purple';
  damage: number;
  count: number;
  isMissile?: boolean;
}

export interface NeutralShipBlueprint {
  type: NeutralShipType;
  variant: NeutralShipVariant;
  name: string;
  initiative: number;
  maxHull: number;
  computerBonus: number;
  shieldBonus: number;
  weapons: NeutralShipWeapon[];
  summary: string;
}

export type NeutralShipConfig = Record<NeutralShipType, NeutralShipVariant>;
export type NeutralShipSelectionConfig = Record<NeutralShipType, NeutralShipSelection>;

export const DEFAULT_NEUTRAL_SHIP_SELECTIONS: NeutralShipSelectionConfig = {
  ancient: 'default',
  guardian: 'default',
  gcds: 'default',
};

export const DEFAULT_NEUTRAL_SHIP_CONFIG: NeutralShipConfig = {
  ancient: 'default',
  guardian: 'default',
  gcds: 'default',
};

export const NEUTRAL_SHIP_BLUEPRINTS: Record<NeutralShipType, Record<NeutralShipVariant, NeutralShipBlueprint>> = {
  ancient: {
    default: {
      type: 'ancient',
      variant: 'default',
      name: 'Ancient Cruiser',
      initiative: 2,
      maxHull: 2,
      computerBonus: 1,
      shieldBonus: 0,
      weapons: [{ color: 'yellow', damage: 1, count: 2 }],
      summary: 'Hull: 2 • Init: 2 • 2 Yellow Cannons (+1 Hit)',
    },
    advanced: {
      type: 'ancient',
      variant: 'advanced',
      name: 'Ancient Cruiser (Advanced)',
      initiative: 1,
      maxHull: 2,
      computerBonus: 1,
      shieldBonus: 0,
      weapons: [{ color: 'orange', damage: 2, count: 1 }],
      summary: 'Hull: 2 • Init: 1 • 1 Orange Cannon (+1 Hit)',
    },
  },
  guardian: {
    default: {
      type: 'guardian',
      variant: 'default',
      name: 'Guardian',
      initiative: 3,
      maxHull: 3,
      computerBonus: 2,
      shieldBonus: 1,
      weapons: [{ color: 'yellow', damage: 1, count: 3 }],
      summary: 'Hull: 3 • Init: 3 • 3 Yellow Cannons (+2 Hit, -1 Shield) • 2 VP',
    },
    advanced: {
      type: 'guardian',
      variant: 'advanced',
      name: 'Guardian (Advanced)',
      initiative: 1,
      maxHull: 3,
      computerBonus: 1,
      shieldBonus: 0,
      weapons: [
        { color: 'orange', damage: 2, count: 2, isMissile: true },
        { color: 'red', damage: 4, count: 1 },
      ],
      summary: 'Hull: 3 • Init: 1 • 2 Orange Missiles, 1 Red Cannon (+1 Hit) • 2 VP',
    },
  },
  gcds: {
    default: {
      type: 'gcds',
      variant: 'default',
      name: 'Galactic Center Defense System',
      initiative: 0,
      maxHull: 7,
      computerBonus: 2,
      shieldBonus: 0,
      weapons: [{ color: 'yellow', damage: 1, count: 4 }],
      summary: 'Hull: 7 • Init: 0 • 4 Yellow Cannons (+2 Hit) • 4 VP',
    },
    advanced: {
      type: 'gcds',
      variant: 'advanced',
      name: 'Galactic Center Defense System (Advanced)',
      initiative: 2,
      maxHull: 3,
      computerBonus: 2,
      shieldBonus: 0,
      weapons: [
        { color: 'yellow', damage: 1, count: 4, isMissile: true },
        { color: 'red', damage: 4, count: 1 },
      ],
      summary: 'Hull: 3 • Init: 2 • 4 Yellow Missiles, 1 Red Cannon (+2 Hit) • 4 VP',
    },
  },
};

export function getNeutralShipBlueprint(
  type: NeutralShipType,
  variant: NeutralShipVariant = 'default'
): NeutralShipBlueprint {
  const byType = NEUTRAL_SHIP_BLUEPRINTS[type];
  if (!byType) {
    return NEUTRAL_SHIP_BLUEPRINTS.ancient.default;
  }
  return byType[variant] || byType.default;
}

export function getNeutralShipSummary(
  type: NeutralShipType,
  variant: NeutralShipVariant = 'default'
): string {
  const bp = getNeutralShipBlueprint(type, variant);
  return bp.summary;
}

export function resolveNeutralShipConfig(
  selections?: Partial<NeutralShipSelectionConfig>
): NeutralShipConfig {
  const types: NeutralShipType[] = ['ancient', 'guardian', 'gcds'];
  const config: NeutralShipConfig = { ...DEFAULT_NEUTRAL_SHIP_CONFIG };

  for (const t of types) {
    const sel = selections?.[t];
    if (sel === 'advanced') {
      config[t] = 'advanced';
    } else if (sel === 'random') {
      config[t] = Math.random() < 0.5 ? 'default' : 'advanced';
    } else {
      config[t] = 'default';
    }
  }

  return config;
}
