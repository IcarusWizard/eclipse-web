import React, { useState } from 'react';
import { GameState } from '../../engine/types/state';
import { Trophy, RefreshCw, Award, Star, Home, Eye, Minimize2, Maximize2 } from 'lucide-react';

interface GameOverModalProps {
  state: GameState;
  onNewGame: () => void;
  onExitToLobby?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ state, onNewGame, onExitToLobby }) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const winner = state.players.find((p) => p.id === state.winnerId);
  const scores = state.finalScores || {};

  // Minimized floating banner allowing players to inspect the map and boards (Bug 124)
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            GAME OVER: {winner ? `${winner.name} Victorious (${scores[winner.id]?.total || 0} VP)` : 'Galactic Supremacy Concluded'}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title="Return to final scores and end-game summary"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Show Scores</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-4xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center relative max-h-[95vh] overflow-y-auto">
        {/* Top bar with Examine Board button */}
        <div className="w-full flex items-center justify-end mb-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 hover:border-amber-500 transition-all shadow-sm cursor-pointer"
            title="Minimize to examine galaxy board"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Examine Board</span>
          </button>
        </div>
        <Trophy className="w-16 h-16 text-amber-400 mb-3 animate-bounce" />
        <h2 className="text-2xl font-extrabold text-amber-300 font-display">
          GALACTIC SUPREMACY ACHIEVED!
        </h2>
        <p className="text-sm text-slate-400 mt-1 mb-6">
          8 Rounds of deep space exploration and empire building have concluded.
        </p>

        {winner && (
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-4 w-full mb-6">
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
              Galactic Hegemon
            </div>
            <div className="text-xl font-bold font-display text-white" style={{ color: winner.color }}>
              {winner.name}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Victorious with <strong className="text-amber-300 font-bold">{scores[winner.id]?.total || 0} Total VP</strong>
            </div>
          </div>
        )}

        {/* Scores Table */}
        <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto mb-6">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Commander</th>
                <th className="p-3 text-center">Sectors</th>
                <th className="p-3 text-center">Monoliths</th>
                <th className="p-3 text-center">Reputation</th>
                <th className="p-3 text-center">Tech</th>
                <th className="p-3 text-center">Ambassadors</th>
                <th className="p-3 text-center">Discoveries</th>
                <th className="p-3 text-center" title="Planta controlled sector bonus, Draco ancient bonus">Species Trait</th>
                <th className="p-3 text-right font-bold text-amber-400">Total VP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {state.players.map((p) => {
                const s = scores[p.id];
                const isWinner = p.id === state.winnerId;

                return (
                  <tr key={p.id} className={isWinner ? 'bg-amber-950/20 font-bold' : ''}>
                    <td className="p-3 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="text-slate-200 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {s?.traitor ? (
                            <span className="text-[10px] text-rose-300 font-bold px-1.5 py-0.2 bg-rose-950/80 border border-rose-800 rounded">
                              Traitor (-2 VP)
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{p.faction.name}</div>
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-400">{s?.sectors || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.monoliths || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.reputation || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.techs || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.ambassadors || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.discoveries || 0}</td>
                    <td className="p-3 text-center font-mono">
                      {(s?.speciesBonus || 0) > 0 ? (
                        <span className="text-emerald-400 font-bold">+{s?.speciesBonus}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-300 text-sm">
                      {s?.total || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm uppercase tracking-wider border border-slate-700 hover:border-amber-500 transition-all shadow-lg cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400" /> Examine Board
          </button>
          {onExitToLobby && (
            <button
              onClick={onExitToLobby}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm uppercase tracking-wider border border-slate-700 hover:border-cyan-500 transition-all shadow-lg cursor-pointer"
            >
              <Home className="w-4 h-4 text-cyan-400" /> Exit to Lobby
            </button>
          )}
          <button
            onClick={onNewGame}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-950 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Start New Galactic War
          </button>
        </div>
      </div>
    </div>
  );
};
