/**
 * Warped Universe Expansion Rules & Layout Geometry
 * Official Eclipse: Second Dawn for the Galaxy
 *
 * Provides dense, balanced board layouts for 2–5 players using modular
 * Large Warp Sectors assembled from 9 Double-Hex tiles (18 hexes each).
 *
 * In accordance with official rules:
 * - Guardian Sectors are not used with this expansion.
 * - Flow lines act as 3 Ring-level wormhole conduits (Ring 1, Ring 2, Ring 3)
 *   directly connecting the left and right border sectors in 1 Move step.
 * - Ships do not stop inside the Warp Sector.
 */

import { HexCoord, HexEdge, SectorTile } from '../types/galaxy';
import { areCoordsEqual, hasWormholeOnEdge } from './hexMath';

export interface WarpConduit {
  id: string;
  sliceIndex: number;
  conduitIndex: number; // 1..12 from top to bottom
  coordA: HexCoord;
  edgeA: HexEdge;
  coordB: HexCoord;
  edgeB: HexEdge;
  warpCoordA?: HexCoord;
  warpEdgeA?: HexEdge;
  warpCoordB?: HexCoord;
  warpEdgeB?: HexEdge;
  ring?: number;
  label?: string;
}

export interface WarpSectorHex {
  q: number;
  r: number;
  tileIndex: number; // 1..9
  part: 'a' | 'b';
  hasMarker: boolean;
}

export interface LargeWarpSectorPlacement {
  id: string;
  sliceIndex: number; // 0..5
  apexCoord: HexCoord;
  rotation: number;
  conduits: WarpConduit[];
  hexes: WarpSectorHex[];
}

export type WarpedUniverseLayoutVariant = 'balanced_5p' | 'tighter_3p' | 'tighter_2p_4p';

export interface WarpedUniverseState {
  active: boolean;
  layoutVariant: WarpedUniverseLayoutVariant;
  warpSectors: LargeWarpSectorPlacement[];
  conduits: WarpConduit[];
}

/**
 * Rotates an axial coordinate (q, r) clockwise around (0, 0) by `steps` * 60 degrees.
 */
export function rotateAxialCoord(coord: HexCoord, steps: number = 1): HexCoord {
  let { q, r } = coord;
  const normalizedSteps = ((steps % 6) + 6) % 6;
  for (let i = 0; i < normalizedSteps; i++) {
    const nextQ = -r;
    const nextR = q + r;
    q = nextQ;
    r = nextR;
  }
  return { q, r };
}

/**
 * Rotates a HexEdge index (0..5) clockwise by `steps` * 60 degrees.
 */
export function rotateHexEdge(edge: HexEdge, steps: number = 1): HexEdge {
  const normalizedSteps = ((steps % 6) + 6) % 6;
  return ((edge + normalizedSteps) % 6) as HexEdge;
}

/**
 * 18 Base Hexes for the South Large Warp Sector (Slice 0), matching
 * the authentic 9 Double-Hex tiles geometry.
 */
export const BASE_SOUTH_WARP_SECTOR_HEXES: readonly WarpSectorHex[] = [
  // Tile 1
  { q: 0, r: 1, tileIndex: 1, part: 'a', hasMarker: true },
  { q: -1, r: 2, tileIndex: 1, part: 'b', hasMarker: false },
  // Tile 2
  { q: 0, r: 2, tileIndex: 2, part: 'a', hasMarker: true },
  { q: 1, r: 2, tileIndex: 2, part: 'b', hasMarker: false },
  // Tile 3
  { q: -1, r: 3, tileIndex: 3, part: 'a', hasMarker: true },
  { q: -2, r: 4, tileIndex: 3, part: 'b', hasMarker: false },
  // Tile 4
  { q: 0, r: 3, tileIndex: 4, part: 'a', hasMarker: true },
  { q: -1, r: 4, tileIndex: 4, part: 'b', hasMarker: false },
  // Tile 5
  { q: 1, r: 3, tileIndex: 5, part: 'a', hasMarker: true },
  { q: 2, r: 3, tileIndex: 5, part: 'b', hasMarker: false },
  // Tile 6
  { q: 0, r: 4, tileIndex: 6, part: 'a', hasMarker: true },
  { q: 0, r: 5, tileIndex: 6, part: 'b', hasMarker: false },
  // Tile 7
  { q: -2, r: 5, tileIndex: 7, part: 'a', hasMarker: true },
  { q: -1, r: 5, tileIndex: 7, part: 'b', hasMarker: false },
  // Tile 8
  { q: 1, r: 4, tileIndex: 8, part: 'a', hasMarker: true },
  { q: 2, r: 4, tileIndex: 8, part: 'b', hasMarker: false },
  // Tile 9
  { q: -3, r: 6, tileIndex: 9, part: 'a', hasMarker: true },
  { q: -2, r: 6, tileIndex: 9, part: 'b', hasMarker: false },
] as const;

