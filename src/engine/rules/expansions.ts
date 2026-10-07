/**
 * Official Expansion Modules & Configuration for Eclipse: Second Dawn
 */

export type ExpansionId = 'rift_cannon' | 'remnants_of_worlds_afar' | 'turn_order' | 'seekers' | 'outcasts' | 'minor_species' | 'warped_universe';

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
  {
    id: 'seekers',
    name: 'Seekers',
    shortName: 'Seekers',
    badge: '2 New Factions',
    description: 'Introduces two new Alien Species with unique boards and mechanics: Wardens of Magellan and Enlightened of Lyra.',
    features: [
      'Wardens of Magellan: Ancient relic hunters with 16 Discs, starting Fusion Source, Colony Ship resource conversion, tech track discovery tile, and +1 VP per discovery ship part.',
      'Enlightened of Lyra: Spiritual recluses with 17 Discs, Shrine Board (9 Shrines built during Research), Wormhole Generator & Discovery & Disc row bonuses, and combat dice rerolls via Colony Ships.',
      'Home Sectors: Sector 233 (47 Ursae Majoris) and Sector 238 (Beta Lyrae).',
    ],
  },
  {
    id: 'outcasts',
    name: 'Outcasts',
    shortName: 'Outcasts',
    badge: '2 Outcast Factions',
    description: 'Introduces two new Alien Species from the galactic fringe: The Exiles and Rho Indi Syndicate.',
    features: [
      'The Exiles: Orbitals with cubes act as armed ships with 3-slot blueprints (Ion Turret, Computer, Hull, outside 2 Hulls + 4 Power). Cannot construct Starbases. +1 VP per Orbital with cube.',
      'Rho Indi Syndicate: Ruthless raiders with 4 Move activations, 2 starting Interceptors, preprinted Gauss Shields, Traitor Card immunity, reputation tile money bounties, and 3:2 Money trade.',
      'Home Sectors: Sector 234 (Outer Rim) and Sector 236 (The Desolation).',
    ],
  },
  {
    id: 'minor_species',
    name: 'Minor Species',
    shortName: 'Minor Species',
    badge: 'Ambassador Tiles',
    description: 'Introduces 9 Minor Species Ambassador Tiles that can be allied with for Money at any time during your actions.',
    features: [
      '4 randomly selected Minor Species Ambassador Tiles available in the play area',
      'Pay Money cost to ally and place the tile on an empty Ambassador space on your Reputation Track',
      'Allies grant immediate building/tech discounts or end-game scoring bonuses',
      'Allowed in 2-6 player games (even when player-to-player diplomacy is disabled)',
      'Minor Species Ambassador Tiles cannot be discarded once acquired',
    ],
  },
  {
    id: 'warped_universe',
    name: 'Warped Universe',
    shortName: 'Warped',
    badge: 'Warp Sector Board',
    description: 'Dense, balanced board layouts for 2–5 players using modular Large Warp Sectors with Ring-level wormhole conduits.',
    features: [
      'Modular Large Warp Sectors assembled from 9 Double-Hex tiles (18 hexes)',
      'Balanced 5-Player setup (1 Large Warp Sector), Tighter 3-Player setup (3 Large Warp Sectors), and Tighter 2/4-Player setup (2 Large Warp Sectors)',
      'Flow lines establish 3 Ring-level wormhole conduits (Ring 1, Ring 2, Ring 3) between left and right borders',
      'Move across the Warp Sector in 1 step through open wormholes; ships do not stop inside the Warp Sector',
      'Guardian Sectors are not used with this expansion',
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
  if (
    norm === 'seekers' ||
    norm === 'wardens_of_magellan' ||
    norm === 'magellan' ||
    norm === 'enlightened_of_lyra' ||
    norm === 'lyra' ||
    norm === 'shrine'
  ) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'seekers') || null;
  }
  if (
    norm === 'outcasts' ||
    norm === 'the_exiles' ||
    norm === 'exiles' ||
    norm === 'rho_indi_syndicate' ||
    norm === 'rho_indi' ||
    norm === 'rho indi'
  ) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'outcasts') || null;
  }
  if (norm.startsWith('minor_species') || norm.includes('minor species')) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'minor_species') || null;
  }
  if (norm.startsWith('warped_universe') || norm.includes('warped') || norm.startsWith('warp_') || norm.includes('warp sector')) {
    return AVAILABLE_EXPANSIONS.find((e) => e.id === 'warped_universe') || null;
  }
  return null;
}
