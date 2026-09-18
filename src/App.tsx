import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from './engine/types/state';
import { SectorTile, HexCoord, ShipType, SectorShip } from './engine/types/galaxy';
import { ShipPart } from './engine/types/blueprints';
import { createInitialGame } from './engine/rules/setup';
import { executeAction, getMaxMoveActivations } from './engine/rules/gameReducer';
import { calculateBlueprintStats } from './engine/rules/shipValidation';
import { getRingFromCoord, areSectorsConnected, findLegalExploreRotation, areCoordsEqual } from './engine/rules/hexMath';

// UI Components
import { Header } from './components/layout/Header';
import { HexGalaxyMap } from './components/map/HexGalaxyMap';
import { PlayerBoard } from './components/dashboard/PlayerBoard';
import { ActionBar } from './components/layout/ActionBar';
import { GameLogDrawer } from './components/layout/GameLogDrawer';
import { ShipBlueprintEditor } from './components/blueprints/ShipBlueprintEditor';
import { TechMarketModal } from './components/tech/TechMarketModal';
import { ExploreModal } from './components/actions/ExploreModal';
import { BuildModal, BuildItemPayload } from './components/actions/BuildModal';
import { MoveModal, MoveStepPayload, PlannedMove } from './components/actions/MoveModal';
import { InfluenceModal } from './components/actions/InfluenceModal';
import { TradeModal } from './components/actions/TradeModal';
import { CombatModal } from './components/combat/CombatModal';
import { CombatConquestModal } from './components/combat/CombatConquestModal';
import { ReputationTileModal } from './components/combat/ReputationTileModal';
import { GameOverModal } from './components/gameover/GameOverModal';
import { NewGameModal } from './components/setup/NewGameModal';
import { DiscoveryChoiceModal } from './components/discovery/DiscoveryChoiceModal';
import { SectorInspector } from './components/map/SectorInspector';
import { PhysicalPlayerBoardModal } from './components/dashboard/PhysicalPlayerBoardModal';

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => createInitialGame(2));
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number>(0);

  // Modal visibility states
  const [isExploreMode, setIsExploreMode] = useState<boolean>(false);
  const [pendingExploreCoords, setPendingExploreCoords] = useState<{
    from: HexCoord;
    target: HexCoord;
  } | null>(null);
  const [exploreRotation, setExploreRotation] = useState<number>(0);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isTechMarketOpen, setIsTechMarketOpen] = useState<boolean>(false);
  const [isPhysicalBoardOpen, setIsPhysicalBoardOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isMoveOpen, setIsMoveOpen] = useState<boolean>(false);
  const [isInfluenceOpen, setIsInfluenceOpen] = useState<boolean>(false);
  const [isTradeOpen, setIsTradeOpen] = useState<boolean>(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlayer = state.players[state.activePlayerIndex]!;
  const viewedPlayer = state.players[selectedViewIndex] || activePlayer;

  // Global hotkey to toggle Physical Player Board (P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        setIsPhysicalBoardOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Deep-linking / URL query params for direct mode testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'build') {
      setIsBuildOpen(true);
    } else if (action === 'move') {
      setIsMoveOpen(true);
    } else if (action === 'explore') {
      setIsExploreMode(true);
    }
  }, []);

  const handleStartNewGame = (playerCount: number, selectedFactionIds?: string[]) => {
    const newGame = createInitialGame(playerCount, selectedFactionIds);
    setState(newGame);
    setSelectedViewIndex(0);
    setSelectedSector(null);
    setIsNewGameOpen(false);
  };

  // Explore flow: User clicks an explorable hex on map
  const handleExploreTarget = (fromCoord: HexCoord, targetCoord: HexCoord) => {
    setPendingExploreCoords({ from: fromCoord, target: targetCoord });
    const ring = getRingFromCoord(targetCoord);
    const deck =
      ring === 1
        ? state.sectorDecks.ring1
        : ring === 2
        ? state.sectorDecks.ring2
        : state.sectorDecks.ring3;
    const candidate = deck[deck.length - 1];
    const source = state.sectors.find((s) => areCoordsEqual(s.coord, fromCoord));
    const hasWormholeGen = activePlayer.techTrack.researched.some(
      (t) => t.id === 'wormhole_generator'
    );

    const defaultRotation = (source && candidate)
      ? findLegalExploreRotation(source, candidate, targetCoord, hasWormholeGen, state.sectors)
      : 0;

    setExploreRotation(defaultRotation);
    setIsExploreMode(false);
  };

  const handleConfirmExplorePlacement = (rotation: number, claimInfluence: boolean) => {
    if (!pendingExploreCoords) return;
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation,
      claimInfluence,
    });

    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      // Synchronize viewed player to new active player if turn passed
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleDiscardExploreTile = () => {
    if (!pendingExploreCoords) return;
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation: 0,
      discard: true,
    });
    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    }
  };

  // Research flow
  const handleResearchTech = (techId: string, targetTrack?: 'military' | 'grid' | 'nano') => {
    const res = executeAction(state, {
      type: 'RESEARCH',
      playerId: activePlayer.id,
      techId,
      targetTrack,
    });
    if (res.success) {
      setState(res.newState);
      setIsTechMarketOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to research technology.');
    }
  };

  // Blueprint save flow
  const handleSaveBlueprint = (
    upgrades: { shipType: ShipType; slotIndex: number; partId: string | null }[]
  ) => {
    const res = executeAction(state, {
      type: 'UPGRADE',
      playerId: activePlayer.id,
      upgrades,
    });

    if (res.success) {
      setState(res.newState);
      setIsBlueprintOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to save blueprint.');
    }
  };

  // --- BUILD FLOW STATE & HANDLERS ---
  const eligibleBuildSectors = useMemo(() => {
    return state.sectors.filter((s) => {
      if (s.discOwner !== activePlayer.id) return false;
      const hasEnemies = s.ships.some((ship) => ship.ownerId !== activePlayer.id);
      return !hasEnemies;
    });
  }, [state.sectors, activePlayer.id]);

  const [buildSlots, setBuildSlots] = useState<BuildItemPayload[]>([
    { sectorId: '', itemType: 'interceptor' },
  ]);
  const [activeBuildSlotIndex, setActiveBuildSlotIndex] = useState<number>(0);

  // Initialize build slots when build opens
  useEffect(() => {
    if (isBuildOpen) {
      setBuildSlots([
        { sectorId: eligibleBuildSectors[0]?.id || '', itemType: 'interceptor' },
      ]);
      setActiveBuildSlotIndex(0);
    }
  }, [isBuildOpen, eligibleBuildSectors]);

  const handleSelectBuildSector = (sectorId: string) => {
    setBuildSlots((prev) => {
      const copy = [...prev];
      const targetIdx = activeBuildSlotIndex < copy.length ? activeBuildSlotIndex : 0;
      copy[targetIdx] = { ...copy[targetIdx], sectorId };
      return copy;
    });
  };

  // --- MOVE FLOW STATE & HANDLERS ---
  const playerShips = useMemo(() => {
    const list: { ship: SectorShip; initialSector: SectorTile }[] = [];
    for (const s of state.sectors) {
      for (const sh of s.ships) {
        if (sh.ownerId === activePlayer.id) {
          list.push({ ship: sh, initialSector: s });
        }
      }
    }
    return list;
  }, [state.sectors, activePlayer.id]);

  const movableShips = useMemo(() => {
    return playerShips.filter((p) => {
      const bp = activePlayer.blueprints[p.ship.type];
      const stats = bp ? calculateBlueprintStats(bp) : null;
      return stats ? stats.totalDriveSpeed > 0 : p.ship.type !== 'starbase';
    });
  }, [playerShips, activePlayer.blueprints]);

  const [plannedMoves, setPlannedMoves] = useState<PlannedMove[]>([]);
  const [selectedMoveShipId, setSelectedMoveShipId] = useState<string>('');
  const [activeActivationIndex, setActiveActivationIndex] = useState<number>(0);

  useEffect(() => {
    if (isMoveOpen) {
      setPlannedMoves([]);
      setActiveActivationIndex(0);
      setSelectedMoveShipId(movableShips[0]?.ship.id || playerShips[0]?.ship.id || '');
    }
  }, [isMoveOpen, movableShips, playerShips]);

  // Compute simulated sector for each ship based on plannedMoves
  const simulatedShipSector = useMemo(() => {
    const map = new Map<string, SectorTile>();
    for (const ps of playerShips) {
      map.set(ps.ship.id, ps.initialSector);
    }
    for (const m of plannedMoves) {
      const destSec = state.sectors.find((s) => s.id === m.toSectorId);
      if (destSec) {
        map.set(m.shipId, destSec);
      }
    }
    return map;
  }, [playerShips, plannedMoves, state.sectors]);

  // Check if a ship was pinned by hostile forces in an earlier move step
  const isShipPinned = (shipId: string): boolean => {
    for (const m of plannedMoves) {
      if (m.shipId === shipId) {
        const destSec = state.sectors.find((s) => s.id === m.toSectorId);
        if (
          destSec &&
          (destSec.ancientsCount > 0 ||
            destSec.hasGCDS ||
            destSec.ships.some((sh) => sh.ownerId !== activePlayer.id))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const maxMoves = getMaxMoveActivations(activePlayer);
  const hasWormholeGen = activePlayer.techTrack.researched.some((t) => t.id === 'wormhole_generator');

  const currentMoveShip = playerShips.find((p) => p.ship.id === selectedMoveShipId)?.ship;
  const currentSimSector = simulatedShipSector.get(selectedMoveShipId);
  const currentShipBlueprint = currentMoveShip ? activePlayer.blueprints[currentMoveShip.type] : null;
  const currentShipStats = currentShipBlueprint ? calculateBlueprintStats(currentShipBlueprint) : null;
  const currentShipDriveSpeed = currentShipStats ? currentShipStats.totalDriveSpeed : 0;

  const currentActivationMoves = useMemo(
    () => plannedMoves.filter((m) => m.activationIndex === activeActivationIndex),
    [plannedMoves, activeActivationIndex]
  );
  const movePointsUsedInCurrentActivation = currentActivationMoves.length;

  // Destinations connected to the ship's current simulated sector via wormholes
  const connectedDestinations = useMemo(() => {
    if (!currentMoveShip || !currentSimSector) return [];
    if (activeActivationIndex >= maxMoves) return [];
    if (currentShipDriveSpeed <= 0) return [];
    if (isShipPinned(currentMoveShip.id)) return [];

    // If this activation already started with another ship:
    if (currentActivationMoves.length > 0 && currentActivationMoves[0].shipId !== currentMoveShip.id) {
      return [];
    }

    // If current activation has already used all drive speed steps:
    if (currentActivationMoves.length >= currentShipDriveSpeed) {
      return [];
    }

    // Hostile presence pins the ship immediately
    const hasEnemies =
      currentSimSector.ancientsCount > 0 ||
      currentSimSector.hasGCDS ||
      currentSimSector.ships.some((sh) => sh.ownerId !== activePlayer.id);
    const hasMovedHere = plannedMoves.some(
      (m) => m.shipId === selectedMoveShipId && m.toSectorId === currentSimSector.id
    );
    if (hasMovedHere && hasEnemies) {
      return [];
    }

    return state.sectors.filter(
      (s) => s.id !== currentSimSector.id && areSectorsConnected(currentSimSector, s, hasWormholeGen)
    );
  }, [
    currentMoveShip,
    currentSimSector,
    activeActivationIndex,
    maxMoves,
    currentShipDriveSpeed,
    currentActivationMoves,
    plannedMoves,
    selectedMoveShipId,
    activePlayer.id,
    state.sectors,
    hasWormholeGen,
  ]);

  const handleAddMoveDestination = (destSectorId: string) => {
    if (!currentMoveShip || !currentSimSector) return;
    if (activeActivationIndex >= maxMoves) return;
    if (currentShipDriveSpeed <= 0) return;
    if (isShipPinned(currentMoveShip.id)) return;
    if (currentActivationMoves.length > 0 && currentActivationMoves[0].shipId !== currentMoveShip.id) return;
    if (currentActivationMoves.length >= currentShipDriveSpeed) return;

    const destSec = state.sectors.find((s) => s.id === destSectorId);
    if (!destSec) return;

    const stepNumber = currentActivationMoves.length + 1;
    const newMove: PlannedMove = {
      id: `move_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      shipId: currentMoveShip.id,
      shipType: currentMoveShip.type,
      fromSectorId: currentSimSector.id,
      fromSectorNumber: currentSimSector.sectorNumber,
      toSectorId: destSec.id,
      toSectorNumber: destSec.sectorNumber,
      activationIndex: activeActivationIndex,
      stepInActivation: stepNumber,
      driveSpeed: currentShipDriveSpeed,
    };

    setPlannedMoves((prev) => [...prev, newMove]);

    // Pinning or speed limit check
    const isHostile =
      destSec.ancientsCount > 0 ||
      destSec.hasGCDS ||
      destSec.ships.some((sh) => sh.ownerId !== activePlayer.id);

    if (isHostile || stepNumber >= currentShipDriveSpeed) {
      setActiveActivationIndex((prev) => prev + 1);
    }
  };

  const handleFinishCurrentActivation = () => {
    if (currentActivationMoves.length > 0) {
      setActiveActivationIndex((prev) => prev + 1);
    }
  };

  const handleSelectMoveShipId = (shipId: string) => {
    if (shipId === selectedMoveShipId) return;
    if (currentActivationMoves.length > 0) {
      // Switching ships completes the in-progress activation early
      setActiveActivationIndex((prev) => prev + 1);
    }
    setSelectedMoveShipId(shipId);
  };

  const handleSelectMoveShipSector = (sectorId: string) => {
    const shipsInSector = playerShips.filter((p) => {
      const sim = simulatedShipSector.get(p.ship.id);
      return sim?.id === sectorId;
    });
    if (shipsInSector.length > 0) {
      const currentIdx = shipsInSector.findIndex((p) => p.ship.id === selectedMoveShipId);
      const nextShip = shipsInSector[(currentIdx + 1) % shipsInSector.length];
      handleSelectMoveShipId(nextShip.ship.id);
    }
  };

  const handleClearPlannedMoves = () => {
    setPlannedMoves([]);
    setActiveActivationIndex(0);
  };

  const handleRemovePlannedMove = (index: number) => {
    const nextPlanned = plannedMoves.slice(0, index);
    setPlannedMoves(nextPlanned);
    if (nextPlanned.length === 0) {
      setActiveActivationIndex(0);
      return;
    }
    const lastMove = nextPlanned[nextPlanned.length - 1];
    const actMoves = nextPlanned.filter((m) => m.activationIndex === lastMove.activationIndex);
    const ship = playerShips.find((p) => p.ship.id === lastMove.shipId)?.ship;
    const bp = ship ? activePlayer.blueprints[ship.type] : null;
    const spd = bp ? calculateBlueprintStats(bp).totalDriveSpeed : 1;
    const lastDestSec = state.sectors.find((s) => s.id === lastMove.toSectorId);
    const isHostile =
      lastDestSec &&
      (lastDestSec.ancientsCount > 0 ||
        lastDestSec.hasGCDS ||
        lastDestSec.ships.some((sh) => sh.ownerId !== activePlayer.id));

    if (isHostile || actMoves.length >= spd) {
      setActiveActivationIndex(lastMove.activationIndex + 1);
    } else {
      setActiveActivationIndex(lastMove.activationIndex);
      setSelectedMoveShipId(lastMove.shipId);
    }
  };

  // Build flow
  const handleBuild = (items: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith' }[]) => {
    const res = executeAction(state, {
      type: 'BUILD',
      playerId: activePlayer.id,
      items,
    });
    if (res.success) {
      setState(res.newState);
      setIsBuildOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Construction failed.');
    }
  };

  // Move flow
  const handleMove = (moves: MoveStepPayload[]) => {
    const res = executeAction(state, {
      type: 'MOVE',
      playerId: activePlayer.id,
      moves,
    });
    if (res.success) {
      setState(res.newState);
      setIsMoveOpen(false);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Movement maneuver failed.');
    }
  };

  // Colonize planet flow
  const handleColonizePlanet = (
    sectorId: string,
    planetIndex: number,
    chosenResource?: 'money' | 'science' | 'material'
  ) => {
    const res = executeAction(state, {
      type: 'COLONIZE',
      playerId: activePlayer.id,
      sectorId,
      planetIndex,
      chosenResource,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Colonization failed.');
    }
  };

  // Trade flow
  const handleTrade = (fromResource: 'science' | 'material', amount: number) => {
    const res = executeAction(state, {
      type: 'TRADE',
      playerId: activePlayer.id,
      fromResource,
      amount,
    });
    if (res.success) {
      setState(res.newState);
      setIsTradeOpen(false);
    } else {
      showToast(res.error || 'Trade failed.');
    }
  };

  // Pass turn
  const handlePass = () => {
    const res = executeAction(state, {
      type: 'PASS',
      playerId: activePlayer.id,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to pass turn.');
    }
  };

  // Discovery choice flow
  const handleDiscoveryChoice = (
    keepForVictoryPoints: boolean,
    equipShipType?: ShipType,
    equipSlotIndex?: number
  ) => {
    if (!state.pendingDiscovery) return;
    const res = executeAction(state, {
      type: 'DISCOVERY_CHOICE',
      playerId: state.pendingDiscovery.playerId,
      sectorId: state.pendingDiscovery.sectorId,
      keepForVictoryPoints,
      equipShipType,
      equipSlotIndex,
    });
    if (res.success) {
      setState(res.newState);
      if (equipShipType && equipSlotIndex !== undefined) {
        showToast(`Ancient tech installed on ${equipShipType.toUpperCase()}!`);
      }
    } else {
      showToast(res.error || 'Failed to claim discovery.');
    }
  };

  // Influence flow (Claim / Abandon sector control)
  const handleExecuteInfluence = (claimSectors: string[], abandonSectors: string[]) => {
    const res = executeAction(state, {
      type: 'INFLUENCE',
      playerId: activePlayer.id,
      claimSectors: claimSectors.length > 0 ? claimSectors : undefined,
      abandonSectors: abandonSectors.length > 0 ? abandonSectors : undefined,
    });
    if (res.success) {
      setState(res.newState);
      setIsInfluenceOpen(false);
      showToast('Influence Action executed successfully! Colony ships readied.');
    } else {
      showToast(res.error || 'Failed to execute Influence action.');
    }
  };

  const handleClaimInfluence = (sectorId: string) => {
    const res = executeAction(state, {
      type: 'INFLUENCE',
      playerId: activePlayer.id,
      claimSectors: [sectorId],
    });
    if (res.success) {
      setState(res.newState);
      showToast('Influence Disc placed! Sector is now under your control.');
    } else {
      showToast(res.error || 'Failed to place influence disc.');
    }
  };

  const handleAbandonInfluence = (sectorId: string) => {
    const res = executeAction(state, {
      type: 'INFLUENCE',
      playerId: activePlayer.id,
      abandonSectors: [sectorId],
    });
    if (res.success) {
      setState(res.newState);
      showToast('Influence Disc retrieved.');
    } else {
      showToast(res.error || 'Failed to abandon sector.');
    }
  };

  // Step Combat
  const handleStepCombat = (retreatShipIds?: string[], retreatDestinationSectorId?: string) => {
    if (!state.activeCombat) return;
    const res = executeAction(state, {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: activePlayer.id,
      sectorId: state.activeCombat.sectorId,
      retreatShipIds,
      retreatDestinationSectorId,
    });
    if (res.success) {
      setState(res.newState);
      if (!res.newState.activeCombat) {
        showToast('Combat engagement concluded.');
      }
    } else {
      showToast(res.error || 'Combat action failed.');
    }
  };

  // Claim Reputation Tile
  const handleClaimReputationTile = (selectedTileIndex?: number, replaceTrackIndex?: number) => {
    if (!state.pendingReputationDraw) return;
    const res = executeAction(state, {
      type: 'CLAIM_REPUTATION_TILE',
      playerId: state.pendingReputationDraw.playerId,
      selectedTileIndex,
      replaceTrackIndex,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to claim reputation tile.');
    }
  };

  // Auto-Resolve Combat
  const handleAutoResolveCombat = () => {
    if (!state.activeCombat) return;
    let currentState = state;
    let iterations = 0;
    while (currentState.activeCombat && iterations < 100) {
      iterations++;
      const res = executeAction(currentState, {
        type: 'RESOLVE_COMBAT_STEP',
        playerId: activePlayer.id,
        sectorId: currentState.activeCombat.sectorId,
      });
      if (!res.success) break;
      currentState = res.newState;
    }
    setState(currentState);
    showToast('Combat engagement auto-resolved.');
  };

  // Combat Conquest Flow (Sector Control & Colonization)
  const handleCombatConquest = (claimInfluence: boolean, colonizePlanetIndices: number[]) => {
    if (!state.pendingCombatConquest) return;
    const res = executeAction(state, {
      type: 'COMBAT_CONQUEST',
      playerId: state.pendingCombatConquest.winnerPlayerId,
      sectorId: state.pendingCombatConquest.sectorId,
      claimInfluence,
      colonizePlanetIndices,
    });
    if (res.success) {
      setState(res.newState);
      if (claimInfluence) {
        showToast('Sector control secured!');
      }
      if (colonizePlanetIndices.length > 0) {
        showToast(
          `Colonized ${colonizePlanetIndices.length} habitat${
            colonizePlanetIndices.length > 1 ? 's' : ''
          }!`
        );
      }
    } else {
      showToast(res.error || 'Failed to resolve combat conquest.');
    }
  };

  // Find candidate tile for exploration preview if pending
  const candidateTile = React.useMemo(() => {
    if (!pendingExploreCoords) return null;
    const ring = getRingFromCoord(pendingExploreCoords.target);
    const deck =
      ring === 1
        ? state.sectorDecks.ring1
        : ring === 2
        ? state.sectorDecks.ring2
        : state.sectorDecks.ring3;
    return deck[deck.length - 1] || null;
  }, [pendingExploreCoords, state.sectorDecks]);

  const sourceSector = React.useMemo(() => {
    if (!pendingExploreCoords) return null;
    return state.sectors.find(
      (s) =>
        s.coord.q === pendingExploreCoords.from.q &&
        s.coord.r === pendingExploreCoords.from.r
    ) || null;
  }, [pendingExploreCoords, state.sectors]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        state={state}
        selectedViewIndex={selectedViewIndex}
        onSelectActiveViewPlayer={(idx) => setSelectedViewIndex(idx)}
        onNewGame={() => setIsNewGameOpen(true)}
        onOpenTechTray={() => setIsTechMarketOpen(true)}
        onOpenPlayerBoard={() => setIsPhysicalBoardOpen(true)}
      />

      {/* Main Playing Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Galaxy Hex Map */}
        <HexGalaxyMap
          state={state}
          selectedSectorId={selectedSector?.id || null}
          onSelectSector={(s) => setSelectedSector(s)}
          isExploreMode={isExploreMode}
          onExploreTarget={handleExploreTarget}
          onColonizePlanet={handleColonizePlanet}
          pendingExplore={
            pendingExploreCoords && candidateTile
              ? {
                  from: pendingExploreCoords.from,
                  target: pendingExploreCoords.target,
                  candidateTile,
                  rotation: exploreRotation,
                }
              : null
          }
          onRotateExplore={(delta) =>
            setExploreRotation((r) => ((r + delta) % 6 + 6) % 6)
          }
          buildMode={
            isBuildOpen
              ? {
                  eligibleSectorIds: eligibleBuildSectors.map((s) => s.id),
                  selectedSectorId: buildSlots[activeBuildSlotIndex]?.sectorId || null,
                  queuedSectors: eligibleBuildSectors.map((s) => {
                    const count = buildSlots.filter((slot) => slot.sectorId === s.id).length;
                    const items = buildSlots
                      .filter((slot) => slot.sectorId === s.id)
                      .map((slot) => slot.itemType.slice(0, 3).toUpperCase())
                      .join('+');
                    return {
                      sectorId: s.id,
                      summary: count > 0 ? items : '',
                    };
                  }),
                  onSelectSector: handleSelectBuildSector,
                }
              : null
          }
          moveMode={
            isMoveOpen
              ? {
                  playerShipSectorIds: Array.from(
                    new Set(Array.from(simulatedShipSector.values()).map((s) => s.id))
                  ),
                  selectedShipId: selectedMoveShipId,
                  currentSimSectorId: currentSimSector?.id || null,
                  connectedDestinationSectorIds: connectedDestinations.map((s) => s.id),
                  plannedMoves,
                  onSelectShipSector: handleSelectMoveShipSector,
                  onSelectDestinationSector: handleAddMoveDestination,
                  onRemovePlannedMove: handleRemovePlannedMove,
                }
              : null
          }
        />

        {/* Floating Player Dashboard (Bottom-Left) */}
        <div className="absolute top-4 left-4 z-20 w-80 max-w-[calc(100vw-32px)] pointer-events-auto">
          <PlayerBoard
            player={viewedPlayer}
            isActive={viewedPlayer.id === activePlayer.id}
            sectors={state.sectors}
            onOpenBlueprints={() => setIsBlueprintOpen(true)}
            onOpenTechMarket={() => setIsTechMarketOpen(true)}
            onOpenTrade={() => setIsTradeOpen(true)}
            onOpenPhysicalBoard={() => setIsPhysicalBoardOpen(true)}
          />
        </div>

        {/* Floating Sector Detail & Fleet Inspector (Top-Right) */}
        {selectedSector && (
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <SectorInspector
              sector={state.sectors.find((s) => s.id === selectedSector.id) || selectedSector}
              players={state.players}
              activePlayer={activePlayer}
              onColonizePlanet={handleColonizePlanet}
              onClaimInfluence={handleClaimInfluence}
              onAbandonInfluence={handleAbandonInfluence}
              onClose={() => setSelectedSector(null)}
            />
          </div>
        )}

        {/* Action Bar (Bottom-Center) - Hidden during exploration, building, moving, and influence so command dock takes focus */}
        {state.phase === 'ACTION_PHASE' && !pendingExploreCoords && !isBuildOpen && !isMoveOpen && !isInfluenceOpen && (
          <ActionBar
            activePlayer={activePlayer}
            isExploreMode={isExploreMode}
            onToggleExplore={() => setIsExploreMode((prev) => !prev)}
            onOpenResearch={() => setIsTechMarketOpen(true)}
            onOpenUpgrade={() => setIsBlueprintOpen(true)}
            onOpenBuild={() => setIsBuildOpen(true)}
            onOpenMove={() => setIsMoveOpen(true)}
            onOpenInfluence={() => setIsInfluenceOpen(true)}
            onPass={handlePass}
          />
        )}

        {/* Game Event Log Drawer (Bottom-Right) */}
        <GameLogDrawer logs={state.log} />

        {/* Error Toast Notification */}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl animate-bounce">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      {pendingExploreCoords && candidateTile && sourceSector && (
        <ExploreModal
          player={activePlayer}
          fromCoord={pendingExploreCoords.from}
          targetCoord={pendingExploreCoords.target}
          candidateTile={candidateTile}
          sourceSector={sourceSector}
          rotation={exploreRotation}
          onRotate={setExploreRotation}
          onConfirmPlacement={handleConfirmExplorePlacement}
          onDiscard={handleDiscardExploreTile}
          onClose={() => setPendingExploreCoords(null)}
        />
      )}

      {isBlueprintOpen && (
        <ShipBlueprintEditor
          player={viewedPlayer}
          onSaveBlueprint={handleSaveBlueprint}
          onClose={() => setIsBlueprintOpen(false)}
        />
      )}

      {isTechMarketOpen && (
        <TechMarketModal
          player={viewedPlayer}
          activePlayer={activePlayer}
          techSupply={state.techSupply}
          techBagCount={state.techBag.length}
          onResearchTech={handleResearchTech}
          onClose={() => setIsTechMarketOpen(false)}
        />
      )}

      {isBuildOpen && (
        <BuildModal
          player={activePlayer}
          sectors={state.sectors}
          eligibleSectors={eligibleBuildSectors}
          slots={buildSlots}
          onChangeSlots={setBuildSlots}
          activeSlotIndex={activeBuildSlotIndex}
          onSelectSlotIndex={setActiveBuildSlotIndex}
          onBuild={handleBuild}
          onClose={() => setIsBuildOpen(false)}
        />
      )}

      {isMoveOpen && (
        <MoveModal
          player={activePlayer}
          sectors={state.sectors}
          playerShips={playerShips}
          simulatedShipSector={simulatedShipSector}
          connectedDestinations={connectedDestinations}
          plannedMoves={plannedMoves}
          activeActivationIndex={activeActivationIndex}
          currentShipDriveSpeed={currentShipDriveSpeed}
          movePointsUsedInCurrentActivation={movePointsUsedInCurrentActivation}
          isShipPinned={isShipPinned}
          onAddMove={handleAddMoveDestination}
          onRemoveMove={handleRemovePlannedMove}
          onClearMoves={handleClearPlannedMoves}
          selectedShipId={selectedMoveShipId}
          onSelectShipId={handleSelectMoveShipId}
          onFinishActivation={handleFinishCurrentActivation}
          onMove={handleMove}
          onClose={() => setIsMoveOpen(false)}
        />
      )}

      {isTradeOpen && (
        <TradeModal
          player={viewedPlayer}
          onTrade={handleTrade}
          onClose={() => setIsTradeOpen(false)}
        />
      )}

      {isInfluenceOpen && (
        <InfluenceModal
          player={activePlayer}
          sectors={state.sectors}
          onClose={() => setIsInfluenceOpen(false)}
          onConfirm={handleExecuteInfluence}
        />
      )}

      {state.activeCombat && (
        <CombatModal
          state={state}
          combat={state.activeCombat}
          onStepCombat={handleStepCombat}
          onAutoResolve={handleAutoResolveCombat}
        />
      )}

      {state.pendingReputationDraw && (
        <ReputationTileModal
          state={state}
          pendingDraw={state.pendingReputationDraw}
          onClaimTile={handleClaimReputationTile}
        />
      )}

      {state.pendingCombatConquest && (
        <CombatConquestModal
          state={state}
          conquest={state.pendingCombatConquest}
          onConfirm={handleCombatConquest}
        />
      )}

      {state.pendingDiscovery && (
        <DiscoveryChoiceModal
          discovery={state.pendingDiscovery.discovery}
          player={
            state.players.find((p) => p.id === state.pendingDiscovery!.playerId) ||
            activePlayer
          }
          onChoice={handleDiscoveryChoice}
        />
      )}

      {state.phase === 'GAME_OVER' && (
        <GameOverModal
          state={state}
          onNewGame={() => setIsNewGameOpen(true)}
        />
      )}

      {isPhysicalBoardOpen && (
        <PhysicalPlayerBoardModal
          player={viewedPlayer}
          players={state.players}
          activePlayerId={activePlayer.id}
          sectors={state.sectors}
          onClose={() => setIsPhysicalBoardOpen(false)}
          onSelectPlayer={(pId) => {
            const idx = state.players.findIndex((p) => p.id === pId);
            if (idx >= 0) setSelectedViewIndex(idx);
          }}
          onOpenBlueprintEditor={(shipType) => {
            setIsPhysicalBoardOpen(false);
            setIsBlueprintOpen(true);
          }}
          onOpenTechMarket={() => {
            setIsPhysicalBoardOpen(false);
            setIsTechMarketOpen(true);
          }}
        />
      )}

      {isNewGameOpen && (
        <NewGameModal
          onStartGame={handleStartNewGame}
          onClose={() => setIsNewGameOpen(false)}
        />
      )}
    </div>
  );
};
