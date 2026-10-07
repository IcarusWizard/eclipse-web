/**
 * Official Eclipse: Second Dawn - Galactic Events Expansion
 * Sourced from the official Lautapelit.fi Galactic Events rules pamphlet and component scans.
 *
 * Includes 8 Sector Tiles across 4 Phenomena:
 * 1. Nebula: Sectors 295 (NGC 5189, Ring II) & 395 (NGC 1952, Ring III)
 *    - Divided into 3 Subsectors connected by internal Wormholes.
 *    - No Influence Space (cannot contain influence discs).
 *    - Discovery Tiles claimed at end of Combat Phase by ships in respective subsectors.
 * 2. Pulsar: Sectors 393 (Geminga, Ring III) & 394 (Simeis 147, Ring III)
 *    - Replaces normal influence space with 3 Action Spaces: Move (MOV), Build (BUI), Upgrade (UPG).
 *    - Disc starts on Move upon control.
 *    - Once per Round in place of normal Action: shift disc to another space and execute 1 activation.
 *    - Cannot be activated after passing.
 * 3. Black Hole: Sectors 396 (Cygnus X-1, Ring III) & 399 (V616 Mon, Ring III)
 *    - Only 1 Black Hole included per game.
 *    - First ship entering claims the Discovery Tile.
 *    - Ships entering end move and leave board into spacetime anomaly.
 *    - Yellow die roll: Star/Blank = immediate return + 1 damage; 2-3 = after 1 round; 4-5 = after 2 rounds.
 *    - Cygnus X-1 returns to any Ring I sector; V616 Mon returns to any sector with wormhole facing an empty zone.
 * 4. Supernova: Sectors 397 (Betelgeuse, Ring III) & 398 (Deneb, Ring III)
 *    - 5 Planet Slots: 1 Adv Money, 1 Adv Material, 1 Science, 2 Wild/Any.
 *    - Cleanup Phase Instability Check: 2 yellow dice + greatest tech count on any single track.
 *    - If sum < currentRound: explodes! All ships, structures, cubes, and disc removed.
 *    - Flipped / wormholes closed; accessible only via Wormhole Generator.
 */

import { HexCoord, HexEdge, SectorTile, SectorShip, DiscoveryTile, ShipType } from '../types/galaxy';
import { PlayerState } from '../types/player';
import { areCoordsEqual, getNeighborCoord, getRingFromCoord, hasWormholeOnEdge } from './hexMath';

export type PulsarActionSlot = 'move' | 'build' | 'upgrade';

export interface PulsarSectorState {
  currentSlot: PulsarActionSlot;
  activatedThisRound: boolean;
}

export interface SupernovaSectorState {
  isExploded: boolean;
  lastCheck?: {
    round: number;
    dice: [number, number];
    techBonus: number;
    sum: number;
    exploded: boolean;
  };
}

export interface BlackHoleDelayedShip {
  shipId: string;
  ownerId: string;
  shipType: ShipType;
  damage: number;
  returnRound: number;
  blackHoleSectorNumber: number;
  blackHoleSectorId: string;
}

export interface NebulaSubsectorState {
  subsectorIndex: 1 | 2 | 3;
  discoveryTile: DiscoveryTile | null;
  hasAncient: boolean;
  ships: SectorShip[];
}

export interface GalacticEventsState {
  active: boolean;
  selectedBlackHoleSector: number; // 396 or 399
  pulsars: Record<string, PulsarSectorState>; // sectorId -> PulsarSectorState
  supernovas: Record<string, SupernovaSectorState>; // sectorId -> SupernovaSectorState
  blackHoleDelayedShips: BlackHoleDelayedShip[];
  nebulaSubsectors: Record<string, NebulaSubsectorState[]>; // sectorId -> 3 subsectors
}

export interface GalacticEventsSectorConfig {
  sectorNum: number;
  name: string;
  ring: 2 | 3;
  vp: number;
  wh: boolean[];
  planets: { resource: 'money' | 'science' | 'material' | 'any'; isAdvanced: boolean }[];
  artifact: boolean;
  discovery: boolean;
  ancients: number;
  type: 'nebula' | 'pulsar' | 'black_hole' | 'supernova';
}

