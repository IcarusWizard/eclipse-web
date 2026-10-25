import React, { useState, useEffect } from 'react';
import { GameState } from '../../engine/types/state';
import {
  getTableNumber,
  listSavedTables,
  loadTableByNumber,
  deleteSavedTable,
  SavedTableSummary,
  fetchTableFromServer,
  saveGameState,
  filterTablesForUser,
  isPlayerTurnAtTable,
} from '../../engine/rules/persistence';
import {
  getCurrentUser,
  subscribeToUserSession,
} from '../../engine/rules/userSession';
import { UserSession } from '../../engine/types/user';
import { UserLoginModal } from '../auth/UserLoginModal';
import {
  Radio,
  X,
  Play,
  Trash2,
  Copy,
  Check,
  PlusCircle,
  Hash,
  Clock,
  Users,
  User,
  Shield,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

interface TableSessionModalProps {
  currentState: GameState;
  onJoinTable: (loadedState: GameState) => void;
  onNewTable: () => void;
  onClose: () => void;
}

export const TableSessionModal: React.FC<TableSessionModalProps> = ({
  currentState,
  onJoinTable,
  onNewTable,
  onClose,
}) => {
  const currentTableNumber = getTableNumber(currentState);
  const [currentUser, setCurrentUser] = useState<UserSession>(() => getCurrentUser());
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [inputTableNum, setInputTableNum] = useState<string>('');
  const [savedTables, setSavedTables] = useState<SavedTableSummary[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUserSession((u) => setCurrentUser(u));
  }, []);

  useEffect(() => {
    setSavedTables(listSavedTables());
  }, [currentUser]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?table=${currentTableNumber}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoinByInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const num = parseInt(inputTableNum.trim(), 10);
    if (isNaN(num)) {
      setJoinError('Please enter a valid numeric table number.');
      return;
    }
    let loaded = loadTableByNumber(num);
    if (!loaded) {
      loaded = await fetchTableFromServer(String(num));
    }
    if (!loaded) {
      setJoinError(`Table #${num} does not exist.`);
      return;
    }
    saveGameState(loaded, true);
    onJoinTable(loaded);
    onClose();
  };

  const handleRejoin = (entry: SavedTableSummary) => {
    const loaded = loadTableByNumber(entry.tableNumber);
    if (loaded) {
      onJoinTable(loaded);
      onClose();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedTable(id);
    setSavedTables(listSavedTables());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2 font-display">
                <span>Game Tables & Auto-Save Session</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300">
                  Table #{currentTableNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Your game is auto-saved locally on every move. Rejoin anytime or share your table number.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* User Session Pill */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg border shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                    : currentUser.role === 'user'
                    ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                    : 'bg-amber-950/80 border-amber-600 text-amber-300'
                }`}
              >
                {currentUser.role === 'admin' ? (
                  <Shield className="w-4 h-4" />
                ) : currentUser.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Player Identity:
                </div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5 truncate">
                  <span className="truncate">{currentUser.username}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                      currentUser.role === 'admin'
                        ? 'bg-rose-950 border border-rose-600 text-rose-300'
                        : currentUser.role === 'user'
                        ? 'bg-cyan-950 border border-cyan-600 text-cyan-300'
                        : 'bg-amber-950 border border-amber-600 text-amber-300'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shrink-0 cursor-pointer"
            >
              Switch User
            </button>
          </div>

          {/* Active Table Card */}
          <div className="bg-cyan-950/20 border border-cyan-600/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                Current Table Session
              </div>
              <div className="text-lg font-mono font-black text-white flex items-center gap-2 mt-0.5">
                <span>Table #{currentTableNumber}</span>
                <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-700 text-cyan-200">
                  Round {currentState.round} • {currentState.phase.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {currentState.players.length} Players: {currentState.players.map((p) => p.name).join(', ')}
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all font-sans shrink-0"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied!' : 'Copy Table Link'}</span>
            </button>
          </div>

          {/* Join by Table Number Form */}
          <form onSubmit={handleJoinByInput} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Join or Switch to Table by Number</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Enter Table # (e.g. 742)"
                value={inputTableNum}
                onChange={(e) => setInputTableNum(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-cyan-400 font-bold border border-slate-700 transition-all flex items-center gap-1 font-sans"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Rejoin Table</span>
              </button>
            </div>
            {joinError && <div className="text-rose-400 text-[11px] mt-2 font-semibold">{joinError}</div>}
          </form>

          {/* Saved Tables List */}
          <div>
            {(() => {
              const myTables = filterTablesForUser(savedTables, currentUser);
              const baseList = currentUser.role === 'admin' ? savedTables : myTables;
              const displayed = [...baseList].sort((a, b) => {
                const aTurn = isPlayerTurnAtTable(a, currentUser) ? 1 : 0;
                const bTurn = isPlayerTurnAtTable(b, currentUser) ? 1 : 0;
                if (bTurn !== aTurn) return bTurn - aTurn;
                return (b.savedAt || 0) - (a.savedAt || 0);
              });

              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {currentUser.role === 'admin'
                          ? `All Galaxy Tables (${savedTables.length}) [Admin View]`
                          : `My Tables (${displayed.length})`}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onNewTable();
                        onClose();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Start New Game</span>
                    </button>
                  </div>

                  {displayed.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 space-y-1">
                      <p>
                        {currentUser.role === 'admin'
                          ? 'No saved table sessions found.'
                          : `No tables found for ${currentUser.username}.`}
                      </p>
                      {currentUser.role !== 'admin' && savedTables.length > 0 && (
                        <p className="text-[10px] text-slate-400">
                          (Total {savedTables.length} tables exist on server. Enter a table number above to join.)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {displayed.map((entry) => {
                        const isCurrent = entry.tableNumber === currentTableNumber;
                        const isMyTurn = isPlayerTurnAtTable(entry, currentUser);
                        const dateStr = new Date(entry.savedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        });
                        const myMembership = (entry.members || []).find((m) => m.userId === currentUser.id);

                        return (
                          <div
                            key={entry.id}
                            onClick={() => handleRejoin(entry)}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              isMyTurn
                                ? 'bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-amber-950/30 border-amber-400 shadow-md ring-1 ring-amber-400/60'
                                : isCurrent
                                ? 'bg-cyan-950/30 border-cyan-600/60 shadow-md'
                                : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                  isMyTurn
                                    ? 'bg-amber-400 text-slate-950 font-black shadow'
                                    : isCurrent
                                    ? 'bg-cyan-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                #{entry.tableNumber}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                                  <span>Table #{entry.tableNumber}</span>
                                  {isMyTurn && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded flex items-center gap-0.5 shadow-sm animate-pulse">
                                      <Zap className="w-2.5 h-2.5 fill-slate-950" />
                                      Your Turn
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded">
                                      Active
                                    </span>
                                  )}
                                  {myMembership && typeof myMembership.seat !== 'undefined' && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-950 border border-emerald-600 text-emerald-300 rounded flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-emerald-300" />
                                      {typeof myMembership.seat === 'number'
                                        ? `Seat ${myMembership.seat + 1}`
                                        : myMembership.seat}
                                    </span>
                                  )}
                                  <span className="text-slate-500 font-mono text-[10px]">• {dateStr}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                                  <span>
                                    Round {entry.round}/{entry.maxRounds} ({entry.phase.replace('_', ' ')})
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {entry.playerCount}p:{' '}
                                    <strong className={isMyTurn ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                                      {entry.activePlayerName}&apos;s turn
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isMyTurn && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejoin(entry);
                                  }}
                                  className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-slate-950" />
                                  <span>Act</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDelete(entry.id, e)}
                                className="p-1.5 hover:bg-rose-950/60 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete saved table"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Refreshing the page or switching tabs will always resume your active table automatically.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 font-sans cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {showUserModal && (
        <UserLoginModal
          currentUser={currentUser}
          onUserChanged={(u) => setCurrentUser(u)}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  );
};
