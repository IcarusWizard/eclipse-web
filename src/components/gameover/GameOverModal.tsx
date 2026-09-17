import React from 'react';
import { GameState } from '../../engine/types/state';
import { Trophy, RefreshCw, Award, Star } from 'lucide-react';

interface GameOverModalProps {
  state: GameState;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ state, onNewGame }) => {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const scores = state.finalScores || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/60 rounded-2xl w-full max-w-2xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center">
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
        <div className="w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Commander</th>
                <th className="p-3 text-center">Sectors</th>
                <th className="p-3 text-center">Monoliths</th>
                <th className="p-3 text-center">Reputation</th>
                <th className="p-3 text-center">Tech</th>
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
                      <span className="text-slate-200">{p.name}</span>
                    </td>
                    <td className="p-3 text-center text-slate-400">{s?.sectors || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.monoliths || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.reputation || 0}</td>
                    <td className="p-3 text-center text-slate-400">{s?.techs || 0}</td>
                    <td className="p-3 text-right font-bold text-amber-300 text-sm">
                      {s?.total || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={onNewGame}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm uppercase tracking-wider shadow-lg shadow-amber-950 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Start New Galactic War
        </button>
      </div>
    </div>
  );
};