export const GALACTIC_EVENTS_CONFIGS: Record<number, GalacticEventsSectorConfig> = {
  // Nebula Sectors
  295: {
    sectorNum: 295,
    name: 'NGC 5189',
    ring: 2,
    vp: 0,
    wh: [true, true, true, true, true, true],
    planets: [],
    artifact: false,
    discovery: false, // Managed per subsector (Subsector 1 & 2 have discovery tiles)
    ancients: 0, // Managed per subsector (Subsector 3 has 1 ancient)
    type: 'nebula',
  },
  395: {
    sectorNum: 395,
    name: 'NGC 1952',
    ring: 3,
    vp: 0,
    wh: [true, true, true, true, true, true],
    planets: [],
    artifact: false,
    discovery: false,
    ancients: 0,
    type: 'nebula',
  },

  // Pulsar Sectors
  393: {
    sectorNum: 393,
    name: 'Geminga',
    ring: 3,
    vp: 1,
    wh: [true, true, false, true, false, false], // Edges 0 (E), 1 (SE), 3 (W)
    planets: [{ resource: 'science', isAdvanced: false }],
    artifact: false,
    discovery: false,
    ancients: 0,
    type: 'pulsar',
  },
  394: {
    sectorNum: 394,
    name: 'Simeis 147',
    ring: 3,
    vp: 1,
    wh: [true, true, false, true, false, false], // Edges 0 (E), 1 (SE), 3 (W)
    planets: [{ resource: 'material', isAdvanced: false }],
    artifact: false,
    discovery: false,
    ancients: 0,
    type: 'pulsar',
  },

  // Black Hole Sectors (only 1 used per game)
  396: {
    sectorNum: 396,
    name: 'Cygnus X-1',
    ring: 3,
    vp: 0,
    wh: [true, false, true, true, false, true], // 4 diagonal edges (0, 2, 3, 5)
    planets: [],
    artifact: false,
    discovery: true, // Claimed upon first ship entry
    ancients: 0,
    type: 'black_hole',
  },
  399: {
    sectorNum: 399,
    name: 'V616 Mon',
    ring: 3,
    vp: 0,
    wh: [true, false, true, true, false, true], // 4 diagonal edges (0, 2, 3, 5)
    planets: [],
    artifact: false,
    discovery: true, // Claimed upon first ship entry
    ancients: 0,
    type: 'black_hole',
  },

  // Supernova Sectors
  397: {
    sectorNum: 397,
    name: 'Betelgeuse',
    ring: 3,
    vp: 0,
    wh: [true, true, false, true, false, false], // Edges 0 (E), 1 (SE), 3 (W)
    planets: [
      { resource: 'money', isAdvanced: true },
      { resource: 'material', isAdvanced: true },
      { resource: 'science', isAdvanced: false },
      { resource: 'any', isAdvanced: false },
      { resource: 'any', isAdvanced: false },
    ],
    artifact: false,
    discovery: false,
    ancients: 0,
    type: 'supernova',
  },
  398: {
    sectorNum: 398,
    name: 'Deneb',
    ring: 3,
    vp: 0,
    wh: [true, true, false, true, false, false], // Edges 0 (E), 1 (SE), 3 (W)
    planets: [
      { resource: 'material', isAdvanced: true },
      { resource: 'money', isAdvanced: true },
      { resource: 'science', isAdvanced: false },
      { resource: 'any', isAdvanced: false },
      { resource: 'any', isAdvanced: false },
    ],
    artifact: false,
    discovery: false,
    ancients: 0,
    type: 'supernova',
  },
};

/**
 * Initializes the GalacticEventsState for a new game.
 */
export function createGalacticEventsState(selectedBlackHole?: number): GalacticEventsState {
  const chosenBH = selectedBlackHole === 396 || selectedBlackHole === 399
    ? selectedBlackHole
    : (Math.random() < 0.5 ? 396 : 399);

  return {
    active: true,
    selectedBlackHoleSector: chosenBH,
    pulsars: {},
    supernovas: {},
    blackHoleDelayedShips: [],
    nebulaSubsectors: {},
  };
}

/**
 * Creates SectorTile object from a GalacticEventsSectorConfig.
 */
export function createGalacticEventSectorTile(sectorNum: number): SectorTile {
  const cfg = GALACTIC_EVENTS_CONFIGS[sectorNum];
  if (!cfg) throw new Error(`Unknown Galactic Events sector ${sectorNum}`);

  const isNebula = cfg.type === 'nebula';
  const isPulsar = cfg.type === 'pulsar';
  const isSupernova = cfg.type === 'supernova';
  const isBlackHole = cfg.type === 'black_hole';

  const ancientShips = isNebula
    ? [
        {
          id: `ancient_${cfg.sectorNum}_sub3`,
          ownerId: 'ancient',
          type: 'ancient' as const,
          damage: 0,
          subsector: 3 as const,
        },
      ]
    : [];

  return {
    id: `sector_${cfg.sectorNum}`,
    sectorNumber: cfg.sectorNum,
    name: cfg.name,
    ring: cfg.ring,
    coord: { q: 999, r: 999 },
    rotation: 0,
    wormholes: [...cfg.wh],
    planets: cfg.planets.map((p, pIdx) => ({
      id: `p_${cfg.sectorNum}_${pIdx + 1}`,
      resource: p.resource,
      isAdvanced: p.isAdvanced,
    })),
    victoryPoints: cfg.vp,
    hasArtifact: cfg.artifact,
    hasDiscovery: cfg.discovery || isNebula || isBlackHole,
    ancientsCount: isNebula ? 1 : cfg.ancients,
    ships: ancientShips,
    isNebula,
    isPulsar,
    pulsarSlot: isPulsar ? 'move' : undefined,
    isSupernova,
    isSupernovaExploded: isSupernova ? false : undefined,
    isBlackHole,
    blackHoleType: isBlackHole ? (cfg.sectorNum === 396 ? 'inner_ring' : 'empty_zone_adjacent') : undefined,
    subsectors: isNebula
      ? [
          { subsectorIndex: 1, discoveryTile: null, hasAncient: false, ships: [] },
          { subsectorIndex: 2, discoveryTile: null, hasAncient: false, ships: [] },
          { subsectorIndex: 3, discoveryTile: null, hasAncient: true, ships: [...ancientShips] },
        ]
      : undefined,
  };
}

