import React, { useState, useEffect } from 'react';
import {
  listSavedTables,
  deleteSavedTable,
  fetchSavedTablesFromServer,
  SavedTableSummary,
  loadTable,
  loadTableByNumber,
  fetchTableFromServer,
  registerTableMember,
  filterTablesForUser,
  isSeatTaken,
  canUserUseHotseat,
  getTableOccupiedSeats,
  getTableStatusCategory,
  TableStatusCategory,
  isPlayerTurnAtTable,
  getSyncChannel,
  mergeTableSummaries,
  areTableSummariesEqual,
} from '../../engine/rules/persistence';
import {
  getCurrentUser,
  subscribeToUserSession,
} from '../../engine/rules/userSession';
import { UserSession } from '../../engine/types/user';
import { UserLoginModal } from '../auth/UserLoginModal';
import {
  ALL_FACTIONS,
  areFactionsConflictingColor,
  isFactionAvailable,
  getAvailableFactions,
} from '../../engine/rules/setup';
import { AVAILABLE_EXPANSIONS } from '../../engine/rules/expansions';
import { FactionInfo } from '../../engine/types/player';
import {
  Rocket,
  Users,
  Play,
  Trash2,
  Share2,
  Eye,
  Sparkles,
  Shield,
  HelpCircle,
  ExternalLink,
  PlusCircle,
  LogIn,
  BookOpen,
  Dices,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Minimize2,
  Maximize2,
  Compass,
  User,
  Lock,
  Star,
  CircleDot,
  CheckCircle2,
  UserPlus,
  Flag,
  Zap,
  History,
  ArrowLeft,
  Clock,
  ArrowRight,
  Globe,
  Bookmark,
} from 'lucide-react';
import {
  NeutralShipType,
  NeutralShipSelection,
  NeutralShipSelectionConfig,
} from '../../engine/rules/neutralShips';

interface LobbyViewProps {
  onStartNewGame: (
    playerCount: number,
    factionIds: string[],
    tableId: string,
    seat: number | 'all',
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean
  ) => void;
  onJoinTable: (tableId: string, seat: number | 'all' | 'spectator') => void;
  onOpenGallery?: () => void;
  onOpenReplay?: (tableId: string) => void;
}

