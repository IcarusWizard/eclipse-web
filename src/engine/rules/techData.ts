/**
 * Official Technology Catalog, Tech Bag, and Tray Drawing System
 * Sourced from Eclipse: Second Dawn for the Galaxy rulebook.
 */

import { Technology, TechCategory } from '../types/tech';

// ============================================================================
// 1. NANO TECHNOLOGIES (8 Techs, slots 1-8: Base Costs 2, 4, 6, 8, 10, 12, 14, 16)
// ============================================================================
export const NANO_TECHS: Technology[] = [
  {
    id: 'nanorobots',
    name: 'Nanorobots',
    category: 'nano',
    tier: 1,
    baseCost: 2,
    minCost: 2,
    costByDiscount: [2, 2, 2, 2],
    description: 'Provides one extra activation during each Build Action.',
  },
  {
    id: 'fusion_drive',
    name: 'Fusion Drive',
    category: 'nano',
    tier: 2,
    baseCost: 4,
    minCost: 3,
    costByDiscount: [4, 3, 3, 3],
    unlocksPartId: 'fusion_drive',
    description: 'Unlocks Fusion Drive ship component (Speed +2, Initiative +2, Energy -2).',
  },
  {
    id: 'orbital',
    name: 'Orbital',
    category: 'nano',
    tier: 3,
    baseCost: 6,
    minCost: 4,
    costByDiscount: [6, 5, 4, 4],
    unlocksStructure: 'orbital',
    description: 'Permits constructing Orbitals in controlled sectors to expand population capacity.',
  },
  {
    id: 'advanced_robotics',
    name: 'Advanced Robotics',
    category: 'nano',
    tier: 4,
    baseCost: 8,
    minCost: 5,
    costByDiscount: [8, 6, 5, 5],
    description: 'Grants one bonus Influence Disc placed immediately on your track.',
  },
  {
    id: 'advanced_labs',
    name: 'Advanced Labs',
    category: 'nano',
    tier: 5,
    baseCost: 10,
    minCost: 6,
    costByDiscount: [10, 8, 6, 6],
    unlocksAbility: 'advanced_labs',
    description: 'Allows placing population cubes on Advanced Science (pink) planet squares.',
  },
  {
    id: 'monolith',
    name: 'Monolith',
    category: 'nano',
    tier: 6,
    baseCost: 12,
    minCost: 6,
    costByDiscount: [12, 10, 8, 6],
    unlocksStructure: 'monolith',
    description: 'Permits building Monoliths (cost 10 Materials, grants 3 VP at game end).',
  },
  {
    id: 'wormhole_generator',
    name: 'Wormhole Generator',
    category: 'nano',
    tier: 7,
    baseCost: 14,
    minCost: 7,
    costByDiscount: [14, 12, 10, 7],
    unlocksAbility: 'wormhole_generator',
    description: 'Allows exploration, movement, and influence through 1-sided wormholes.',
  },
  {
    id: 'artifact_key',
    name: 'Artifact Key',
    category: 'nano',
    tier: 8,
    baseCost: 16,
    minCost: 8,
    costByDiscount: [16, 14, 12, 8],
    unlocksAbility: 'artifact_key',
    description: 'Immediately gain 5 resources of a single type for each Artifact controlled.',
  },
];

