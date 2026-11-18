import React, { useState, useEffect } from 'react';
import { GameState } from '../../engine/types/state';
import { UserSession } from '../../engine/types/user';
import { FactionInfo } from '../../engine/types/faction';
import {
  getTableNumber,
  getTableOccupiedSeats,
  isSeatTaken,
  saveGameState,
  fetchTableFromServer,
  loadTable,
  deleteSavedTable,
  getSyncChannel,
  leaveTable,
} from '../../engine/rules/persistence';
import {
  createInitialGame,
  getAvailableFactions,
  isFactionAvailable,
  areFactionsConflictingColor,
  ALL_FACTIONS,
  FACTION_COLOR_GROUP,
} from '../../engine/rules/setup';
import {
  AVAILABLE_EXPANSIONS,
  ExpansionId,
} from '../../engine/rules/expansions';
import {
  NeutralShipType,
  NeutralShipSelection,
  NeutralShipSelectionConfig,
} from '../../engine/rules/neutralShips';
import {
  Users,
  Copy,
  Check,
  Play,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Shield,
  User,
  Clock,
  CheckCircle2,
  Lock,
  Share2,
  Trash2,
  LogOut,
  Sliders,
  Dices,
  Shuffle,
  X,
  Info,
  Layers,
  Zap,
  Swords,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { PlayerPresenceIcon, isPlayerSeatOnline } from '../common/PlayerPresenceIcon';
import {
  translateFactionName,
  translateFactionTrait,
  translateExpansionName,
} from '../../i18n/catalogTranslations';

export interface TableWaitingRoomProps {
  state: GameState;
  currentSeat: number | 'all' | 'spectator';
  currentUser: UserSession;
  onStartGame: () => void;
  onClaimSeat: (seatIndex: number) => void;
  onReturnToLobby: () => void;
  onOpenGallery?: () => void;
  onOpenCombatSimulator?: () => void;
  onUpdateState?: (newState: GameState) => void;
  onCancelTable?: () => void;
  onLeaveTable?: () => void;
  onOpenLogin?: () => void;
  onlineByUserId?: Record<string, boolean>;
}

export const TableWaitingRoom: React.FC<TableWaitingRoomProps> = ({
  state,
  currentSeat,
  currentUser,
  onStartGame,
  onClaimSeat,
  onReturnToLobby,
  onOpenGallery,
  onOpenCombatSimulator,
  onUpdateState,
  onCancelTable,
  onLeaveTable,
  onOpenLogin,
  onlineByUserId,
}) => {
  const { language, l } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedSeatForFactionModal, setSelectedSeatForFactionModal] = useState<number | null>(null);
  const [factionCategoryFilter, setFactionCategoryFilter] = useState<'all' | 'alien' | 'human'>('all');

  const tableNumber = getTableNumber(state);
  const playerCount = state.players.length;
  const occupiedSeats = getTableOccupiedSeats(state as any);
  const occupiedCount = occupiedSeats.size;
  const allSeatsTaken = occupiedCount >= playerCount;

  const isHost =
    Boolean(state.creatorUserId && state.creatorUserId === currentUser.id) ||
    Boolean((state.members || []).find((m) => m.isCreator)?.userId === currentUser.id) ||
    (state.members && state.members.length > 0 && state.members[0].userId === currentUser.id) ||
    currentSeat === 0 ||
    currentUser.role === 'admin';

  const hostMember = (state.members || []).find((m) => m.isCreator) || state.members?.[0];
  const hostName =
    state.creatorUsername || hostMember?.username || hostMember?.name || 'Table Host';

  // Real-time synchronization while in waiting room
  useEffect(() => {
    const handleSync = async () => {
      const remote = await fetchTableFromServer(state.id, false, state.savedAt);
      if (remote && onUpdateState) {
        onUpdateState(remote);
      } else {
        const local = loadTable(state.id);
        if (!local && typeof window !== 'undefined') {
          alert('This table has been cancelled by the host.');
          onReturnToLobby();
        }
      }
    };

    const interval = setInterval(handleSync, 2500);

    const channel = getSyncChannel();
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'ECLIPSE_TABLE_CANCELLED' && event.data?.tableId === state.id) {
        alert('This table has been cancelled by the host.');
        onReturnToLobby();
        return;
      }
      if (event.data?.type === 'ECLIPSE_GAME_SYNC' && event.data?.tableId === state.id) {
        handleSync();
      }
    };
    if (channel) {
      channel.addEventListener('message', handleBroadcast);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        channel.removeEventListener('message', handleBroadcast);
      }
    };
  }, [state.id, onUpdateState, onReturnToLobby]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?table=${state.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleUpdateSettings = (updates: {
    playerCount?: number;
    expansions?: string[];
    neutralShips?: NeutralShipSelectionConfig;
    isDraftMode?: boolean;
    factions?: string[];
  }) => {
    const newPlayerCount = updates.playerCount ?? state.players.length;
    const newExpansions = updates.expansions ?? state.expansions ?? [];
    let newNeutralShips = updates.neutralShips ?? state.neutralShipSelections ?? {
      ancient: 'default',
      guardian: 'default',
      gcds: 'default',
    };
    if (!newExpansions.includes('remnants_of_worlds_afar')) {
      newNeutralShips = {
        ancient: newNeutralShips.ancient === 'expert' ? 'default' : newNeutralShips.ancient,
        guardian: newNeutralShips.guardian === 'expert' ? 'default' : newNeutralShips.guardian,
        gcds: newNeutralShips.gcds === 'expert' ? 'default' : newNeutralShips.gcds,
      };
    }
    const newDraftMode = updates.isDraftMode ?? Boolean(state.isDraftMode);

    const availableFactions = getAvailableFactions(newExpansions);

    let selectedFactions: string[] = [];
    if (!newDraftMode) {
      if (updates.factions) {
        selectedFactions = [...updates.factions].slice(0, newPlayerCount);
      } else {
        // Retain existing players' factions if valid and not conflicting
        const existingFactions = state.players.map((p) => p.faction?.id || 'terran_federation');
        const resolved: string[] = [];
        for (let i = 0; i < newPlayerCount; i++) {
          const cand = existingFactions[i];
          if (
            cand &&
            isFactionAvailable(cand, newExpansions) &&
            !resolved.some((r) => areFactionsConflictingColor(r, cand))
          ) {
            resolved.push(cand);
          } else {
            // Find first available non-conflicting faction
            const replacement = availableFactions.find(
              (f) => !resolved.some((r) => areFactionsConflictingColor(r, f.id))
            );
            resolved.push(replacement ? replacement.id : (availableFactions[i]?.id || 'terran_federation'));
          }
        }
        selectedFactions = resolved;
      }
    }

    const reconfigured = createInitialGame(
      newPlayerCount,
      selectedFactions,
      newExpansions,
      newNeutralShips,
      newDraftMode
    );

    reconfigured.id = state.id;
    reconfigured.tableNumber = state.tableNumber || getTableNumber(state);
    reconfigured.creatorUserId = state.creatorUserId || currentUser.id;
    reconfigured.creatorUsername = state.creatorUsername || currentUser.username;
    reconfigured.isGameStarted = false;

    // Retain valid seated members whose seat is < newPlayerCount
    const validMembers = (state.members || []).filter(
      (m) => typeof m.seat !== 'number' || m.seat < newPlayerCount
    );
    reconfigured.members = validMembers;

    for (let i = 0; i < reconfigured.players.length; i++) {
      const member = validMembers.find((m) => m.seat === i);
      if (member) {
        reconfigured.players[i].name = member.username || member.name || reconfigured.players[i].faction.name;
      }
    }

    saveGameState(reconfigured);
    if (onUpdateState) {
      onUpdateState(reconfigured);
    }
  };

  const handleSelectFactionForSeat = (seatIndex: number, newFactionId: string) => {
    if (state.isDraftMode) return;
    const currentFactions = state.players.map((p) => p.faction?.id || 'terran_federation');
    const updatedFactions = [...currentFactions];
    updatedFactions[seatIndex] = newFactionId;
    handleUpdateSettings({ factions: updatedFactions });
    setSelectedSeatForFactionModal(null);
  };

  const handleRandomizeFactions = () => {
    if (state.isDraftMode) return;
    const available = [...getAvailableFactions(state.expansions || [])];
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j]!, available[i]!];
    }
    const picked: string[] = [];
    for (const f of available) {
      if (!picked.some((p) => areFactionsConflictingColor(p, f.id))) {
        picked.push(f.id);
        if (picked.length === playerCount) break;
      }
    }
    if (picked.length === playerCount) {
      handleUpdateSettings({ factions: picked });
    }
  };

  const getFactionConflict = (factionId: string, seatIndex: number): { isConflicting: boolean; reason?: string } => {
    for (let i = 0; i < state.players.length; i++) {
      if (i === seatIndex) continue;
      const otherId = state.players[i]?.faction?.id;
      if (!otherId) continue;
      if (otherId === factionId) {
        return { isConflicting: true, reason: `Taken by Seat ${i + 1}` };
      }
      if (areFactionsConflictingColor(otherId, factionId)) {
        const otherName = state.players[i]?.faction?.name || `Seat ${i + 1}`;
        return { isConflicting: true, reason: `Color conflict with Seat ${i + 1} (${otherName})` };
      }
    }
    return { isConflicting: false };
  };

  const handleCancelTable = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Are you sure you want to cancel this table? All seated commanders will be returned to the lobby.'
      );
      if (!ok) return;
    }
    deleteSavedTable(state.id);
    if (onCancelTable) {
      onCancelTable();
    } else {
      onReturnToLobby();
    }
  };

  const handleLeaveTable = async () => {
    if (onLeaveTable) {
      onLeaveTable();
    } else {
      const leavingMember = (state.members || []).find((m) => m.userId === currentUser.id);
      const mySeat = leavingMember?.seat;
      const updatedMembers = (state.members || []).filter((m) => m.userId !== currentUser.id);
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
      if (onUpdateState) onUpdateState(updated);
      await leaveTable(state.id, currentUser.id);
      onReturnToLobby();
    }
  };

  const isUserSeated =
    currentSeat === 'all' ||
    (typeof currentSeat === 'number' && currentSeat >= 0 && currentSeat < playerCount) ||
    Boolean(
      (state.members || []).some(
        (m) => m.userId === currentUser.id && typeof m.seat === 'number' && m.seat >= 0
      )
    );

  const activeExpansionsCount = state.expansions?.length || 0;
  const activeExpansionsList =
    activeExpansionsCount > 0
      ? state.expansions!
          .map((id) => {
            const exp = AVAILABLE_EXPANSIONS.find((e) => e.id === id);
            return exp ? exp.name : id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          })
          .join(', ')
      : 'Base Game (No Expansions)';

  const hasRemnants = Boolean(
    state.expansions && state.expansions.includes('remnants_of_worlds_afar')
  );
  const currentNeutrals: NeutralShipSelectionConfig = state.neutralShipSelections || {
    ancient: 'default',
    guardian: 'default',
    gcds: 'default',
  };

  const toggleExpansion = (expId: string) => {
    const current = state.expansions || [];
    const next = current.includes(expId)
      ? current.filter((id) => id !== expId)
      : [...current, expId];
    handleUpdateSettings({ expansions: next });
  };

  const selectAllExpansions = () => {
    handleUpdateSettings({ expansions: AVAILABLE_EXPANSIONS.map((e) => e.id) });
  };

  const clearAllExpansions = () => {
    handleUpdateSettings({ expansions: [] });
  };

  const setNeutralShip = (type: 'ancient' | 'guardian' | 'gcds', val: NeutralShipSelection) => {
    const next = {
      ...currentNeutrals,
      [type]: val,
    };
    handleUpdateSettings({ neutralShips: next });
  };

  const availableFactions = getAvailableFactions(state.expansions || []);
  const alienFactions = availableFactions.filter((f) => !f.isHuman);
  const humanFactions = availableFactions.filter((f) => f.isHuman);

  // NPC Blueprint specification with stat preview strings
  const neutralBlueprintSpecs = [
    {
      type: 'ancient' as const,
      label: 'Ancient',
      def: 'Init 2, 2H, 2Y (+1)',
      adv: 'Init 1, 3H, 1O (+1)',
      exp: 'Init 3, 2H, 1Y (+2)',
    },
    {
      type: 'guardian' as const,
      label: 'Guardian',
      def: 'Init 3, 3H, 3Y (+2/-1)',
      adv: 'Init 1, 4H, 2O Msl + 1R (+1)',
      exp: 'Init 3, 4H, 2O (+1/-1)',
    },
    {
      type: 'gcds' as const,
      label: 'GCDS',
      def: 'Init 0, 7H, 4Y (+2)',
      adv: 'Init 2, 4H, 4Y Msl + 1R (+2)',
      exp: 'Init 3, 5H, 2O (+2/-2)',
    },
  ];

  return (
    <div className="min-h-screen min-h-dvh h-full w-full pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-10 relative overflow-x-hidden overflow-y-auto selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Starfield and Nebula Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(168,85,247,0.10),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.08),transparent_40%)] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-4xl flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReturnToLobby}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-bold tracking-wider uppercase transition shadow cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{l('Back to Lobby', '返回大厅')}</span>
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={handleCancelTable}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-500/50 hover:bg-rose-900/80 text-rose-300 hover:text-white text-xs font-bold tracking-wider uppercase transition shadow shadow-rose-950/30 cursor-pointer"
              title={l('Cancel this table and return all commanders to the lobby', '解散此房间并让所有指挥官返回大厅')}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{l('Cancel Table', '解散牌桌')}</span>
            </button>
          ) : isUserSeated ? (
            <button
              type="button"
              onClick={handleLeaveTable}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/70 border border-amber-500/50 hover:bg-amber-900/80 text-amber-300 hover:text-white text-xs font-bold tracking-wider uppercase transition shadow shadow-amber-950/30 cursor-pointer"
              title={l('Vacate your seat and return to the lobby', '退出席位并返回大厅')}
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>{l('Leave Table', '离开牌桌')}</span>
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher compact />

          {onOpenGallery && (
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-bold tracking-wider uppercase transition shadow shadow-cyan-950/30 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>📚 {l('Gallery', '图鉴')}</span>
            </button>
          )}

          {onOpenCombatSimulator && (
            <button
              type="button"
              onClick={onOpenCombatSimulator}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-red-500/40 hover:border-red-400 text-red-300 hover:text-red-200 text-xs font-bold tracking-wider uppercase transition shadow shadow-red-950/30 cursor-pointer"
              title={l('Open Monte Carlo Combat Simulator', '打开蒙特卡洛战斗模拟器')}
            >
              <Swords className="w-4 h-4 text-red-400" />
              <span>⚔️ {l('Simulator', '战斗模拟')}</span>
            </button>
          )}

          {onOpenLogin && currentUser.role === 'guest' && (
            <button
              type="button"
              data-testid="waiting-room-login-btn"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black tracking-wider uppercase transition shadow shadow-emerald-950/30 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>{l('Sign In to Join Seat', '登录并入座')}</span>
            </button>
          )}

          <div
            onClick={onOpenLogin}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 ${
              onOpenLogin ? 'cursor-pointer hover:border-slate-600' : ''
            }`}
            title={onOpenLogin ? l('Switch account / Sign in', '切换账号 / 登录') : undefined}
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentUser.username}</span>
            <span className="text-[10px] opacity-70 bg-black/40 px-1 py-0.5 rounded">
              ({currentUser.role})
            </span>
          </div>
        </div>
      </header>

      {/* Main Table Staging Card */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 sm:p-8 shadow-2xl shadow-cyan-950/20 flex flex-col gap-6">
        {/* Title & Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>{l('Game Table Room Menu (Waiting for Players)', '牌桌准备室（等待玩家加入）')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              {l(`Table #${tableNumber}`, `#${tableNumber} 号桌`)}
              <span className="text-slate-500 text-lg font-mono font-normal ml-2.5">
                ({state.id})
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {l('Host:', '房主：')} <span className="text-cyan-400 font-semibold">{hostName}</span>
              {isHost && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800 font-bold uppercase">
                  {l('You are Host', '你是房主')}
                </span>
              )}
              <span className="mx-2 text-slate-600">|</span>
              {l('Expansions:', '扩展：')} <span className="text-slate-300 font-semibold">{activeExpansionsList}</span>
            </p>
          </div>

          <div>
            {allSeatsTaken ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-950/40 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{l(`All Seats Taken (${occupiedCount}/${playerCount})`, `席位已满 (${occupiedCount}/${playerCount})`)}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wider uppercase shadow-lg shadow-amber-950/30">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>{l(`Waiting for Players (${occupiedCount}/${playerCount})`, `等待玩家入座 (${occupiedCount}/${playerCount})`)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. NUMBER OF PLAYERS (THE VERY FIRST COMPONENT) */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white block">{l('Number of Players', '玩家人数')}</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                {playerCount} {l('Positions', '个席位')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {l('Determines table seats and galaxy starting sector layout (2 to 6).', '决定席位数量与银河初始星系版图布局（2 至 6 人）。')}
            </p>
          </div>

          {isHost ? (
            <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0">
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleUpdateSettings({ playerCount: count })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    playerCount === count
                      ? 'bg-cyan-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {count}{l('P', '人')}
                </button>
              ))}
            </div>
          ) : (
            <span className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
              {playerCount} {l('Players', '名玩家')}
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. COMMANDER ROSTER (EACH PLAYER OCCUPIES ONE FULL ROW) */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              {l(`Commander Roster (${occupiedCount} of ${playerCount} Seated)`, `指挥官阵容 (${occupiedCount}/${playerCount} 已入座)`)}
            </h2>
            <span className="text-[11px] text-slate-500 italic">
              {allSeatsTaken
                ? l('All positions filled. Game is ready to commence.', '全部席位已满，可随时开始游戏。')
                : l(`${playerCount - occupiedCount} open seat(s) remaining`, `剩余 ${playerCount - occupiedCount} 个空余席位`)}
            </span>
          </div>

          {/* Single Column Row Stack: Each player occupies one row */}
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: playerCount }).map((_, sIdx) => {
              const occupant = (state.members || []).find((m) => m.seat === sIdx);
              const player = state.players[sIdx];
              const isOccupied = Boolean(occupant);
              const isMe = occupant?.userId === currentUser.id;
              const canEditThisSeat = isHost || isMe;

              return (
                <div
                  key={sIdx}
                  className={`rounded-xl border p-3.5 sm:p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isOccupied
                      ? isMe
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/20'
                        : 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-950/30 border-dashed border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {/* Left Column: Seat Number & Commander Identity */}
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="flex flex-col items-center justify-center w-12 py-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-500 leading-none">
                        {l('Seat', '席位')}
                      </span>
                      <span className="text-base font-black text-white leading-none mt-0.5">
                        {sIdx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const seatOnline = isPlayerSeatOnline({
                            isLocalGame: state.isLocalGame,
                            isBot: player?.isBot,
                            seatOccupant: occupant,
                            currentUserId: currentUser?.id,
                            onlineByUserId,
                          });
                          return (
                            <PlayerPresenceIcon
                              color={player?.faction?.defaultColor || '#38bdf8'}
                              isOnline={seatOnline}
                              size={11}
                              title={seatOnline ? l('Online', '在线') : l('Offline (Eclipse)', '离线（蚀）')}
                              testId={`waiting-presence-${sIdx}`}
                            />
                          );
                        })()}
                        <span className="text-sm font-bold text-white truncate">
                          {isOccupied ? occupant?.username || occupant?.name : l('Waiting for commander...', '等待指挥官入座...')}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800 shrink-0">
                            {l('YOU', '你')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>
                          {isOccupied
                            ? occupant?.isCreator || sIdx === 0
                              ? l('Host Commander', '房主')
                              : l('Joined Commander', '已加入')
                            : l('Open Seat', '空席')}
                        </span>
                        <span className="text-slate-600">•</span>
                        {isOccupied ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <Check className="w-3 h-3" />
                            <span>{l('Ready', '就绪')}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-400">
                            {l('Awaiting Player', '虚位以待')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Faction Details or Draft Mode Indicator */}
                  <div className="flex-1 md:px-4 md:border-l md:border-r border-slate-800/80 min-w-0">
                    {state.isDraftMode ? (
                      <div className="flex items-center gap-2 text-purple-300 text-xs py-1">
                        <Dices className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-[11px] font-medium leading-relaxed">
                          {l(
                            'Draft Mode Active — Drafts faction upon entering galaxy in reverse turn order',
                            '种族轮抽已启用 — 进入星图后将按逆行动顺序轮抽种族'
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 py-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 border border-slate-600/80"
                            style={{ backgroundColor: player?.faction?.defaultColor || '#38bdf8' }}
                          />
                          <span className="text-xs font-bold text-slate-200">
                            {player?.faction
                              ? translateFactionName(player.faction.id, player.faction.name, language)
                              : translateFactionName('terran', 'Terran Federation', language)}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-slate-800">
                            {player?.faction?.isHuman ? l('Human', '人类') : l('Alien', '异星')}
                          </span>
                        </div>
                        {player?.faction?.traitDescription && (
                          <p className="text-[10px] text-slate-400 truncate max-w-xl">
                            {translateFactionTrait(player.faction.id, player.faction.traitDescription, language)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Faction Controls & Seat Claim Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!state.isDraftMode && (
                      canEditThisSeat ? (
                        <div className="flex items-center gap-1.5 w-full md:w-auto">
                          <select
                            value={player?.faction?.id || ''}
                            onChange={(e) => handleSelectFactionForSeat(sIdx, e.target.value)}
                            className="flex-1 md:w-44 bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none transition cursor-pointer"
                          >
                            <optgroup label={l('Alien Species', '异星种族')}>
                              {alienFactions.map((f) => {
                                const conflict = getFactionConflict(f.id, sIdx);
                                const isCurrent = player?.faction?.id === f.id;
                                return (
                                  <option
                                    key={f.id}
                                    value={f.id}
                                    disabled={conflict.isConflicting && !isCurrent}
                                  >
                                    {translateFactionName(f.id, f.name, language)} {conflict.isConflicting && !isCurrent ? `— [${conflict.reason}]` : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                            <optgroup label={l('Terran (Human) Factions', '人类势力')}>
                              {humanFactions.map((f) => {
                                const conflict = getFactionConflict(f.id, sIdx);
                                const isCurrent = player?.faction?.id === f.id;
                                return (
                                  <option
                                    key={f.id}
                                    value={f.id}
                                    disabled={conflict.isConflicting && !isCurrent}
                                  >
                                    {translateFactionName(f.id, f.name, language)} {conflict.isConflicting && !isCurrent ? `— [${conflict.reason}]` : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          </select>

                          <button
                            type="button"
                            onClick={() => setSelectedSeatForFactionModal(sIdx)}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 hover:bg-cyan-900/80 text-cyan-300 text-xs font-bold uppercase transition cursor-pointer shrink-0"
                            title={l('Browse all available faction cards', '浏览所有可选势力卡片')}
                          >
                            {l('Browse', '浏览')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          {isOccupied ? l('Chosen by commander', '由玩家自选') : l('Host can select', '房主可代选')}
                        </span>
                      )
                    )}

                    {!isOccupied && !isUserSeated && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentUser.role === 'guest') {
                            alert(l(
                              'Guest players can only join online multiplayer games as a spectator. Please log in or register to take a player seat.',
                              '游客仅能作为观战者加入联机对局，请先登录或注册以认领玩家席位。'
                            ));
                            return;
                          }
                          onClaimSeat(sIdx);
                        }}
                        className="py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition shadow cursor-pointer text-center"
                      >
                        {l(`Take Seat ${sIdx + 1}`, `认领席位 ${sIdx + 1}`)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TABLE CONFIGURATION (THE REST OF THE COMPONENTS IN ORDER) */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                {isHost ? l('Table Settings (Host Controls)', '牌桌配置（房主控制）') : l('Table Configuration', '牌桌配置详情')}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              {isHost
                ? l('Adjust settings anytime before launch. Changes broadcast live to all commanders.', '开局前可随时调整设置，修改将实时同步给所有玩家。')
                : l(`Settings managed by host (${hostName})`, `配置由房主 (${hostName}) 管理`)}
            </span>
          </div>

          {/* Faction Selection Mode (Standard vs Faction Draft Mode) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">{l('Faction Selection & Draft Mode', '势力选择与轮抽模式')}</span>
                <p className="text-[11px] text-slate-500">
                  {l('Choose civilizations in advance or enable competitive snake draft mode.', '提前预选种族势力或启用竞技轮抽模式。')}
                </p>
              </div>

              {isHost ? (
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleUpdateSettings({ isDraftMode: false })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      !state.isDraftMode
                        ? 'bg-cyan-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{l('Standard Mode', '标准模式')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSettings({ isDraftMode: true })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      state.isDraftMode
                        ? 'bg-purple-600 text-white shadow font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>{l('Faction Draft Mode', '种族轮抽模式')}</span>
                  </button>
                </div>
              ) : (
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    state.isDraftMode
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                      : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  }`}
                >
                  {state.isDraftMode ? l('Faction Draft Mode', '种族轮抽模式') : l('Standard Factions', '标准自选')}
                </span>
              )}
            </div>

            {/* Mode Banner & Host Quick Actions */}
            {state.isDraftMode ? (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-900/60 border border-purple-500/40 text-purple-300 shrink-0">
                  <Dices className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-purple-200">{l('Draft Mode Active', '种族轮抽已激活')}</div>
                  <p className="text-purple-300/80 text-[11px] leading-relaxed">
                    {l(
                      'Commanders will draft factions in reverse turn order directly upon entering the galaxy. Board positions are assigned on Ring 2 and drafting begins as soon as all seats are filled.',
                      '进入星图后，玩家将在确定二环星区顺位后按逆行动顺序轮流挑选势力。全员就座即可开启。'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-slate-200">{l('Standard Faction Selection', '标准势力选择')}</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {l(
                        'Choose your civilization for your seat in the roster above. Each commander must command a distinct color.',
                        '请在上方名单中为你的席位挑选势力。每位玩家须选择不同阵营颜色。'
                      )}
                    </p>
                  </div>
                </div>

                {isHost && (
                  <button
                    type="button"
                    onClick={handleRandomizeFactions}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer shrink-0 shadow"
                    title={l('Randomly assign valid, non-conflicting factions across all seats', '为所有席位随机分配互不冲突的合法种族')}
                  >
                    <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{l('Quick Randomize', '一键随机')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Expansions & Modules (All 9 Official Modules) */}
          <div className="pt-3 border-t border-slate-800/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 block">{l('Expansions & Modules', '扩展与可选模块')}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    {activeExpansionsCount === 0
                      ? l('Base Game (None)', '基础版（无扩展）')
                      : l(`${activeExpansionsCount} of ${AVAILABLE_EXPANSIONS.length} Active`, `已启用 ${activeExpansionsCount}/${AVAILABLE_EXPANSIONS.length}`)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {l('Default is Base Game (no expansions). Toggle official expansions below.', '默认仅使用基础版。可在下方自由开关官方扩展模块。')}
                </p>
              </div>

              {isHost && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllExpansions}
                    className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {l('Select All (9 Modules)', '全选 (9 模块)')}
                  </button>
                  <button
                    type="button"
                    onClick={clearAllExpansions}
                    className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition cursor-pointer ${
                      activeExpansionsCount === 0
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {l('Clear All (Base Game)', '清空（仅基础版）')}
                  </button>
                </div>
              )}
            </div>

            {/* Expansions 9-Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AVAILABLE_EXPANSIONS.map((exp) => {
                const active = Boolean(state.expansions?.includes(exp.id));
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => isHost && toggleExpansion(exp.id)}
                    disabled={!isHost}
                    title={exp.description}
                    className={`relative flex flex-col p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-200 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer hover:bg-slate-850'}`}
                  >
                    <div className="flex items-start justify-between gap-1 w-full">
                      <span className="font-bold text-xs text-white leading-snug">{translateExpansionName(exp.id, exp.name, language)}</span>
                      {active ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-slate-800 text-slate-300">
                        {exp.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {exp.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Neutral Ship Blueprints (NPCs) with stats preview and RND at the end */}
          <div className="pt-3 border-t border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {l('Neutral Ship Blueprints (NPCs)', '中立飞船蓝图 (NPC)')}
                </span>
                <p className="text-[11px] text-slate-500">
                  {l('Combat specifications and modules for Ancients, Guardians, and GCDS.', '配置远古舰船、守卫舰与银河核心防御系统的配置。')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {neutralBlueprintSpecs.map(({ type, label, def, adv, exp }) => {
                const currentSel = currentNeutrals[type];
                const zhLabel = type === 'ancient' ? '远古舰船' : type === 'guardian' ? '守卫舰' : '银河核心防御系统 (GCDS)';
                return (
                  <div
                    key={type}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-200">{l(label, zhLabel)}</span>
                      {isHost ? (
                        <div className="flex items-center gap-1">
                          {/* 1. DEF */}
                          <button
                            type="button"
                            onClick={() => setNeutralShip(type, 'default')}
                            title={`${l('Default', '标准')} (${def})`}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                              currentSel === 'default'
                                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400'
                                : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                            }`}
                          >
                            {l('Def', '标准')}
                          </button>
                          {/* 2. ADV */}
                          <button
                            type="button"
                            onClick={() => setNeutralShip(type, 'advanced')}
                            title={`${l('Advanced', '进阶')} (${adv})`}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                              currentSel === 'advanced'
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-400'
                                : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                            }`}
                          >
                            {l('Adv', '进阶')}
                          </button>
                          {/* 3. EXP */}
                          <button
                            type="button"
                            disabled={!hasRemnants}
                            onClick={() => {
                              if (hasRemnants) {
                                setNeutralShip(type, 'expert');
                              }
                            }}
                            title={
                              hasRemnants
                                ? `${l('Remnants', '遗迹')} (${exp})`
                                : l('Remnants Blueprint requires Remnants of Worlds Afar expansion', '遗迹蓝图需启用“远方世界遗迹”扩展')
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                              !hasRemnants
                                ? 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
                                : currentSel === 'expert'
                                ? 'bg-rose-500/25 text-rose-300 border border-rose-400 cursor-pointer'
                                : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800 cursor-pointer'
                            }`}
                          >
                            {l('Rem', '遗迹')}
                          </button>
                          {/* 4. RND (LAST PLACE) */}
                          <button
                            type="button"
                            onClick={() => setNeutralShip(type, 'random')}
                            title={
                              hasRemnants
                                ? l('Random (Default / Advanced / Remnants)', '随机（标准 / 进阶 / 遗迹）')
                                : l('Random (50% Default / 50% Advanced)', '随机（50% 标准 / 50% 进阶）')
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-0.5 ${
                              currentSel === 'random'
                                ? 'bg-purple-500/25 text-purple-300 border border-purple-400'
                                : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                            }`}
                          >
                            <Dices className="w-2.5 h-2.5" />
                            <span>{l('Rnd', '随机')}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
                          {currentSel}
                        </span>
                      )}
                    </div>

                    {/* Stats preview line */}
                    <div className="text-[10px] font-mono truncate pt-1 border-t border-slate-800/60">
                      {currentSel === 'default' && <span className="text-slate-400">{def}</span>}
                      {currentSel === 'advanced' && <span className="text-amber-300">{adv}</span>}
                      {currentSel === 'expert' && <span className="text-rose-300">{exp}</span>}
                      {currentSel === 'random' && (
                        <span className="text-purple-300 italic">
                          🎲 {l('Random', '随机')} {hasRemnants ? l('(Def/Adv/Rem)', '(标/进/遗)') : l('(50/50 Def/Adv)', '(各半标/进)')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Share Invite Link Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-left w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              {l('Invite Other Players', '邀请其他玩家')}
            </span>
            <p className="text-[11px] text-slate-400">
              {l(
                'This table is already available in "Join Other Games". Friends can also join directly via this link.',
                '此房间已列入“加入其他对局”列表，好友也可通过此链接直接入座。'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition shadow cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500 shadow-cyan-950/40'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? l('Link Copied!', '已复制链接！') : l('Copy Table Link', '复制牌桌链接')}</span>
            </button>
          </div>
        </div>

        {/* Start Game Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-col items-center gap-3">
          {!allSeatsTaken ? (
            <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{l('Only if all the seats are taken by players, the game can start.', '必须所有席位均有玩家入座后才能开局。')}</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-lg">
                {l(
                  `Waiting for ${playerCount - occupiedCount} more commander(s) to take their seats. Once all seats are occupied, galactic command will unlock.`,
                  `还需 ${playerCount - occupiedCount} 位指挥官认领席位，全员入座后即可开启银河征程。`
                )}
              </p>
              <button
                type="button"
                disabled
                className="mt-2 w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-800 text-slate-500 font-display font-black text-sm uppercase tracking-wider border border-slate-700 cursor-not-allowed opacity-60"
              >
                {l(`Waiting for Players (${occupiedCount}/${playerCount})`, `等待玩家入座 (${occupiedCount}/${playerCount})`)}
              </button>
            </div>
          ) : (
            <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{l('All commanders are seated! Galactic War is ready to begin.', '所有指挥官已就位！银河大战一触即发。')}</span>
              </div>
              <button
                type="button"
                onClick={onStartGame}
                className="mt-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 transition-all cursor-pointer flex items-center justify-center gap-2 animate-bounce"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{l('Start Game (Enter Galaxy)', '开始对局（进入星图）')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISUAL FACTION PICKER MODAL (FOR BROWSING ALL SPECIES & TRAITS) */}
      {/* ========================================================================= */}
      {selectedSeatForFactionModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  {l(`Select Faction for Seat ${selectedSeatForFactionModal + 1}`, `为席位 ${selectedSeatForFactionModal + 1} 选择势力`)}
                </h3>
                <p className="text-xs text-slate-400">
                  {l(`${availableFactions.length} factions available under current active expansions.`, `当前已启用扩展下共有 ${availableFactions.length} 个可选势力。`)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeatForFactionModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="px-5 pt-3 border-b border-slate-800/80 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFactionCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  factionCategoryFilter === 'all'
                    ? 'border-cyan-500 text-cyan-300 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {l(`All Civilizations (${availableFactions.length})`, `全部势力 (${availableFactions.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setFactionCategoryFilter('alien')}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  factionCategoryFilter === 'alien'
                    ? 'border-cyan-500 text-cyan-300 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {l(`Alien Species (${alienFactions.length})`, `异星种族 (${alienFactions.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setFactionCategoryFilter('human')}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition border-b-2 cursor-pointer ${
                  factionCategoryFilter === 'human'
                    ? 'border-cyan-500 text-cyan-300 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {l(`Terran / Human (${humanFactions.length})`, `人类势力 (${humanFactions.length})`)}
              </button>
            </div>

            {/* Faction Cards Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableFactions
                  .filter((f) => {
                    if (factionCategoryFilter === 'alien') return !f.isHuman;
                    if (factionCategoryFilter === 'human') return f.isHuman;
                    return true;
                  })
                  .map((faction) => {
                    const isSelected =
                      state.players[selectedSeatForFactionModal]?.faction?.id === faction.id;
                    const conflict = getFactionConflict(faction.id, selectedSeatForFactionModal);
                    const isDisabled = conflict.isConflicting && !isSelected;

                    return (
                      <div
                        key={faction.id}
                        className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/70 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                            : isDisabled
                            ? 'bg-slate-950/40 border-slate-900 opacity-50'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-slate-600/80"
                                style={{ backgroundColor: faction.defaultColor }}
                              />
                              <span className="font-bold text-sm text-white">{translateFactionName(faction.id, faction.name, language)}</span>
                            </div>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-800">
                              {faction.isHuman ? l('Human', '人类') : l('Alien', '异星')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {translateFactionTrait(faction.id, faction.traitDescription, language)}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              💰 {faction.startingResources.money}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              🧪 {faction.startingResources.science}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              ⚙️ {faction.startingResources.materials}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              🚀 {faction.startingColonyShips} {l('Ships', '殖民船')}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              ⚪ {faction.startingDiscs} {l('Discs', '圆片')}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <div className="w-full py-1.5 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-bold text-center">
                              {l('Currently Selected', '当前已选')}
                            </div>
                          ) : isDisabled ? (
                            <div className="w-full py-1.5 rounded-lg bg-slate-900 text-slate-500 text-[11px] font-medium text-center border border-slate-800">
                              {conflict.reason}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectFactionForSeat(selectedSeatForFactionModal, faction.id)}
                              className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow"
                            >
                              {l('Select Faction', '选择此势力')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSeatForFactionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase transition cursor-pointer"
              >
                {l('Close', '关闭')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
