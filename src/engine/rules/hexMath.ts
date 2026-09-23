/**
 * Hexagonal Math & Geometry for Eclipse: Second Dawn
 * Pointy-topped hexes with axial coordinates (q, r)
 */

import { HexCoord, HexEdge, SectorTile } from '../types/galaxy';

export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },  // 0: East (0°)
  { q: 0, r: 1 },  // 1: South-East (60°)
  { q: -1, r: 1 }, // 2: South-West (120°)
  { q: -1, r: 0 }, // 3: West (180°)
  { q: 0, r: -1 }, // 4: North-West (240°)
  { q: 1, r: -1 }, // 5: North-East (300°)
] as const;

export function getNeighborCoord(coord: HexCoord, edge: HexEdge): HexCoord {
  const dir = HEX_DIRECTIONS[edge];
  return { q: coord.q + dir.q, r: coord.r + dir.r };
}

export function areCoordsEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function getHexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - (b.q + b.r)) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function getRingFromCoord(coord: HexCoord): 0 | 1 | 2 | 3 {
  const dist = getHexDistance({ q: 0, r: 0 }, coord);
  if (dist === 0) return 0;
  if (dist === 1) return 1;
  if (dist === 2) return 2;
  return 3;
}

export function getOppositeEdge(edge: HexEdge): HexEdge {
  return ((edge + 3) % 6) as HexEdge;
}

export function getEdgeBetween(from: HexCoord, to: HexCoord): HexEdge | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  for (let i = 0; i < 6; i++) {
    const dir = HEX_DIRECTIONS[i];
    if (dir.q === dq && dir.r === dr) {
      return i as HexEdge;
    }
  }
  return null;
}

/**
 * Returns the edge index (0..5) on `coord` whose neighbor is closest to the Galactic Center (0, 0).
 * In Eclipse setup, starting sector tiles are placed with their wormhole arrow pointing towards the Galactic Center.
 */
export function getEdgeTowardCenter(coord: HexCoord): HexEdge {
  let bestEdge: HexEdge = 0;
  let minDistance = Infinity;
  for (let edge = 0; edge < 6; edge++) {
    const neighbor = getNeighborCoord(coord, edge as HexEdge);
    const dist = getHexDistance(neighbor, { q: 0, r: 0 });
    if (dist < minDistance) {
      minDistance = dist;
      bestEdge = edge as HexEdge;
    }
  }
  return bestEdge;
}

/**
 * Checks if a tile has a wormhole on edge `e` taking into account its rotation.
 * In a clockwise rotation of `rot` steps, edge `e` corresponds to base edge `(e - rot + 6) % 6`.
 */
export function hasWormholeOnEdge(tile: SectorTile, edge: HexEdge): boolean {
  const baseIndex = ((edge - tile.rotation) % 6 + 6) % 6;
  return !!tile.wormholes[baseIndex];
}

/**
 * Validates whether two adjacent sectors share an open wormhole connection.
 */
export function areSectorsConnected(
  tileA: SectorTile,
  tileB: SectorTile,
  hasWormholeGenerator: boolean = false
): boolean {
  // Warp Portal connects to all other Warp Portal sectors (Sectors 281, 381, 382 and discovery/structure portals)
  const isWarpA =
    tileA.hasWarpPortal ||
    ['281', '381', '382'].includes(String(tileA.sectorNumber)) ||
    !!tileA.structures?.warpPortal;
  const isWarpB =
    tileB.hasWarpPortal ||
    ['281', '381', '382'].includes(String(tileB.sectorNumber)) ||
    !!tileB.structures?.warpPortal;

  if (isWarpA && isWarpB) {
    return true;
  }

  const edgeAtoB = getEdgeBetween(tileA.coord, tileB.coord);
  if (edgeAtoB === null) return false;

  const edgeBtoA = getOppositeEdge(edgeAtoB);
  const aHas = hasWormholeOnEdge(tileA, edgeAtoB);
  const bHas = hasWormholeOnEdge(tileB, edgeBtoA);

  if (hasWormholeGenerator) {
    // Wormhole generator allows traversing if at least one side has an open wormhole
    return aHas || bHas;
  }
  return aHas && bHas;
}

