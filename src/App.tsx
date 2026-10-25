import React, { useState, useEffect, useMemo } from 'react';
import { GameState, CombatDamageAssignment } from './engine/types/state';
import { SectorTile, HexCoord, ShipType, SectorShip, HexEdge } from './engine/types/galaxy';
import { ShipPart } from './engine/types/blueprints';
import { createInitialGame } from './engine/rules/setup';
import {
  executeAction,
  getMaxMoveActivations,
  computePinningState,
  playerHasWormholeGenerator,
  isPlayerInvaded,
} from './engine/rules/gameReducer';
import { calculateBlueprintStats } from './engine/rules/shipValidation';
import { getRingFromCoord, areSectorsConnected, findLegalExploreRotation, areCoordsEqual, getEdgeBetween } from './engine/rules/hexMath';
import { buildCombatUnitsForSector, getSectorDefenderOwnerId, sortUnitsByInitiative, getCombatShipTypeGroups } from './engine/rules/combatEngine';
import { getNebulaSubsectorForOuterEdge } from './engine/rules/galacticEvents';
import type { NeutralShipSelectionConfig } from './engine/rules/neutralShips';
import { X, Sparkles, Coins } from 'lucide-react';

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
import { FactionDraftModal } from './components/setup/FactionDraftModal';
import { PulsarModal } from './components/actions/PulsarModal';
import { ExilesOrbitalSetupModal } from './components/setup/ExilesOrbitalSetupModal';
import { DiscoveryChoiceModal } from './components/discovery/DiscoveryChoiceModal';
import { BlackHoleReturnModal } from './components/actions/BlackHoleReturnModal';
import { FirstPassHintModal } from './components/actions/FirstPassHintModal';
import { BlackHoleDelayedShip, getLegalBlackHoleReturnSectors } from './engine/rules/galacticEvents';
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
import { DiplomacyModal, PopulationResourceType } from './components/diplomacy/DiplomacyModal';
import { TurnOrderTrackModal } from './components/turnOrder/TurnOrderTrackModal';
import { MinorSpeciesModal } from './components/minorSpecies/MinorSpeciesModal';
import { MinorSpeciesId } from './engine/rules/minorSpecies';
import {
  loadActiveGameState,
  saveGameState,
  loadTable,
  subscribeToGameSync,
  getTableNumber,
  fetchTableFromServer,
  getStateFingerprint,
  registerTableMember,
  isSeatTaken,
  canUserUseHotseat,
} from './engine/rules/persistence';
import { getCurrentUser, subscribeToUserSession } from './engine/rules/userSession';
import { UserSession } from './engine/types/user';

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => {
    const loaded = loadActiveGameState();
    return loaded || createInitialGame(2);
  });
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number>(() => state.activePlayerIndex || 0);

  const isRemoteSyncRef = React.useRef<boolean>(false);
  const lastStateFingerprintRef = React.useRef<string>(getStateFingerprint(state));

  // Auto-save game state to localStorage on local state changes
  useEffect(() => {
    const currentFp = getStateFingerprint(state);
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      lastStateFingerprintRef.current = currentFp;
      return;
    }
    if (currentFp !== lastStateFingerprintRef.current) {
      lastStateFingerprintRef.current = currentFp;
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
  const [isTurnOrderOpen, setIsTurnOrderOpen] = useState<boolean>(false);
  const [isMinorSpeciesOpen, setIsMinorSpeciesOpen] = useState<boolean>(false);
  const [diplomacyTargetPlayerId, setDiplomacyTargetPlayerId] = useState<string | null>(null);
  const [pulsarSectorIdForModal, setPulsarSectorIdForModal] = useState<string | null>(null);
  const [activePulsarSectorId, setActivePulsarSectorId] = useState<string | null>(null);
  const [dismissedIntelTimestamp, setDismissedIntelTimestamp] = useState<number | null>(null);
  const [selectedBlackHoleShipForReturn, setSelectedBlackHoleShipForReturn] = useState<BlackHoleDelayedShip | null>(null);
  const [blackHoleTargetSectorId, setBlackHoleTargetSectorId] = useState<string | null>(null);
  const [declinedBlackHoleRounds, setDeclinedBlackHoleRounds] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newRoundHint, setNewRoundHint] = useState<{ round: number } | null>(null);
  const [showFirstPassModal, setShowFirstPassModal] = useState<boolean>(false);

  const prevRoundRef = React.useRef<number>(state.round);
  const pendingActionRef = React.useRef(state.pendingActionConfirmation);

  useEffect(() => {
    pendingActionRef.current = state.pendingActionConfirmation;
  }, [state.pendingActionConfirmation]);

  // Bug 88: Prominent hint / banner when a new round starts
  useEffect(() => {
    if (state.round > prevRoundRef.current && state.phase === 'ACTION_PHASE') {
      setNewRoundHint({ round: state.round });
      const timer = setTimeout(() => setNewRoundHint(null), 7000);
      prevRoundRef.current = state.round;
      return () => clearTimeout(timer);
    }
    prevRoundRef.current = state.round;
  }, [state.round, state.phase]);

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

  const [currentUser, setCurrentUser] = useState<UserSession>(() => getCurrentUser());

  const [currentSeat, setCurrentSeat] = useState<number | 'all' | 'spectator'>(() => {
    const user = getCurrentUser();
    const isAdmin = canUserUseHotseat(user.role);
    if (typeof window === 'undefined') return isAdmin ? 'all' : 0;
    const params = new URLSearchParams(window.location.search);
    const seatParam = params.get('seat');
    if (!seatParam || seatParam === 'all') {
      return isAdmin ? 'all' : 0;
    }
    if (seatParam === 'spectator') return 'spectator';
    const num = parseInt(seatParam, 10);
    return isNaN(num) ? (isAdmin ? 'all' : 0) : num;
  });

  useEffect(() => {
    return subscribeToUserSession((u) => {
      setCurrentUser(u);
      if (currentSeat === 'all' && !canUserUseHotseat(u.role)) {
        setCurrentSeat(0);
        showToast('Only administrators are allowed to use the hotseat function.');
      }
    });
  }, [currentSeat]);

  // Register current user as member of active table
  useEffect(() => {
    if (inGame && state.id) {
      if (currentSeat === 'all' && !canUserUseHotseat(currentUser.role)) {
        showToast('Only administrators are allowed to use the hotseat function.');
        setCurrentSeat(0);
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set('seat', '0');
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
        return;
      }

      // Check if currentSeat is already occupied by another player
      const members = state.members || (state as any).members;
      const seatCheck = isSeatTaken(members, currentSeat, currentUser.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        showToast(
          `Seat ${typeof currentSeat === 'number' ? currentSeat + 1 : currentSeat} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}. Switched to Spectator.`
        );
        setCurrentSeat('spectator');
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set('seat', 'spectator');
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
        return;
      }

      registerTableMember(state.id, {
        userId: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        role: currentUser.role,
        email: currentUser.email,
        emailNotifications: currentUser.emailNotifications,
        seat: currentSeat,
        joinedAt: Date.now(),
      }).then((res) => {
        if (!res.success && res.error) {
          showToast(res.error);
          if (typeof currentSeat === 'number') {
            setCurrentSeat('spectator');
            if (typeof window !== 'undefined') {
              const params = new URLSearchParams(window.location.search);
              params.set('seat', 'spectator');
              window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
            }
          }
        }
      });
    }
  }, [inGame, state.id, currentSeat, currentUser, state.members]);

  // Hotseat View: When activePlayerIndex changes in hot seat mode (currentSeat === 'all' or 'spectator'),
  // automatically update the top-left player dashboard to the active player by default
  const prevActivePlayerIndexRef = React.useRef<number>(state.activePlayerIndex);
  useEffect(() => {
    if (
      (currentSeat === 'all' || currentSeat === 'spectator') &&
      state.activePlayerIndex !== prevActivePlayerIndexRef.current
    ) {
      setSelectedViewIndex(state.activePlayerIndex);
    }
    prevActivePlayerIndexRef.current = state.activePlayerIndex;
  }, [state.activePlayerIndex, currentSeat]);

  // Ensure selectedViewIndex stays within valid player bounds
  useEffect(() => {
    if (selectedViewIndex >= state.players.length) {
      setSelectedViewIndex(state.activePlayerIndex);
    }
  }, [state.players.length, state.activePlayerIndex, selectedViewIndex]);

  const isSpectator = currentSeat === 'spectator';

  const canActForPlayer = (targetPlayerId?: string): boolean => {
    if (isSpectator) return false;
    if (currentSeat === 'all') return true;
    if (typeof currentSeat === 'number') {
      if (!targetPlayerId) return state.players[currentSeat]?.id === activePlayer.id;
      return state.players[currentSeat]?.id === targetPlayerId;
    }
    return false;
  };

  const isTurnGated =
    isSpectator ||
    (currentSeat !== 'all' &&
      typeof currentSeat === 'number' &&
      state.activePlayerIndex !== currentSeat);

  const myControlledPlayer =
    typeof currentSeat === 'number' && state.players[currentSeat]
      ? state.players[currentSeat]
      : activePlayer;

  const hideOpponentReputation =
    currentSeat !== 'all' &&
    currentSeat !== 'spectator' &&
    typeof currentSeat === 'number' &&
    viewedPlayer.id !== state.players[currentSeat]?.id &&
    state.phase !== 'GAME_OVER';

  // Load table from server if URL query param ?table=XXX is specified and not loaded locally
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (!tableParam) return;

    const matchesCurrent =
      state.id === tableParam ||
      (state as any).tableNumber === parseInt(tableParam, 10);

    if (!matchesCurrent) {
      fetchTableFromServer(tableParam).then((remote) => {
        if (remote) {
          isRemoteSyncRef.current = true;
          lastStateFingerprintRef.current = getStateFingerprint(remote);
          saveGameState(remote, true);
          setState(remote);
          setInGame(true);

          if (params.get('table') !== remote.id) {
            params.set('table', remote.id);
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }

          const seatParam = params.get('seat');
          if (seatParam && seatParam !== 'all' && seatParam !== 'spectator') {
            const sNum = parseInt(seatParam, 10);
            if (!isNaN(sNum)) {
              const seatCheck = isSeatTaken(remote.members, sNum, currentUser.id);
              if (seatCheck.isTaken && seatCheck.occupant) {
                showToast(
                  `Seat ${sNum + 1} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}. Joined as Spectator.`
                );
                setCurrentSeat('spectator');
                params.set('seat', 'spectator');
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
              }
            }
          }
        }
      });
    } else {
      if (state.id && params.get('table') !== state.id) {
        params.set('table', state.id);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
      const seatParam = params.get('seat');
      if (seatParam && seatParam !== 'all' && seatParam !== 'spectator') {
        const sNum = parseInt(seatParam, 10);
        if (!isNaN(sNum)) {
          const seatCheck = isSeatTaken(state.members, sNum, currentUser.id);
          if (seatCheck.isTaken && seatCheck.occupant) {
            showToast(
              `Seat ${sNum + 1} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}. Joined as Spectator.`
            );
            setCurrentSeat('spectator');
            params.set('seat', 'spectator');
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }
        }
      }
    }
  }, []);

  // Real-time Cross-Tab / Multiplayer Status Sync (Local Broadcast + Server Polling)
  useEffect(() => {
    if (!inGame) return;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tableTarget = state.id || params?.get('table');
    if (!tableTarget) return;

    const unsubscribe = subscribeToGameSync(tableTarget, (remoteState) => {
      // Never adopt unconfirmed intermediate actions from other players
      if (remoteState.pendingActionConfirmation) {
        return;
      }

      // Bug 87 & 93: Only protect if THIS seat has an active unconfirmed action that this player is editing
      const isMyPendingAction =
        !!pendingActionRef.current &&
        (currentSeat === 'all' ||
          pendingActionRef.current.playerId === state.players[currentSeat as number]?.id);
      if (isMyPendingAction) {
        return;
      }

      const remoteFp = getStateFingerprint(remoteState);
      if (remoteFp !== lastStateFingerprintRef.current) {
        lastStateFingerprintRef.current = remoteFp;
        isRemoteSyncRef.current = true;
        setState(remoteState);
      }
    });

    return unsubscribe;
  }, [inGame, state.id]);

  // Active Player Presence Heartbeat (pings server every 20s while tab is open)
  useEffect(() => {
    if (!inGame || !currentUser || currentUser.role === 'guest') return;
    const sendPing = () => {
      if (typeof fetch !== 'undefined') {
        fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            tableId: state.id,
          }),
        }).catch(() => {});
      }
    };
    sendPing();
    const interval = setInterval(sendPing, 20000);
    return () => clearInterval(interval);
  }, [inGame, currentUser?.id, state.id]);

  const handleStartNewGameFromLobby = (
    playerCount: number,
    factionIds: string[],
    tableId: string,
    seat: number | 'all',
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean
  ) => {
    const user = getCurrentUser();
    let effectiveSeat = seat;
    if (effectiveSeat === 'all' && !canUserUseHotseat(user.role)) {
      effectiveSeat = 0;
    }
    const newGame = createInitialGame(playerCount, factionIds, expansions, neutralShips, isDraftMode);
    const num = parseInt(tableId.replace(/\D/g, ''), 10) || 101;
    (newGame as any).tableNumber = num;
    newGame.id = tableId;
    (newGame as any).members = [
      {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        emailNotifications: user.emailNotifications,
        seat: effectiveSeat,
        joinedAt: Date.now(),
      },
    ];
    saveGameState(newGame);
    registerTableMember(tableId, {
      userId: user.id,
      name: user.name,
      username: user.username || user.name,
      role: user.role,
      email: user.email,
      emailNotifications: user.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
    });
    setState(newGame);
    setCurrentSeat(effectiveSeat);
    if (typeof effectiveSeat === 'number') {
      setSelectedViewIndex(effectiveSeat);
    } else {
      setSelectedViewIndex(newGame.activePlayerIndex || 0);
    }
    setInGame(true);

    if (typeof window !== 'undefined') {
      const seatParam = effectiveSeat === 'all' ? '' : `&seat=${effectiveSeat}`;
      window.history.pushState({}, '', `?table=${tableId}${seatParam}`);
    }
  };

  const handleJoinTableFromLobby = async (
    tableId: string,
    seat: number | 'all' | 'spectator'
  ) => {
    const user = getCurrentUser();
    if (seat === 'all' && !canUserUseHotseat(user.role)) {
      alert('Only administrators are allowed to use the hotseat function.');
      return;
    }
    let loaded = loadTable(tableId);
    if (!loaded) {
      loaded = await fetchTableFromServer(tableId);
    }
    if (!loaded) {
      alert(`Table "${tableId}" does not exist.`);
      return;
    }
    if (typeof seat === 'number') {
      const seatCheck = isSeatTaken(loaded.members, seat, user.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        alert(
          `Seat ${seat + 1} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}.`
        );
        return;
      }
    }
    const regRes = await registerTableMember(tableId, {
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email,
      emailNotifications: user.emailNotifications,
      seat,
      joinedAt: Date.now(),
    });
    if (!regRes.success && regRes.error) {
      alert(regRes.error);
      return;
    }
    saveGameState(loaded, true);
    setState(loaded);
    lastStateFingerprintRef.current = getStateFingerprint(loaded);
    setCurrentSeat(seat);
    if (typeof seat === 'number' && loaded.players[seat]) {
      setSelectedViewIndex(seat);
    } else {
      setSelectedViewIndex(loaded.activePlayerIndex || 0);
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
    if (seat === 'all' && !canUserUseHotseat(currentUser.role)) {
      showToast('Only administrators are allowed to use the hotseat function.');
      return;
    }
    if (typeof seat === 'number') {
      const seatCheck = isSeatTaken(state.members, seat, currentUser.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        showToast(
          `Seat ${seat + 1} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}.`
        );
        return;
      }
    }
    setCurrentSeat(seat);
    if (typeof seat === 'number' && state.players[seat]) {
      setSelectedViewIndex(seat);
    } else {
      setSelectedViewIndex(state.activePlayerIndex || 0);
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
    if (!canActForPlayer(state.pendingArtifactReward.playerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
    if (!canActForPlayer(state.pendingBankruptcy.playerId)) {
      showToast('It is not your turn to resolve treasury deficit!');
      return;
    }
    const player =
      state.players.find((p) => p.id === state.pendingBankruptcy!.playerId) || activePlayer;
    const ratio = player.faction.tradeRatio || 2;
    if (player.resources[from] < ratio) return;

    const fromResource = from === 'materials' ? 'material' : 'science';
    const result = executeAction(state, {
      type: 'TRADE',
      playerId: player.id,
      fromResource,
      toResource: 'money',
      amount: ratio,
    });
    if (result.success) {
      const updated = result.newState;
      const updatedPlayer = updated.players.find((p) => p.id === player.id)!;
      if (updatedPlayer.resources.money >= 0) {
        showToast('Treasury balanced! Bankruptcy averted.');
      }
      setState(updated);
    } else {
      showToast(result.error || 'Failed to trade resources.');
    }
  };

  const handleAbandonSectorBankruptcy = (sectorId: string) => {
    if (!state.pendingBankruptcy) return;
    if (!canActForPlayer(state.pendingBankruptcy.playerId)) {
      showToast('It is not your turn to resolve treasury deficit!');
      return;
    }
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

  const [stagedBankruptcyTrades, setStagedBankruptcyTrades] = useState<{ materials: number; science: number }>({
    materials: 0,
    science: 0,
  });
  const [stagedBankruptcySectors, setStagedBankruptcySectors] = useState<string[]>([]);

  React.useEffect(() => {
    if (!state.pendingBankruptcy) {
      setStagedBankruptcyTrades({ materials: 0, science: 0 });
      setStagedBankruptcySectors([]);
    }
  }, [state.pendingBankruptcy]);

  const handleStageBankruptcyTrade = (from: 'materials' | 'science', delta: 1 | -1) => {
    if (!canActForPlayer(state.pendingBankruptcy?.playerId)) {
      return;
    }
    setStagedBankruptcyTrades((prev) => ({
      ...prev,
      [from]: Math.max(0, prev[from] + delta),
    }));
  };

  const handleToggleAbandonSectorBankruptcy = (sectorId: string) => {
    if (!canActForPlayer(state.pendingBankruptcy?.playerId)) {
      return;
    }
    setStagedBankruptcySectors((prev) =>
      prev.includes(sectorId) ? prev.filter((id) => id !== sectorId) : [...prev, sectorId]
    );
  };

  const handleResetBankruptcyPlan = () => {
    if (!canActForPlayer(state.pendingBankruptcy?.playerId)) {
      return;
    }
    setStagedBankruptcyTrades({ materials: 0, science: 0 });
    setStagedBankruptcySectors([]);
  };

  const handleConfirmBankruptcyPlan = (plan: {
    trades: { materials: number; science: number };
    abandonedSectorIds: string[];
    abandonReturnTrack?: Record<string, 'money' | 'science' | 'material'>;
  }) => {
    if (!state.pendingBankruptcy) return;
    if (!canActForPlayer(state.pendingBankruptcy.playerId)) {
      showToast('It is not your turn to resolve treasury deficit!');
      return;
    }
    const playerId = state.pendingBankruptcy.playerId;
    let currentState = state;

    for (let i = 0; i < plan.trades.materials; i++) {
      if (!currentState.pendingBankruptcy) break;
      const player = currentState.players.find((p) => p.id === playerId);
      const ratio = player?.faction.tradeRatio || 2;
      const res = executeAction(currentState, {
        type: 'TRADE',
        playerId,
        fromResource: 'material',
        toResource: 'money',
        amount: ratio,
      });
      if (res.success) {
        currentState = res.newState;
      } else {
        showToast(res.error || 'Failed to trade materials.');
        return;
      }
    }

    for (let i = 0; i < plan.trades.science; i++) {
      if (!currentState.pendingBankruptcy) break;
      const player = currentState.players.find((p) => p.id === playerId);
      const ratio = player?.faction.tradeRatio || 2;
      const res = executeAction(currentState, {
        type: 'TRADE',
        playerId,
        fromResource: 'science',
        toResource: 'money',
        amount: ratio,
      });
      if (res.success) {
        currentState = res.newState;
      } else {
        showToast(res.error || 'Failed to trade science.');
        return;
      }
    }

    if (plan.abandonedSectorIds.length > 0 && currentState.pendingBankruptcy) {
      const res = executeAction(currentState, {
        type: 'ABANDON_SECTOR_BANKRUPTCY',
        playerId,
        sectorIds: plan.abandonedSectorIds,
        sectorId: plan.abandonedSectorIds[0],
        abandonReturnTrack: plan.abandonReturnTrack,
      });
      if (res.success) {
        currentState = res.newState;
      } else {
        showToast(res.error || 'Failed to abandon sectors.');
        return;
      }
    }

    const updatedPlayer = currentState.players.find((p) => p.id === playerId);
    if (updatedPlayer && updatedPlayer.resources.money >= 0) {
      showToast('Treasury balanced! Bankruptcy averted.');
    }

    setStagedBankruptcyTrades({ materials: 0, science: 0 });
    setStagedBankruptcySectors([]);
    setState(currentState);
  };

  const handleStartNewGame = (
    playerCount: number,
    selectedFactionIds?: string[],
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean
  ) => {
    const newGame = createInitialGame(playerCount, selectedFactionIds, expansions, neutralShips, isDraftMode);
    setState(newGame);
    setSelectedViewIndex(0);
    setSelectedSector(null);
    setIsNewGameOpen(false);
  };

  const handleDraftFaction = (factionId: string) => {
    const draft = state.factionDraft;
    if (!draft) return;
    const currentDrafterId = draft.draftOrder[draft.currentDraftIndex];
    if (!currentDrafterId) return;

    if (!canActForPlayer(currentDrafterId)) {
      showToast('It is not your turn to draft a faction!');
      return;
    }

    const res = executeAction(state, {
      type: 'DRAFT_FACTION',
      playerId: currentDrafterId,
      factionId,
    });
    if (res.success) {
      setState(res.newState);
      showToast('Faction drafted!');
    } else {
      showToast(res.error || 'Failed to draft faction.');
    }
  };

  // Explore flow: User clicks an explorable hex on map
  const handleExploreTarget = (fromCoord: HexCoord, targetCoord: HexCoord) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
    const hasWormholeGen = activePlayer ? playerHasWormholeGenerator(activePlayer) : false;

    const defaultRotation = (source && candidate)
      ? findLegalExploreRotation(source, candidate, targetCoord, hasWormholeGen, state.sectors, activePlayer?.id, state.warpedUniverse?.conduits)
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
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
      }
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleDiscardExploreTile = (chosenTileIndex?: number) => {
    if (!pendingExploreCoords) return;
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
      }
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleFinishExplore = () => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'FINISH_EXPLORE',
      playerId: activePlayer.id,
      requireConfirmation: false,
    });
    if (res.success) {
      setState(res.newState);
      saveGameState(res.newState);
      setIsExploreMode(false);
      setPendingExploreCoords(null);
      showToast('Finished exploration and passed turn.');
    } else {
      showToast(res.error || 'Could not finish exploration.');
    }
  };

  const handleToggleExplore = () => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (state.pendingExploreActivations && state.pendingExploreActivations > 0) {
      handleFinishExplore();
      return;
    }
    setIsExploreMode((prev) => !prev);
  };

  // Research flow (supports single tech or array of technologies for Hydran double research, and Lyra shrine placement)
  const handleResearchTech = (
    researchesOrId: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[] | string,
    targetTrack?: 'military' | 'grid' | 'nano',
    warpPortalSectorId?: string,
    shrinePlacement?: { row: number; col: number; sectorId: string; planetId: string }
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
      warpPortalSectorId,
      shrinePlacement,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsTechMarketOpen(false);
    } else {
      showToast(res.error || 'Failed to research technology.');
    }
  };

  // Magellan Colony Ship Conversion
  const handleConvertColonyShip = (resource: 'money' | 'science' | 'materials', count?: number) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CONVERT_COLONY_SHIP',
      playerId: activePlayer.id,
      resource,
      count: count ?? 1,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Converted ${count ?? 1} Colony Ship to ${count ?? 1} ${resource.toUpperCase()}`);
    } else {
      showToast(res.error || 'Failed to convert colony ship.');
    }
  };

  // Lyra Combat Die Reroll
  const handleRerollCombatDie = (rollIndex: number) => {
    if (!state.activeCombat) return;
    const targetRoll = state.activeCombat.lastRolls?.[rollIndex];
    if (!targetRoll) return;
    if (!canActForPlayer(targetRoll.shipOwner)) {
      showToast('Spectators cannot reroll combat dice.');
      return;
    }
    const res = executeAction(state, {
      type: 'REROLL_COMBAT_DIE',
      playerId: targetRoll.shipOwner,
      rollIndex,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to reroll die.');
    }
  };

  // Blueprint save flow
  const handleSaveBlueprint = (
    upgrades: { shipType: ShipType; slotIndex: number; partId: string | null; isExternal?: boolean }[],
    pulsarSectorId?: string
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot modify ship blueprints.');
      return;
    }
    const effectivePulsarId = pulsarSectorId || activePulsarSectorId || undefined;
    const res = executeAction(state, {
      type: 'UPGRADE',
      playerId: activePlayer.id,
      upgrades,
      pulsarSectorId: effectivePulsarId,
      requireConfirmation: true,
    });

    if (res.success) {
      setState(res.newState);
      setIsBlueprintOpen(false);
      setActivePulsarSectorId(null);
    } else {
      showToast(res.error || 'Failed to save blueprint.');
    }
  };

  // --- BUILD FLOW STATE & HANDLERS ---
  // Bug 90: Official Eclipse rules allow producing ships & starbases even when enemy ships are present!
  const eligibleBuildSectors = useMemo(() => {
    return state.sectors.filter((s) => s.discOwner === activePlayer.id);
  }, [state.sectors, activePlayer.id]);

  // --- PULSAR ANOMALY ACTIVATION (Galactic Events) ---
  const myPlayerId = isSpectator ? undefined : (typeof currentSeat === 'number' ? state.players[currentSeat]?.id : activePlayer.id);
  const isMyTurn = !isSpectator && (currentSeat === 'all' || (typeof currentSeat === 'number' && state.players[currentSeat]?.id === activePlayer.id));

  const controlledPulsarSectors = useMemo(() => {
    return state.sectors.filter(
      (s) => s.isPulsar && s.discOwner === myPlayerId
    );
  }, [state.sectors, myPlayerId]);

  const hasPulsarAvailable = useMemo(() => {
    return (
      isMyTurn &&
      !isTurnGated &&
      !activePlayer.hasPassed &&
      state.phase === 'ACTION_PHASE' &&
      controlledPulsarSectors.some(
        (s) => !state.galacticEvents?.pulsars?.[s.id]?.activatedThisRound
      )
    );
  }, [isMyTurn, isTurnGated, activePlayer.hasPassed, state.phase, controlledPulsarSectors, state.galacticEvents]);

  // Bug 190 & 191: Auto-prompt for Black Hole ship return on player's first turn of the round
  useEffect(() => {
    if (!isMyTurn || isTurnGated || state.phase !== 'ACTION_PHASE') return;
    const readyShip = state.galacticEvents?.blackHoleDelayedShips?.find(
      (s) =>
        s.ownerId === myPlayerId &&
        state.round >= s.returnRound &&
        declinedBlackHoleRounds[s.shipId] !== state.round
    );
    if (readyShip && !selectedBlackHoleShipForReturn) {
      setSelectedBlackHoleShipForReturn(readyShip);
      const legal = getLegalBlackHoleReturnSectors(readyShip.blackHoleSectorNumber, state.sectors);
      const def = legal.find((sec) => sec.discOwner === myPlayerId)?.id || legal[0]?.id || null;
      setBlackHoleTargetSectorId(def);
    }
  }, [
    isMyTurn,
    isTurnGated,
    state.phase,
    state.round,
    state.galacticEvents?.blackHoleDelayedShips,
    declinedBlackHoleRounds,
    myPlayerId,
    selectedBlackHoleShipForReturn,
    state.sectors,
  ]);

  const handleDeclineBlackHoleReturn = (shipId: string) => {
    const ownerId = selectedBlackHoleShipForReturn?.ownerId || activePlayer.id;
    if (!canActForPlayer(ownerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    setDeclinedBlackHoleRounds((prev) => ({ ...prev, [shipId]: state.round }));
    setSelectedBlackHoleShipForReturn(null);
    setBlackHoleTargetSectorId(null);
  };

  const handleSelectPulsarAction = (
    targetSlot: 'move' | 'build' | 'upgrade',
    sectorId: string
  ) => {
    const pSec = state.sectors.find((s) => s.id === sectorId);
    if (!pSec || pSec.discOwner !== myPlayerId || !isMyTurn || isTurnGated || !canActForPlayer(pSec.discOwner)) {
      showToast('Only the commander controlling this Pulsar sector can perform the Pulsar action.');
      setPulsarSectorIdForModal(null);
      return;
    }
    setActivePulsarSectorId(sectorId);
    setPulsarSectorIdForModal(null);
    if (targetSlot === 'build') {
      setBuildSlots([
        { sectorId: eligibleBuildSectors[0]?.id || sectorId, itemType: 'interceptor' },
      ]);
      setActiveBuildSlotIndex(0);
      setIsBuildOpen(true);
    } else if (targetSlot === 'move') {
      setPlannedMoves([]);
      setActiveActivationIndex(0);
      setIsMoveOpen(true);
    } else if (targetSlot === 'upgrade') {
      setIsBlueprintOpen(true);
    }
  };

  const [buildSlots, setBuildSlots] = useState<BuildItemPayload[]>([
    { sectorId: '', itemType: 'interceptor' },
  ]);
  const [activeBuildSlotIndex, setActiveBuildSlotIndex] = useState<number>(0);

  // Initialize build slots only on modal opening transition
  const prevBuildOpenRef = React.useRef<boolean>(false);
  useEffect(() => {
    if (isBuildOpen && !prevBuildOpenRef.current) {
      setBuildSlots([
        { sectorId: eligibleBuildSectors[0]?.id || '', itemType: 'interceptor' },
      ]);
      setActiveBuildSlotIndex(0);
    }
    prevBuildOpenRef.current = isBuildOpen;
  }, [isBuildOpen]);

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

  // Initialize planned moves only on modal opening transition
  const prevMoveOpenRef = React.useRef<boolean>(false);
  useEffect(() => {
    if (isMoveOpen && !prevMoveOpenRef.current) {
      setPlannedMoves([]);
      setActiveActivationIndex(0);
      setSelectedMoveShipId(movableShips[0]?.ship.id || playerShips[0]?.ship.id || '');
    }
    prevMoveOpenRef.current = isMoveOpen;
  }, [isMoveOpen]);

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

  // Compute 1:1 pinning state taking into account hostiles, Draco ancient immunity, and step progression (Bugs 58, 62, 63)
  const pinningState = useMemo(() => {
    return computePinningState(state, activePlayer.id, plannedMoves);
  }, [state, activePlayer.id, plannedMoves]);

  const isShipPinned = (shipId: string): boolean => {
    return pinningState.isShipPinned(shipId);
  };

  const maxMoves = getMaxMoveActivations(activePlayer);
  const hasWormholeGen = activePlayer ? playerHasWormholeGenerator(activePlayer) : false;

  const currentMoveShip = playerShips.find((p) => p.ship.id === selectedMoveShipId)?.ship;
  const currentSimSector = simulatedShipSector.get(selectedMoveShipId);
  const currentShipBlueprint = currentMoveShip ? activePlayer.blueprints[currentMoveShip.type] : null;
  const currentShipStats = currentShipBlueprint ? calculateBlueprintStats(currentShipBlueprint) : null;
  const currentShipDriveSpeed = currentShipStats ? currentShipStats.totalDriveSpeed : 0;
  const currentShipHasJumpDrive = Boolean(
    currentShipStats?.hasJumpDrive ||
      currentShipBlueprint?.slots.some((s) => s?.id === 'jump_drive' || s?.isJumpDrive)
  );
  const currentShipMaxSteps = currentShipDriveSpeed + (currentShipHasJumpDrive ? 1 : 0);

  const currentActivationMoves = useMemo(
    () => plannedMoves.filter((m) => m.activationIndex === activeActivationIndex),
    [plannedMoves, activeActivationIndex]
  );
  const movePointsUsedInCurrentActivation = currentActivationMoves.length;

  const jumpUsedInCurrentActivation = useMemo(() => {
    if (!currentShipHasJumpDrive) return false;
    for (const m of currentActivationMoves) {
      const fromSec = state.sectors.find((s) => s.id === m.fromSectorId);
      const toSec = state.sectors.find((s) => s.id === m.toSectorId);
      if (fromSec && toSec && !areSectorsConnected(fromSec, toSec, hasWormholeGen)) {
        return true;
      }
    }
    return false;
  }, [currentShipHasJumpDrive, currentActivationMoves, state.sectors, hasWormholeGen]);

  const currentSimSubsector = useMemo(() => {
    if (!currentMoveShip || !currentSimSector || !currentSimSector.isNebula) return undefined;
    const movesForShip = plannedMoves.filter((m) => m.shipId === currentMoveShip.id);
    if (movesForShip.length === 0) return (currentMoveShip.subsector ?? 1) as 1 | 2 | 3;
    const lastMove = movesForShip[movesForShip.length - 1];
    if (lastMove && lastMove.toSectorId === currentSimSector.id && lastMove.targetSubsector) {
      return lastMove.targetSubsector;
    }
    return (currentMoveShip.subsector ?? 1) as 1 | 2 | 3;
  }, [currentMoveShip, currentSimSector, plannedMoves]);

  // Destinations connected to the ship's current simulated sector via wormholes or Jump Drive
  const connectedDestinations = useMemo(() => {
    if (!currentMoveShip || !currentSimSector) return [];
    if (activeActivationIndex >= maxMoves) return [];
    if (currentShipMaxSteps <= 0) return [];
    if (pinningState.isShipPinned(currentMoveShip.id)) return [];

    // If this activation already started with another ship:
    if (currentActivationMoves.length > 0 && currentActivationMoves[0].shipId !== currentMoveShip.id) {
      return [];
    }

    // If current activation has already used all allowed steps:
    if (currentActivationMoves.length >= currentShipMaxSteps) {
      return [];
    }

    return state.sectors.filter((s) => {
      if (s.id === currentSimSector.id) return false;
      if (currentSimSector.isNebula && currentSimSubsector) {
        const exitEdge = getEdgeBetween(currentSimSector.coord, s.coord);
        if (exitEdge !== null) {
          const allowedSub = getNebulaSubsectorForOuterEdge(exitEdge as HexEdge, currentSimSector.rotation || 0);
          if (allowedSub !== currentSimSubsector) {
            return false;
          }
        }
      }
      const isConnected = areSectorsConnected(currentSimSector, s, hasWormholeGen, state.warpedUniverse?.conduits);
      if (isConnected) return true;
      if (currentShipHasJumpDrive && !jumpUsedInCurrentActivation) {
        return getEdgeBetween(currentSimSector.coord, s.coord) !== null;
      }
      return false;
    });
  }, [
    currentMoveShip,
    currentSimSector,
    currentSimSubsector,
    activeActivationIndex,
    maxMoves,
    currentShipMaxSteps,
    currentShipHasJumpDrive,
    jumpUsedInCurrentActivation,
    currentActivationMoves,
    plannedMoves,
    pinningState,
    state.sectors,
    hasWormholeGen,
    state.warpedUniverse?.conduits,
  ]);

  const handleAddMoveDestination = (destSectorId: string, targetSubsector?: 1 | 2 | 3) => {
    if (!currentMoveShip || !currentSimSector) return;
    if (activeActivationIndex >= maxMoves) return;
    if (currentShipMaxSteps <= 0) return;
    if (isShipPinned(currentMoveShip.id)) return;
    if (currentActivationMoves.length > 0 && currentActivationMoves[0].shipId !== currentMoveShip.id) return;
    if (currentActivationMoves.length >= currentShipMaxSteps) return;

    const destSec = state.sectors.find((s) => s.id === destSectorId);
    if (!destSec) return;

    let finalTargetSubsector = targetSubsector;
    if (destSec.isNebula && currentSimSector.id !== destSec.id) {
      const edgeFromTo = getEdgeBetween(currentSimSector.coord, destSec.coord);
      if (edgeFromTo !== null) {
        const entryEdge = (edgeFromTo + 3) % 6;
        finalTargetSubsector = getNebulaSubsectorForOuterEdge(entryEdge as HexEdge, destSec.rotation || 0);
      }
    }

    const stepNumber = currentActivationMoves.length + 1;
    const newMove: PlannedMove = {
      id: `move_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      shipId: currentMoveShip.id,
      shipType: currentMoveShip.type,
      fromSectorId: currentSimSector.id,
      fromSectorNumber: currentSimSector.sectorNumber,
      fromSubsector: currentSimSector.isNebula ? currentSimSubsector : undefined,
      toSectorId: destSec.id,
      toSectorNumber: destSec.sectorNumber,
      activationIndex: activeActivationIndex,
      stepInActivation: stepNumber,
      driveSpeed: currentShipMaxSteps,
      targetSubsector: finalTargetSubsector,
    };

    setPlannedMoves((prev) => [...prev, newMove]);

    // Pinning or speed limit check
    const nextPlannedMoves = [...plannedMoves, newMove];
    const nextPinningState = computePinningState(state, activePlayer.id, nextPlannedMoves);
    const isPinnedInDest = nextPinningState.isShipPinned(currentMoveShip.id);
    const isBlackHoleTerminated = Boolean(destSec.isBlackHole && destSec.id !== currentSimSector.id);

    if (isPinnedInDest || isBlackHoleTerminated || stepNumber >= currentShipMaxSteps) {
      setActiveActivationIndex((prev) => prev + 1);
      // Auto-select next unpinned movable ship if available for next activation
      const nextMovable = playerShips.find((ps) => {
        if (ps.ship.id === currentMoveShip.id) return false;
        if (nextPinningState.isShipPinned(ps.ship.id)) return false;
        const bp = activePlayer.blueprints[ps.ship.type];
        const stats = bp ? calculateBlueprintStats(bp) : null;
        const spd = (stats ? stats.totalDriveSpeed : 1) + (stats?.hasJumpDrive ? 1 : 0);
        return spd > 0;
      });
      if (nextMovable) {
        setSelectedMoveShipId(nextMovable.ship.id);
      }
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
    const stats = bp ? calculateBlueprintStats(bp) : null;
    const spd = (stats ? stats.totalDriveSpeed : 1) + (stats?.hasJumpDrive ? 1 : 0);
    const lastDestSec = state.sectors.find((s) => s.id === lastMove.toSectorId);
    const pinStateAfterRemoval = computePinningState(state, activePlayer.id, nextPlanned);
    const isPinned = pinStateAfterRemoval.isShipPinned(lastMove.shipId);
    const isBlackHole = Boolean(lastDestSec?.isBlackHole && lastDestSec.id !== lastMove.fromSectorId);

    if (isPinned || isBlackHole || actMoves.length >= spd) {
      setActiveActivationIndex(lastMove.activationIndex + 1);
    } else {
      setActiveActivationIndex(lastMove.activationIndex);
      setSelectedMoveShipId(lastMove.shipId);
    }
  };

  // Build flow
  const handleBuild = (
    items: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith' }[],
    pulsarSectorId?: string
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const effectivePulsarId = pulsarSectorId || activePulsarSectorId || undefined;
    const res = executeAction(state, {
      type: 'BUILD',
      playerId: activePlayer.id,
      items,
      pulsarSectorId: effectivePulsarId,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsBuildOpen(false);
      setActivePulsarSectorId(null);
    } else {
      showToast(res.error || 'Construction failed.');
    }
  };

  // Move flow
  const handleMove = (moves: MoveStepPayload[], pulsarSectorId?: string) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const effectivePulsarId = pulsarSectorId || activePulsarSectorId || undefined;
    const res = executeAction(state, {
      type: 'MOVE',
      playerId: activePlayer.id,
      moves,
      pulsarSectorId: effectivePulsarId,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsMoveOpen(false);
      setActivePulsarSectorId(null);
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
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
  const handleTrade = (
    fromResource: 'money' | 'science' | 'material',
    amount: number,
    toResource: 'money' | 'science' | 'material' = 'money'
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot trade resources.');
      return;
    }
    const res = executeAction(state, {
      type: 'TRADE',
      playerId: activePlayer.id,
      fromResource,
      toResource,
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
  const handlePass = (forceWithoutModal = false, enableAutoPass?: boolean) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (state.pendingExploreActivations && state.pendingExploreActivations > 0) {
      showToast('Please finish or cancel exploration before passing.');
      return;
    }

    const isFirstPassThisRound = !activePlayer.hasPassed && !state.passedPlayerIds.includes(activePlayer.id);
    if (isFirstPassThisRound && !forceWithoutModal) {
      setShowFirstPassModal(true);
      return;
    }

    const res = executeAction(state, {
      type: 'PASS',
      playerId: activePlayer.id,
      requireConfirmation: true,
      enableAutoPass: enableAutoPass !== undefined ? enableAutoPass : activePlayer.autoPassReactions,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to pass turn.');
    }
  };

  const handleToggleAutoPass = (targetPlayerId?: string) => {
    const pId = targetPlayerId || (typeof currentSeat === 'number' ? state.players[currentSeat]?.id : activePlayer.id);
    if (!pId || !canActForPlayer(pId)) {
      showToast('Cannot change auto-pass settings for this player.');
      return;
    }
    const targetPlayer = state.players.find((p) => p.id === pId);
    if (!targetPlayer) return;

    const newSetting = !targetPlayer.autoPassReactions;
    const res = executeAction(state, {
      type: 'SET_AUTO_PASS',
      playerId: pId,
      enabled: newSetting,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Auto-Pass Reactions ${newSetting ? 'ENABLED' : 'DISABLED'} for ${targetPlayer.name}.`);
    } else {
      showToast(res.error || 'Failed to update auto-pass.');
    }
  };

  // Ambassador exchange
  const handleExchangeAmbassador = (targetPlayerId: string) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    setDiplomacyTargetPlayerId(targetPlayerId);
  };

  const handleProposeDiplomacy = (initiatorCube: PopulationResourceType) => {
    if (!diplomacyTargetPlayerId) return;
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const targetPlayer = state.players.find((p) => p.id === diplomacyTargetPlayerId);
    const res = executeAction(state, {
      type: 'PROPOSE_DIPLOMACY',
      playerId: activePlayer.id,
      targetPlayerId: diplomacyTargetPlayerId,
      initiatorCube,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Alliance proposal sent to ${targetPlayer?.name || 'Commander'}!`);
    } else {
      showToast(res.error || 'Failed to propose alliance.');
    }
    setDiplomacyTargetPlayerId(null);
  };

  const handleRespondDiplomacy = (accept: boolean, targetCube?: PopulationResourceType) => {
    if (!state.pendingDiplomacyProposal) return;
    const targetId = state.pendingDiplomacyProposal.targetId;
    if (!canActForPlayer(targetId)) {
      showToast('Spectators cannot respond to diplomacy proposals.');
      return;
    }
    const res = executeAction(state, {
      type: 'RESPOND_DIPLOMACY',
      playerId: targetId,
      accept,
      targetCube,
    });
    if (res.success) {
      setState(res.newState);
      if (accept) {
        showToast('Alliance established! Ambassadors exchanged (+1 VP each).');
      } else {
        showToast('Alliance proposal declined.');
      }
    } else {
      showToast(res.error || 'Failed to respond to alliance proposal.');
    }
  };

  const handleBetrayAlliance = (targetPlayerId: string) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
    if (!window.confirm(`Are you sure you want to betray your alliance with ${targetPlayer?.name || targetPlayerId}? You will forfeit the +1 VP ambassador, reclaim your population cube, and take the Traitor Tile (-2 VP).`)) {
      return;
    }
    const res = executeAction(state, {
      type: 'BETRAY_ALLIANCE',
      playerId: activePlayer.id,
      targetPlayerId,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Alliance with ${targetPlayer?.name || targetPlayerId} betrayed. Claimed Traitor Tile (-2 VP).`);
    } else {
      showToast(res.error || 'Failed to betray alliance.');
    }
  };

  const handleConfirmDiplomacyExchange = (
    initiatorCube: PopulationResourceType,
    targetCube: PopulationResourceType
  ) => {
    if (!diplomacyTargetPlayerId) return;
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const targetPlayer = state.players.find((p) => p.id === diplomacyTargetPlayerId);
    const res = executeAction(state, {
      type: 'DIPLOMACY_EXCHANGE',
      playerId: activePlayer.id,
      targetPlayerId: diplomacyTargetPlayerId,
      initiatorCube,
      targetCube,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      showToast(
        `Diplomatic relations established with ${targetPlayer?.name || 'ally'}! Ambassadors exchanged (+1 VP each).`
      );
    } else {
      showToast(res.error || 'Failed to exchange ambassadors.');
    }
    setDiplomacyTargetPlayerId(null);
  };

  // Turn action confirm and revert handlers
  const handleConfirmTurnAction = () => {
    if (!state.pendingActionConfirmation) return;
    if (!canActForPlayer(state.pendingActionConfirmation.playerId)) {
      showToast('Spectators cannot confirm actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CONFIRM_TURN_ACTION',
      playerId: state.pendingActionConfirmation.playerId,
    });
    if (res.success) {
      lastStateFingerprintRef.current = getStateFingerprint(res.newState);
      saveGameState(res.newState);
      setState(res.newState);
      showToast('Action confirmed and turn passed.');
    } else {
      showToast(res.error || 'Failed to confirm action.');
    }
  };

  const handleRevertTurnAction = () => {
    if (!state.pendingActionConfirmation) return;
    const conf = state.pendingActionConfirmation;
    if (!canActForPlayer(conf.playerId)) {
      showToast('Spectators cannot revert actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'REVERT_TURN_ACTION',
      playerId: conf.playerId,
    });
    if (res.success) {
      lastStateFingerprintRef.current = getStateFingerprint(res.newState);
      saveGameState(res.newState);
      setState(res.newState);
      if (conf.actionType === 'EXPLORE' && conf.exploreTargetCoord && conf.exploreFromCoord) {
        setPendingExploreCoords({ from: conf.exploreFromCoord, target: conf.exploreTargetCoord });
        showToast('Exploration reverted to tile decision.');
      } else {
        showToast('Action reverted.');
      }
    } else {
      showToast(res.error || 'Failed to revert action.');
    }
  };

  // Discovery choice flow
  const handleDiscoveryChoice = (
    keepForVictoryPoints: boolean,
    equipShipType?: ShipType,
    equipSlotIndex?: number,
    chosenTechId?: string,
    colonizeOrbitalResource?: 'money' | 'science',
    chosenResource?: 'money' | 'science' | 'material'
  ) => {
    if (!state.pendingDiscovery) return;
    if (!canActForPlayer(state.pendingDiscovery.playerId)) {
      showToast('It is not your turn to resolve this Discovery Tile!');
      return;
    }
    const res = executeAction(state, {
      type: 'DISCOVERY_CHOICE',
      playerId: state.pendingDiscovery.playerId,
      sectorId: state.pendingDiscovery.sectorId,
      keepForVictoryPoints,
      equipShipType,
      equipSlotIndex,
      chosenTechId,
      colonizeOrbitalResource,
      chosenResource,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      if (equipShipType && equipSlotIndex !== undefined) {
        showToast(`Ancient tech installed on ${equipShipType.toUpperCase()}!`);
      }
      if (colonizeOrbitalResource) {
        showToast(`Ancient Orbital colonized with ${colonizeOrbitalResource.toUpperCase()}!`);
      }
      if (chosenResource) {
        showToast(`Gained +3 Money and +3 ${chosenResource.toUpperCase()}!`);
      }
    } else {
      showToast(res.error || 'Failed to claim discovery.');
    }
  };

  // Influence flow (Claim / Abandon sector control)
  const handleExecuteInfluence = (
    claimSectors: string[],
    abandonSectors: string[],
    abandonReturnTrack?: Record<string, 'money' | 'science' | 'material'>
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'INFLUENCE',
      playerId: activePlayer.id,
      claimSectors: claimSectors.length > 0 ? claimSectors : undefined,
      abandonSectors: abandonSectors.length > 0 ? abandonSectors : undefined,
      abandonReturnTrack,
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
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
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
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (state.pendingBankruptcy && state.pendingBankruptcy.playerId === activePlayer.id) {
      handleAbandonSectorBankruptcy(sectorId);
      return;
    }
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
  const handleStepCombat = (
    retreatShipIds?: string[],
    retreatDestinationSectorId?: string,
    concludeCombat?: boolean,
    rerollRollIndex?: number,
    autoAssign?: boolean,
    damageAssignments?: CombatDamageAssignment[]
  ) => {
    if (isSpectator) {
      showToast('Spectators cannot command combat.');
      return;
    }
    if (!state.activeCombat) return;

    // Determine commanding player ID
    let commandingPlayerId: string | undefined;

    if (state.activeCombat.pendingDamageAssignment) {
      commandingPlayerId = state.activeCombat.pendingDamageAssignment.attackerOwnerId;
    } else if (!concludeCombat && state.activeCombat.stage !== 'resolved') {
      const sec = state.sectors.find((s) => s.id === state.activeCombat!.sectorId);
      if (sec) {
        const units = buildCombatUnitsForSector(
          sec,
          state.players,
          state.activeCombat.participatingPlayerIds,
          state.neutralShipBlueprints
        );
        const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sec, state.players);
        const aliveUnits = sortUnitsByInitiative(
          units.filter((u) => u.currentDamage < u.maxHull),
          defenderId
        );
        const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
        const isMissileStage = state.activeCombat.stage === 'missile';
        const pendingMissileGroups = isMissileStage
          ? groups.filter(
              (g) => g.weapons.some((w) => w.isMissile) && !g.shipIds.every((id) => state.activeCombat!.missileFiredShipIds?.includes(id))
            )
          : [];
        const activeGroup = isMissileStage
          ? (pendingMissileGroups[0] || null)
          : (groups.length > 0 ? groups[state.activeCombat.currentTurnIndex % groups.length] : null);
        if (activeGroup && activeGroup.ownerId.startsWith('player_')) {
          commandingPlayerId = activeGroup.ownerId;
        }
      }
    }

    if (!commandingPlayerId) {
      commandingPlayerId = typeof currentSeat === 'number' && state.players[currentSeat]
        ? state.players[currentSeat].id
        : activePlayer.id;
    }

    if (commandingPlayerId && !canActForPlayer(commandingPlayerId)) {
      showToast('It is not your turn to command in combat.');
      return;
    }

    const res = executeAction(state, {
      type: 'RESOLVE_COMBAT_STEP',
      playerId: commandingPlayerId || activePlayer.id,
      sectorId: state.activeCombat.sectorId,
      retreatShipIds,
      retreatDestinationSectorId,
      concludeCombat,
      rerollRollIndex,
      autoAssign,
      damageAssignments,
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
    if (!canActForPlayer(state.pendingReputationDraw.playerId)) {
      showToast('Spectators cannot claim reputation tiles.');
      return;
    }
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

  // Exiles Starting Orbital Population Cube Selection
  const handleChooseExilesOrbitalCube = (resource: 'money' | 'science') => {
    if (!state.pendingExilesOrbitalSetup) return;
    if (!canActForPlayer(state.pendingExilesOrbitalSetup.playerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CHOOSE_EXILES_ORBITAL_CUBE',
      playerId: state.pendingExilesOrbitalSetup.playerId,
      resource,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Exiles starting Orbital populated with a ${resource.toUpperCase()} cube.`);
    } else {
      showToast(res.error || 'Failed to place orbital population cube.');
    }
  };

  // Auto-Resolve Combat
  const handleAutoResolveCombat = () => {
    if (isSpectator) {
      showToast('Spectators cannot auto-resolve combat.');
      return;
    }
    if (!state.activeCombat) return;
    let currentState = state;
    let iterations = 0;
    while (currentState.activeCombat && iterations < 100) {
      iterations++;
      const isResolved = currentState.activeCombat.stage === 'resolved';
      let commandingId = activePlayer.id;
      if (currentState.activeCombat.pendingDamageAssignment) {
        commandingId = currentState.activeCombat.pendingDamageAssignment.attackerOwnerId;
      } else if (!isResolved) {
        const sec = currentState.sectors.find((s) => s.id === currentState.activeCombat!.sectorId);
        if (sec) {
          const units = buildCombatUnitsForSector(
            sec,
            currentState.players,
            currentState.activeCombat.participatingPlayerIds,
            currentState.neutralShipBlueprints
          );
          const defenderId = currentState.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sec, currentState.players);
          const aliveUnits = sortUnitsByInitiative(
            units.filter((u) => u.currentDamage < u.maxHull),
            defenderId
          );
          const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
          const isMissileStage = currentState.activeCombat.stage === 'missile';
          const pendingMissileGroups = isMissileStage
            ? groups.filter(
                (g) => g.weapons.some((w) => w.isMissile) && !g.shipIds.every((id) => currentState.activeCombat!.missileFiredShipIds?.includes(id))
              )
            : [];
          const activeGroup = isMissileStage
            ? (pendingMissileGroups[0] || null)
            : (groups.length > 0 ? groups[currentState.activeCombat.currentTurnIndex % groups.length] : null);
          if (activeGroup && activeGroup.ownerId.startsWith('player_')) {
            commandingId = activeGroup.ownerId;
          }
        }
      }

      const res = executeAction(currentState, {
        type: 'RESOLVE_COMBAT_STEP',
        playerId: commandingId,
        sectorId: currentState.activeCombat.sectorId,
        concludeCombat: isResolved,
      });
      if (!res.success) break;
      currentState = res.newState;
    }
    setState(currentState);
    showToast('Combat engagement auto-resolved.');
  };

  // Combat Conquest Flow (Sector Control & Colonization)
  const handleCombatConquest = (
    claimInfluence: boolean,
    colonizePlanetIndices: number[],
    planetResourceChoices?: Record<number, 'money' | 'science' | 'material'>
  ) => {
    if (!state.pendingCombatConquest) return;
    if (!canActForPlayer(state.pendingCombatConquest.winnerPlayerId)) {
      showToast('It is not your turn to resolve combat conquest!');
      return;
    }
    const res = executeAction(state, {
      type: 'COMBAT_CONQUEST',
      playerId: state.pendingCombatConquest.winnerPlayerId,
      sectorId: state.pendingCombatConquest.sectorId,
      claimInfluence,
      colonizePlanetIndices,
      planetResourceChoices,
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

  const handleClaimMinorSpecies = (
    speciesId: MinorSpeciesId,
    populationTrack?: 'money' | 'science' | 'material'
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CLAIM_MINOR_SPECIES',
      playerId: activePlayer.id,
      speciesId,
      populationTrack,
    });
    if (res.success) {
      setState(res.newState);
      showToast('Formed Diplomatic Relations with Minor Species!');
    } else {
      showToast(res.error || 'Failed to form Diplomatic Relations.');
    }
  };

  const handleReturnBlackHoleShip = (shipId: string, targetSectorId: string) => {
    const ownerId = selectedBlackHoleShipForReturn?.ownerId || activePlayer.id;
    if (!canActForPlayer(ownerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'RETURN_BLACK_HOLE_SHIP',
      playerId: ownerId,
      shipId,
      targetSectorId,
    });
    if (res.success) {
      setState(res.newState);
      setSelectedBlackHoleShipForReturn(null);
      showToast('Ship returned from Black Hole spacetime anomaly!');
    } else {
      showToast(res.error || 'Failed to return ship from Black Hole.');
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
        onOpenTurnOrder={() => setIsTurnOrderOpen(true)}
        onOpenMinorSpecies={() => setIsMinorSpeciesOpen(true)}
        onReturnToLobby={handleReturnToLobby}
        currentSeat={currentSeat}
        onChangeSeat={handleChangeSeat}
      />

      {/* Planta 2nd Activation Banner */}
      {Boolean(state.pendingExploreActivations && state.pendingExploreActivations > 0) && (
        <div className="bg-emerald-950/90 border-b border-emerald-600 px-6 py-2 flex items-center justify-between z-40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="text-base">🌿</span>
            <span className="font-bold text-white">Planta Exploration:</span>
            <span>1 Explore Activation remaining! Select an adjacent hex on the map to explore, or finish exploration.</span>
          </div>
          {!isTurnGated && (
            <button
              onClick={handleFinishExplore}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-emerald-800 text-emerald-300 hover:text-white font-bold border border-emerald-700 transition-colors shadow"
            >
              Finish Explore
            </button>
          )}
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
          onColonizePlanet={!isTurnGated ? handleColonizePlanet : undefined}
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
                  currentSimSubsector: currentSimSector?.isNebula ? currentSimSubsector : undefined,
                  connectedDestinationSectorIds: connectedDestinations.map((s) => s.id),
                  plannedMoves,
                  onSelectShipSector: handleSelectMoveShipSector,
                  onSelectDestinationSector: handleAddMoveDestination,
                  onRemovePlannedMove: handleRemovePlannedMove,
                }
              : null
          }
          stagedAbandonedSectorIds={stagedBankruptcySectors}
          blackHoleReturnMode={
            selectedBlackHoleShipForReturn
              ? {
                  legalSectorIds: getLegalBlackHoleReturnSectors(
                    selectedBlackHoleShipForReturn.blackHoleSectorNumber,
                    state.sectors
                  ).map((s) => s.id),
                  selectedSectorId: blackHoleTargetSectorId,
                  onSelectSector: (secId) => setBlackHoleTargetSectorId(secId),
                }
              : null
          }
        />

        {/* Floating Player Dashboard (Top-Left) */}
        <div className="absolute top-4 left-4 z-20 w-[calc(100vw-32px)] sm:w-80 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin pointer-events-auto">
          <PlayerBoard
            player={viewedPlayer}
            isActive={viewedPlayer.id === activePlayer.id}
            sectors={state.sectors}
            onOpenBlueprints={() => setIsBlueprintOpen(true)}
            onOpenTechMarket={() => setIsTechMarketOpen(true)}
            onOpenTrade={() => setIsTradeOpen(true)}
            onOpenPhysicalBoard={() => setIsPhysicalBoardOpen(true)}
            onConvertColonyShip={!isTurnGated ? handleConvertColonyShip : undefined}
            hideOpponentReputation={hideOpponentReputation}
            allPlayers={state.players}
            traitorPlayerId={state.traitorPlayerId}
            gamePhase={state.phase}
            onInitiateDiplomacy={!isTurnGated ? handleExchangeAmbassador : undefined}
            onBetrayAlliance={!isTurnGated ? handleBetrayAlliance : undefined}
            delayedBlackHoleShips={state.galacticEvents?.blackHoleDelayedShips}
          />
        </div>

        {/* Floating Sector Detail & Fleet Inspector (Top-Right) */}
        {selectedSector && !isInfluenceOpen && (
          <div className="absolute top-4 right-4 z-20 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin pointer-events-auto">
            <SectorInspector
              sector={state.sectors.find((s) => s.id === selectedSector.id) || selectedSector}
              players={state.players}
              activePlayer={activePlayer}
              neutralShipBlueprints={state.neutralShipBlueprints}
              onColonizePlanet={!isTurnGated ? handleColonizePlanet : undefined}
              onAbandonInfluence={!isTurnGated ? handleAbandonInfluence : undefined}
              onClose={() => setSelectedSector(null)}
              pendingBankruptcy={state.pendingBankruptcy}
              stagedAbandonedSectorIds={stagedBankruptcySectors}
              onToggleAbandonSector={!isTurnGated ? handleToggleAbandonSectorBankruptcy : undefined}
              onActivatePulsar={
                isMyTurn && !isTurnGated && (state.sectors.find((s) => s.id === selectedSector.id) || selectedSector).discOwner === myPlayerId
                  ? (secId) => setPulsarSectorIdForModal(secId)
                  : undefined
              }
              isPulsarActivatedThisRound={
                selectedSector
                  ? Boolean(state.galacticEvents?.pulsars?.[selectedSector.id]?.activatedThisRound)
                  : false
              }
              currentRound={state.round}
              blackHoleDelayedShips={state.galacticEvents?.blackHoleDelayedShips}
              onReturnBlackHoleShip={!isTurnGated ? (ship) => setSelectedBlackHoleShipForReturn(ship) : undefined}
            />
          </div>
        )}

        {/* Action Bar (Bottom-Center) - Hidden during exploration, building, moving, and influence so command dock takes focus */}
        {state.phase === 'ACTION_PHASE' && !pendingExploreCoords && !isBuildOpen && !isMoveOpen && !isInfluenceOpen && (
          <ActionBar
            activePlayer={activePlayer}
            isExploreMode={isExploreMode}
            onToggleExplore={handleToggleExplore}
            onOpenResearch={() => setIsTechMarketOpen(true)}
            onOpenUpgrade={() => setIsBlueprintOpen(true)}
            onOpenBuild={() => setIsBuildOpen(true)}
            onOpenMove={() => setIsMoveOpen(true)}
            onOpenInfluence={() => setIsInfluenceOpen(true)}
            onPass={handlePass}
            isTurnGated={isTurnGated}
            isSpectator={isSpectator}
            pendingConfirmation={state.pendingActionConfirmation}
            pendingExploreActivations={state.pendingExploreActivations}
            onConfirmAction={handleConfirmTurnAction}
            onRevertAction={handleRevertTurnAction}
            nextPassTileNum={(state.passedPlayerIds?.length || 0) + 1}
            isTurnOrderVariant={Boolean(state.expansions?.includes('turn_order'))}
            onOpenPulsar={() => {
              const availablePulsar = controlledPulsarSectors.find(
                (s) => !state.galacticEvents?.pulsars?.[s.id]?.activatedThisRound
              );
              if (availablePulsar) {
                setPulsarSectorIdForModal(availablePulsar.id);
              }
            }}
            hasPulsarAvailable={hasPulsarAvailable}
            currentRound={state.round}
            delayedBlackHoleShips={state.galacticEvents?.blackHoleDelayedShips}
            onOpenBlackHoleReturn={(ship) => {
              setSelectedBlackHoleShipForReturn(ship);
              const legal = getLegalBlackHoleReturnSectors(ship.blackHoleSectorNumber, state.sectors);
              const def = legal.find((sec) => sec.discOwner === myPlayerId)?.id || legal[0]?.id || null;
              setBlackHoleTargetSectorId(def);
            }}
            autoPassReactions={myControlledPlayer?.autoPassReactions}
            onToggleAutoPass={() => handleToggleAutoPass(myControlledPlayer?.id)}
            isInvaded={myControlledPlayer ? isPlayerInvaded(state, myControlledPlayer.id) : false}
            canToggleAutoPass={Boolean(myControlledPlayer && canActForPlayer(myControlledPlayer.id))}
          />
        )}

        {/* Game Event Log Drawer (Bottom-Right) */}
        <GameLogDrawer
          logs={state.log}
          viewerPlayerId={currentSeat === 'spectator' ? undefined : myPlayerId}
        />

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
          sectors={state.sectors}
          warpConduits={state.warpedUniverse?.conduits}
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
          activeExpansions={state.expansions}
          pulsarSectorId={activePulsarSectorId ?? undefined}
          readOnly={!canActForPlayer(viewedPlayer.id) || isTurnGated}
          onSaveBlueprint={handleSaveBlueprint}
          onClose={() => {
            setIsBlueprintOpen(false);
            setActivePulsarSectorId(null);
          }}
        />
      )}

      {isTechMarketOpen && (
        <TechMarketModal
          player={viewedPlayer}
          activePlayer={activePlayer}
          players={state.players}
          sectors={state.sectors}
          currentSeat={currentSeat}
          phase={state.phase}
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
          pulsarSectorId={activePulsarSectorId ?? undefined}
          onClose={() => {
            setIsBuildOpen(false);
            setActivePulsarSectorId(null);
          }}
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
          pulsarSectorId={activePulsarSectorId ?? undefined}
          onClose={() => {
            setIsMoveOpen(false);
            setActivePulsarSectorId(null);
          }}
        />
      )}

      {isTradeOpen && (
        <TradeModal
          player={viewedPlayer}
          readOnly={!canActForPlayer(viewedPlayer.id) || isTurnGated}
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
          onRerollDie={handleRerollCombatDie}
          onAutoResolve={handleAutoResolveCombat}
          currentSeat={currentSeat}
        />
      )}

      {state.pendingReputationDraw && (
        canActForPlayer(state.pendingReputationDraw.playerId) ? (
          <ReputationTileModal
            state={state}
            pendingDraw={state.pendingReputationDraw}
            onClaimTile={handleClaimReputationTile}
          />
        ) : (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-slate-700/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              Commander{' '}
              <strong className="text-cyan-300">
                {state.players.find((p) => p.id === state.pendingReputationDraw!.playerId)?.name || 'Player'}
              </strong>{' '}
              is selecting a secret Reputation Tile from the bag...
            </span>
          </div>
        )
      )}

      {state.pendingExilesOrbitalSetup && (
        canActForPlayer(state.pendingExilesOrbitalSetup.playerId) ? (
          <ExilesOrbitalSetupModal
            player={
              state.players.find((p) => p.id === state.pendingExilesOrbitalSetup!.playerId) ||
              activePlayer
            }
            onChooseCube={handleChooseExilesOrbitalCube}
          />
        ) : (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-teal-700/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>
              Commander{' '}
              <strong className="text-teal-300">
                {state.players.find((p) => p.id === state.pendingExilesOrbitalSetup!.playerId)?.name || 'The Exiles'}
              </strong>{' '}
              is choosing starting Orbital population cube...
            </span>
          </div>
        )
      )}

      {state.phase === 'DRAFT_PHASE' && (
        <FactionDraftModal
          state={state}
          currentSeat={currentSeat}
          onDraftFaction={handleDraftFaction}
        />
      )}

      {pulsarSectorIdForModal && (
        (() => {
          const pSec = state.sectors.find((s) => s.id === pulsarSectorIdForModal);
          if (!pSec || pSec.discOwner !== myPlayerId || !isMyTurn || isTurnGated) return null;
          return (
            <PulsarModal
              sector={pSec}
              onSelectAction={handleSelectPulsarAction}
              onClose={() => setPulsarSectorIdForModal(null)}
            />
          );
        })()
      )}

      {!state.pendingReputationDraw && state.pendingCombatConquest && (
        <CombatConquestModal
          state={state}
          conquest={state.pendingCombatConquest}
          currentSeat={currentSeat}
          onConfirm={handleCombatConquest}
        />
      )}

      {!state.pendingReputationDraw && !state.pendingCombatConquest && state.pendingDiscovery && (
        canActForPlayer(state.pendingDiscovery.playerId) ? (
          <DiscoveryChoiceModal
            discovery={state.pendingDiscovery.discovery}
            player={
              state.players.find((p) => p.id === state.pendingDiscovery!.playerId) ||
              activePlayer
            }
            techSupply={state.techSupply}
            sectors={state.sectors}
            onChoice={handleDiscoveryChoice}
          />
        ) : (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-bounce">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              Waiting for{' '}
              <strong className="text-indigo-300">
                {state.players.find((p) => p.id === state.pendingDiscovery!.playerId)?.name || 'Commander'}
              </strong>{' '}
              to resolve Discovery Tile ({state.pendingDiscovery.discovery.name})...
            </span>
          </div>
        )
      )}

      {state.pendingArtifactReward && (
        canActForPlayer(state.pendingArtifactReward.playerId) ? (
          <ArtifactKeyModal
            player={
              state.players.find((p) => p.id === state.pendingArtifactReward!.playerId) ||
              activePlayer
            }
            totalResources={state.pendingArtifactReward.totalResources}
            artifactsCount={state.pendingArtifactReward.artifactsCount}
            onAllocate={handleAllocateArtifactReward}
          />
        ) : (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-600/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Waiting for Commander{' '}
              <strong className="text-amber-300">
                {state.players.find((p) => p.id === state.pendingArtifactReward!.playerId)?.name || 'Active Player'}
              </strong>{' '}
              to allocate Artifact Key bounty...
            </span>
          </div>
        )
      )}

      {state.pendingBankruptcy && (
        canActForPlayer(state.pendingBankruptcy.playerId) ? (
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
            stagedTrades={stagedBankruptcyTrades}
            stagedAbandonedSectorIds={stagedBankruptcySectors}
            onStageTrade={handleStageBankruptcyTrade}
            onToggleAbandonSector={handleToggleAbandonSectorBankruptcy}
            onResetPlan={handleResetBankruptcyPlan}
            onConfirmPlan={handleConfirmBankruptcyPlan}
          />
        ) : (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-rose-500/80 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-pulse">
            <Coins className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-rose-300">
                Treasury Deficit Resolution (Upkeep Phase)
              </div>
              <div className="text-xs text-slate-300">
                Waiting for <strong className="text-white">{state.players.find((p) => p.id === state.pendingBankruptcy!.playerId)?.name || 'Player'}</strong> to resolve treasury deficit ({state.pendingBankruptcy.deficit} Credits)...
              </div>
            </div>
          </div>
        )
      )}

      {state.phase === 'GAME_OVER' && (
        <GameOverModal
          state={state}
          onNewGame={() => setIsNewGameOpen(true)}
          onExitToLobby={handleReturnToLobby}
        />
      )}

      {isPhysicalBoardOpen && (
        <PhysicalPlayerBoardModal
          player={viewedPlayer}
          players={state.players}
          activePlayerId={activePlayer.id}
          sectors={state.sectors}
          activeExpansions={state.expansions}
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
          traitorPlayerId={state.traitorPlayerId}
          onExchangeAmbassador={!isTurnGated && canActForPlayer(viewedPlayer.id) ? handleExchangeAmbassador : undefined}
          onBetrayAlliance={!isTurnGated && canActForPlayer(viewedPlayer.id) ? handleBetrayAlliance : undefined}
          onConvertColonyShip={!isTurnGated && canActForPlayer(viewedPlayer.id) ? handleConvertColonyShip : undefined}
        />
      )}

      {isScoreboardOpen && (
        <LiveScoreboardModal
          state={state}
          viewerPlayerId={typeof currentSeat === 'number' ? state.players[currentSeat]?.id : viewedPlayer.id}
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
            const myMem = (loaded.members || []).find((m) => m.userId === currentUser.id);
            if (myMem && typeof myMem.seat !== 'undefined') {
              setCurrentSeat(myMem.seat);
              if (typeof myMem.seat === 'number') {
                setSelectedViewIndex(myMem.seat);
              }
            } else if (typeof currentSeat === 'number') {
              const seatCheck = isSeatTaken(loaded.members, currentSeat, currentUser.id);
              if (seatCheck.isTaken) {
                setCurrentSeat('spectator');
              }
            }
            setSelectedViewIndex(loaded.activePlayerIndex || 0);
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

      <TurnOrderTrackModal
        isOpen={isTurnOrderOpen}
        onClose={() => setIsTurnOrderOpen(false)}
        state={state}
      />

      {isMinorSpeciesOpen && state.expansions?.includes('minor_species') && (
        <MinorSpeciesModal
          state={state}
          activePlayer={activePlayer}
          readOnly={!canActForPlayer(activePlayer.id) || isTurnGated}
          onClaimMinorSpecies={handleClaimMinorSpecies}
          onClose={() => setIsMinorSpeciesOpen(false)}
        />
      )}

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
        state={state}
        tableNumber={tableNum}
        onSuccess={(msg) => showToast(msg)}
      />

      {diplomacyTargetPlayerId && (
        <DiplomacyModal
          isOpen={true}
          initiator={activePlayer}
          target={state.players.find((p) => p.id === diplomacyTargetPlayerId) || viewedPlayer}
          onClose={() => setDiplomacyTargetPlayerId(null)}
          onPropose={handleProposeDiplomacy}
          onConfirm={handleConfirmDiplomacyExchange}
        />
      )}

      {/* Diplomacy Modal: Target player responding to incoming proposal (Bug 91) */}
      {state.pendingDiplomacyProposal &&
        (canActForPlayer(state.pendingDiplomacyProposal.targetId) ? (
          <DiplomacyModal
            isOpen={true}
            initiator={
              state.players.find((p) => p.id === state.pendingDiplomacyProposal!.initiatorId) ||
              activePlayer
            }
            target={
              state.players.find((p) => p.id === state.pendingDiplomacyProposal!.targetId) ||
              viewedPlayer
            }
            isProposalResponse={true}
            pendingInitiatorCube={state.pendingDiplomacyProposal.initiatorCube}
            onClose={() => handleRespondDiplomacy(false)}
            onRespond={handleRespondDiplomacy}
          />
        ) : (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-pulse">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold text-indigo-300">Diplomatic Envoy Proposal</div>
              <div className="text-xs text-slate-300">
                Waiting for <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.targetId)?.name || 'Target Player'}</strong> to respond to proposal from <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.initiatorId)?.name || 'Initiator'}</strong>...
              </div>
            </div>
          </div>
        ))}

      {selectedBlackHoleShipForReturn && canActForPlayer(selectedBlackHoleShipForReturn.ownerId) && (
        <BlackHoleReturnModal
          player={
            state.players.find((p) => p.id === selectedBlackHoleShipForReturn.ownerId) ||
            activePlayer
          }
          ship={selectedBlackHoleShipForReturn}
          currentRound={state.round}
          legalSectors={getLegalBlackHoleReturnSectors(
            selectedBlackHoleShipForReturn.blackHoleSectorNumber,
            state.sectors
          )}
          selectedSectorId={blackHoleTargetSectorId}
          onSelectSectorId={(secId) => setBlackHoleTargetSectorId(secId)}
          onReturn={handleReturnBlackHoleShip}
          onDeclineThisRound={handleDeclineBlackHoleReturn}
          onClose={() => {
            setSelectedBlackHoleShipForReturn(null);
            setBlackHoleTargetSectorId(null);
          }}
        />
      )}

      {/* Bug 88: Prominent hint about new round start */}
      {newRoundHint && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-full px-4 animate-fade-in">
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl shadow-amber-950/80 backdrop-blur-md flex items-center justify-between gap-3 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-xl shrink-0">
                🚀
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  New Round Commenced
                </div>
                <div className="text-base font-extrabold font-display">
                  ROUND {newRoundHint.round} OF {state.maxRounds}
                </div>
                <div className="text-[11px] text-slate-300">
                  Action Phase is active. All influence discs and colony ships refreshed!
                </div>
              </div>
            </div>
            <button
              onClick={() => setNewRoundHint(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* First-Time Pass Hint Modal */}
      <FirstPassHintModal
        player={activePlayer}
        round={state.round}
        isOpen={showFirstPassModal}
        onConfirmPass={(enableAutoPass) => {
          setShowFirstPassModal(false);
          handlePass(true, enableAutoPass);
        }}
        onCancel={() => setShowFirstPassModal(false)}
      />

      {/* Hostile Invasion Alert for Active Reaction Turn */}
      {state.phase === 'ACTION_PHASE' &&
        !isTurnGated &&
        !isSpectator &&
        activePlayer.hasPassed &&
        isPlayerInvaded(state, activePlayer.id) && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100vw-24px)] px-4 py-2.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-rose-200 shadow-2xl flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <span className="text-xs font-black tracking-wider text-rose-300 uppercase block">
                  Hostile Invasion Detected!
                </span>
                <span className="text-[11px] text-slate-300 leading-tight block">
                  Enemy ships entered your territory. Auto-pass has paused so you can react (Upgrade, Build, Move, or Pass).
                </span>
              </div>
            </div>
          </div>
        )}

      {/* Bug 87 & Bug 169: Other player action highlight banner */}
      {state.lastConfirmedAction &&
        state.lastConfirmedAction.timestamp !== dismissedIntelTimestamp &&
        (currentSeat !== 'all' &&
          (typeof currentSeat === 'number'
            ? state.players[currentSeat]?.id !== state.lastConfirmedAction.playerId
            : true)) &&
        Date.now() - state.lastConfirmedAction.timestamp < 12000 && (
          <div className="fixed top-24 right-4 z-40 max-w-sm w-full animate-fade-in pointer-events-auto">
            <div className="bg-slate-900/95 border border-amber-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-start justify-between gap-2.5 text-slate-200">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-lg shrink-0">✨</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Galaxy Intel Update
                  </div>
                  <div className="text-xs font-semibold leading-tight text-slate-100">
                    {state.lastConfirmedAction.summary}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedIntelTimestamp(state.lastConfirmedAction!.timestamp)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
                title="Close Intel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
};
