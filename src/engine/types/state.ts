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

export interface PendingCombatConquest {
  sectorId: string;
  winnerPlayerId: string;
  discoveryToClaim?: DiscoveryTile;
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
  pendingDiscovery: PendingDiscovery | null;
  pendingCombatConquest: PendingCombatConquest | null;
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
    total: number;
  }>;
}
