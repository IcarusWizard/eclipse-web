/**
 * Initial Game Setup for Eclipse: Second Dawn
 * Supports 1-6 players with prioritized Human Factions.
 */

import { GameState } from '../types/state';
import { FactionInfo, PlayerState } from '../types/player';
import { SectorTile, HexCoord } from '../types/galaxy';
import { CENTER_SECTOR, HUMAN_HOME_SECTORS, ALL_HOME_SECTORS, DISCOVERY_TILES, generateSectorDecks } from './sectorData';
import { TECH_CATALOG, createInitialTechBag, drawTechTilesForSetup, drawTechTilesForRound } from './techData';
import { createDefaultHumanBlueprints, createFactionBlueprints } from './shipValidation';
import { getEdgeTowardCenter } from './hexMath';

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

export const ALIEN_FACTIONS: FactionInfo[] = [
  {
    id: 'eridani_empire',
    name: 'Eridani Empire',
    isHuman: false,
    defaultColor: '#dc2626', // Red
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
  },
  {
    id: 'hydran_progress',
    name: 'Hydran Progress',
    isHuman: false,
    defaultColor: '#0284c7', // Sky Blue
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
  },
  {
    id: 'planta',
    name: 'Planta',
    isHuman: false,
    defaultColor: '#16a34a', // Emerald Green
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
  },
  {
    id: 'descendants_of_draco',
    name: 'Descendants of Draco',
    isHuman: false,
    defaultColor: '#eab308', // Amber
    startingSectorNumber: 228,
    startingResources: { money: 2, science: 4, materials: 3 },
    startingDiscs: 13,
    startingColonyShips: 3,
    startingTechIds: ['fusion_drive'],
    traitDescription: 'Peaceful coexistence with Ancients, dual explore sector picks, and +1 VP per Ancient at game end.',
    tradeRatio: 3,
    exploreActivations: 1,
    researchActivations: 1,
    upgradeActivations: 2,
    buildActivations: 2,
    moveActivations: 2,
    influenceActivations: 2,
  },
  {
    id: 'mechanema',
    name: 'Mechanema',
    isHuman: false,
    defaultColor: '#9333ea', // Purple
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
  },
  {
    id: 'orion_hegemony',
    name: 'Orion Hegemony',
    isHuman: false,
    defaultColor: '#ea580c', // Orange
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
  },
];

export const ALL_FACTIONS: FactionInfo[] = [
  ...HUMAN_FACTIONS,
  ...ALIEN_FACTIONS,
];