/**
 * Finds the best legal rotation (0-5) for a candidate sector tile being placed
 * at `targetCoord` explored from `sourceSector`.
 *
 * Rules:
 * - A legal placement must connect an open wormhole on the new tile with the
 *   wormhole of the exploring source sector (or satisfy Wormhole Generator tech).
 * - Full two-way wormhole connections receive highest priority (+100 score).
 * - Additional open wormhole connections formed with other existing adjacent sectors
 *   on the map grant bonus score (+10 each) to maximize player connectivity.
 * - Falls back to 0 if no rotation connects.
 */
export function findLegalExploreRotation(
  sourceSector: SectorTile,
  candidateTile: SectorTile,
  targetCoord: HexCoord,
  hasWormholeGenerator: boolean = false,
  allSectors?: SectorTile[]
): number {
  let bestRot = -1;
  let maxScore = -1;

  for (let rot = 0; rot < 6; rot++) {
    const testTile: SectorTile = {
      ...candidateTile,
      coord: targetCoord,
      rotation: rot,
    };

    const edgeAtoB = getEdgeBetween(sourceSector.coord, targetCoord);
    if (edgeAtoB === null) continue;

    const edgeBtoA = getOppositeEdge(edgeAtoB);
    const aHas = hasWormholeOnEdge(sourceSector, edgeAtoB);
    const bHas = hasWormholeOnEdge(testTile, edgeBtoA);

    const isConnected = hasWormholeGenerator ? (aHas || bHas) : (aHas && bHas);
    if (!isConnected) continue;

    let score = 0;
    if (aHas && bHas) {
      score += 100;
    } else {
      score += 50;
    }

    // Bonus for connecting to other already-placed sectors on the board
    if (allSectors) {
      for (const other of allSectors) {
        if (areCoordsEqual(other.coord, sourceSector.coord)) continue;
        if (areSectorsConnected(other, testTile, false)) {
          score += 10;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestRot = rot;
    }
  }

  return bestRot >= 0 ? bestRot : 0;
}

/**
 * Finds the next legal rotation after `currentRotation` (clockwise).
 * Returns `currentRotation` if no legal rotation exists.
 */
export function findNextLegalExploreRotation(
  sourceSector: SectorTile,
  candidateTile: SectorTile,
  targetCoord: HexCoord,
  currentRotation: number,
  hasWormholeGenerator: boolean = false
): number {
  for (let step = 1; step <= 6; step++) {
    const rot = (currentRotation + step) % 6;
    const testTile: SectorTile = {
      ...candidateTile,
      coord: targetCoord,
      rotation: rot,
    };
    if (areSectorsConnected(sourceSector, testTile, hasWormholeGenerator)) {
      return rot;
    }
  }
  return currentRotation;
}

/**
 * Converts axial hex coord to 2D pixel coordinates for SVG/Canvas rendering.
 * Pointy-topped hex formula:
 * x = size * (sqrt(3) * q + sqrt(3)/2 * r)
 * y = size * (3/2 * r)
 */
export function hexToPixel(coord: HexCoord, hexRadius: number = 80): { x: number; y: number } {
  const x = hexRadius * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = hexRadius * ((3 / 2) * coord.r);
  return { x, y };
}

/**
 * Generates polygon point coordinates for a pointy-topped regular hexagon.
 */
export function getHexCornerPoints(centerX: number, centerY: number, radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // 30 degree offset for pointy-topped hexes
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * Calculates edge center point for drawing wormhole indicators.
 */
export function getHexEdgeCenter(
  centerX: number,
  centerY: number,
  radius: number,
  edge: HexEdge
): { x: number; y: number; angle: number } {
  // Edge 0 is NE (between corner at -30 deg and corner at 30 deg -> center at 0 deg)
  const angleDeg = edge * 60;
  const angleRad = (Math.PI / 180) * angleDeg;
  // Distance from center to edge midpoint is apothem = radius * cos(30 deg)
  const apothem = radius * Math.cos(Math.PI / 6);
  return {
    x: centerX + apothem * Math.cos(angleRad),
    y: centerY + apothem * Math.sin(angleRad),
    angle: angleDeg,
  };
}
