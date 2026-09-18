import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { calculatePlayerRoundSummary, calculateActionCostForecast, getIncomeForecast } from '../../engine/rules/economyEngine';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { SectorTile } from '../../engine/types/galaxy';
import { countPlayerShips, SHIP_LIMITS } from '../../engine/rules/shipValidation';
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
  LayoutDashboard,
  Zap,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PlayerBoardProps {
  player: PlayerState;
  isActive: boolean;
  sectors?: SectorTile[];
  onOpenBlueprints: () => void;
  onOpenTechMarket: () => void;
  onOpenTrade: () => void;
  onOpenPhysicalBoard?: () => void;
  hideOpponentReputation?: boolean;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  player,
  isActive,
  sectors = [],
  onOpenBlueprints,
  onOpenTechMarket,
  onOpenTrade,
  onOpenPhysicalBoard,
  hideOpponentReputation = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showFleet, setShowFleet] = useState<boolean>(false);
  const [showTech, setShowTech] = useState<boolean>(false);

  const summary = calculatePlayerRoundSummary(player);
  const forecast = calculateActionCostForecast(player);
  const deployed = countPlayerShips(sectors, player.id);
  const moneyForecast = getIncomeForecast(player.population.money.cubesOnBoard);
  const sciForecast = getIncomeForecast(player.population.science.cubesOnBoard);
  const matForecast = getIncomeForecast(player.population.material.cubesOnBoard);

  const reputationVP = player.reputationTiles.reduce((a, b) => a + b, 0);
  const totalShipsDeployed = deployed.interceptor + deployed.cruiser + deployed.dreadnought + deployed.starbase;

  // Collapsed compact mini-HUD
  if (isCollapsed) {
    return (
      <div
        className={`border rounded-xl p-2.5 transition-all shadow-xl backdrop-blur-md ${
          isActive
            ? 'bg-slate-900/95 border-cyan-500/80 shadow-cyan-950/50'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Faction dot & Player Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-white/20 shrink-0"
              style={{ backgroundColor: player.color }}
            />
            <span className="font-bold text-xs text-slate-100 font-display truncate">
              {player.name}
            </span>
            {player.hasPassed && (
              <span className="text-[9px] bg-slate-800 text-amber-400 px-1 py-0.2 rounded uppercase">
                Pass
              </span>
            )}
          </div>

          {/* Quick buttons & Expand */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenPhysicalBoard && (
              <button
                onClick={onOpenPhysicalBoard}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                title="Full Physical Board (P)"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenTrade}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors"
              title="Trade 2:1"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenTechMarket}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-pink-400 transition-colors"
              title="Tech Market"
            >
              <Cpu className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenBlueprints}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              title="Ship Designer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition-colors ml-0.5"
              title="Expand Commander Dashboard"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Resource & Status Badges Strip */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono overflow-x-auto">
          {/* Money */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-950/40 border border-yellow-800/50 text-yellow-300"
            title={`Money: ${player.resources.money} | Income: +${summary.income.money} | Upkeep: -${summary.upkeep}`}
          >
            <Coins className="w-3 h-3 text-yellow-400" />
            <span className="font-bold">{player.resources.money}</span>
            <span className="text-[9px] text-slate-400">
              ({summary.netMoneyDelta >= 0 ? `+${summary.netMoneyDelta}` : summary.netMoneyDelta})
            </span>
          </div>

          {/* Science */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-950/40 border border-pink-800/50 text-pink-300"
            title={`Science: ${player.resources.science} | Income: +${summary.income.science}`}
          >
            <FlaskConical className="w-3 h-3 text-pink-400" />
            <span className="font-bold">{player.resources.science}</span>
          </div>

          {/* Materials */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300"
            title={`Materials: ${player.resources.materials} | Income: +${summary.income.materials}`}
          >
            <Hammer className="w-3 h-3 text-amber-500" />
            <span className="font-bold">{player.resources.materials}</span>
          </div>

          {/* Discs */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300"
            title={`Influence Discs on Track: ${player.influenceTrack.discsOnTrack} / ${player.influenceTrack.totalDiscs}`}
          >
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{player.influenceTrack.discsOnTrack}</span>
          </div>

          {/* Colony Ships */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300"
            title={`Colony Ships: ${player.colonyShips.ready} Ready / ${player.colonyShips.total}`}
          >
            <Ship className="w-3 h-3 text-indigo-400" />
            <span>{player.colonyShips.ready}</span>
          </div>

          {/* Reputation */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-600/50 text-amber-300 ml-auto"
            title={
              hideOpponentReputation
                ? `Reputation: ? VP (${player.reputationTiles.length}/${player.faction.reputationSlots ?? 5} tiles, secret)`
                : `Reputation: ${reputationVP} VP (${player.reputationTiles.length}/${player.faction.reputationSlots ?? 5} tiles)`
            }
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="font-bold">{hideOpponentReputation ? '? VP' : `${reputationVP} VP`}</span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded HUD view
  return (
    <div
      className={`border rounded-xl p-3.5 transition-all shadow-2xl backdrop-blur-md ${
        isActive
          ? 'bg-slate-900/95 border-cyan-500/80 shadow-cyan-950/40'
          : 'bg-slate-900/80 border-slate-800 opacity-95'
      }`}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shrink-0"
            style={{ backgroundColor: player.color }}
          />
          <div className="min-w-0">
            <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5 font-display truncate">
              <span>{player.name}</span>
              {player.hasPassed && (
                <span className="text-[9px] bg-slate-800 text-amber-400 px-1 py-0.2 rounded uppercase font-sans">
                  Passed
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{player.faction.traitDescription}</div>
          </div>
        </div>

        {/* Action buttons + Minimize */}
        <div className="flex items-center gap-1 shrink-0">
          {onOpenPhysicalBoard && (
            <button
              onClick={onOpenPhysicalBoard}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              title="Full Physical Player Board (Key: P)"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}
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
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Minimize Dashboard"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Primary Resources Cards */}
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        {/* Money (Credits) */}
        <div className="bg-slate-950/80 border border-yellow-950/70 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[10.5px] text-yellow-400 font-semibold">
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" /> MONEY
            </span>
            <span
              className={`text-[9.5px] font-mono ${
                summary.netMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.netMoneyDelta >= 0 ? `+${summary.netMoneyDelta}` : summary.netMoneyDelta}
            </span>
          </div>
          <span className="text-lg font-bold text-yellow-300 font-display mt-0.5">
            {player.resources.money}
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            Inc: +{summary.income.money} <span className="text-yellow-400 font-mono font-bold">(+{moneyForecast.next1Cube.delta})</span>
          </span>
        </div>

        {/* Science */}
        <div className="bg-slate-950/80 border border-pink-950/50 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[10.5px] text-pink-400 font-semibold">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-pink-400" /> SCIENCE
            </span>
            <span className="text-[9.5px] font-mono text-emerald-400">+{summary.income.science}</span>
          </div>
          <span className="text-lg font-bold text-pink-300 font-display mt-0.5">
            {player.resources.science}
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            {player.techTrack.researched.length} Techs <span className="text-pink-400 font-mono font-bold">(+{sciForecast.next1Cube.delta})</span>
          </span>
        </div>

        {/* Materials */}
        <div className="bg-slate-950/80 border border-amber-900/40 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[10.5px] text-amber-500 font-semibold">
            <span className="flex items-center gap-1">
              <Hammer className="w-3 h-3 text-amber-500" /> MATERIALS
            </span>
            <span className="text-[9.5px] font-mono text-emerald-400">+{summary.income.materials}</span>
          </div>
          <span className="text-lg font-bold text-amber-400 font-display mt-0.5">
            {player.resources.materials}
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            Fleet <span className="text-amber-400 font-mono font-bold">(+{matForecast.next1Cube.delta})</span>
          </span>
        </div>
      </div>

      {/* Discs, Colony Ships, and Reputation Bar */}
      <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
        {/* Discs */}
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/90 p-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>Discs</span>
          </div>
          <span className="font-bold text-slate-200 font-mono text-xs mt-0.5">
            {player.influenceTrack.discsOnTrack} / {player.influenceTrack.totalDiscs}
          </span>
        </div>

        {/* Colony Ships */}
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/90 p-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Ship className="w-3 h-3 text-indigo-400" />
            <span>Colony Ships</span>
          </div>
          <span className="font-bold text-slate-200 font-mono text-xs mt-0.5">
            {player.colonyShips.ready} / {player.colonyShips.total}
          </span>
        </div>

        {/* Reputation Tiles */}
        <div className="bg-slate-950/70 rounded-lg border border-amber-800/40 p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-amber-400">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Rep
            </span>
            <span className="font-bold font-mono text-amber-300">
              {hideOpponentReputation ? '? VP' : `${reputationVP} VP`}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 overflow-x-auto">
            {Array.from({ length: player.faction.reputationSlots ?? 5 }).map((_, rIdx) => {
              const val = player.reputationTiles[rIdx];
              return (
                <span
                  key={`hud_rep_${rIdx}`}
                  className={`w-3.5 h-3.5 rounded-sm border text-[8px] font-bold flex items-center justify-center font-mono ${
                    val !== undefined
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'border-dashed border-slate-800 text-slate-700'
                  }`}
                  title={
                    val !== undefined
                      ? hideOpponentReputation
                        ? 'Facedown Reputation Tile (Secret)'
                        : `Reputation Tile: +${val} VP`
                      : `Empty Reputation Slot ${rIdx + 1}`
                  }
                >
                  {val !== undefined ? (hideOpponentReputation ? '?' : val) : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Upkeep Forecast Strip */}
      <div
        onClick={onOpenPhysicalBoard}
        className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-1.5 transition-all cursor-pointer group mb-2"
        title="Click to view full Physical Board & Upkeep Forecaster (P)"
      >
        <div className="flex items-center justify-between text-[9.5px] font-semibold text-slate-400 mb-1">
          <span className="flex items-center gap-1 text-amber-400 group-hover:text-amber-300">
            <Zap className="w-2.5 h-2.5 text-amber-400" /> Upkeep Forecast
          </span>
          <span className="text-[8.5px] text-cyan-400 font-mono group-hover:underline">
            Board (P) →
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10.5px] font-mono">
          <div className="bg-slate-900/90 rounded px-1.5 py-0.5 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[9px]">+1 Act:</span>
            <span className="font-bold text-amber-300">
              -{forecast.after1Action.upkeep}{' '}
              <span className="text-[8.5px] text-rose-400">(+{forecast.after1Action.costIncrease})</span>
            </span>
          </div>
          <div className="bg-slate-900/90 rounded px-1.5 py-0.5 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[9px]">+2 Act:</span>
            <span className="font-bold text-rose-300">
              -{forecast.after2Actions.upkeep}{' '}
              <span className="text-[8.5px] text-rose-400">(+{forecast.after2Actions.costIncrease})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible Secondary Drawers: Fleet Supply & Researched Techs */}
      <div className="space-y-1.5">
        {/* Fleet Supply Toggle */}
        <div className="bg-slate-950/50 rounded-lg border border-slate-800/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFleet((prev) => !prev)}
            className="w-full px-2 py-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1 text-cyan-400">
              <Ship className="w-3 h-3" /> Fleet In Service ({totalShipsDeployed})
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
              {showFleet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </button>
          {showFleet && (
            <div className="p-2 pt-0 grid grid-cols-4 gap-1 text-center font-mono">
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800">
                <div className="text-[8px] text-slate-400 uppercase">Int</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.interceptor}/{SHIP_LIMITS.interceptor}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800">
                <div className="text-[8px] text-slate-400 uppercase">Cru</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.cruiser}/{SHIP_LIMITS.cruiser}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800">
                <div className="text-[8px] text-slate-400 uppercase">Dre</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.dreadnought}/{SHIP_LIMITS.dreadnought}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800">
                <div className="text-[8px] text-slate-400 uppercase">Sta</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.starbase}/{SHIP_LIMITS.starbase}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Researched Technologies Toggle */}
        {player.techTrack.researched.length > 0 && (
          <div className="bg-slate-950/50 rounded-lg border border-slate-800/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTech((prev) => !prev)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1 text-pink-400">
                <Cpu className="w-3 h-3" /> Researched Techs ({player.techTrack.researched.length})
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                {showTech ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </button>
            {showTech && (
              <div className="p-2 pt-0 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {player.techTrack.researched.map((tech) => (
                  <span
                    key={tech.id}
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
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
            )}
          </div>
        )}

        {/* Kept Discoveries Badge */}
        {((player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0) ||
          (player.unlockedAncientParts && player.unlockedAncientParts.length > 0)) && (
          <div className="px-2 py-1 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-center justify-between text-[9.5px]">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              ★ Discoveries
            </span>
            <span className="text-amber-300 font-bold font-mono">
              +{((player.keptDiscoveryTiles?.length || 0) * 2)} VP
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
