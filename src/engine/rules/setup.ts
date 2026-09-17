/**
 * Initial Game Setup for Eclipse: Second Dawn
 * Supports 1-6 players with prioritized Human Factions.
 */

import { GameState } from '../types/state';
import { FactionInfo, PlayerState } from '../types/player';
import { SectorTile, HexCoord } from '../types/galaxy';
import { CENTER_SECTOR, HUMAN_HOME_SECTORS, DISCOVERY_TILES, generateSectorDecks } from './sectorData';
import { TECH_CATALOG, createInitialTechBag, drawTechTilesForRound } from './techData';
import { createDefaultHumanBlueprints } from './shipValidation';

export const HUMAN_FACTIONS: FactionInfo[] = [
  {
    id: 'terran_federation',
    name: 'Terran Federation',
    isHuman: true,
    defaultColor: '#ef4444', // Red
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
  },
  {
    id: 'terran_directorate',
    name: 'Terran Directorate',
    isHuman: true,
    defaultColor: '#3b82f6', // Blue
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
  },
  {
    id: 'terran_republic',
    name: 'Terran Republic',
    isHuman: true,
    defaultColor: '#eab308', // Yellow
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
  },
  {
    id: 'terran_conglomerate',
    name: 'Terran Conglomerate',
    isHuman: true,
    defaultColor: '#10b981', // Green
    startingSectorNumber: 224,
    startingResources: { money: 4, science: 2, materials: 4 },
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
  },
  {
    id: 'terran_union',
    name: 'Terran Union',
    isHuman: true,
    defaultColor: '#a855f7', // Purple
    startingSectorNumber: 225,
    startingResources: { money: 3, science: 4, materials: 3 },
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
  },
  {
    id: 'terran_alliance',
    name: 'Terran Alliance',
    isHuman: true,
    defaultColor: '#f97316', // Orange
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
    { q: 2, r: -1 },
    { q: 0, r: 2 },
    { q: -2, r: 1 },
  ],
  5: [
    { q: 0, r: -2 },
    { q: 2, r: -1 },
    { q: 1, r: 2 },
    { q: -1, r: 2 },
    { q: -2, r: -1 },
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

export function createInitialGame(playerCount: number = 2): GameState {
  const count = Math.max(1, Math.min(6, playerCount));
  const startingCoords = STARTING_COORDS_BY_COUNT[count] ?? STARTING_COORDS_BY_COUNT[2]!;

  const players: PlayerState[] = [];
  const sectors: SectorTile[] = [
    {
      ...CENTER_SECTOR,
      coord: { q: 0, r: 0 },
      ships: [{ id: 'gcds_ship_1', ownerId: 'gcds', type: 'gcds', damage: 0 }],
    },
  ];

  for (let i = 0; i < count; i++) {
    const faction = HUMAN_FACTIONS[i % HUMAN_FACTIONS.length]!;
    const playerId = `player_${i + 1}`;
    const startCoord = startingCoords[i]!;

    const homeConfig = HUMAN_HOME_SECTORS[faction.id] || {
      sectorNumber: 220 + i + 1,
      ring: 2,
      victoryPoints: 3,
      wormholes: [true, false, true, false, true, false],
      planets: [
        { id: `p_${i}_1`, resource: 'money', isAdvanced: false },
        { id: `p_${i}_2`, resource: 'science', isAdvanced: false },
        { id: `p_${i}_3`, resource: 'material', isAdvanced: false },
        { id: `p_${i}_4`, resource: 'money', isAdvanced: true },
        { id: `p_${i}_5`, resource: 'science', isAdvanced: true },
      ],
    };

    const homeSector: SectorTile = {
      id: `home_sector_${playerId}`,
      sectorNumber: homeConfig.sectorNumber || 221,
      name: homeConfig.name || faction.name,
      ring: 2,
      coord: startCoord,
      rotation: 0,
      wormholes: homeConfig.wormholes || [true, false, true, false, true, false],
      planets: (homeConfig.planets || []).map((p, idx) => ({
        ...p,
        id: `home_${playerId}_p${idx}`,
        colonizedBy: idx < 3 ? playerId : undefined, // Start with 3 colonized planets
      })),
      victoryPoints: homeConfig.victoryPoints || 3,
      hasArtifact: homeConfig.hasArtifact ?? true,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: playerId,
      ships: [
        {
          id: `ship_${playerId}_start_interceptor`,
          ownerId: playerId,
          type: 'interceptor',
          damage: 0,
        },
      ],
    };

    sectors.push(homeSector);

    players.push({
      id: playerId,
      name: `${faction.name}`,
      faction,
      color: faction.defaultColor,
      resources: { ...faction.startingResources },
      blueprints: createDefaultHumanBlueprints(),
      techTrack: {
        researched: [],
        militaryCount: 0,
        gridCount: 0,
        nanoCount: 0,
      },
      influenceTrack: {
        totalDiscs: faction.startingDiscs,
        discsOnTrack: faction.startingDiscs - 1, // 1 disc used on home sector
      },
      colonyShips: {
        total: faction.startingColonyShips,
        ready: faction.startingColonyShips, // 3 colony ships, all unused/ready at game start (home planets population is free)
      },
      population: {
        money: { cubesOnBoard: 11 }, // 1 colonized
        science: { cubesOnBoard: 11 }, // 1 colonized
        material: { cubesOnBoard: 11 }, // 1 colonized
      },
      reputationTiles: [],
      ambassadorTiles: [],
      keptDiscoveryTiles: [],
      unlockedAncientParts: [],
      hasPassed: false,
      isFirstPasser: false,
      actionsTakenThisRound: 0,
      graveyardShips: [],
    });
  }

  const decks = generateSectorDecks();

  // Official Eclipse: Second Dawn Tech Bag & Tray Setup
  // 112 tiles: 4 copies of each 24 regular + 1 copy of each 16 rare
  const fullBag = createInitialTechBag();
  const { drawn: techSupply, remainingBag: techBag, regularDrawn, rareDrawn } =
    drawTechTilesForRound(fullBag, players.length);

  // Reputation bag: 1, 2, 2, 2, 3, 3, 4
  const reputationBag = [1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4].sort(() => Math.random() - 0.5);

  const turnOrder = players.map((p) => p.id);

  return {
    id: `game_${Date.now()}`,
    round: 1,
    maxRounds: 8,
    phase: 'ACTION_PHASE',
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    turnOrder,
    passedPlayerIds: [],
    players,
    sectors,
    sectorDecks: decks,
    techSupply,
    techBag,
    reputationBag,
    discoveryBag: [...DISCOVERY_TILES],
    activeCombat: null,
    pendingExplore: null,
    pendingDiscovery: null,
    pendingCombatConquest: null,
    log: [
      {
        id: `log_${Date.now()}_1`,
        timestamp: Date.now(),
        round: 1,
        phase: 'ACTION_PHASE',
        message: `Galaxy initialized with ${players.length} players. Round 1 has commenced! Tech Tray populated with ${regularDrawn} regular and ${rareDrawn} rare tiles (${techBag.length} remaining in bag).`,
        type: 'system',
      },
    ],
  };
}
