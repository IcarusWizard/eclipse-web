/**
 * Game Actions for Eclipse: Second Dawn
 */

import { HexCoord, ShipType, PlanetResourceType } from './galaxy';

export type ActionType =
  | 'EXPLORE'
  | 'RESEARCH'
  | 'UPGRADE'
  | 'BUILD'
  | 'MOVE'
  | 'INFLUENCE'
  | 'COLONIZE'
  | 'TRADE'
  | 'PASS'
  | 'RESOLVE_COMBAT_STEP'
  | 'END_ROUND'
  | 'DISCOVERY_CHOICE'
  | 'COMBAT_CONQUEST';

export interface BaseAction {
  playerId: string;
}

export interface ExploreAction extends BaseAction {
  type: 'EXPLORE';
  fromCoord: HexCoord;
  targetCoord: HexCoord;
  rotation: number; // 0 to 5
  discard?: boolean;
  claimInfluence?: boolean;
}

export interface ResearchAction extends BaseAction {
  type: 'RESEARCH';
  techId: string;
  targetTrack?: 'military' | 'grid' | 'nano';
}

export interface UpgradeAction extends BaseAction {
  type: 'UPGRADE';
  upgrades: {
    shipType: ShipType;
    slotIndex: number;
    partId: string | null;
  }[];
}

export interface BuildAction extends BaseAction {
  type: 'BUILD';
  items: {
    sectorId: string;
    itemType: ShipType | 'orbital' | 'monolith';
  }[];
}

export interface MoveStep {
  shipId: string;
  fromSectorId: string;
  toSectorId: string;
  activationIndex?: number;
}

export interface MoveAction extends BaseAction {
  type: 'MOVE';
  moves: MoveStep[];
}

export interface InfluenceAction extends BaseAction {
  type: 'INFLUENCE';
  refreshColonyShips?: boolean; // Flip 2 colony ships face-up
  claimSectors?: string[]; // Place disc from track on sector
  abandonSectors?: string[]; // Remove disc from sector back to track
}

export interface ColonizeAction extends BaseAction {
  type: 'COLONIZE';
  sectorId: string;
  planetIndex: number;
}

export interface TradeAction extends BaseAction {
  type: 'TRADE';
  fromResource: 'science' | 'material';
  amount: number; // Must be multiple of player's trade ratio
}

export interface PassAction extends BaseAction {
  type: 'PASS';
}

export interface DiscoveryChoiceAction extends BaseAction {
  type: 'DISCOVERY_CHOICE';
  sectorId: string;
  keepForVictoryPoints: boolean; // Keep for 2 VP or take immediate reward/ship part
  equipShipType?: ShipType;
  equipSlotIndex?: number;
}

export interface ResolveCombatStepAction extends BaseAction {
  type: 'RESOLVE_COMBAT_STEP';
  sectorId: string;
  retreatShipIds?: string[];
  retreatDestinationSectorId?: string;
}

export interface CombatConquestAction extends BaseAction {
  type: 'COMBAT_CONQUEST';
  sectorId: string;
  claimInfluence: boolean;
  colonizePlanetIndices?: number[];
}

export type GameAction =
  | ExploreAction
  | ResearchAction
  | UpgradeAction
  | BuildAction
  | MoveAction
  | InfluenceAction
  | ColonizeAction
  | TradeAction
  | PassAction
  | DiscoveryChoiceAction
  | ResolveCombatStepAction
  | CombatConquestAction;
