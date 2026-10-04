/**
 * Official Expansion Modules & Configuration for Eclipse: Second Dawn
 */

export type ExpansionId = 'rift_cannon';

export interface ExpansionDefinition {
  readonly id: ExpansionId;
  readonly name: string;
  readonly shortName: string;
  readonly badge: string;
  readonly description: string;
  readonly features: string[];
}

export const AVAILABLE_EXPANSIONS: ExpansionDefinition[] = [
  {
    id: 'rift_cannon',
    name: 'Rift Cannon',
    shortName: 'Rift',
    badge: 'Purple Dice',
    description: 'Introduces volatile purple Rift dice, the Rift Cannon rare technology, and the Rift Conductor discovery tile.',
    features: [
      'Purple Rift Dice (symbol-based, ignores shields/computers, potential self-damage)',
      'Rare Tech: Rift Cannon (Cost 9, Min 7; consumes 2 Power, provides 1 Purple Rift die)',
      'Discovery Tile: Rift Conductor (provides 1 Purple Rift die, +1 Hull, consumes 1 Power)',
      'Self-damage allocated starting from largest to smallest ship with purple dice',
    ],
  },
];

export function isExpansionActive(expansions: string[] | undefined, id: ExpansionId): boolean {
  return Boolean(expansions && expansions.includes(id));
}

/**
 * Returns the expansion definition that an item (tech, ship part, discovery tile, etc.) belongs to, or null if base game.
 */
export function getExpansionForItem(itemIdOrName: string): ExpansionDefinition | null {
  const norm = itemIdOrName.toLowerCase();
  if (
    norm === 'rift_cannon' ||
    norm === 'rift cannon' ||
    norm === 'rift_conductor' ||
    norm === 'rift conductor' ||
    norm === 'disc_rift_conductor'
  ) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'rift_cannon') || null;
  }
  return null;
}
