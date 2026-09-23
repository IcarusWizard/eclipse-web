import React, { useState } from 'react';
import { GameState } from '../../engine/types/state';
import { computeCurrentScores } from '../../engine/rules/gameReducer';
import { getTableNumber } from '../../engine/rules/persistence';
import {
  Radio,
  Trophy,
  LayoutDashboard,
  Cpu,
  BookOpen,
  Bug,
  RefreshCw,
  Home,
  Share2,
  Check,
  User,
  X,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';

interface HeaderProps {
  state: GameState;
  onSelectActiveViewPlayer: (index: number) => void;
  selectedViewIndex: number;
  onNewGame: () => void;
  onOpenTechTray?: () => void;
  onOpenPlayerBoard?: () => void;
  onOpenScoreboard?: () => void;
  onOpenTableSession?: () => void;
  onOpenGallery?: () => void;
  onReturnToLobby?: () => void;
  onOpenBugReport?: () => void;
  currentSeat?: number | 'all' | 'spectator';
  onChangeSeat?: (seat: number | 'all' | 'spectator') => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onSelectActiveViewPlayer,
  selectedViewIndex,
  onNewGame,
  onOpenTechTray,
  onOpenPlayerBoard,
  onOpenScoreboard,
  onOpenTableSession,
  onOpenGallery,
  onReturnToLobby,
  onOpenBugReport,
  currentSeat = 'all',
  onChangeSeat,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copiedSeat, setCopiedSeat] = useState(false);
  const { scores } = computeCurrentScores(state);
  const tableNum = getTableNumber(state);

  const handleCopySeatLink = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const tableParam = `table=${tableNum}`;
    const seatParam =
      currentSeat === 'all'
        ? ''
        : currentSeat === 'spectator'
        ? '&seat=spectator'
        : `&seat=${currentSeat}`;
    const url = `${origin}${pathname}?${tableParam}${seatParam}`;
    navigator.clipboard.writeText(url);
    setCopiedSeat(true);
    setTimeout(() => setCopiedSeat(false), 2000);
  };

  return (
    <>
      <header className="h-16 bg-slate-950/95 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between text-slate-100 z-30 select-none overflow-x-auto scrollbar-thin">
        {/* Title, Round and Phase */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span className="text-sm sm:text-base font-extrabold tracking-wider text-cyan-400 font-display">
              ECLIPSE
            </span>
            <span className="hidden lg:inline text-[10px] text-slate-500 font-mono tracking-wider">
              SECOND DAWN
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          {/* Round Counter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">ROUND</span>
            <span className="font-display font-bold text-cyan-300 text-sm">
              {state.round}/{state.maxRounds}
            </span>
          </div>

          {/* Phase Pill */}
          <div className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-300">
            {state.phase.replace('_', ' ')}
          </div>
        </div>

        {/* Right Section: Player Switcher + Player Board + Slider Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hotseat View: Players Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {state.players.map((p, idx) => {
              const isTurn = state.activePlayerIndex === idx;
              const isViewed = selectedViewIndex === idx;
              const b = scores[p.id];
              const viewerPlayerId =
                typeof currentSeat === 'number'
                  ? state.players[currentSeat]?.id
                  : state.players[selectedViewIndex]?.id;
              const isSecretRep =
                state.phase !== 'GAME_OVER' &&
                Boolean(viewerPlayerId) &&
                p.id !== viewerPlayerId &&
                p.reputationTiles.length > 0;
              const knownVP = (b?.total ?? 0) - (b?.reputation ?? 0);
              const displayVP = isSecretRep ? `${knownVP}★+?` : `${b?.total ?? 0}★`;
              const titleText = isSecretRep
                ? `${p.name} (${knownVP} VP + ${p.reputationTiles.length} secret reputation tile(s))`
                : `${p.name} (${b?.total ?? 0} VP)`;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelectActiveViewPlayer(idx)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    isViewed
                      ? 'bg-slate-800 text-white shadow ring-1 ring-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={titleText}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="hidden sm:inline">{p.name.split(' ')[1] || p.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {displayVP}
                  </span>
                  {isTurn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Access: Player Board (Key: P) */}
          {onOpenPlayerBoard && (
            <button
              onClick={onOpenPlayerBoard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all shadow"
              title="Inspect Physical Player Board (Key: P)"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Player Board</span>
            </button>
          )}

          {/* Menu Drawer Toggle Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-bold transition-all shadow"
            title="Open Galaxy Command Menu"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Right Slide-Over Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
            <div className="w-80 max-w-full bg-slate-950/98 border-l border-slate-800 shadow-2xl flex flex-col justify-between p-5 text-slate-100 animate-in slide-in-from-right duration-200">
              {/* Drawer Top / Header */}
              <div className="space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                      <Radio className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm tracking-wider text-slate-200 uppercase">
                        COMMAND MENU
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">
                        TABLE #{tableNum}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Close Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Section: Table & Session */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Session & Table
                  </span>
                  <div className="bg-slate-900/80 rounded-xl border border-slate-800/80 p-3 space-y-2.5">
                    {/* Seat Selection */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Current Seat:</span>
                      </div>
                      {onChangeSeat ? (
                        <select
                          value={currentSeat !== undefined ? currentSeat.toString() : 'all'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'all' || val === 'spectator') onChangeSeat(val);
                            else onChangeSeat(parseInt(val, 10));
                          }}
                          className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none"
                        >
                          <option value="all">Hotseat (All)</option>
                          {state.players.map((p, idx) => (
                            <option key={p.id} value={idx.toString()}>
                              Seat {idx + 1} ({p.name.split(' ')[0]})
                            </option>
                          ))}
                          <option value="spectator">Spectator</option>
                        </select>
                      ) : (
                        <span className="font-bold text-cyan-300">
                          {currentSeat === 'all' || currentSeat === undefined
                            ? 'Hotseat'
                            : currentSeat === 'spectator'
                            ? 'Spectator'
                            : `Seat ${Number(currentSeat) + 1}`}
                        </span>
                      )}
                    </div>

                    {/* Copy Direct Seat URL */}
                    <button
                      onClick={handleCopySeatLink}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition"
                    >
                      {copiedSeat ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied URL to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Copy Seat Direct URL Link</span>
                        </>
                      )}
                    </button>

                    {/* Table Sessions Manager Button */}
                    {onOpenTableSession && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenTableSession();
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold transition"
                      >
                        <div className="flex items-center gap-1.5 font-mono">
                          <Radio className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Table Sessions Manager</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                      </button>
                    )}

                    {/* Return to Lobby */}
                    {onReturnToLobby && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onReturnToLobby();
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Return to Galaxy Lobby</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section: Tactical Views & Game Panels */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Tactical Views
                  </span>
                  <div className="space-y-1.5">
                    {/* Live Scoreboard / Standings */}
                    {onOpenScoreboard && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenScoreboard();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-600/50 text-slate-200 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-amber-300">Live Standings</div>
                            <div className="text-[10px] text-slate-400">Score & Victory Points breakdown</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                      </button>
                    )}

                    {/* Physical Tech Tray */}
                    {onOpenTechTray && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenTechTray();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-pink-600/50 text-slate-200 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-pink-950/60 border border-pink-600/40 flex items-center justify-center text-pink-400">
                            <Cpu className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                              <span>Tech Tray Market</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-pink-950 text-pink-300 border border-pink-700/60">
                                {state.techSupply.length}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">Research & Tech tiles supply</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-pink-400 transition" />
                      </button>
                    )}

                    {/* Galactic Gallery */}
                    {onOpenGallery && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenGallery();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-600/50 text-slate-200 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-600/40 flex items-center justify-center text-cyan-400">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-cyan-300">Galactic Gallery</div>
                            <div className="text-[10px] text-slate-400">Compendium & Discovery reference</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                      </button>
                    )}

                    {/* Physical Player Board */}
                    {onOpenPlayerBoard && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenPlayerBoard();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-600/50 text-slate-200 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-200">Player Board</div>
                            <div className="text-[10px] text-slate-400">Tracks, Blueprints, Colony Ships (P)</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section: Support & Operations */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Operations
                  </span>
                  <div className="space-y-1.5">
                    {/* Report Bug */}
                    {onOpenBugReport && (
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          onOpenBugReport();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/40 hover:border-rose-600/60 text-rose-300 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-400">
                            <Bug className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-rose-300">Report Bug / Issue</div>
                            <div className="text-[10px] text-rose-400/80">Log bug directly to bug_report.md</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-rose-400/60 group-hover:text-rose-400 transition" />
                      </button>
                    )}

                    {/* New Game */}
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onNewGame();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-slate-200">Start New Game</div>
                          <div className="text-[10px] text-slate-400">Reset galaxy & choose factions</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-slate-800/80 pt-4 text-center">
                <p className="text-[10px] font-mono text-slate-500">
                  Eclipse: Second Dawn for the Galaxy
                </p>
                <p className="text-[9px] font-mono text-slate-600">
                  Web Command Edition
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