/**
 * Base 12 authentic physical conduit flow lines for South Large Warp Sector (Slice 0).
 * Ordered from top to bottom (Conduits 1 through 12), connecting each of the 12 left
 * border edges to the corresponding 12 right border edges.
 */
export const BASE_SOUTH_CONDUITS: readonly {
  conduitIndex: number;
  warpCoordA: HexCoord;
  warpEdgeA: HexEdge;
  coordA: HexCoord;
  edgeA: HexEdge;
  warpCoordB: HexCoord;
  warpEdgeB: HexEdge;
  coordB: HexCoord;
  edgeB: HexEdge;
  ring: number;
}[] = [
  // Line 1: Apex top line (Ring 1 Left to Ring 1 Right)
  { conduitIndex: 1, warpCoordA: { q: 0, r: 1 }, warpEdgeA: 3, coordA: { q: -1, r: 1 }, edgeA: 0, warpCoordB: { q: 0, r: 1 }, warpEdgeB: 5, coordB: { q: 1, r: 0 }, edgeB: 2, ring: 1 },
  // Line 2: (Ring 1 Left to Ring 2 Right)
  { conduitIndex: 2, warpCoordA: { q: -1, r: 2 }, warpEdgeA: 4, coordA: { q: -1, r: 1 }, edgeA: 1, warpCoordB: { q: 0, r: 1 }, warpEdgeB: 0, coordB: { q: 1, r: 1 }, edgeB: 3, ring: 1 },
  // Line 3: (Ring 2 Left to Ring 2 Right)
  { conduitIndex: 3, warpCoordA: { q: -1, r: 2 }, warpEdgeA: 3, coordA: { q: -2, r: 2 }, edgeA: 0, warpCoordB: { q: 0, r: 2 }, warpEdgeB: 5, coordB: { q: 1, r: 1 }, edgeB: 2, ring: 2 },
  // Line 4: (Ring 3 Left to Ring 2 Right)
  { conduitIndex: 4, warpCoordA: { q: -1, r: 2 }, warpEdgeA: 2, coordA: { q: -2, r: 3 }, edgeA: 5, warpCoordB: { q: 1, r: 2 }, warpEdgeB: 4, coordB: { q: 1, r: 1 }, edgeB: 1, ring: 2 },
  // Line 5: (Ring 3 Left to Ring 3 Right)
  { conduitIndex: 5, warpCoordA: { q: -1, r: 3 }, warpEdgeA: 3, coordA: { q: -2, r: 3 }, edgeA: 0, warpCoordB: { q: 1, r: 2 }, warpEdgeB: 5, coordB: { q: 2, r: 1 }, edgeB: 2, ring: 3 },
  // Line 6: (Ring 3 Left to Outer Border Right)
  { conduitIndex: 6, warpCoordA: { q: -2, r: 4 }, warpEdgeA: 4, coordA: { q: -2, r: 3 }, edgeA: 1, warpCoordB: { q: 1, r: 2 }, warpEdgeB: 0, coordB: { q: 2, r: 2 }, edgeB: 3, ring: 3 },
  // Line 7: (Outer Border Left to Outer Border Right)
  { conduitIndex: 7, warpCoordA: { q: -2, r: 4 }, warpEdgeA: 3, coordA: { q: -3, r: 4 }, edgeA: 0, warpCoordB: { q: 1, r: 3 }, warpEdgeB: 5, coordB: { q: 2, r: 2 }, edgeB: 2, ring: 3 },
  // Line 8: (Outer Border Left to Outer Border Right)
  { conduitIndex: 8, warpCoordA: { q: -2, r: 4 }, warpEdgeA: 2, coordA: { q: -3, r: 5 }, edgeA: 5, warpCoordB: { q: 2, r: 3 }, warpEdgeB: 4, coordB: { q: 2, r: 2 }, edgeB: 1, ring: 3 },
  // Line 9: (Outer Rim Left to Outer Rim Right)
  { conduitIndex: 9, warpCoordA: { q: -2, r: 5 }, warpEdgeA: 3, coordA: { q: -3, r: 5 }, edgeA: 0, warpCoordB: { q: 2, r: 3 }, warpEdgeB: 5, coordB: { q: 3, r: 2 }, edgeB: 2, ring: 3 },
  // Line 10: (Outer Rim Left to Outer Rim Right)
  { conduitIndex: 10, warpCoordA: { q: -3, r: 6 }, warpEdgeA: 4, coordA: { q: -3, r: 5 }, edgeA: 1, warpCoordB: { q: 2, r: 3 }, warpEdgeB: 0, coordB: { q: 3, r: 3 }, edgeB: 3, ring: 3 },
  // Line 11: (Outer Rim Left to Outer Rim Right)
  { conduitIndex: 11, warpCoordA: { q: -3, r: 6 }, warpEdgeA: 3, coordA: { q: -4, r: 6 }, edgeA: 0, warpCoordB: { q: 2, r: 4 }, warpEdgeB: 5, coordB: { q: 3, r: 3 }, edgeB: 2, ring: 3 },
  // Line 12: (Outer Rim Base Left to Outer Rim Base Right)
  { conduitIndex: 12, warpCoordA: { q: -3, r: 6 }, warpEdgeA: 2, coordA: { q: -4, r: 7 }, edgeA: 5, warpCoordB: { q: 2, r: 4 }, warpEdgeB: 0, coordB: { q: 3, r: 4 }, edgeB: 3, ring: 3 },
] as const;

