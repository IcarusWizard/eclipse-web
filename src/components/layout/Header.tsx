import React from 'react';
import { GameState } from '../../engine/types/state';
import { Shield, Users, RefreshCw, Trophy, Radio, Cpu } from 'lucide-react';

interface HeaderProps {
  state: GameState;
  onSelectActiveViewPlayer: (index: number) => void;
  selectedViewIndex: number;
  onNewGame: () => void;
  onOpenTechTray?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onSelectActiveViewPlayer,
  selectedViewIndex,
  onNewGame,
  onOpenTechTray,
}) => {
  const activePlayer = state.players[state.activePlayerIndex];
  const viewedPlayer = state.players[selectedViewIndex];

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
      </div>

      {/* Hotseat Table Commanders */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Hotseat View:
        </span>
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {state.players.map((p, idx) => {
            const isTurn = state.activePlayerIndex === idx;
            const isViewed = selectedViewIndex === idx;

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
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.name.split(' ')[1] || p.name}</span>
                {isTurn && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {onOpenTechTray && (
          <button
            onClick={onOpenTechTray}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-pink-400 hover:text-pink-300 text-xs font-bold transition-all shadow"
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
          className="ml-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Start New Game"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
