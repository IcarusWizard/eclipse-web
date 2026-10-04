/**
 * Official Expansion Modules & Configuration for Eclipse: Second Dawn
 */

export type ExpansionId = 'rift_cannon' | 'remnants_of_worlds_afar' | 'turn_order';

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
  {
    id: 'remnants_of_worlds_afar',
    name: 'Remnants of Worlds Afar',
    shortName: 'Remnants',
    badge: 'Extra Discoveries & Blueprints',
    description: 'Introduces 6 extra Discovery Tiles (Jump Drive, Morph Shield, Artifact Codex, Ancient Might, 2x +3 Money +3 Resource) and adds 3 Expert neutral ship blueprints.',
    features: [
      '6 New Discovery Tiles: Jump Drive, Morph Shield, Artifact Codex, Ancient Might, 2x +3 Money +3 Resource',
      'Jump Drive: Move 1 adjacent sector regardless of wormholes per activation',
      'Morph Shield: -1 Shield and removes 1 damage cube after each engagement round',
      'Artifact Codex: +1 VP per controlled artifact at game end',
      'Ancient Might: +1 VP per 3 VP in reputation tiles at game end',
      'Expert Neutral Ship Blueprints for Ancients, Guardians, and GCDS',
    ],
  },
  {
    id: 'turn_order',
    name: 'Turn Order',
    shortName: 'Turn Order',
    badge: 'Variable Turn Order',
    description: 'Player order is determined by the order in which players Passed in the previous Round instead of following clockwise rotation.',
    features: [
      'Turn Order Track with Turn Order Markers for each player',
      'Players take actions in the order displayed on the Turn Order Track',
      'Passing awards the lowest available Next Turn Order Tile (1st passer gets #1, 2nd gets #2, etc.)',
      'During Cleanup, Turn Order Markers are reordered according to the Next Turn Order Tiles',
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
  if (
    norm === 'remnants_of_worlds_afar' ||
    norm === 'remnants' ||
    norm === 'jump_drive' ||
    norm === 'jump drive' ||
    norm === 'disc_jump_drive' ||
    norm === 'morph_shield' ||
    norm === 'morph shield' ||
    norm === 'disc_morph_shield' ||
    norm === 'artifact_codex' ||
    norm === 'artifact codex' ||
    norm === 'disc_artifact_codex' ||
    norm === 'ancient_might' ||
    norm === 'ancient might' ||
    norm === 'disc_ancient_might' ||
    norm === 'disc_money_3_gray_1' ||
    norm === 'disc_money_3_gray_2' ||
    norm === '+3 money +3 resource' ||
    norm === '+3 money +3 gray'
  ) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'remnants_of_worlds_afar') || null;
  }
  return null;
}