/**
 * Roll a standard Eclipse Yellow Combat Die (Ion Cannon):
 * Faces: 1 = Star (Hit), 2 = 2, 3 = 3, 4 = 4, 5 = 5, 6 = Blank.
 */
export function rollYellowDie(randomFn: () => number = Math.random): {
  face: number;
  value: number; // 2..5 (or 0 for Star/Blank)
  isStar: boolean;
  isBlank: boolean;
} {
  const roll = Math.floor(randomFn() * 6) + 1;
  const isStar = roll === 1;
  const isBlank = roll === 6;
  const value = isStar || isBlank ? 0 : roll;
  return { face: roll, value, isStar, isBlank };
}

/**
 * Supernova Instability Check:
 * Rolls 2 yellow dice, adds greatest tech count across Military, Grid, and Nano tracks.
 * If sum < currentRound, Supernova explodes!
 */
export function evaluateSupernovaStability(
  controllingPlayer: PlayerState | undefined,
  currentRound: number,
  randomFn: () => number = Math.random
): {
  dice: [number, number];
  techBonus: number;
  sum: number;
  exploded: boolean;
} {
  const d1 = rollYellowDie(randomFn);
  const d2 = rollYellowDie(randomFn);
  const diceValues: [number, number] = [d1.value, d2.value];

  let techBonus = 0;
  if (controllingPlayer?.techTrack) {
    const milTechs = controllingPlayer.techTrack.militaryCount ?? 0;
    const gridTechs = controllingPlayer.techTrack.gridCount ?? 0;
    const nanoTechs = controllingPlayer.techTrack.nanoCount ?? 0;
    techBonus = Math.max(milTechs, gridTechs, nanoTechs);
  }

  const sum = d1.value + d2.value + techBonus;
  const exploded = sum < currentRound;

  return {
    dice: diceValues,
    techBonus,
    sum,
    exploded,
  };
}

/**
 * Calculates yellow die outcome when a ship enters a Black Hole:
 * - Star (1) or Blank (6): Returns immediately, takes 1 damage.
 * - 2 or 3: Returns after 1 round (round + 1).
 * - 4 or 5: Returns after 2 rounds (round + 2).
 */
export function evaluateBlackHoleEntry(
  currentRound: number,
  randomFn: () => number = Math.random
): {
  face: number;
  immediate: boolean;
  damage: number;
  returnRound: number;
} {
  const roll = rollYellowDie(randomFn);
  if (roll.isStar || roll.isBlank) {
    return {
      face: roll.face,
      immediate: true,
      damage: 1,
      returnRound: currentRound,
    };
  } else if (roll.face === 2 || roll.face === 3) {
    return {
      face: roll.face,
      immediate: false,
      damage: 0,
      returnRound: currentRound + 1,
    };
  } else {
    // 4 or 5
    return {
      face: roll.face,
      immediate: false,
      damage: 0,
      returnRound: currentRound + 2,
    };
  }
}

/**
 * Returns all legal sector destinations for ships returning from a Black Hole:
 * - Sector 396 (Cygnus X-1): Any Inner (I) sector (ring === 1).
 * - Sector 399 (V616 Mon): Any sector with at least one wormhole adjacent to an empty Zone.
 */
export function getLegalBlackHoleReturnSectors(
  blackHoleSectorNumber: number,
  allSectors: SectorTile[]
): SectorTile[] {
  if (blackHoleSectorNumber === 396) {
    return allSectors.filter((s) => s.ring === 1);
  }

  // Sector 399: Any sector having at least one wormhole edge facing an empty space (Zone) without a sector
  return allSectors.filter((sec) => {
    for (let edge = 0; edge < 6; edge++) {
      if (hasWormholeOnEdge(sec, edge as HexEdge)) {
        const neighbor = getNeighborCoord(sec.coord, edge as HexEdge);
        const ring = getRingFromCoord(neighbor);
        if (ring >= 1 && ring <= 3) {
          const exists = allSectors.some((s) => areCoordsEqual(s.coord, neighbor));
          if (!exists) {
            return true;
          }
        }
      }
    }
    return false;
  });
}

/**
 * Subsector mapping for Nebula wedges:
 * Outer edges:
 * - Subsector 1 (Top-Left): outer edges 4 (NW) & 5 (NE)
 * - Subsector 2 (Bottom-Left): outer edges 2 (SW) & 3 (W)
 * - Subsector 3 (Right): outer edges 0 (E) & 1 (SE)
 */
export function getNebulaSubsectorForOuterEdge(edge: HexEdge): 1 | 2 | 3 {
  if (edge === 4 || edge === 5) return 1;
  if (edge === 2 || edge === 3) return 2;
  return 3;
}