export type LobbySection = 'hub' | 'create' | 'join' | 'my_games';

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartNewGame,
  onJoinTable,
  onOpenGallery,
  onOpenReplay,
}) => {
  const isSSR = typeof window === 'undefined';
  const [currentUser, setCurrentUser] = useState<UserSession>(() => getCurrentUser());
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<LobbySection>('hub');
  const [myGamesStatusFilter, setMyGamesStatusFilter] = useState<'all' | 'need_players' | 'running' | 'done'>('all');
  const [savedTables, setSavedTables] = useState<SavedTableSummary[]>(() => listSavedTables());

  useEffect(() => {
    return subscribeToUserSession((updated) => {
      setCurrentUser(updated);
      if (updated.role !== 'admin') {
        setMySeat((prev) => (prev === 'all' ? 0 : prev));
        setJoinSeat((prev) => (prev === 'all' ? 0 : prev));
      }
    });
  }, []);

  const refreshTables = async () => {
    try {
      const localTables = listSavedTables();
      const remoteTables = await fetchSavedTablesFromServer();
      const merged = mergeTableSummaries(localTables, remoteTables);
      setSavedTables((prev) => {
        if (areTableSummariesEqual(prev, merged)) {
          return prev;
        }
        return merged;
      });
    } catch (err) {
      console.warn('Failed to refresh tables in LobbyView:', err);
      const local = listSavedTables();
      setSavedTables((prev) => (areTableSummariesEqual(prev, local) ? prev : local));
    }
  };

  useEffect(() => {
    refreshTables();

    // 1. Regular interval polling to catch turn changes made on server or other devices
    const intervalId = setInterval(refreshTables, 4000);

    // 2. BroadcastChannel message listener for instant cross-tab sync
    const channel = getSyncChannel();
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'ECLIPSE_GAME_SYNC') {
        refreshTables();
      }
    };
    if (channel) {
      channel.addEventListener('message', handleBroadcast);
    }

    // 3. Storage event listener for cross-tab storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'eclipse_saved_tables' || e.key?.startsWith('galaxy-') || e.key?.startsWith('game_')) {
        refreshTables();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Tab visibility change - re-fetch when switching back to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshTables();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      if (channel) {
        channel.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser]);

  // Create Table State
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(false);
  const [customTableId, setCustomTableId] = useState<string>(() => `galaxy-${Math.floor(100 + Math.random() * 900)}`);
  const [selectedFactions, setSelectedFactions] = useState<string[]>([
    'terran_federation', // Blue
    'orion_hegemony',    // Black
    'planta',            // Green
    'mechanema',         // White
    'eridani_empire',    // Red
    'descendants_of_draco', // Yellow
  ]);
  const [mySeat, setMySeat] = useState<number | 'all'>(0);

  // Default MUST be no expansions as requested
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);

  // Default MUST be 'default' for neutral ships
  const [neutralShipSelections, setNeutralShipSelections] = useState<NeutralShipSelectionConfig>({
    ancient: 'default',
    guardian: 'default',
    gcds: 'default',
  });
  const hasRemnants = selectedExpansions.includes('remnants_of_worlds_afar');
  const availableFactions = getAvailableFactions(selectedExpansions);

  // Join Table State
  const [joinTableInput, setJoinTableInput] = useState<string>('');
  const [joinSeat, setJoinSeat] = useState<number | 'all' | 'spectator'>(0);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [copiedLinkTableId, setCopiedLinkTableId] = useState<string | null>(null);

  const [isExpansionsOpen, setIsExpansionsOpen] = useState<boolean>(true);
  const [isBlueprintsOpen, setIsBlueprintsOpen] = useState<boolean>(true);

  // Expansions Management
  const allExpansionIds = AVAILABLE_EXPANSIONS.map((e) => e.id);
  const allExpansionsSelected = allExpansionIds.length > 0 && allExpansionIds.every((id) => selectedExpansions.includes(id));

  const toggleAllExpansions = () => {
    const next = allExpansionsSelected ? [] : allExpansionIds;
    setSelectedExpansions(next);
    if (!next.includes('remnants_of_worlds_afar')) {
      setNeutralShipSelections((cur) => ({
        ancient: cur.ancient === 'expert' ? 'default' : cur.ancient,
        guardian: cur.guardian === 'expert' ? 'default' : cur.guardian,
        gcds: cur.gcds === 'expert' ? 'default' : cur.gcds,
      }));
    }

    const nextAvailable = getAvailableFactions(next);
    setSelectedFactions((currentFactions) => {
      const updated = [...currentFactions];
      for (let i = 0; i < updated.length; i++) {
        if (!isFactionAvailable(updated[i]!, next)) {
          const replacement =
            nextAvailable.find(
              (cand) =>
                !updated
                  .slice(0, playerCount)
                  .some((otherId, otherIdx) => otherIdx !== i && areFactionsConflictingColor(otherId, cand.id))
            ) || nextAvailable.find((cand) => cand.id !== updated[i]) || nextAvailable[0];
          if (replacement) {
            updated[i] = replacement.id;
          }
        }
      }
      return updated;
    });
  };

  const toggleExpansion = (id: string) => {
    setSelectedExpansions((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes('remnants_of_worlds_afar')) {
        setNeutralShipSelections((cur) => ({
          ancient: cur.ancient === 'expert' ? 'default' : cur.ancient,
          guardian: cur.guardian === 'expert' ? 'default' : cur.guardian,
          gcds: cur.gcds === 'expert' ? 'default' : cur.gcds,
        }));
      }

      const nextAvailable = getAvailableFactions(next);
      setSelectedFactions((currentFactions) => {
        const updated = [...currentFactions];
        for (let i = 0; i < updated.length; i++) {
          if (!isFactionAvailable(updated[i]!, next)) {
            const replacement =
              nextAvailable.find(
                (cand) =>
                  !updated
                    .slice(0, playerCount)
                    .some((otherId, otherIdx) => otherIdx !== i && areFactionsConflictingColor(otherId, cand.id))
              ) || nextAvailable.find((cand) => cand.id !== updated[i]) || nextAvailable[0];
            if (replacement) {
              updated[i] = replacement.id;
            }
          }
        }
        return updated;
      });

      return next;
    });
  };

  const handleFactionChange = (playerIdx: number, factionId: string) => {
    if (!availableFactions.some((f) => f.id === factionId)) return;
    setSelectedFactions((prev) => {
      const next = [...prev];
      next[playerIdx] = factionId;
      return next;
    });
  };

  const handleLaunchGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'guest') {
      alert('To start or host a game, you must first log in or register an account so you can reconnect to your table later.');
      setShowUserModal(true);
      return;
    }
    const activeFactions = selectedFactions.slice(0, playerCount);
    if (!isDraftMode) {
      for (let i = 0; i < activeFactions.length; i++) {
        if (!isFactionAvailable(activeFactions[i]!, selectedExpansions)) {
          alert('One or more selected factions require an unselected expansion module.');
          return;
        }
        for (let j = i + 1; j < activeFactions.length; j++) {
          if (areFactionsConflictingColor(activeFactions[i]!, activeFactions[j]!)) {
            alert('Each player must select a faction with a distinct color.');
            return;
          }
        }
      }
    }
    const hasRemnants = selectedExpansions.includes('remnants_of_worlds_afar');
    const sanitizedNeutralShips: NeutralShipSelectionConfig = {
      ancient: !hasRemnants && neutralShipSelections.ancient === 'expert' ? 'default' : neutralShipSelections.ancient,
      guardian: !hasRemnants && neutralShipSelections.guardian === 'expert' ? 'default' : neutralShipSelections.guardian,
      gcds: !hasRemnants && neutralShipSelections.gcds === 'expert' ? 'default' : neutralShipSelections.gcds,
    };
    const tableId = customTableId.trim() || `galaxy-${Date.now() % 1000}`;
    if (mySeat === 'all' && !canUserUseHotseat(currentUser.role)) {
      alert('Only administrators are allowed to use the hotseat function.');
      return;
    }
    registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat: mySeat,
      joinedAt: Date.now(),
      isCreator: true,
    });
    onStartNewGame(
      playerCount,
      isDraftMode ? [] : activeFactions,
      tableId,
      mySeat,
      selectedExpansions,
      sanitizedNeutralShips,
      isDraftMode
    );
  };

  const handleCreateNewTableImmediately = () => {
    if (currentUser.role === 'guest') {
      alert('To start or host a game, you must first log in or register an account so you can reconnect to your table later.');
      setShowUserModal(true);
      return;
    }
    const existingNums = new Set(
      savedTables
        .map((t) => t.tableNumber || parseInt(t.id.replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n) && n > 0)
    );
    let nextNum = 101;
    while (existingNums.has(nextNum)) {
      nextNum++;
    }
    const tableId = `galaxy-${nextNum}`;

    if (mySeat === 'all' && !canUserUseHotseat(currentUser.role)) {
      alert('Only administrators are allowed to use the hotseat function.');
      return;
    }

    const effectiveSeat = 0;

    registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
      isCreator: true,
    });

    onStartNewGame(
      2,
      [],
      tableId,
      effectiveSeat,
      [],
      { ancient: 'default', guardian: 'default', gcds: 'default' },
      false
    );
  };

  const handleConnectTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = joinTableInput.trim();
    if (!id) return;
    setJoinError(null);
    setIsJoining(true);

    try {
      const num = parseInt(id.replace(/\D/g, ''), 10);
      let loaded = loadTable(id) || (num ? loadTableByNumber(num) : null);
      if (!loaded) {
        loaded = await fetchTableFromServer(id);
      }
      if (!loaded && num) {
        loaded = await fetchTableFromServer(String(num));
      }
      if (!loaded) {
        setJoinError(`Table "${id}" does not exist.`);
        setIsJoining(false);
        return;
      }
      const targetId = loaded.id || id;
      if (joinSeat === 'all' && !canUserUseHotseat(currentUser.role)) {
        setJoinError('Only administrators are allowed to use the hotseat function.');
        setIsJoining(false);
        return;
      }
      if (typeof joinSeat === 'number') {
        const seatCheck = isSeatTaken(loaded.members, joinSeat, currentUser.id);
        if (seatCheck.isTaken && seatCheck.occupant) {
          const occ = seatCheck.occupant.username || seatCheck.occupant.name || 'another player';
          setJoinError(`Seat ${joinSeat + 1} is already taken by ${occ}.`);
          setIsJoining(false);
          return;
        }
      }
      const regRes = await registerTableMember(targetId, {
        userId: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        email: currentUser.email,
        emailNotifications: currentUser.emailNotifications,
        seat: joinSeat,
        joinedAt: Date.now(),
      });
      if (!regRes.success && regRes.error) {
        setJoinError(regRes.error);
        setIsJoining(false);
        return;
      }
      setIsJoining(false);
      onJoinTable(targetId, joinSeat);
    } catch {
      setJoinError(`Table "${id}" does not exist.`);
      setIsJoining(false);
    }
  };

  const handleJoinFromList = async (tableId: string, seat: number | 'all' | 'spectator') => {
    if (seat === 'all' && !canUserUseHotseat(currentUser.role)) {
      alert('Only administrators are allowed to use the hotseat function.');
      return;
    }
    const table = savedTables.find((t) => t.id === tableId);
    if (typeof seat === 'number' && table) {
      const seatCheck = isSeatTaken(table.members, seat, currentUser.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        const occ = seatCheck.occupant.username || seatCheck.occupant.name || 'another player';
        alert(`Seat ${seat + 1} is already taken by ${occ}.`);
        return;
      }
    }
    const regRes = await registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat,
      joinedAt: Date.now(),
    });
    if (!regRes.success && regRes.error) {
      alert(regRes.error);
      return;
    }
    onJoinTable(tableId, seat);
  };

  const handleDelete = (tableId: string) => {
    if (window.confirm(`Are you sure you want to permanently delete table ${tableId}?`)) {
      deleteSavedTable(tableId);
      refreshTables();
    }
  };

  const handleCopyShareLink = (tableId: string, seatNum?: number) => {
    if (typeof window === 'undefined') return;
    const base = window.location.origin + window.location.pathname;
    const seatQuery = typeof seatNum === 'number' ? `&seat=${seatNum}` : '';
    const shareUrl = `${base}?table=${tableId}${seatQuery}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      const key = typeof seatNum === 'number' ? `${tableId}_${seatNum}` : tableId;
      setCopiedLinkTableId(key);
      setTimeout(() => setCopiedLinkTableId(null), 2000);
    });
  };

  // Filtered Lists
  // 1. Tables waiting for players (not started yet)
  const waitingTables = savedTables.filter(
    (t) => getTableStatusCategory(t) === 'need_players' && t.phase !== 'GAME_OVER'
  );

  // 2. User's personal tables (only available after login)
  const isUserLoggedIn = currentUser.role !== 'guest';
  const myTables = isUserLoggedIn ? filterTablesForUser(savedTables, currentUser) : [];
  const myTurnCount = myTables.filter((t) => isPlayerTurnAtTable(t, currentUser)).length;

  const myWaitingCount = myTables.filter((t) => getTableStatusCategory(t) === 'need_players').length;
  const myRunningCount = myTables.filter((t) => getTableStatusCategory(t) === 'running').length;
  const myDoneCount = myTables.filter((t) => getTableStatusCategory(t) === 'done').length;

  const filteredMyTables = myTables.filter((t) => {
    if (myGamesStatusFilter === 'all') return true;
    return getTableStatusCategory(t) === myGamesStatusFilter;
  });

  return (
    <div className="min-h-screen min-h-dvh h-full w-full pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-5 lg:p-8 relative overflow-x-hidden overflow-y-auto selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Starfield and Nebula Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(168,85,247,0.10),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(234,88,12,0.08),transparent_40%)] pointer-events-none" />

      {/* Main Header */}
      <header className="relative z-10 text-center max-w-4xl mb-6 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Second Dawn for the Galaxy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-sm">
          ECLIPSE: WEB COMMAND
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-xl mx-auto leading-relaxed">
          High-fidelity multiplayer web adaptation of Eclipse: Second Dawn. Create tables, browse matches waiting for players, or resume your campaigns.
        </p>

        {/* Identity & Global Gallery Header Toolbar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3">
          {/* Active User Identity Pill */}
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold tracking-wider uppercase shadow-lg transition-all cursor-pointer ${
              currentUser.role === 'admin'
                ? 'bg-rose-950/70 border-rose-500/60 hover:border-rose-400 text-rose-300 hover:bg-rose-900/80 shadow-rose-950/40'
                : currentUser.role === 'user'
                ? 'bg-cyan-950/70 border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:bg-cyan-900/80 shadow-cyan-950/40'
                : 'bg-amber-950/70 border-amber-500/60 hover:border-amber-400 text-amber-300 hover:bg-amber-900/80 shadow-amber-950/40'
            }`}
          >
            {currentUser.role === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-rose-400" />
            ) : currentUser.role === 'user' ? (
              <User className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{currentUser.username}</span>
            <span className="text-[10px] font-mono opacity-80 lowercase bg-black/40 px-1.5 py-0.5 rounded">
              ({currentUser.role})
            </span>
            <span className="text-slate-400 text-[10px] underline ml-0.5">Switch</span>
          </button>

          {/* Gallery Option - Always available throughout */}
          {onOpenGallery && (
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-bold tracking-wider uppercase shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              title="Inspect component gallery, ships, technologies, and discovery tiles"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>📚 Gallery</span>
            </button>
          )}

          {activeSection !== 'hub' && (
            <button
              type="button"
              onClick={() => setActiveSection('hub')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold tracking-wider uppercase border border-slate-700 hover:border-slate-500 transition shadow cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Lobby Hub</span>
            </button>
          )}
        </div>

        {/* Top Navigation Bar: Create New Game | Join Other Games | View My Games */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => {
              if (!isUserLoggedIn) {
                setShowUserModal(true);
              } else {
                handleCreateNewTableImmediately();
              }
            }}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'create'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span>Create New Game</span>
            {!isUserLoggedIn && <Lock className="w-3 h-3 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('join')}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'join'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Join Other Games</span>
            {waitingTables.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
                {waitingTables.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isUserLoggedIn) {
                setShowUserModal(true);
              } else {
                setActiveSection('my_games');
              }
            }}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'my_games'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : myTurnCount > 0
                ? 'bg-emerald-950/70 border border-emerald-500/70 text-emerald-300 hover:bg-emerald-900/80 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${myTurnCount > 0 ? 'text-emerald-400 animate-bounce' : 'text-purple-400'}`} />
            <span>View My Games</span>
            {!isUserLoggedIn ? (
              <Lock className="w-3 h-3 text-slate-500" />
            ) : myTurnCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-slate-950 animate-pulse">
                {myTurnCount} Your Turn
              </span>
            ) : myTables.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                {myTables.length}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Content Rendering based on activeSection */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        {/* ========================================================================= */}
        {/* SECTION 1: LOBBY HUB (3 Primary Options) */}
        {/* ========================================================================= */}
        {(isSSR || activeSection === 'hub') && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mt-2">
            {/* Option 1: Create New Game */}
            <div
              onClick={() => {
                if (!isUserLoggedIn) {
                  setShowUserModal(true);
                } else {
                  handleCreateNewTableImmediately();
                }
              }}
              className="group bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl shadow-cyan-950/10 hover:shadow-cyan-950/30 transition-all cursor-pointer flex flex-col justify-between gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Create New Game
                  </h2>
                  {!isUserLoggedIn && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Establish a new galaxy match. Configure 2–6 players, expansions (default: none), and neutral ship blueprints. Starts once all seats are filled.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-400 group-hover:text-cyan-300">
                <span>{!isUserLoggedIn ? 'Log In to Create' : 'Create & Enter Table'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 2: Join Other Games */}
            <div
              onClick={() => setActiveSection('join')}
              className="group bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-6 shadow-xl shadow-blue-950/10 hover:shadow-blue-950/30 transition-all cursor-pointer flex flex-col justify-between gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-white group-hover:text-blue-300 transition-colors">
                    Join Other Games
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 border border-blue-500/40 text-blue-300">
                    {waitingTables.length} Open
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Browse tables waiting for commanders to join (not started yet). Select an open seat to step into the command chair and prepare for galactic war.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300">
                <span>Browse Waiting Tables</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 3: View My Games */}
            <div
              onClick={() => {
                if (!isUserLoggedIn) {
                  setShowUserModal(true);
                } else {
                  setActiveSection('my_games');
                }
              }}
              className={`group bg-slate-900/90 rounded-2xl p-6 shadow-xl transition-all cursor-pointer flex flex-col justify-between gap-5 relative overflow-hidden ${
                myTurnCount > 0
                  ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-950/50 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 hover:border-emerald-400'
                  : 'border border-slate-800 hover:border-purple-500/60 shadow-purple-950/10 hover:shadow-purple-950/30'
              }`}
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-all ${
                  myTurnCount > 0 ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30' : 'bg-purple-500/10 group-hover:bg-purple-500/20'
                }`}
              />
              <div className="space-y-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                    myTurnCount > 0
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  }`}
                >
                  <Bookmark className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className={`text-xl font-display font-bold transition-colors ${
                      myTurnCount > 0 ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-white group-hover:text-purple-300'
                    }`}
                  >
                    View My Games
                  </h2>
                  {!isUserLoggedIn ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login Required
                    </span>
                  ) : myTurnCount > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 animate-pulse flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" /> {myTurnCount} Your Turn
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 border border-purple-500/40 text-purple-300">
                      {myTables.length} Tables
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {!isUserLoggedIn
                    ? 'Log in to track your personal tables, rejoin active matches, and get notified when it is your turn.'
                    : myTurnCount > 0
                    ? `You have ${myTurnCount} match(es) waiting for you to make a move! Rejoin now to take your turn.`
                    : 'View all matches you belong to: tables waiting for players, games in progress, and completed match chronicles.'}
                </p>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
                  myTurnCount > 0
                    ? 'border-emerald-500/40 text-emerald-400 group-hover:text-emerald-300'
                    : 'border-slate-800/80 text-purple-400 group-hover:text-purple-300'
                }`}
              >
                <span>{!isUserLoggedIn ? 'Log In to View' : 'Open My Tables'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: CREATE NEW GAME VIEW */}
        {/* ========================================================================= */}
        {(isSSR || activeSection === 'create') && (
          <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/20 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Create New Game Table</h2>
                  <p className="text-xs text-slate-400">
                    Configure players, expansions, and neutral ship blueprints. Game starts once all seats are filled.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('hub')}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleLaunchGame} className="space-y-5">
              {/* Table Name & Player Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Table ID / Identifier
                  </label>
                  <input
                    type="text"
                    value={customTableId}
                    onChange={(e) => setCustomTableId(e.target.value)}
                    placeholder="e.g. galaxy-101"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Player Count: <span className="text-cyan-400 font-bold">{playerCount} Commanders</span>
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlayerCount(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          playerCount === num
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        {num}P
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Faction Draft Mode Toggle */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-200 text-xs">Faction Draft Mode</span>
                      {isDraftMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isDraftMode
                        ? 'Players draft factions counter-clockwise during setup after Ring 2 positions are established.'
                        : 'Fixed factions pre-selected below.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDraftMode(!isDraftMode)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition border cursor-pointer shrink-0 ${
                    isDraftMode
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {isDraftMode ? 'Draft Enabled' : 'Enable Faction Draft'}
                </button>
              </div>

              {/* Creator's Assigned Seat */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Your Starting Seat
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {Array.from({ length: playerCount }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMySeat(idx)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        mySeat === idx
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Seat</div>
                      <div className="text-sm font-bold">{idx + 1}</div>
                    </button>
                  ))}
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setMySeat('all')}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        mySeat === 'all'
                          ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold shadow-md shadow-purple-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-purple-400 uppercase">Hotseat</div>
                      <div className="text-xs font-bold">All Seats</div>
                    </button>
                  )}
                </div>
              </div>

              {/* Preset Factions Roster (Only if not in draft mode) */}
              {!isDraftMode && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Species Factions Selection ({playerCount} Required)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Array.from({ length: playerCount }).map((_, pIdx) => {
                      const curFaction = ALL_FACTIONS.find((f) => f.id === selectedFactions[pIdx]);
                      return (
                        <div key={pIdx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono font-bold">Seat {pIdx + 1}</span>
                            {mySeat === pIdx && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                Your Seat
                              </span>
                            )}
                          </div>
                          <select
                            value={selectedFactions[pIdx] || ''}
                            onChange={(e) => handleFactionChange(pIdx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                          >
                            {availableFactions.map((f) => {
                              const isTakenByOther = selectedFactions
                                .slice(0, playerCount)
                                .some((otherId, otherIdx) => otherIdx !== pIdx && otherId === f.id);
                              const hasConflict = selectedFactions
                                .slice(0, playerCount)
                                .some((otherId, otherIdx) => otherIdx !== pIdx && areFactionsConflictingColor(otherId, f.id));
                              return (
                                <option key={f.id} value={f.id} disabled={isTakenByOther || hasConflict}>
                                  {f.name} ({f.defaultColor.toUpperCase()})
                                  {isTakenByOther ? ' - Picked' : hasConflict ? ' - Color Conflict' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expansions Selection (Default: No expansions) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Expansions Module (Default: No Expansions)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                      {selectedExpansions.length} Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAllExpansions}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      {allExpansionsSelected ? 'Clear All' : 'Select All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExpansionsOpen(!isExpansionsOpen)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      {isExpansionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpansionsOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_EXPANSIONS.map((exp) => {
                      const active = selectedExpansions.includes(exp.id);
                      return (
                        <div
                          key={exp.id}
                          onClick={() => toggleExpansion(exp.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                            active
                              ? 'bg-cyan-950/40 border-cyan-500/60 text-slate-200 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-700 bg-slate-950 text-cyan-500 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200">{exp.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{exp.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Neutral Ship Blueprints Selection (Default: 'default') */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Neutral Ship Blueprints (NPCs) (Default: Default)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] text-slate-400">Layout:</span>
                    <button type="button" className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Compact
                    </button>
                    <button type="button" className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      Scrollable
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBlueprintsOpen(!isBlueprintsOpen)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      {isBlueprintsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isBlueprintsOpen && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(
                        [
                          {
                            type: 'ancient' as const,
                            label: 'Ancient Ship',
                          },
                          {
                            type: 'guardian' as const,
                            label: 'Guardian',
                          },
                          {
                            type: 'gcds' as const,
                            label: 'Galactic Center Defense System (GCDS)',
                          },
                        ]
                      ).map(({ type, label }) => (
                        <div key={type} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                          <span className="font-bold text-slate-300 capitalize">{label}</span>
                          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setNeutralShipSelections((prev) => ({
                                  ...prev,
                                  [type]: 'default',
                                }))
                              }
                              className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                                neutralShipSelections[type] === 'default'
                                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Default
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNeutralShipSelections((prev) => ({
                                  ...prev,
                                  [type]: 'advanced',
                                }))
                              }
                              className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                                neutralShipSelections[type] === 'advanced'
                                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Advanced
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNeutralShipSelections((prev) => ({
                                  ...prev,
                                  [type]: 'random',
                                }))
                              }
                              className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                                neutralShipSelections[type] === 'random'
                                  ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Random
                            </button>
                            <button
                              type="button"
                              disabled={!hasRemnants}
                              onClick={() =>
                                setNeutralShipSelections((prev) => ({
                                  ...prev,
                                  [type]: 'expert',
                                }))
                              }
                              className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                                neutralShipSelections[type] === 'expert'
                                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                                  : hasRemnants
                                  ? 'text-slate-400 hover:text-slate-200'
                                  : 'text-slate-600 opacity-50 cursor-not-allowed'
                              }`}
                              title={!hasRemnants ? 'Expert Blueprint requires Remnants of Worlds Afar expansion' : 'Expert blueprint variant'}
                            >
                              Exp
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!hasRemnants && (
                      <div className="text-[10px] text-slate-500 italic">
                        Expert Blueprint requires Remnants of Worlds Afar expansion
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md pt-3 pb-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3 z-20">
                <button
                  type="button"
                  onClick={() => setActiveSection('hub')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Launch Galactic Conflict (Enter Waiting Room)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: JOIN OTHER GAMES VIEW (Tables waiting for players) */}
        {/* ========================================================================= */}
        {(isSSR || activeSection === 'join') && (
          <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 sm:p-7 shadow-2xl shadow-blue-950/20 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Join Other Games</h2>
                  <p className="text-xs text-slate-400">
                    Tables that are waiting for players (not started yet). Select an open seat to join.
                  </p>
                </div>
              </div>

              {/* Quick Table Code Direct Entry Form */}
              <form onSubmit={handleConnectTable} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={joinTableInput}
                  onChange={(e) => {
                    setJoinTableInput(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                  placeholder="Code (e.g. 101)"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-400 w-32"
                />
                <select
                  value={joinSeat.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      if (!canUserUseHotseat(currentUser.role)) {
                        alert('Only administrators are allowed to use the hotseat function.');
                        return;
                      }
                      setJoinSeat(val);
                    } else if (val === 'spectator') {
                      setJoinSeat(val);
                    } else {
                      setJoinSeat(parseInt(val, 10));
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-xs font-medium rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-400"
                >
                  <option value="0">Seat 1 (Player 1)</option>
                  <option value="1">Seat 2 (Player 2)</option>
                  <option value="2">Seat 3 (Player 3)</option>
                  <option value="3">Seat 4 (Player 4)</option>
                  <option value="4">Seat 5 (Player 5)</option>
                  <option value="5">Seat 6 (Player 6)</option>
                  <option value="all" disabled={!canUserUseHotseat(currentUser.role)}>
                    Hotseat / All Players{!canUserUseHotseat(currentUser.role) ? ' (Admin Only)' : ''}
                  </option>
                  <option value="spectator">Spectator / Observer</option>
                </select>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? 'Joining...' : 'Quick Join'}
                </button>
              </form>
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {joinError}
              </div>
            )}

            {/* Waiting Tables List */}
            {waitingTables.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Users className="w-10 h-10 text-slate-600 mb-1" />
                <h3 className="text-base font-bold text-slate-300">No Tables Waiting for Players</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  There are currently no open tables waiting for players. Establish a new table and invite commanders to launch a match!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('create')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Create New Game</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {waitingTables.map((table) => {
                  const occupiedSeats = getTableOccupiedSeats(table);
                  const isUserSeated = Boolean(
                    (table.members || []).some(
                      (m) => m.userId === currentUser.id && typeof m.seat === 'number' && m.seat >= 0
                    )
                  );
                  const myMembership = (table.members || []).find((m) => m.userId === currentUser.id);

                  return (
                    <div
                      key={table.id}
                      className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-md"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-display font-black text-white">
                            Table #{table.tableNumber || table.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            {occupiedSeats.size} of {table.playerCount} Seated
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {table.playerNames && table.playerNames.length > 0
                            ? table.playerNames.join(', ')
                            : `${table.playerCount} Players`}
                        </div>
                      </div>

                      {/* Seating Roster with Join Buttons */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                          Seats & Availability
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {Array.from({ length: table.playerCount }).map((_, sIdx) => {
                            const occupant = (table.members || []).find((m) => m.seat === sIdx);
                            const isTaken = Boolean(occupant);
                            const isMySeat = occupant?.userId === currentUser.id;

                            if (isTaken) {
                              return (
                                <div
                                  key={sIdx}
                                  className={`p-1.5 rounded-lg border text-center text-[10px] ${
                                    isMySeat
                                      ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <div className="text-[9px] opacity-70">Seat {sIdx + 1}</div>
                                  <div className="truncate font-semibold">{isMySeat ? 'YOU' : occupant?.username || 'Taken'}</div>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleJoinFromList(table.id, sIdx)}
                                className="p-1.5 rounded-lg border border-blue-500/50 hover:border-blue-400 bg-blue-950/50 hover:bg-blue-900/80 text-blue-200 text-center text-[10px] font-bold transition cursor-pointer"
                              >
                                <div>Seat {sIdx + 1}</div>
                                <div className="text-[9px] text-blue-400 uppercase">Join</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canUserUseHotseat(currentUser.role)}
                            onClick={() => {
                              if (canUserUseHotseat(currentUser.role)) {
                                handleJoinFromList(table.id, 'all');
                              }
                            }}
                            title={!canUserUseHotseat(currentUser.role) ? 'Hotseat is restricted to administrators' : 'Join as Hotseat (Control All)'}
                            className={`px-2 py-1 border rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                              !canUserUseHotseat(currentUser.role)
                                ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-60'
                                : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-300 hover:text-white cursor-pointer'
                            }`}
                          >
                            {!canUserUseHotseat(currentUser.role) && <Lock className="w-2.5 h-2.5" />}
                            <span>Hotseat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(table.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>{copiedLinkTableId === table.id ? 'Copied!' : 'Share'}</span>
                          </button>
                        </div>

                        {isUserSeated && (
                          <button
                            type="button"
                            onClick={() => onJoinTable(table.id, typeof myMembership?.seat === 'number' ? myMembership.seat : 0)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                          >
                            <span>Rejoin Table</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: VIEW MY GAMES (Only available after login) */}
        {/* ========================================================================= */}
        {(isSSR || activeSection === 'my_games') && (
          <div className="w-full bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 sm:p-7 shadow-2xl shadow-purple-950/20 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-white">My Game Tables</h2>
                  <p className="text-xs text-slate-400">
                    All tables you are registered in across waiting rooms, active matches, and finished games.
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {(['all', 'need_players', 'running', 'done'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setMyGamesStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs capitalize transition cursor-pointer ${
                      myGamesStatusFilter === status
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {status === 'need_players' ? 'Waiting' : status === 'running' ? 'Active' : status}
                    {status === 'all'
                      ? ` (${myTables.length})`
                      : status === 'need_players'
                      ? ` (${myWaitingCount})`
                      : status === 'running'
                      ? ` (${myRunningCount})`
                      : ` (${myDoneCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* If not logged in, display required login prompt */}
            {!isUserLoggedIn ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <Lock className="w-10 h-10 text-amber-400 mb-1" />
                <h3 className="text-base font-bold text-white">Login Required</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  You must be logged in to view and rejoin your personalized tables. Please log in or register.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUserModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In / Register</span>
                </button>
              </div>
            ) : filteredMyTables.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Bookmark className="w-10 h-10 text-slate-600 mb-1" />
                <h3 className="text-base font-bold text-slate-300">No Tables Found</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  You are not currently participating in any tables under this category.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('create')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Create a New Table</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMyTables.map((table) => {
                  const statusCat = getTableStatusCategory(table);
                  const isMyTurn = isPlayerTurnAtTable(table, currentUser);
                  const myMem = (table.members || []).find((m) => m.userId === currentUser.id);
                  const mySeatNum = typeof myMem?.seat === 'number' ? myMem.seat : 0;

                  return (
                    <div
                      key={table.id}
                      className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all shadow-md ${
                        isMyTurn
                          ? 'bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-950/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-display font-black text-white">
                            Table #{table.tableNumber || table.id}
                          </span>

                          {isMyTurn ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 fill-current" /> YOUR TURN
                            </span>
                          ) : statusCat === 'need_players' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              Waiting for Players ({getTableOccupiedSeats(table).size}/{table.playerCount})
                            </span>
                          ) : statusCat === 'running' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                              Round {table.round} • {table.phase}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                              Completed
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          <span>Seated as: </span>
                          <span className="text-slate-200 font-bold">
                            Seat {mySeatNum + 1}
                            {myMem?.role === 'admin' && myMem?.seat === 'all' ? ' (Hotseat)' : ''}
                          </span>
                          {table.activePlayerName && statusCat === 'running' && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Active Player: <span className="text-slate-300 font-semibold">{table.activePlayerName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canUserUseHotseat(currentUser.role)}
                            onClick={() => {
                              if (canUserUseHotseat(currentUser.role)) {
                                handleJoinFromList(table.id, 'all');
                              }
                            }}
                            title={!canUserUseHotseat(currentUser.role) ? 'Hotseat is restricted to administrators' : 'Join as Hotseat (Control All)'}
                            className={`px-2 py-1 border rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                              !canUserUseHotseat(currentUser.role)
                                ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-60'
                                : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-300 hover:text-white cursor-pointer'
                            }`}
                          >
                            {!canUserUseHotseat(currentUser.role) && <Lock className="w-2.5 h-2.5" />}
                            <span>Hotseat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(table.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs transition cursor-pointer"
                            title="Copy Table Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {(currentUser.role === 'admin' || (myMem as any)?.isCreator) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(table.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 text-xs transition cursor-pointer"
                              title="Delete Table"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {statusCat === 'done' && onOpenReplay && (
                            <button
                              type="button"
                              onClick={() => onOpenReplay(table.id)}
                              className="px-3 py-1.5 rounded-xl border border-indigo-700 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Replay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onJoinTable(table.id, myMem?.seat ?? 0)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow flex items-center gap-1.5 cursor-pointer ${
                              isMyTurn
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/30'
                            }`}
                          >
                            <span>{isMyTurn ? 'Take Turn' : statusCat === 'need_players' ? 'Rejoin Waiting Room' : 'Open Game'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Login Modal */}
      {showUserModal && (
        <UserLoginModal
          currentUser={currentUser}
          onUserChanged={(u) => {
            setCurrentUser(u);
            setShowUserModal(false);
            refreshTables();
          }}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  );
};
