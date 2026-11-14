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
  getTableExpansions,
  getTableSeatsInfo,
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
  Gamepad2,
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
  Swords,
} from 'lucide-react';
import {
  NeutralShipType,
  NeutralShipSelection,
  NeutralShipSelectionConfig,
} from '../../engine/rules/neutralShips';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import {
  translateFactionName,
  translateExpansionName,
  translateGamePhase,
} from '../../i18n/catalogTranslations';

interface LobbyViewProps {
  onStartNewGame: (
    playerCount: number,
    factionIds: string[],
    tableId: string,
    seat: number | 'all',
    expansions?: string[],
    neutralShips?: NeutralShipSelectionConfig,
    isDraftMode?: boolean,
    isLocalGame?: boolean
  ) => void;
  onJoinTable: (tableId: string, seat: number | 'all' | 'spectator') => void;
  onOpenGallery?: () => void;
  onOpenReplay?: (tableId: string) => void;
  onOpenCombatSimulator?: () => void;
}

export type LobbySection = 'hub' | 'create' | 'join' | 'my_games';

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartNewGame,
  onJoinTable,
  onOpenGallery,
  onOpenReplay,
  onOpenCombatSimulator,
}) => {
  const { language, l } = useLanguage();
  const isSSR = typeof window === 'undefined';
  const [currentUser, setCurrentUser] = useState<UserSession>(() => getCurrentUser());
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<LobbySection>('hub');
  const [myGamesStatusFilter, setMyGamesStatusFilter] = useState<'all' | 'need_players' | 'running' | 'done'>('all');
  const [savedTables, setSavedTables] = useState<SavedTableSummary[]>(() => listSavedTables());
  const [gameMode, setGameMode] = useState<'normal' | 'local'>(() => currentUser.role === 'guest' ? 'local' : 'normal');

  useEffect(() => {
    return subscribeToUserSession((updated) => {
      setCurrentUser(updated);
      if (updated.role === 'guest') {
        setGameMode('local');
        setMySeat('all');
        setJoinSeat('spectator');
      } else if (updated.role !== 'admin') {
        setMySeat((prev) => (prev === 'all' && gameMode !== 'local' ? 0 : prev));
        setJoinSeat((prev) => (prev === 'all' ? 0 : prev));
      }
    });
  }, [gameMode]);

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
  const [mySeat, setMySeat] = useState<number | 'all'>(() => (currentUser.role === 'guest' ? 'all' : 0));

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
  const [joinSeat, setJoinSeat] = useState<number | 'all' | 'spectator'>(() => (currentUser.role === 'guest' ? 'spectator' : 0));
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
    const isLocal = gameMode === 'local';
    if (!isLocal && currentUser.role === 'guest') {
      alert('To start or host an online multiplayer game, you must first log in or register an account so other commanders can join your table.');
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
    const prefix = isLocal ? 'local' : 'galaxy';
    const tableId = customTableId.trim() || `${prefix}-${Date.now() % 1000}`;
    const effectiveSeat = isLocal ? 'all' : mySeat;

    if (effectiveSeat === 'all' && !canUserUseHotseat(currentUser.role, isLocal)) {
      alert('Only administrators are allowed to use the hotseat function in online games.');
      return;
    }
    registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
      isCreator: true,
    }, isLocal);
    onStartNewGame(
      playerCount,
      isDraftMode ? [] : activeFactions,
      tableId,
      effectiveSeat,
      selectedExpansions,
      sanitizedNeutralShips,
      isDraftMode,
      isLocal
    );
  };

  const handleCreateNewTableImmediately = (mode: 'normal' | 'local' = 'normal') => {
    const isLocal = mode === 'local';
    if (!isLocal && currentUser.role === 'guest') {
      alert('To start or host an online multiplayer game, you must first log in or register an account so you can reconnect to your table later.');
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
    const tableId = isLocal ? `local-${nextNum}` : `galaxy-${nextNum}`;
    const effectiveSeat = isLocal ? 'all' : 0;

    if (effectiveSeat === 'all' && !canUserUseHotseat(currentUser.role, isLocal)) {
      alert('Only administrators are allowed to use the hotseat function in online games.');
      return;
    }

    registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
      isCreator: true,
    }, isLocal);

    onStartNewGame(
      2,
      [],
      tableId,
      effectiveSeat,
      [],
      { ancient: 'default', guardian: 'default', gcds: 'default' },
      false,
      isLocal
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
        setJoinError(l(`Table "${id}" does not exist.`, `牌桌 "${id}" 不存在。`));
        setIsJoining(false);
        return;
      }
      const targetId = loaded.id || id;
      const isLocal = Boolean(loaded.isLocalGame || id.startsWith('local-') || id.startsWith('local_'));
      const effectiveSeat = isLocal ? 'all' : joinSeat;

      if (!isLocal && currentUser.role === 'guest' && effectiveSeat !== 'spectator') {
        setJoinError(l(
          'Guest players can only join online multiplayer games as a spectator. Please select Spectator or log in.',
          '游客仅能作为观战者加入联机对局，请选择观战者或先登录账号。'
        ));
        setShowUserModal(true);
        setIsJoining(false);
        return;
      }

      if (effectiveSeat === 'all' && !canUserUseHotseat(currentUser.role, isLocal)) {
        setJoinError(l(
          'Only administrators are allowed to use the hotseat function in online games.',
          '联机对局中仅管理员可使用热座功能。'
        ));
        setIsJoining(false);
        return;
      }
      if (typeof effectiveSeat === 'number') {
        const seatCheck = isSeatTaken(loaded.members, effectiveSeat, currentUser.id);
        if (seatCheck.isTaken && seatCheck.occupant) {
          const occ = seatCheck.occupant.username || seatCheck.occupant.name || l('another player', '其他玩家');
          setJoinError(l(`Seat ${effectiveSeat + 1} is already taken by ${occ}.`, `席位 ${effectiveSeat + 1} 已被 ${occ} 占用。`));
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
        seat: effectiveSeat,
        joinedAt: Date.now(),
      }, isLocal);
      if (!regRes.success && regRes.error) {
        setJoinError(regRes.error);
        setIsJoining(false);
        return;
      }
      setIsJoining(false);
      onJoinTable(targetId, effectiveSeat);
    } catch {
      setJoinError(l(`Table "${id}" does not exist.`, `牌桌 "${id}" 不存在。`));
      setIsJoining(false);
    }
  };

  const handleJoinFromList = async (tableId: string, seat: number | 'all' | 'spectator') => {
    const table = savedTables.find((t) => t.id === tableId);
    const isLocal = Boolean(table?.isLocalGame || tableId.startsWith('local-') || tableId.startsWith('local_'));
    const effectiveSeat = isLocal ? 'all' : seat;
    if (!isLocal && currentUser.role === 'guest' && effectiveSeat !== 'spectator') {
      alert(l(
        'Guest players can only join online multiplayer games as a spectator. Please log in or register to take a player seat.',
        '游客仅能作为观战者加入联机对局，请先登录或注册以占用玩家席位。'
      ));
      setShowUserModal(true);
      return;
    }
    if (effectiveSeat === 'all' && !canUserUseHotseat(currentUser.role, isLocal)) {
      alert(l(
        'Only administrators are allowed to use the hotseat function in online games.',
        '联机对局中仅管理员可使用热座功能。'
      ));
      return;
    }
    if (typeof effectiveSeat === 'number' && table) {
      const seatCheck = isSeatTaken(table.members, effectiveSeat, currentUser.id);
      if (seatCheck.isTaken && seatCheck.occupant) {
        const occ = seatCheck.occupant.username || seatCheck.occupant.name || l('another player', '其他玩家');
        alert(l(`Seat ${effectiveSeat + 1} is already taken by ${occ}.`, `席位 ${effectiveSeat + 1} 已被 ${occ} 占用。`));
        return;
      }
    }
    const regRes = await registerTableMember(tableId, {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      email: currentUser.email,
      emailNotifications: currentUser.emailNotifications,
      seat: effectiveSeat,
      joinedAt: Date.now(),
    }, isLocal);
    if (!regRes.success && regRes.error) {
      alert(regRes.error);
      return;
    }
    onJoinTable(tableId, effectiveSeat);
  };

  const handleDelete = (tableId: string) => {
    if (window.confirm(l(
      `Are you sure you want to permanently delete table ${tableId}?`,
      `确定要永久删除牌桌 ${tableId} 吗？`
    ))) {
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
  // 1. Tables waiting for players (not started yet, online tables only)
  const waitingTables = savedTables.filter(
    (t) => !t.isLocalGame && getTableStatusCategory(t) === 'need_players' && t.phase !== 'GAME_OVER'
  );

  // 2. User's personal tables (logged in users see personal tables; guests see their local hotseat games)
  const isUserLoggedIn = currentUser.role !== 'guest';
  const myTables = isUserLoggedIn
    ? filterTablesForUser(savedTables, currentUser)
    : savedTables.filter((t) => t.isLocalGame);
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
          <span>{l('Second Dawn for the Galaxy', '银河第二黎明')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-sm">
          {l('ECLIPSE: WEB COMMAND', '星蚀：银河网页指挥中心')}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-xl mx-auto leading-relaxed">
          {l(
            'High-fidelity multiplayer web adaptation of Eclipse: Second Dawn. Create tables, browse matches waiting for players, or resume your campaigns.',
            '《星蚀：银河第二黎明》高还原多人在线网页版。创建对局牌桌、加入等待中的房间，或继续你的银河战役。'
          )}
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
            <span className="text-slate-400 text-[10px] underline ml-0.5">{l('Switch', '切换')}</span>
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Gallery Option - Always available throughout */}
          {onOpenGallery && (
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-bold tracking-wider uppercase shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
              title={l('Inspect component gallery, ships, technologies, and discovery tiles', '浏览组件图鉴、飞船蓝图、科技及探索板块')}
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>{l('📚 Gallery', '📚 图鉴')}</span>
            </button>
          )}

          {/* Combat Simulator - Always available throughout */}
          {onOpenCombatSimulator && (
            <button
              type="button"
              onClick={onOpenCombatSimulator}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-red-500/40 hover:border-red-400 hover:bg-slate-800 text-red-300 hover:text-red-200 text-xs font-bold tracking-wider uppercase shadow-lg shadow-red-950/40 transition-all cursor-pointer"
              title={l('Open Monte Carlo Combat Simulator', '打开蒙特卡洛战斗模拟器')}
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>{l('⚔️ Simulator', '⚔️ 战斗模拟')}</span>
            </button>
          )}

          {activeSection !== 'hub' && (
            <button
              type="button"
              onClick={() => setActiveSection('hub')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold tracking-wider uppercase border border-slate-700 hover:border-slate-500 transition shadow cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{l('Back to Lobby Hub', '返回大厅主页')}</span>
            </button>
          )}
        </div>

        {/* Top Navigation Bar: Create New Game | Join Other Games | View My Games */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => setActiveSection('create')}
            className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'create'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span>{l('Create Game', '创建对局')}</span>
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
            <span>{l('Join Other Games', '加入对局')}</span>
            {waitingTables.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/40">
                {waitingTables.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isUserLoggedIn && myTables.length === 0) {
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
            <span>{!isUserLoggedIn && myTables.length > 0 ? l('My Local Games', '我的本地对局') : l('View My Games', '我的对局')}</span>
            {!isUserLoggedIn && myTables.length === 0 ? (
              <Lock className="w-3 h-3 text-slate-500" />
            ) : myTurnCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-slate-950 animate-pulse">
                {myTurnCount} {l('Your Turn', '待行动')}
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
            {/* Option 1: Create Game */}
            <div
              onClick={() => setActiveSection('create')}
              className="group bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-6 shadow-xl shadow-cyan-950/10 hover:shadow-cyan-950/30 transition-all cursor-pointer flex flex-col justify-between gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {l('Create Game', '创建对局')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                    {l('Local & Online', '本地与联机')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {l(
                    'Start a match! Play a Local Game (Pass-and-play hotseat in this browser, no account needed) or host a Normal Game (Online multiplayer server hosted).',
                    '开启一场星际争霸！可选择本地热座模式（单设备轮流操作，无需账号）或创建联机对局（服务器托管多人对战）。'
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-400 group-hover:text-cyan-300">
                <span>{l('Configure & Start', '配置并开启')}</span>
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
                    {l('Join Other Games', '加入其他对局')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 border border-blue-500/40 text-blue-300">
                    {waitingTables.length} {l('Open', '开放中')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {l(
                    'Browse tables waiting for commanders to join (not started yet). Select an open seat to step into the command chair and prepare for galactic war.',
                    '浏览正在招募指挥官的未开赛房间，选择一个空余席位入座，备战银河全面战争。'
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300">
                <span>{l('Browse Waiting Tables', '浏览等待中的牌桌')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 3: View My Games */}
            <div
              onClick={() => {
                if (!isUserLoggedIn && myTables.length === 0) {
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
                    {!isUserLoggedIn && myTables.length > 0 ? l('My Local Games', '我的本地对局') : l('View My Games', '查看我的对局')}
                  </h2>
                  {!isUserLoggedIn && myTables.length === 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {l('Login Required', '需要登录')}
                    </span>
                  ) : myTurnCount > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 animate-pulse flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" /> {myTurnCount} {l('Your Turn', '你的回合')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 border border-purple-500/40 text-purple-300">
                      {myTables.length} {l('Tables', '局')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {!isUserLoggedIn && myTables.length === 0
                    ? l(
                        'Log in to track your personal tables, rejoin active matches, and get notified when it is your turn.',
                        '登录后可追踪个人对局、随时重连进行中的比赛，并在轮到你时及时获知。'
                      )
                    : !isUserLoggedIn && myTables.length > 0
                    ? l(
                        `You have ${myTables.length} local hotseat match(es) saved in this browser. Click to resume playing.`,
                        `当前浏览器保存了 ${myTables.length} 场本地热座对局，点击继续游玩。`
                      )
                    : myTurnCount > 0
                    ? l(
                        `You have ${myTurnCount} match(es) waiting for you to make a move! Rejoin now to take your turn.`,
                        `你有 ${myTurnCount} 场对局正等待你行动！立即进入继续你的回合。`
                      )
                    : l(
                        'View all matches you belong to: tables waiting for players, games in progress, and completed match chronicles.',
                        '查看你参与的所有牌桌：等待开局房间、激战中的对局以及已完成战局回放。'
                      )}
                </p>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
                  myTurnCount > 0
                    ? 'border-emerald-500/40 text-emerald-400 group-hover:text-emerald-300'
                    : 'border-slate-800/80 text-purple-400 group-hover:text-purple-300'
                }`}
              >
                <span>{!isUserLoggedIn && myTables.length === 0 ? l('Log In to View', '登录查看') : l('Open My Tables', '打开我的牌桌')}</span>
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
                  <h2 className="text-xl font-display font-bold text-white">{l('Create New Game Table', '创建新对局牌桌')}</h2>
                  <p className="text-xs text-slate-400">
                    {l(
                      'Configure players, expansions, and neutral ship blueprints. Game starts once all seats are filled.',
                      '配置玩家人数、扩展模块及中立飞船蓝图。所有席位坐满后即可开局。'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSection('hub')}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {l('Cancel', '取消')}
              </button>
            </div>

            <form onSubmit={handleLaunchGame} className="space-y-5">
              {/* Game Mode Selector: Local Hotseat vs Normal Online */}
              <div className="p-1.5 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGameMode('local');
                    setMySeat('all');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                    gameMode === 'local'
                      ? 'bg-purple-950/60 border-purple-500/80 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-purple-300 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-purple-400" />
                      {l('Local Game (Pass & Play)', '本地对局（热座模式）')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-900/80 text-purple-200 border border-purple-700">
                      {l('Hotseat Mode', '热座模式')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {l(
                      'Stored locally in your browser. Single user controls all factions. Not uploaded to server or table list. Guest friendly!',
                      '仅保存在本地浏览器，单设备轮流控制全部势力，不上传服务器。游客也可畅玩！'
                    )}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.role === 'guest') {
                      alert(l(
                        'To create and host a normal online multiplayer game, please log in or register.',
                        '创建并主持在线多人对局前，请先登录或注册账号。'
                      ));
                      setShowUserModal(true);
                      return;
                    }
                    setGameMode('normal');
                    if (mySeat === 'all' && currentUser.role !== 'admin') {
                      setMySeat(0);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                    gameMode === 'normal'
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      {l('Normal Game (Online Multiplayer)', '标准对局（在线多人）')}
                    </span>
                    {currentUser.role === 'guest' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> {l('Login Required', '需登录')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-900/80 text-cyan-200 border border-cyan-700">
                        {l('Server-Hosted', '服务器托管')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {l(
                      'Hosted on the server. Other commanders can join via table ID or invite link. Enter a waiting room until seats fill.',
                      '由服务器实时同步。其他指挥官可通过房间号或邀请链接加入，等待全员入座后开赛。'
                    )}
                  </p>
                </button>
              </div>

              {/* Table Name & Player Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {l('Table ID / Identifier', '房间编号 / 牌桌 ID')}
                  </label>
                  <input
                    type="text"
                    value={customTableId}
                    onChange={(e) => setCustomTableId(e.target.value)}
                    placeholder={l('e.g. galaxy-101', '例如 galaxy-101')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {l('Player Count:', '玩家人数：')}{' '}
                    <span className="text-cyan-400 font-bold">
                      {playerCount} {l('Commanders', '位指挥官')}
                    </span>
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
                        {num}{l('P', '人')}
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
                      <span className="font-bold text-indigo-200 text-xs">{l('Faction Draft Mode', '种族轮抽模式')}</span>
                      {isDraftMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                          {l('Active', '已启用')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isDraftMode
                        ? l(
                            'Players draft factions counter-clockwise during setup after Ring 2 positions are established.',
                            '确定二环初始星区位置后，玩家按逆时针顺序轮流挑选势力种族。'
                          )
                        : l('Fixed factions pre-selected below.', '直接采用下方预先指定的固定势力配置。')}
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
                  {isDraftMode ? l('Draft Enabled', '已开启轮抽') : l('Enable Faction Draft', '启用种族轮抽')}
                </button>
              </div>

              {/* Creator's Assigned Seat / Hotseat Mode */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  {l('Your Command Mode', '你的席位与操控模式')}
                </label>
                {gameMode === 'local' ? (
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-600/40 text-xs text-purple-200 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-xs">{l('Hotseat Mode (All Factions)', '热座模式（操控所有势力）')}</div>
                      <p className="text-[11px] text-purple-300/80 mt-0.5">
                        {l(
                          `In a Local Game, you command all ${playerCount} factions in turn-by-turn pass-and-play mode on this device.`,
                          `在本地对局中，你可以在当前设备上轮流操作全部 ${playerCount} 个势力。`
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
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
                        <div className="text-[10px] font-mono text-slate-500 uppercase">{l('Seat', '席位')}</div>
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
                        <div className="text-[10px] font-mono text-purple-400 uppercase">{l('Hotseat', '热座')}</div>
                        <div className="text-xs font-bold">{l('All Seats', '全部席位')}</div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Preset Factions Roster (Only if not in draft mode) */}
              {!isDraftMode && (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {l(`Species Factions Selection (${playerCount} Required)`, `势力种族选择（需选 ${playerCount} 个）`)}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Array.from({ length: playerCount }).map((_, pIdx) => {
                      const curFaction = ALL_FACTIONS.find((f) => f.id === selectedFactions[pIdx]);
                      return (
                        <div key={pIdx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono font-bold">{l(`Seat ${pIdx + 1}`, `席位 ${pIdx + 1}`)}</span>
                            {mySeat === pIdx && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                {l('Your Seat', '你的席位')}
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
                                  {translateFactionName(f.id, f.name, language)} ({f.defaultColor.toUpperCase()})
                                  {isTakenByOther ? l(' - Picked', ' - 已选') : hasConflict ? l(' - Color Conflict', ' - 颜色冲突') : ''}
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
                      {l('Expansions Module (Default: No Expansions)', '扩展模块配置（默认不启用扩展）')}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                      {selectedExpansions.length} {l('Active', '已启用')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAllExpansions}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      {allExpansionsSelected ? l('Clear All', '清空') : l('Select All', '全选')}
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
                            <div className="text-xs font-bold text-slate-200">{translateExpansionName(exp.id, exp.name, language)}</div>
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
                      {l('Neutral Ship Blueprints (NPCs) (Default: Default)', '中立飞船蓝图 (NPC)（默认：标准）')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] text-slate-400">{l('Layout:', '布局：')}</span>
                    <button type="button" className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      {l('Compact', '紧凑')}
                    </button>
                    <button type="button" className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      {l('Scrollable', '滚动')}
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
                            label: l('Ancient Ship', '远古舰船'),
                          },
                          {
                            type: 'guardian' as const,
                            label: l('Guardian', '守卫舰'),
                          },
                          {
                            type: 'gcds' as const,
                            label: l('Galactic Center Defense System (GCDS)', '银河核心防御系统 (GCDS)'),
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
                              {l('Default', '标准')}
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
                              {l('Advanced', '进阶')}
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
                              {l('Random', '随机')}
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
                              title={
                                !hasRemnants
                                  ? l('Remnants Blueprint requires Remnants of Worlds Afar expansion', '遗迹蓝图需要启用“远方世界遗迹”扩展')
                                  : l('Remnants blueprint variant', '遗迹扩展变体蓝图')
                              }
                            >
                              {l('Rem', '遗迹')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!hasRemnants && (
                      <div className="text-[10px] text-slate-500 italic">
                        {l('Remnants Blueprint requires Remnants of Worlds Afar expansion', '遗迹蓝图需要启用“远方世界遗迹”扩展')}
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
                  {l('Cancel', '取消')}
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  <span>
                    {gameMode === 'local'
                      ? l('Launch Galactic Conflict (Local Hotseat)', '开启银河冲突（本地热座）')
                      : l('Launch Galactic Conflict (Enter Waiting Room)', '开启银河冲突（进入等待室）')}
                  </span>
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
                  <h2 className="text-xl font-display font-bold text-white">{l('Join Other Games', '加入其他对局')}</h2>
                  <p className="text-xs text-slate-400">
                    {l(
                      'Tables that are waiting for players (not started yet). Select an open seat to join.',
                      '正在等待玩家加入的未开局房间。选择一个空余席位即可入座。'
                    )}
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
                  placeholder={l('Code (e.g. 101)', '房间号（如 101）')}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-400 w-32"
                />
                <select
                  value={joinSeat.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      if (!canUserUseHotseat(currentUser.role)) {
                        alert(l(
                          'Only administrators are allowed to use the hotseat function in online games.',
                          '联机对局中仅管理员可使用热座功能。'
                        ));
                        return;
                      }
                      setJoinSeat(val);
                    } else if (val === 'spectator') {
                      setJoinSeat(val);
                    } else {
                      if (currentUser.role === 'guest') {
                        alert(l(
                          'Guest players can only join online multiplayer games as a spectator. Please log in or register.',
                          '游客仅能作为观战者加入联机对局，请先登录或注册账号。'
                        ));
                        setShowUserModal(true);
                        return;
                      }
                      setJoinSeat(parseInt(val, 10));
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-xs font-medium rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-400"
                >
                  {[0, 1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={s.toString()} disabled={currentUser.role === 'guest'}>
                      {l(`Seat ${s + 1} (Player ${s + 1})`, `席位 ${s + 1}（玩家 ${s + 1}）`)}
                      {currentUser.role === 'guest' ? l(' (Spectator Only)', '（仅可观战）') : ''}
                    </option>
                  ))}
                  <option value="all" disabled={!canUserUseHotseat(currentUser.role)}>
                    {l('Hotseat / All Players', '热座 / 全部席位')}
                    {!canUserUseHotseat(currentUser.role) ? l(' (Admin Only)', '（仅管理员）') : ''}
                  </option>
                  <option value="spectator">{l('Spectator / Observer', '观战者 / 旁观')}</option>
                </select>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? l('Joining...', '加入中...') : l('Quick Join', '快速加入')}
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
                <h3 className="text-base font-bold text-slate-300">{l('No Tables Waiting for Players', '暂无等待中的牌桌')}</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {l(
                    'There are currently no open tables waiting for players. Establish a new table and invite commanders to launch a match!',
                    '目前没有空余席位的房间。新建一个牌桌并邀请其他指挥官开战吧！'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('create')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{l('Create New Game', '创建新对局')}</span>
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
                            {l(`Table #${table.tableNumber || table.id}`, `#${table.tableNumber || table.id} 号桌`)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            {occupiedSeats.size} / {table.playerCount} {l('Seated', '已入座')}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {table.playerNames && table.playerNames.length > 0
                            ? table.playerNames.join(', ')
                            : `${table.playerCount} ${l('Players', '名玩家')}`}
                        </div>
                      </div>

                      {/* Enabled Expansions List (Bug 222) */}
                      {(() => {
                        const expansions = getTableExpansions(table);
                        return (
                          <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                              {l('Expansions Enabled', '已启用扩展')}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {expansions.length === 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400">
                                  {l('Base Game (No Expansions)', '基础版（无扩展）')}
                                </span>
                              ) : (
                                expansions.map((expId) => {
                                  const def = AVAILABLE_EXPANSIONS.find((e) => e.id === expId);
                                  return (
                                    <span
                                      key={expId}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/70 border border-purple-700/60 text-purple-300"
                                      title={def?.description || expId}
                                    >
                                      {def ? translateExpansionName(def.id, def.name, language) : expId}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Seating Roster with Join Buttons */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                          {l('Seats & Availability', '席位与空缺状态')}
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
                                  <div className="text-[9px] opacity-70">{l(`Seat ${sIdx + 1}`, `席位 ${sIdx + 1}`)}</div>
                                  <div className="truncate font-semibold">{isMySeat ? l('YOU', '你') : occupant?.username || l('Taken', '已占用')}</div>
                                </div>
                              );
                            }

                            if (currentUser.role === 'guest') {
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    alert(l(
                                      'Guest players can only join online multiplayer games as a spectator. Please log in or register to take a player seat.',
                                      '游客仅能作为观战者加入联机对局，请先登录或注册以占用玩家席位。'
                                    ));
                                    setShowUserModal(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-center text-[10px] font-medium transition cursor-pointer"
                                  title={l('Login required to claim a player seat in online games', '联机对局需登录后方可认领玩家席位')}
                                >
                                  <div>{l(`Seat ${sIdx + 1}`, `席位 ${sIdx + 1}`)}</div>
                                  <div className="text-[9px] text-slate-500 flex items-center justify-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {l('Login', '登录')}
                                  </div>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleJoinFromList(table.id, sIdx)}
                                className="p-1.5 rounded-lg border border-blue-500/50 hover:border-blue-400 bg-blue-950/50 hover:bg-blue-900/80 text-blue-200 text-center text-[10px] font-bold transition cursor-pointer"
                              >
                                <div>{l(`Seat ${sIdx + 1}`, `席位 ${sIdx + 1}`)}</div>
                                <div className="text-[9px] text-blue-400 uppercase">{l('Join', '加入')}</div>
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
                            onClick={() => handleJoinFromList(table.id, 'spectator')}
                            className="px-2 py-1 border rounded text-[10px] font-semibold transition flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title={l('Join this game as a spectator', '以观战者身份加入对局')}
                          >
                            <Eye className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{l('Spectate', '观战')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={!canUserUseHotseat(currentUser.role)}
                            onClick={() => {
                              if (canUserUseHotseat(currentUser.role)) {
                                handleJoinFromList(table.id, 'all');
                              }
                            }}
                            title={!canUserUseHotseat(currentUser.role) ? l('Hotseat is restricted to administrators', '热座模式仅限管理员使用') : l('Join as Hotseat (Control All)', '以热座模式加入（控制全部席位）')}
                            className={`px-2 py-1 border rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                              !canUserUseHotseat(currentUser.role)
                                ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-60'
                                : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-300 hover:text-white cursor-pointer'
                            }`}
                          >
                            {!canUserUseHotseat(currentUser.role) && <Lock className="w-2.5 h-2.5" />}
                            <span>{l('Hotseat', '热座')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(table.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>{copiedLinkTableId === table.id ? l('Copied!', '已复制！') : l('Share', '分享')}</span>
                          </button>
                        </div>

                        {isUserSeated && (
                          <button
                            type="button"
                            onClick={() => onJoinTable(table.id, typeof myMembership?.seat === 'number' ? myMembership.seat : 0)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                          >
                            <span>{l('Rejoin Table', '回到牌桌')}</span>
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
                  <h2 className="text-xl font-display font-bold text-white">{l('My Game Tables', '我的对局牌桌')}</h2>
                  <p className="text-xs text-slate-400">
                    {l(
                      'All tables you are registered in across waiting rooms, active matches, and finished games.',
                      '你参与的所有房间，包括等待中、进行中及已结束的对局。'
                    )}
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
                    {status === 'need_players'
                      ? l('Waiting', '等待中')
                      : status === 'running'
                      ? l('Active', '进行中')
                      : status === 'done'
                      ? l('Done', '已结束')
                      : l('All', '全部')}
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

            {/* If not logged in and no local games, display required login prompt */}
            {!isUserLoggedIn && myTables.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <Lock className="w-10 h-10 text-amber-400 mb-1" />
                <h3 className="text-base font-bold text-white">{l('Login Required', '需要登录')}</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {l(
                    'You must be logged in to view and rejoin your personalized online tables. Please log in or register.',
                    '请先登录或注册账号以查看和重连您的在线牌桌。'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowUserModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{l('Log In / Register', '登录 / 注册')}</span>
                </button>
              </div>
            ) : filteredMyTables.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center gap-3 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Bookmark className="w-10 h-10 text-slate-600 mb-1" />
                <h3 className="text-base font-bold text-slate-300">{l('No Tables Found', '未找到符合条件的牌桌')}</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {l(
                    'You are not currently participating in any tables under this category.',
                    '该分类下暂无你参与的对局。'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection('create')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{l('Create a New Table', '创建新牌桌')}</span>
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
                          <span className="text-base font-display font-black text-white flex items-center gap-2">
                            {l(`Table #${table.tableNumber || table.id}`, `#${table.tableNumber || table.id} 号桌`)}
                            {table.isLocalGame && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
                                {l('Local Hotseat', '本地热座')}
                              </span>
                            )}
                          </span>

                          {isMyTurn ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 fill-current" /> {l('YOUR TURN', '轮到你了')}
                            </span>
                          ) : statusCat === 'need_players' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              {l('Waiting for Players', '等待玩家')} ({getTableOccupiedSeats(table).size}/{table.playerCount})
                            </span>
                          ) : statusCat === 'running' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                              {l(`Round ${table.round}`, `第 ${table.round} 回合`)} • {translateGamePhase(table.phase || '', language)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                              {l('Completed', '已结束')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          <span>{l('Seated as: ', '当前身份：')}</span>
                          <span className="text-slate-200 font-bold">
                            {table.isLocalGame
                              ? l('Commander (Hotseat - All Factions)', '总指挥官（热座模式 - 全部势力）')
                              : myMem?.seat === 'all'
                              ? l('Admin Hotseat', '管理员热座')
                              : l(`Seat ${mySeatNum + 1}`, `席位 ${mySeatNum + 1}`)}
                          </span>
                          {table.activePlayerName && statusCat === 'running' && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {l('Active Player:', '当前行动玩家：')}{' '}
                              <span className="text-slate-300 font-semibold">{table.activePlayerName}</span>
                            </div>
                          )}
                        </div>

                        {/* Every Seat with Seat Number, Player Faction (or Still drafting), and Player Name (Bug 221) */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                            {l('Seats & Roster', '席位与玩家阵容')}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {getTableSeatsInfo(table, currentUser.id).map((seat) => (
                              <div
                                key={seat.seatNumber}
                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                  seat.isMySeat
                                    ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-200'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-800/90 text-slate-400 shrink-0 font-bold">
                                    {l(`Seat ${seat.seatNumber}`, `席位 ${seat.seatNumber}`)}
                                  </span>
                                  <span className="truncate font-medium text-slate-200">
                                    {`${seat.playerName}${seat.isMySeat ? l(' (You)', '（你）') : ''}`}
                                  </span>
                                </div>
                                <span
                                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    seat.isDrafting
                                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                      : 'bg-slate-800 border border-slate-700/60 text-slate-300'
                                  }`}
                                >
                                  {seat.isDrafting ? l('Still drafting', '仍在轮抽') : seat.factionName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Button Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canUserUseHotseat(currentUser.role, table.isLocalGame)}
                            onClick={() => {
                              if (canUserUseHotseat(currentUser.role, table.isLocalGame)) {
                                handleJoinFromList(table.id, 'all');
                              }
                            }}
                            title={
                              !canUserUseHotseat(currentUser.role, table.isLocalGame)
                                ? l('Hotseat is restricted to administrators', '热座模式仅限管理员使用')
                                : l('Join as Hotseat (Control All)', '以热座模式加入（控制全部）')
                            }
                            className={`px-2 py-1 border rounded text-[10px] font-semibold transition flex items-center gap-1 ${
                              !canUserUseHotseat(currentUser.role, table.isLocalGame)
                                ? 'bg-slate-950/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-60'
                                : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/60 text-purple-300 hover:text-white cursor-pointer'
                            }`}
                          >
                            {!canUserUseHotseat(currentUser.role, table.isLocalGame) && <Lock className="w-2.5 h-2.5" />}
                            <span>{l('Hotseat', '热座')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(table.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs transition cursor-pointer"
                            title={l('Copy Table Link', '复制牌桌邀请链接')}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {(currentUser.role === 'admin' || (myMem as any)?.isCreator) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(table.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 text-xs transition cursor-pointer"
                              title={l('Delete Table', '删除牌桌')}
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
                              <span>{l('Replay', '战局回放')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onJoinTable(table.id, table.isLocalGame ? 'all' : (myMem?.seat ?? 0))}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow flex items-center gap-1.5 cursor-pointer ${
                              isMyTurn
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/30'
                            }`}
                          >
                            <span>
                              {table.isLocalGame
                                ? l('Resume Local Game', '继续本地对局')
                                : isMyTurn
                                ? l('Take Turn', '进入行动')
                                : statusCat === 'need_players'
                                ? l('Rejoin Waiting Room', '回到等待室')
                                : l('Open Game', '进入对局')}
                            </span>
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
