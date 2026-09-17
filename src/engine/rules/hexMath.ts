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
