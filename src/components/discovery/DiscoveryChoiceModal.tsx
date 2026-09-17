import React from 'react';
import { Rocket } from 'lucide-react';
import { DiscoveryTile } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { SHIP_PARTS } from '../../engine/rules/partData';

interface DiscoveryChoiceModalProps {
  discovery: DiscoveryTile;
  player: PlayerState;
  onChoice: (keepForVictoryPoints: boolean) => void;
}

export const DiscoveryChoiceModal: React.FC<DiscoveryChoiceModalProps> = ({
  discovery,
  player,
  onChoice,
}) => {
  const part = discovery.shipPartId ? SHIP_PARTS[discovery.shipPartId] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/20 p-6 flex flex-col items-center text-center overflow-hidden">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Discovery Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 border border-amber-300/40">
          <svg
            className="w-9 h-9 text-slate-950"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>

        <div className="text-xs uppercase tracking-widest text-amber-400 font-black mb-1">
          Ancient Discovery Uncovered
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide mb-2">
          {discovery.name}
        </h2>
        <div className="text-xs text-slate-400 mb-4 font-medium">
          Commander <span className="font-bold text-slate-200">{player.name}</span> must decide how to utilize this ancient artifact.
        </div>

        {/* Tile Details Card */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            {discovery.description}
          </p>

          {part && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Ancient Tech Module: {part.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Power: {part.powerRequired} | Hull: +{part.hullPoints} | Shield: -{part.shieldBonus} | Computer: +{part.computerBonus}
                  {part.dice && part.dice.length > 0 && ` | ${part.dice[0].count}x ${part.dice[0].color} dice`}
                </div>
              </div>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs font-mono font-bold">
                PART
              </span>
            </div>
          )}

          {discovery.immediateReward && (
            <div className="flex flex-wrap gap-2 mt-2">
              {discovery.immediateReward.money && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  +{discovery.immediateReward.money} Credits
                </span>
              )}
              {discovery.immediateReward.science && (
                <span className="px-2.5 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                  +{discovery.immediateReward.science} Science
                </span>
              )}
              {discovery.immediateReward.materials && (
                <span className="px-2.5 py-1 bg-amber-700/20 border border-amber-700/40 text-amber-500 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  +{discovery.immediateReward.materials} Materials
                </span>
              )}
              {discovery.immediateReward.grantShipType && (
                <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-purple-400" />
                  +1 Free {discovery.immediateReward.grantShipType.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: 2 VP vs Immediate Reward */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChoice(true)}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 transition group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
              <span className="text-base">🏆</span> Keep for Victory Points
            </div>
            <span className="text-xs text-slate-400">
              Score <strong className="text-amber-300">+2 VP</strong> at game end
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChoice(false)}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/25 transition group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
              <span className="text-base">⚡</span> Take Immediate Reward
            </div>
            <span className="text-xs text-slate-400">
              {part
                ? 'Unlock module for ship blueprints'
                : discovery.immediateReward?.grantShipType
                  ? `Deploy free ${discovery.immediateReward.grantShipType} to sector`
                  : 'Collect resources immediately'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
