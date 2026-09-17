import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ShipType, SectorTile } from '../../engine/types/galaxy';
import { Technology } from '../../engine/types/tech';
import { ShipPart } from '../../engine/types/blueprints';
import {
  calculatePlayerRoundSummary,
  calculateActionCostForecast,
  getPlayerTechRows,
  TECH_ROW_SLOT_COUNT,
  UPKEEP_TABLE,
  INCOME_TABLE,
} from '../../engine/rules/economyEngine';
import { calculateBlueprintStats, countPlayerShips, SHIP_LIMITS } from '../../engine/rules/shipValidation';
import {
  X,
  Zap,
  Heart,
  Navigation,
  Crosshair,
  Shield,
  Coins,
  FlaskConical,
  Hammer,
  Ship,
  CircleDot,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  ChevronRight,
  Info,
} from 'lucide-react';

interface PhysicalPlayerBoardModalProps {
  player: PlayerState;
  players: PlayerState[];
  activePlayerId: string;
  sectors: SectorTile[];
  onClose: () => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenBlueprintEditor: (shipType?: ShipType) => void;
  onOpenTechMarket: () => void;
}

export const PhysicalPlayerBoardModal: React.FC<PhysicalPlayerBoardModalProps> = ({
  player,
  players,
  activePlayerId,
  sectors,
  onClose,
  onSelectPlayer,
  onOpenBlueprintEditor,
  onOpenTechMarket,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'tech' | 'blueprints'>('all');
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const summary = useMemo(() => calculatePlayerRoundSummary(player), [player]);
  const forecast = useMemo(() => calculateActionCostForecast(player), [player]);
  const techRows = useMemo(() => getPlayerTechRows(player), [player]);
  const deployed = useMemo(() => countPlayerShips(sectors, player.id), [sectors, player.id]);

  const isActive = player.id === activePlayerId;

  // Ship stats calculations for all 4 ship classes
  const shipClasses: { type: ShipType; name: string; maxSlots: number; baseCost: number }[] = [
    { type: 'interceptor', name: 'Interceptor', maxSlots: 4, baseCost: 3 },
    { type: 'cruiser', name: 'Cruiser', maxSlots: 6, baseCost: 5 },
    { type: 'dreadnought', name: 'Dreadnought', maxSlots: 8, baseCost: 8 },
    { type: 'starbase', name: 'Starbase', maxSlots: 5, baseCost: 3 },
  ];

  const blueprintsWithStats = useMemo(() => {
    return shipClasses.map((sc) => {
      const bp = player.blueprints[sc.type];
      const stats = bp ? calculateBlueprintStats(bp) : null;
      return {
        ...sc,
        blueprint: bp,
        stats,
        deployedCount: deployed[sc.type] || 0,
        limit: SHIP_LIMITS[sc.type] || 0,
      };
    });
  }, [player.blueprints, deployed]);

  // Influence disc track total slots: standard 13 or player totalDiscs
  const maxDiscs = Math.max(13, player.influenceTrack.totalDiscs);
  const discSlots = Array.from({ length: maxDiscs }, (_, i) => maxDiscs - 1 - i); // [12, 11, ..., 0]

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl w-full max-w-7xl h-[94vh] shadow-2xl overflow-hidden flex flex-col text-slate-100 ring-1 ring-cyan-500/20">
        
        {/* =================================================================== */}
        {/* HEADER: Faction identity, resource summaries, hotseat & navigation  */}
        {/* =================================================================== */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div
              className="w-5 h-5 rounded-full ring-2 ring-white/30 shadow-lg"
              style={{ backgroundColor: player.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-slate-100 font-display">
                  {player.name}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 uppercase font-bold">
                  {player.faction.isHuman ? 'Terran Faction' : 'Alien Faction'}
                </span>
                {isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 animate-pulse">
                    ● Active Commander
                  </span>
                )}
                {player.hasPassed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase">
                    Passed
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{player.faction.traitDescription}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {player.influenceTrack.discsOnTrack} Discs on Track / {player.influenceTrack.totalDiscs} Total
                </span>
              </div>
            </div>
          </div>

          {/* Hotseat Player Quick Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <span className="text-[11px] text-slate-400 px-1.5 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Player Board:
              </span>
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPlayer(p.id)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                    p.id === player.id
                      ? 'bg-slate-800 text-white shadow ring-1 ring-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name.split(' ')[1] || p.name}</span>
                </button>
              ))}
            </div>

            {/* View Mode Tabs */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Mat
              </button>
              <button
                onClick={() => setActiveTab('tracks')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'tracks' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upkeep & Discs
              </button>
              <button
                onClick={() => setActiveTab('tech')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'tech' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tech Rows
              </button>
              <button
                onClick={() => setActiveTab('blueprints')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'blueprints' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ship Blueprints
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
              title="Close Physical Player Board (Esc / P)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MAIN SCROLLABLE MAT VIEW                                           */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/90 text-slate-100">

          {/* ================================================================= */}
          {/* SECTION 1: INFLUENCE TRACK & UPKEEP FORECASTER                    */}
          {/* Directly answers: "how much do I cost more when I use next two"   */}
          {/* ================================================================= */}
          {(activeTab === 'all' || activeTab === 'tracks') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                      INFLUENCE DISC & UPKEEP TRACK
                    </h2>
                    <p className="text-xs text-slate-400">
                      Discs on track cover upkeep costs. As discs are placed on actions or sectors, higher upkeep is uncovered.
                    </p>
                  </div>
                </div>

                {/* Colony Ships Status */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5">
                  <Ship className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-semibold">Colony Ships:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: player.colonyShips.total }).map((_, cIdx) => {
                      const isReady = cIdx < player.colonyShips.ready;
                      return (
                        <div
                          key={`cs_phy_${cIdx}`}
                          title={isReady ? 'Colony Ship Ready' : 'Colony Ship Exhausted'}
                          className={`w-4 h-5 rounded-sm border flex items-center justify-center text-[9px] font-black transition-all ${
                            isReady
                              ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200 shadow-sm shadow-indigo-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-600 border-dashed'
                          }`}
                        >
                          ▲
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-300 ml-1">
                    {player.colonyShips.ready}/{player.colonyShips.total} Ready
                  </span>
                </div>
              </div>

              {/* ACTION COST FORECASTER HUD (Direct User Question Feature) */}
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3.5 shadow-inner">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-display">
                      Action Cost & Upkeep Forecaster
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Current Credits: <strong className="text-yellow-300">{player.resources.money}</strong> | Money Income:{' '}
                    <strong className="text-emerald-400">+{summary.income.money}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-sans">
                  {/* Current Upkeep */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>CURRENT UPKEEP</span>
                      <span className="text-cyan-400 font-mono">{forecast.currentDiscs} Discs</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-300 font-display mt-1">
                      -{forecast.currentUpkeep} Credits
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Net: <span className={summary.netMoneyDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {summary.netMoneyDelta >= 0 ? `+${summary.netMoneyDelta}` : summary.netMoneyDelta}
                      </span> /round
                    </div>
                  </div>

                  {/* Next 1 Action */}
                  <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg p-2.5 flex flex-col justify-between ring-1 ring-amber-500/20">
                    <div className="text-amber-300 text-[11px] font-semibold flex items-center justify-between">
                      <span>NEXT 1 ACTION</span>
                      <span className="text-amber-400/80 font-mono">1 Disc Used</span>
                    </div>
                    <div className="text-lg font-bold text-amber-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after1Action.upkeep} Credits</span>
                      <span className="text-xs font-mono font-normal text-rose-400">
                        (+{forecast.after1Action.costIncrease} cost)
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        Net: <span className={forecast.after1Action.projectedNetMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {forecast.after1Action.projectedNetMoneyDelta >= 0 ? `+${forecast.after1Action.projectedNetMoneyDelta}` : forecast.after1Action.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after1Action.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ Safe</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">⚠️ Deficit</span>
                      )}
                    </div>
                  </div>

                  {/* Next 2 Actions (Targeted by User) */}
                  <div className="bg-slate-950/80 border border-rose-500/50 rounded-lg p-2.5 flex flex-col justify-between ring-1 ring-rose-500/30 bg-rose-950/10">
                    <div className="text-rose-300 text-[11px] font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-rose-400" /> NEXT 2 ACTIONS
                      </span>
                      <span className="text-rose-400/80 font-mono">2 Discs Used</span>
                    </div>
                    <div className="text-lg font-bold text-rose-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after2Actions.upkeep} Credits</span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        (+{forecast.after2Actions.costIncrease} more)
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        Net: <span className={forecast.after2Actions.projectedNetMoneyDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {forecast.after2Actions.projectedNetMoneyDelta >= 0 ? `+${forecast.after2Actions.projectedNetMoneyDelta}` : forecast.after2Actions.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after2Actions.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ Safe</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">⚠️ Risk Bankruptcy</span>
                      )}
                    </div>
                  </div>

                  {/* Next 3 Actions */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>NEXT 3 ACTIONS</span>
                      <span className="text-slate-500 font-mono">3 Discs Used</span>
                    </div>
                    <div className="text-lg font-bold text-slate-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after3Actions.upkeep} Credits</span>
                      <span className="text-xs font-mono text-slate-400">
                        (+{forecast.after3Actions.costIncrease} more)
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        Net: <span className={forecast.after3Actions.projectedNetMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {forecast.after3Actions.projectedNetMoneyDelta >= 0 ? `+${forecast.after3Actions.projectedNetMoneyDelta}` : forecast.after3Actions.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after3Actions.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">✓ Safe</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">⚠️ Risk</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* VISUAL PHYSICAL INFLUENCE TRACK (Cardboard Indented Track) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    Physical Influence Track Slot Depressions
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Highest Uncovered Slot = Upkeep Owed During Upkeep Phase
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 overflow-x-auto shadow-inner">
                  <div className="flex items-center gap-2.5 min-w-[720px] justify-between">
                    {discSlots.map((slotIndex) => {
                      // Discs are stacked from right to left (covering lowest numbers first, uncovering highest upkeep)
                      const isCovered = slotIndex < player.influenceTrack.discsOnTrack;
                      const upkeepAtSlot = UPKEEP_TABLE[slotIndex] ?? 0;
                      const isCurrentUpkeepSlot = slotIndex === player.influenceTrack.discsOnTrack;
                      const isNextActionSlot = slotIndex === player.influenceTrack.discsOnTrack - 1;
                      const isNext2ActionsSlot = slotIndex === player.influenceTrack.discsOnTrack - 2;

                      return (
                        <div
                          key={`track_slot_${slotIndex}`}
                          className="flex flex-col items-center gap-1 shrink-0"
                          title={`Slot ${slotIndex} | Upkeep Cost: ${upkeepAtSlot} Credits ${
                            isCovered ? '(Covered by Disc)' : '(Uncovered)'
                          }`}
                        >
                          {/* Top indicator tag */}
                          <div className="h-4 flex items-center justify-center">
                            {isCurrentUpkeepSlot && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 shadow animate-bounce">
                                ACTIVE
                              </span>
                            )}
                            {isNextActionSlot && (
                              <span className="text-[8.5px] font-bold text-amber-400 font-mono">
                                +1 Act
                              </span>
                            )}
                            {isNext2ActionsSlot && (
                              <span className="text-[8.5px] font-bold text-rose-400 font-mono">
                                +2 Act
                              </span>
                            )}
                          </div>

                          {/* Physical circular disc slot depression */}
                          <div
                            className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all relative ${
                              isCurrentUpkeepSlot
                                ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                                : isNextActionSlot
                                ? 'border-dashed border-amber-400/80 bg-amber-950/20'
                                : isNext2ActionsSlot
                                ? 'border-dashed border-rose-400/80 bg-rose-950/20'
                                : isCovered
                                ? 'border-slate-700 bg-slate-900 shadow-inner'
                                : 'border-slate-800 bg-slate-950'
                            }`}
                          >
                            {isCovered ? (
                              /* 3D Physical Wooden/Acrylic Influence Disc Token */
                              <div
                                className="w-8 h-8 rounded-full border border-white/40 shadow-md flex items-center justify-center text-[10px] font-extrabold text-white transform hover:scale-105 transition-transform"
                                style={{
                                  backgroundColor: player.color,
                                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.6)',
                                }}
                              >
                                <CircleDot className="w-4 h-4 text-white/90 drop-shadow" />
                              </div>
                            ) : (
                              /* Uncovered printed upkeep number */
                              <span
                                className={`text-sm font-extrabold font-display ${
                                  isCurrentUpkeepSlot
                                    ? 'text-amber-300 scale-110'
                                    : upkeepAtSlot > 0
                                    ? 'text-rose-400/90'
                                    : 'text-slate-500'
                                }`}
                              >
                                -{upkeepAtSlot}
                              </span>
                            )}
                          </div>

                          {/* Slot index label */}
                          <div className="text-[9px] font-mono text-slate-500">
                            #{slotIndex}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 2: THE 3 TECHNOLOGY ROWS (Military, Grid, Nano)          */}
          {/* Directly answers: "which tech is on which row"                    */}
          {/* ================================================================= */}
          {(activeTab === 'all' || activeTab === 'tech') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-pink-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                      TECHNOLOGY TRACKS & ROWS
                    </h2>
                    <p className="text-xs text-slate-400">
                      Technologies are placed into rows from left to right. Each row provides progressive science discounts and end-game Victory Points.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    Total Researched: <strong className="text-pink-300">{player.techTrack.researched.length}</strong>
                  </span>
                  <button
                    onClick={onOpenTechMarket}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-950/50 hover:bg-pink-900/60 border border-pink-700/60 text-pink-300 text-xs font-bold transition-all shadow"
                  >
                    <Cpu className="w-3.5 h-3.5 text-pink-400" />
                    <span>Open Tech Tray Market</span>
                  </button>
                </div>
              </div>

              {/* 3 Physical Horizontal Tech Rows */}
              <div className="space-y-3.5">
                {/* 1. MILITARY ROW (RED) */}
                <div className="bg-slate-900/90 border border-rose-950/80 rounded-xl p-3.5 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-display flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5 text-rose-400" /> MILITARY TECH ROW ({techRows.military.count} Researched)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Next Discount: <strong className="text-rose-300">-{techRows.military.nextDiscount} Science</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.military.victoryPoints > 0 ? `+${techRows.military.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* 7 Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {Array.from({ length: TECH_ROW_SLOT_COUNT }).map((_, sIdx) => {
                      const tech = techRows.military.techs[sIdx];
                      const discount = Math.min(6, sIdx);
                      const vpEarned = sIdx >= 6 ? 5 : sIdx >= 5 ? 3 : sIdx >= 4 ? 2 : sIdx >= 3 ? 1 : 0;

                      return (
                        <div
                          key={`mil_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          className={`min-h-[72px] rounded-lg border p-2 flex flex-col justify-between transition-all ${
                            tech
                              ? 'bg-rose-950/40 border-rose-500/80 shadow-md ring-1 ring-rose-500/30 cursor-pointer hover:border-rose-400'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">Slot {sIdx + 1}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div>
                              <div className="text-xs font-bold text-rose-200 line-clamp-1 font-display">
                                {tech.name}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                Base: {tech.baseCost} sci
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} Sci
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. GRID ROW (GREEN / EMERALD) */}
                <div className="bg-slate-900/90 border border-emerald-950/80 rounded-xl p-3.5 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-display flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" /> GRID TECH ROW ({techRows.grid.count} Researched)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Next Discount: <strong className="text-emerald-300">-{techRows.grid.nextDiscount} Science</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.grid.victoryPoints > 0 ? `+${techRows.grid.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* 7 Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {Array.from({ length: TECH_ROW_SLOT_COUNT }).map((_, sIdx) => {
                      const tech = techRows.grid.techs[sIdx];
                      const discount = Math.min(6, sIdx);
                      const vpEarned = sIdx >= 6 ? 5 : sIdx >= 5 ? 3 : sIdx >= 4 ? 2 : sIdx >= 3 ? 1 : 0;

                      return (
                        <div
                          key={`grid_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          className={`min-h-[72px] rounded-lg border p-2 flex flex-col justify-between transition-all ${
                            tech
                              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30 cursor-pointer hover:border-emerald-400'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">Slot {sIdx + 1}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-200 line-clamp-1 font-display">
                                {tech.name}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                Base: {tech.baseCost} sci
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} Sci
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. NANO ROW (BLUE / SKY) */}
                <div className="bg-slate-900/90 border border-sky-950/80 rounded-xl p-3.5 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-sky-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300 font-display flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-sky-400" /> NANO TECH ROW ({techRows.nano.count} Researched)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Next Discount: <strong className="text-sky-300">-{techRows.nano.nextDiscount} Science</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.nano.victoryPoints > 0 ? `+${techRows.nano.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* 7 Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {Array.from({ length: TECH_ROW_SLOT_COUNT }).map((_, sIdx) => {
                      const tech = techRows.nano.techs[sIdx];
                      const discount = Math.min(6, sIdx);
                      const vpEarned = sIdx >= 6 ? 5 : sIdx >= 5 ? 3 : sIdx >= 4 ? 2 : sIdx >= 3 ? 1 : 0;

                      return (
                        <div
                          key={`nano_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          className={`min-h-[72px] rounded-lg border p-2 flex flex-col justify-between transition-all ${
                            tech
                              ? 'bg-sky-950/40 border-sky-500/80 shadow-md ring-1 ring-sky-500/30 cursor-pointer hover:border-sky-400'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">Slot {sIdx + 1}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div>
                              <div className="text-xs font-bold text-sky-200 line-clamp-1 font-display">
                                {tech.name}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                Base: {tech.baseCost} sci
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} Sci
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. RARE TECHS TRAY */}
                {techRows.rare.length > 0 && (
                  <div className="bg-purple-950/20 border border-purple-900/60 rounded-xl p-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-300 font-display mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Researched Rare Technologies ({techRows.rare.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {techRows.rare.map((rt) => (
                        <div
                          key={rt.id}
                          onClick={() => setSelectedTech(rt)}
                          className="px-3 py-1.5 rounded-lg border border-purple-500/70 bg-purple-950/50 text-purple-200 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:border-purple-400 shadow"
                        >
                          <span>{rt.name}</span>
                          {rt.victoryPoints && rt.victoryPoints > 0 && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1 rounded border border-amber-800">
                              +{rt.victoryPoints} VP
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Tech Detail Drawer / Card */}
              {selectedTech && (
                <div className="bg-slate-900 border border-cyan-500/50 rounded-lg p-3 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-cyan-300 text-sm font-display flex items-center gap-2">
                      {selectedTech.name}
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedTech.category} tech
                      </span>
                    </div>
                    <p className="text-slate-300">{selectedTech.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTech(null)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 3: CURRENT SHIP BLUEPRINTS (HANGAR TRAY)                  */}
          {/* Directly answers: "what are my current ship blue print"            */}
          {/* ================================================================= */}
          {(activeTab === 'all' || activeTab === 'blueprints') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                      FLEET SHIP BLUEPRINTS
                    </h2>
                    <p className="text-xs text-slate-400">
                      Modular ship loadouts, installed weapon systems, drives, shields, and damage capacity.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenBlueprintEditor()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/70 text-cyan-300 text-xs font-bold transition-all shadow"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Ship Upgrade Designer</span>
                </button>
              </div>

              {/* 4 Ship Classes Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {blueprintsWithStats.map((sc) => {
                  const bp = sc.blueprint;
                  const stats = sc.stats;

                  return (
                    <div
                      key={sc.type}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md space-y-3"
                    >
                      {/* Ship Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Ship className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-slate-100 font-display uppercase tracking-wide">
                            {sc.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            Cost: {sc.baseCost} Mats
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">
                            Supply: <strong className={sc.deployedCount >= sc.limit ? 'text-amber-400' : 'text-cyan-300'}>
                              {sc.deployedCount}
                            </strong> / {sc.limit}
                          </span>
                          <button
                            onClick={() => onOpenBlueprintEditor(sc.type)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                            title={`Upgrade ${sc.name}`}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Ship Stats Bar */}
                      {stats && (
                        <div className="grid grid-cols-4 gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center font-mono">
                          <div>
                            <div className="text-[9px] text-slate-500 uppercase font-sans">HP</div>
                            <div className="text-xs font-bold text-rose-300">{stats.totalHull} HP</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500 uppercase font-sans">Speed</div>
                            <div className="text-xs font-bold text-cyan-300">
                              {sc.type === 'starbase' ? 'Immobile' : `${stats.totalDriveSpeed} Hex`}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500 uppercase font-sans">Init</div>
                            <div className="text-xs font-bold text-indigo-300">+{stats.totalInitiative}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500 uppercase font-sans">Power</div>
                            <div
                              className={`text-xs font-bold ${
                                stats.totalPowerProduced >= stats.totalPowerConsumed
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              +{stats.totalPowerProduced}/-{stats.totalPowerConsumed}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Component Slots Grid */}
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                          <span>Installed Component Slots</span>
                          <span className="font-mono text-slate-500">{bp ? bp.slots.length : 0} / {sc.maxSlots} Slots</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {Array.from({ length: sc.maxSlots }).map((_, slotIdx) => {
                            const part = bp?.slots[slotIdx] || null;

                            return (
                              <div
                                key={`slot_${sc.type}_${slotIdx}`}
                                className={`min-h-[50px] rounded-lg border p-1.5 flex flex-col justify-between transition-all ${
                                  part
                                    ? part.id.startsWith('ancient_') || part.id === 'ion_turret' || part.id === 'shard_hull' || part.id === 'flux_shield'
                                      ? 'bg-amber-950/40 border-amber-500/70 text-amber-200 shadow ring-1 ring-amber-500/30'
                                      : part.category === 'reactor'
                                      ? 'bg-amber-950/30 border-amber-700/60 text-amber-300'
                                      : part.category === 'drive'
                                      ? 'bg-cyan-950/30 border-cyan-700/60 text-cyan-300'
                                      : part.category === 'hull'
                                      ? 'bg-rose-950/30 border-rose-700/60 text-rose-300'
                                      : part.category === 'computer'
                                      ? 'bg-indigo-950/30 border-indigo-700/60 text-indigo-300'
                                      : part.category === 'shield'
                                      ? 'bg-teal-950/30 border-teal-700/60 text-teal-300'
                                      : 'bg-yellow-950/30 border-yellow-700/60 text-yellow-300'
                                    : 'bg-slate-950/50 border-slate-800 border-dashed text-slate-600'
                                }`}
                              >
                                <div className="text-[8.5px] font-mono font-bold text-slate-500 flex items-center justify-between">
                                  <span>#{slotIdx + 1}</span>
                                  {part?.dice && part.dice.length > 0 && (
                                    <span className="text-[8px] px-1 rounded bg-yellow-900/60 text-yellow-300 font-extrabold">
                                      {part.dice.map((d) => `${d.count}x${d.color[0]?.toUpperCase()}`).join(',')}
                                    </span>
                                  )}
                                </div>

                                {part ? (
                                  <div>
                                    <div className="text-[10.5px] font-bold leading-tight line-clamp-1">
                                      {part.name}
                                    </div>
                                    <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                                      {part.powerProduced > 0
                                        ? `+${part.powerProduced} PWR`
                                        : part.powerConsumed > 0
                                        ? `-${part.powerConsumed} PWR`
                                        : '0 PWR'}
                                      {part.hullBonus > 0 && ` | +${part.hullBonus} HP`}
                                      {part.computerBonus > 0 && ` | +${part.computerBonus} Aim`}
                                      {part.shieldBonus > 0 && ` | -${part.shieldBonus} Shld`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-center text-slate-600 font-mono py-1">
                                    Empty
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 4: 3 POPULATION INCOME TRACKS (Money, Science, Material)  */}
          {/* Physical wooden cubes covering slots uncovering income numbers    */}
          {/* ================================================================= */}
          {(activeTab === 'all' || activeTab === 'tracks') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                  <Layers className="w-5 h-5 text-yellow-400" />
                  POPULATION & RESOURCE INCOME TRACKS
                </h2>
                <p className="text-xs text-slate-400">
                  Each track holds 12 population cubes. Colonizing planets moves cubes from board to sectors, uncovering higher income for Upkeep.
                </p>
              </div>

              {/* 3 Population Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Money Track */}
                <div className="bg-slate-900/90 border border-yellow-950/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-yellow-400 flex items-center gap-1.5 font-display">
                      <Coins className="w-4 h-4 text-yellow-400" /> MONEY TRACK
                    </span>
                    <span className="font-mono text-yellow-300 font-bold">
                      +{summary.income.money} Credits/rnd
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                    {INCOME_TABLE.map((incValue, idx) => {
                      const cubesLeft = 12 - idx;
                      const hasCube = player.population.money.cubesOnBoard >= cubesLeft;
                      const isUncovered = player.population.money.cubesOnBoard === cubesLeft - 1;

                      return (
                        <div
                          key={`money_cube_${idx}`}
                          className={`h-10 rounded border flex flex-col items-center justify-center p-1 relative transition-all ${
                            hasCube
                              ? 'bg-slate-950 border-slate-800'
                              : isUncovered
                              ? 'bg-yellow-950/40 border-yellow-400 shadow ring-1 ring-yellow-400'
                              : 'bg-yellow-950/20 border-yellow-900/50'
                          }`}
                        >
                          {hasCube ? (
                            /* 3D Wooden Cube Token */
                            <div className="w-5 h-5 rounded-sm bg-yellow-500 border border-yellow-200 shadow-md transform hover:scale-105" />
                          ) : (
                            <span className="text-xs font-bold text-yellow-300 font-mono">
                              +{incValue}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Science Track */}
                <div className="bg-slate-900/90 border border-pink-950/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-pink-400 flex items-center gap-1.5 font-display">
                      <FlaskConical className="w-4 h-4 text-pink-400" /> SCIENCE TRACK
                    </span>
                    <span className="font-mono text-pink-300 font-bold">
                      +{summary.income.science} Sci/rnd
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                    {INCOME_TABLE.map((incValue, idx) => {
                      const cubesLeft = 12 - idx;
                      const hasCube = player.population.science.cubesOnBoard >= cubesLeft;
                      const isUncovered = player.population.science.cubesOnBoard === cubesLeft - 1;

                      return (
                        <div
                          key={`sci_cube_${idx}`}
                          className={`h-10 rounded border flex flex-col items-center justify-center p-1 relative transition-all ${
                            hasCube
                              ? 'bg-slate-950 border-slate-800'
                              : isUncovered
                              ? 'bg-pink-950/40 border-pink-400 shadow ring-1 ring-pink-400'
                              : 'bg-pink-950/20 border-pink-900/50'
                          }`}
                        >
                          {hasCube ? (
                            /* 3D Wooden Cube Token */
                            <div className="w-5 h-5 rounded-sm bg-pink-500 border border-pink-200 shadow-md transform hover:scale-105" />
                          ) : (
                            <span className="text-xs font-bold text-pink-300 font-mono">
                              +{incValue}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Materials Track */}
                <div className="bg-slate-900/90 border border-amber-950/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-500 flex items-center gap-1.5 font-display">
                      <Hammer className="w-4 h-4 text-amber-500" /> MATERIALS TRACK
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      +{summary.income.materials} Mats/rnd
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                    {INCOME_TABLE.map((incValue, idx) => {
                      const cubesLeft = 12 - idx;
                      const hasCube = player.population.material.cubesOnBoard >= cubesLeft;
                      const isUncovered = player.population.material.cubesOnBoard === cubesLeft - 1;

                      return (
                        <div
                          key={`mat_cube_${idx}`}
                          className={`h-10 rounded border flex flex-col items-center justify-center p-1 relative transition-all ${
                            hasCube
                              ? 'bg-slate-950 border-slate-800'
                              : isUncovered
                              ? 'bg-amber-950/40 border-amber-400 shadow ring-1 ring-amber-400'
                              : 'bg-amber-950/20 border-amber-900/50'
                          }`}
                        >
                          {hasCube ? (
                            /* 3D Wooden Cube Token */
                            <div className="w-5 h-5 rounded-sm bg-amber-600 border border-amber-300 shadow-md transform hover:scale-105" />
                          ) : (
                            <span className="text-xs font-bold text-amber-300 font-mono">
                              +{incValue}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* =================================================================== */}
        {/* FOOTER: Quick summary stats bar                                    */}
        {/* =================================================================== */}
        <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              💰 Money: <strong className="text-yellow-300">{player.resources.money}</strong>
            </span>
            <span>
              🔬 Science: <strong className="text-pink-300">{player.resources.science}</strong>
            </span>
            <span>
              ⚙️ Materials: <strong className="text-amber-400">{player.resources.materials}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              Upkeep Owed: <strong className="text-rose-400">-{forecast.currentUpkeep} Credits</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> or{' '}
              <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">P</kbd> to close
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
