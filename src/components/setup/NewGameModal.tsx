import React, { useState } from 'react';
import { HUMAN_FACTIONS } from '../../engine/rules/setup';
import { Users, Play, Radio, Shield } from 'lucide-react';

interface NewGameModalProps {
  onStartGame: (playerCount: number) => void;
  onClose?: () => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ onStartGame, onClose }) => {
  const [playerCount, setPlayerCount] = useState<number>(2);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Radio className="w-6 h-6 text-cyan-400" />
          <div>
            <h2 className="text-xl font-bold font-display text-cyan-300">
              COMMENCE NEW EXPEDITION
            </h2>
            <p className="text-xs text-slate-400">
              Configure commanders for hotseat table deployment
            </p>
          </div>
        </div>

        <div className="space-y-6 my-4">
          {/* Player Count Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" /> Number of Commanders (1 to 6)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  onClick={() => setPlayerCount(count)}
                  className={`py-3 rounded-lg font-bold text-sm border transition-all ${
                    playerCount === count
                      ? 'bg-cyan-600 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {count}P
                </button>
              ))}
            </div>
          </div>

          {/* Active Factions Preview */}
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Assigned Human Factions ({playerCount} Factions)
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {HUMAN_FACTIONS.slice(0, playerCount).map((faction, idx) => (
                <div
                  key={faction.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: faction.defaultColor }}
                    />
                    <span className="font-bold text-slate-200">{faction.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Home Sector {faction.startingSectorNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Start Game Button */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onStartGame(playerCount)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" /> Launch Galaxy
          </button>
        </div>
      </div>
    </div>
  );
};
