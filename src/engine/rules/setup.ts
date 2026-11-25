/**
 * Initial Game Setup for Eclipse: Second Dawn
 * Supports 1-6 players with prioritized Human Factions.
 */

import { GameState, PendingDiscovery } from '../types/state';
import { FactionInfo, PlayerState, ReputationSlotType, ShrineBoardState } from '../types/player';
import { SectorTile, HexCoord, SectorShip, DiscoveryTile } from '../types/galaxy';
import { CENTER_SECTOR, HUMAN_HOME_SECTORS, ALL_HOME_SECTORS, DISCOVERY_TILES, RIFT_CONDUCTOR_DISCOVERY, REMNANTS_DISCOVERY_TILES, GUARDIAN_SECTORS, generateSectorDecks } from './sectorData';
import { TECH_CATALOG, createInitialTechBag, drawTechTilesForSetup, drawTechTilesForRound } from './techData';
import { createDefaultHumanBlueprints, createFactionBlueprints } from './shipValidation';
import { getEdgeTowardCenter } from './hexMath';
import {
  NeutralShipConfig,
  NeutralShipSelectionConfig,
  resolveNeutralShipConfig,
} from './neutralShips';
import {
  createInitialMinorSpeciesSupply,
  ALL_MINOR_SPECIES_TILES,
} from './minorSpecies';
import {
  createWarpedUniverseLayout,
  getWarpedUniverseStartingCoords,
} from './warpedUniverse';
export { getWarpedUniverseStartingCoords };
import { createGalacticEventsState } from './galacticEvents';
import { commitReplayStep } from './replay';

export const ECLIPSE_COLOR_PALETTE = {
  red: '#dc2626',
  blue: '#0284c7',
  green: '#16a34a',
  yellow: '#eab308',
  white: '#f8fafc',
  black: '#18181b',
  purple: '#9333ea', // legacy fallback
  orange: '#ea580c', // legacy fallback
  teal: '#0d9488', // The Exiles
  amber: '#d97706', // Rho Indi Syndicate
  cyan: '#06b6d4', // Atlantians
  indigo: '#6366f1', // Mega War Inc.
  magenta: '#ec4899', // Remnants of Ra
  lime: '#84cc16', // The Horde
  ice: '#7dd3fc', // The Spiral
} as const;

export type FactionColorGroup = 'red' | 'blue' | 'green' | 'yellow' | 'white' | 'black' | 'purple' | 'orange' | 'teal' | 'amber' | 'cyan' | 'indigo' | 'magenta' | 'lime' | 'ice';

export const FACTION_COLOR_GROUP: Record<string, FactionColorGroup> = {
  // Red
  eridani_empire: 'red',
  terran_directorate: 'red',
  // Blue
  hydran_progress: 'blue',
  terran_federation: 'blue',
  // Green
  planta: 'green',
  terran_conglomerate: 'green',
  // Yellow
  descendants_of_draco: 'yellow',
  terran_republic: 'yellow',
  // White
  mechanema: 'white',
  terran_union: 'white',
  // Black
  orion_hegemony: 'black',
  terran_alliance: 'black',
  // Seekers
  wardens_of_magellan: 'purple',
  enlightened_of_lyra: 'orange',
  // Outcasts
  the_exiles: 'teal',
  rho_indi_syndicate: 'amber',
  // Community Factions
  atlantians: 'cyan',
  mega_war_inc: 'indigo',
  remnants_of_ra: 'magenta',
  the_horde: 'lime',
  the_spiral: 'ice',
};

export const FACTION_COLOR_MAP: Record<string, string> = {
  eridani_empire: ECLIPSE_COLOR_PALETTE.red,
  terran_directorate: ECLIPSE_COLOR_PALETTE.red,
  hydran_progress: ECLIPSE_COLOR_PALETTE.blue,
  terran_federation: ECLIPSE_COLOR_PALETTE.blue,
  planta: ECLIPSE_COLOR_PALETTE.green,
  terran_conglomerate: ECLIPSE_COLOR_PALETTE.green,
  descendants_of_draco: ECLIPSE_COLOR_PALETTE.yellow,
  terran_republic: ECLIPSE_COLOR_PALETTE.yellow,
  mechanema: ECLIPSE_COLOR_PALETTE.white,
  terran_union: ECLIPSE_COLOR_PALETTE.white,
  orion_hegemony: ECLIPSE_COLOR_PALETTE.black,
  terran_alliance: ECLIPSE_COLOR_PALETTE.black,
  wardens_of_magellan: ECLIPSE_COLOR_PALETTE.purple,
  enlightened_of_lyra: ECLIPSE_COLOR_PALETTE.orange,
  the_exiles: ECLIPSE_COLOR_PALETTE.teal,
  rho_indi_syndicate: ECLIPSE_COLOR_PALETTE.amber,
  atlantians: ECLIPSE_COLOR_PALETTE.cyan,
  mega_war_inc: ECLIPSE_COLOR_PALETTE.indigo,
  remnants_of_ra: ECLIPSE_COLOR_PALETTE.magenta,
  the_horde: ECLIPSE_COLOR_PALETTE.lime,
  the_spiral: ECLIPSE_COLOR_PALETTE.ice,
};

export function getFactionColor(factionId: string): string {
  return FACTION_COLOR_MAP[factionId] || '#94a3b8';
}

export function areFactionsConflictingColor(factionIdA: string, factionIdB: string): boolean {
  if (factionIdA === factionIdB) return true;
  const groupA = FACTION_COLOR_GROUP[factionIdA];
  const groupB = FACTION_COLOR_GROUP[factionIdB];
  return Boolean(groupA && groupB && groupA === groupB);
}