// ============================================================================
// 2. GRID TECHNOLOGIES (8 Techs, slots 1-8: Base Costs 2, 4, 6, 8, 10, 12, 14, 16)
// ============================================================================
export const GRID_TECHS: Technology[] = [
  {
    id: 'gauss_shield',
    name: 'Gauss Shield',
    category: 'grid',
    tier: 1,
    baseCost: 2,
    minCost: 2,
    costByDiscount: [2, 2, 2, 2],
    unlocksPartId: 'gauss_shield',
    description: 'Unlocks Gauss Shield ship component (-1 to opponent hit rolls, 0 energy consumed).',
  },
  {
    id: 'fusion_source',
    name: 'Fusion Source',
    category: 'grid',
    tier: 2,
    baseCost: 4,
    minCost: 3,
    costByDiscount: [4, 3, 3, 3],
    unlocksPartId: 'fusion_source',
    description: 'Unlocks Fusion Source ship component (+6 energy generated).',
  },
  {
    id: 'improved_hull',
    name: 'Improved Hull',
    category: 'grid',
    tier: 3,
    baseCost: 6,
    minCost: 4,
    costByDiscount: [6, 5, 4, 4],
    unlocksPartId: 'improved_hull',
    description: 'Unlocks Improved Hull ship component (+2 Hull hit points, 0 energy).',
  },
  {
    id: 'positron_computer',
    name: 'Positron Computer',
    category: 'grid',
    tier: 4,
    baseCost: 8,
    minCost: 5,
    costByDiscount: [8, 6, 5, 5],
    unlocksPartId: 'positron_computer',
    description: 'Unlocks Positron Computer ship component (+2 hit bonus, +2 initiative, 1 energy).',
  },
  {
    id: 'advanced_economy',
    name: 'Advanced Economy',
    category: 'grid',
    tier: 5,
    baseCost: 10,
    minCost: 6,
    costByDiscount: [10, 8, 6, 6],
    unlocksAbility: 'advanced_economy',
    description: 'Allows placing population cubes on Advanced Money (orange) planet squares.',
  },
  {
    id: 'tachyon_drive',
    name: 'Tachyon Drive',
    category: 'grid',
    tier: 6,
    baseCost: 12,
    minCost: 6,
    costByDiscount: [12, 10, 8, 6],
    unlocksPartId: 'tachyon_drive',
    description: 'Unlocks Tachyon Drive ship component (Speed +3, Initiative +3, Energy -3).',
  },
  {
    id: 'antimatter_cannon',
    name: 'Antimatter Cannon',
    category: 'grid',
    tier: 7,
    baseCost: 14,
    minCost: 7,
    costByDiscount: [14, 12, 10, 7],
    unlocksPartId: 'antimatter_cannon',
    description: 'Unlocks Antimatter Cannon (4 damage red die, 4 energy consumed).',
  },
  {
    id: 'quantum_grid',
    name: 'Quantum Grid',
    category: 'grid',
    tier: 8,
    baseCost: 16,
    minCost: 8,
    costByDiscount: [16, 14, 12, 8],
    description: 'Grants two bonus Influence Discs placed immediately on your track.',
  },
];