/**
 * Builds a Large Warp Sector placement rotated to the given slice index (0..5).
 */
export function createLargeWarpSectorPlacement(sliceIndex: number): LargeWarpSectorPlacement {
  const steps = ((sliceIndex % 6) + 6) % 6;
  const rotatedHexes: WarpSectorHex[] = BASE_SOUTH_WARP_SECTOR_HEXES.map((h) => {
    const rotated = rotateAxialCoord({ q: h.q, r: h.r }, steps);
    return {
      q: rotated.q,
      r: rotated.r,
      tileIndex: h.tileIndex,
      part: h.part,
      hasMarker: h.hasMarker,
    };
  });

  const rotatedConduits: WarpConduit[] = BASE_SOUTH_CONDUITS.map((c) => ({
    id: `warp_conduit_s${sliceIndex}_line_${c.conduitIndex}`,
    sliceIndex,
    conduitIndex: c.conduitIndex,
    coordA: rotateAxialCoord(c.coordA, steps),
    edgeA: rotateHexEdge(c.edgeA, steps),
    coordB: rotateAxialCoord(c.coordB, steps),
    edgeB: rotateHexEdge(c.edgeB, steps),
    warpCoordA: rotateAxialCoord(c.warpCoordA, steps),
    warpEdgeA: rotateHexEdge(c.warpEdgeA, steps),
    warpCoordB: rotateAxialCoord(c.warpCoordB, steps),
    warpEdgeB: rotateHexEdge(c.warpEdgeB, steps),
    ring: c.ring,
    label: `Conduit Line ${c.conduitIndex}`,
  }));

  const apexCoord = rotateAxialCoord({ q: 0, r: 1 }, steps);

  return {
    id: `large_warp_sector_${sliceIndex}`,
    sliceIndex,
    apexCoord,
    rotation: steps,
    conduits: rotatedConduits,
    hexes: rotatedHexes,
  };
}

/**
 * Returns player starting home sector coordinates for the Warped Universe board layouts.
 */
export function getWarpedUniverseStartingCoords(playerCount: number): HexCoord[] {
  if (playerCount === 5) {
    // Balanced 5-player layout: standard 6-fold grid with South (0, 2) occupied by Warp Sector
    return [
      { q: 0, r: -2 }, // Player 1 (North)
      { q: 2, r: -2 }, // Player 2 (North-East)
      { q: 2, r: 0 },  // Player 3 (East)
      { q: -2, r: 0 }, // Player 4 (West)
      { q: -2, r: 2 }, // Player 5 (South-West)
    ];
  }

  if (playerCount === 3) {
    // Tighter 3-player layout: 3 players alternating at 120-degree intervals with 3 Warp Sectors
    return [
      { q: 0, r: 2 },  // Player 1 (South)
      { q: -2, r: 0 }, // Player 2 (North-West)
      { q: 2, r: -2 }, // Player 3 (North-East)
    ];
  }

  if (playerCount === 4) {
    // Tighter 4-player layout: 2 top, 2 bottom, 2 Warp Sectors on East & West
    return [
      { q: 0, r: -2 }, // Player 1 (North)
      { q: 2, r: -2 }, // Player 2 (North-East)
      { q: -2, r: 2 }, // Player 3 (South-West)
      { q: 0, r: 2 },  // Player 4 (South)
    ];
  }

  if (playerCount === 2) {
    // Tighter 2-player layout: 1 top, 1 bottom, 2 Warp Sectors on East & West
    return [
      { q: 0, r: -2 }, // Player 1 (North)
      { q: 0, r: 2 },  // Player 2 (South)
    ];
  }

  // Fallback default
  return [{ q: 0, r: -2 }];
}

