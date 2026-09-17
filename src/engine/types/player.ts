/**
 * Player and Faction Types
 */

import { ShipBlueprint } from './blueprints';
import { PlayerTechTrack } from './tech';
import { DiscoveryTile } from './galaxy';

export type FactionId =
  | 'terran_federation'
  | 'terran_directorate'
  | 'terran_republic'
  | 'terran_conglomerate'
  | 'terran_union'
  | 'terran_alliance'
  | 'planta'
  | 'mechanema'
  | 'orion_hegemony'
  | 'descendants_of_draco'
  | 'hydran_progress'
  | 'eridani_empire';

export interface FactionInfo {
  readonly id: FactionId;
  readonly name: string;
  readonly isHuman: boolean;
  readonly defaultColor: string;
  readonly startingSectorNumber: number;
  readonly startingResources: {
    money: number;
    science: number;
    materials: number;
  };
  readonly startingDiscs: number; // usually 13 to 16
  readonly startingColonyShips: number; // usually 4
  readonly startingTechIds: string[];
  readonly traitDescription: string;
  readonly tradeRatio: number; // e.g. 2 means 2:1 trade for money
  readonly buildActivations?: number; // Base build activations per Build action disc (standard 2)
  readonly moveActivations?: number; // Base move activations per Move action disc (Humans 3, Aliens 2)
}

export interface PlayerResources {
  money: number;
  science: number;
  materials: number;
}

export interface PopulationTrack {
  // Number of cubes currently on the player board (unplaced).
  // Total cubes per track is typically 12. As cubes are placed on planets,
  // the remaining cubes on the board uncover higher income values.
  cubesOnBoard: number;
}

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionInfo;
  readonly color: string;
  resources: PlayerResources;
  blueprints: Record<string, ShipBlueprint>; // keyed by ship type: interceptor, cruiser, dreadnought, starbase
  techTrack: PlayerTechTrack;
  influenceTrack: {
    totalDiscs: number;
    discsOnTrack: number; // Uncovered upkeep = table lookup based on remaining discs
  };
  colonyShips: {
    total: number;
    ready: number;
  };
  population: {
    money: PopulationTrack;
    science: PopulationTrack;
    material: PopulationTrack;
  };
  reputationTiles: number[]; // Array of victory points drawn from bag (e.g. 1, 2, 3, 4)
  ambassadorTiles: string[]; // Player IDs of alliances
  keptDiscoveryTiles: DiscoveryTile[]; // 2 VP each at game end
  unlockedAncientParts: string[]; // Ancient ship parts unlocked from discoveries
  hasPassed: boolean;
  isFirstPasser: boolean;
  actionsTakenThisRound: number;
  graveyardShips: { type: string; count: number }[];
}
