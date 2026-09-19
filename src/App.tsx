import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from './engine/types/state';
import { SectorTile, HexCoord, ShipType, SectorShip } from './engine/types/galaxy';
import { ShipPart } from './engine/types/blueprints';
import { createInitialGame } from './engine/rules/setup';
import { executeAction, getMaxMoveActivations } from './engine/rules/gameReducer';
import { calculateBlueprintStats } from './engine/rules/shipValidation';
import { getRingFromCoord, areSectorsConnected, findLegalExploreRotation, areCoordsEqual } from './engine/rules/hexMath';
import { buildCombatUnitsForSector, getSectorDefenderOwnerId, sortUnitsByInitiative } from './engine/rules/combatEngine';

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
import { LiveScoreboardModal } from './components/dashboard/LiveScoreboardModal';
import { TableSessionModal } from './components/layout/TableSessionModal';
import { ArtifactKeyModal } from './components/actions/ArtifactKeyModal';
import { BankruptcyModal } from './components/actions/BankruptcyModal';
import { LobbyView } from './components/lobby/LobbyView';
import { GalacticGalleryModal } from './components/gallery/GalacticGalleryModal';
import { BugReportModal } from './components/feedback/BugReportModal';
import { BugReportCornerButton } from './components/feedback/BugReportCornerButton';
import {
  loadActiveGameState,
  saveGameState,
  loadTable,
  subscribeToGameSync,
  getTableNumber,
} from './engine/rules/persistence';

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => {
    const loaded = loadActiveGameState();
    return loaded || createInitialGame(2);
  });
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number>(0);

  const isRemoteSyncRef = React.useRef<boolean>(false);
  const lastStateJsonRef = React.useRef<string>(JSON.stringify(state));

  // Auto-save game state to localStorage on local state changes
  useEffect(() => {
    const currentJson = JSON.stringify(state);
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      lastStateJsonRef.current = currentJson;
      return;
    }
    if (currentJson !== lastStateJsonRef.current) {
      lastStateJsonRef.current = currentJson;
      saveGameState(state);
    }
  }, [state]);

  // Modal visibility states
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isExploreMode, setIsExploreMode] = useState<boolean>(false);
  const [pendingExploreCoords, setPendingExploreCoords] = useState<{
    from: HexCoord;
    target: HexCoord;
  } | null>(null);
  const [exploreRotation, setExploreRotation] = useState<number>(0);
  const [dracoSelectedTileIndex, setDracoSelectedTileIndex] = useState<number>(0);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isTechMarketOpen, setIsTechMarketOpen] = useState<boolean>(false);
  const [isPhysicalBoardOpen, setIsPhysicalBoardOpen] = useState<boolean>(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isTableSessionOpen, setIsTableSessionOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isMoveOpen, setIsMoveOpen] = useState<boolean>(false);
  const [isInfluenceOpen, setIsInfluenceOpen] = useState<boolean>(false);
  const [isTradeOpen, setIsTradeOpen] = useState<boolean>(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlayer = state.players[state.activePlayerIndex]!;
  const viewedPlayer = state.players[selectedViewIndex] || activePlayer;
  const tableNum = getTableNumber(state);

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

  // Table & Seat routing
  const [inGame, setInGame] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    return params.has('table');
  });

  const [currentSeat, setCurrentSeat] = useState<number | 'all' | 'spectator'>(() => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    const seatParam = params.get('seat');
    if (!seatParam || seatParam === 'all') return 'all';
    if (seatParam === 'spectator') return 'spectator';
    const num = parseInt(seatParam, 10);
    return isNaN(num) ? 'all' : num;
  });

  const isTurnGated =
    currentSeat !== 'all' &&
    currentSeat !== 'spectator' &&
    typeof currentSeat === 'number' &&
    state.activePlayerIndex !== currentSeat;

  const hideOpponentReputation =
    currentSeat !== 'all' &&
    currentSeat !== 'spectator' &&
    typeof currentSeat === 'number' &&
    viewedPlayer.id !== state.players[currentSeat]?.id &&
    state.phase !== 'GAME_OVER';

  // Real-time Cross-Tab / Multiplayer Status Sync
  useEffect(() => {
    if (!inGame || !state.id) return;

    const unsubscribe = subscribeToGameSync(state.id, (remoteState) => {
      const remoteJson = JSON.stringify(remoteState);
      if (remoteJson !== lastStateJsonRef.current) {
        lastStateJsonRef.current = remoteJson;
        isRemoteSyncRef.current = true;
        setState(remoteState);
      }
    });

    return unsubscribe;
  }, [inGame, state.id]);

  const handleStartNewGameFromLobby = (
    playerCount: number,
    factionIds: string[],
    tableId: string,
    seat: number | 'all'
  ) => {
    const newGame = createInitialGame(playerCount, factionIds);
    const num = parseInt(tableId.replace(/\D/g, ''), 10) || 101;
    (newGame as any).tableNumber = num;
    newGame.id = tableId;
    saveGameState(newGame);
    setState(newGame);
    setCurrentSeat(seat);
    if (typeof seat === 'number') {
      setSelectedViewIndex(seat);
    }
    setInGame(true);

    if (typeof window !== 'undefined') {
      const seatParam = seat === 'all' ? '' : `&seat=${seat}`;
      window.history.pushState({}, '', `?table=${tableId}${seatParam}`);
    }
  };

  const handleJoinTableFromLobby = (
    tableId: string,
    seat: number | 'all' | 'spectator'
  ) => {
    let loaded = loadTable(tableId);
    if (!loaded) {
      loaded = createInitialGame(2);
      const num = parseInt(tableId.replace(/\D/g, ''), 10) || 101;
      (loaded as any).tableNumber = num;
      loaded.id = tableId;
      saveGameState(loaded);
    }
    setState(loaded);
    setCurrentSeat(seat);
    if (typeof seat === 'number' && loaded.players[seat]) {
      setSelectedViewIndex(seat);
    }
    setInGame(true);

    if (typeof window !== 'undefined') {
      const seatParam =
        seat === 'all' ? '' : seat === 'spectator' ? '&seat=spectator' : `&seat=${seat}`;
      window.history.pushState({}, '', `?table=${tableId}${seatParam}`);
    }
  };

  const handleReturnToLobby = () => {
    setInGame(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handleChangeSeat = (seat: number | 'all' | 'spectator') => {
    setCurrentSeat(seat);
    if (typeof seat === 'number' && state.players[seat]) {
      setSelectedViewIndex(seat);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table') || state.id;
      const seatParam =
        seat === 'all' ? '' : seat === 'spectator' ? '&seat=spectator' : `&seat=${seat}`;
      window.history.replaceState({}, '', `?table=${tableParam}${seatParam}`);
    }
  };

  const handleAllocateArtifactReward = (resources: { money: number; science: number; materials: number }) => {
    if (!state.pendingArtifactReward) return;
    const result = executeAction(state, {
      type: 'ALLOCATE_ARTIFACT_REWARD',
      playerId: state.pendingArtifactReward.playerId,
      resources,
    });
    if (result.success) {
      setState(result.newState);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Failed to allocate artifact reward');
    }
  };

  const handleEmergencyTradeBankruptcy = (from: 'materials' | 'science') => {
    if (!state.pendingBankruptcy) return;
    const player =
      state.players.find((p) => p.id === state.pendingBankruptcy!.playerId) || activePlayer;
    const ratio = player.faction.tradeRatio || 2;
    if (player.resources[from] < ratio) return;

    const result = executeAction(state, {
      type: 'TRADE_RESOURCE',
      from,
      to: 'money',
      amount: ratio,
    });
    if (result.success) {
      const updated = result.newState;
      const updatedPlayer = updated.players.find((p) => p.id === player.id)!;
      if (updatedPlayer.resources.money >= 0) {
        updated.pendingBankruptcy = null;
        showToast('Treasury balanced! Bankruptcy averted.');
      } else {
        updated.pendingBankruptcy = {
          playerId: player.id,
          deficit: Math.abs(updatedPlayer.resources.money),
        };
      }
      setState(updated);
    } else {
      showToast(result.error || 'Failed to trade resources.');
    }
  };

  const handleAbandonSectorBankruptcy = (sectorId: string) => {
    if (!state.pendingBankruptcy) return;
    const result = executeAction(state, {
      type: 'ABANDON_SECTOR_BANKRUPTCY',
      playerId: state.pendingBankruptcy.playerId,
      sectorId,
    });
    if (result.success) {
      setState(result.newState);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Failed to abandon sector');
    }
  };

  const handleStartNewGame = (playerCount: number, selectedFactionIds?: string[]) => {
    const newGame = createInitialGame(playerCount, selectedFactionIds);
    setState(newGame);
    setSelectedViewIndex(0);
    setSelectedSector(null);
    setIsNewGameOpen(false);
  };

  // Explore flow: User clicks an explorable hex on map
  const handleExploreTarget = (fromCoord: HexCoord, targetCoord: HexCoord) => {
    const ring = getRingFromCoord(targetCoord);
    const deck =
      ring === 1
        ? state.sectorDecks.ring1
        : ring === 2
        ? state.sectorDecks.ring2
        : state.sectorDecks.ring3;
    if (!deck || deck.length === 0) {
      showToast(`No Ring ${ring} sectors remaining in the stack!`);
      return;
    }

    setPendingExploreCoords({ from: fromCoord, target: targetCoord });
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

  const handleConfirmExplorePlacement = (
    rotation: number,
    claimInfluence: boolean,
    chosenTileIndex?: number
  ) => {
    if (!pendingExploreCoords) return;
    const isSecond = !!(state.pendingExploreActivations && state.pendingExploreActivations > 0);
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation,
      claimInfluence,
      chosenTileIndex,
      isSecondActivation: isSecond,
      requireConfirmation: true,
    });

    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      if (res.newState.pendingExploreActivations && res.newState.pendingExploreActivations > 0) {
        setIsExploreMode(true);
        showToast('🌿 Planta Expansion: 1 Explore Activation remaining! Select an adjacent hex on the map.');
      } else {
        // Synchronize viewed player to new active player if turn passed
        setSelectedViewIndex(res.newState.activePlayerIndex);
      }
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleDiscardExploreTile = (chosenTileIndex?: number) => {
    if (!pendingExploreCoords) return;
    const isSecond = !!(state.pendingExploreActivations && state.pendingExploreActivations > 0);
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: activePlayer.id,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation: 0,
      discard: true,
      chosenTileIndex,
      isSecondActivation: isSecond,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setPendingExploreCoords(null);
      if (res.newState.pendingExploreActivations && res.newState.pendingExploreActivations > 0) {
        setIsExploreMode(true);
        showToast('🌿 Planta Expansion: 1 Explore Activation remaining! Select an adjacent hex on the map.');
      } else {
        setSelectedViewIndex(res.newState.activePlayerIndex);
      }
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleFinishExplore = () => {
    const res = executeAction(state, {
      type: 'FINISH_EXPLORE',
      playerId: activePlayer.id,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsExploreMode(false);
      setPendingExploreCoords(null);
      setSelectedViewIndex(res.newState.activePlayerIndex);
      showToast('Finished exploration action.');
    } else {
      showToast(res.error || 'Could not finish exploration.');
    }
  };

  // Research flow (supports single tech or array of technologies for Hydran double research)
  const handleResearchTech = (
    researchesOrId: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[] | string,
    targetTrack?: 'military' | 'grid' | 'nano'
  ) => {
    let researches: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[];
    if (Array.isArray(researchesOrId)) {
      researches = researchesOrId;
    } else {
      researches = [{ techId: researchesOrId, targetTrack }];
    }

    const res = executeAction(state, {
      type: 'RESEARCH',
      playerId: activePlayer.id,
      researches,
      requireConfirmation: true,
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
      requireConfirmation: true,
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
      requireConfirmation: true,
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
      requireConfirmation: true,
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
      requireConfirmation: true,
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
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedViewIndex(res.newState.activePlayerIndex);
    } else {
      showToast(res.error || 'Failed to pass turn.');
    }
  };

  // Turn action confirm and revert handlers
  const handleConfirmTurnAction = () => {
    if (!state.pendingActionConfirmation) return;
    const res = executeAction(state, {
      type: 'CONFIRM_TURN_ACTION',
      playerId: state.pendingActionConfirmation.playerId,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedViewIndex(res.newState.activePlayerIndex);
      showToast('Action confirmed and turn passed.');
    } else {
      showToast(res.error || 'Failed to confirm action.');
    }
  };

  const handleRevertTurnAction = () => {
    if (!state.pendingActionConfirmation) return;
    const res = executeAction(state, {
      type: 'REVERT_TURN_ACTION',
      playerId: state.pendingActionConfirmation.playerId,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedViewIndex(res.newState.activePlayerIndex);
      showToast('Action reverted.');
    } else {
      showToast(res.error || 'Failed to revert action.');
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
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      if (equipShipType && equipSlotIndex !== undefined) {
        showToast(`Ancient tech installed on ${equipShipType.toUpperCase()}!`);
      }
      setSelectedViewIndex(res.newState.activePlayerIndex);
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
      requireConfirmation: true,
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

    // Determine commanding player ID
    let commandingPlayerId = typeof currentSeat === 'number' && state.players[currentSeat]
      ? state.players[currentSeat].id
      : undefined;

    if (!commandingPlayerId) {
      // In 'all' mode: automatically use the active ship's owner (or activePlayer if neutral)
      const sec = state.sectors.find((s) => s.id === state.activeCombat!.sectorId);
      if (sec) {
        const units = buildCombatUnitsForSector(sec, state.players);
        const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sec);
        const aliveUnits = sortUnitsByInitiative(
          units.filter((u) => u.currentDamage < u.maxHull),
          defenderId
        );
        const isMissileStage = state.activeCombat.stage === 'missile';
        const pendingMissileUnits = isMissileStage
          ? aliveUnits.filter(
              (u) => u.weapons.some((w) => w.isMissile) && !state.activeCombat!.missileFiredShipIds?.includes(u.id)
            )
          : [];
        const activeAttacker = isMissileStage
          ? (pendingMissileUnits[0] || null)
          : (aliveUnits.length > 0 ? aliveUnits[state.activeCombat.currentTurnIndex % aliveUnits.length] : null);
        if (activeAttacker && activeAttacker.ownerId.startsWith('player_')) {
          commandingPlayerId = activeAttacker.ownerId;
        }
      }
    }

    const res = executeAction(state, {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: commandingPlayerId || activePlayer.id,
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

  const candidateTiles = React.useMemo(() => {
    if (!pendingExploreCoords) return undefined;
    const ring = getRingFromCoord(pendingExploreCoords.target);
    const deck =
      ring === 1
        ? state.sectorDecks.ring1
        : ring === 2
        ? state.sectorDecks.ring2
        : state.sectorDecks.ring3;
    if (activePlayer.faction.id === 'descendants_of_draco' && deck.length >= 2) {
      return [deck[deck.length - 1], deck[deck.length - 2]];
    }
    return undefined;
  }, [pendingExploreCoords, state.sectorDecks, activePlayer.faction.id]);

  const activeCandidateTile = React.useMemo(() => {
    if (candidateTiles && candidateTiles[dracoSelectedTileIndex]) {
      return candidateTiles[dracoSelectedTileIndex]!;
    }
    return candidateTile;
  }, [candidateTiles, dracoSelectedTileIndex, candidateTile]);

  const sourceSector = React.useMemo(() => {
    if (!pendingExploreCoords) return null;
    return state.sectors.find(
      (s) =>
        s.coord.q === pendingExploreCoords.from.q &&
        s.coord.r === pendingExploreCoords.from.r
    ) || null;
  }, [pendingExploreCoords, state.sectors]);

  if (!inGame) {
    return (
      <>
        <LobbyView
          onStartNewGame={handleStartNewGameFromLobby}
          onJoinTable={handleJoinTableFromLobby}
          onOpenGallery={() => setIsGalleryOpen(true)}
        />
        <GalacticGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
        <BugReportCornerButton onClick={() => setIsBugReportOpen(true)} />
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
          state={state}
          tableNumber={tableNum}
          onSuccess={(msg) => showToast(msg)}
        />
      </>
    );
  }

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
        onOpenScoreboard={() => setIsScoreboardOpen(true)}
        onOpenTableSession={() => setIsTableSessionOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenBugReport={() => setIsBugReportOpen(true)}
        onReturnToLobby={handleReturnToLobby}
        currentSeat={currentSeat}
        onChangeSeat={handleChangeSeat}
      />

      {/* Planta 2nd Activation Banner */}
      {state.pendingExploreActivations && state.pendingExploreActivations > 0 && (
        <div className="bg-emerald-950/90 border-b border-emerald-600 px-6 py-2 flex items-center justify-between z-40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="text-base">🌿</span>
            <span className="font-bold text-white">Planta Exploration:</span>
            <span>1 Explore Activation remaining! Select an adjacent hex on the map to explore, or finish exploration.</span>
          </div>
          <button
            onClick={handleFinishExplore}
            className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-emerald-800 text-emerald-300 hover:text-white font-bold border border-emerald-700 transition-colors shadow"
          >
            Finish Explore
          </button>
        </div>
      )}

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
            pendingExploreCoords && activeCandidateTile
              ? {
                  from: pendingExploreCoords.from,
                  target: pendingExploreCoords.target,
                  candidateTile: activeCandidateTile,
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
            hideOpponentReputation={hideOpponentReputation}
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
            isTurnGated={isTurnGated}
            pendingConfirmation={state.pendingActionConfirmation}
            onConfirmAction={handleConfirmTurnAction}
            onRevertAction={handleRevertTurnAction}
          />
        )}

        {/* Game Event Log Drawer (Bottom-Right) */}
        <GameLogDrawer logs={state.log} />

        {/* Bug Report Corner Button (Bottom-Left) */}
        <BugReportCornerButton onClick={() => setIsBugReportOpen(true)} />

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
          candidateTiles={candidateTiles}
          selectedDracoIndex={dracoSelectedTileIndex}
          onSelectDracoIndex={setDracoSelectedTileIndex}
          sourceSector={sourceSector}
          rotation={exploreRotation}
          onRotate={setExploreRotation}
          onConfirmPlacement={handleConfirmExplorePlacement}
          onDiscard={handleDiscardExploreTile}
          onClose={() => {
            setPendingExploreCoords(null);
            setDracoSelectedTileIndex(0);
          }}
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
          currentSeat={currentSeat}
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

      {state.pendingArtifactReward && (
        <ArtifactKeyModal
          player={
            state.players.find((p) => p.id === state.pendingArtifactReward!.playerId) ||
            activePlayer
          }
          totalResources={state.pendingArtifactReward.totalResources}
          artifactsCount={state.pendingArtifactReward.artifactsCount}
          onAllocate={handleAllocateArtifactReward}
        />
      )}

      {state.pendingBankruptcy && (
        <BankruptcyModal
          player={
            state.players.find((p) => p.id === state.pendingBankruptcy!.playerId) ||
            activePlayer
          }
          deficit={state.pendingBankruptcy.deficit}
          sectors={state.sectors}
          onAbandonSector={handleAbandonSectorBankruptcy}
          onEmergencyTrade={handleEmergencyTradeBankruptcy}
          onSelectSector={(s) => setSelectedSector(s)}
          selectedSectorId={selectedSector?.id || null}
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
          hideOpponentReputation={hideOpponentReputation}
        />
      )}

      {isScoreboardOpen && (
        <LiveScoreboardModal
          state={state}
          onClose={() => setIsScoreboardOpen(false)}
          onSelectPlayer={(idx) => {
            setSelectedViewIndex(idx);
            setIsScoreboardOpen(false);
          }}
        />
      )}

      {isTableSessionOpen && (
        <TableSessionModal
          currentState={state}
          onJoinTable={(loaded) => {
            setState(loaded);
            setSelectedViewIndex(loaded.activePlayerIndex);
          }}
          onNewTable={() => setIsNewGameOpen(true)}
          onClose={() => setIsTableSessionOpen(false)}
        />
      )}

      {isNewGameOpen && (
        <NewGameModal
          onStartGame={handleStartNewGame}
          onClose={() => setIsNewGameOpen(false)}
        />
      )}

      <GalacticGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        state={state}
        tableNumber={tableNum}
        onSuccess={(msg) => showToast(msg)}
      />
    </div>
  );
};
