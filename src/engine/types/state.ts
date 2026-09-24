/**
 * Complete Serializable Game State
 */

import { SectorTile, DiscoveryTile, HexCoord } from './galaxy';
import { PlayerState } from './player';
import { Technology } from './tech';

export type GamePhase =
  | 'ACTION_PHASE'
  | 'COMBAT_PHASE'
  | 'UPKEEP_PHASE'
  | 'CLEANUP_PHASE'
  | 'GAME_OVER';

export interface CombatRoll {
  shipId: string;
  shipOwner: string;
  dieColor: 'yellow' | 'orange' | 'blue' | 'red';
  roll: number;
  modifiedRoll: number;
  isHit: boolean;
  damage: number;
}

export interface CombatState {
  sectorId: string;
  attackerOwnerId?: string;
  defenderOwnerId?: string;
  roundNumber: number;
  stage: 'missile' | 'regular' | 'bombardment' | 'resolved';
  initiativeOrder: {
    shipId: string;
    ownerId: string;
    initiative: number;
  }[];
  currentTurnIndex: number;
  lastRolls: CombatRoll[];
  retreatDeclared: Record<string, string>; // shipId -> destinationSectorId
  retreatAttemptedPlayerIds?: string[];
  destroyedShips?: { shipId: string; type: string; ownerId: string; killerId?: string }[];
  participatingPlayerIds?: string[];
  missileFiredShipIds?: string[];
}

export interface PendingReputationDraw {
  playerId: string;
  drawnTiles: number[];
  sectorId: string;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  round: number;
  phase: GamePhase;
  playerId?: string;
  message: string;
  type: 'action' | 'combat' | 'economy' | 'system';
}

export interface PendingExplore {
  tile: SectorTile;
  targetCoord: HexCoord;
  fromCoord: HexCoord;
  playerId: string;
}

export interface PendingDiscovery {
  sectorId: string;
  discovery: DiscoveryTile;
  playerId: string;
}

export interface BombardmentRoll {
  shipType: string;
  diceColor: string;
  roll: number;
  isHit: boolean;
  damage: number;
}

export interface BombardmentSummary {
  attackerName: string;
  defenderName: string;
  totalDamage: number;
  rolls: BombardmentRoll[];
  cubesDestroyed: { resource: string; planetIndex: number }[];
  cubesRemaining: number;
  hasNeutronBombs?: boolean;
}

export interface PendingCombatConquest {
  sectorId: string;
  winnerPlayerId: string;
  discoveryToClaim?: DiscoveryTile;
  bombardmentSummary?: BombardmentSummary;
  canClaimInfluence?: boolean;
}

export interface PendingArtifactReward {
  playerId: string;
  totalResources: number;
  artifactsCount: number;
}

export interface PendingBankruptcy {
  playerId: string;
  deficit: number;
}

export interface PendingActionConfirmation {
  actionType: string;
  playerId: string;
  description: string;
  canRevert: boolean;
  snapshot?: string; // Serialized GameState snapshot before action execution
  exploreTargetCoord?: HexCoord;
  exploreFromCoord?: HexCoord;
}

export interface GameState {
  id: string;
  round: number;
  maxRounds: number;
  phase: GamePhase;
  activePlayerIndex: number;
  firstPlayerIndex: number;
  turnOrder: string[]; // Player IDs in current round turn order
  passedPlayerIds: string[];
  consecutivePasses?: number;
  players: PlayerState[];
  sectors: SectorTile[];
  sectorDecks: {
    ring1: SectorTile[];
    ring2: SectorTile[];
    ring3: SectorTile[];
  };
  techSupply: Technology[];
  techBag: Technology[];
  reputationBag: number[];
  discoveryBag: DiscoveryTile[];
  activeCombat: CombatState | null;
  pendingExplore: PendingExplore | null;
  pendingExploreActivations?: number; // for multi-activation explore (e.g. Planta)
  pendingDiscovery: PendingDiscovery | null;
  pendingCombatConquest: PendingCombatConquest | null;
  pendingArtifactReward?: PendingArtifactReward | null;
  pendingBankruptcy?: PendingBankruptcy | null;
  pendingActionConfirmation?: PendingActionConfirmation | null;
  pendingReputationDraw?: PendingReputationDraw | null;
  pendingReputationDrawQueue?: PendingReputationDraw[];
  resolvedCombatSectorIds?: string[];
  traitorPlayerId?: string;
  log: GameLogEntry[];
  winnerId?: string;
  finalScores?: Record<string, {
    sectors: number;
    reputation: number;
    ambassadors: number;
    techs: number;
    monoliths: number;
    discoveries: number;
    speciesBonus: number;
    traitor?: number;
    total: number;
  }>;
}
