import React, { useState, useEffect } from 'react';
import {
  listSavedTables,
  deleteSavedTable,
  fetchSavedTablesFromServer,
  SavedTableSummary,
  loadTable,
  loadTableByNumber,
  fetchTableFromServer,
} from '../../engine/rules/persistence';
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
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartNewGame,
  onJoinTable,
  onOpenGallery,
}) => {
  const [savedTables, setSavedTables] = useState<SavedTableSummary[]>(() => listSavedTables());

  useEffect(() => {
    fetchSavedTablesFromServer().then((remoteTables) => {
      if (remoteTables && remoteTables.length > 0) {
        setSavedTables((prev) => {
          const map = new Map<string, SavedTableSummary>();
          for (const t of prev) map.set(t.id, t);
          for (const t of remoteTables) map.set(t.id, t);
          return Array.from(map.values()).sort((a, b) => b.savedAt - a.savedAt);
        });
      }
    });
  }, []);

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
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>(['rift_cannon']);
  const [neutralShipSelections, setNeutralShipSelections] = useState<NeutralShipSelectionConfig>({
    ancient: 'default',
    guardian: 'default',
    gcds: 'default',
  });
  const hasRemnants = selectedExpansions.includes('remnants_of_worlds_afar');
  const availableFactions = getAvailableFactions(selectedExpansions);

  // Adaptive Display & Scrolling Options
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('eclipse_lobby_display_mode') as 'compact' | 'detailed') || 'compact';
    }
    return 'compact';
  });

  const [isScrollableMode, setIsScrollableMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eclipse_lobby_scrollable_mode');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [isExpansionsOpen, setIsExpansionsOpen] = useState<boolean>(true);
  const [isBlueprintsOpen, setIsBlueprintsOpen] = useState<boolean>(true);

  const toggleDisplayMode = () => {
    setDisplayMode((prev) => {
      const next = prev === 'compact' ? 'detailed' : 'compact';
      if (typeof window !== 'undefined') {
        localStorage.setItem('eclipse_lobby_display_mode', next);
      }
      return next;
    });
  };

  const toggleScrollableMode = () => {
    setIsScrollableMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('eclipse_lobby_scrollable_mode', String(next));
      }
      return next;
    });
  };

  const allExpansionIds = AVAILABLE_EXPANSIONS.map((e) => e.id);
  const allExpansionsSelected = allExpansionIds.every((id) => selectedExpansions.includes(id));

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

      // If any selected faction requires an expansion that is no longer active, replace it
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

  // Join Table State
  const [joinTableInput, setJoinTableInput] = useState<string>('');
  const [joinSeat, setJoinSeat] = useState<number | 'all' | 'spectator'>(0);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [copiedLinkTableId, setCopiedLinkTableId] = useState<string | null>(null);

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
    onStartNewGame(
      playerCount,
      isDraftMode ? [] : activeFactions,
      customTableId.trim() || `galaxy-${Date.now() % 1000}`,
      mySeat,
      selectedExpansions,
      sanitizedNeutralShips,
      isDraftMode
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
      setIsJoining(false);
      onJoinTable(loaded.id || id, joinSeat);
    } catch {
      setJoinError(`Table "${id}" does not exist.`);
      setIsJoining(false);
    }
  };

  const handleDelete = (tableId: string) => {
    deleteSavedTable(tableId);
    setSavedTables(listSavedTables());
  };

  const handleCopySeatLink = (tableId: string, seat: number | 'all') => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const seatParam = seat === 'all' ? '' : `&seat=${seat}`;
    const url = `${origin}${pathname}?table=${tableId}${seatParam}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkTableId(`${tableId}_${seat}`);
    setTimeout(() => setCopiedLinkTableId(null), 2500);
  };

  return (
    <div className="min-h-screen h-full w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-5 lg:p-8 relative overflow-x-hidden overflow-y-auto selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Starfield and Nebula Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(168,85,247,0.10),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(234,88,12,0.08),transparent_40%)] pointer-events-none" />

      {/* Main Header */}
      <header className="relative z-10 text-center max-w-3xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Second Dawn for the Galaxy</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-sm">
          ECLIPSE: WEB COMMAND
        </h1>
        <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
          High-fidelity multiplayer web adaptation of Eclipse: Second Dawn. Create tables, distribute private seat links to commanders, or play local hotseat.
        </p>
        {onOpenGallery && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-bold tracking-wider uppercase shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>📚 Galactic Gallery & Compendium</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Grid */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create New Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-2xl shadow-cyan-950/20 flex flex-col">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-100">
                  Establish New Sector Table
                </h2>
                <p className="text-[11px] text-slate-400">
                  Configure species factions, player count, and assign your starting seat.
                </p>
              </div>
            </div>

            {/* Adaptive Display & Scrolling Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={toggleDisplayMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                  displayMode === 'compact'
                    ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle between Compact adaptive layout and Detailed layout"
              >
                {displayMode === 'compact' ? (
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
                <span>{displayMode === 'compact' ? 'Compact' : 'Detailed'}</span>
              </button>

              <button
                type="button"
                onClick={toggleScrollableMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                  isScrollableMode
                    ? 'bg-purple-500/25 border border-purple-500/50 text-purple-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle internal scrollable container with fixed docked launch button"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isScrollableMode ? 'Scrollable' : 'Expanded'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLaunchGame} className="flex flex-col flex-1">
            {/* Scrollable Form Body Container */}
            <div
              className={`space-y-4 ${
                isScrollableMode
                  ? 'max-h-[min(540px,calc(100vh-280px))] overflow-y-auto pr-1.5 scrollbar-thin'
                  : ''
              }`}
            >
              {/* Table Name & Player Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Table ID / Code
                  </label>
                  <input
                    type="text"
                    value={customTableId}
                    onChange={(e) => setCustomTableId(e.target.value)}
                    placeholder="e.g. galaxy-101"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Player Count: <span className="text-cyan-400 font-bold">{playerCount} Commanders</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
                    {[2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlayerCount(num)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
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
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-200 text-xs">
                        Faction Draft Mode
                      </span>
                      {isDraftMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate sm:whitespace-normal">
                      Randomly seat commanders on Ring 2; draft factions in reverse turn order in-game.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDraftMode(!isDraftMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                    isDraftMode
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                  }`}
                >
                  {isDraftMode ? 'Draft Mode ON' : 'Enable Faction Draft'}
                </button>
              </div>

              {/* Faction Assignment Per Seat / In-game Draft Banner */}
              {isDraftMode ? (
                <div className="p-4 rounded-xl bg-indigo-950/20 border-2 border-dashed border-indigo-700/50 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    <Compass className="w-4 h-4 text-indigo-400 animate-spin" />
                    In-Game Faction Draft Enabled
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                    Factions do not need to be selected in advance. When launched, all {playerCount} commanders are assigned random Ring 2 positions. A random first player is chosen to establish clockwise turn order, and factions are drafted counter-clockwise starting from the last player!
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Faction Roster by Seat
                  </label>
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${
                      displayMode === 'compact' ? 'max-h-48' : 'max-h-64'
                    } overflow-y-auto pr-1 scrollbar-thin`}
                  >
                    {Array.from({ length: playerCount }).map((_, idx) => {
                      const currentFactionId = selectedFactions[idx] || 'terran_federation';
                      const faction = ALL_FACTIONS.find((f) => f.id === currentFactionId);

                      return (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold font-mono flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate">
                                Seat {idx + 1}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {faction?.isHuman ? 'Terran' : 'Alien'} ({faction?.reputationSlots ?? 5} Rep)
                              </div>
                            </div>
                          </div>

                          <select
                            value={currentFactionId}
                            onChange={(e) => handleFactionChange(idx, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-xs font-medium rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-400 max-w-[130px]"
                          >
                            {availableFactions.map((f) => {
                              const conflictSeat = selectedFactions.slice(0, playerCount).findIndex(
                                (otherId, otherIdx) => otherIdx !== idx && areFactionsConflictingColor(otherId, f.id)
                              );
                              const isDisabled = conflictSeat !== -1;
                              return (
                                <option key={f.id} value={f.id} disabled={isDisabled}>
                                  {f.name}{isDisabled ? ` (Color: S${conflictSeat + 1})` : ''}
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

              {/* Your Starting Control Mode / Seat */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Your Control Mode on this Device
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setMySeat('all')}
                    className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mySeat === 'all'
                        ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md shadow-purple-600/20'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Hotseat (All)</span>
                  </button>
                  {Array.from({ length: Math.min(3, playerCount) }).map((_, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setMySeat(sIdx)}
                      className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mySeat === sIdx
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Seat {sIdx + 1} Only</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expansion Modules */}
              <div>
                <div
                  onClick={() => setIsExpansionsOpen(!isExpansionsOpen)}
                  className="flex items-center justify-between mb-1.5 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 group-hover:text-slate-200 transition">
                      {isExpansionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 group-hover:text-slate-100 transition cursor-pointer">
                      Expansions & Modules
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllExpansions();
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 text-purple-200 cursor-pointer"
                    >
                      {allExpansionsSelected ? 'Disable All' : 'Enable All'}
                    </button>
                    <span className="text-[11px] font-mono text-cyan-400">
                      {selectedExpansions.length} Enabled
                    </span>
                  </div>
                </div>

                {isExpansionsOpen ? (
                  displayMode === 'compact' ? (
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_EXPANSIONS.map((exp) => {
                        const isChecked = selectedExpansions.includes(exp.id);
                        return (
                          <button
                            key={exp.id}
                            type="button"
                            onClick={() => toggleExpansion(exp.id)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                              isChecked
                                ? 'bg-purple-900/50 border-purple-500 text-purple-200 shadow-sm shadow-purple-950'
                                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isChecked ? 'bg-purple-400' : 'bg-slate-600'
                              }`}
                            />
                            <span>{exp.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 border border-purple-600/40 text-purple-300">
                              {exp.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {AVAILABLE_EXPANSIONS.map((exp) => {
                        const isChecked = selectedExpansions.includes(exp.id);
                        return (
                          <label
                            key={exp.id}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-purple-950/40 border-purple-500/60 text-purple-100 shadow-sm shadow-purple-900/20'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExpansion(exp.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-400 focus:ring-offset-0 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100">{exp.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-900/80 text-purple-300 border border-purple-600/40">
                                  {exp.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                {exp.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] font-mono text-slate-400">
                    {selectedExpansions.length > 0 ? (
                      <span>
                        Active:{' '}
                        {selectedExpansions
                          .map((id) => AVAILABLE_EXPANSIONS.find((e) => e.id === id)?.name || id)
                          .join(', ')}
                      </span>
                    ) : (
                      <span>No expansions enabled (Base Game only)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Neutral Ship Blueprints (NPCs) */}
              <div>
                <div
                  onClick={() => setIsBlueprintsOpen(!isBlueprintsOpen)}
                  className="flex items-center justify-between mb-1.5 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 group-hover:text-slate-200 transition">
                      {isBlueprintsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </span>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 group-hover:text-slate-100 transition cursor-pointer">
                      Neutral Ship Blueprints (NPCs)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Ancients • Guardians • GCDS
                  </span>
                </div>

                {isBlueprintsOpen ? (
                  displayMode === 'compact' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            type: 'ancient' as const,
                            label: 'Ancient Ship',
                            defaultDesc: 'Init 2, 2H, 2Y (+1)',
                            advDesc: 'Init 1, 3H, 1O (+1)',
                            expertDesc: 'Init 3, 2H, 1Y (+2)',
                          },
                          {
                            type: 'guardian' as const,
                            label: 'Guardian',
                            defaultDesc: 'Init 3, 3H, 3Y (+2/-1)',
                            advDesc: 'Init 1, 4H, 2O Msl + 1R (+1)',
                            expertDesc: 'Init 3, 4H, 2O (+1/-1)',
                          },
                          {
                            type: 'gcds' as const,
                            label: 'Galactic Center Defense System (GCDS)',
                            defaultDesc: 'Init 0, 7H, 4Y (+2)',
                            advDesc: 'Init 2, 4H, 4Y Msl + 1R (+2)',
                            expertDesc: 'Init 3, 5H, 2O (+2/-2)',
                          },
                        ]
                      ).map(({ type, label, defaultDesc, advDesc, expertDesc }) => {
                        const currentSel = neutralShipSelections[type];
                        return (
                          <div
                            key={type}
                            className="p-2 rounded-xl border bg-slate-950/60 border-slate-800 flex flex-col justify-between gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-200 truncate">{label}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setNeutralShipSelections((prev) => ({ ...prev, [type]: 'default' }))
                                }
                                title="Default Blueprint"
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer text-center ${
                                  currentSel === 'default'
                                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                Def
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setNeutralShipSelections((prev) => ({ ...prev, [type]: 'advanced' }))
                                }
                                title="Advanced Blueprint"
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer text-center ${
                                  currentSel === 'advanced'
                                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                Adv
                              </button>
                              <button
                                type="button"
                                disabled={!hasRemnants}
                                onClick={() => {
                                  if (hasRemnants) {
                                    setNeutralShipSelections((prev) => ({ ...prev, [type]: 'expert' }));
                                  }
                                }}
                                title={
                                  hasRemnants
                                    ? 'Expert Blueprint (Remnants)'
                                    : 'Expert Blueprint requires Remnants of Worlds Afar expansion'
                                }
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition text-center ${
                                  !hasRemnants
                                    ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
                                    : currentSel === 'expert'
                                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400 shadow-sm cursor-pointer'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer'
                                }`}
                              >
                                Exp
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setNeutralShipSelections((prev) => ({ ...prev, [type]: 'random' }))
                                }
                                title={
                                  hasRemnants
                                    ? 'Random Blueprint (Default / Advanced / Expert)'
                                    : 'Random Blueprint (50% Default / 50% Advanced)'
                                }
                                className={`px-1.5 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-0.5 ${
                                  currentSel === 'random'
                                    ? 'bg-purple-500/25 text-purple-200 border border-purple-400 shadow-sm'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                <Dices className="w-2.5 h-2.5" />
                                <span>Rnd</span>
                              </button>
                            </div>
                            <div className="text-[10px] font-mono truncate pt-0.5">
                              {currentSel === 'default' && (
                                <span className="text-slate-400">{defaultDesc}</span>
                              )}
                              {currentSel === 'advanced' && (
                                <span className="text-amber-300 font-medium">{advDesc}</span>
                              )}
                              {currentSel === 'expert' && (
                                <span className="text-rose-300 font-medium">{expertDesc}</span>
                              )}
                              {currentSel === 'random' && (
                                <span className="text-purple-300 italic">
                                  🎲 Random {hasRemnants ? '(Def/Adv/Exp)' : '(50/50)'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(
                        [
                          {
                            type: 'ancient' as const,
                            label: 'Ancient Ship',
                            badge: 'Outer & Middle Sectors',
                            defaultDesc: '2 Yellow Cannons (+1 Hit) • 2 Hull • Init 2',
                            advDesc: '1 Orange Cannon (+1 Hit) • 2 Hull • Init 1',
                            expertDesc: '1 Yellow Cannon (+2 Hit) • 1 Hull • Init 3',
                          },
                          {
                            type: 'guardian' as const,
                            label: 'Guardian',
                            badge: 'Guardian Sectors',
                            defaultDesc: '3 Yellow Cannons (+2 Hit, -1 Shield) • 3 Hull • Init 3 • 2 VP',
                            advDesc: '2 Orange Missiles, 1 Red Cannon (+1 Hit) • 3 Hull • Init 1 • 2 VP',
                            expertDesc: '2 Orange Cannons (+1 Hit, -1 Shield) • 3 Hull • Init 3 • 2 VP',
                          },
                          {
                            type: 'gcds' as const,
                            label: 'Galactic Center Defense System (GCDS)',
                            badge: 'Center Sector 001',
                            defaultDesc: '4 Yellow Cannons (+2 Hit) • 7 Hull • Init 0 • 4 VP',
                            advDesc: '4 Yellow Missiles, 1 Red Cannon (+2 Hit) • 3 Hull • Init 2 • 4 VP',
                            expertDesc: '2 Orange Cannons (+2 Hit, -2 Shield) • 4 Hull • Init 3 • 4 VP',
                          },
                        ]
                      ).map(({ type, label, badge, defaultDesc, advDesc, expertDesc }) => {
                        const currentSel = neutralShipSelections[type];
                        return (
                          <div
                            key={type}
                            className="p-3 rounded-xl border bg-slate-950/60 border-slate-800 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-100">{label}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                                  {badge}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNeutralShipSelections((prev) => ({ ...prev, [type]: 'default' }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    currentSel === 'default'
                                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400 shadow-sm shadow-cyan-500/20'
                                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                  }`}
                                >
                                  Default
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNeutralShipSelections((prev) => ({ ...prev, [type]: 'advanced' }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    currentSel === 'advanced'
                                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-sm shadow-amber-500/20'
                                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                  }`}
                                >
                                  Advanced
                                </button>
                                <button
                                  type="button"
                                  disabled={!hasRemnants}
                                  onClick={() => {
                                    if (hasRemnants) {
                                      setNeutralShipSelections((prev) => ({ ...prev, [type]: 'expert' }));
                                    }
                                  }}
                                  title={
                                    hasRemnants
                                      ? 'Expert Blueprint (Remnants of Worlds Afar)'
                                      : 'Expert Blueprint requires Remnants of Worlds Afar expansion'
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    !hasRemnants
                                      ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
                                      : currentSel === 'expert'
                                      ? 'bg-rose-500/25 text-rose-200 border border-rose-400 shadow-sm shadow-rose-500/20 cursor-pointer'
                                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer'
                                  }`}
                                >
                                  Expert
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNeutralShipSelections((prev) => ({ ...prev, [type]: 'random' }))
                                  }
                                  title={
                                    hasRemnants
                                      ? 'Random Blueprint (Default / Advanced / Expert)'
                                      : 'Random Blueprint (50% Default / 50% Advanced)'
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                    currentSel === 'random'
                                      ? 'bg-purple-500/25 text-purple-200 border border-purple-400 shadow-sm shadow-purple-500/20'
                                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                  }`}
                                >
                                  <Dices className="w-3 h-3" />
                                  <span>Random</span>
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] font-mono pl-0.5">
                              {currentSel === 'default' && (
                                <div className="text-slate-400 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                  <span>{defaultDesc}</span>
                                </div>
                              )}
                              {currentSel === 'advanced' && (
                                <div className="text-amber-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                  <span>{advDesc}</span>
                                </div>
                              )}
                              {currentSel === 'expert' && (
                                <div className="text-rose-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                  <span>{expertDesc}</span>
                                </div>
                              )}
                              {currentSel === 'random' && (
                                <div className="text-purple-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                  <span className="italic">
                                    {hasRemnants
                                      ? 'Random: Selects among Default, Advanced, and Expert variants'
                                      : 'Random: 50% chance Default or Advanced upon game start'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <span>
                      Ancients: <strong className="text-slate-200 capitalize">{neutralShipSelections.ancient}</strong> •{' '}
                      Guardians: <strong className="text-slate-200 capitalize">{neutralShipSelections.guardian}</strong> •{' '}
                      GCDS: <strong className="text-slate-200 capitalize">{neutralShipSelections.gcds}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky / Docked Launch Button */}
            <div className="pt-3.5 mt-3 border-t border-slate-800 sticky bottom-0 bg-slate-900/95 backdrop-blur-md z-10">
              <button
                type="submit"
                className="w-full py-3 sm:py-3.5 rounded-xl font-display font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Rocket className="w-5 h-5" />
                <span>Launch Galactic Conflict</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Join Existing & Saved Tables (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Join by Code Card */}
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-cyan-950/10">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3.5 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-100">
                  Connect by Table Code
                </h3>
                <p className="text-[11px] text-slate-400">
                  Enter a shared code or table number to join an ongoing battle.
                </p>
              </div>
            </div>

            <form onSubmit={handleConnectTable} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  value={joinTableInput}
                  onChange={(e) => {
                    setJoinTableInput(e.target.value);
                    if (joinError) setJoinError(null);
                  }}
                  placeholder="Enter Table Code (e.g. 101 or galaxy-101)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-400 transition"
                  required
                />
              </div>

              {joinError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  {joinError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <select
                  value={joinSeat.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all' || val === 'spectator') setJoinSeat(val);
                    else setJoinSeat(parseInt(val, 10));
                  }}
                  className="bg-slate-950 border border-slate-700 text-xs font-medium rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-400 flex-1"
                >
                  <option value="0">Seat 1 (Player 1)</option>
                  <option value="1">Seat 2 (Player 2)</option>
                  <option value="2">Seat 3 (Player 3)</option>
                  <option value="3">Seat 4 (Player 4)</option>
                  <option value="4">Seat 5 (Player 5)</option>
                  <option value="5">Seat 6 (Player 6)</option>
                  <option value="all">Hotseat / All Players</option>
                  <option value="spectator">Spectator / Observer</option>
                </select>

                <button
                  type="submit"
                  disabled={isJoining}
                  className="py-2 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isJoining ? 'Joining...' : 'Join'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Saved Tables List */}
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-cyan-950/10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-200">
                  Local Galaxy Archives ({savedTables.length})
                </h3>
              </div>
            </div>

            {savedTables.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No local tables saved yet. Launch a new table above to start playing!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {savedTables.map((table) => {
                  return (
                    <div
                      key={table.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-mono font-bold text-xs">
                            #{table.tableNumber || table.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            Round {table.round}/{table.maxRounds} • {table.playerCount}P
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(table.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                          title="Delete Table"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 truncate">
                        Turn: <strong className="text-slate-200">{table.activePlayerName}</strong> • {table.phase.replace('_', ' ')}
                      </div>

                      {/* Direct Seat Launch Links */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => onJoinTable(table.id, 'all')}
                          className="px-2 py-1 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 rounded text-[10px] font-semibold text-purple-300 transition"
                        >
                          Hotseat
                        </button>
                        {Array.from({ length: table.playerCount }).map((_, sIdx) => {
                          const isCopied = copiedLinkTableId === `${table.id}_${sIdx}`;
                          return (
                            <div key={sIdx} className="inline-flex items-center rounded border border-slate-700 bg-slate-900 text-[10px]">
                              <button
                                type="button"
                                onClick={() => onJoinTable(table.id, sIdx)}
                                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition rounded-l"
                              >
                                Seat {sIdx + 1}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopySeatLink(table.id, sIdx)}
                                className="px-1.5 py-1 text-cyan-400 hover:bg-cyan-950/50 border-l border-slate-700 transition rounded-r"
                                title={`Copy Seat ${sIdx + 1} Link`}
                              >
                                {isCopied ? '✓' : <Share2 className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
