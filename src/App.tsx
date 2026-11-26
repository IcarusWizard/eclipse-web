import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameState, CombatDamageAssignment, ShiftPortMode } from './engine/types/state';
import { SectorTile, HexCoord, ShipType, SectorShip } from './engine/types/galaxy';
import { ShipPart } from './engine/types/blueprints';
import { createInitialGame } from './engine/rules/setup';
import {
  executeAction,
  getMaxMoveActivations,
  getEffectiveMoveActivationLimit,
  computePinningState,
  computeReachableMoveDestinations,
  ReachableMoveOption,
  playerHasWormholeGenerator,
  isPlayerInvaded,
  getPlayerHumanName,
  getPlayerDisplayName,
  getFactionDisplayColor,
  hasPendingPreGameCubeSetup,
  validateBuildItems,
  applyRaidBuildToPreviewState,
  applyBuildItemsToPreviewState,
  isRaidFaction,
  isRegroupFaction,
} from './engine/rules/gameReducer';
import { playTurnNotificationSound } from './engine/rules/soundUtils';
import { getPriorityActorId, computeBotAction } from './engine/ai/terranBot';
import { calculateBlueprintStats } from './engine/rules/shipValidation';
import { getRingFromCoord, findLegalExploreRotation, findNextLegalExploreRotation, findPreviousLegalExploreRotation, areCoordsEqual } from './engine/rules/hexMath';
import { buildCombatUnitsForSector, getSectorDefenderOwnerId, sortUnitsByInitiative, getCombatShipTypeGroups, getActiveCombatGroup, getPendingSpiralShiftPlayerId } from './engine/rules/combatEngine';
import type { NeutralShipSelectionConfig } from './engine/rules/neutralShips';
import { X, Sparkles, Coins, Rocket, CheckCircle2, Check } from 'lucide-react';

// UI Components
import { Header } from './components/layout/Header';
import { HexGalaxyMap } from './components/map/HexGalaxyMap';
import { PlayerBoard } from './components/dashboard/PlayerBoard';
import { ActionBar } from './components/layout/ActionBar';
import { GameLogDrawer } from './components/layout/GameLogDrawer';
import { GameChatDrawer } from './components/layout/GameChatDrawer';
import { ShipBlueprintEditor } from './components/blueprints/ShipBlueprintEditor';
import { TechMarketModal } from './components/tech/TechMarketModal';
import { ExploreModal } from './components/actions/ExploreModal';
import { BuildModal, BuildItemPayload } from './components/actions/BuildModal';
import { MoveModal, MoveStepPayload, PlannedMove } from './components/actions/MoveModal';
import { InfluenceModal } from './components/actions/InfluenceModal';
import { TradeModal } from './components/actions/TradeModal';
import { CombatModal } from './components/combat/CombatModal';
import { CombatConquestModal } from './components/combat/CombatConquestModal';
import { ReturnDestroyedPopulationModal } from './components/combat/ReturnDestroyedPopulationModal';
import { ReputationTileModal } from './components/combat/ReputationTileModal';
import { GameOverModal } from './components/gameover/GameOverModal';
import { NewGameModal } from './components/setup/NewGameModal';
import { FactionDraftModal } from './components/setup/FactionDraftModal';
import { PulsarModal } from './components/actions/PulsarModal';
import { ExilesOrbitalSetupModal } from './components/setup/ExilesOrbitalSetupModal';
import { RaArtifactSetupModal } from './components/setup/RaArtifactSetupModal';
import { SpiralStartingTechModal } from './components/setup/SpiralStartingTechModal';
import { MidasStartingCubeModal } from './components/setup/MidasStartingCubeModal';
import { DiscoveryChoiceModal } from './components/discovery/DiscoveryChoiceModal';
import { ExploreSectorControlModal } from './components/actions/ExploreSectorControlModal';
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
import { TableWaitingRoom } from './components/lobby/TableWaitingRoom';
import { UserLoginModal } from './components/auth/UserLoginModal';
import { GalacticGalleryModal } from './components/gallery/GalacticGalleryModal';
import { CombatSimulatorModal } from './components/simulator/CombatSimulatorModal';
import { GameReplayModal } from './components/replay/GameReplayModal';
import { BugReportModal } from './components/feedback/BugReportModal';
import { BugReportCornerButton } from './components/feedback/BugReportCornerButton';
import { DiplomacyModal, PopulationResourceType } from './components/diplomacy/DiplomacyModal';
import {
  BetrayalConfirmationModal,
  ReturnAmbassadorCubeModal,
} from './components/diplomacy/BetrayalResolutionModals';
import { TurnOrderTrackModal } from './components/turnOrder/TurnOrderTrackModal';
import { MinorSpeciesModal } from './components/minorSpecies/MinorSpeciesModal';
import { MinorSpeciesId } from './engine/rules/minorSpecies';
import { AdminManageSeatsModal } from './components/admin/AdminManageSeatsModal';
import { compareGameStateProgress } from './engine/rules/turnCheckpoints';
import {
  loadActiveGameState,
  saveGameState,
  persistTableToServer,
  persistChatOnlyUpdate,
  mergeChatMessages,
  loadTable,
  subscribeToGameSync,
  getTableNumber,
  fetchTableFromServer,
  getStateFingerprint,
  registerTableMember,
  adminReassignTableSeat,
  adminSendTableReminder,
  adminGetTurnCheckpoints,
  adminRevertTableTurn,
  fetchServerAppVersion,
  isSeatTaken,
  resolveInviteSeatForUser,
  canUserUseHotseat,
  deleteSavedTable,
  getTableOccupiedSeats,
  leaveTable,
  pingTablePresence,
  fetchTablePresence,
} from './engine/rules/persistence';
import {
  isClientOutdated,
  getLoadedEntryScriptFromDom,
  canPerformSafeAutoReload,
  buildCacheBustedReloadUrl,
  getAutoReloadedVersion,
  markAutoReloadedVersion,
} from './engine/rules/appVersion';
import { getCurrentUser, subscribeToUserSession } from './engine/rules/userSession';
import { UserSession, RegisteredUserProfile } from './engine/types/user';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { translateFactionName } from './i18n/catalogTranslations';