export function createInitialGame(
  playerCount: number = 2,
  selectedFactions?: (string | FactionInfo)[]
): GameState {
  const count = Math.max(1, Math.min(6, playerCount));
  const startingCoords = STARTING_COORDS_BY_COUNT[count] ?? STARTING_COORDS_BY_COUNT[2]!;

  // Official Eclipse: Second Dawn Reputation Bag: 33 tiles (16x 1 VP, 9x 2 VP, 5x 3 VP, 3x 4 VP)
  const reputationBag: number[] = [
    ...Array(16).fill(1),
    ...Array(9).fill(2),
    ...Array(5).fill(3),
    ...Array(3).fill(4),
  ].sort(() => Math.random() - 0.5);

  const players: PlayerState[] = [];
  const sectors: SectorTile[] = [
    {
      ...CENTER_SECTOR,
      coord: { q: 0, r: 0 },
      ships: [{ id: 'gcds_ship_1', ownerId: 'gcds', type: 'gcds', damage: 0 }],
    },
  ];

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

    const homeConfig =
      ALL_HOME_SECTORS[faction.id] ||
      HUMAN_HOME_SECTORS[faction.id] || {
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

    // Determine initial colonized planets
    const planets = (homeConfig.planets || []).map((p, idx) => {
      let isColonized = false;
      let colonizedResource = p.resource !== 'any' ? p.resource : 'money';

      if (faction.id === 'hydran_progress') {
        // Hydran starts with a cube on Advanced Science (p2) and the standard non-advanced squares
        if (p.isAdvanced && p.resource === 'science') {
          isColonized = true;
          colonizedResource = 'science';
        } else if (!p.isAdvanced) {
          isColonized = true;
        }
      } else if (faction.id === 'planta') {
        // Planta home sector only has 2 standard planets (Material and Science)
        isColonized = !p.isAdvanced;
      } else {
        // Standard start: first 3 non-advanced planets colonized
        isColonized = !p.isAdvanced && idx < 3;
      }

      return {
        ...p,
        id: `home_${playerId}_p${idx}`,
        colonizedBy: isColonized ? playerId : undefined,
        colonizedResource: isColonized ? (colonizedResource as any) : undefined,
      };
    });

    const startShipType = faction.id === 'orion_hegemony' ? 'cruiser' : 'interceptor';

    const centerEdge = getEdgeTowardCenter(startCoord);

    const homeSector: SectorTile = {
      id: `home_sector_${playerId}`,
      sectorNumber: homeConfig.sectorNumber || 221,
      name: homeConfig.name || faction.name,
      ring: 2,
      coord: startCoord,
      rotation: centerEdge,
      wormholes: homeConfig.wormholes || [true, false, true, false, true, false],
      planets,
      victoryPoints: homeConfig.victoryPoints || 3,
      hasArtifact: homeConfig.hasArtifact ?? true,
      hasDiscovery: false,
      ancientsCount: 0,
      discOwner: playerId,
      ships: [
        {
          id: `ship_${playerId}_start_${startShipType}`,
          ownerId: playerId,
          type: startShipType,
          damage: 0,
        },
      ],
    };

    sectors.push(homeSector);

    // Starting technologies
    const startingTechs = (faction.startingTechIds || [])
      .map((tId) => TECH_CATALOG.find((t) => t.id === tId))
      .filter((t): t is (typeof TECH_CATALOG)[number] => Boolean(t));

    // Initial population cubes remaining on board
    let moneyCubesRemaining = 10;
    let scienceCubesRemaining = 10;
    let materialCubesRemaining = 10;

    if (faction.id === 'hydran_progress') {
      // 1 material, 1 money, 1 adv science colonized -> 10 material, 10 money, 9 science on board
      scienceCubesRemaining = 9;
      materialCubesRemaining = 10;
      moneyCubesRemaining = 10;
    } else if (faction.id === 'planta') {
      // 1 material, 1 science, 0 money colonized
      moneyCubesRemaining = 11;
      scienceCubesRemaining = 10;
      materialCubesRemaining = 10;
    }

    // Eridani Empire starts with 2 facedown reputation tiles
    const startingRepTiles: number[] = [];
    if (faction.id === 'eridani_empire') {
      if (reputationBag.length > 0) startingRepTiles.push(reputationBag.pop()!);
      if (reputationBag.length > 0) startingRepTiles.push(reputationBag.pop()!);
    }

    players.push({
      id: playerId,
      name: `${faction.name}`,
      faction,
      color: faction.defaultColor,
      resources: { ...faction.startingResources },
      blueprints: createFactionBlueprints(faction.id),
      techTrack: {
        researched: startingTechs,
        militaryCount: startingTechs.filter((t) => t.category === 'military').length,
        gridCount: startingTechs.filter((t) => t.category === 'grid').length,
        nanoCount: startingTechs.filter((t) => t.category === 'nano').length,
      },
      influenceTrack: {
        totalDiscs: faction.startingDiscs,
        discsOnTrack: faction.startingDiscs - 1, // 1 disc used on home sector
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
  // 114 tiles: 99 regular (33 military, 33 grid, 33 nano) + 15 authentic rare techs
  const fullBag = createInitialTechBag();
  const { drawn: techSupply, remainingBag: techBag, regularDrawn, rareDrawn } =
    drawTechTilesForSetup(fullBag, players.length);

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
    discoveryBag: (() => {
      const bag = [...DISCOVERY_TILES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j]!, bag[i]!];
      }
      return bag;
    })(),
    activeCombat: null,
    pendingExplore: null,
    pendingDiscovery: null,
    pendingCombatConquest: null,
    resolvedCombatSectorIds: [],
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
