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
  | 'eridani_empire'
  | 'wardens_of_magellan'
  | 'enlightened_of_lyra'
  | 'the_exiles'
  | 'rho_indi_syndicate';

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
  readonly exploreActivations?: number; // Base explore activations per Explore action disc (standard 1)
  readonly researchActivations?: number; // Base research activations per Research action disc (standard 1)
  readonly upgradeActivations?: number; // Base upgrade activations per Upgrade action disc (Humans 2, Mechanema 3)
  readonly buildActivations?: number; // Base build activations per Build action disc (standard 2)
  readonly moveActivations?: number; // Base move activations per Move action disc (Humans 3, Aliens 2)
  readonly influenceActivations?: number; // Base influence activations per Influence action disc (standard 2)
  readonly influenceColonyShipRefreshes?: number; // Colony ships flipped face-up during Influence action (standard 2, Magellan 1)
  readonly reputationSlots?: number; // Capacity of reputation track (4 for Eridani, Planta, Mechanema, Hydran, Draco; 5 for Orion and Terrans)
  readonly ambassadorSlots?: number; // Number of ambassador-eligible slots on reputation track (3 for Terrans/Planta/Draco/Mechanema, 4 for Orion/Hydran, 2 for Eridani)
  readonly reputationSlotTypes?: ReputationSlotType[];
}

export type ReputationSlotType = 'rep_only' | 'amb_only' | 'both';

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

export interface ShrineSlot {
  readonly row: number;
  readonly col: number;
  readonly costResource: 'science' | 'money' | 'materials';
  readonly costAmount: number;
  built: boolean;
  sectorId?: string;
  planetId?: string;
}

export interface ShrineBoardState {
  slots: ShrineSlot[][]; // 3 rows of 3 shrines (9 shrines total)
  rowBonusesClaimed: [boolean, boolean, boolean];
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
  ambassadorCubes?: Record<string, 'money' | 'science' | 'material'>; // Population cube assigned to each alliance
  keptDiscoveryTiles: DiscoveryTile[]; // 2 VP each at game end
  unlockedAncientParts: string[]; // Ancient ship parts unlocked from discoveries
  hasArtifactCodex?: boolean; // Remnants of Worlds Afar: +1 VP per controlled artifact at game end
  hasAncientMight?: boolean; // Remnants of Worlds Afar: +1 VP per 3 VP in reputation tiles at game end
  // Seekers Expansion
  magellanDiscoveryTile?: DiscoveryTile | null; // Facedown Discovery Tile on top Tech Track
  magellanDiscoveryResolved?: boolean;
  discoveryTilesUsedAsShipPartsCount?: number; // Magellan: +1 VP per Discovery Tile used as a Ship Part
  shrineBoard?: ShrineBoardState; // Lyra: 3x3 Shrine Board
  hasWormholeGeneratorAbility?: boolean; // Lyra: Row 1 bonus
  lyraExtraDiscClaimed?: boolean; // Lyra: Row 3 bonus (+1 disc)
  hasPassed: boolean;
  isFirstPasser: boolean;
  actionsTakenThisRound: number;
  graveyardShips: { type: string; count: number }[];
  graveyardCubes?: {
    money: number;
    science: number;
    material: number;
  };
  isEliminated?: boolean;
}