// ============================================================================
// 3. MILITARY TECHNOLOGIES (8 Techs, slots 1-8: Base Costs 2, 4, 6, 8, 10, 12, 14, 16)
// ============================================================================
export const MILITARY_TECHS: Technology[] = [
  {
    id: 'neutron_bombs',
    name: 'Neutron Bombs',
    category: 'military',
    tier: 1,
    baseCost: 2,
    minCost: 2,
    costByDiscount: [2, 2, 2, 2],
    description: 'When attacking, all population cubes in the target sector are destroyed automatically without combat rolls.',
  },
  {
    id: 'starbase',
    name: 'Starbase',
    category: 'military',
    tier: 2,
    baseCost: 4,
    minCost: 3,
    costByDiscount: [4, 3, 3, 3],
    unlocksStructure: 'starbase',
    description: 'Permits constructing defensive Starbases in controlled sectors.',
  },
  {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    category: 'military',
    tier: 3,
    baseCost: 6,
    minCost: 4,
    costByDiscount: [6, 5, 4, 4],
    unlocksPartId: 'plasma_cannon',
    description: 'Unlocks Plasma Cannon (2 orange dice dealing 2 damage per hit, 2 energy consumed).',
  },
  {
    id: 'phase_shield',
    name: 'Phase Shield',
    category: 'military',
    tier: 4,
    baseCost: 8,
    minCost: 5,
    costByDiscount: [8, 6, 5, 5],
    unlocksPartId: 'phase_shield',
    description: 'Unlocks Phase Shield ship component (-2 to opponent hit rolls, 1 energy consumed).',
  },
  {
    id: 'advanced_mining',
    name: 'Advanced Mining',
    category: 'military',
    tier: 5,
    baseCost: 10,
    minCost: 6,
    costByDiscount: [10, 8, 6, 6],
    unlocksAbility: 'advanced_mining',
    description: 'Allows placing population cubes on Advanced Materials (brown) planet squares.',
  },
  {
    id: 'tachyon_source',
    name: 'Tachyon Source',
    category: 'military',
    tier: 6,
    baseCost: 12,
    minCost: 6,
    costByDiscount: [12, 10, 8, 6],
    unlocksPartId: 'tachyon_source',
    description: 'Unlocks Tachyon Source ship component (+9 energy generated, +1 initiative).',
  },
  {
    id: 'gluon_computer',
    name: 'Gluon Computer',
    category: 'military',
    tier: 7,
    baseCost: 14,
    minCost: 7,
    costByDiscount: [14, 12, 10, 7],
    unlocksPartId: 'gluon_computer',
    description: 'Unlocks Gluon Computer ship component (+3 hit bonus, +3 initiative, 2 energy consumed).',
  },
  {
    id: 'plasma_missile',
    name: 'Plasma Missile',
    category: 'military',
    tier: 8,
    baseCost: 16,
    minCost: 8,
    costByDiscount: [16, 14, 12, 8],
    unlocksPartId: 'plasma_missile',
    description: 'Unlocks Plasma Missile (2 orange dice in pre-combat missile salvo, 1 energy consumed).',
  },
];

/// ============================================================================
// 4. RARE TECHNOLOGIES (15 Unique Techs, one copy of each in the official game)
// Verified against Eclipse: Second Dawn for the Galaxy rulebook page 11 and page 31.
// Note: Rift Cannon was an Eclipse 1st edition expansion tech and is not in Second Dawn.
// ============================================================================
export const RARE_TECHS: Technology[] = [
  {
    id: 'antimatter_splitter',
    name: 'Antimatter Splitter',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    description: 'Allows you to split damage from Antimatter Cannons freely over targets.',
  },
  {
    id: 'neutron_absorber',
    name: 'Neutron Absorber',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    description: 'Enemy NEUTRON BOMBS have no effect on you.',
  },
  {
    id: 'conifold_field',
    name: 'Conifold Field',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    unlocksPartId: 'conifold_field',
    description: 'You may Upgrade your Ship Blueprints with CONIFOLD FIELD Ship Parts (+3 Hull, 2 Energy consumed).',
  },
  {
    id: 'absorption_shield',
    name: 'Absorption Shield',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    unlocksPartId: 'absorption_shield',
    description: 'You may Upgrade your Ship Blueprints with ABSORPTION SHIELD Ship Parts (-1 Shield, +4 Energy).',
  },
  {
    id: 'cloaking_device',
    name: 'Cloaking Device',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    description: 'Two Ships are required to Pin each of your Ships.',
  },
  {
    id: 'improved_logistics',
    name: 'Improved Logistics',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    description: 'Gain 1 additional Move Activation during each Move Action you take.',
  },
  {
    id: 'sentient_hull',
    name: 'Sentient Hull',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    unlocksPartId: 'sentient_hull',
    description: 'You may Upgrade your Ship Blueprints with SENTIENT HULL Ship Parts (+1 Computer, +1 Hull).',
  },
  {
    id: 'soliton_cannon',
    name: 'Soliton Cannon',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    unlocksPartId: 'soliton_cannon',
    description: 'You may Upgrade your Ship Blueprints with SOLITON CANNON Ship Parts (1 blue die dealing 3 damage, 3 Energy consumed).',
  },
  {
    id: 'transition_drive',
    name: 'Transition Drive',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    unlocksPartId: 'transition_drive',
    description: 'You may Upgrade your Ship Blueprints with TRANSITION DRIVE Ship Parts (Speed 3, 0 Energy consumed).',
  },
  {
    id: 'warp_portal',
    name: 'Warp Portal',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    description: 'Immediately place the Warp Portal Tile on any Sector you Control. Connects this Sector to all other Warp Portal Sectors and is worth 1 VP if Controlled at game end.',
  },
  {
    id: 'flux_missile',
    name: 'Flux Missile',
    category: 'rare',
    baseCost: 11,
    minCost: 8,
    costByDiscount: [11, 9, 8, 8],
    unlocksPartId: 'flux_missile',
    description: 'You may Upgrade your Ship Blueprints with FLUX MISSILE Ship Parts (2 yellow dice pre-combat salvo, +1 Initiative).',
  },
  {
    id: 'pico_modulator',
    name: 'Pico Modulator',
    category: 'rare',
    baseCost: 11,
    minCost: 8,
    costByDiscount: [11, 9, 8, 8],
    description: 'Gain 2 additional Upgrade Activations during each Upgrade Action you take.',
  },
  {
    id: 'ancient_labs',
    name: 'Ancient Labs',
    category: 'rare',
    baseCost: 13,
    minCost: 9,
    costByDiscount: [13, 11, 9, 9],
    description: 'Immediately draw and resolve one Discovery Tile.',
  },
  {
    id: 'zero_point_source',
    name: 'Zero-Point Source',
    category: 'rare',
    baseCost: 15,
    minCost: 10,
    costByDiscount: [15, 13, 11, 10],
    unlocksPartId: 'zero_point_source',
    description: 'You may Upgrade your Ship Blueprints with ZERO-POINT SOURCE Ship Parts (+12 Energy generated).',
  },
  {
    id: 'metasynthesis',
    name: 'Metasynthesis',
    category: 'rare',
    baseCost: 17,
    minCost: 11,
    costByDiscount: [17, 15, 13, 11],
    description: 'You may place Population Cubes in any Advanced Population Squares with your Colony Ships.',
  },
];

