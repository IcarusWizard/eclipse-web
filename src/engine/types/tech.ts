/**
 * Technology Types for Eclipse: Second Dawn
 */

export type TechCategory = 'military' | 'grid' | 'nano' | 'rare';

export interface Technology {
  readonly id: string;
  readonly name: string;
  readonly category: TechCategory;
  readonly baseCost: number; // Base science cost
  readonly minCost: number; // Lowest possible discounted cost
  readonly costByDiscount: number[]; // [no discount, 1 tech discount, 2 techs, 3+ techs]
  readonly tier?: number; // 1 to 8 for regular tracks (representing slot 2, 4, 6, 8, 10, 12, 14, 16)
  readonly unlocksPartId?: string; // If this tech unlocks a ship part
  readonly unlocksStructure?: 'orbital' | 'monolith' | 'starbase';
  readonly unlocksAbility?: string; // e.g. 'advanced_economy', 'advanced_mining', 'advanced_labs', 'wormhole_generator', 'neutron_bombs', 'artifact_key'
  readonly victoryPoints?: number;
  readonly placedTrack?: 'military' | 'grid' | 'nano';
  readonly description: string;
}

export interface PlayerTechTrack {
  researched: Technology[];
  // Researched counts per category to evaluate track discounts
  militaryCount: number;
  gridCount: number;
  nanoCount: number;
}