const AppContent: React.FC = () => {
  const { l, language } = useLanguage();
  const [state, setState] = useState<GameState>(() => {
    const loaded = loadActiveGameState();
    return loaded || createInitialGame(2);
  });
  const [selectedSector, setSelectedSector] = useState<SectorTile | null>(null);
  const [selectedViewIndex, setSelectedViewIndex] = useState<number>(() => {
    if (state.isLocalGame) {
      return state.activePlayerIndex || 0;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const seatParam = params.get('seat');
      if (seatParam && seatParam !== 'all' && seatParam !== 'spectator') {
        const num = parseInt(seatParam, 10);
        if (!isNaN(num) && state.players[num]) return num;
      }
    }
    const user = getCurrentUser();
    if (user && state.members) {
      const myMem = state.members.find((m: any) => m.userId === user.id);
      if (myMem && typeof myMem.seat === 'number' && state.players[myMem.seat]) {
        return myMem.seat;
      }
    }
    return state.activePlayerIndex || 0;
  });

  const isRemoteSyncRef = React.useRef<boolean>(false);
  const lastStateFingerprintRef = React.useRef<string>(getStateFingerprint(state));
  const latestStateRef = React.useRef(state);
  latestStateRef.current = state;

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
  const [isCombatSimulatorOpen, setIsCombatSimulatorOpen] = useState<boolean>(false);
  const [isExploreMode, setIsExploreMode] = useState<boolean>(false);
  const [useMidasTouchExplore, setUseMidasTouchExplore] = useState<boolean>(false);
  const [exploreRotation, setExploreRotation] = useState<number>(0);
  const [dracoSelectedTileIndex, setDracoSelectedTileIndex] = useState<number>(0);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [blueprintShipType, setBlueprintShipType] = useState<ShipType | undefined>(undefined);
  const [isTechMarketOpen, setIsTechMarketOpen] = useState<boolean>(false);
  const [isPhysicalBoardOpen, setIsPhysicalBoardOpen] = useState<boolean>(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isTableSessionOpen, setIsTableSessionOpen] = useState<boolean>(false);
  const [isManageSeatsOpen, setIsManageSeatsOpen] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isRaidBuildStep, setIsRaidBuildStep] = useState<boolean>(false);
  const [stagedRaidBuild, setStagedRaidBuild] = useState<(BuildItemPayload & { createdShipId?: string }) | null>(null);
  const [isRegroupBuildStep, setIsRegroupBuildStep] = useState<boolean>(false);
  const [stagedRegroupBuilds, setStagedRegroupBuilds] = useState<(BuildItemPayload & { createdShipId?: string })[] | null>(null);
  const [isMoveOpen, setIsMoveOpen] = useState<boolean>(false);
  const [useMidasTouchMove, setUseMidasTouchMove] = useState<boolean>(false);
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
  const [showBetrayalConfirmModal, setShowBetrayalConfirmModal] = useState<boolean>(false);
  const [replayState, setReplayState] = useState<GameState | null>(null);
  const [replayTableNumber, setReplayTableNumber] = useState<number | undefined>(undefined);
  const [updateAvailableVersion, setUpdateAvailableVersion] = useState<string | null>(null);
  const bootServerVersionRef = React.useRef<string | null>(null);
  const isUiBusyRef = React.useRef<boolean>(false);
  isUiBusyRef.current = Boolean(
    isBuildOpen ||
      isMoveOpen ||
      isInfluenceOpen ||
      isTechMarketOpen ||
      isBlueprintOpen ||
      isTradeOpen ||
      isNewGameOpen ||
      isManageSeatsOpen
  );

  // Detect newly deployed server code versions so open tabs or stale HTML caches reload cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isDisposed = false;

    const triggerSafeReload = (targetVersion: string) => {
      markAutoReloadedVersion(targetVersion);
      window.location.replace(buildCacheBustedReloadUrl(window.location.href, targetVersion));
    };

    const checkAppVersion = async () => {
      const serverInfo = await fetchServerAppVersion();
      if (isDisposed || !serverInfo || !serverInfo.version) return;

      const loadedEntryScript = getLoadedEntryScriptFromDom(typeof document !== 'undefined' ? document : null);
      if (!bootServerVersionRef.current && (!loadedEntryScript || !serverInfo.entryScript || loadedEntryScript === serverInfo.entryScript)) {
        bootServerVersionRef.current = serverInfo.version;
      }

      const outdated = isClientOutdated(
        {
          bootVersion: bootServerVersionRef.current,
          loadedEntryScript,
        },
        serverInfo
      );

      if (outdated) {
        if (
          canPerformSafeAutoReload(
            latestStateRef.current,
            serverInfo.version,
            getAutoReloadedVersion(),
            isUiBusyRef.current
          )
        ) {
          triggerSafeReload(serverInfo.version);
        } else {
          setUpdateAvailableVersion(serverInfo.version);
        }
      }
    };

    checkAppVersion();
    const intervalId = window.setInterval(checkAppVersion, 30000);
    const onFocusOrVisible = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        checkAppVersion();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onFocusOrVisible);
    }

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocusOrVisible);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      }
    };
  }, []);

  // If a pending update was deferred while the player finished an action/modal, auto-reload once safe
  useEffect(() => {
    if (!updateAvailableVersion || typeof window === 'undefined') return;
    const isBusy =
      isBuildOpen ||
      isMoveOpen ||
      isInfluenceOpen ||
      isTechMarketOpen ||
      isBlueprintOpen ||
      isTradeOpen ||
      isNewGameOpen ||
      isManageSeatsOpen;
    if (
      canPerformSafeAutoReload(
        state,
        updateAvailableVersion,
        getAutoReloadedVersion(),
        isBusy
      )
    ) {
      markAutoReloadedVersion(updateAvailableVersion);
      window.location.replace(buildCacheBustedReloadUrl(window.location.href, updateAvailableVersion));
    }
  }, [
    updateAvailableVersion,
    state.pendingExplore,
    state.pendingDiscovery,
    state.pendingExploreControl,
    state.pendingCombatConquest,
    state.pendingArtifactReward,
    state.pendingReputationDraw,
    state.pendingDiplomacyProposal,
    state.pendingActionConfirmation,
    state.pendingExilesOrbitalSetup,
    state.pendingRaArtifactSetup,
    state.pendingSpiralTechSetup,
    state.pendingMidasStartingCubeSetup,
    isBuildOpen,
    isMoveOpen,
    isInfluenceOpen,
    isTechMarketOpen,
    isBlueprintOpen,
    isTradeOpen,
    isNewGameOpen,
    isManageSeatsOpen,
  ]);

  const handleOpenReplay = async (tableIdentifier?: string | number) => {
    const target = tableIdentifier || state?.id;
    if (target) {
      let tState = await fetchTableFromServer(target, true);
      if (!tState) {
        tState = loadTable(target);
      }
      if (tState) {
        setReplayTableNumber((tState as any).tableNumber || (typeof target === 'number' ? target : undefined));
        setReplayState(tState);
        return;
      }
    }
    if (state) {
      setReplayTableNumber((state as any).tableNumber);
      setReplayState(state);
    }
  };

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
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);

  const inviteLinkPendingRef = React.useRef<{ tableId: string; preferredSeat?: number } | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      const p = new URLSearchParams(window.location.search);
      const tId = p.get('table');
      if (!tId || tId.startsWith('local-') || tId.startsWith('local_')) return null;
      const sParam = p.get('seat');
      const parsedSeat = sParam && sParam !== 'all' && sParam !== 'spectator' ? parseInt(sParam, 10) : NaN;
      return {
        tableId: tId,
        preferredSeat: !isNaN(parsedSeat) ? parsedSeat : undefined,
      };
    })()
  );
  const promptedGuestLoginForTableRef = React.useRef<string | null>(null);

  const [currentSeat, setCurrentSeat] = useState<number | 'all' | 'spectator'>(() => {
    const user = getCurrentUser();
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tableParam = params?.get('table');
    const isLocal = Boolean(
      state?.isLocalGame ||
      (tableParam && (tableParam.startsWith('local-') || tableParam.startsWith('local_')))
    );
    if (isLocal) {
      return 'all';
    }
    const isAdmin = canUserUseHotseat(user.role);
    if (typeof window === 'undefined') return isAdmin ? 'all' : 0;
    const seatParam = params?.get('seat');
    if (tableParam && user.role === 'guest') {
      return 'spectator';
    }
    if (!seatParam || seatParam === 'all') {
      if (tableParam && !isAdmin) return 'spectator';
      return isAdmin ? 'all' : 0;
    }
    if (seatParam === 'spectator') return 'spectator';
    const num = parseInt(seatParam, 10);
    return isNaN(num) ? (isAdmin ? 'all' : 0) : num;
  });

  // Guarantee that local games only ever operate in hotseat mode and clean up any stray seat query param
  useEffect(() => {
    if (state?.isLocalGame) {
      if (currentSeat !== 'all') {
        setCurrentSeat('all');
      }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('seat')) {
          params.delete('seat');
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
      }
    }
  }, [state?.id, state?.isLocalGame, currentSeat]);

  useEffect(() => {
    return subscribeToUserSession((u) => {
      setCurrentUser(u);
      if (currentSeat === 'all' && !canUserUseHotseat(u.role, state?.isLocalGame)) {
        setCurrentSeat(0);
        showToast('Only administrators are allowed to use the hotseat function.');
      }
    });
  }, [currentSeat, state?.isLocalGame]);

  // Register current user as member of active table
  const lastRegisteredMemberKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (inGame && state.id && currentUser) {
      if (currentSeat === 'all' && !canUserUseHotseat(currentUser.role, state?.isLocalGame)) {
        showToast('Only administrators are allowed to use the hotseat function.');
        setCurrentSeat(0);
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set('seat', '0');
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
        return;
      }

      // Guest players in online games can only be spectators
      if (!state?.isLocalGame && currentUser.role === 'guest' && currentSeat !== 'spectator') {
        showToast('Guest players can only join online multiplayer games as a spectator. Switched to Spectator.');
        setCurrentSeat('spectator');
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set('seat', 'spectator');
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
        return;
      }

      const members = state.members || (state as any).members || [];

      // Check if currentSeat is already occupied by another player (online games only)
      if (!state?.isLocalGame) {
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
      }

      // Prevent redundant registerTableMember network requests and re-render ping-pong loops
      const regKey = `${state.id}:${currentUser.id}:${currentSeat}:${currentUser.role}`;
      const existingMember = members.find((m: any) => m.userId === currentUser.id);
      if (
        lastRegisteredMemberKeyRef.current === regKey ||
        (existingMember && existingMember.seat === currentSeat && existingMember.role === currentUser.role)
      ) {
        lastRegisteredMemberKeyRef.current = regKey;
        return;
      }

      lastRegisteredMemberKeyRef.current = regKey;

      // Spectator is a temporary seat; who has been the spectator should not be stored.
      // If the user was previously registered in a permanent seat on this table, vacate it,
      // unless an invite link is currently resolving the user's seat on load/login.
      if (currentSeat === 'spectator') {
        if (inviteLinkPendingRef.current) {
          return;
        }
        const wasSeated = members.some((m: any) => m.userId === currentUser.id && m.seat !== 'spectator');
        if (wasSeated) {
          registerTableMember(
            state.id,
            {
              userId: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              role: currentUser.role,
              email: currentUser.email,
              emailNotifications: currentUser.emailNotifications,
              seat: 'spectator',
              joinedAt: Date.now(),
            },
            state.isLocalGame
          ).then((res) => {
            if (res.success && res.members) {
              setState((prev) => ({
                ...prev,
                members: res.members,
              }));
            }
          });
        }
        return;
      }

      registerTableMember(
        state.id,
        {
          userId: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role,
          email: currentUser.email,
          emailNotifications: currentUser.emailNotifications,
          seat: currentSeat,
          joinedAt: Date.now(),
        },
        state.isLocalGame
      ).then((res) => {
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
        } else if (res.success && res.members) {
          setState((prev) => ({
            ...prev,
            members: res.members,
          }));
        }
      });
    }
  }, [inGame, state.id, currentSeat, currentUser?.id, currentUser?.role]);

  // Synchronize seat & default top-left status view to the player's seat upon entering table or clicking game link
  const syncedInitialViewTableRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!inGame || !state.id || !currentUser) return;
    if (syncedInitialViewTableRef.current === state.id) return;
    if (state.isLocalGame) {
      syncedInitialViewTableRef.current = state.id;
      if (currentSeat !== 'all') {
        setCurrentSeat('all');
      }
      setSelectedViewIndex(state.activePlayerIndex || 0);
      return;
    }
    const members = state.members || [];
    const myMem = members.find((m: any) => m.userId === currentUser.id);
    if (myMem && typeof myMem.seat === 'number' && state.players[myMem.seat]) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const explicitSeatParam = params?.get('seat');
      if (!explicitSeatParam || explicitSeatParam === String(myMem.seat)) {
        if (currentSeat !== myMem.seat) {
          setCurrentSeat(myMem.seat);
        }
        setSelectedViewIndex(myMem.seat);
        syncedInitialViewTableRef.current = state.id;
      }
    } else if (typeof currentSeat === 'number' && state.players[currentSeat]) {
      setSelectedViewIndex(currentSeat);
      syncedInitialViewTableRef.current = state.id;
    }
  }, [inGame, state.id, state.isLocalGame, state.activePlayerIndex, currentUser?.id, state.members, currentSeat]);

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
    const resolvedTargetId = targetPlayerId || (state.phase === 'ACTION_PHASE' ? activePlayer?.id : undefined);
    if (resolvedTargetId && state.players.find((p) => p.id === resolvedTargetId)?.isBot) {
      return false;
    }
    if (currentSeat === 'all') return true;
    if (typeof currentSeat === 'number') {
      const myPlayer = state.players[currentSeat];
      if (!myPlayer) return false;
      if (!targetPlayerId) {
        if (state.phase === 'UPKEEP_PHASE') return true;
        return myPlayer.id === activePlayer.id;
      }
      return myPlayer.id === targetPlayerId;
    }
    return false;
  };

  const priorityActorId = inGame && state.isLocalGame ? getPriorityActorId(state) : null;
  const botPriorityPlayer = priorityActorId
    ? state.players.find((p) => p.id === priorityActorId && p.isBot && !p.isEliminated) || null
    : null;
  const isBotActing = Boolean(inGame && state.isLocalGame && botPriorityPlayer);

  // Local Game AI Runner (Level 1 Terran Heuristic Bot)
  useEffect(() => {
    if (!inGame || !state.isLocalGame || state.phase === 'GAME_OVER') return;
    const actorId = getPriorityActorId(state);
    if (!actorId) return;
    const actor = state.players.find((p) => p.id === actorId);
    if (!actor?.isBot || actor.isEliminated) return;

    const timer = window.setTimeout(() => {
      const cur = latestStateRef.current;
      if (!cur || !cur.isLocalGame || cur.phase === 'GAME_OVER') return;
      if (getPriorityActorId(cur) !== actorId) return;
      const botAction = computeBotAction(cur, actorId);
      if (!botAction) return;
      const res = executeAction(cur, botAction);
      if (res.success) {
        setState(res.newState);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [inGame, state]);

  const isTurnGated =
    isSpectator ||
    isBotActing ||
    (currentSeat !== 'all' &&
      typeof currentSeat === 'number' &&
      state.phase !== 'UPKEEP_PHASE' &&
      state.activePlayerIndex !== currentSeat);

  const pendingExploreCoords = React.useMemo(() => {
    if (!state.pendingExplore) return null;
    return {
      from: state.pendingExplore.fromCoord,
      target: state.pendingExplore.targetCoord,
    };
  }, [state.pendingExplore]);

  const canActOnPendingExplore = Boolean(
    state.pendingExplore && canActForPlayer(state.pendingExplore.playerId)
  );

  // Block side-panel/map actions & diplomacy while waiting on a proposal, pre-game setup cube choice, or mid-action modal step
  const hasPendingPreGameSetup = hasPendingPreGameCubeSetup(state);
  const isActionsLocked =
    isTurnGated ||
    hasPendingPreGameSetup ||
    Boolean(state.pendingDiplomacyProposal) ||
    Boolean(state.pendingExplore) ||
    Boolean(state.pendingDiscovery) ||
    Boolean(state.pendingExploreControl) ||
    Boolean(state.pendingCombatConquest) ||
    Boolean(state.pendingReputationDraw) ||
    Boolean(state.pendingArtifactReward);

  // Automatically keep Explore target highlights active whenever extra Explore activations (e.g. Planta)
  // remain ready after Discovery / Sector Control / Diplomacy / page refresh.
  const effectiveExploreMode =
    isExploreMode ||
    (state.phase === 'ACTION_PHASE' &&
      Boolean(state.pendingExploreActivations && state.pendingExploreActivations > 0) &&
      !isActionsLocked &&
      !state.pendingActionConfirmation &&
      !isBuildOpen &&
      !isMoveOpen &&
      !isInfluenceOpen);

  const myControlledPlayer =
    typeof currentSeat === 'number' && state.players[currentSeat]
      ? state.players[currentSeat]
      : activePlayer;

  const effectiveColonizingPlayer = (
    typeof currentSeat === 'number'
      ? state.players[currentSeat]
      : (currentSeat === 'all' && state.phase === 'UPKEEP_PHASE')
      ? (
          (!state.upkeepReadyPlayers?.[viewedPlayer.id] ? viewedPlayer : null) ||
          state.players.find((p) => !p.isEliminated && !state.upkeepReadyPlayers?.[p.id]) ||
          viewedPlayer
        )
      : viewedPlayer
  ) || activePlayer;

  const hideOpponentReputation =
    currentSeat !== 'all' &&
    currentSeat !== 'spectator' &&
    typeof currentSeat === 'number' &&
    viewedPlayer.id !== state.players[currentSeat]?.id &&
    state.phase !== 'GAME_OVER';

  // Play hint chime sound: only triggered at the beginning of the turn, or when an off-turn decision switches to this player (Bugs 216, 219, 223)
  const lastChimedTurnKeyRef = useRef<string>('');
  useEffect(() => {
    if (isSpectator || state.phase === 'GAME_OVER' || state.phase === 'CLEANUP_PHASE') {
      lastChimedTurnKeyRef.current = '';
      return;
    }

    // 1. Determine if there is a pending off-turn decision waiting specifically for this player
    let offTurnDecisionKey: string | null = null;
    const myId = myControlledPlayer?.id;

    if (state.activeCombat) {
      let combatDecisionPlayerId: string | undefined;
      if (state.activeCombat.pendingDamageAssignment) {
        combatDecisionPlayerId = state.activeCombat.pendingDamageAssignment.attackerOwnerId;
      } else if (state.activeCombat.stage !== 'resolved') {
        const sec = state.sectors.find((s) => s.id === state.activeCombat!.sectorId);
        if (sec) {
          const spiralShiftId = getPendingSpiralShiftPlayerId(state.players, sec, state.activeCombat);
          if (spiralShiftId) {
            combatDecisionPlayerId = spiralShiftId;
          } else {
          const units = buildCombatUnitsForSector(
            sec,
            state.players,
            state.activeCombat.participatingPlayerIds,
            state.neutralShipBlueprints,
            state.expansions,
            state.activeCombat.spiralShiftModes
          );
          const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sec, state.players);
          const aliveUnits = sortUnitsByInitiative(
            units.filter((u) => u.currentDamage < u.maxHull),
            defenderId
          );
          const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
          const activeGroup = getActiveCombatGroup(state.activeCombat, groups);
          if (activeGroup && activeGroup.ownerId.startsWith('player_')) {
            combatDecisionPlayerId = activeGroup.ownerId;
          }
          }
        }
      } else {
        combatDecisionPlayerId = activePlayer.id;
      }

      if (combatDecisionPlayerId && (currentSeat === 'all' || myId === combatDecisionPlayerId)) {
        offTurnDecisionKey = `combat:${state.activeCombat.sectorId}:${state.activeCombat.roundNumber}:${state.activeCombat.stage}:${state.activeCombat.currentTurnIndex}:${state.activeCombat.pendingDamageAssignment ? 'dmg' : 'turn'}`;
      }
    } else if (state.pendingDiplomacyProposal && (currentSeat === 'all' || state.pendingDiplomacyProposal.targetId === myId)) {
      offTurnDecisionKey = `diplomacy:${state.pendingDiplomacyProposal.initiatorId}:${state.pendingDiplomacyProposal.targetId}`;
    } else if (state.pendingCombatConquest && (currentSeat === 'all' || state.pendingCombatConquest.winnerPlayerId === myId)) {
      offTurnDecisionKey = `conquest:${state.pendingCombatConquest.sectorId}:${state.pendingCombatConquest.bombardmentSummary?.isPendingConfirm ? 'confirm' : state.pendingCombatConquest.bombardmentSummary?.isPendingTargetSelection ? 'targets' : 'decide'}`;
    } else if (
      !state.pendingCombatConquest &&
      !state.pendingDiscovery &&
      !state.pendingReputationDraw &&
      state.pendingPopulationReturnChoices?.[0] &&
      (currentSeat === 'all' || state.pendingPopulationReturnChoices[0].playerId === myId)
    ) {
      const popRet = state.pendingPopulationReturnChoices[0];
      offTurnDecisionKey = `pop_return:${popRet.sectorId}:${popRet.planetIndex}`;
    } else if (
      (state.pendingReputationDraw && (currentSeat === 'all' || state.pendingReputationDraw.playerId === myId)) ||
      (state.pendingReputationDrawQueue?.[0] && (currentSeat === 'all' || state.pendingReputationDrawQueue[0].playerId === myId))
    ) {
      offTurnDecisionKey = `rep_draw:${state.pendingReputationDraw?.sectorId || state.pendingReputationDrawQueue?.[0]?.sectorId || 'rep'}`;
    } else if (state.pendingBankruptcy && (currentSeat === 'all' || state.pendingBankruptcy.playerId === myId)) {
      offTurnDecisionKey = `bankruptcy:${state.pendingBankruptcy.playerId}`;
    } else if (state.pendingExilesOrbitalSetup && (currentSeat === 'all' || state.pendingExilesOrbitalSetup.playerId === myId)) {
      offTurnDecisionKey = `exiles_setup:${state.pendingExilesOrbitalSetup.playerId}`;
    } else if (state.pendingRaArtifactSetup && (currentSeat === 'all' || state.pendingRaArtifactSetup.playerId === myId)) {
      offTurnDecisionKey = `ra_setup:${state.pendingRaArtifactSetup.playerId}`;
    } else if (state.pendingSpiralTechSetup && (currentSeat === 'all' || state.pendingSpiralTechSetup.playerId === myId)) {
      offTurnDecisionKey = `spiral_setup:${state.pendingSpiralTechSetup.playerId}`;
    } else if (state.pendingMidasStartingCubeSetup && (currentSeat === 'all' || state.pendingMidasStartingCubeSetup.playerId === myId)) {
      offTurnDecisionKey = `midas_setup:${state.pendingMidasStartingCubeSetup.playerId}`;
    } else if (state.isDraftMode && state.factionDraft && (currentSeat === 'all' || state.factionDraft.draftOrder[state.factionDraft.currentDraftIndex] === myId)) {
      offTurnDecisionKey = `draft:${state.factionDraft.currentDraftIndex}`;
    }

    // 2. Active Main Turn in Action Phase
    const isLivePlayerTurn = !isTurnGated && state.phase === 'ACTION_PHASE';
    const mainTurnKey = isLivePlayerTurn
      ? `turn:${state.round}:${state.activePlayerIndex}:${state.replaySteps?.length || 0}`
      : null;

    const currentDecisionKey = offTurnDecisionKey || mainTurnKey;

    if (currentDecisionKey) {
      if (lastChimedTurnKeyRef.current !== currentDecisionKey) {
        playTurnNotificationSound();
        lastChimedTurnKeyRef.current = currentDecisionKey;
      }
    } else {
      lastChimedTurnKeyRef.current = '';
    }
  }, [
    isTurnGated,
    isSpectator,
    currentSeat,
    myControlledPlayer?.id,
    activePlayer.id,
    state.phase,
    state.round,
    state.activePlayerIndex,
    state.replaySteps?.length,
    state.activeCombat,
    state.pendingDiplomacyProposal,
    state.pendingCombatConquest,
    state.pendingDiscovery,
    state.pendingPopulationReturnChoices,
    state.pendingReputationDraw,
    state.pendingReputationDrawQueue,
    state.pendingBankruptcy,
    state.pendingExilesOrbitalSetup,
    state.pendingRaArtifactSetup,
    state.pendingSpiralTechSetup,
    state.pendingMidasStartingCubeSetup,
    state.isDraftMode,
    state.factionDraft,
  ]);

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
          const currentLocal = loadTable(tableParam);
          const remoteTime = Number(remote.savedAt) || 0;
          const localTime = Number(currentLocal?.savedAt) || 0;
          const isAdminRestore =
            Number((remote as any).adminRestoredAt || 0) >
            Number((currentLocal as any)?.adminRestoredAt || 0);
          if (
            !isAdminRestore &&
            localTime > remoteTime &&
            compareGameStateProgress(currentLocal, remote) >= 0 &&
            currentLocal
          ) {
            isRemoteSyncRef.current = true;
            lastStateFingerprintRef.current = getStateFingerprint(currentLocal);
            setState(currentLocal);
            setInGame(true);
            return;
          }
          isRemoteSyncRef.current = true;
          lastStateFingerprintRef.current = getStateFingerprint(remote);
          saveGameState(remote, true);
          setState(remote);
          setInGame(true);

          if (params.get('table') !== remote.id) {
            params.set('table', remote.id);
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }
          if (inviteLinkPendingRef.current) {
            inviteLinkPendingRef.current.tableId = remote.id;
          }

          const seatParam = params.get('seat');
          if (!seatParam && currentUser.role !== 'guest') {
            const existingSeat = (remote.members || []).find(
              (m: any) => m.userId === currentUser.id && typeof m.seat === 'number'
            );
            if (existingSeat && typeof existingSeat.seat === 'number') {
              setCurrentSeat(existingSeat.seat);
              setSelectedViewIndex(existingSeat.seat);
            }
          }
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
      // Never adopt revertible unconfirmed previews from other players;
      // once locked (canRevert === false) or carrying a diplomacy proposal, sync it across seats.
      if (
        remoteState.pendingActionConfirmation &&
        !remoteState.pendingDiplomacyProposal &&
        remoteState.pendingActionConfirmation.canRevert !== false
      ) {
        return;
      }

      // Always merge incoming chat messages even when active player has an unconfirmed local preview open
      const currentLocalState = latestStateRef.current;
      const mergedChat = mergeChatMessages(currentLocalState?.chatMessages, remoteState.chatMessages);
      if (mergedChat.length !== (currentLocalState?.chatMessages?.length || 0)) {
        remoteState = { ...remoteState, chatMessages: mergedChat };
      } else if (currentLocalState?.chatMessages && currentLocalState.chatMessages.length > (remoteState.chatMessages?.length || 0)) {
        remoteState = { ...remoteState, chatMessages: mergedChat };
      }

      // Bug 87 & 93: Only protect if THIS seat has an active revertible unconfirmed action that this player is editing
      // (unless an administrator issued a newer server turn restore).
      const isAdminRestore =
        Number((remoteState as any).adminRestoredAt || 0) >
        Number((currentLocalState as any)?.adminRestoredAt || 0);

      const isMyPendingAction =
        !isAdminRestore &&
        !!pendingActionRef.current &&
        pendingActionRef.current.canRevert !== false &&
        (currentSeat === 'all' ||
          pendingActionRef.current.playerId === currentLocalState?.players?.[currentSeat as number]?.id);
      if (isMyPendingAction) {
        if (mergedChat.length !== (currentLocalState?.chatMessages?.length || 0)) {
          setState((prev) => ({ ...prev, chatMessages: mergeChatMessages(prev.chatMessages, mergedChat) }));
        }
        return;
      }

      const remoteTime = Number((remoteState as any).savedAt) || 0;
      const localTime = Number((currentLocalState as any)?.savedAt) || 0;
      if (
        !isAdminRestore &&
        localTime > remoteTime &&
        compareGameStateProgress(currentLocalState, remoteState) >= 0 &&
        !currentLocalState?.pendingActionConfirmation
      ) {
        if (mergedChat.length !== (currentLocalState?.chatMessages?.length || 0)) {
          setState((prev) => ({ ...prev, chatMessages: mergeChatMessages(prev.chatMessages, mergedChat) }));
        }
        return;
      }

      const remoteFp = getStateFingerprint(remoteState);
      if (isAdminRestore || remoteFp !== lastStateFingerprintRef.current) {
        lastStateFingerprintRef.current = remoteFp;
        isRemoteSyncRef.current = true;
        setState(remoteState);
      }
    });

    return unsubscribe;
  }, [inGame, state.id]);

  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean> | undefined>(undefined);

  // Active Player Presence Heartbeat (pings server every 20s while tab is open and syncs table member online map)
  useEffect(() => {
    if (!inGame || !state.id || (state as any)?.isLocalGame) {
      setOnlineByUserId(undefined);
      return;
    }
    let cancelled = false;
    const syncPresence = async () => {
      const nextMap =
        currentUser && currentUser.role !== 'guest'
          ? await pingTablePresence(currentUser.id, state.id)
          : await fetchTablePresence(state.id);
      if (!cancelled && nextMap) {
        setOnlineByUserId(nextMap);
      }
    };
    syncPresence();
    const interval = setInterval(syncPresence, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [inGame, currentUser?.id, currentUser?.role, state.id, (state as any)?.isLocalGame]);

  const handleStartNewGameFromLobby = (
    playerCount: number,
    factionIds: string[],
    tableId: string,
    seat: number | 'all',
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean,
    isLocalGame?: boolean,
    botSeats?: boolean[]
  ) => {
    const user = getCurrentUser();
    if (!isLocalGame && user.role === 'guest') {
      showToast(l(
        'Guest players cannot create online multiplayer games. Please log in or start a Local Game.',
        '游客无法创建联机对局，请先登录或创建本地热座对局。'
      ));
      return;
    }
    const effectiveSeat = isLocalGame ? 'all' : (typeof seat === 'number' ? seat : 0);
    const newGame = createInitialGame(
      playerCount,
      factionIds,
      expansions,
      neutralShips,
      isDraftMode,
      isLocalGame ? botSeats : undefined
    );
    const num = parseInt(tableId.replace(/\D/g, ''), 10) || 101;
    (newGame as any).tableNumber = num;
    newGame.id = tableId;
    (newGame as any).creatorUserId = user.id;
    (newGame as any).creatorUsername = user.username || user.name;
    (newGame as any).creatorRole = user.role;
    (newGame as any).isGameStarted = isLocalGame ? true : false;
    newGame.isLocalGame = Boolean(isLocalGame);
    const initialMember = {
      userId: user.id,
      name: user.name,
      username: user.username || user.name,
      role: user.role,
      email: user.email,
      emailNotifications: user.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
      isCreator: true,
    };
    (newGame as any).members = [initialMember];
    saveGameState(newGame);
    if (!isLocalGame) {
      registerTableMember(tableId, initialMember, false, true).then((res) => {
        if (res.success && res.members) {
          setState((prev) => ({ ...prev, members: res.members }));
        }
      });
    }
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
    let loaded = loadTable(tableId);
    const remote = await fetchTableFromServer(tableId);
    if (remote) {
      const localSavedAt = Number(loaded?.savedAt) || 0;
      const remoteSavedAt = Number(remote.savedAt) || 0;
      const remoteAdminTs = Number((remote as any).adminRestoredAt || 0);
      const localAdminTs = Number((loaded as any)?.adminRestoredAt || 0);
      const progressCmp = loaded ? compareGameStateProgress(remote, loaded) : 1;
      if (
        !loaded ||
        remoteAdminTs > localAdminTs ||
        progressCmp > 0 ||
        (progressCmp === 0 && remoteSavedAt >= localSavedAt) ||
        ((remote as any).isGameStarted && !(loaded as any).isGameStarted)
      ) {
        loaded = remote;
      }
    }
    if (!loaded) {
      alert(`Table "${tableId}" does not exist.`);
      return;
    }

    const isLocal = Boolean(loaded.isLocalGame || tableId.startsWith('local-') || tableId.startsWith('local_'));
    const effectiveSeat = isLocal ? 'all' : seat;

    if (!isLocal && user.role === 'guest' && effectiveSeat !== 'spectator') {
      alert('Guest players can only join online multiplayer games as a spectator. Please log in or register to take a player seat.');
      setIsUserModalOpen(true);
      return;
    }

    if (effectiveSeat === 'all' && !canUserUseHotseat(user.role, isLocal)) {
      alert('Only administrators are allowed to use the hotseat function in online games.');
      return;
    }
    if (typeof effectiveSeat === 'number') {
      const seatCheck = isSeatTaken(loaded.members, effectiveSeat, user.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        alert(
          `Seat ${effectiveSeat + 1} is already taken by ${seatCheck.occupant.username || seatCheck.occupant.name}.`
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
      seat: effectiveSeat,
      joinedAt: Date.now(),
    }, isLocal);
    if (!regRes.success && regRes.error) {
      alert(regRes.error);
      return;
    }
    if (regRes.members) {
      loaded.members = regRes.members.filter((m: any) => m && m.seat !== 'spectator');
    }
    saveGameState(loaded, true);
    setState(loaded);
    lastStateFingerprintRef.current = getStateFingerprint(loaded);
    setCurrentSeat(effectiveSeat);
    if (typeof effectiveSeat === 'number' && loaded.players[effectiveSeat]) {
      setSelectedViewIndex(effectiveSeat);
    } else {
      setSelectedViewIndex(loaded.activePlayerIndex || 0);
    }
    setInGame(true);

    if (typeof window !== 'undefined') {
      const seatParam =
        effectiveSeat === 'all' ? '' : effectiveSeat === 'spectator' ? '&seat=spectator' : `&seat=${effectiveSeat}`;
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
    if (state.isLocalGame) {
      setCurrentSeat('all');
      setSelectedViewIndex(state.activePlayerIndex || 0);
      return;
    }
    const isGameRunning = Boolean(
      state.isGameStarted ||
      state.round > 1 ||
      (state.replaySteps && state.replaySteps.length > 1)
    );
    const isAdmin = currentUser?.role === 'admin';
    const isEliminated =
      typeof currentSeat === 'number' && Boolean(state.players[currentSeat]?.isEliminated);

    // Lock seats once an online game has started
    if (isGameRunning && !state.isLocalGame && !isAdmin) {
      if (typeof currentSeat === 'number' && !isEliminated && seat !== currentSeat) {
        showToast('Seats are locked once the game has started.');
        return;
      }
      if (currentSeat === 'spectator' && seat !== 'spectator') {
        showToast('Seats are locked once the game has started.');
        return;
      }
    }

    if (!state.isLocalGame && currentUser.role === 'guest' && seat !== 'spectator') {
      showToast('Guest players can only join online multiplayer games as a spectator. Please log in or register.');
      setIsUserModalOpen(true);
      return;
    }
    if (seat === 'all' && !canUserUseHotseat(currentUser.role, state.isLocalGame)) {
      showToast('Only administrators are allowed to use the hotseat function in online games.');
      return;
    }
    if (typeof seat === 'number') {
      const seatCheck = isSeatTaken(state.members, seat, currentUser.id);
      if (seatCheck.isTaken && seatCheck.occupant && !isAdmin) {
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
    if (currentUser) {
      const updatedMembers = (state.members || []).filter(
        (m: any) =>
          m.userId !== currentUser.id &&
          m.seat !== 'spectator' &&
          (isAdmin && typeof seat === 'number' ? m.seat !== seat : true)
      );
      if (seat !== 'spectator') {
        updatedMembers.push({
          userId: currentUser.id,
          name: currentUser.name,
          username: currentUser.username || currentUser.name,
          role: currentUser.role,
          email: currentUser.email,
          emailNotifications: currentUser.emailNotifications,
          seat,
          joinedAt: Date.now(),
        });
      }

      const updatedPlayers = typeof seat === 'number' && state.players[seat]
        ? state.players.map((p, idx) => (idx === seat ? { ...p, name: currentUser.username || currentUser.name } : p))
        : state.players;

      const nextState = {
        ...state,
        members: updatedMembers,
        players: updatedPlayers,
      };
      saveGameState(nextState);
      setState(nextState);

      if (isAdmin && typeof seat === 'number') {
        showToast(`Seat ${seat + 1} taken over by Administrator (${currentUser.username}).`);
      }

      if (inGame && state.id) {
        registerTableMember(
          state.id,
          {
            userId: currentUser.id,
            name: currentUser.name,
            username: currentUser.username,
            role: currentUser.role,
            email: currentUser.email,
            emailNotifications: currentUser.emailNotifications,
            seat,
            joinedAt: Date.now(),
          },
          state.isLocalGame
        ).then((res) => {
          if (res.success && res.members) {
            setState((prev) => ({
              ...prev,
              members: res.members,
            }));
          }
        }).catch(() => {});
      }
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table') || state.id;
      const seatParam =
        seat === 'all' ? '' : seat === 'spectator' ? '&seat=spectator' : `&seat=${seat}`;
      window.history.replaceState({}, '', `?table=${tableParam}${seatParam}`);
    }
  };

  const handleAdminReassignSeat = async (
    seatIndex: number,
    targetUser: RegisteredUserProfile
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Administrator role required to reassign seats.' };
    }
    const res = await adminReassignTableSeat(
      state.id,
      seatIndex,
      targetUser,
      currentUser,
      state.isLocalGame
    );
    if (res.success && res.members) {
      const updatedPlayers = state.players.map((p, idx) =>
        idx === seatIndex ? { ...p, name: targetUser.username || targetUser.name } : p
      );
      const nextState = {
        ...state,
        members: res.members,
        players: updatedPlayers,
      };
      saveGameState(nextState);
      setState(nextState);
      showToast(`Seat ${seatIndex + 1} reassigned to ${targetUser.username}.`);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to reassign seat.' };
  };

  const handleAdminSendReminder = async (seatIndex: number) => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Administrator role required to send manual reminders.' };
    }
    const res = await adminSendTableReminder(
      state.id,
      seatIndex,
      currentUser,
      state.isLocalGame
    );
    if (res.success) {
      showToast(
        res.mock
          ? `Reminder logged (mock SMTP) for ${res.username || `Seat ${seatIndex + 1}`}`
          : `Turn reminder sent to ${res.username || `Seat ${seatIndex + 1}`}${res.email ? ` (${res.email})` : ''}!`
      );
    }
    return res;
  };

  const handleAdminGetTurnCheckpoints = async () => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Administrator role required.' };
    }
    return adminGetTurnCheckpoints(state.id, currentUser, state.isLocalGame);
  };

  const handleAdminRevertTurn = async (target: 'current' | 'previous') => {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Administrator role required to revert turns.' };
    }
    const res = await adminRevertTableTurn(state.id, target, currentUser, state.isLocalGame);
    if (res.success && res.table) {
      lastStateFingerprintRef.current = getStateFingerprint(res.table);
      isRemoteSyncRef.current = true;
      setState(res.table);
      setIsExploreMode(false);
      setIsBuildOpen(false);
      setIsMoveOpen(false);
      setIsInfluenceOpen(false);
      setIsTechMarketOpen(false);
      setIsBlueprintOpen(false);
      showToast(
        target === 'current'
          ? 'Table restored to start of current player turn!'
          : 'Table restored to start of previous player turn!'
      );
    }
    return res;
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
    isDraftMode?: boolean,
    botSeats?: boolean[]
  ) => {
    const user = getCurrentUser();
    const newGame = createInitialGame(playerCount, selectedFactionIds, expansions, neutralShips, isDraftMode, botSeats);
    newGame.isLocalGame = true;
    (newGame as any).isGameStarted = true;
    (newGame as any).creatorUserId = user.id;
    (newGame as any).creatorUsername = user.username || user.name;
    (newGame as any).creatorRole = user.role;
    (newGame as any).members = [
      {
        userId: user.id,
        name: user.name,
        username: user.username || user.name,
        role: user.role,
        email: user.email,
        emailNotifications: user.emailNotifications,
        seat: 'all' as const,
        joinedAt: Date.now(),
        isCreator: true,
      },
    ];
    setCurrentSeat('all');
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

  // Explore flow: User clicks an explorable hex on map -> persists drawn tile in state.pendingExplore immediately
  const handleExploreTarget = (fromCoord: HexCoord, targetCoord: HexCoord) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const isSecond = Boolean(state.pendingExploreActivations && state.pendingExploreActivations > 0);
    const res = executeAction(state, {
      type: 'START_EXPLORE',
      playerId: activePlayer.id,
      fromCoord,
      targetCoord,
      isSecondActivation: isSecond,
      useMidasTouch: !isSecond && useMidasTouchExplore ? true : undefined,
    });
    if (!res.success) {
      showToast(res.error || 'Exploration failed.');
      return;
    }
    setUseMidasTouchExplore(false);

    lastStateFingerprintRef.current = getStateFingerprint(res.newState);
    saveGameState(res.newState);
    persistTableToServer(res.newState).catch(() => {});
    setState(res.newState);

    const drawn = res.newState.pendingExplore?.tile;
    const source = res.newState.sectors.find((s) => areCoordsEqual(s.coord, fromCoord));
    const hasWormholeGen = activePlayer ? playerHasWormholeGenerator(activePlayer) : false;
    const defaultRotation = (source && drawn)
      ? findLegalExploreRotation(source, drawn, targetCoord, hasWormholeGen, res.newState.sectors, activePlayer?.id, res.newState.warpedUniverse?.conduits)
      : 0;

    setDracoSelectedTileIndex(0);
    setExploreRotation(defaultRotation);
    setIsExploreMode(false);
  };

  // Ensure legal default rotation whenever state.pendingExplore is restored (e.g., on page reload or Revert)
  useEffect(() => {
    const pe = state.pendingExplore;
    if (!pe) return;
    const explorer = state.players.find((p) => p.id === pe.playerId) || activePlayer;
    const source = state.sectors.find((s) => areCoordsEqual(s.coord, pe.fromCoord));
    if (!source || !pe.tile) return;
    const hasWormholeGen = explorer ? playerHasWormholeGenerator(explorer) : false;
    const defaultRot = findLegalExploreRotation(
      source,
      pe.tile,
      pe.targetCoord,
      hasWormholeGen,
      state.sectors,
      explorer?.id,
      state.warpedUniverse?.conduits
    );
    setDracoSelectedTileIndex(0);
    setExploreRotation(defaultRot);
  }, [state.pendingExplore?.playerId, state.pendingExplore?.targetCoord?.q, state.pendingExplore?.targetCoord?.r, state.pendingExplore?.tile?.id]);

  const executePendingExploreDecision = (opts: {
    rotation: number;
    claimInfluence: boolean;
    discard?: boolean;
    chosenTileIndex?: number;
  }) => {
    if (!pendingExploreCoords) return;
    const actorId = state.pendingExplore?.playerId || activePlayer.id;
    if (!canActForPlayer(actorId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const isSecond = Boolean(
      state.pendingExplore?.isSecondActivation ||
      (state.pendingExploreActivations && state.pendingExploreActivations > 0)
    );
    const res = executeAction(state, {
      type: 'EXPLORE',
      playerId: actorId,
      fromCoord: pendingExploreCoords.from,
      targetCoord: pendingExploreCoords.target,
      rotation: opts.rotation,
      claimInfluence: opts.claimInfluence,
      discard: opts.discard,
      chosenTileIndex: opts.chosenTileIndex,
      isSecondActivation: isSecond,
      requireConfirmation: true,
    });

    if (res.success) {
      setState(res.newState);
      if (
        res.newState.pendingExploreActivations &&
        res.newState.pendingExploreActivations > 0 &&
        !res.newState.pendingDiscovery &&
        !res.newState.pendingExploreControl &&
        !res.newState.pendingArtifactReward
      ) {
        setIsExploreMode(true);
        showToast(
          activePlayer.faction.id === 'legion_of_midas'
            ? '🪙 Midas Touch: 1 Explore Activation remaining! Select an adjacent hex on the map.'
            : '🌿 Planta Expansion: 1 Explore Activation remaining! Select an adjacent hex on the map.'
        );
      }
    } else {
      showToast(res.error || 'Exploration failed.');
    }
  };

  const handleConfirmExplorePlacement = (
    rotation: number,
    claimInfluence: boolean,
    chosenTileIndex?: number
  ) => {
    executePendingExploreDecision({ rotation, claimInfluence, chosenTileIndex });
  };

  const handleDiscardExploreTile = (chosenTileIndex?: number) => {
    executePendingExploreDecision({ rotation: 0, claimInfluence: false, discard: true, chosenTileIndex });
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
      if (!window.confirm(`You have ${state.pendingExploreActivations} Explore activation remaining! Are you sure you want to finish exploration and give up the extra activation?`)) {
        return;
      }
      handleFinishExplore();
      return;
    }
    setIsExploreMode((prev) => {
      if (prev) setUseMidasTouchExplore(false);
      return !prev;
    });
  };

  // Research flow (supports single tech or array of technologies for Hydran/Midas double research, Lyra shrine placement, and Atlantians Ancient Instinct Upgrade 1)
  const handleResearchTech = (
    researchesOrId: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[] | string,
    targetTrack?: 'military' | 'grid' | 'nano',
    warpPortalSectorId?: string,
    shrinePlacement?: { row: number; col: number; sectorId: string; planetId: string },
    ancientInstinctUpgrade?: { shipType: ShipType; slotIndex: number; partId: string },
    useMidasTouch?: boolean
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
      ancientInstinctUpgrade,
      useMidasTouch,
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
    const targetRoll =
      state.activeCombat.pendingDamageAssignment?.rolls?.[rollIndex] ??
      state.activeCombat.lastRolls?.[rollIndex];
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
    pulsarSectorId?: string,
    useMidasTouch?: boolean
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
      useMidasTouch,
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
      !isActionsLocked &&
      !activePlayer.hasPassed &&
      state.phase === 'ACTION_PHASE' &&
      controlledPulsarSectors.some(
        (s) => !state.galacticEvents?.pulsars?.[s.id]?.activatedThisRound
      )
    );
  }, [isMyTurn, isActionsLocked, activePlayer.hasPassed, state.phase, controlledPulsarSectors, state.galacticEvents]);

  // Bug 190 & 191: Auto-prompt for Black Hole ship return on player's first turn of the round
  useEffect(() => {
    if (!isMyTurn || isActionsLocked || state.phase !== 'ACTION_PHASE') return;
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
    isActionsLocked,
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
    if (!pSec || pSec.discOwner !== myPlayerId || !isMyTurn || isActionsLocked || !canActForPlayer(pSec.discOwner)) {
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
  const movePlanningState = useMemo(
    () =>
      isMoveOpen && stagedRaidBuild
        ? applyRaidBuildToPreviewState(state, activePlayer.id, stagedRaidBuild)
        : isMoveOpen && stagedRegroupBuilds && stagedRegroupBuilds.length > 0
        ? applyBuildItemsToPreviewState(state, activePlayer.id, stagedRegroupBuilds)
        : state,
    [isMoveOpen, stagedRaidBuild, stagedRegroupBuilds, state, activePlayer.id]
  );

  const playerShips = useMemo(() => {
    const list: { ship: SectorShip; initialSector: SectorTile }[] = [];
    for (const s of movePlanningState.sectors) {
      for (const sh of s.ships) {
        if (sh.ownerId === activePlayer.id) {
          list.push({ ship: sh, initialSector: s });
        }
      }
    }
    return list;
  }, [movePlanningState.sectors, activePlayer.id]);

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
      setUseMidasTouchMove(false);
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
      const destSec = movePlanningState.sectors.find((s) => s.id === m.toSectorId);
      if (destSec) {
        map.set(m.shipId, destSec);
      }
    }
    return map;
  }, [playerShips, plannedMoves, movePlanningState.sectors]);

  // Compute 1:1 pinning state taking into account hostiles, Draco ancient immunity, and step progression (Bugs 58, 62, 63)
  const pinningState = useMemo(() => {
    return computePinningState(movePlanningState, activePlayer.id, plannedMoves);
  }, [movePlanningState, activePlayer.id, plannedMoves]);

  const isShipPinned = (shipId: string): boolean => {
    return pinningState.isShipPinned(shipId);
  };

  const maxMoves = stagedRegroupBuilds && stagedRegroupBuilds.length > 0
    ? 1
    : getEffectiveMoveActivationLimit(activePlayer, activePulsarSectorId, undefined, useMidasTouchMove);

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

  // All reachable single- and multi-step move options for the active ship in the current activation
  const reachableDestinations = useMemo<ReachableMoveOption[]>(() => {
    if (!currentMoveShip || !currentSimSector) return [];
    if (activeActivationIndex >= maxMoves) return [];
    return computeReachableMoveDestinations(
      movePlanningState,
      activePlayer.id,
      currentMoveShip.id,
      plannedMoves,
      activeActivationIndex
    );
  }, [movePlanningState, activePlayer.id, currentMoveShip, currentSimSector, activeActivationIndex, maxMoves, plannedMoves]);

  const reachableExternalBySectorId = useMemo(() => {
    const map = new Map<string, ReachableMoveOption>();
    if (!currentSimSector) return map;
    for (const opt of reachableDestinations) {
      if (opt.sectorId === currentSimSector.id) continue;
      const existing = map.get(opt.sectorId);
      if (
        !existing ||
        opt.totalSteps < existing.totalSteps ||
        (opt.totalSteps === existing.totalSteps && !opt.usesJumpDrive && existing.usesJumpDrive)
      ) {
        map.set(opt.sectorId, opt);
      }
    }
    return map;
  }, [reachableDestinations, currentSimSector]);

  // Destinations reachable from the ship's current simulated sector via 1 or more steps
  const connectedDestinations = useMemo(() => {
    return Array.from(reachableExternalBySectorId.keys())
      .map((id) => movePlanningState.sectors.find((s) => s.id === id))
      .filter((s): s is SectorTile => Boolean(s));
  }, [reachableExternalBySectorId, movePlanningState.sectors]);

  const handleAddMoveDestination = (destSectorId: string, targetSubsector?: 1 | 2 | 3) => {
    if (!currentMoveShip || !currentSimSector) return;
    if (activeActivationIndex >= maxMoves) return;
    if (currentShipMaxSteps <= 0) return;
    if (isShipPinned(currentMoveShip.id)) return;
    if (currentActivationMoves.length > 0 && currentActivationMoves[0].shipId !== currentMoveShip.id) return;
    if (currentActivationMoves.length >= currentShipMaxSteps) return;

    const chosenOption =
      targetSubsector !== undefined
        ? reachableDestinations.find(
            (opt) => opt.sectorId === destSectorId && opt.targetSubsector === targetSubsector
          )
        : reachableExternalBySectorId.get(destSectorId);

    if (!chosenOption || chosenOption.steps.length === 0) return;

    const baseStepNumber = currentActivationMoves.length;
    const timestamp = Date.now();
    const newMoves: PlannedMove[] = chosenOption.steps.map((step, idx) => {
      const fromSec = movePlanningState.sectors.find((s) => s.id === step.fromSectorId);
      const toSec = movePlanningState.sectors.find((s) => s.id === step.toSectorId);
      const prevSub =
        idx === 0
          ? (currentSimSector.isNebula ? currentSimSubsector : undefined)
          : (fromSec?.isNebula ? chosenOption.steps[idx - 1]!.targetSubsector : undefined);

      return {
        id: `move_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        shipId: currentMoveShip.id,
        shipType: currentMoveShip.type,
        fromSectorId: step.fromSectorId,
        fromSectorNumber: fromSec?.sectorNumber ?? 0,
        fromSubsector: fromSec?.isNebula ? prevSub : undefined,
        toSectorId: step.toSectorId,
        toSectorNumber: toSec?.sectorNumber ?? 0,
        activationIndex: activeActivationIndex,
        stepInActivation: baseStepNumber + idx + 1,
        driveSpeed: currentShipMaxSteps,
        targetSubsector: step.targetSubsector,
      };
    });

    const nextPlannedMoves = [...plannedMoves, ...newMoves];
    setPlannedMoves(nextPlannedMoves);

    // Pinning, Black Hole, or speed limit check at final destination
    const nextPinningState = computePinningState(movePlanningState, activePlayer.id, nextPlannedMoves);
    const isPinnedInDest = nextPinningState.isShipPinned(currentMoveShip.id);
    const finalStep = newMoves[newMoves.length - 1]!;
    const finalDestSec = movePlanningState.sectors.find((s) => s.id === finalStep.toSectorId);
    const isBlackHoleTerminated = Boolean(finalDestSec?.isBlackHole && finalDestSec.id !== finalStep.fromSectorId);
    const totalStepsUsed = baseStepNumber + newMoves.length;

    if (isPinnedInDest || isBlackHoleTerminated || totalStepsUsed >= currentShipMaxSteps) {
      const nextActIdx = activeActivationIndex + 1;
      setActiveActivationIndex(nextActIdx);
      // Auto-select next unpinned movable ship only if additional activations remain
      if (nextActIdx < maxMoves) {
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
    }
  };

  const handleFinishCurrentActivation = () => {
    if (currentActivationMoves.length > 0) {
      setActiveActivationIndex((prev) => prev + 1);
    }
  };

  const handleSelectMoveShipId = (shipId: string) => {
    if (shipId === selectedMoveShipId) return;
    if (activeActivationIndex >= maxMoves) return;
    if (currentActivationMoves.length > 0) {
      if (activeActivationIndex + 1 >= maxMoves) {
        return;
      }
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
    items: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith'; upgradeFromShipId?: string }[],
    pulsarSectorId?: string,
    useMidasTouch?: boolean
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (isRaidBuildStep) {
      if (items.length !== 1) {
        showToast('Select 1 item to build or skip Raid Build to proceed to Move.');
        return;
      }
      const item = items[0]!;
      const raidCheck = validateBuildItems(state, activePlayer, [item]);
      if (!raidCheck.valid) {
        showToast(raidCheck.error || 'Raid build selection is invalid.');
        return;
      }
      const createdShipId =
        !item.upgradeFromShipId && item.itemType !== 'orbital' && item.itemType !== 'monolith'
          ? `ship_${activePlayer.id}_raid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
          : item.itemType === 'orbital' && activePlayer.faction.id === 'the_exiles'
            ? `ship_${activePlayer.id}_orbital_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
            : undefined;
      setStagedRaidBuild({ ...item, createdShipId });
      setIsBuildOpen(false);
      setIsRaidBuildStep(false);
      setIsMoveOpen(true);
      return;
    }
    if (isRegroupBuildStep) {
      if (!items || items.length === 0) {
        showToast('Select at least 1 item to build.');
        return;
      }
      const timestamp = Date.now();
      const preparedItems = items.map((item, idx) => {
        const createdShipId =
          !item.upgradeFromShipId && item.itemType !== 'orbital' && item.itemType !== 'monolith'
            ? `ship_${activePlayer.id}_regroup_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 4)}`
            : item.itemType === 'orbital' && activePlayer.faction.id === 'the_exiles'
              ? `ship_${activePlayer.id}_orbital_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 4)}`
              : undefined;
        return { ...item, createdShipId };
      });
      const buildCheck = validateBuildItems(state, activePlayer, preparedItems);
      if (!buildCheck.valid) {
        showToast(buildCheck.error || 'Regroup build selection is invalid.');
        return;
      }
      setStagedRegroupBuilds(preparedItems);
      setIsBuildOpen(false);
      setIsRegroupBuildStep(false);
      setIsMoveOpen(true);
      return;
    }
    const effectivePulsarId = pulsarSectorId || activePulsarSectorId || undefined;
    const res = executeAction(state, {
      type: 'BUILD',
      playerId: activePlayer.id,
      items,
      pulsarSectorId: effectivePulsarId,
      useMidasTouch,
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

  const handleSkipRaidBuild = () => {
    setStagedRaidBuild(null);
    setIsBuildOpen(false);
    setIsRaidBuildStep(false);
    setIsMoveOpen(true);
  };

  const handleSkipRegroupMove = () => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (!stagedRegroupBuilds || stagedRegroupBuilds.length === 0) {
      setIsMoveOpen(false);
      return;
    }
    const res = executeAction(state, {
      type: 'BUILD',
      playerId: activePlayer.id,
      items: stagedRegroupBuilds,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsMoveOpen(false);
      setUseMidasTouchMove(false);
      setStagedRegroupBuilds(null);
      setActivePulsarSectorId(null);
    } else {
      showToast(res.error || 'Construction failed.');
    }
  };

  // Move flow
  const handleMove = (
    moves: MoveStepPayload[],
    pulsarSectorId?: string,
    useMidasTouch?: boolean,
    raidBuild?: { sectorId: string; itemType: ShipType | 'orbital' | 'monolith'; upgradeFromShipId?: string; createdShipId?: string }
  ) => {
    if (!canActForPlayer(activePlayer.id)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    if (stagedRegroupBuilds && stagedRegroupBuilds.length > 0) {
      const res = executeAction(state, {
        type: 'BUILD',
        playerId: activePlayer.id,
        items: stagedRegroupBuilds,
        regroupMoves: moves,
        requireConfirmation: true,
      });
      if (res.success) {
        setState(res.newState);
        setIsMoveOpen(false);
        setUseMidasTouchMove(false);
        setStagedRegroupBuilds(null);
        setActivePulsarSectorId(null);
      } else {
        showToast(res.error || 'Build + Regroup maneuver failed.');
      }
      return;
    }
    const effectivePulsarId = pulsarSectorId || activePulsarSectorId || undefined;
    const effectiveRaidBuild = raidBuild ?? stagedRaidBuild ?? undefined;
    const res = executeAction(state, {
      type: 'MOVE',
      playerId: activePlayer.id,
      moves,
      pulsarSectorId: effectivePulsarId,
      useMidasTouch: useMidasTouch ?? (useMidasTouchMove || undefined),
      raidBuild: effectiveRaidBuild,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      setIsMoveOpen(false);
      setUseMidasTouchMove(false);
      setStagedRaidBuild(null);
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
    const targetSector = state.sectors.find((s) => s.id === sectorId);
    const targetPlayerId = targetSector?.discOwner || effectiveColonizingPlayer.id;
    if (!canActForPlayer(targetPlayerId)) {
      showToast(l('Spectators cannot perform actions.', '观战者无法执行操作。'));
      return;
    }
    const res = executeAction(state, {
      type: 'COLONIZE',
      playerId: targetPlayerId,
      sectorId,
      planetIndex,
      chosenResource,
    });
    if (res.success) {
      setState(res.newState);
      saveGameState(res.newState);
    } else {
      showToast(res.error || l('Colonization failed.', '殖民失败。'));
    }
  };

  // Ready for Upkeep flow (Bug 249: pre-upkeep colonization window)
  const handleReadyForUpkeep = (targetPlayerId?: string) => {
    const pId = targetPlayerId || effectiveColonizingPlayer.id;
    if (!pId || !canActForPlayer(pId)) {
      showToast(l('Spectators cannot perform actions.', '观战者无法执行操作。'));
      return;
    }
    const res = executeAction(state, {
      type: 'READY_FOR_UPKEEP',
      playerId: pId,
    });
    if (res.success) {
      setState(res.newState);
      saveGameState(res.newState);
    } else {
      showToast(res.error || l('Failed to ready for upkeep.', '确认进入维护阶段失败。'));
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
      showToast(l('Cannot change auto-pass settings for this player.', '无法修改该玩家的自动跳过设置。'));
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
      const updatedTarget = res.newState.players.find((p) => p.id === pId);
      if (newSetting && !updatedTarget?.autoPassReactions) {
        showToast(
          l(
            '⚠️ Auto-pass cannot be activated: enemy fleet invasion detected!',
            '⚠️ 检测到敌军入侵，无法开启自动跳过反应！'
          )
        );
      } else {
        showToast(
          l(
            `Auto-Pass Reactions ${newSetting ? 'ENABLED' : 'DISABLED'} for ${targetPlayer.name}.`,
            `已为 ${targetPlayer.name} ${newSetting ? '开启' : '关闭'}自动跳过反应。`
          )
        );
      }
    } else {
      showToast(res.error || l('Failed to update auto-pass.', '更新自动跳过设置失败。'));
    }
  };

  const handleTogglePassInAdvance = (targetPlayerId?: string) => {
    const pId = targetPlayerId || (typeof currentSeat === 'number' ? state.players[currentSeat]?.id : activePlayer.id);
    if (!pId || !canActForPlayer(pId)) {
      showToast(l('Cannot change Pass in Advance settings for this player.', '无法修改该玩家的预先跳过设置。'));
      return;
    }
    const targetPlayer = state.players.find((p) => p.id === pId);
    if (!targetPlayer) return;

    const newSetting = !targetPlayer.passInAdvance;
    const res = executeAction(state, {
      type: 'SET_PASS_IN_ADVANCE',
      playerId: pId,
      enabled: newSetting,
    });
    if (res.success) {
      setState(res.newState);
      showToast(
        newSetting
          ? l(
              `Pass in Advance enabled for ${targetPlayer.name} (will pass automatically when your turn arrives).`,
              `已为 ${targetPlayer.name} 开启预先跳过（轮到你的回合时将自动跳过）。`
            )
          : l(
              `Pass in Advance cancelled for ${targetPlayer.name}.`,
              `已取消 ${targetPlayer.name} 的预先跳过。`
            )
      );
    } else {
      showToast(res.error || l('Failed to update Pass in Advance.', '更新预先跳过设置失败。'));
    }
  };

  const handleSendChatMessage = (text: string) => {
    if (!text.trim()) return;
    let senderName = currentUser?.username || currentUser?.name || 'Commander';
    let senderFactionName = 'Commander';
    let senderFactionColor = '#38bdf8';
    let senderPlayerId: string | undefined;

    if (currentSeat === 'spectator') {
      senderName = currentUser?.username || currentUser?.name || 'Spectator';
      senderFactionName = 'Spectator';
      senderFactionColor = '#94a3b8';
    } else if (typeof currentSeat === 'number' && state.players[currentSeat]) {
      const p = state.players[currentSeat];
      senderPlayerId = p.id;
      senderName = getPlayerHumanName(p, currentSeat, state.members, currentUser);
      senderFactionName = p.faction?.name || `Player ${currentSeat + 1}`;
      senderFactionColor = getFactionDisplayColor(p.color, senderFactionName);
    } else if (myControlledPlayer) {
      const pIdx = state.players.indexOf(myControlledPlayer);
      senderPlayerId = myControlledPlayer.id;
      senderName = getPlayerHumanName(myControlledPlayer, pIdx >= 0 ? pIdx : undefined, state.members, currentUser);
      senderFactionName = myControlledPlayer.faction?.name || 'Commander';
      senderFactionColor = getFactionDisplayColor(myControlledPlayer.color, senderFactionName);
    } else if (activePlayer) {
      const pIdx = state.players.indexOf(activePlayer);
      senderPlayerId = activePlayer.id;
      senderName = getPlayerHumanName(activePlayer, pIdx >= 0 ? pIdx : undefined, state.members, currentUser);
      senderFactionName = activePlayer.faction?.name || 'Commander';
      senderFactionColor = getFactionDisplayColor(activePlayer.color, senderFactionName);
    }

    const res = executeAction(state, {
      type: 'SEND_CHAT',
      playerId: senderPlayerId || state.players[0]?.id || 'player_1',
      message: text.trim(),
      senderName,
      senderFactionName,
      senderFactionColor,
    });

    if (res.success) {
      const hasRevertiblePending =
        Boolean(res.newState.pendingActionConfirmation) &&
        !res.newState.pendingDiplomacyProposal &&
        res.newState.pendingActionConfirmation!.canRevert !== false;
      if (hasRevertiblePending) {
        // Persist chat messages without exposing the unconfirmed turn action preview
        persistChatOnlyUpdate(
          res.newState.id,
          res.newState.chatMessages || [],
          Boolean(res.newState.isLocalGame)
        );
      } else {
        saveGameState(res.newState);
      }
      lastStateFingerprintRef.current = getStateFingerprint(res.newState);
      setState(res.newState);
    }
  };

  const currentSenderInfo = useMemo(() => {
    if (currentSeat === 'spectator') {
      const name = currentUser?.username || currentUser?.name || 'Spectator';
      return {
        label: `Spectator (${name})`,
        factionName: 'Spectator',
        color: '#94a3b8',
        id: undefined,
      };
    }
    const seatedPlayer = typeof currentSeat === 'number' ? state.players[currentSeat] : myControlledPlayer || activePlayer;
    if (seatedPlayer) {
      const seatIdx = state.players.indexOf(seatedPlayer);
      const humanName = getPlayerHumanName(seatedPlayer, seatIdx >= 0 ? seatIdx : undefined, state.members, currentUser);
      const factionName = seatedPlayer.faction?.name || 'Commander';
      return {
        label: `${factionName} (${humanName})`,
        factionName,
        color: getFactionDisplayColor(seatedPlayer.color, factionName),
        id: seatedPlayer.id,
      };
    }
    const name = currentUser?.username || currentUser?.name || 'Commander';
    return {
      label: `Commander (${name})`,
      factionName: 'Commander',
      color: '#38bdf8',
      id: undefined,
    };
  }, [currentSeat, currentUser, state.players, state.members, myControlledPlayer, activePlayer]);

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
      saveGameState(res.newState);
      persistTableToServer(res.newState).catch(() => {});
      setState(res.newState);
      setIsExploreMode(false);
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
      saveGameState(res.newState);
      persistTableToServer(res.newState).catch(() => {});
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
  const executeConfirmTurnAction = () => {
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
      setShowBetrayalConfirmModal(false);
      lastStateFingerprintRef.current = getStateFingerprint(res.newState);
      saveGameState(res.newState);
      persistTableToServer(res.newState).catch(() => {});
      setState(res.newState);
      if (
        res.newState.pendingAmbassadorCubeReturns?.some(
          (r) => r.playerId === state.pendingActionConfirmation?.playerId
        )
      ) {
        showToast('Move confirmed & alliance broken! Choose which population track gets your cube.');
      } else {
        showToast('Action confirmed and turn passed.');
      }
    } else {
      showToast(res.error || 'Failed to confirm action.');
    }
  };

  const handleConfirmTurnAction = () => {
    if (!state.pendingActionConfirmation) return;
    if (!canActForPlayer(state.pendingActionConfirmation.playerId)) {
      showToast('Spectators cannot confirm actions.');
      return;
    }
    if (
      state.pendingActionConfirmation.betrayalAllyIds &&
      state.pendingActionConfirmation.betrayalAllyIds.length > 0
    ) {
      setShowBetrayalConfirmModal(true);
      return;
    }
    executeConfirmTurnAction();
  };

  const activePendingCubeReturn = React.useMemo(() => {
    const list = state.pendingAmbassadorCubeReturns;
    if (!list || list.length === 0 || currentSeat === 'spectator') return null;
    if (typeof currentSeat === 'number' && state.players[currentSeat]) {
      return list.find((r) => r.playerId === state.players[currentSeat]!.id) || null;
    }
    return list[0] || null;
  }, [state.pendingAmbassadorCubeReturns, currentSeat, state.players]);

  const handleReturnAmbassadorCube = (
    formerAllyId: string,
    resource: 'money' | 'science' | 'material'
  ) => {
    if (!activePendingCubeReturn) return;
    if (!canActForPlayer(activePendingCubeReturn.playerId)) {
      showToast('Only the owning commander can choose where to return this population cube.');
      return;
    }
    const res = executeAction(state, {
      type: 'RETURN_AMBASSADOR_CUBE',
      playerId: activePendingCubeReturn.playerId,
      formerAllyId,
      resource,
    });
    if (res.success) {
      lastStateFingerprintRef.current = getStateFingerprint(res.newState);
      saveGameState(res.newState);
      persistTableToServer(res.newState).catch(() => {});
      setState(res.newState);
      showToast(`Ambassador cube returned to ${resource.toUpperCase()} track!`);
    } else {
      showToast(res.error || 'Failed to return Ambassador cube.');
    }
  };

  const handleRevertTurnAction = () => {
    setShowBetrayalConfirmModal(false);
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
      persistTableToServer(res.newState).catch(() => {});
      setState(res.newState);
      if (res.newState.pendingDiscovery) {
        showToast('Reverted to discovery tile decision.');
      } else if (res.newState.pendingExplore) {
        showToast('Exploration reverted to tile decision.');
      } else {
        showToast('Action reverted.');
      }
    } else {
      showToast(res.error || 'Failed to revert action.');
    }
  };

  // Discovery choice flow (Step 1: Resolve Discovery Tile)
  const handleDiscoveryChoice = (
    keepForVictoryPoints: boolean,
    equipShipType?: ShipType,
    equipSlotIndex?: number,
    chosenTechId?: string,
    colonizeOrbitalResource?: 'money' | 'science',
    chosenResource?: 'money' | 'science' | 'material',
    chosenDiscoveryId?: string
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
      chosenDiscoveryId,
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

  // Explore Sector Control flow (Step 2: Separate window to decide sector control)
  const handleExploreControl = (claimInfluence: boolean) => {
    if (!state.pendingExploreControl) return;
    if (!canActForPlayer(state.pendingExploreControl.playerId)) {
      showToast('It is not your turn to decide sector control!');
      return;
    }
    const res = executeAction(state, {
      type: 'EXPLORE_CONTROL',
      playerId: state.pendingExploreControl.playerId,
      sectorId: state.pendingExploreControl.sectorId,
      claimInfluence,
      requireConfirmation: true,
    });
    if (res.success) {
      setState(res.newState);
      if (res.newState.pendingExploreActivations && res.newState.pendingExploreActivations > 0) {
        setIsExploreMode(true);
        const prefix =
          activePlayer.faction.id === 'legion_of_midas'
            ? '🪙 Midas Touch'
            : '🌿 Planta Expansion';
        showToast(
          claimInfluence
            ? `Influence Disc placed! ${prefix}: 1 Explore Activation remaining — select an adjacent hex on the map.`
            : `Sector left uncontrolled. ${prefix}: 1 Explore Activation remaining — select an adjacent hex on the map.`
        );
      } else if (claimInfluence) {
        showToast('Influence Disc placed on sector!');
      } else {
        showToast('Sector left uncontrolled.');
      }
    } else {
      showToast(res.error || 'Failed to resolve sector control.');
    }
  };

  // Influence flow (Claim / Abandon sector control)
  const handleExecuteInfluence = (
    claimSectors: string[],
    abandonSectors: string[],
    abandonReturnTrack?: Record<string, 'money' | 'science' | 'material'>,
    useMidasTouch?: boolean
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
      useMidasTouch,
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
        const scopedSec =
          sec.isNebula && state.activeCombat.subsector
            ? { ...sec, ships: sec.ships.filter((s) => (s.subsector ?? 1) === state.activeCombat!.subsector) }
            : sec;
        const units = buildCombatUnitsForSector(
          scopedSec,
          state.players,
          state.activeCombat.participatingPlayerIds,
          state.neutralShipBlueprints,
          state.expansions,
          state.activeCombat.spiralShiftModes
        );
        const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(scopedSec, state.players);
        const aliveUnits = sortUnitsByInitiative(
          units.filter((u) => u.currentDamage < u.maxHull),
          defenderId
        );
        const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
        const activeGroup = getActiveCombatGroup(state.activeCombat, groups);
        if (activeGroup && activeGroup.ownerId.startsWith('player_')) {
          commandingPlayerId = activeGroup.ownerId;
        }
      }
    }

    if (!commandingPlayerId) {
      if (typeof currentSeat === 'number' && state.players[currentSeat]) {
        commandingPlayerId = state.players[currentSeat].id;
      } else if (!activePlayer.isBot) {
        commandingPlayerId = activePlayer.id;
      } else {
        const humanCombatantId = (state.activeCombat.participatingPlayerIds || []).find((id) => {
          const pl = state.players.find((p) => p.id === id);
          return Boolean(pl && !pl.isBot);
        });
        commandingPlayerId =
          humanCombatantId || state.players.find((p) => !p.isBot)?.id || activePlayer.id;
      }
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

  // Remnants of Ra Starting Artifact [A] Population Cube Selection (Power of the Ancients)
  const handleChooseRaArtifactCube = (resource: 'money' | 'science' | 'material') => {
    if (!state.pendingRaArtifactSetup) return;
    if (!canActForPlayer(state.pendingRaArtifactSetup.playerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CHOOSE_RA_ARTIFACT_CUBE',
      playerId: state.pendingRaArtifactSetup.playerId,
      resource,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Osiris Seth [A] Artifact slot populated with a ${resource.toUpperCase()} cube.`);
    } else {
      showToast(res.error || 'Failed to place starting Artifact population cube.');
    }
  };

  // The Spiral Starting Cheapest Tech Selection (Mind)
  const handleChooseSpiralStartingTech = (techId: string) => {
    if (!state.pendingSpiralTechSetup) return;
    if (!canActForPlayer(state.pendingSpiralTechSetup.playerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CHOOSE_SPIRAL_STARTING_TECH',
      playerId: state.pendingSpiralTechSetup.playerId,
      techId,
    });
    if (res.success) {
      setState(res.newState);
      showToast('Selected starting technology for The Spiral.');
    } else {
      showToast(res.error || 'Failed to select starting technology.');
    }
  };

  // Legion of Midas Starting Gray/Wild Cube Selection
  const handleChooseMidasStartingCube = (resource: 'money' | 'science' | 'material') => {
    if (!state.pendingMidasStartingCubeSetup) return;
    if (!canActForPlayer(state.pendingMidasStartingCubeSetup.playerId)) {
      showToast('Spectators cannot perform actions.');
      return;
    }
    const res = executeAction(state, {
      type: 'CHOOSE_MIDAS_STARTING_CUBE',
      playerId: state.pendingMidasStartingCubeSetup.playerId,
      resource,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Sector 277 Gray planet populated with a ${resource.toUpperCase()} cube.`);
    } else {
      showToast(res.error || 'Failed to place starting Gray population cube.');
    }
  };

  // The Spiral Shift Port Pre-Combat Configuration (Body)
  const handleConfigureSpiralShiftPort = (
    sectorId: string,
    choices: Partial<Record<ShipType, ShiftPortMode>>,
    targetPlayerId?: string
  ) => {
    if (isSpectator || !state.activeCombat) return;
    const playerId = targetPlayerId || getPendingSpiralShiftPlayerId(state.players, state.sectors.find((s) => s.id === sectorId)!, state.activeCombat);
    if (!playerId) return;
    if (!canActForPlayer(playerId)) {
      showToast('Only The Spiral commander can configure Shift Ports.');
      return;
    }
    const res = executeAction(state, {
      type: 'CONFIGURE_SPIRAL_SHIFT_PORT',
      playerId,
      sectorId,
      choices,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to configure Shift Ports.');
    }
  };

  // Auto-Resolve Combat (per-player opt-in; finishes full battle when PvE or when all human combatants enable it)
  const handleAutoResolveCombat = (targetPlayerId?: string) => {
    if (isSpectator) {
      showToast('Spectators cannot auto-resolve combat.');
      return;
    }
    if (!state.activeCombat) return;

    let actorId = targetPlayerId;
    if (!actorId) {
      if (typeof currentSeat === 'number' && state.players[currentSeat]) {
        actorId = state.players[currentSeat]!.id;
      } else {
        const autoIds = state.activeCombat.autoResolvePlayerIds || [];
        if (state.activeCombat.pendingDamageAssignment) {
          actorId = state.activeCombat.pendingDamageAssignment.attackerOwnerId;
        } else {
          const sec = state.sectors.find((s) => s.id === state.activeCombat!.sectorId);
          if (sec) {
            const units = buildCombatUnitsForSector(
              sec,
              state.players,
              state.activeCombat.participatingPlayerIds,
              state.neutralShipBlueprints,
              state.expansions,
              state.activeCombat.spiralShiftModes
            );
            const defenderId = state.activeCombat.defenderOwnerId || getSectorDefenderOwnerId(sec, state.players);
            const aliveUnits = sortUnitsByInitiative(
              units.filter((u) => u.currentDamage < u.maxHull),
              defenderId
            );
            const groups = getCombatShipTypeGroups(aliveUnits, defenderId);
            const activeGroup = getActiveCombatGroup(state.activeCombat, groups);
            if (activeGroup && activeGroup.ownerId.startsWith('player_')) {
              actorId = activeGroup.ownerId;
            }
          }
          if (!actorId) {
            const humanParticipants = (state.activeCombat.participatingPlayerIds || []).filter((id) =>
              state.players.some((p) => p.id === id && !p.isBot)
            );
            const fallbackParticipants = (state.activeCombat.participatingPlayerIds || []).filter((id) =>
              state.players.some((p) => p.id === id)
            );
            const pool = humanParticipants.length > 0 ? humanParticipants : fallbackParticipants;
            actorId =
              pool.find((id) => !autoIds.includes(id)) ||
              pool[0] ||
              (!activePlayer.isBot ? activePlayer.id : state.players.find((p) => !p.isBot)?.id) ||
              activePlayer.id;
          }
        }
      }
    }

    const currentlyEnabled = Boolean(state.activeCombat.autoResolvePlayerIds?.includes(actorId));
    const res = executeAction(state, {
      type: 'SET_COMBAT_AUTO_RESOLVE',
      playerId: actorId,
      enabled: !currentlyEnabled,
      sectorId: state.activeCombat.sectorId,
    });
    if (!res.success) {
      if (res.error) showToast(res.error);
      return;
    }
    setState(res.newState);
    if (!res.newState.activeCombat) {
      showToast('Combat engagement auto-resolved.');
    } else {
      const actorName = state.players.find((p) => p.id === actorId)?.name || 'Commander';
      showToast(
        !currentlyEnabled
          ? `${actorName}: Auto-Resolve ON.`
          : `${actorName}: Auto-Resolve OFF.`
      );
    }
  };

  const handleRerollBombardmentDie = (rollIndex: number) => {
    if (!state.pendingCombatConquest) return;
    if (!canActForPlayer(state.pendingCombatConquest.winnerPlayerId)) {
      showToast('Spectators cannot reroll bombardment dice.');
      return;
    }
    const res = executeAction(state, {
      type: 'REROLL_BOMBARDMENT_DIE',
      playerId: state.pendingCombatConquest.winnerPlayerId,
      sectorId: state.pendingCombatConquest.sectorId,
      rollIndex,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to reroll bombardment die.');
    }
  };

  const handleConfirmBombardment = () => {
    if (!state.pendingCombatConquest) return;
    if (!canActForPlayer(state.pendingCombatConquest.winnerPlayerId)) {
      showToast('It is not your turn to resolve bombardment!');
      return;
    }
    const res = executeAction(state, {
      type: 'CONFIRM_BOMBARDMENT',
      playerId: state.pendingCombatConquest.winnerPlayerId,
      sectorId: state.pendingCombatConquest.sectorId,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to confirm bombardment.');
    }
  };

  const handleSelectBombardmentTargets = (targetPlanetIndices: number[]) => {
    if (!state.pendingCombatConquest) return;
    if (!canActForPlayer(state.pendingCombatConquest.winnerPlayerId)) {
      showToast('Only the attacker can select bombardment targets!');
      return;
    }
    const res = executeAction(state, {
      type: 'SELECT_BOMBARDMENT_TARGETS',
      playerId: state.pendingCombatConquest.winnerPlayerId,
      sectorId: state.pendingCombatConquest.sectorId,
      targetPlanetIndices,
    });
    if (res.success) {
      setState(res.newState);
    } else {
      showToast(res.error || 'Failed to destroy selected population targets.');
    }
  };

  const handleChoosePopulationReturnTrack = (
    sectorId: string,
    planetIndex: number,
    resource: 'money' | 'science' | 'material'
  ) => {
    const entry = state.pendingPopulationReturnChoices?.find(
      (c) => c.sectorId === sectorId && c.planetIndex === planetIndex
    );
    if (!entry) return;
    if (!canActForPlayer(entry.playerId)) {
      showToast('Only the defending player can choose where to return this population cube.');
      return;
    }
    const res = executeAction(state, {
      type: 'CHOOSE_POPULATION_RETURN_TRACK',
      playerId: entry.playerId,
      sectorId,
      planetIndex,
      resource,
    });
    if (res.success) {
      setState(res.newState);
      showToast(`Destroyed cube placed in ${resource.toUpperCase()} Casualty Slot.`);
    } else {
      showToast(res.error || 'Failed to choose population return track.');
    }
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

  // Candidate tile(s) from persisted state.pendingExplore
  const candidateTile = React.useMemo(() => {
    if (!state.pendingExplore) return null;
    return state.pendingExplore.tile || null;
  }, [state.pendingExplore]);

  const candidateTiles = React.useMemo(() => {
    if (!state.pendingExplore?.tiles || state.pendingExplore.tiles.length < 2) return undefined;
    return state.pendingExplore.tiles;
  }, [state.pendingExplore]);

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

  const isTableWaitingForPlayers = React.useMemo(() => {
    if (!inGame || !state || !state.players) return false;
    if (state.phase === 'GAME_OVER') return false;
    if ((state as any).isLocalGame) return false;
    if ((state as any).isGameStarted === false) return true;
    if ((state as any).isGameStarted === true) return false;
    if (state.round > 1 || ((state as any).replaySteps && (state as any).replaySteps.length > 1)) {
      return false;
    }
    const occupied = getTableOccupiedSeats(state as any);
    return occupied.size < state.players.length;
  }, [inGame, state, state?.members, state?.players?.length, (state as any)?.isGameStarted, (state as any)?.isLocalGame, state?.phase, state?.round]);

  const applyWaitingRoomAutoSeat = (user: UserSession, preferredSeat?: number | null) => {
    if (!inGame || !isTableWaitingForPlayers || state.isLocalGame || !state.id) return;
    if (!user || user.role === 'guest') return;
    const autoSeat = resolveInviteSeatForUser(state, user, preferredSeat);
    inviteLinkPendingRef.current = null;
    if (autoSeat !== currentSeat) {
      setCurrentSeat(autoSeat);
      if (typeof autoSeat === 'number' && state.players[autoSeat]) {
        setSelectedViewIndex(autoSeat);
        showToast(l(`Seated in Seat ${autoSeat + 1}!`, `已自动入座 ${autoSeat + 1} 号位！`));
      } else if (autoSeat === 'spectator') {
        showToast(l('All seats are currently taken. Joined as Spectator.', '所有席位已满，当前以观战身份加入。'));
      }
      if (typeof window !== 'undefined') {
        const seatParam = autoSeat === 'all' ? '' : autoSeat === 'spectator' ? '&seat=spectator' : `&seat=${autoSeat}`;
        window.history.replaceState({}, '', `${window.location.pathname}?table=${state.id}${seatParam}`);
      }
    }
  };

  // Invite link to waiting room: auto-prompt login for guests, and auto-seat once authenticated
  useEffect(() => {
    if (!inGame || !isTableWaitingForPlayers || state.isLocalGame || !state.id) return;
    const pendingInvite = inviteLinkPendingRef.current;
    if (!pendingInvite) return;
    const matchesInvite =
      state.id === pendingInvite.tableId ||
      String((state as any).tableNumber || '') === pendingInvite.tableId;
    if (!matchesInvite) return;

    if (currentUser.role === 'guest') {
      if (promptedGuestLoginForTableRef.current !== state.id) {
        promptedGuestLoginForTableRef.current = state.id;
        setIsUserModalOpen(true);
      }
      return;
    }

    applyWaitingRoomAutoSeat(currentUser, pendingInvite.preferredSeat);
  }, [inGame, isTableWaitingForPlayers, state.id, state.isLocalGame, state.members, currentUser, currentSeat]);

  const renderUserLoginModal = () =>
    isUserModalOpen ? (
      <UserLoginModal
        currentUser={currentUser}
        defaultTab="user"
        onUserChanged={(u) => {
          setCurrentUser(u);
          setIsUserModalOpen(false);
          if (inGame && isTableWaitingForPlayers && !state.isLocalGame && u.role !== 'guest') {
            applyWaitingRoomAutoSeat(u, inviteLinkPendingRef.current?.preferredSeat);
          }
        }}
        onClose={() => setIsUserModalOpen(false)}
      />
    ) : null;

  if (!inGame) {
    return (
      <>
        <LobbyView
          onStartNewGame={handleStartNewGameFromLobby}
          onJoinTable={handleJoinTableFromLobby}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenReplay={handleOpenReplay}
          onOpenCombatSimulator={() => setIsCombatSimulatorOpen(true)}
        />
        <GalacticGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
        {isCombatSimulatorOpen && (
          <CombatSimulatorModal
            isOpen={isCombatSimulatorOpen}
            onClose={() => setIsCombatSimulatorOpen(false)}
            gameState={null}
          />
        )}
        <BugReportCornerButton onClick={() => setIsBugReportOpen(true)} />
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
          state={null}
          tableNumber={undefined}
          context="Lobby"
          currentUser={currentUser}
          onSuccess={(msg) => showToast(msg)}
        />
        {replayState && (
          <GameReplayModal
            state={replayState}
            tableNumber={replayTableNumber}
            onClose={() => setReplayState(null)}
          />
        )}
      </>
    );
  }

  if (inGame && isTableWaitingForPlayers) {
    return (
      <>
        <TableWaitingRoom
          state={state}
          currentSeat={currentSeat}
          currentUser={currentUser}
          onStartGame={() => {
            const updated = {
              ...state,
              isGameStarted: true,
            };
            saveGameState(updated);
            setState(updated);
          }}
          onClaimSeat={handleChangeSeat}
          onReturnToLobby={handleReturnToLobby}
          onCancelTable={() => {
            deleteSavedTable(state.id);
            handleReturnToLobby();
          }}
          onLeaveTable={async () => {
            const leavingMember = (state.members || []).find((m: any) => m.userId === currentUser.id);
            const mySeat = leavingMember?.seat;
            const updatedMembers = (state.members || []).filter((m: any) => m.userId !== currentUser.id);
            const updatedPlayers = state.players.map((p, idx) => {
              if (idx === mySeat) {
                return {
                  ...p,
                  name: p.faction?.name || `Player ${idx + 1}`,
                };
              }
              return p;
            });
            const updated = {
              ...state,
              members: updatedMembers,
              players: updatedPlayers,
            };
            saveGameState(updated);
            setState(updated);
            await leaveTable(state.id, currentUser.id);
            handleReturnToLobby();
          }}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenCombatSimulator={() => setIsCombatSimulatorOpen(true)}
          onUpdateState={(remoteState) => setState(remoteState)}
          onOpenLogin={() => setIsUserModalOpen(true)}
          onlineByUserId={!state.isLocalGame ? onlineByUserId : undefined}
        />
        {renderUserLoginModal()}
        <GalacticGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
        {isCombatSimulatorOpen && (
          <CombatSimulatorModal
            isOpen={isCombatSimulatorOpen}
            onClose={() => setIsCombatSimulatorOpen(false)}
            gameState={state}
          />
        )}
        <BugReportCornerButton onClick={() => setIsBugReportOpen(true)} />
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
          state={state}
          tableNumber={tableNum}
          context={`Waiting Room (Table ${tableNum})`}
          currentUser={currentUser}
          onSuccess={(msg) => showToast(msg)}
        />
        {replayState && (
          <GameReplayModal
            state={replayState}
            tableNumber={replayTableNumber}
            onClose={() => setReplayState(null)}
          />
        )}
        {errorMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl animate-bounce">
            {errorMessage}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="w-screen h-screen h-dvh min-h-dvh flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        state={state}
        selectedViewIndex={selectedViewIndex}
        onSelectActiveViewPlayer={(idx) => setSelectedViewIndex(idx)}
        onlineByUserId={!state.isLocalGame ? onlineByUserId : undefined}
        onNewGame={() => setIsNewGameOpen(true)}
        onOpenTechTray={() => setIsTechMarketOpen(true)}
        onOpenPlayerBoard={() => setIsPhysicalBoardOpen(true)}
        onOpenScoreboard={() => setIsScoreboardOpen(true)}
        onOpenTableSession={() => setIsTableSessionOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenBugReport={() => setIsBugReportOpen(true)}
        onOpenTurnOrder={() => setIsTurnOrderOpen(true)}
        onOpenMinorSpecies={() => setIsMinorSpeciesOpen(true)}
        onOpenReplay={() => handleOpenReplay()}
        onOpenCombatSimulator={() => setIsCombatSimulatorOpen(true)}
        onReturnToLobby={handleReturnToLobby}
        onSwitchTable={(tableId, seat) => handleJoinTableFromLobby(tableId, seat)}
        currentSeat={currentSeat}
        currentUser={currentUser}
        onChangeSeat={handleChangeSeat}
        onOpenManageSeats={() => setIsManageSeatsOpen(true)}
      />

      {/* Outdated Client Version Banner (shown only if mid-action deferred auto-reload or single auto-reload failed) */}
      {updateAvailableVersion && (
        <div
          data-testid="app-update-banner"
          className="bg-amber-950/95 border-b border-amber-500 px-6 py-2 flex items-center justify-between gap-3 z-50 text-xs text-amber-100"
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              {l(
                'A newer game update is live on the server. Reload to run the latest rules.',
                '服务器已发布新版本游戏代码，请刷新以使用最新规则。'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              markAutoReloadedVersion(updateAvailableVersion);
              window.location.replace(buildCacheBustedReloadUrl(window.location.href, updateAvailableVersion));
            }}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[11px] transition shrink-0 cursor-pointer"
          >
            {l('Update & Reload', '立即刷新更新')}
          </button>
        </div>
      )}

      {/* 2nd Explore Activation Banner (Planta / Legion of Midas Midas Touch) */}
      {Boolean(state.pendingExploreActivations && state.pendingExploreActivations > 0) && (() => {
        const isMidasExplore = activePlayer.faction.id === 'legion_of_midas';
        return (
          <div
            data-testid="pending-explore-activations-banner"
            className={`${
              isMidasExplore
                ? 'bg-amber-950/90 border-b border-amber-500 text-amber-200'
                : 'bg-emerald-950/90 border-b border-emerald-600 text-emerald-200'
            } px-6 py-2 flex items-center justify-between z-40 text-xs`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{isMidasExplore ? '🪙' : '🌿'}</span>
              <span className="font-bold text-white">
                {isMidasExplore ? 'Midas Touch Exploration:' : 'Planta Exploration:'}
              </span>
              <span>
                {state.pendingExploreActivations} Explore Activation{(state.pendingExploreActivations || 0) > 1 ? 's' : ''} remaining! Select an adjacent hex on the map to explore, or finish exploration.
              </span>
            </div>
            {!isTurnGated && (
              <button
                onClick={handleFinishExplore}
                className={`px-3 py-1 rounded-lg bg-slate-900 text-xs font-bold border transition-colors shadow ${
                  isMidasExplore
                    ? 'hover:bg-amber-800 text-amber-300 hover:text-white border-amber-700'
                    : 'hover:bg-emerald-800 text-emerald-300 hover:text-white border-emerald-700'
                }`}
              >
                Finish Explore
              </button>
            )}
          </div>
        );
      })()}

      {/* Main Playing Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Galaxy Hex Map */}
        <HexGalaxyMap
          state={isMoveOpen && (stagedRaidBuild || (stagedRegroupBuilds && stagedRegroupBuilds.length > 0)) ? movePlanningState : state}
          selectedSectorId={selectedSector?.id || null}
          onSelectSector={(s) => setSelectedSector(s)}
          isExploreMode={effectiveExploreMode}
          onExploreTarget={handleExploreTarget}
          onColonizePlanet={!isActionsLocked ? handleColonizePlanet : undefined}
          effectivePlayerId={effectiveColonizingPlayer.id}
          currentSeat={currentSeat}
          pendingExplore={
            canActOnPendingExplore && pendingExploreCoords && activeCandidateTile
              ? {
                  from: pendingExploreCoords.from,
                  target: pendingExploreCoords.target,
                  candidateTile: activeCandidateTile,
                  rotation: exploreRotation,
                }
              : null
          }
          onRotateExplore={(delta) => {
            if (!pendingExploreCoords || !activeCandidateTile || !sourceSector) {
              setExploreRotation((r) => ((r + delta) % 6 + 6) % 6);
              return;
            }
            const hasWormholeGen = activePlayer ? playerHasWormholeGenerator(activePlayer) : false;
            if (delta >= 0) {
              const nextRot = findNextLegalExploreRotation(
                sourceSector,
                activeCandidateTile,
                pendingExploreCoords.target,
                exploreRotation,
                hasWormholeGen,
                state.sectors,
                activePlayer?.id,
                state.warpedUniverse?.conduits
              );
              setExploreRotation(nextRot);
            } else {
              const prevRot = findPreviousLegalExploreRotation(
                sourceSector,
                activeCandidateTile,
                pendingExploreCoords.target,
                exploreRotation,
                hasWormholeGen,
                state.sectors,
                activePlayer?.id,
                state.warpedUniverse?.conduits
              );
              setExploreRotation(prevRot);
            }
          }}
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
            onOpenCombatSimulator={() => setIsCombatSimulatorOpen(true)}
            onConvertColonyShip={!isActionsLocked ? handleConvertColonyShip : undefined}
            hideOpponentReputation={hideOpponentReputation}
            allPlayers={state.players}
            traitorPlayerId={state.traitorPlayerId}
            gamePhase={state.phase}
            warpedUniverse={state.warpedUniverse}
            onInitiateDiplomacy={!isActionsLocked ? handleExchangeAmbassador : undefined}
            delayedBlackHoleShips={state.galacticEvents?.blackHoleDelayedShips}
            onOpenMinorSpecies={() => setIsMinorSpeciesOpen(true)}
            minorSpeciesSupply={state.minorSpeciesSupply}
            hasMinorSpeciesExpansion={Boolean(state.expansions?.includes('minor_species'))}
            isLocalGame={Boolean(state.isLocalGame)}
            members={state.members}
            currentUserId={currentUser?.id}
            onlineByUserId={!state.isLocalGame ? onlineByUserId : undefined}
          />
        </div>

        {/* Floating Sector Detail & Fleet Inspector (Top-Right) */}
        {selectedSector && !isInfluenceOpen && !state.pendingExploreControl && !state.pendingDiscovery && (
          <div className="absolute top-4 right-4 z-20 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin pointer-events-auto">
            <SectorInspector
              sector={state.sectors.find((s) => s.id === selectedSector.id) || selectedSector}
              players={state.players}
              activePlayer={effectiveColonizingPlayer}
              neutralShipBlueprints={state.neutralShipBlueprints}
              onColonizePlanet={!isActionsLocked ? handleColonizePlanet : undefined}
              onAbandonInfluence={!isActionsLocked ? handleAbandonInfluence : undefined}
              onClose={() => setSelectedSector(null)}
              pendingBankruptcy={state.pendingBankruptcy}
              stagedAbandonedSectorIds={stagedBankruptcySectors}
              onToggleAbandonSector={!isActionsLocked ? handleToggleAbandonSectorBankruptcy : undefined}
              onActivatePulsar={
                isMyTurn && !isActionsLocked && (state.sectors.find((s) => s.id === selectedSector.id) || selectedSector).discOwner === myPlayerId
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
              onReturnBlackHoleShip={!isActionsLocked ? (ship) => setSelectedBlackHoleShipForReturn(ship) : undefined}
            />
          </div>
        )}

        {/* Action Bar (Bottom-Center) - Hidden during pre-game Exiles/Ra setup choices, exploration, building, moving, influence, or pending diplomacy */}
        {state.phase === 'ACTION_PHASE' &&
          !hasPendingPreGameSetup &&
          !pendingExploreCoords &&
          !state.pendingDiscovery &&
          !state.pendingExploreControl &&
          !state.pendingCombatConquest &&
          !state.pendingReputationDraw &&
          !state.pendingArtifactReward &&
          !state.pendingDiplomacyProposal &&
          !isBuildOpen &&
          !isMoveOpen &&
          !isInfluenceOpen && (
          <ActionBar
            activePlayer={activePlayer}
            players={state.players}
            isExploreMode={effectiveExploreMode}
            onToggleExplore={handleToggleExplore}
            useMidasTouchExplore={useMidasTouchExplore}
            onToggleMidasTouchExplore={setUseMidasTouchExplore}
            onOpenResearch={() => setIsTechMarketOpen(true)}
            onOpenUpgrade={() => setIsBlueprintOpen(true)}
            onOpenBuild={() => {
              setIsRaidBuildStep(false);
              setStagedRaidBuild(null);
              setStagedRegroupBuilds(null);
              setIsRegroupBuildStep(isRegroupFaction(activePlayer.faction.id) && !activePlayer.hasPassed && !activePulsarSectorId);
              setIsBuildOpen(true);
            }}
            onOpenMove={() => {
              if (isRaidFaction(activePlayer.faction.id) && !activePlayer.hasPassed && !activePulsarSectorId) {
                setStagedRaidBuild(null);
                setStagedRegroupBuilds(null);
                setIsRegroupBuildStep(false);
                setIsRaidBuildStep(true);
                setBuildSlots([{ sectorId: eligibleBuildSectors[0]?.id || '', itemType: 'interceptor' }]);
                setActiveBuildSlotIndex(0);
                setIsBuildOpen(true);
              } else {
                setIsRaidBuildStep(false);
                setStagedRaidBuild(null);
                setStagedRegroupBuilds(null);
                setIsRegroupBuildStep(false);
                setIsMoveOpen(true);
              }
            }}
            onOpenInfluence={() => setIsInfluenceOpen(true)}
            onPass={handlePass}
            isTurnGated={isActionsLocked}
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
            passInAdvance={myControlledPlayer?.passInAdvance}
            onTogglePassInAdvance={() => handleTogglePassInAdvance(myControlledPlayer?.id)}
            canTogglePassInAdvance={Boolean(myControlledPlayer && canActForPlayer(myControlledPlayer.id))}
          />
        )}

        {/* Pre-Upkeep Colonization & Readiness Bar (Bottom-Center, Bug 249) */}
        {state.phase === 'UPKEEP_PHASE' && state.upkeepReadyPlayers && !state.pendingBankruptcy && (
          <div className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col md:flex-row items-center gap-2 md:gap-4 bg-slate-950/95 backdrop-blur-md p-3 md:px-6 md:py-3.5 rounded-2xl border-2 border-cyan-500/60 shadow-2xl shadow-cyan-950/50 animate-in fade-in slide-in-from-bottom-3 duration-200 w-[calc(100vw-12px)] max-w-2xl md:w-auto md:max-w-fit font-sans">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
                style={{
                  backgroundColor: `${effectiveColonizingPlayer.color}25`,
                  borderColor: effectiveColonizingPlayer.color,
                  color: effectiveColonizingPlayer.color,
                }}
              >
                <Rocket className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-300 uppercase tracking-widest font-bold">
                    {l('Upkeep Phase • Pre-Income Colonization', '维护阶段 • 收益结算前殖民')}
                  </span>
                  {currentSeat === 'all' && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm"
                      style={{
                        backgroundColor: `${effectiveColonizingPlayer.color}30`,
                        borderColor: effectiveColonizingPlayer.color,
                        color: effectiveColonizingPlayer.color,
                      }}
                    >
                      {language === 'zh' ? (
                        <>当前行动: {getPlayerDisplayName(effectiveColonizingPlayer)}</>
                      ) : (
                        <>Turn: {getPlayerDisplayName(effectiveColonizingPlayer)}</>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-300">
                  {effectiveColonizingPlayer.colonyShips.ready > 0
                    ? l(
                        `${getPlayerDisplayName(effectiveColonizingPlayer)} has ${effectiveColonizingPlayer.colonyShips.ready} ready Colony Ship(s). Click planet slots to colonize before income!`,
                        `${getPlayerDisplayName(effectiveColonizingPlayer)} 有 ${effectiveColonizingPlayer.colonyShips.ready} 艘就绪殖民船。请在收益结算前点击星图上的星球格子进行殖民！`
                      )
                    : l(
                        `${getPlayerDisplayName(effectiveColonizingPlayer)}: Click slots on map to colonize, or confirm ready for Upkeep income.`,
                        `${getPlayerDisplayName(effectiveColonizingPlayer)}：可点击星图上的格子进行殖民，或点击确认就绪以进入维护收益结算。`
                      )}
                </span>
              </div>
            </div>

            {/* In hotseat mode, show faction switcher so players can take turns or switch */}
            {currentSeat === 'all' && (
              <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-800/80 pt-2 md:pt-0 md:pl-3">
                {state.players
                  .filter((p) => !p.isEliminated)
                  .map((p) => {
                    const isReady = Boolean(state.upkeepReadyPlayers?.[p.id]);
                    const isSelected = p.id === effectiveColonizingPlayer.id;
                    const factionLabel = p.faction?.id
                      ? translateFactionName(p.faction.id, p.faction.name || p.name, language)
                      : (p.faction?.name || p.name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedViewIndex(state.players.findIndex((pl) => pl.id === p.id))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-800 text-white shadow ring-1 ring-cyan-400'
                            : isReady
                            ? 'bg-slate-900/60 text-emerald-400 border-emerald-900/40 opacity-70'
                            : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                        title={isReady ? l(`${p.name} is Ready`, `${p.name} 已就绪`) : l(`Switch turn to ${p.name}`, `切换至 ${p.name}`)}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate max-w-[80px]">{factionLabel}</span>
                        {isReady ? (
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {state.upkeepReadyPlayers[effectiveColonizingPlayer.id] ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {l('Ready', '已就绪')} ({Object.values(state.upkeepReadyPlayers).filter(Boolean).length}/{state.players.filter((p) => !p.isEliminated).length})
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReadyForUpkeep(effectiveColonizingPlayer.id)}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-950/80 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {currentSeat === 'all'
                      ? l(
                          `Ready for Upkeep (${getPlayerDisplayName(effectiveColonizingPlayer)})`,
                          `确认进入维护 (${getPlayerDisplayName(effectiveColonizingPlayer)})`
                        )
                      : l('Ready for Upkeep', '确认进入维护')}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table Text Chat & Galaxy Chronicle Drawers (Bottom-Right adaptive row) */}
        <div
          data-testid="bottom-right-drawers"
          className="fixed bottom-24 md:bottom-4 right-3.5 md:right-4 z-20 md:z-30 flex items-end gap-2 pointer-events-none"
        >
          <GameChatDrawer
            messages={state.chatMessages || []}
            onSendMessage={handleSendChatMessage}
            currentSenderLabel={currentSenderInfo.label}
            currentSenderFactionName={currentSenderInfo.factionName}
            currentSenderFactionColor={currentSenderInfo.color}
            currentSenderId={currentSenderInfo.id}
            tableId={state.id}
            tableNumber={(state as any).tableNumber || getTableNumber(state)}
            players={state.players}
            members={state.members}
            embedded
          />

          <GameLogDrawer
            logs={state.log}
            viewerPlayerId={currentSeat === 'spectator' ? undefined : myPlayerId}
            gamePhase={state.phase}
            hiddenReputationPlayerIds={state.players.filter((p) => p.isBot).map((p) => p.id)}
            embedded
          />
        </div>

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
      {state.pendingExplore && pendingExploreCoords && candidateTile && sourceSector && (
        canActOnPendingExplore ? (
          <ExploreModal
            player={state.players.find((p) => p.id === state.pendingExplore!.playerId) || activePlayer}
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
          />
        ) : (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-pulse">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              {l('Waiting for', '正在等待')}{' '}
              <strong className="text-cyan-300">
                {state.players.find((p) => p.id === state.pendingExplore!.playerId)?.name || 'Commander'}
              </strong>{' '}
              {l('to keep or discard an explored sector...', '决定保留或弃置探索星区...')}
            </span>
          </div>
        )
      )}

      {isBlueprintOpen && (
        <ShipBlueprintEditor
          player={viewedPlayer}
          activeExpansions={state.expansions}
          initialShipType={blueprintShipType}
          pulsarSectorId={activePulsarSectorId ?? undefined}
          readOnly={!canActForPlayer(viewedPlayer.id) || isActionsLocked}
          onSaveBlueprint={handleSaveBlueprint}
          onClose={() => {
            setIsBlueprintOpen(false);
            setBlueprintShipType(undefined);
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
          isRaidBuild={isRaidBuildStep}
          onSkipRaidBuild={handleSkipRaidBuild}
          isRegroupBuild={isRegroupBuildStep}
          onClose={() => {
            setIsBuildOpen(false);
            setIsRaidBuildStep(false);
            setStagedRaidBuild(null);
            setIsRegroupBuildStep(false);
            setStagedRegroupBuilds(null);
            setActivePulsarSectorId(null);
          }}
        />
      )}

      {isMoveOpen && (
        <MoveModal
          player={activePlayer}
          sectors={movePlanningState.sectors}
          playerShips={playerShips}
          simulatedShipSector={simulatedShipSector}
          connectedDestinations={connectedDestinations}
          reachableDestinations={reachableDestinations}
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
          raidBuildLabel={
            stagedRaidBuild
              ? `${stagedRaidBuild.upgradeFromShipId ? 'Field-Upgrade → ' : ''}${stagedRaidBuild.itemType.toUpperCase()} in Sector ${state.sectors.find((s) => s.id === stagedRaidBuild.sectorId)?.sectorNumber ?? stagedRaidBuild.sectorId}`
              : null
          }
          regroupBuildLabel={
            stagedRegroupBuilds && stagedRegroupBuilds.length > 0
              ? stagedRegroupBuilds
                  .map(
                    (it) =>
                      `${it.itemType.toUpperCase()} @ Sector ${state.sectors.find((s) => s.id === it.sectorId)?.sectorNumber ?? it.sectorId}`
                  )
                  .join(', ')
              : null
          }
          onSkipRegroupMove={stagedRegroupBuilds && stagedRegroupBuilds.length > 0 ? handleSkipRegroupMove : undefined}
          warpConduits={state.warpedUniverse?.conduits}
          useMidasTouch={useMidasTouchMove}
          onToggleMidasTouch={(next) => {
            setUseMidasTouchMove(next);
            if (!next) {
              const baseMax = getEffectiveMoveActivationLimit(activePlayer, activePulsarSectorId, undefined, false);
              if (plannedMoves.some((m) => m.activationIndex >= baseMax)) {
                setPlannedMoves((prev) => prev.filter((m) => m.activationIndex < baseMax));
                setActiveActivationIndex((prev) => Math.min(prev, baseMax));
              }
            }
          }}
          onClose={() => {
            setIsMoveOpen(false);
            setUseMidasTouchMove(false);
            setStagedRaidBuild(null);
            setStagedRegroupBuilds(null);
            setActivePulsarSectorId(null);
          }}
        />
      )}

      {isTradeOpen && (
        <TradeModal
          player={viewedPlayer}
          readOnly={!canActForPlayer(viewedPlayer.id) || isActionsLocked}
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
          warpConduits={state.warpedUniverse?.conduits}
        />
      )}

      {state.activeCombat && (
        <CombatModal
          state={state}
          combat={state.activeCombat}
          onStepCombat={handleStepCombat}
          onRerollDie={handleRerollCombatDie}
          onAutoResolve={handleAutoResolveCombat}
          onConfigureSpiralShiftPort={handleConfigureSpiralShiftPort}
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

      {state.pendingRaArtifactSetup &&
        !(
          state.pendingExilesOrbitalSetup &&
          canActForPlayer(state.pendingExilesOrbitalSetup.playerId) &&
          canActForPlayer(state.pendingRaArtifactSetup.playerId)
        ) && (
        canActForPlayer(state.pendingRaArtifactSetup.playerId) ? (
          <RaArtifactSetupModal
            player={
              state.players.find((p) => p.id === state.pendingRaArtifactSetup!.playerId) ||
              activePlayer
            }
            onChooseCube={handleChooseRaArtifactCube}
          />
        ) : (
          <div className={`fixed ${state.pendingExilesOrbitalSetup && !canActForPlayer(state.pendingExilesOrbitalSetup.playerId) ? 'bottom-32' : 'bottom-20'} left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-pink-700/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span>
              Commander{' '}
              <strong className="text-pink-300">
                {state.players.find((p) => p.id === state.pendingRaArtifactSetup!.playerId)?.name || 'Remnants of Ra'}
              </strong>{' '}
              is choosing starting [A] Artifact population cube...
            </span>
          </div>
        )
      )}

      {state.pendingSpiralTechSetup &&
        !(
          (state.pendingExilesOrbitalSetup &&
            canActForPlayer(state.pendingExilesOrbitalSetup.playerId) &&
            canActForPlayer(state.pendingSpiralTechSetup.playerId)) ||
          (state.pendingRaArtifactSetup &&
            canActForPlayer(state.pendingRaArtifactSetup.playerId) &&
            canActForPlayer(state.pendingSpiralTechSetup.playerId))
        ) && (
        canActForPlayer(state.pendingSpiralTechSetup.playerId) ? (
          <SpiralStartingTechModal
            player={
              state.players.find((p) => p.id === state.pendingSpiralTechSetup!.playerId) ||
              activePlayer
            }
            techSupply={state.techSupply}
            onChooseTech={handleChooseSpiralStartingTech}
          />
        ) : (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-sky-600/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>
              Commander{' '}
              <strong className="text-sky-300">
                {state.players.find((p) => p.id === state.pendingSpiralTechSetup!.playerId)?.name || 'The Spiral'}
              </strong>{' '}
              is choosing starting cheapest Technology Tile...
            </span>
          </div>
        )
      )}

      {state.pendingMidasStartingCubeSetup &&
        !(
          (state.pendingExilesOrbitalSetup &&
            canActForPlayer(state.pendingExilesOrbitalSetup.playerId) &&
            canActForPlayer(state.pendingMidasStartingCubeSetup.playerId)) ||
          (state.pendingRaArtifactSetup &&
            canActForPlayer(state.pendingRaArtifactSetup.playerId) &&
            canActForPlayer(state.pendingMidasStartingCubeSetup.playerId)) ||
          (state.pendingSpiralTechSetup &&
            canActForPlayer(state.pendingSpiralTechSetup.playerId) &&
            canActForPlayer(state.pendingMidasStartingCubeSetup.playerId))
        ) && (
        canActForPlayer(state.pendingMidasStartingCubeSetup.playerId) ? (
          <MidasStartingCubeModal
            player={
              state.players.find((p) => p.id === state.pendingMidasStartingCubeSetup!.playerId) ||
              activePlayer
            }
            onChooseCube={handleChooseMidasStartingCube}
          />
        ) : (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-600/80 px-4 py-2 rounded-xl text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Commander{' '}
              <strong className="text-amber-300">
                {state.players.find((p) => p.id === state.pendingMidasStartingCubeSetup!.playerId)?.name || 'Legion of Midas'}
              </strong>{' '}
              is choosing starting Gray planet population cube...
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
        canActForPlayer(state.pendingCombatConquest.winnerPlayerId) ? (
          <CombatConquestModal
            state={state}
            conquest={state.pendingCombatConquest}
            currentSeat={currentSeat}
            onConfirm={handleCombatConquest}
            onRerollBombardmentDie={handleRerollBombardmentDie}
            onConfirmBombardment={handleConfirmBombardment}
            onSelectBombardmentTargets={handleSelectBombardmentTargets}
          />
        ) : (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-bounce">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              Waiting for{' '}
              <strong className="text-indigo-300">
                {state.players.find((p) => p.id === state.pendingCombatConquest!.winnerPlayerId)?.name || 'Commander'}
              </strong>{' '}
              to decide whether to control Sector {state.sectors.find((s) => s.id === state.pendingCombatConquest!.sectorId)?.sectorNumber || state.pendingCombatConquest.sectorId}...
            </span>
          </div>
        )
      )}

      {!state.pendingReputationDraw &&
        !state.pendingCombatConquest &&
        !state.pendingDiscovery &&
        state.pendingPopulationReturnChoices &&
        state.pendingPopulationReturnChoices.length > 0 && (() => {
          const pendingPop = state.pendingPopulationReturnChoices![0]!;
          const targetPlayer = state.players.find((p) => p.id === pendingPop.playerId);
          if (!targetPlayer) return null;
          return canActForPlayer(pendingPop.playerId) ? (
            <ReturnDestroyedPopulationModal
              player={targetPlayer}
              pending={pendingPop}
              remainingCount={state.pendingPopulationReturnChoices!.length}
              onConfirm={handleChoosePopulationReturnTrack}
            />
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-purple-500/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur text-sm text-slate-200 pointer-events-none animate-bounce">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              <span>
                Waiting for <strong className="text-purple-300">{targetPlayer.name}</strong> to choose which Population Track receives their destroyed{' '}
                {pendingPop.isOrbital ? 'Orbital' : 'Wild'} cube from Sector {pendingPop.sectorNumber}...
              </span>
            </div>
          );
        })()}

      {!state.pendingReputationDraw && !state.pendingCombatConquest && state.pendingDiscovery && (
        canActForPlayer(state.pendingDiscovery.playerId) ? (
          <DiscoveryChoiceModal
            discovery={state.pendingDiscovery.discovery}
            discoveryOptions={state.pendingDiscovery.discoveryOptions}
            player={
              state.players.find((p) => p.id === state.pendingDiscovery!.playerId) ||
              activePlayer
            }
            techSupply={state.techSupply}
            sectors={state.sectors}
            sectorId={state.pendingDiscovery.sectorId}
            fromExplore={state.pendingDiscovery.fromExplore}
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

      {/* Step 2 of Explore with Discovery: Separate Window for Sector Control Decision */}
      {!state.pendingReputationDraw && !state.pendingCombatConquest && !state.pendingDiscovery && state.pendingExploreControl && (
        <ExploreSectorControlModal
          state={state}
          pendingControl={state.pendingExploreControl}
          currentSeat={currentSeat}
          onConfirm={handleExploreControl}
        />
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
                {l('Treasury Deficit Resolution (Upkeep Phase)', '国库赤字结算（维护阶段）')}
              </div>
              <div className="text-xs text-slate-300">
                {language === 'zh' ? (
                  <>
                    正在等待 <strong className="text-white">{state.players.find((p) => p.id === state.pendingBankruptcy!.playerId)?.name || '玩家'}</strong> 处理国库赤字（{state.pendingBankruptcy.deficit} 信用点）...
                  </>
                ) : (
                  <>
                    Waiting for <strong className="text-white">{state.players.find((p) => p.id === state.pendingBankruptcy!.playerId)?.name || 'Player'}</strong> to resolve treasury deficit ({state.pendingBankruptcy.deficit} Credits)...
                  </>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {state.phase === 'GAME_OVER' && (
        <GameOverModal
          state={state}
          onExitToLobby={handleReturnToLobby}
          onReplayGame={() => handleOpenReplay()}
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
            setBlueprintShipType(shipType);
            setIsBlueprintOpen(true);
          }}
          onOpenTechMarket={() => {
            setIsPhysicalBoardOpen(false);
            setIsTechMarketOpen(true);
          }}
          hideOpponentReputation={hideOpponentReputation}
          traitorPlayerId={state.traitorPlayerId}
          warpedUniverse={state.warpedUniverse}
          onExchangeAmbassador={!isActionsLocked && canActForPlayer(viewedPlayer.id) ? handleExchangeAmbassador : undefined}
          onConvertColonyShip={!isActionsLocked && canActForPlayer(viewedPlayer.id) ? handleConvertColonyShip : undefined}
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
            if (loaded.isLocalGame) {
              setCurrentSeat('all');
              setSelectedViewIndex(loaded.activePlayerIndex || 0);
              return;
            }
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

      {isManageSeatsOpen && (
        <AdminManageSeatsModal
          isOpen={isManageSeatsOpen}
          onClose={() => setIsManageSeatsOpen(false)}
          state={state}
          currentUser={currentUser}
          currentSeat={currentSeat}
          onTakeSeat={(sIdx) => {
            handleChangeSeat(sIdx);
          }}
          onReassignSeat={handleAdminReassignSeat}
          onSendReminder={handleAdminSendReminder}
          onGetTurnCheckpoints={handleAdminGetTurnCheckpoints}
          onRevertTurn={handleAdminRevertTurn}
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

      {isCombatSimulatorOpen && (
        <CombatSimulatorModal
          isOpen={isCombatSimulatorOpen}
          onClose={() => setIsCombatSimulatorOpen(false)}
          gameState={state}
        />
      )}

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
        currentUser={currentUser}
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
              <div className="font-bold text-indigo-300">{l('Diplomatic Envoy Proposal', '外交使节提案')}</div>
              <div className="text-xs text-slate-300">
                {language === 'zh' ? (
                  <>
                    正在等待 <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.targetId)?.name || '目标玩家'}</strong> 回应来自 <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.initiatorId)?.name || '发起方'}</strong> 的结盟提案...
                  </>
                ) : (
                  <>
                    Waiting for <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.targetId)?.name || 'Target Player'}</strong> to respond to proposal from <strong className="text-white">{state.players.find((p) => p.id === state.pendingDiplomacyProposal!.initiatorId)?.name || 'Initiator'}</strong>...
                  </>
                )}
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

      {/* Act of Aggression / Betrayal Final Confirmation Modal */}
      <BetrayalConfirmationModal
        isOpen={Boolean(
          showBetrayalConfirmModal &&
            state.pendingActionConfirmation?.betrayalAllyIds &&
            state.pendingActionConfirmation.betrayalAllyIds.length > 0
        )}
        allies={(state.pendingActionConfirmation?.betrayalAllyIds || [])
          .map((id) => state.players.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))}
        onCancel={() => setShowBetrayalConfirmModal(false)}
        onConfirm={executeConfirmTurnAction}
      />

      {/* Returned Ambassador Cube Population Track Choice Modal */}
      {activePendingCubeReturn &&
        (() => {
          const cubeOwner = state.players.find((p) => p.id === activePendingCubeReturn.playerId);
          if (!cubeOwner || !canActForPlayer(cubeOwner.id)) return null;
          return (
            <ReturnAmbassadorCubeModal
              player={cubeOwner}
              pending={activePendingCubeReturn}
              onConfirm={handleReturnAmbassadorCube}
            />
          );
        })()}

      {/* Local AI Turn Indicator Banner */}
      {isBotActing && botPriorityPlayer && (
        <div
          data-testid="ai-thinking-banner"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 shadow-lg text-xs font-bold flex items-center gap-2 pointer-events-none"
        >
          <span className="animate-pulse">🤖</span>
          <span>
            {l(
              `${getPlayerDisplayName(botPriorityPlayer)} (AI) is thinking...`,
              `${getPlayerDisplayName(botPriorityPlayer)}（AI 托管）正在决策...`
            )}
          </span>
        </div>
      )}

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

      {replayState && (
        <GameReplayModal
          state={replayState}
          tableNumber={replayTableNumber}
          onClose={() => setReplayState(null)}
        />
      )}
      {renderUserLoginModal()}
    </div>
  );
};

export const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);