export const TECH_CATALOG: Technology[] = [
  ...NANO_TECHS,
  ...GRID_TECHS,
  ...MILITARY_TECHS,
  ...RARE_TECHS,
];

/**
 * Official discount progression printed on the Species Board Tech Tracks for Eclipse: Second Dawn:
 * 0 techs on track -> discount 0
 * 1 tech on track  -> discount 1
 * 2 techs on track -> discount 2
 * 3 techs on track -> discount 3
 * 4 techs on track -> discount 4
 * 5 techs on track -> discount 6
 * 6+ techs on track -> discount 8
 */
export const OFFICIAL_TECH_DISCOUNTS = [0, 1, 2, 3, 4, 6, 8];

export const TECH_TRACK_DISCOUNT_TABLE: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 6,
  6: 8,
  7: 8,
};

export function getTechDiscountForTrack(techsResearchedInTrack: number): number {
  if (techsResearchedInTrack >= OFFICIAL_TECH_DISCOUNTS.length) {
    return OFFICIAL_TECH_DISCOUNTS[OFFICIAL_TECH_DISCOUNTS.length - 1]!;
  }
  return OFFICIAL_TECH_DISCOUNTS[Math.max(0, techsResearchedInTrack)]!;
}

/**
 * Calculates the exact discounted cost for researching a technology.
 * In Eclipse: Second Dawn, the discount is strictly dictated by the leftmost visible discount
 * printed on the Species Board for that category (0, 1, 2, 3, 4, 6, 8), subject to the tech's minCost.
 * @param tech The target technology
 * @param techsResearchedInTrack Count of technologies currently researched in this track
 */
export function calculateTechCost(tech: Technology, techsResearchedInTrack: number): number {
  const discount = getTechDiscountForTrack(techsResearchedInTrack);
  return Math.max(tech.minCost, tech.baseCost - discount);
}

