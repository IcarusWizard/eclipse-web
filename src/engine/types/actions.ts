/**
 * Game Actions for Eclipse: Second Dawn
 */

import { HexCoord, ShipType, PlanetResourceType } from './galaxy';

export type ActionType =
  | 'EXPLORE'
  | 'FINISH_EXPLORE'
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
  | 'COMBAT_CONQUEST'
  | 'ALLOCATE_ARTIFACT_REWARD'
  | 'ABANDON_SECTOR_BANKRUPTCY'
  | 'CONFIRM_TURN_ACTION'
  | 'REVERT_TURN_ACTION'
  | 'PROPOSE_DIPLOMACY'
  | 'RESPOND_DIPLOMACY'
  | 'CONVERT_COLONY_SHIP'
  | 'PLACE_SHRINE'
  | 'REROLL_COMBAT_DIE';

export interface BaseAction {
  playerId: string;
  requireConfirmation?: boolean;
}

export interface ExploreAction extends BaseAction {
  type: 'EXPLORE';
  fromCoord: HexCoord;
  targetCoord: HexCoord;
  rotation: number; // 0 to 5
  discard?: boolean;
  claimInfluence?: boolean;
  chosenTileIndex?: number; // for Draco (0: top, 1: second from top)
  isSecondActivation?: boolean;
}

export interface FinishExploreAction extends BaseAction {
  type: 'FINISH_EXPLORE';
}

export interface ResearchAction extends BaseAction {
  type: 'RESEARCH';
  techId?: string;
  targetTrack?: 'military' | 'grid' | 'nano';
  researches?: {
    techId: string;
    targetTrack?: 'military' | 'grid' | 'nano';
  }[];
  warpPortalSectorId?: string; // Target controlled sector when researching Warp Portal rare tech
  artifactRewardResources?: {
    money?: number;
    science?: number;
    materials?: number;
  };
  shrinePlacement?: {
    row: number; // 0..2
    col: number; // 0..2
    sectorId: string;
    planetId: string;
  };
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
  chosenResource?: 'money' | 'science' | 'material';
}

export interface TradeAction extends BaseAction {
  type: 'TRADE';
  fromResource: 'money' | 'science' | 'material';
  toResource?: 'money' | 'science' | 'material';
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
  chosenTechId?: string; // For Ancient Tech discovery when multiple lowest-cost regular techs available
  colonizeOrbitalResource?: 'money' | 'science'; // For Ancient Orbital discovery when colonizing with ready colony ship
  chosenResource?: 'money' | 'science' | 'material'; // For +3 Money +3 Resource discovery tile
}

export interface DiplomacyExchangeAction extends BaseAction {
  type: 'DIPLOMACY_EXCHANGE';
  targetPlayerId: string;
  initiatorCube?: 'money' | 'science' | 'material';
  targetCube?: 'money' | 'science' | 'material';
}

export interface ProposeDiplomacyAction extends BaseAction {
  type: 'PROPOSE_DIPLOMACY';
  targetPlayerId: string;
  initiatorCube: 'money' | 'science' | 'material';
}

export interface RespondDiplomacyAction extends BaseAction {
  type: 'RESPOND_DIPLOMACY';
  accept: boolean;
  targetCube?: 'money' | 'science' | 'material';
}

export interface ResolveCombatStepAction extends BaseAction {
  type: 'RESOLVE_COMBAT_STEP';
  sectorId: string;
  retreatShipIds?: string[];
  retreatDestinationSectorId?: string;
  concludeCombat?: boolean;
  rerollRollIndex?: number; // Lyra: flip colony ship to reroll die at this index in lastRolls
}

export interface CombatConquestAction extends BaseAction {
  type: 'COMBAT_CONQUEST';
  sectorId: string;
  claimInfluence: boolean;
  colonizePlanetIndices?: number[];
  planetResourceChoices?: Record<number, 'money' | 'science' | 'material'>;
}

export interface ClaimReputationTileAction extends BaseAction {
  type: 'CLAIM_REPUTATION_TILE';
  selectedTileIndex?: number; // index in drawnTiles to keep (-1 or undefined to discard all)
  replaceTrackIndex?: number; // index on player.reputationTiles to replace if full
}

export interface AllocateArtifactRewardAction extends BaseAction {
  type: 'ALLOCATE_ARTIFACT_REWARD';
  resources: {
    money: number;
    science: number;
    materials: number;
  };
}

export interface AbandonSectorBankruptcyAction extends BaseAction {
  type: 'ABANDON_SECTOR_BANKRUPTCY';
  sectorId: string;
}

export interface ConfirmTurnAction extends BaseAction {
  type: 'CONFIRM_TURN_ACTION';
}

export interface RevertTurnAction extends BaseAction {
  type: 'REVERT_TURN_ACTION';
}

export interface ConvertColonyShipAction extends BaseAction {
  type: 'CONVERT_COLONY_SHIP';
  resource: 'money' | 'science' | 'materials';
  count?: number; // Default 1
}

export interface PlaceShrineAction extends BaseAction {
  type: 'PLACE_SHRINE';
  row: number; // 0..2
  col: number; // 0..2
  sectorId: string;
  planetId: string;
}

export interface RerollCombatDieAction extends BaseAction {
  type: 'REROLL_COMBAT_DIE';
  rollIndex: number;
}

export type GameAction =
  | ExploreAction
  | FinishExploreAction
  | ResearchAction
  | UpgradeAction
  | BuildAction
  | MoveAction
  | InfluenceAction
  | ColonizeAction
  | TradeAction
  | PassAction
  | DiscoveryChoiceAction
  | DiplomacyExchangeAction
  | ProposeDiplomacyAction
  | RespondDiplomacyAction
  | ResolveCombatStepAction
  | CombatConquestAction
  | ClaimReputationTileAction
  | AllocateArtifactRewardAction
  | AbandonSectorBankruptcyAction
  | ConfirmTurnAction
  | RevertTurnAction
  | ConvertColonyShipAction
  | PlaceShrineAction
  | RerollCombatDieAction;
