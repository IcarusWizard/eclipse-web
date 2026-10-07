/**
 * Official Minor Species Expansion for Eclipse: Second Dawn for the Galaxy
 *
 * Rules:
 * - 9 Minor Species Ambassador Tiles total.
 * - At game setup, 4 random tiles are selected and placed in the play area.
 * - Diplomatic relations can be formed at any time during any player action.
 * - Player pays the Money cost shown on the tile to place it on an empty Ambassador space
 *   on their Reputation Track.
 * - Abilities take effect immediately.
 * - Player may form Diplomatic Relations with multiple Minor Species.
 * - Minor Species tiles cannot be discarded at any time.
 * - May be used in 2-6 player games.
 */

import { PlayerState, ReputationSlotType } from '../types/player';
import { getFactionReputationSlotTypes } from './setup';

export type MinorSpeciesId =
  | 'minor_species_reputation_vp'
  | 'minor_species_ambassador_vp'
  | 'minor_species_flat_vp'
  | 'minor_species_population_cube'
  | 'minor_species_cruiser_discount'
  | 'minor_species_dreadnought_discount'
  | 'minor_species_orbital_discount'
  | 'minor_species_monolith_discount'
  | 'minor_species_tech_discount';

export interface MinorSpeciesTile {
  readonly id: MinorSpeciesId;
  readonly name: string;
  readonly cost: number; // Money cost
  readonly vp: number; // Base or reference VP
  readonly vpDescription: string;
  readonly abilityDescription: string;
  readonly icon: string;
  readonly targetType:
    | 'reputation'
    | 'ambassador'
    | 'flat'
    | 'population'
    | 'cruiser'
    | 'dreadnought'
    | 'orbital'
    | 'monolith'
    | 'tech';
  readonly discountAmount?: number;
}

export const ALL_MINOR_SPECIES_TILES: readonly MinorSpeciesTile[] = [
  {
    id: 'minor_species_reputation_vp',
    name: 'Reputation Guild',
    cost: 8,
    vp: 1,
    vpDescription: '1 VP per Reputation Tile on your track at end of game',
    abilityDescription: 'Scores 1 Victory Point per Reputation Tile at the end of the game.',
    icon: 'reputation',
    targetType: 'reputation',
  },
  {
    id: 'minor_species_ambassador_vp',
    name: 'Diplomatic Enclave',
    cost: 4,
    vp: 1,
    vpDescription: '1 VP per Ambassador Tile (including itself) at end of game',
    abilityDescription: 'Scores 1 Victory Point per Ambassador Tile (including itself) at the end of the game.',
    icon: 'ambassador',
    targetType: 'ambassador',
  },
  {
    id: 'minor_species_flat_vp',
    name: 'Ancient Dignitaries',
    cost: 8,
    vp: 3,
    vpDescription: '3 VP at end of game',
    abilityDescription: 'Scores 3 Victory Points at the end of the game.',
    icon: 'trophy',
    targetType: 'flat',
  },
  {
    id: 'minor_species_population_cube',
    name: 'Colony Pioneers',
    cost: 9,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription:
      'Immediately place a Population Cube from the Population Track of your choice on this tile. 1 VP at end of game.',
    icon: 'users',
    targetType: 'population',
  },
  {
    id: 'minor_species_cruiser_discount',
    name: 'Cruiser Shipwrights',
    cost: 4,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription: '-1 Materials discount for building Cruisers. 1 VP at the end of the game.',
    icon: 'cruiser',
    targetType: 'cruiser',
    discountAmount: 1,
  },
  {
    id: 'minor_species_dreadnought_discount',
    name: 'Dreadnought Engineers',
    cost: 4,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription: '-2 Materials discount for building Dreadnoughts. 1 VP at the end of the game.',
    icon: 'dreadnought',
    targetType: 'dreadnought',
    discountAmount: 2,
  },
  {
    id: 'minor_species_orbital_discount',
    name: 'Orbital Architects',
    cost: 4,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription: '-1 Materials discount for building Orbitals. 1 VP at the end of the game.',
    icon: 'orbital',
    targetType: 'orbital',
    discountAmount: 1,
  },
  {
    id: 'minor_species_monolith_discount',
    name: 'Monolith Masons',
    cost: 6,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription: '-2 Materials discount for building Monoliths. 1 VP at the end of the game.',
    icon: 'monolith',
    targetType: 'monolith',
    discountAmount: 2,
  },
  {
    id: 'minor_species_tech_discount',
    name: 'Research Consortium',
    cost: 4,
    vp: 1,
    vpDescription: '1 VP at end of game',
    abilityDescription:
      '-1 Science discount for Researching Techs (minimum Science cost still applies). 1 VP at the end of the game.',
    icon: 'tech',
    targetType: 'tech',
    discountAmount: 1,
  },
];