export const HUMAN_FACTIONS: FactionInfo[] = [
  {
    id: 'terran_federation',
    name: 'Terran Federation',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.blue, // Blue (Paired with Hydran Progress)
    startingSectorNumber: 221,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Balanced expansion and veteran colonial leadership.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'terran_directorate',
    name: 'Terran Directorate',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.red, // Red (Paired with Eridani Empire)
    startingSectorNumber: 222,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Advanced military logistics and standardized fleet doctrines.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'terran_republic',
    name: 'Terran Republic',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.yellow, // Yellow (Paired with Descendants of Draco)
    startingSectorNumber: 223,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Democratic scientific initiative and rapid technological scaling.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'terran_conglomerate',
    name: 'Terran Conglomerate',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.green, // Green (Paired with Planta)
    startingSectorNumber: 224,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Industrial powerhouse with high initial commerce liquidity.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'terran_union',
    name: 'Terran Union',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.white, // White (Paired with Mechanema)
    startingSectorNumber: 225,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'United academic council specialized in hyper-lane cartography.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'terran_alliance',
    name: 'Terran Alliance',
    isHuman: true,
    defaultColor: ECLIPSE_COLOR_PALETTE.black, // Black (Paired with Orion Hegemony)
    startingSectorNumber: 226,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Cooperative defense pact with robust colonial networks.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
];

// Ring 2 starting coordinates for balanced symmetrical layouts around Center (0, 0)
export const STARTING_COORDS_BY_COUNT: Record<number, HexCoord[]> = {
  1: [{ q: 0, r: -2 }],
  2: [
    { q: 0, r: -2 },
    { q: 0, r: 2 },
  ],
  3: [
    { q: 0, r: -2 },
    { q: 2, r: 0 },
    { q: -2, r: 2 },
  ],
  4: [
    { q: 0, r: -2 },
    { q: 2, r: -2 },
    { q: 0, r: 2 },
    { q: -2, r: 2 },
  ],
  5: [
    { q: 0, r: -2 },
    { q: 2, r: -2 },
    { q: 2, r: 0 },
    { q: 0, r: 2 },
    { q: -2, r: 2 },
  ],
  6: [
    { q: 0, r: -2 },
    { q: 2, r: -2 },
    { q: 2, r: 0 },
    { q: 0, r: 2 },
    { q: -2, r: 2 },
    { q: -2, r: 0 },
  ],
};

export const ALIEN_FACTIONS: FactionInfo[] = [
  {
    id: 'eridani_empire',
    name: 'Eridani Empire',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.red, // Red
    startingSectorNumber: 222,
    startingResources: { money: 26, science: 2, materials: 4 },
    startingDiscs: 11, // 2 fewer than normal 13
    startingColonyShips: 3,
    startingTechIds: ['gauss_shield', 'fusion_drive', 'plasma_cannon'],
    traitDescription: 'Ancient fallen empire with 26 credits treasury and Fusion Drive/Plasma Cannon, but only 11 discs.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'hydran_progress',
    name: 'Hydran Progress',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.blue, // Blue
    startingSectorNumber: 224,
    startingResources: { money: 2, science: 6, materials: 2 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['advanced_labs'],
    traitDescription: 'Scientific prodigies who research 2 technologies per Research action and start with Advanced Labs.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 2,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both'],
  },
  {
    id: 'planta',
    name: 'Planta',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.green, // Green
    startingSectorNumber: 226,
    startingResources: { money: 2, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 4,
    startingTechIds: ['starbase'],
    traitDescription: 'Rapid vegetative spread with 2 Explore activations per action and +1 bonus VP per controlled sector.',
    tradeRatio: 3,
    exploreActivations: 2,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both'],
  },
  {
    id: 'descendants_of_draco',
    name: 'Descendants of Draco',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.yellow, // Yellow
    startingSectorNumber: 228,
    startingResources: { money: 2, science: 4, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['fusion_drive'],
    traitDescription: 'Peaceful coexistence with Ancients, dual explore sector picks, starts with Fusion Drive, and +1 VP per Ancient at game end.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'mechanema',
    name: 'Mechanema',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.white, // White
    startingSectorNumber: 230,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['positron_computer'],
    traitDescription: 'Automated shipyards with discounted construction costs, 3 Upgrade and 3 Build activations per action.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 3,
    buildActivations: 3,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'orion_hegemony',
    name: 'Orion Hegemony',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.black, // Black
    startingSectorNumber: 232,
    startingResources: { money: 3, science: 3, materials: 4 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['neutron_bombs', 'gauss_shield'],
    traitDescription: 'Martial conquerors starting with a Cruiser, boosted ship base initiative, and bonus energy output.',
    tradeRatio: 4,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both', 'rep_only'],
  },
  {
    id: 'wardens_of_magellan',
    name: 'Wardens of Magellan',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.purple,
    startingSectorNumber: 233,
    startingResources: { money: 2, science: 2, materials: 3 },
    startingDiscs: 13, // 16 discs total: 1 on starting sector, 12 on track, 3 in tray
    startingColonyShips: 3,
    startingTechIds: ['fusion_source'],
    traitDescription: 'Nomadic worldship scavengers who convert Colony Ships to resources at any time, resolve a Tech Track Discovery Tile upon researching 4 techs, and score +1 VP per Discovery Tile used as a Ship Part.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    influenceColonyShipRefreshes: 1,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'enlightened_of_lyra',
    name: 'Enlightened of Lyra',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.orange,
    startingSectorNumber: 238,
    startingResources: { money: 2, science: 4, materials: 3 },
    startingDiscs: 13, // 17 discs total: 1 on starting sector, 12 on track, 4 in tray
    startingColonyShips: 3,
    startingTechIds: ['fusion_source'],
    traitDescription: 'Spiritual ascetics with a 3x3 Shrine Board (built during Research to unlock Wormhole Generator, Discovery Tile, and +1 Disc), combat die rerolls via Colony Ships, and +1 VP per controlled Shrine.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'the_exiles',
    name: 'The Exiles',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.teal,
    startingSectorNumber: 234,
    startingResources: { money: 3, science: 2, materials: 4 },
    startingDiscs: 13, // 16 discs total: 1 on starting sector, 12 on track, 3 in tray
    startingColonyShips: 3,
    startingTechIds: ['cloaking_device', 'orbital'],
    traitDescription: 'Nomadic orbital dwellers whose Orbitals are armed ships with 3-slot blueprints (outside module: 2 Hulls + 4 Power). Cannot construct Starbases. +1 VP per Orbital with your population cube at game end.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 3,
    reputationSlotTypes: ['both', 'both', 'both', 'rep_only'],
  },
  {
    id: 'rho_indi_syndicate',
    name: 'Rho Indi Syndicate',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.amber,
    startingSectorNumber: 236,
    startingResources: { money: 2, science: 3, materials: 3 },
    startingDiscs: 13, // 16 discs total: 1 on starting sector, 12 on track, 3 in tray
    startingColonyShips: 2,
    startingTechIds: ['starbase', 'gauss_shield'],
    traitDescription: 'Ruthless raiders with 4 Move activations, 2 starting Interceptors, preprinted Gauss Shields on all ships, Traitor Card immunity, reputation tile money bounties, and 3:2 Money trading. Cannot construct Dreadnoughts.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 4,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 2,
    reputationSlotTypes: ['both', 'both', 'rep_only', 'rep_only', 'rep_only'],
  },
  {
    id: 'atlantians',
    name: 'Atlantians',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.cyan,
    startingSectorNumber: 266,
    startingResources: { money: 3, science: 3, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['ancient_labs'],
    traitDescription: 'Ancient Spirit (draw 2 discovery tiles & choose 1, discarding +6 Materials or Ancient Cruiser), start with Ancient Labs, Research grants optional Upgrade 1 with researched tech, +1 VP per discovery tile on ships, and +1 Material ship cost per extra discovery tile.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'mega_war_inc',
    name: 'Mega War Inc.',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.indigo,
    startingSectorNumber: 221,
    startingResources: { money: 2, science: 3, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Terran corporate militarists: unused Terran homeworld, 1 Upgrade (modular linked chassis across Interceptor/Cruiser/Dreadnought/Starbase), Build field-upgrade Interceptor→Cruiser / Cruiser→Dreadnought (3 Mats anywhere), Military (-1..6 VP) & 6-slot Nano (4 VP) tracks, no Monoliths, no immediate Ancient equips.',
    tradeRatio: 2,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 1,
    buildActivations: 2,
    moveActivations: 3,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 5,
    reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
  },
  {
    id: 'remnants_of_ra',
    name: 'Remnants of Ra',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.magenta,
    startingSectorNumber: 255,
    startingResources: { money: 2, science: 3, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['plasma_cannon'],
    traitDescription: 'Ancient sun-worshippers of Osiris Seth (Sector 255): start with Plasma Cannon, 4:1 Trade, INF 2 (1 Colony Ship refresh); Power of the Ancients grants an extra Wild population slot in every controlled Artifact sector (including homeworld); Secrets of the Ancients awards +1 VP per controlled Artifact sector.',
    tradeRatio: 4,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    influenceColonyShipRefreshes: 1,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
  {
    id: 'the_horde',
    name: 'The Horde',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.lime,
    startingSectorNumber: 299,
    startingResources: { money: 2, science: 3, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 4,
    startingTechIds: ['neutron_bombs', 'nanorobots'],
    traitDescription: 'Built for War (+1 dmg on unmodified 6 hits except Rift weapons; -1 base init on INT/CRU/SB), Raid (Move includes Build 1), Call to Arms (+1/2/3 Mats on INT/CRU/DRE loss in uncontrolled sector), Battle Focus (UPG 3 on different classes; 4-slot tech rows).',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 3,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    reputationSlots: 5,
    ambassadorSlots: 2,
    reputationSlotTypes: ['rep_only', 'rep_only', 'rep_only', 'both', 'both'],
  },
  {
    id: 'the_spiral',
    name: 'The Spiral',
    isHuman: false,
    defaultColor: ECLIPSE_COLOR_PALETTE.ice,
    startingSectorNumber: 255,
    startingResources: { money: 2, science: 2, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: [],
    traitDescription: 'Mind: Single 7-slot tech line (0..-8, any tray) & begin by taking a lowest-printed-cost Tech Tile. Body: Each ship has a Shift Port configuring Ion Cannon/Computer/Hull before combat (Phase 2 upgrades at 5th tech; bombard immediately after combat). Science trades 2:1 (others 3:1).',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
    influenceColonyShipRefreshes: 1,
    reputationSlots: 4,
    ambassadorSlots: 4,
    reputationSlotTypes: ['both', 'both', 'both', 'both'],
  },
];

export const ALL_FACTIONS: FactionInfo[] = [
  ...HUMAN_FACTIONS,
  ...ALIEN_FACTIONS,
];

/**
 * Checks whether a faction is available given the list of active expansions.
 * Base game factions (6 Human, 6 Alien) are always available.
 * Seekers factions (Wardens of Magellan, Enlightened of Lyra) require 'seekers'.
 * Outcasts factions (The Exiles, Rho Indi Syndicate) require 'outcasts'.
 * Community factions (Atlantians, Mega War Inc., Remnants of Ra) require 'community_factions'.
 */
export function isFactionAvailable(factionId: string, expansions: string[] = []): boolean {
  if (factionId === 'wardens_of_magellan' || factionId === 'enlightened_of_lyra') {
    return expansions.includes('seekers');
  }
  if (factionId === 'the_exiles' || factionId === 'rho_indi_syndicate') {
    return expansions.includes('outcasts');
  }
  if (factionId === 'atlantians' || factionId === 'mega_war_inc' || factionId === 'remnants_of_ra' || factionId === 'the_horde' || factionId === 'the_spiral') {
    return expansions.includes('community_factions');
  }
  return true;
}

/**
 * Returns the list of factions available for selection under the active expansions.
 */
export function getAvailableFactions(expansions: string[] = []): FactionInfo[] {
  return ALL_FACTIONS.filter((f) => isFactionAvailable(f.id, expansions));
}

export function getFactionReputationSlotTypes(faction: FactionInfo): ReputationSlotType[] {
  if (faction.reputationSlotTypes && faction.reputationSlotTypes.length > 0) {
    return faction.reputationSlotTypes;
  }
  if (faction.isHuman || faction.id?.startsWith('terran_') || faction.id === 'mega_war_inc') {
    return ['amb_only', 'both', 'both', 'both', 'both'];
  }
  if (faction.id === 'hydran_progress' || faction.id === 'planta') {
    return ['amb_only', 'both', 'both', 'both'];
  }
  if (faction.id === 'orion_hegemony') {
    return ['both', 'both', 'both', 'both', 'rep_only'];
  }
  if (
    faction.id === 'eridani_empire' ||
    faction.id === 'mechanema' ||
    faction.id === 'descendants_of_draco' ||
    faction.id === 'wardens_of_magellan' ||
    faction.id === 'enlightened_of_lyra' ||
    faction.id === 'atlantians' ||
    faction.id === 'remnants_of_ra' ||
    faction.id === 'the_spiral'
  ) {
    return ['both', 'both', 'both', 'both'];
  }
  if (faction.id === 'the_exiles') {
    return ['both', 'both', 'both', 'rep_only'];
  }
  if (faction.id === 'the_horde') {
    return ['rep_only', 'rep_only', 'rep_only', 'both', 'both'];
  }
  if (faction.id === 'rho_indi_syndicate') {
    return ['both', 'both', 'rep_only', 'rep_only', 'rep_only'];
  }
  const total = faction.reputationSlots ?? (faction.isHuman ? 5 : 4);
  const amb = faction.ambassadorSlots ?? 3;
  const types: ReputationSlotType[] = [];
  for (let i = 0; i < total; i++) {
    types.push(i < amb ? 'both' : 'rep_only');
  }
  return types;
}

export function getMaxReputationTilesForPlayer(player: PlayerState): number {
  const slotTypes = getFactionReputationSlotTypes(player.faction);
  const ambCount = player.ambassadorTiles?.length || 0;
  let remainingAmb = ambCount;
  let repSlotsAvailable = 0;
  for (const type of slotTypes) {
    if (type === 'amb_only') {
      if (remainingAmb > 0) remainingAmb--;
    } else if (type === 'both') {
      if (remainingAmb > 0) {
        remainingAmb--;
      } else {
        repSlotsAvailable++;
      }
    } else if (type === 'rep_only') {
      repSlotsAvailable++;
    }
  }
  return repSlotsAvailable;
}

export interface ReputationTrackSlotInfo {
  slotIndex: number;
  slotType: ReputationSlotType;
  tile?:
    | {
        type: 'ambassador';
        allyId: string;
        allyName?: string;
        allyColor?: string;
        vp: number;
      }
    | {
        type: 'reputation';
        vp: number;
        repIndex: number;
      };
}

export function getPlayerReputationTrackSlots(
  player: PlayerState,
  players?: PlayerState[]
): ReputationTrackSlotInfo[] {
  const slotTypes = getFactionReputationSlotTypes(player.faction);
  const ambTiles = player.ambassadorTiles || [];
  const repTiles = player.reputationTiles || [];

  const slots: ReputationTrackSlotInfo[] = slotTypes.map((type, idx) => ({
    slotIndex: idx,
    slotType: type,
  }));

  let ambIdx = 0;
  // Place ambassadors into 'amb_only' slots first
  for (const slot of slots) {
    if (slot.slotType === 'amb_only' && ambIdx < ambTiles.length) {
      const allyId = ambTiles[ambIdx++];
      if (allyId.startsWith('minor_species_')) {
        const ms = ALL_MINOR_SPECIES_TILES.find((m) => m.id === allyId);
        slot.tile = {
          type: 'ambassador',
          allyId,
          allyName: ms?.name || 'Minor Species',
          allyColor: '#10b981',
          vp: ms?.vp || 1,
        };
      } else {
        const ally = players?.find((p) => p.id === allyId);
        slot.tile = {
          type: 'ambassador',
          allyId,
          allyName: ally?.name || allyId,
          allyColor: ally?.color || '#6366f1',
          vp: 1,
        };
      }
    }
  }

  // Then place ambassadors into 'both' slots
  for (const slot of slots) {
    if (!slot.tile && slot.slotType === 'both' && ambIdx < ambTiles.length) {
      const allyId = ambTiles[ambIdx++];
      if (allyId.startsWith('minor_species_')) {
        const ms = ALL_MINOR_SPECIES_TILES.find((m) => m.id === allyId);
        slot.tile = {
          type: 'ambassador',
          allyId,
          allyName: ms?.name || 'Minor Species',
          allyColor: '#10b981',
          vp: ms?.vp || 1,
        };
      } else {
        const ally = players?.find((p) => p.id === allyId);
        slot.tile = {
          type: 'ambassador',
          allyId,
          allyName: ally?.name || allyId,
          allyColor: ally?.color || '#6366f1',
          vp: 1,
        };
      }
    }
  }

  // Then place reputation tiles: into empty 'rep_only' slots first, then into empty 'both' slots (Bug 118)
  let repIdx = 0;
  for (const slot of slots) {
    if (!slot.tile && slot.slotType === 'rep_only' && repIdx < repTiles.length) {
      const vp = repTiles[repIdx];
      slot.tile = {
        type: 'reputation',
        vp,
        repIndex: repIdx,
      };
      repIdx++;
    }
  }

  for (const slot of slots) {
    if (!slot.tile && slot.slotType === 'both' && repIdx < repTiles.length) {
      const vp = repTiles[repIdx];
      slot.tile = {
        type: 'reputation',
        vp,
        repIndex: repIdx,
      };
      repIdx++;
    }
  }

  return slots;
}

export function createInitialShrineBoard(): ShrineBoardState {
  return {
    slots: [
      // Row 0: 2 Science, 3 Money, 4 Materials -> Bonus: Wormhole Generator
      [
        { row: 0, col: 0, costResource: 'science', costAmount: 2, built: false },
        { row: 0, col: 1, costResource: 'money', costAmount: 3, built: false },
        { row: 0, col: 2, costResource: 'materials', costAmount: 4, built: false },
      ],
      // Row 1: 3 Materials, 4 Science, 5 Money -> Bonus: Discovery Tile
      [
        { row: 1, col: 0, costResource: 'materials', costAmount: 3, built: false },
        { row: 1, col: 1, costResource: 'science', costAmount: 4, built: false },
        { row: 1, col: 2, costResource: 'money', costAmount: 5, built: false },
      ],
      // Row 2: 4 Money, 5 Materials, 6 Science -> Bonus: +1 Influence Disc
      [
        { row: 2, col: 0, costResource: 'money', costAmount: 4, built: false },
        { row: 2, col: 1, costResource: 'materials', costAmount: 5, built: false },
        { row: 2, col: 2, costResource: 'science', costAmount: 6, built: false },
      ],
    ],
    rowBonusesClaimed: [false, false, false],
  };
}

/**
 * Builds full PlayerState and home SectorTile for a given faction.
 */
export function buildPlayerAndHomeSector(
  playerId: string,
  playerName: string,
  playerColor: string,
  faction: FactionInfo,
  startCoord: HexCoord,
  reputationBag: number[],
  discoveryBag: DiscoveryTile[],
  expansions: string[] = []
): { player: PlayerState; homeSector: SectorTile } {
  const homeConfig =
    ALL_HOME_SECTORS[faction.id] ||
    HUMAN_HOME_SECTORS[faction.id] || {
      sectorNumber: 221,
      name: faction.id === 'mega_war_inc' ? 'Mega War Annex (Terran Homeworld)' : faction.name,
      ring: 2,
      victoryPoints: 3,
      hasArtifact: true,
      wormholes: [true, false, true, true, false, true],
      planets: [
        { id: `p_1`, resource: 'money', isAdvanced: false },
        { id: `p_2`, resource: 'science', isAdvanced: false },
        { id: `p_3`, resource: 'material', isAdvanced: false },
        { id: `p_4`, resource: 'money', isAdvanced: true },
        { id: `p_5`, resource: 'science', isAdvanced: true },
      ],
    };

  // Determine initial colonized planets
  const planets = (homeConfig.planets || []).map((p, idx) => {
    let isColonized = false;
    let colonizedResource = p.resource !== 'any' ? p.resource : 'money';

    if (faction.id === 'hydran_progress') {
      if (p.isAdvanced && p.resource === 'science') {
        isColonized = true;
        colonizedResource = 'science';
      } else if (!p.isAdvanced) {
        isColonized = true;
      }
    } else if (faction.id === 'the_exiles') {
      if (!p.isAdvanced && !p.isOrbital) {
        isColonized = true;
        colonizedResource = 'material';
      } else if (p.isOrbital) {
        isColonized = true;
        colonizedResource = 'science';
      }
    } else if (faction.id === 'rho_indi_syndicate') {
      if (!p.isAdvanced) {
        isColonized = true;
      }
    } else if (faction.id === 'planta' || faction.id === 'wardens_of_magellan' || faction.id === 'enlightened_of_lyra') {
      isColonized = !p.isAdvanced;
    } else {
      isColonized = !p.isAdvanced && idx < 3;
    }

    return {
      ...p,
      id: `home_${playerId}_p${idx}`,
      colonizedBy: isColonized ? playerId : undefined,
      colonizedResource: isColonized ? (colonizedResource as any) : undefined,
    };
  });

  const startShips: SectorShip[] = [];
  if (faction.id === 'rho_indi_syndicate') {
    startShips.push(
      {
        id: `ship_${playerId}_start_interceptor_1`,
        ownerId: playerId,
        type: 'interceptor',
        damage: 0,
      },
      {
        id: `ship_${playerId}_start_interceptor_2`,
        ownerId: playerId,
        type: 'interceptor',
        damage: 0,
      }
    );
  } else if (faction.id === 'the_exiles') {
    startShips.push(
      {
        id: `ship_${playerId}_start_interceptor`,
        ownerId: playerId,
        type: 'interceptor',
        damage: 0,
      },
      {
        id: `ship_${playerId}_start_orbital`,
        ownerId: playerId,
        type: 'orbital',
        damage: 0,
      }
    );
  } else {
    const startShipType = faction.id === 'orion_hegemony' ? 'cruiser' : 'interceptor';
    startShips.push({
      id: `ship_${playerId}_start_${startShipType}`,
      ownerId: playerId,
      type: startShipType,
      damage: 0,
    });
  }

  const centerEdge = getEdgeTowardCenter(startCoord);

  const homeSector: SectorTile = {
    id: `home_sector_${playerId}`,
    sectorNumber: homeConfig.sectorNumber || 221,
    name: homeConfig.name || faction.name,
    ring: 2,
    coord: startCoord,
    rotation: centerEdge,
    wormholes: homeConfig.wormholes || [true, false, true, true, false, true],
    planets,
    structures: homeConfig.structures ? { ...homeConfig.structures } : undefined,
    victoryPoints: homeConfig.victoryPoints || 3,
    hasArtifact: homeConfig.hasArtifact ?? true,
    hasDiscovery: false,
    ancientsCount: 0,
    discOwner: playerId,
    ships: startShips,
  };

  if (faction.id === 'remnants_of_ra' && homeSector.hasArtifact && !homeSector.planets.some((p) => p.isRaArtifactSlot)) {
    homeSector.planets.push({
      id: `${homeSector.id}_ra_artifact_wild`,
      resource: 'any',
      isAdvanced: false,
      isRaArtifactSlot: true,
    });
  }

  // Starting technologies
  const startingTechs = (faction.startingTechIds || [])
    .map((tId) => {
      const t = TECH_CATALOG.find((tech) => tech.id === tId);
      if (!t) return null;
      if (faction.id === 'the_exiles' && t.id === 'cloaking_device') {
        return { ...t, placedTrack: 'military' as const };
      }
      if (faction.id === 'atlantians' && t.id === 'ancient_labs') {
        return { ...t, placedTrack: 'nano' as const };
      }
      return { ...t };
    })
    .filter((t): t is (typeof TECH_CATALOG)[number] => Boolean(t));

  // Dynamically count colonized cubes on home sector planets
  const colonizedCounts = { money: 0, science: 0, material: 0 };
  for (const pl of planets) {
    if (pl.colonizedBy && pl.colonizedResource) {
      const res = pl.colonizedResource as 'money' | 'science' | 'material';
      if (colonizedCounts[res] !== undefined) {
        colonizedCounts[res]++;
      }
    }
  }

  let moneyCubesRemaining = 11 - colonizedCounts.money;
  let scienceCubesRemaining = 11 - colonizedCounts.science;
  let materialCubesRemaining = 11 - colonizedCounts.material;

  if (faction.id === 'hydran_progress') {
    scienceCubesRemaining = 9;
  }


  const startingRepTiles: number[] = [];
  if (faction.id === 'eridani_empire') {
    if (reputationBag.length > 0) startingRepTiles.push(reputationBag.pop()!);
    if (reputationBag.length > 0) startingRepTiles.push(reputationBag.pop()!);
  }

  const player: PlayerState = {
    id: playerId,
    name: playerName,
    faction,
    color: playerColor,
    resources: { ...faction.startingResources },
    blueprints: createFactionBlueprints(faction.id),
    techTrack: {
      researched: startingTechs,
      militaryCount: startingTechs.filter((t) => (t as any).placedTrack === 'military' || t.category === 'military').length,
      gridCount: startingTechs.filter((t) => (t as any).placedTrack === 'grid' || t.category === 'grid').length,
      nanoCount: startingTechs.filter((t) => (t as any).placedTrack === 'nano' || t.category === 'nano').length,
    },
    influenceTrack: {
      totalDiscs: faction.startingDiscs,
      discsOnTrack: faction.startingDiscs - 1,
    },
    colonyShips: {
      total: faction.startingColonyShips,
      ready: faction.startingColonyShips,
    },
    population: {
      money: { cubesOnBoard: moneyCubesRemaining },
      science: { cubesOnBoard: scienceCubesRemaining },
      material: { cubesOnBoard: materialCubesRemaining },
    },
    reputationTiles: startingRepTiles,
    ambassadorTiles: [],
    ambassadorCubes: {},
    keptDiscoveryTiles: [],
    unlockedAncientParts: [],
    magellanDiscoveryTile: faction.id === 'wardens_of_magellan' ? (discoveryBag.pop() || null) : undefined,
    magellanDiscoveryResolved: faction.id === 'wardens_of_magellan' ? false : undefined,
    discoveryTilesUsedAsShipPartsCount: faction.id === 'wardens_of_magellan' ? 0 : undefined,
    startingAncientLabsResolved: faction.id === 'atlantians' ? false : undefined,
    shrineBoard: faction.id === 'enlightened_of_lyra' ? createInitialShrineBoard() : undefined,
    hasWormholeGeneratorAbility: false,
    lyraExtraDiscClaimed: false,
    hasPassed: false,
    autoPassReactions: false,
    isFirstPasser: false,
    actionsTakenThisRound: 0,
    graveyardShips: [],
  };

  return { player, homeSector };
}

/**
 * Returns true if a Discovery Tile is disallowed by Atlantians' Ancient Spirit species rule
 * ('+6 Materials' or 'Ancient Cruiser' must be discarded and redrawn).
 */
export function isAtlantiansForbiddenDiscoveryTile(tile: DiscoveryTile): boolean {
  return (
    tile.id.startsWith('disc_materials_6') ||
    tile.name === '+6 Materials' ||
    tile.id.startsWith('disc_ancient_cruiser') ||
    tile.name === 'Ancient Cruiser' ||
    tile.immediateReward?.grantShipType === 'cruiser'
  );
}

/**
 * Draws a single Discovery Tile from discoveryBag (with random base-tile fallback if exhausted).
 * When forAtlantians is true, discards and redraws '+6 Materials' and 'Ancient Cruiser' tiles.
 */
export function drawDiscoveryTileForPlayer(
  discoveryBag: DiscoveryTile[] | undefined,
  forAtlantians: boolean,
  excludeId?: string
): DiscoveryTile {
  if (discoveryBag && discoveryBag.length > 0) {
    while (discoveryBag.length > 0) {
      const randIdx = Math.floor(Math.random() * discoveryBag.length);
      const tile = discoveryBag.splice(randIdx, 1)[0]!;
      if (forAtlantians && isAtlantiansForbiddenDiscoveryTile(tile)) {
        continue;
      }
      return tile;
    }
  }
  const candidates = DISCOVERY_TILES.filter(
    (t) => (!forAtlantians || !isAtlantiansForbiddenDiscoveryTile(t)) && t.id !== excludeId
  );
  const pool = candidates.length > 0 ? candidates : DISCOVERY_TILES;
  return { ...pool[Math.floor(Math.random() * pool.length)]! };
}

/**
 * Constructs a PendingDiscovery payload for a player, applying Atlantians' Ancient Spirit
 * rule (draw an extra Discovery Tile, discard & redraw any '+6 Materials' or 'Ancient Cruiser',
 * and let the player pick which of the 2 tiles to resolve).
 */
export function buildPendingDiscoveryForPlayer(
  discoveryBag: DiscoveryTile[] | undefined,
  player: Pick<PlayerState, 'id' | 'faction'>,
  sectorId: string,
  initialTile?: DiscoveryTile,
  fromExplore?: boolean
): PendingDiscovery {
  const isAtlantians = player.faction.id === 'atlantians';
  if (!isAtlantians) {
    const tile = initialTile || drawDiscoveryTileForPlayer(discoveryBag, false);
    return {
      sectorId,
      discovery: tile,
      playerId: player.id,
      ...(fromExplore ? { fromExplore: true } : {}),
    };
  }

  let firstTile = initialTile;
  if (!firstTile || isAtlantiansForbiddenDiscoveryTile(firstTile)) {
    firstTile = drawDiscoveryTileForPlayer(discoveryBag, true);
  }
  const secondTile = drawDiscoveryTileForPlayer(discoveryBag, true, firstTile.id);

  return {
    sectorId,
    discovery: firstTile,
    discoveryOptions: [firstTile, secondTile],
    playerId: player.id,
    ...(fromExplore ? { fromExplore: true } : {}),
  };
}

/**
 * Triggers the starting Ancient Labs Discovery Tile draw (2 tiles via Ancient Spirit)
 * for an Atlantians player once game setup / draft completes and no setup blocker is active.
 */
export function triggerPendingAtlantiansStartingLabsDiscovery(state: GameState): void {
  if (state.phase === 'DRAFT_PHASE') return;
  if (state.pendingExilesOrbitalSetup || state.pendingRaArtifactSetup || state.pendingSpiralTechSetup || state.pendingDiscovery) return;
  const atlantians = state.players.find(
    (p) => p.faction.id === 'atlantians' && p.startingAncientLabsResolved === false
  );
  if (!atlantians) return;

  atlantians.startingAncientLabsResolved = true;
  const homeSector = state.sectors.find(
    (s) => s.id === `home_sector_${atlantians.id}` || s.sectorNumber === 266
  );
  const firstTile = drawDiscoveryTileForPlayer(state.discoveryBag, true);
  state.pendingDiscovery = {
    ...buildPendingDiscoveryForPlayer(
      state.discoveryBag,
      atlantians,
      homeSector?.id || state.sectors[0]?.id || 'sec_1',
      firstTile,
      false
    ),
    isSetupDiscovery: true,
  };
  state.log.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: Date.now(),
    round: state.round,
    phase: state.phase,
    playerId: atlantians.id,
    message: `✨ ${atlantians.name} triggered starting Ancient Labs (Ancient Spirit) and drew 2 Discovery Tiles to choose 1!`,
    type: 'system',
  });
}

/**
 * Assigns an unused Terran homeworld sector number (221..226) to Mega War Inc.
 * ("pick any unused Terran homeworld system — Mega War Inc. confiscated this human system").
 */
export function assignUnusedTerranHomeworldForMegaWar(
  players: PlayerState[],
  sectors: SectorTile[],
  megaWarPlayer: PlayerState,
  megaWarHomeSector: SectorTile
): void {
  if (megaWarPlayer.faction.id !== 'mega_war_inc') return;
  const terranSectorNumbers = [221, 222, 223, 224, 225, 226];
  const usedNumbers = new Set<number>();
  for (const s of sectors) {
    if (s.id !== megaWarHomeSector.id && s.id.startsWith('home_sector_') && s.sectorNumber) {
      usedNumbers.add(s.sectorNumber);
    }
  }
  for (const p of players) {
    if (p.id !== megaWarPlayer.id && (p.faction.id as string) !== 'drafting' && p.faction.startingSectorNumber) {
      usedNumbers.add(p.faction.startingSectorNumber);
    }
  }
  const chosen = terranSectorNumbers.find((n) => !usedNumbers.has(n)) ?? 221;
  Object.assign(megaWarHomeSector, {
    sectorNumber: chosen,
    name: `Sector ${chosen} (Mega War Annex)`,
  });
  Object.assign(megaWarPlayer, {
    faction: {
      ...megaWarPlayer.faction,
      startingSectorNumber: chosen,
    },
  });
}

export function createInitialGame(
  playerCount: number = 2,
  selectedFactions?: (string | FactionInfo)[],
  expansions: string[] = [],
  neutralShipSelections?: Partial<NeutralShipSelectionConfig>,
  isDraftMode: boolean = false,
  botSeats?: boolean[]
): GameState {
  const count = Math.max(1, Math.min(6, playerCount));
  const startingCoords = expansions?.includes('warped_universe')
    ? getWarpedUniverseStartingCoords(count)
    : (STARTING_COORDS_BY_COUNT[count] ?? STARTING_COORDS_BY_COUNT[2]!);

  const hasRemnants = Boolean(expansions && expansions.includes('remnants_of_worlds_afar'));
  const resolvedNeutralBlueprints = resolveNeutralShipConfig(neutralShipSelections, expansions);
  const storedNeutralSelections: NeutralShipSelectionConfig = {
    ancient: !hasRemnants && neutralShipSelections?.ancient === 'expert' ? 'default' : (neutralShipSelections?.ancient ?? 'default'),
    guardian: !hasRemnants && neutralShipSelections?.guardian === 'expert' ? 'default' : (neutralShipSelections?.guardian ?? 'default'),
    gcds: !hasRemnants && neutralShipSelections?.gcds === 'expert' ? 'default' : (neutralShipSelections?.gcds ?? 'default'),
  };

  // Official Eclipse: Second Dawn Reputation Bag: 33 tiles (16x 1 VP, 9x 2 VP, 5x 3 VP, 3x 4 VP)
  const reputationBag: number[] = [
    ...Array(16).fill(1),
    ...Array(9).fill(2),
    ...Array(5).fill(3),
    ...Array(3).fill(4),
  ].sort(() => Math.random() - 0.5);

  // Discovery bag setup
  const discoveryBag = (() => {
    const bag = [...DISCOVERY_TILES];
    if (expansions?.includes('rift_cannon')) {
      bag.push({ ...RIFT_CONDUCTOR_DISCOVERY });
    }
    if (expansions?.includes('remnants_of_worlds_afar')) {
      bag.push(...REMNANTS_DISCOVERY_TILES.map((d) => ({ ...d })));
    }
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j]!, bag[i]!];
    }
    return bag;
  })();

  const players: PlayerState[] = [];
  const sectors: SectorTile[] = [
    {
      ...CENTER_SECTOR,
      coord: { q: 0, r: 0 },
      ships: [{ id: 'gcds_ship_1', ownerId: 'gcds', type: 'gcds', damage: 0 }],
    },
  ];

  let turnOrder: string[] = [];
  let draftOrder: string[] = [];
  let factionDraftState: GameState['factionDraft'] = null;

  if (isDraftMode) {
    const defaultColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const posIndices = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5);
    const assignedPositions: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      assignedPositions[`player_${i + 1}`] = posIndices[i]!;
    }

    // Random first player
    const firstPlayerIdx = Math.floor(Math.random() * count);
    const firstPlayerId = `player_${firstPlayerIdx + 1}`;
    const firstPlayerPos = assignedPositions[firstPlayerId]!;

    // Turn order follows clockwise around board positions from first player
    for (let step = 0; step < count; step++) {
      const targetPos = (firstPlayerPos + step) % count;
      const pId = Object.keys(assignedPositions).find((k) => assignedPositions[k] === targetPos)!;
      turnOrder.push(pId);
    }

    // Faction draft order is counter-clockwise from the last player in turn order
    draftOrder = [...turnOrder].reverse();
    const availableFactionIds = getAvailableFactions(expansions).map((f) => f.id);

    for (let i = 0; i < count; i++) {
      const pId = `player_${i + 1}`;
      const pos = assignedPositions[pId]!;
      const startCoord = startingCoords[pos]!;
      const centerEdge = getEdgeTowardCenter(startCoord);

      sectors.push({
        id: `draft_slot_${pId}`,
        sectorNumber: 220 + pos + 1,
        name: `Position ${pos + 1} (Draft Slot)`,
        ring: 2,
        coord: startCoord,
        rotation: centerEdge,
        wormholes: [true, false, true, true, false, true],
        planets: [],
        victoryPoints: 3,
        discOwner: pId,
        ships: [],
      });

      players.push({
        id: pId,
        name: `Player ${i + 1}`,
        color: defaultColors[i % defaultColors.length]!,
        faction: {
          id: 'drafting',
          name: `Player ${i + 1}`,
          shortName: 'Drafting',
          isHuman: true,
          startingSector: 200,
          startingResources: { money: 0, science: 0, materials: 0 },
          startingStorage: { money: 0, science: 0, materials: 0 },
          homeWorldBonus: { money: 0, science: 0, materials: 0 },
          baseIncome: { money: 30, science: 0, materials: 0 },
          baseUpkeep: 0,
          startingDiscs: 16,
          startingColonyShips: 3,
          defaultColor: defaultColors[i % defaultColors.length]!,
          reputationSlotTypes: ['amb_only', 'both', 'both', 'both', 'both'],
        },
        resources: { money: 0, science: 0, materials: 0 },
        blueprints: createFactionBlueprints('terran_directorate'),
        techTrack: {
          researched: [],
          militaryCount: 0,
          gridCount: 0,
          nanoCount: 0,
        },
        influenceTrack: {
          totalDiscs: 16,
          discsOnTrack: 15,
        },
        colonyShips: {
          total: 3,
          ready: 3,
        },
        population: {
          money: { cubesOnBoard: 12 },
          science: { cubesOnBoard: 12 },
          material: { cubesOnBoard: 12 },
        },
        reputationTiles: [],
        ambassadorTiles: [],
        ambassadorCubes: {},
        keptDiscoveryTiles: [],
        unlockedAncientParts: [],
        hasWormholeGeneratorAbility: false,
        hasPassed: false,
        autoPassReactions: false,
        isFirstPasser: false,
        actionsTakenThisRound: 0,
        graveyardShips: [],
      });
    }

    factionDraftState = {
      draftOrder,
      currentDraftIndex: 0,
      availableFactionIds,
      assignedPositions,
      firstPlayerId,
    };
  } else {
    for (let i = 0; i < count; i++) {
      let faction: FactionInfo;
      if (selectedFactions && selectedFactions[i]) {
        const sf = selectedFactions[i];
        if (typeof sf === 'string') {
          faction = ALL_FACTIONS.find((f) => f.id === sf) || HUMAN_FACTIONS[i % HUMAN_FACTIONS.length]!;
        } else {
          faction = sf;
        }
      } else {
        faction = HUMAN_FACTIONS[i % HUMAN_FACTIONS.length]!;
      }

      const playerId = `player_${i + 1}`;
      const startCoord = startingCoords[i]!;

      const { player, homeSector } = buildPlayerAndHomeSector(
        playerId,
        faction.name,
        faction.defaultColor,
        faction,
        startCoord,
        reputationBag,
        discoveryBag,
        expansions
      );

      sectors.push(homeSector);
      players.push(player);
    }
    for (const p of players) {
      if (p.faction.id === 'mega_war_inc') {
        const homeSec = sectors.find((s) => s.id === `home_sector_${p.id}`);
        if (homeSec) {
          assignUnusedTerranHomeworldForMegaWar(players, sectors, p, homeSec);
        }
      }
    }
    turnOrder = players.map((p) => p.id);
  }

  const decks = generateSectorDecks(players.length, expansions);

  // Fill unused starting positions in Ring 2 with authentic Guardian Sectors (Sectors 271 to 274)
  // Official rule: Guardian Sectors are not used with Warped Universe expansion
  const canonicalStartingCoords = STARTING_COORDS_BY_COUNT[6]!;
  if (botSeats && botSeats.length > 0) {
    players.forEach((p, idx) => {
      if (botSeats[idx]) {
        p.isBot = true;
      }
    });
  }
  const usedCoords = startingCoords.slice(0, players.length);
  const unusedStartingCoords = expansions?.includes('warped_universe')
    ? []
    : canonicalStartingCoords.filter(
        (c) => !usedCoords.some((u) => u.q === c.q && u.r === c.r)
      );

  const guardianSectorNumbers = [271, 272, 273, 274];
  unusedStartingCoords.forEach((coord, gIdx) => {
    const secNum = guardianSectorNumbers[gIdx % guardianSectorNumbers.length]!;
    const template = GUARDIAN_SECTORS[secNum];
    const centerEdge = getEdgeTowardCenter(coord);
    const discTile = discoveryBag.length > 0 ? discoveryBag.pop() : undefined;
    const guardianSector: SectorTile = {
      id: `guardian_sector_${secNum}_${gIdx + 1}`,
      sectorNumber: secNum,
      name: template?.name || `Sector ${secNum}`,
      ring: 2,
      coord,
      rotation: centerEdge,
      wormholes: template?.wormholes || [true, false, true, true, false, true],
      planets: template?.planets?.map((p, pIdx) => ({
        id: `g${secNum}_${gIdx}_p${pIdx + 1}`,
        resource: p.resource,
        isAdvanced: p.isAdvanced,
      })) || [
        { id: `g${secNum}_${gIdx}_p1`, resource: 'science', isAdvanced: true },
        { id: `g${secNum}_${gIdx}_p2`, resource: 'material', isAdvanced: true },
      ],
      victoryPoints: template?.victoryPoints || 2,
      hasArtifact: template?.hasArtifact ?? true,
      hasDiscovery: true,
      discoveryTile: discTile,
      discoveryClaimed: false,
      ancientsCount: 0,
      guardiansCount: 1,
      ships: [
        {
          id: `guardian_ship_${secNum}_${gIdx + 1}`,
          ownerId: 'guardian',
          type: 'guardian',
          damage: 0,
        },
      ],
    };
    sectors.push(guardianSector);
  });

  // Official Eclipse: Second Dawn Tech Bag & Tray Setup
  const rawBag = createInitialTechBag(expansions);
  const hasAtlantians = players.some((p) => p.faction.id === 'atlantians');
  const fullBag = hasAtlantians ? rawBag.filter((t) => t.id !== 'ancient_labs') : rawBag;
  const { drawn: techSupply, remainingBag: techBag, regularDrawn, rareDrawn } =
    drawTechTilesForSetup(fullBag, players.length);

  const finalTurnOrder = turnOrder.length > 0 ? turnOrder : players.map((p) => p.id);

  const exilePlayer = players.find((p) => p.faction.id === 'the_exiles');
  let pendingExilesOrbitalSetup: { playerId: string; sectorId: string; planetId: string } | null = null;
  if (exilePlayer) {
    const homeSector = sectors.find((s) => s.id === `home_sector_${exilePlayer.id}` || s.sectorNumber === 234);
    const orbitalPlanet = homeSector?.planets.find((p) => p.isOrbital);
    if (orbitalPlanet && homeSector) {
      pendingExilesOrbitalSetup = {
        playerId: exilePlayer.id,
        sectorId: homeSector.id,
        planetId: orbitalPlanet.id,
      };
    }
  }

  const raPlayer = players.find((p) => p.faction.id === 'remnants_of_ra');
  let pendingRaArtifactSetup: { playerId: string; sectorId: string; planetId: string } | null = null;
  if (raPlayer) {
    const homeSector = sectors.find((s) => s.id === `home_sector_${raPlayer.id}` || s.sectorNumber === 255);
    const raPlanet = homeSector?.planets.find((p) => p.isRaArtifactSlot && !p.colonizedBy);
    if (raPlanet && homeSector) {
      pendingRaArtifactSetup = {
        playerId: raPlayer.id,
        sectorId: homeSector.id,
        planetId: raPlanet.id,
      };
    }
  }

  const spiralPlayer = players.find((p) => p.faction.id === 'the_spiral');
  const pendingSpiralTechSetup: { playerId: string } | null = spiralPlayer
    ? { playerId: spiralPlayer.id }
    : null;

  const enabledExpansions = expansions || [];
  for (const p of players) {
    if (p.blueprints) {
      for (const bp of Object.values(p.blueprints)) {
        if (bp) (bp as any).activeExpansions = enabledExpansions;
      }
    }
  }

  const initialState: GameState = {
    id: `game_${Date.now()}`,
    isDraftMode,
    expansions: enabledExpansions,
    neutralShipBlueprints: resolvedNeutralBlueprints,
    neutralShipSelections: storedNeutralSelections,
    round: 1,
    maxRounds: 8,
    phase: isDraftMode ? 'DRAFT_PHASE' : 'ACTION_PHASE',
    activePlayerIndex: isDraftMode
      ? players.findIndex((p) => p.id === draftOrder[0])
      : 0,
    firstPlayerIndex: 0,
    turnOrder: finalTurnOrder,
    factionDraft: factionDraftState,
    passedPlayerIds: [],
    consecutivePasses: 0,
    players,
    sectors,
    sectorDecks: decks,
    techSupply,
    techBag,
    reputationBag,
    discoveryBag,
    minorSpeciesSupply: expansions?.includes('minor_species') ? createInitialMinorSpeciesSupply() : undefined,
    warpedUniverse: expansions?.includes('warped_universe') ? createWarpedUniverseLayout(count) : undefined,
    galacticEvents: expansions?.includes('galactic_events') ? createGalacticEventsState() : undefined,
    activeCombat: null,
    pendingExplore: null,
    pendingDiscovery: null,
    pendingCombatConquest: null,
    pendingExilesOrbitalSetup,
    pendingRaArtifactSetup,
    pendingSpiralTechSetup,
    resolvedCombatSectorIds: [],
    replaySteps: [],
    log: [
      {
        id: `log_${Date.now()}_1`,
        timestamp: Date.now(),
        round: 1,
        phase: isDraftMode ? 'DRAFT_PHASE' : 'ACTION_PHASE',
        message: isDraftMode
          ? `Galaxy initialized with ${players.length} players in Faction Draft mode! Seating assigned on Ring 2. Draft commences counter-clockwise starting with ${players.find((p) => p.id === draftOrder[0])?.name}. Tech Tray populated with ${regularDrawn} regular and ${rareDrawn} rare tiles (${techBag.length} remaining in bag): ${techSupply.map((t) => t.name).join(', ')}.`
          : `Galaxy initialized with ${players.length} players. Round 1 has commenced! Tech Tray populated with ${regularDrawn} regular and ${rareDrawn} rare tiles (${techBag.length} remaining in bag): ${techSupply.map((t) => t.name).join(', ')}.`,
        type: 'system',
      },
    ],
    chatMessages: [],
  };

  triggerPendingAtlantiansStartingLabsDiscovery(initialState);

  commitReplayStep(
    initialState,
    isDraftMode ? 'DRAFT_INITIALIZED' : 'GAME_SETUP',
    isDraftMode ? 'Faction Draft Initialized' : 'Galactic War Initialized'
  );

  return initialState;
}
