import React from 'react';
import { PlayerState } from '../../engine/types/player';
import { calculatePlayerRoundSummary } from '../../engine/rules/economyEngine';
import {
  Coins,
  FlaskConical,
  Hammer,
  CircleDot,
  Ship,
  Layers,
  Cpu,
  Shield,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';

interface PlayerBoardProps {
  player: PlayerState;
  isActive: boolean;
  onOpenBlueprints: () => void;
  onOpenTechMarket: () => void;
  onOpenTrade: () => void;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  player,
  isActive,
  onOpenBlueprints,
  onOpenTechMarket,
  onOpenTrade,
}) => {
  const summary = calculatePlayerRoundSummary(player);

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${
        isActive
          ? 'bg-slate-900/90 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
          : 'bg-slate-900/60 border-slate-800 opacity-90'
      }`}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: player.color }}
          />
          <div>
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2 font-display">
              {player.name}
              {player.hasPassed && (
                <span className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded uppercase font-sans">
                  Passed
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">{player.faction.traitDescription}</div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenTrade}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors"
            title="Trade 2:1 for Credits"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenTechMarket}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-pink-400 transition-colors"
            title="Tech Research Display"
          >
            <Cpu className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenBlueprints}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
            title="Ship Blueprints Designer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Primary Resources with Income preview */}
      <div className="grid grid-cols-3 gap-2.5 mb-3">
        {/* Money (Credits) - Bright Yellow */}
        <div className="bg-slate-950/70 border border-yellow-950/60 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[11px] text-yellow-400 font-semibold">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> MONEY
            </span>
            <span
              className={`text-[10px] ${
                summary.netMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.netMoneyDelta >= 0 ? `+${summary.netMoneyDelta}` : summary.netMoneyDelta}/rnd
            </span>
          </div>
          <span className="text-xl font-bold text-yellow-300 font-display mt-0.5">
            {player.resources.money}
          </span>
          <span className="text-[10px] text-slate-500">
            Inc: +{summary.income.money} | Upkeep: -{summary.upkeep}
          </span>
        </div>

        {/* Science */}
        <div className="bg-slate-950/70 border border-pink-950/40 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[11px] text-pink-400 font-semibold">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5" /> SCIENCE
            </span>
            <span className="text-[10px] text-emerald-400">+{summary.income.science}/rnd</span>
          </div>
          <span className="text-xl font-bold text-pink-300 font-display mt-0.5">
            {player.resources.science}
          </span>
          <span className="text-[10px] text-slate-500">
            {player.techTrack.researched.length} Researched Techs
          </span>
        </div>

        {/* Materials */}
        <div className="bg-slate-950/70 border border-amber-900/30 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[11px] text-amber-600 font-semibold">
            <span className="flex items-center gap-1">
              <Hammer className="w-3.5 h-3.5" /> MATERIALS
            </span>
            <span className="text-[10px] text-emerald-400">+{summary.income.materials}/rnd</span>
          </div>
          <span className="text-xl font-bold text-amber-500 font-display mt-0.5">
            {player.resources.materials}
          </span>
          <span className="text-[10px] text-slate-500">For Fleet & Builds</span>
        </div>
      </div>

      {/* Influence Discs & Colony Ships Bar */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950/60 rounded border border-slate-800 p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <CircleDot className="w-4 h-4 text-cyan-400" />
            <span>Influence Discs</span>
          </div>
          <span className="font-bold text-slate-200">
            {player.influenceTrack.discsOnTrack} / {player.influenceTrack.totalDiscs}
          </span>
        </div>

        <div className="bg-slate-950/60 rounded border border-slate-800 p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Ship className="w-4 h-4 text-indigo-400" />
            <span>Colony Ships</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {Array.from({ length: player.colonyShips.total }).map((_, cIdx) => {
                const isReady = cIdx < player.colonyShips.ready;
                return (
                  <span
                    key={`cs_${cIdx}`}
                    title={isReady ? 'Colony Ship Ready (Unused)' : 'Colony Ship Exhausted'}
                    className={`w-3.5 h-4.5 rounded-sm border flex items-center justify-center text-[8px] transition-all ${
                      isReady
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 font-bold shadow-sm shadow-indigo-500/30'
                        : 'bg-slate-900 border-slate-700/60 text-slate-600 border-dashed'
                    }`}
                  >
                    ▲
                  </span>
                );
              })}
            </div>
            <span className="font-bold text-slate-200 ml-1">
              {player.colonyShips.ready}/{player.colonyShips.total}
            </span>
          </div>
        </div>
      </div>

      {/* Researched Technologies Strip */}
      {player.techTrack.researched.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Researched Techs
          </div>
          <div className="flex flex-wrap gap-1.5">
            {player.techTrack.researched.map((tech) => (
              <span
                key={tech.id}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  tech.category === 'military'
                    ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                    : tech.category === 'grid'
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                    : tech.category === 'nano'
                    ? 'bg-sky-950/50 border-sky-800/60 text-sky-300'
                    : 'bg-purple-950/50 border-purple-800/60 text-purple-300'
                }`}
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kept Discoveries & Unlocked Ancient Parts */}
      {((player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0) ||
        (player.unlockedAncientParts && player.unlockedAncientParts.length > 0)) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-amber-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
            <span>Ancient Discoveries</span>
            {player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0 && (
              <span className="text-[10px] text-amber-300 font-bold">
                +{player.keptDiscoveryTiles.length * 2} VP
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {player.keptDiscoveryTiles?.map((disc, dIdx) => (
              <span
                key={`kept_disc_${dIdx}`}
                className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/50 border-amber-600/60 text-amber-300 flex items-center gap-1"
                title={`${disc.name}: +2 VP at game end`}
              >
                ★ {disc.name}
              </span>
            ))}
            {player.unlockedAncientParts?.map((partId) => (
              <span
                key={`unlocked_part_${partId}`}
                className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-cyan-950/50 border-cyan-600/60 text-cyan-300 flex items-center gap-1"
                title="Ancient module unlocked for blueprints"
              >
                ⚡ {partId.replace('_', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