/**
 * Creates the complete Warped Universe layout state for the specified player count.
 */
export function createWarpedUniverseLayout(playerCount: number): WarpedUniverseState {
  if (playerCount === 5) {
    // Balanced 5-player: 1 Large Warp Sector at South (Slice 0)
    const warpSector0 = createLargeWarpSectorPlacement(0);
    return {
      active: true,
      layoutVariant: 'balanced_5p',
      warpSectors: [warpSector0],
      conduits: [...warpSector0.conduits],
    };
  }

  if (playerCount === 3) {
    // Tighter 3-player: 3 Large Warp Sectors at Slices 1, 3, 5
    const ws1 = createLargeWarpSectorPlacement(1); // South-West
    const ws3 = createLargeWarpSectorPlacement(3); // North
    const ws5 = createLargeWarpSectorPlacement(5); // South-East
    return {
      active: true,
      layoutVariant: 'tighter_3p',
      warpSectors: [ws1, ws3, ws5],
      conduits: [...ws1.conduits, ...ws3.conduits, ...ws5.conduits],
    };
  }

  // 2-player or 4-player (or default): Tighter layout with 2 Large Warp Sectors at West (Slice 2) & East (Slice 5)
  const wsWest = createLargeWarpSectorPlacement(2); // West
  const wsEast = createLargeWarpSectorPlacement(5); // East
  return {
    active: true,
    layoutVariant: 'tighter_2p_4p',
    warpSectors: [wsWest, wsEast],
    conduits: [...wsWest.conduits, ...wsEast.conduits],
  };
}

/**
 * Validates whether two sectors are connected via a Warped Universe conduit.
 */
export function areSectorsConnectedViaWarp(
  tileA: SectorTile,
  tileB: SectorTile,
  hasWormholeGenerator: boolean = false,
  conduits: WarpConduit[] = []
): boolean {
  if (!conduits || conduits.length === 0) return false;

  for (const c of conduits) {
    const matchForward = areCoordsEqual(tileA.coord, c.coordA) && areCoordsEqual(tileB.coord, c.coordB);
    const matchBackward = areCoordsEqual(tileA.coord, c.coordB) && areCoordsEqual(tileB.coord, c.coordA);

    if (matchForward || matchBackward) {
      const edgeA = matchForward ? c.edgeA : c.edgeB;
      const edgeB = matchForward ? c.edgeB : c.edgeA;

      const aHas = hasWormholeOnEdge(tileA, edgeA);
      const bHas = hasWormholeOnEdge(tileB, edgeB);

      if (hasWormholeGenerator) {
        return aHas || bHas;
      }
      return aHas && bHas;
    }
  }

  return false;
}

/**
 * Finds a matching conduit between two sector coordinates, if any exists.
 */
export function getWarpConduitBetween(
  coordA: HexCoord,
  coordB: HexCoord,
  conduits: WarpConduit[] = []
): WarpConduit | undefined {
  return conduits.find(
    (c) =>
      (areCoordsEqual(coordA, c.coordA) && areCoordsEqual(coordB, c.coordB)) ||
      (areCoordsEqual(coordA, c.coordB) && areCoordsEqual(coordB, c.coordA))
  );
}

/**
 * Checks if a specific coordinate and edge connects to a Warp Conduit.
 */
export function getWarpConduitForSectorEdge(
  coord: HexCoord,
  edge: HexEdge,
  conduits: WarpConduit[] = []
): { conduit: WarpConduit; targetCoord: HexCoord; targetEdge: HexEdge } | undefined {
  for (const c of conduits) {
    if (areCoordsEqual(coord, c.coordA) && edge === c.edgeA) {
      return { conduit: c, targetCoord: c.coordB, targetEdge: c.edgeB };
    }
    if (areCoordsEqual(coord, c.coordB) && edge === c.edgeB) {
      return { conduit: c, targetCoord: c.coordA, targetEdge: c.edgeA };
    }
  }
  return undefined;
}