/**
 * Randomly select 4 Minor Species tiles for the game supply.
 */
export function createInitialMinorSpeciesSupply(): MinorSpeciesTile[] {
  const pool = [...ALL_MINOR_SPECIES_TILES];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 4);
}

/**
 * Calculates how many empty Ambassador Tile spaces the player has on their Reputation Track.
 * Ambassador tiles can be placed on 'amb_only' or 'both' slots.
 * Reputation tiles occupy 'rep_only' slots first, and any overflow occupies 'both' slots.
 */
export function getAvailableAmbassadorSlotsCount(player: PlayerState): number {
  const slotTypes = getFactionReputationSlotTypes(player.faction);
  const ambTiles = player.ambassadorTiles || [];
  const repTiles = player.reputationTiles || [];

  const ambEligibleSlots = slotTypes.filter((t) => t === 'amb_only' || t === 'both').length;
  const repOnlySlots = slotTypes.filter((t) => t === 'rep_only').length;
  const repInBothSlots = Math.max(0, repTiles.length - repOnlySlots);

  return Math.max(0, ambEligibleSlots - ambTiles.length - repInBothSlots);
}

/**
 * Checks if a player has allied with a specific Minor Species.
 */
export function playerHasMinorSpecies(player: PlayerState, speciesId: MinorSpeciesId): boolean {
  return Boolean(player.ambassadorTiles?.includes(speciesId));
}

/**
 * Returns the material discount for a build item type based on active Minor Species alliances.
 */
export function getMinorSpeciesBuildDiscount(player: PlayerState, itemType: string): number {
  if (itemType === 'cruiser' && playerHasMinorSpecies(player, 'minor_species_cruiser_discount')) {
    return 1;
  }
  if (itemType === 'dreadnought' && playerHasMinorSpecies(player, 'minor_species_dreadnought_discount')) {
    return 2;
  }
  if (itemType === 'orbital' && playerHasMinorSpecies(player, 'minor_species_orbital_discount')) {
    return 1;
  }
  if (itemType === 'monolith' && playerHasMinorSpecies(player, 'minor_species_monolith_discount')) {
    return 2;
  }
  return 0;
}

/**
 * Returns the science discount for researching technologies based on active Minor Species alliances.
 */
export function getMinorSpeciesTechDiscount(player: PlayerState): number {
  return playerHasMinorSpecies(player, 'minor_species_tech_discount') ? 1 : 0;
}

/**
 * Computes the total VP granted by all Minor Species ambassador tiles held by a player.
 */
export function calculateMinorSpeciesScores(player: PlayerState): number {
  const ambTiles = player.ambassadorTiles || [];
  let score = 0;

  for (const id of ambTiles) {
    if (!id.startsWith('minor_species_')) continue;

    switch (id as MinorSpeciesId) {
      case 'minor_species_reputation_vp':
        // 1 VP per Reputation Tile
        score += (player.reputationTiles || []).length * 1;
        break;
      case 'minor_species_ambassador_vp':
        // 1 VP per Ambassador Tile (including itself)
        score += ambTiles.length * 1;
        break;
      case 'minor_species_flat_vp':
        // 3 VP flat
        score += 3;
        break;
      case 'minor_species_population_cube':
      case 'minor_species_cruiser_discount':
      case 'minor_species_dreadnought_discount':
      case 'minor_species_orbital_discount':
      case 'minor_species_monolith_discount':
      case 'minor_species_tech_discount':
        // 1 VP flat
        score += 1;
        break;
    }
  }

  return score;
}
