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
    victoryPoints: 3,
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

// ============================================================================
// 4. RARE TECHNOLOGIES (16 Unique Techs, one copy of each in the game)
// ============================================================================
export const RARE_TECHS: Technology[] = [
  {
    id: 'antimatter_splitter',
    name: 'Antimatter Splitter',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    description: 'Allows damage from Antimatter Cannons to be split freely among multiple targets.',
  },
  {
    id: 'neutron_absorber',
    name: 'Neutron Absorber',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    description: 'Your population is immune to enemy Neutron Bombs.',
  },
  {
    id: 'conifold_field',
    name: 'Conifold Field',
    category: 'rare',
    baseCost: 5,
    minCost: 5,
    costByDiscount: [5, 5, 5, 5],
    unlocksPartId: 'conifold_field',
    description: 'Unlocks Conifold Field ship component (-2 to opponent hit rolls, 0 energy consumed).',
  },
  {
    id: 'absorption_shield',
    name: 'Absorption Shield',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    unlocksPartId: 'absorption_shield',
    description: 'Unlocks Absorption Shield (+1 shield, absorbs energy from enemy fire).',
  },
  {
    id: 'cloaking_device',
    name: 'Cloaking Device',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    description: 'Two enemy ships are required to pin each of your ships.',
  },
  {
    id: 'improved_logistics',
    name: 'Improved Logistics',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    description: 'Gain one additional Move activation during each Move Action.',
  },
  {
    id: 'sentient_hull',
    name: 'Sentient Hull',
    category: 'rare',
    baseCost: 7,
    minCost: 6,
    costByDiscount: [7, 6, 6, 6],
    unlocksPartId: 'sentient_hull',
    description: 'Unlocks Sentient Hull ship component (+1 Hull HP, +1 computer hit bonus).',
  },
  {
    id: 'rift_cannon',
    name: 'Rift Cannon',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    unlocksPartId: 'rift_cannon',
    description: 'Unlocks Rift Cannon (2 red dice dealing 2 damage each, 2 energy consumed).',
  },
  {
    id: 'soliton_cannon',
    name: 'Soliton Cannon',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    unlocksPartId: 'soliton_cannon',
    description: 'Unlocks Soliton Cannon (1 orange die dealing 3 damage, 1 energy consumed).',
  },
  {
    id: 'transition_drive',
    name: 'Transition Drive',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    unlocksPartId: 'transition_drive',
    description: 'Unlocks Transition Drive ship component (Speed +3, Initiative +2, 2 energy consumed).',
  },
  {
    id: 'warp_portal',
    name: 'Warp Portal',
    category: 'rare',
    baseCost: 9,
    minCost: 7,
    costByDiscount: [9, 8, 7, 7],
    victoryPoints: 1,
    description: 'Place Warp Portal on any controlled sector (worth 1 VP).',
  },
  {
    id: 'flux_missile',
    name: 'Flux Missile',
    category: 'rare',
    baseCost: 11,
    minCost: 8,
    costByDiscount: [11, 9, 8, 8],
    unlocksPartId: 'flux_missile',
    description: 'Unlocks Flux Missile (2 yellow dice pre-combat salvo, 0 energy consumed).',
  },
  {
    id: 'pico_modulator',
    name: 'Pico Modulator',
    category: 'rare',
    baseCost: 11,
    minCost: 8,
    costByDiscount: [11, 9, 8, 8],
    description: 'Gain two additional Upgrade activations during each Upgrade Action.',
  },
  {
    id: 'ancient_labs',
    name: 'Ancient Labs',
    category: 'rare',
    baseCost: 13,
    minCost: 9,
    costByDiscount: [13, 11, 9, 9],
    description: 'Immediately draw and resolve one Discovery Tile upon researching.',
  },
  {
    id: 'zero_point_source',
    name: 'Zero-Point Source',
    category: 'rare',
    baseCost: 15,
    minCost: 10,
    costByDiscount: [15, 13, 11, 10],
    unlocksPartId: 'zero_point_source',
    description: 'Unlocks Zero-Point Source ship component (+12 energy generated, +2 initiative).',
  },
  {
    id: 'metasynthesis',
    name: 'Metasynthesis',
    category: 'rare',
    baseCost: 17,
    minCost: 11,
    costByDiscount: [17, 15, 13, 11],
    description: 'Place population cubes in ANY Advanced Population Squares (Money, Science, Material).',
  },
];

export const TECH_CATALOG: Technology[] = [
  ...NANO_TECHS,
  ...GRID_TECHS,
  ...MILITARY_TECHS,
  ...RARE_TECHS,
];

/**
 * Calculates the exact discounted cost for researching a technology.
 * @param tech The target technology
 * @param techsResearchedInTrack Count of technologies currently researched in this track
 */
export function calculateTechCost(tech: Technology, techsResearchedInTrack: number): number {
  if (tech.costByDiscount && tech.costByDiscount.length > 0) {
    const discountIndex = Math.min(Math.max(0, techsResearchedInTrack), tech.costByDiscount.length - 1);
    return tech.costByDiscount[discountIndex]!;
  }
  return Math.max(tech.minCost, tech.baseCost - Math.max(0, techsResearchedInTrack) * 2);
}

/**
 * Creates the complete official Tech Tile Bag for Eclipse: Second Dawn.
 * 4 copies of each of the 24 regular technologies (96) + 1 copy of each of the 16 Rare technologies (16) = 112 tiles.
 */
export function createInitialTechBag(): Technology[] {
  const bag: Technology[] = [];

  // 4 copies of each regular technology
  const regularTechs = [...NANO_TECHS, ...GRID_TECHS, ...MILITARY_TECHS];
  for (const tech of regularTechs) {
    for (let copy = 0; copy < 4; copy++) {
      bag.push({ ...tech });
    }
  }

  // 1 copy of each Rare technology
  for (const tech of RARE_TECHS) {
    bag.push({ ...tech });
  }

  // Shuffle bag
  return bag.sort(() => Math.random() - 0.5);
}

/**
 * Draws technology tiles from the bag to populate or replenish the Tech Tray.
 * Official Eclipse rule:
 * Draw tiles from the bag until (playerCount + 3) regular tiles are drawn!
 * Rare tiles drawn along the way are placed in the tray and do NOT count towards the regular tile limit.
 */
export function drawTechTilesForRound(
  techBag: Technology[],
  playerCount: number
): { drawn: Technology[]; remainingBag: Technology[]; regularDrawn: number; rareDrawn: number } {
  const regularLimit = Math.max(1, playerCount) + 3;
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
