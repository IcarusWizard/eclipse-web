import React from 'react';
import { GameState } from '../../engine/types/state';
import { computeCurrentScores } from '../../engine/rules/gameReducer';
import { getTableNumber } from '../../engine/rules/persistence';
import { Shield, Users, RefreshCw, Trophy, Radio, Cpu, LayoutDashboard, Home, Share2, Check, User, BookOpen, Bug } from 'lucide-react';

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
  const [copiedSeat, setCopiedSeat] = React.useState(false);
  const activePlayer = state.players[state.activePlayerIndex];
  const viewedPlayer = state.players[selectedViewIndex];
  const { scores } = computeCurrentScores(state);
  const tableNum = getTableNumber(state);

  return (
    <header className="h-16 bg-slate-950/95 border-b border-slate-800 px-6 flex items-center justify-between text-slate-100 z-30 select-none">
      {/* Title and Round Info */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-base font-extrabold tracking-wider text-cyan-400 font-display flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            ECLIPSE: SECOND DAWN
          </h1>
          <div className="text-[10px] text-slate-500 font-mono tracking-wide">
            WEB COMMAND EDITION
          </div>
        </div>

        <div className="h-7 w-[1px] bg-slate-800" />

        {/* Round Counter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold">ROUND</span>
          <span className="font-display font-bold text-cyan-300 text-sm">
            {state.round} / {state.maxRounds}
          </span>
        </div>

        {/* Phase Pill */}
        <div className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-300">
          {state.phase.replace('_', ' ')}
        </div>

        {/* Table Session Badge */}
        {onOpenTableSession && (
          <button
            onClick={onOpenTableSession}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 font-mono text-xs font-bold transition-all shadow"
            title="Manage Table Sessions & Rejoin by Table Number"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Table #{tableNum}</span>
          </button>
        )}

        {/* Return to Lobby Button */}
        {onReturnToLobby && (
          <button
            onClick={onReturnToLobby}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold transition-all shadow"
            title="Return to Main Galaxy Lobby"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lobby</span>
          </button>
        )}
      </div>

      {/* Hotseat Table Commanders */}
      <div className="flex items-center gap-3">
        {/* Seat / Hotseat Status & Direct Link */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs shadow">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 font-semibold text-[11px]">Seat:</span>
          {onChangeSeat ? (
            <select
              value={currentSeat !== undefined ? currentSeat.toString() : 'all'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all' || val === 'spectator') onChangeSeat(val);
                else onChangeSeat(parseInt(val, 10));
              }}
              className="bg-slate-950 border border-slate-700 text-xs rounded px-1.5 py-0.5 text-cyan-300 font-bold focus:outline-none"
            >
              <option value="all">Hotseat (All)</option>
              {state.players.map((p, idx) => (
                <option key={p.id} value={idx.toString()}>
                  Seat {idx + 1} ({p.faction.name})
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

          <button
            type="button"
            onClick={() => {
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
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded transition"
            title="Copy Direct Seat URL Link"
          >
            {copiedSeat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {onOpenScoreboard && (
          <button
            onClick={onOpenScoreboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/60 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow"
            title="View Live Galactic Standings & Score Breakdown"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Standings</span>
          </button>
        )}

        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all shadow"
            title="Open Galactic Compendium & Data Gallery"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gallery</span>
          </button>
        )}

        {onOpenBugReport && (
          <button
            onClick={onOpenBugReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/50 hover:border-rose-400 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all shadow"
            title="Report Issue / Bug directly into bug_report.md"
          >
            <Bug className="w-3.5 h-3.5 text-rose-400" />
            <span>Bug</span>
          </button>
        )}

        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Hotseat View:
        </span>
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {state.players.map((p, idx) => {
            const isTurn = state.activePlayerIndex === idx;
            const isViewed = selectedViewIndex === idx;
            const vp = scores[p.id]?.total ?? 0;

            return (
              <button
                key={p.id}
                onClick={() => onSelectActiveViewPlayer(idx)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  isViewed
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name.split(' ')[1] || p.name}</span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">
                  {vp}★
                </span>
                {isTurn && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {onOpenPlayerBoard && (
          <button
            onClick={onOpenPlayerBoard}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all shadow"
            title="Inspect Physical Player Board (Key: P)"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Player Board</span>
          </button>
        )}

        {onOpenTechTray && (
          <button
            onClick={onOpenTechTray}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-pink-400 hover:text-pink-300 text-xs font-bold transition-all shadow"
            title="Inspect Physical Tech Tray"
          >
            <Cpu className="w-3.5 h-3.5 text-pink-400" />
            <span>Tech Tray</span>
            <span className="px-1.5 py-0.2 bg-pink-950/80 text-pink-300 border border-pink-800/60 rounded-full text-[10px]">
              {state.techSupply.length}
            </span>
          </button>
        )}

        <button
          onClick={onNewGame}
          className="ml-1 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Start New Game"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
