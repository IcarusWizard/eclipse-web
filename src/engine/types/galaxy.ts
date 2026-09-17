/**
 * Hexagonal Galaxy and Sector Types
 * Axial coordinates (q, r) where q is column, r is row.
 * In a flat-topped / pointy-topped orientation, we'll use pointy-topped hexes.
 * 6 Edges:
 * 0: North-East (q+1, r-1)
 * 1: East       (q+1, r)
 * 2: South-East (q, r+1)
 * 3: South-West (q-1, r+1)
 * 4: West       (q-1, r)
 * 5: North-West (q, r-1)
 */

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

export type HexEdge = 0 | 1 | 2 | 3 | 4 | 5;

export type PlanetResourceType = 'money' | 'science' | 'material' | 'any';

export interface PlanetSlot {
  readonly id: string;
  readonly resource: PlanetResourceType;
  readonly isAdvanced: boolean; // Gray slot requiring Advanced Economy / Mining / Labs
  readonly isOrbital?: boolean; // Orbital structure slot
  colonizedBy?: string; // Player ID who has a population cube here
}

export type ShipType = 'interceptor' | 'cruiser' | 'dreadnought' | 'starbase';

export interface SectorShip {
  readonly id: string;
  readonly ownerId: string; // Player ID or 'ancient' | 'gcds' | 'guardian'
  readonly type: ShipType | 'ancient' | 'gcds' | 'guardian';
  damage: number;
}

export interface SectorTile {
  readonly id: string;
  readonly sectorNumber: number;
  readonly name?: string;
  readonly ring: 0 | 1 | 2 | 3; // 0 = Center (001), 1 = Inner (101-110), 2 = Middle (201-214, 281), 3 = Outer (301-318, 381-382)
  coord: HexCoord;
  rotation: number; // 0 to 5 (each step is 60 degrees clockwise)
  wormholes: boolean[]; // Array of 6 booleans for edges 0..5
  planets: PlanetSlot[];
  victoryPoints: number;
  hasArtifact: boolean;
  hasDiscovery: boolean;
  discoveryClaimed?: boolean;
  discoveryReward?: string;
  discoveryTile?: DiscoveryTile;
  ancientsCount: number;
  hasGCDS?: boolean;
  discOwner?: string; // Player ID holding influence on this sector
  ships: SectorShip[];
  structures?: {
    monolith?: boolean;
    orbital?: boolean;
  };
}

export interface DiscoveryTile {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly immediateReward?: {
    money?: number;
    science?: number;
    materials?: number;
    victoryPoints?: number;
    shipPart?: string;
    grantShipType?: ShipType;
  };
  readonly shipPartId?: string; // Ancient part like Ion Turret, Flux Shield, etc.
}
