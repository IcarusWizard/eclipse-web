import React, { useState } from 'react';
import { listSavedTables, deleteSavedTable, SavedTableSummary } from '../../engine/rules/persistence';
import { ALL_FACTIONS } from '../../engine/rules/setup';
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
} from 'lucide-react';

interface LobbyViewProps {
  onStartNewGame: (playerCount: number, factionIds: string[], tableId: string, seat: number | 'all') => void;
  onJoinTable: (tableId: string, seat: number | 'all' | 'spectator') => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartNewGame,
  onJoinTable,
}) => {
  const [savedTables, setSavedTables] = useState<SavedTableSummary[]>(() => listSavedTables());

  // Create Table State
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [customTableId, setCustomTableId] = useState<string>(() => `galaxy-${Math.floor(100 + Math.random() * 900)}`);
  const [selectedFactions, setSelectedFactions] = useState<string[]>([
    'terran_federation',
    'orion_hegemony',
    'planta',
    'mechanema',
    'hydran_progress',
    'eridani_empire',
  ]);
  const [mySeat, setMySeat] = useState<number | 'all'>(0);

  // Join Table State
  const [joinTableInput, setJoinTableInput] = useState<string>('');
  const [joinSeat, setJoinSeat] = useState<number | 'all' | 'spectator'>(0);
  const [copiedLinkTableId, setCopiedLinkTableId] = useState<string | null>(null);

  const handleFactionChange = (playerIdx: number, factionId: string) => {
    setSelectedFactions((prev) => {
      const next = [...prev];
      next[playerIdx] = factionId;
      return next;
    });
  };

  const handleLaunchGame = (e: React.FormEvent) => {
    e.preventDefault();
    const activeFactions = selectedFactions.slice(0, playerCount);
    onStartNewGame(playerCount, activeFactions, customTableId.trim() || `galaxy-${Date.now() % 1000}`, mySeat);
  };

  const handleConnectTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinTableInput.trim()) return;
    onJoinTable(joinTableInput.trim(), joinSeat);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-10 relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
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
      </header>

      {/* Main Grid */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create New Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/20">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-slate-100">
                Establish New Sector Table
              </h2>
              <p className="text-xs text-slate-400">
                Configure species factions, player count, and assign your starting seat.
              </p>
            </div>
          </div>

          <form onSubmit={handleLaunchGame} className="space-y-5">
            {/* Table Name & Player Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Table ID / Code
                </label>
                <input
                  type="text"
                  value={customTableId}
                  onChange={(e) => setCustomTableId(e.target.value)}
                  placeholder="e.g. galaxy-101"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Player Count: <span className="text-cyan-400 font-bold">{playerCount} Commanders</span>
                </label>
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPlayerCount(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
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

            {/* Faction Assignment Per Seat */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Faction Roster by Seat
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {Array.from({ length: playerCount }).map((_, idx) => {
                  const currentFactionId = selectedFactions[idx] || 'terran_federation';
                  const faction = ALL_FACTIONS.find((f) => f.id === currentFactionId);

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            Seat {idx + 1}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {faction?.isHuman ? 'Terran' : 'Alien'} ({faction?.reputationSlots ?? 5} Rep slots)
                          </div>
                        </div>
                      </div>

                      <select
                        value={currentFactionId}
                        onChange={(e) => handleFactionChange(idx, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                      >
                        {ALL_FACTIONS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Your Starting Control Mode / Seat */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Your Control Mode on this Device
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setMySeat('all')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-display font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              <span>Launch Galactic Conflict</span>
            </button>
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
                  onChange={(e) => setJoinTableInput(e.target.value)}
                  placeholder="Enter Table Code (e.g. 101 or galaxy-101)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-400 transition"
                  required
                />
              </div>

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
                  className="py-2 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Join</span>
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