/**
 * Official Eclipse: Second Dawn regular tech distribution (33 tiles per category, 99 total):
 * Tier 1 (Cost 2): 5 copies
 * Tier 2 (Cost 4): 5 copies
 * Tier 3 (Cost 6): 5 copies
 * Tier 4 (Cost 8): 5 copies
 * Tier 5 (Cost 10): 4 copies
 * Tier 6 (Cost 12): 3 copies
 * Tier 7 (Cost 14): 3 copies
 * Tier 8 (Cost 16): 3 copies
 * Total regular tiles = 33 * 3 = 99 tiles.
 * Plus 15 Rare Tech tiles (1 of each) = 114 Tech Tiles (39 different), matching rulebook page 3.
 */
const REGULAR_TECH_COPIES: Record<number, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 5,
  5: 4,
  6: 3,
  7: 3,
  8: 3,
};

/**
 * Creates the complete official Tech Tile Bag for Eclipse: Second Dawn.
 * 99 regular technologies + 15 Rare technologies = 114 tiles (39 unique).
 */
export function createInitialTechBag(): Technology[] {
  const bag: Technology[] = [];

  const regularTechs = [...NANO_TECHS, ...GRID_TECHS, ...MILITARY_TECHS];
  for (const tech of regularTechs) {
    const copies = REGULAR_TECH_COPIES[tech.tier] ?? 4;
    for (let copy = 0; copy < copies; copy++) {
      bag.push({ ...tech });
    }
  }

  // 1 copy of each of the 15 authentic Rare technologies
  for (const tech of RARE_TECHS) {
    bag.push({ ...tech });
  }

  // Shuffle bag with Fisher-Yates
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }

  return bag;
}

function drawTechTilesUntilLimit(
  techBag: Technology[],
  regularLimit: number
): { drawn: Technology[]; remainingBag: Technology[]; regularDrawn: number; rareDrawn: number } {
  const drawn: Technology[] = [];
  const remainingBag = [...techBag];
  let regularDrawn = 0;
  let rareDrawn = 0;

  while (remainingBag.length > 0 && regularDrawn < regularLimit) {
    const tile = remainingBag.shift()!;
    drawn.push(tile);
    if (tile.category === 'rare') {
      rareDrawn++;
    } else {
      regularDrawn++;
    }
  }

  return { drawn, remainingBag, regularDrawn, rareDrawn };
}

/**
 * Draws technology tiles from the bag during Game Setup (Rulebook page 5).
 * 2 players: 12 regular tiles
 * 3 players: 14 regular tiles
 * 4 players: 16 regular tiles
 * 5 players: 18 regular tiles
 * 6 players: 20 regular tiles
 * Rare tiles drawn along the way are placed in the bottom row of the Tech Tray and do NOT count towards the limit.
 */
export function drawTechTilesForSetup(
  techBag: Technology[],
  playerCount: number
): { drawn: Technology[]; remainingBag: Technology[]; regularDrawn: number; rareDrawn: number } {
  const regularLimit = Math.max(12, Math.min(20, 2 * Math.max(2, playerCount) + 8));
  return drawTechTilesUntilLimit(techBag, regularLimit);
}

/**
 * Draws technology tiles from the bag during the Cleanup Phase between rounds (Rulebook page 25).
 * 2 players: 5 regular tiles
 * 3 players: 6 regular tiles
 * 4 players: 7 regular tiles
 * 5 players: 8 regular tiles
 * 6 players: 9 regular tiles
 * Rare tiles drawn along the way are placed in the bottom row of the Tech Tray and do NOT count towards the limit.
 */
export function drawTechTilesForRound(
  techBag: Technology[],
  playerCount: number
): { drawn: Technology[]; remainingBag: Technology[]; regularDrawn: number; rareDrawn: number } {
  const regularLimit = Math.max(5, Math.min(9, Math.max(2, playerCount) + 3));
  return drawTechTilesUntilLimit(techBag, regularLimit);
}
