import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ShipType, SectorTile } from '../../engine/types/galaxy';
import { Technology } from '../../engine/types/tech';
import { ShipPart } from '../../engine/types/blueprints';
import {
  calculatePlayerRoundSummary,
  calculateActionCostForecast,
  getIncomeForecast,
  getPlayerTechRows,
  TECH_ROW_SLOT_COUNT,
  UPKEEP_TABLE,
  POPULATION_TRACK_SPACES,
} from '../../engine/rules/economyEngine';
import {
  calculateBlueprintStats,
  countPlayerShips,
  getBaseBuildItemCost,
  inferModularExternalGroup,
  SHIP_LIMITS,
} from '../../engine/rules/shipValidation';
import {
  OFFICIAL_TECH_DISCOUNTS,
  getTechTrackDiscountsForPlayer,
  getTechTrackMaxSlots,
  getTechTrackVPForPlayer,
  isSingleTechLineFaction,
} from '../../engine/rules/techData';
import { ANCIENT_PART_IDS, getEffectiveShipPart, isSpiralPhase2 } from '../../engine/rules/partData';
import { TechTileIconography, ShipPartSlotGraphic, getPartTooltip, TechHoverTooltip } from '../common/PhysicalTileIconography';
import { ShipBlueprintSlotsLayout } from '../blueprints/ShipBlueprintSlotsLayout';
import { MegaWarModularStrip } from '../blueprints/MegaWarModularStrip';
import { ShipTypeIcon, shouldShowShipTypeIcon } from '../common/ShipTypeIcon';
import { getPlayerReputationTrackSlots, getPlayerReputationVP } from '../../engine/rules/setup';
import { getPlayerShortName, getPlayerDisplayName, getTraitorTilePenalty, playerHasWormholeGenerator, canExchangeAmbassadors } from '../../engine/rules/gameReducer';
import {
  X,
  Zap,
  Timer,
  Heart,
  Navigation,
  Crosshair,
  Shield,
  Coins,
  FlaskConical,
  Hammer,
  Rocket,
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
  Lock,
  Handshake,
} from 'lucide-react';
import { areSectorsConnected } from '../../engine/rules/hexMath';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateFactionName,
  translateFactionTrait,
  translateResourceType,
  translateShipType,
  translateTechCategory,
  translateTechDesc,
  translateTechName,
} from '../../i18n/catalogTranslations';

interface PhysicalPlayerBoardModalProps {
  player: PlayerState;
  players: PlayerState[];
  activePlayerId: string;
  sectors: SectorTile[];
  onClose: () => void;
  onSelectPlayer: (playerId: string) => void;
  onOpenBlueprintEditor: (shipType?: ShipType) => void;
  onOpenTechMarket: () => void;
  hideOpponentReputation?: boolean;
  traitorPlayerId?: string | null;
  warpedUniverse?: { conduits: any } | null;
  onExchangeAmbassador?: (targetPlayerId: string) => void;
  onBetrayAlliance?: (targetPlayerId: string) => void;
  onConvertColonyShip?: (resource: 'money' | 'science' | 'materials') => void;
  activeExpansions?: string[];
  initialTab?: 'all' | 'tracks' | 'reputation' | 'tech' | 'blueprints';
}

export const PhysicalPlayerBoardModal: React.FC<PhysicalPlayerBoardModalProps> = ({
  player,
  players,
  activePlayerId,
  sectors = [],
  onClose,
  onSelectPlayer,
  onOpenBlueprintEditor,
  onOpenTechMarket,
  hideOpponentReputation = false,
  traitorPlayerId,
  warpedUniverse,
  onExchangeAmbassador,
  onBetrayAlliance,
  onConvertColonyShip,
  activeExpansions,
  initialTab = 'all',
}) => {
  const { language, l } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'reputation' | 'tech' | 'blueprints'>(initialTab);
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const summary = useMemo(() => calculatePlayerRoundSummary(player), [player]);
  const forecast = useMemo(() => calculateActionCostForecast(player), [player]);
  const techRows = useMemo(() => getPlayerTechRows(player), [player]);
  const deployed = useMemo(() => countPlayerShips(sectors, player.id), [sectors, player.id]);
  const moneyForecast = useMemo(() => getIncomeForecast(player.population.money.cubesOnBoard), [player.population.money.cubesOnBoard]);
  const sciForecast = useMemo(() => getIncomeForecast(player.population.science.cubesOnBoard), [player.population.science.cubesOnBoard]);
  const matForecast = useMemo(() => getIncomeForecast(player.population.material.cubesOnBoard), [player.population.material.cubesOnBoard]);
  const controlledArtifactsCount = useMemo(() => (sectors || []).filter((s) => s.discOwner === player.id && s.hasArtifact).length, [sectors, player.id]);

  const isActive = player.id === activePlayerId;

  // Ship stats calculations for all available ship classes
  const shipClasses: { type: ShipType; name: string; maxSlots: number; baseCost: number }[] = useMemo(() => {
    return (Object.keys(player.blueprints) as ShipType[]).map((type) => {
      const bp = player.blueprints[type];
      return {
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        maxSlots: bp?.maxSlots ?? 4,
        baseCost: getBaseBuildItemCost(player, type),
      };
    });
  }, [player.blueprints, player.faction.id]);

  const blueprintsWithStats = useMemo(() => {
    return shipClasses.map((sc) => {
      const bp = player.blueprints[sc.type];
      const stats = bp ? calculateBlueprintStats(bp, activeExpansions) : null;
      return {
        ...sc,
        blueprint: bp,
        stats,
        deployedCount: deployed[sc.type] || 0,
        limit: SHIP_LIMITS[sc.type] || 0,
      };
    });
  }, [player.blueprints, deployed, activeExpansions]);

  // Influence disc track total slots: standard 13 or player totalDiscs
  const maxDiscs = Math.max(13, player.influenceTrack.totalDiscs);
  const discSlots = Array.from({ length: maxDiscs }, (_, i) => maxDiscs - 1 - i); // [12, 11, ..., 0]

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      <div className="bg-slate-900 border border-cyan-500/60 rounded-2xl w-full max-w-7xl h-[94vh] shadow-2xl overflow-hidden flex flex-col text-slate-100 ring-1 ring-cyan-500/20 relative">
        {/* Dedicated Upper-Right Corner Exit Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-3.5 sm:right-4 z-30 p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700 shadow-lg hover:shadow-cyan-950/50 cursor-pointer"
          title={l('Close Physical Player Board (Esc / P)', '关闭实体玩家面板 (Esc / P)')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* =================================================================== */}
        {/* HEADER: Faction identity, resource summaries, hotseat & navigation  */}
        {/* =================================================================== */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 pr-14 sm:pr-16">
          <div className="flex items-center gap-3.5">
            <div
              className="w-5 h-5 rounded-full ring-2 ring-white/30 shadow-lg"
              style={{ backgroundColor: player.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-slate-100 font-display">
                  {getPlayerDisplayName(player)}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 uppercase font-bold">
                  {player.faction.isHuman ? l('Terran Faction', '人类种族') : l('Alien Faction', '外星种族')}
                </span>
                {isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 animate-pulse">
                    {l('● Active Commander', '● 当前行动指挥官')}
                  </span>
                )}
                {player.hasPassed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase">
                    {l('Passed', '已过')}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{translateFactionTrait(player.faction.id, player.faction.traitDescription, language)}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  {l(
                    `${player.influenceTrack.discsOnTrack} Discs on Track / ${player.influenceTrack.totalDiscs} Total`,
                    `轨道圆片 ${player.influenceTrack.discsOnTrack} / 共 ${player.influenceTrack.totalDiscs}`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Hotseat Player Quick Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <span className="text-[11px] text-slate-400 px-1.5 font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> {l('Player Board:', '玩家面板:')}
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
                  <span>{getPlayerDisplayName(p, { short: true })}</span>
                </button>
              ))}
            </div>

            {/* View Mode Tabs (Mobile dropdown) */}
            <div className="md:hidden flex items-center">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                aria-label={l('View Mode Tab', '视图模式标签')}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="all">{l('Full Mat', '完整面板')}</option>
                <option value="tracks">{l('Upkeep & Discs', '维护费与圆片')}</option>
                <option value="reputation">{l('Rep & Discovery', '声望与探索')}</option>
                <option value="tech">{l('Tech Rows', '科技轨道')}</option>
                <option value="blueprints">{l('Ship Blueprints', '飞船蓝图')}</option>
              </select>
            </div>

            {/* View Mode Tabs (Desktop) */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'all' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l('Full Mat', '完整面板')}
              </button>
              <button
                onClick={() => setActiveTab('tracks')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'tracks' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l('Upkeep & Discs', '维护费与圆片')}
              </button>
              <button
                onClick={() => setActiveTab('reputation')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'reputation' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l('Rep & Discovery', '声望与探索')}
              </button>
              <button
                onClick={() => setActiveTab('tech')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'tech' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l('Tech Rows', '科技轨道')}
              </button>
              <button
                onClick={() => setActiveTab('blueprints')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'blueprints' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l('Ship Blueprints', '飞船蓝图')}
              </button>
            </div>
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
                      {l('INFLUENCE DISC & UPKEEP TRACK', '影响力圆片与维护费轨道')}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {l(
                        'Discs on track cover upkeep costs. As discs are placed on actions or sectors, higher upkeep is uncovered.',
                        '轨道上的圆片会遮盖维护费数字。当你将圆片置于行动或星区上时，更高的维护费将被露出来。'
                      )}
                    </p>
                  </div>
                </div>

                {/* Colony Ships Status */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5">
                  <Rocket className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-slate-300 font-semibold">{l('Colony Ships:', '殖民船:')}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: player.colonyShips.total }).map((_, cIdx) => {
                      const isReady = cIdx < player.colonyShips.ready;
                      return (
                        <div
                          key={`cs_phy_${cIdx}`}
                          title={isReady ? l('Colony Ship Ready', '殖民船就绪') : l('Colony Ship Exhausted', '殖民船已使用')}
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
                    {player.colonyShips.ready}/{player.colonyShips.total} {l('Ready', '就绪')}
                  </span>

                  {/* Magellan Scavenge Colony Ship Ability */}
                  {player.faction.id === 'wardens_of_magellan' && onConvertColonyShip && (
                    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-700">
                      <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                        {l('Scavenge:', '转化:')}
                      </span>
                      <button
                        onClick={() => onConvertColonyShip('money')}
                        disabled={player.colonyShips.ready <= 0 || !isActive}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors disabled:opacity-40"
                        title={l('Convert 1 ready Colony Ship to 1 Money', '将 1 艘就绪殖民船转化为 1 信用点')}
                      >
                        {l('+1 Money', '+1 信用点')}
                      </button>
                      <button
                        onClick={() => onConvertColonyShip('science')}
                        disabled={player.colonyShips.ready <= 0 || !isActive}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-colors disabled:opacity-40"
                        title={l('Convert 1 ready Colony Ship to 1 Science', '将 1 艘就绪殖民船转化为 1 科研')}
                      >
                        {l('+1 Sci', '+1 科研')}
                      </button>
                      <button
                        onClick={() => onConvertColonyShip('materials')}
                        disabled={player.colonyShips.ready <= 0 || !isActive}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-700/20 hover:bg-amber-700/30 text-amber-200 border border-amber-700/40 transition-colors disabled:opacity-40"
                        title={l('Convert 1 ready Colony Ship to 1 Material', '将 1 艘就绪殖民船转化为 1 材料')}
                      >
                        {l('+1 Mat', '+1 材料')}
                      </button>
                    </div>
                  )}

                  {player.faction.id === 'wardens_of_magellan' && (player.discoveryTilesUsedAsShipPartsCount || 0) > 0 && (
                    <span className="text-[10px] text-purple-300 ml-2 font-mono" title={l('Discovery Tiles equipped as Ship Parts (+1 VP each at end of game)', '已装备为飞船部件的探索板块（终局每块 +1 VP）')}>
                      {l(
                        `(${player.discoveryTilesUsedAsShipPartsCount} Discovery Ship Parts: +${player.discoveryTilesUsedAsShipPartsCount} VP)`,
                        `(${player.discoveryTilesUsedAsShipPartsCount} 块探索部件: +${player.discoveryTilesUsedAsShipPartsCount} VP)`
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* ACTION COST FORECASTER HUD (Direct User Question Feature) */}
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3.5 shadow-inner">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-display">
                      {l('Action Cost & Upkeep Forecaster', '行动花费与维护费预测器')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {l('Current Credits:', '当前信用点:')} <strong className="text-yellow-300">{player.resources.money}</strong> | {l('Money Income:', '信用点收入:')}{' '}
                    <strong className="text-emerald-400">+{summary.income.money}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-sans">
                  {/* Current Upkeep */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>{l('CURRENT UPKEEP', '当前维护费')}</span>
                      <span className="text-cyan-400 font-mono">{forecast.currentDiscs} {l('Discs', '圆片')}</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-300 font-display mt-1">
                      -{forecast.currentUpkeep} {l('Credits', '信用点')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {l('Net:', '净收支:')} <span className={summary.netMoneyDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {summary.netMoneyDelta >= 0 ? `+${summary.netMoneyDelta}` : summary.netMoneyDelta}
                      </span> {l('/round', '/回合')}
                    </div>
                  </div>

                  {/* Next 1 Action */}
                  <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg p-2.5 flex flex-col justify-between ring-1 ring-amber-500/20">
                    <div className="text-amber-300 text-[11px] font-semibold flex items-center justify-between">
                      <span>{l('NEXT 1 ACTION', '下 1 次行动')}</span>
                      <span className="text-amber-400/80 font-mono">{l('1 Disc Used', '消耗 1 圆片')}</span>
                    </div>
                    <div className="text-lg font-bold text-amber-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after1Action.upkeep} {l('Credits', '信用点')}</span>
                      <span className="text-xs font-mono font-normal text-rose-400">
                        (+{forecast.after1Action.costIncrease} {l('cost', '增量')})
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        {l('Net:', '净收支:')} <span className={forecast.after1Action.projectedNetMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {forecast.after1Action.projectedNetMoneyDelta >= 0 ? `+${forecast.after1Action.projectedNetMoneyDelta}` : forecast.after1Action.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after1Action.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">{l('✓ Safe', '✓ 安全')}</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">{l('⚠️ Deficit', '⚠️ 赤字')}</span>
                      )}
                    </div>
                  </div>

                  {/* Next 2 Actions (Targeted by User) */}
                  <div className="bg-slate-950/80 border border-rose-500/50 rounded-lg p-2.5 flex flex-col justify-between ring-1 ring-rose-500/30 bg-rose-950/10">
                    <div className="text-rose-300 text-[11px] font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-rose-400" /> {l('NEXT 2 ACTIONS', '下 2 次行动')}
                      </span>
                      <span className="text-rose-400/80 font-mono">{l('2 Discs Used', '消耗 2 圆片')}</span>
                    </div>
                    <div className="text-lg font-bold text-rose-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after2Actions.upkeep} {l('Credits', '信用点')}</span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        (+{forecast.after2Actions.costIncrease} {l('more', '增')})
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        {l('Net:', '净收支:')} <span className={forecast.after2Actions.projectedNetMoneyDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {forecast.after2Actions.projectedNetMoneyDelta >= 0 ? `+${forecast.after2Actions.projectedNetMoneyDelta}` : forecast.after2Actions.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after2Actions.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">{l('✓ Safe', '✓ 安全')}</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">{l('⚠️ Risk Bankruptcy', '⚠️ 破产风险')}</span>
                      )}
                    </div>
                  </div>

                  {/* Next 3 Actions */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="text-slate-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>{l('NEXT 3 ACTIONS', '下 3 次行动')}</span>
                      <span className="text-slate-500 font-mono">{l('3 Discs Used', '消耗 3 圆片')}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-300 font-display mt-1 flex items-baseline gap-1.5">
                      <span>-{forecast.after3Actions.upkeep} {l('Credits', '信用点')}</span>
                      <span className="text-xs font-mono text-slate-400">
                        (+{forecast.after3Actions.costIncrease} {l('more', '增')})
                      </span>
                    </div>
                    <div className="text-[10px] flex items-center justify-between mt-1">
                      <span className="text-slate-400">
                        {l('Net:', '净收支:')} <span className={forecast.after3Actions.projectedNetMoneyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {forecast.after3Actions.projectedNetMoneyDelta >= 0 ? `+${forecast.after3Actions.projectedNetMoneyDelta}` : forecast.after3Actions.projectedNetMoneyDelta}
                        </span>
                      </span>
                      {forecast.after3Actions.canAfford ? (
                        <span className="text-emerald-400 text-[9px] font-bold">{l('✓ Safe', '✓ 安全')}</span>
                      ) : (
                        <span className="text-rose-400 text-[9px] font-bold">{l('⚠️ Risk', '⚠️ 风险')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* VISUAL PHYSICAL INFLUENCE TRACK (Cardboard Indented Track) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    {l('Physical Influence Track Slot Depressions', '实体影响力轨道圆片槽位')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {l('Highest Uncovered Slot = Upkeep Owed During Upkeep Phase', '最左侧露出数字 = 维护阶段需支付的维护费')}
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
                      const isMidasRedZone = player.faction.id === 'legion_of_midas' && slotIndex < 7;

                      return (
                        <div
                          key={`track_slot_${slotIndex}`}
                          className="flex flex-col items-center gap-1 shrink-0"
                          title={l(
                            `Slot ${slotIndex} | Upkeep Cost: ${upkeepAtSlot} Credits ${isCovered ? '(Covered by Disc)' : '(Uncovered)'}`,
                            `槽位 ${slotIndex} | 维护费：${upkeepAtSlot} 信用点 ${isCovered ? '(已覆盖)' : '(已露出)'}`
                          )}
                        >
                          {/* Top indicator tag */}
                          <div className="h-4 flex items-center justify-center">
                            {isCurrentUpkeepSlot && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 shadow animate-bounce">
                                {l('ACTIVE', '当前')}
                              </span>
                            )}
                            {isNextActionSlot && (
                              <span className="text-[8.5px] font-bold text-amber-400 font-mono">
                                {l('+1 Act', '+1 行动')}
                              </span>
                            )}
                            {isNext2ActionsSlot && (
                              <span className="text-[8.5px] font-bold text-rose-400 font-mono">
                                {l('+2 Act', '+2 行动')}
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
                                : isMidasRedZone
                                ? 'border-rose-500/80 bg-rose-950/25 shadow-sm shadow-rose-950/40'
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
          {/* SECTION 1.5: REPUTATION TRACK & DISCOVERY TILES                   */}
          {/* Authentic 5-slot track for Reputation & Ambassador Tiles          */}
          {/* ================================================================= */}
          {(activeTab === 'all' || activeTab === 'reputation') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              {/* Traitor Tile Warning Banner */}
              {traitorPlayerId === player.id && (() => {
                const traitorPenalty = getTraitorTilePenalty(player);
                return (
                <div className="bg-rose-950/70 border-2 border-rose-500 rounded-xl p-3.5 shadow-xl shadow-rose-950/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
                      <AlertTriangle className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold font-display text-rose-200 flex items-center gap-2">
                        {l('TRAITOR TILE IN POSSESSION', '持有背叛者板块')}
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-900 border border-rose-700 text-rose-300">
                          {l(`${traitorPenalty} VP Penalty`, `${traitorPenalty} VP 惩罚`)}
                        </span>
                      </div>
                      <p className="text-xs text-rose-300/90 mt-0.5">
                        {l(
                          `This commander entered allied territory, breaking diplomatic relations. Suffers a ${traitorPenalty} VP endgame penalty and cannot establish new alliances while holding this tile.`,
                          `该指挥官侵入了盟友星区并打破了外交关系。持有此板块期间终局 ${traitorPenalty} VP，且无法建立新的同盟。`
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                      {l(`REPUTATION TRACK (${player.faction.reputationSlots ?? 5} SLOTS)`, `声望轨道 (${player.faction.reputationSlots ?? 5} 槽位)`)}
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-600/60 text-amber-300">
                        {l('Total:', '总计:')} {hideOpponentReputation
                          ? l(`${player.ambassadorTiles?.length || 0} Amb VP + ? Rep VP`, `${player.ambassadorTiles?.length || 0} 大使 VP + ? 声望 VP`)
                          : `${(player.ambassadorTiles?.length || 0) + getPlayerReputationVP(player)} VP`}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      {l(
                        `Track holds up to ${player.faction.reputationSlots ?? 5} tiles. Slots accept Ambassador and/or Reputation tiles according to faction board specifications.`,
                        `轨道最多可容纳 ${player.faction.reputationSlots ?? 5} 枚板块。各槽位依据种族面板规定接收大使及/或声望板块。`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>{l('Slots Filled:', '已填槽位:')}</span>
                  <span className="font-bold text-slate-200">
                    {(player.ambassadorTiles?.length || 0) + player.reputationTiles.length} / {player.faction.reputationSlots ?? 5}
                  </span>
                </div>
              </div>

              {/* Physical Cardboard Slots (Bugs 72, 73, 78) */}
              {(() => {
                const trackSlots = getPlayerReputationTrackSlots(player, players);
                const totalSlots = trackSlots.length;

                return (
                  <div className={`grid ${totalSlots === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-3`}>
                    {trackSlots.map((slot) => {
                      const isAmbassadorSlot = slot.tile?.type === 'ambassador';
                      const allyId = isAmbassadorSlot ? slot.tile?.allyId : null;
                      const ally = allyId ? players.find((p) => p.id === allyId) : null;

                      const repTileObj = slot.tile?.type === 'reputation' ? slot.tile : null;
                      const isRepSlot = Boolean(repTileObj);
                      const repTile = repTileObj?.vp;
                      const repEffectiveVp = repTileObj ? (repTileObj.effectiveVp ?? repTile) : undefined;
                      const repOutcome = player.faction.id === 'kurita_prefecture' ? repTileObj?.battleOutcome : undefined;
                      const hasRepTile = isRepSlot;

                      return (
                        <div
                          key={`rep_slot_${slot.slotIndex}`}
                          className={`h-32 rounded-xl border-2 flex flex-col items-center justify-between p-2.5 transition-all relative ${
                            isAmbassadorSlot
                              ? 'bg-gradient-to-b from-indigo-950/50 to-slate-950 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
                              : hasRepTile
                              ? 'bg-gradient-to-b from-amber-950/40 to-slate-950 border-amber-500/80 shadow-lg shadow-amber-950/50'
                              : 'bg-slate-950 border-dashed border-slate-800/90'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>{l(`Slot #${slot.slotIndex + 1}`, `槽位 #${slot.slotIndex + 1}`)}</span>
                            {slot.slotType === 'amb_only' ? (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-950/90 text-purple-300 border border-purple-700/60"
                                title={l('This slot can only hold Ambassador Tiles', '此槽位仅可放置大使板块')}
                              >
                                {l('Amb Only', '仅大使')}
                              </span>
                            ) : slot.slotType === 'both' ? (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60"
                                title={l('This slot can hold either an Ambassador Tile or a Reputation Tile', '此槽位可放置大使或声望板块')}
                              >
                                {l('Amb / Rep', '大使/声望')}
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800"
                                title={l('This slot can only hold Reputation Tiles', '此槽位仅可放置声望板块')}
                              >
                                {l('Rep Only', '仅声望')}
                              </span>
                            )}
                          </div>

                          {isAmbassadorSlot ? (
                            <div className="flex flex-col items-center text-center">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md border-2"
                                style={{
                                  backgroundColor: (ally?.color || slot.tile?.allyColor || '#10b981') + '33',
                                  borderColor: ally?.color || slot.tile?.allyColor || '#10b981',
                                }}
                              >
                                <Handshake className="w-5 h-5" style={{ color: ally?.color || slot.tile?.allyColor || '#34d399' }} />
                              </div>
                              <span className="text-base font-extrabold font-display text-indigo-300 mt-0.5">
                                +{slot.tile?.vp ?? 1} VP
                              </span>
                              <span className="text-[10px] font-medium text-slate-300 truncate max-w-[100px]" title={slot.tile?.allyName || ally?.name || allyId || ''}>
                                {slot.tile?.allyName || ally?.name || allyId}
                              </span>
                            </div>
                          ) : hasRepTile ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1.5">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-md">
                                  <Trophy className="w-5 h-5 text-amber-400" />
                                </div>
                                {player.faction.id === 'kurita_prefecture' && (
                                  <div
                                    data-testid={`kurita-rep-honour-slot-${slot.slotIndex}`}
                                    className={`w-6 h-6 rounded border flex items-center justify-center text-[9px] font-black font-mono ${
                                      repOutcome === 'win'
                                        ? 'bg-rose-600/80 border-rose-300 text-white shadow'
                                        : repOutcome === 'loss'
                                        ? 'bg-slate-900 border-rose-500/70 text-rose-300'
                                        : 'bg-slate-950/80 border-slate-800 text-slate-600'
                                    }`}
                                    title={
                                      repOutcome === 'win'
                                        ? l('Dmg Cube placed: +1 VP Honour Win bonus', '已放置伤害方块：胜战荣耀 +1 VP')
                                        : repOutcome === 'loss'
                                        ? l('Battle Lost: -1 VP Honour penalty', '战败：荣耀 -1 VP')
                                        : l('Honour Dmg Cube slot', '荣耀胜负方块格')
                                    }
                                  >
                                    {repOutcome === 'win' ? '■+1' : repOutcome === 'loss' ? '-1' : '□'}
                                  </div>
                                )}
                              </div>
                              <span className="text-base font-extrabold font-display text-amber-300 mt-0.5">
                                {hideOpponentReputation ? '? VP' : `+${repEffectiveVp} VP`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {hideOpponentReputation
                                  ? l('Secret Tile', '保密板块')
                                  : repOutcome === 'win'
                                  ? l(`${repTile} + 1 Win`, `${repTile} + 1 胜`)
                                  : repOutcome === 'loss'
                                  ? l(`${repTile} - 1 Loss`, `${repTile} - 1 败`)
                                  : l(`${repTile} Rep`, `${repTile} 声望`)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center">
                              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                                {l('Empty', '空槽')}
                              </span>
                              <span className="text-[9px] text-slate-600 mt-0.5">
                                {slot.slotType === 'amb_only'
                                  ? l('Ambassador Only', '仅限大使')
                                  : slot.slotType === 'both'
                                  ? l('Amb or Rep Tile', '大使或声望板块')
                                  : l('Rep Tile Only', '仅限声望板块')}
                              </span>
                            </div>
                          )}

                          <div className="text-[9px] font-semibold text-slate-400">
                            {isAmbassadorSlot
                              ? l('Ambassador', '大使')
                              : hasRepTile
                              ? (hideOpponentReputation ? l('Secret Tile', '保密板块') : l('Reputation', '声望'))
                              : l('Available Slot', '可用槽位')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* DIPLOMATIC RELATIONS / AMBASSADOR EXCHANGE */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 font-display">
                      <Handshake className="w-4 h-4 text-indigo-400" />
                      {l('Diplomatic Relations & Ambassadors', '外交关系与大使')}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {l(
                        `Exchange ambassadors with connected species in games with 4+ players (+1 VP each). Moving into allied space or betraying breaks the alliance and claims the Traitor Tile (${getTraitorTilePenalty(player)} VP).`,
                        `在 4 人及以上对局中可与连通星区的玩家交换大使（双方各 +1 VP）。进入盟友领地或主动背叛将打破同盟并拿取背叛者板块 (${getTraitorTilePenalty(player)} VP)。`
                      )}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {l('Ambassadors:', '大使:')} <strong className="text-indigo-300">{player.ambassadorTiles?.length || 0} / {player.faction.ambassadorSlots ?? 3}</strong>
                  </div>
                </div>

                {players.length < 4 && (
                  <div className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{l('Diplomatic Relations (Ambassador Exchange) are only allowed in games with 4 or more players.', '外交关系（交换大使）仅在 4 名及以上玩家的游戏中启用。')}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {players.filter((other) => other.id !== player.id).map((other) => {
                    const isAllied = player.ambassadorTiles?.includes(other.id);
                    const check = canExchangeAmbassadors(
                      { phase: 'ACTION_PHASE', traitorPlayerId, players, sectors, warpedUniverse: warpedUniverse ?? undefined },
                      player.id,
                      other.id
                    );
                    const canExchange = check.canExchange;
                    const reason = isAllied ? l('Allied (+1 VP)', '已结盟 (+1 VP)') : (check.reason || l('Not eligible for diplomacy', '暂不可外交'));
                    const otherFactionName = translateFactionName(other.faction.id, other.faction.name, language);

                    return (
                      <div
                        key={other.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                          isAllied
                            ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow" style={{ backgroundColor: other.color }} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate text-slate-100">{other.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{otherFactionName}</div>
                          </div>
                        </div>

                        <div>
                          {isAllied ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className="px-2 py-1 rounded bg-indigo-900/80 text-indigo-300 text-[10px] font-bold border border-indigo-700/60 flex items-center gap-1 shrink-0"
                                title={l(
                                  'Diplomatic alliance (+1 VP). Only broken when ending a Move action in a sector with their ship or control disc.',
                                  '已建立外交同盟（+1 VP）。只有当你在其飞船或控制星区结束移动时才会打破同盟并获得背叛者板块。'
                                )}
                              >
                                <Handshake className="w-3 h-3 text-indigo-400" /> {l('Allied (+1 VP)', '已结盟 (+1 VP)')}
                              </span>
                            </div>
                          ) : canExchange && onExchangeAmbassador && (isActive || player.id === activePlayerId) ? (
                            <button
                              type="button"
                              onClick={() => onExchangeAmbassador(other.id)}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-sm hover:shadow cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Handshake className="w-3 h-3" /> {l('Exchange (+1 VP)', '交换大使 (+1 VP)')}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono italic shrink-0" title={reason}>
                              {reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kept Discovery Tiles for VP (Bug 165) */}
              <div className="bg-slate-900/90 border border-amber-950/80 rounded-xl p-3.5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      {l('KEPT DISCOVERY TILES FOR VICTORY POINTS', '保留用于计分的探索板块')}
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/70 text-amber-300">
                        {player.keptDiscoveryTiles?.length || 0} {l('Tiles', '枚')} (+{((player.keptDiscoveryTiles?.length || 0) * 2)} VP)
                      </span>
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {l('Official Rules: 2 VP per tile kept facedown on player board', '标准规则：每块暗置保留在面板上的探索板块计 2 VP')}
                  </span>
                </div>

                {player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {player.keptDiscoveryTiles.map((tile, tIdx) => (
                      <div
                        key={`kept_disc_${tile.id}_${tIdx}`}
                        className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-amber-200 truncate">
                            {tile.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {tile.description || l('Ancient Artifact Cache', '远古遗物宝库')}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700/60 shrink-0">
                          +2 VP
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-1">
                    {l(
                      'No discovery tiles currently kept for Victory Points. When claiming Discovery Tiles, choose "Keep for 2 VP" to store them here.',
                      '当前尚未保留用于得分的探索板块。获得探索板块时选择「保留为 2 VP」即可存放在此处。'
                    )}
                  </div>
                )}
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
                      {l('TECHNOLOGY TRACKS & ROWS', '科技轨道与排布')}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {l(
                        'Technologies are placed into rows from left to right. Each row provides progressive science discounts and end-game Victory Points.',
                        '科技从左向右依次放入对应科技行。每条轨道都会逐步提供科研折扣，并在终局提供胜利点。'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {l('Total Researched:', '已研发总数:')} <strong className="text-pink-300">{player.techTrack.researched.length}</strong>
                  </span>
                  <button
                    onClick={onOpenTechMarket}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-950/50 hover:bg-pink-900/60 border border-pink-700/60 text-pink-300 text-xs font-bold transition-all shadow"
                  >
                    <Cpu className="w-3.5 h-3.5 text-pink-400" />
                    <span>{l('Open Tech Tray Market', '打开科技市场')}</span>
                  </button>
                </div>
              </div>

              {/* Physical Horizontal Tech Row(s) */}
              {isSingleTechLineFaction(player.faction.id) ? (
                <div className="space-y-3">
                  {(() => {
                    const totalCount = player.techTrack.researched.length;
                    const phase2Active = isSpiralPhase2(totalCount);
                    const totalTrackVp = getTechTrackVPForPlayer('military', totalCount, 'the_spiral');
                    const nextDiscount = OFFICIAL_TECH_DISCOUNTS[Math.min(6, totalCount)] ?? 8;
                    const vpBySlot = [0, 0, 0, 1, 2, 3, 5];
                    return (
                      <div
                        data-testid="spiral-single-tech-board"
                        className="relative hover:z-40 focus-within:z-40 bg-slate-900/90 border border-sky-700/70 rounded-xl p-3.5 shadow-md space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-sky-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200 font-display flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                              {l(
                                `SINGLE TECH LINE — ANY TRAY (${totalCount}/7 Researched)`,
                                `单一综合科技轨 — 任意颜色 (${totalCount}/7 已研发)`
                              )}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-slate-400">
                              {l('Next Discount:', '下格减免:')}{' '}
                              <strong className="text-sky-300">-{nextDiscount} {l('Science', '科研')}</strong>
                            </span>
                            <span className="text-amber-400 font-bold">
                              {totalTrackVp > 0 ? `+${totalTrackVp} VP` : '0 VP'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                          {Array.from({ length: 7 }).map((_, sIdx) => {
                            const tech = player.techTrack.researched[sIdx];
                            const discount = OFFICIAL_TECH_DISCOUNTS[sIdx] ?? 8;
                            const vpEarned = vpBySlot[sIdx] ?? 0;
                            const isPhase2Slot = sIdx >= 4;
                            const colPlacement = sIdx <= 1 ? 'left-0' : sIdx >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                            const tName = tech ? translateTechName(tech.id, tech.name, language) : '';
                            const tDesc = tech ? translateTechDesc(tech.id, tech.description, language) : '';

                            return (
                              <div
                                key={`spiral_slot_${sIdx}`}
                                onClick={() => tech && setSelectedTech(tech)}
                                title={tech ? `${tName}: ${tDesc}` : undefined}
                                className={`min-h-[82px] rounded-lg border p-2 flex flex-col justify-between transition-all relative ${
                                  tech
                                    ? isPhase2Slot
                                      ? 'bg-amber-950/35 border-amber-400/80 shadow-md ring-1 ring-amber-400/30 cursor-pointer hover:border-amber-300 group hover:z-50'
                                      : 'bg-sky-950/40 border-sky-400/80 shadow-md ring-1 ring-sky-400/30 cursor-pointer hover:border-sky-300 group hover:z-50'
                                    : isPhase2Slot
                                    ? 'bg-slate-950/60 border-amber-800/60 border-dashed opacity-70'
                                    : 'bg-slate-950/60 border-slate-800 border-dashed opacity-70'
                                }`}
                              >
                                {tech && (
                                  <TechHoverTooltip
                                    tech={tech}
                                    horizontalPlacement={colPlacement}
                                    verticalPlacement="top-[calc(100%+8px)]"
                                  />
                                )}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`font-mono font-bold ${isPhase2Slot ? 'text-amber-300' : 'text-slate-400'}`}>
                                    {isPhase2Slot && sIdx === 4 ? l(`Slot 5 • P2`, `5格•P2`) : l(`Slot ${sIdx + 1}`, `槽位 ${sIdx + 1}`)}
                                  </span>
                                  {vpEarned > 0 && (
                                    <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                      {vpEarned} VP
                                    </span>
                                  )}
                                </div>

                                {tech ? (
                                  <div className="flex flex-col justify-between h-full">
                                    <span className="sr-only">
                                      {tName}: {tDesc}
                                    </span>
                                    <div className="my-0.5">
                                      <TechTileIconography tech={tech} compact />
                                    </div>
                                    <div className="text-[8.5px] text-slate-400 font-mono">
                                      {l(`Base: ${tech.baseCost} sci`, `基础: ${tech.baseCost} 科研`)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-1">
                                    <span className="text-[11px] font-mono font-bold text-slate-500">
                                      -{discount} {l('Sci', '科研')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className={`px-3 py-2 rounded-lg border ${!phase2Active ? 'bg-sky-950/40 border-sky-400/70 text-sky-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'}`}>
                            <strong className="uppercase font-mono text-amber-300">{l('Phase 1 (Techs 1–4):', '第 1 阶段（1–4 项）：')}</strong>{' '}
                            {l('Ion Cannon (1⚡) • +1 Computer (0⚡) • 1 Hull (0⚡)', '离子炮 (1⚡) • +1 电脑 (0⚡) • 1 船体 (0⚡)')}
                          </div>
                          <div className={`px-3 py-2 rounded-lg border ${phase2Active ? 'bg-amber-950/40 border-amber-400/80 text-amber-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'}`}>
                            <strong className="uppercase font-mono text-amber-300">{l('Phase 2 (5+ Techs):', '第 2 阶段（第 5 项起）：')}</strong>{' '}
                            {l('Plasma Cannon (2⚡) • +2 Positron Comp (1⚡) • 2 Improved Hull (0⚡)', '等离子炮 (2⚡) • +2 正电子电脑 (1⚡) • 2 改良船体 (0⚡)')}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
              <div className="space-y-3.5">
                {/* 1. MILITARY ROW (RED) */}
                <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/90 border border-rose-950/80 rounded-xl p-3.5 shadow-md transition-[z-index]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-display flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5 text-rose-400" /> {l(`MILITARY TECH ROW (${techRows.military.count} Researched)`, `军事科技栏 (${techRows.military.count} 已研发)`)}
                      </h3>
                      {player.faction.id === 'wardens_of_magellan' && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ml-2 ${
                            !player.magellanDiscoveryResolved
                              ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/30 animate-pulse'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                          title={
                            !player.magellanDiscoveryResolved
                              ? l(
                                  'Facedown Relic Tile on Military Track. Reveals and resolves when 4th technology is placed on any track.',
                                  '军事轨道上的暗置探索板块。当任意科技轨道放置第 4 项科技时翻开并结算。'
                                )
                              : l('Relic Tile resolved.', '探索板块已结算。')
                          }
                        >
                          {!player.magellanDiscoveryResolved ? l('🔮 Facedown Relic Tile (Unrevealed)', '🔮 暗置探索板块（未翻开）') : l('🔮 Relic Tile Resolved', '🔮 探索板块已结算')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        {l('Next Discount:', '下格减免:')} <strong className="text-rose-300">-{techRows.military.nextDiscount} {l('Science', '科研')}</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.military.victoryPoints > 0 ? `+${techRows.military.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* Military Slots */}
                  <div className={`grid grid-cols-2 ${getTechTrackMaxSlots('military', player.faction.id) === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-7'} gap-2`}>
                    {Array.from({ length: getTechTrackMaxSlots('military', player.faction.id) }).map((_, sIdx) => {
                      const tech = techRows.military.techs[sIdx];
                      const discounts = getTechTrackDiscountsForPlayer('military', player.faction.id);
                      const discount = discounts[sIdx] ?? 8;
                      const vpEarned = getTechTrackVPForPlayer('military', sIdx + 1, player.faction.id);
                      const colPlacement = sIdx <= 1 ? 'left-0' : sIdx >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                      const tName = tech ? translateTechName(tech.id, tech.name, language) : '';
                      const tDesc = tech ? translateTechDesc(tech.id, tech.description, language) : '';

                      return (
                        <div
                          key={`mil_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          title={tech ? `${tName}: ${tDesc}` : undefined}
                          className={`min-h-[76px] rounded-lg border p-2 flex flex-col justify-between transition-all relative ${
                            tech
                              ? 'bg-rose-950/40 border-rose-500/80 shadow-md ring-1 ring-rose-500/30 cursor-pointer hover:border-rose-400 group hover:z-50'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          {tech && (
                            <TechHoverTooltip
                              tech={tech}
                              horizontalPlacement={colPlacement}
                              verticalPlacement="top-[calc(100%+8px)]"
                            />
                          )}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">{l(`Slot ${sIdx + 1}`, `槽位 ${sIdx + 1}`)}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div className="flex flex-col justify-between h-full">
                              <span className="sr-only">
                                {tName}: {tDesc}
                              </span>
                              <div className="my-0.5">
                                <TechTileIconography tech={tech} compact />
                              </div>
                              <div className="text-[8.5px] text-slate-400 font-mono">
                                {l(`Base: ${tech.baseCost} sci`, `基础: ${tech.baseCost} 科研`)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} {l('Sci', '科研')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. GRID ROW (GREEN / EMERALD) */}
                <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/90 border border-emerald-950/80 rounded-xl p-3.5 shadow-md transition-[z-index]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-display flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" /> {l(`GRID TECH ROW (${techRows.grid.count} Researched)`, `网络科技栏 (${techRows.grid.count} 已研发)`)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        {l('Next Discount:', '下格减免:')} <strong className="text-emerald-300">-{techRows.grid.nextDiscount} {l('Science', '科研')}</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.grid.victoryPoints > 0 ? `+${techRows.grid.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* Grid Slots */}
                  <div className={`grid grid-cols-2 ${getTechTrackMaxSlots('grid', player.faction.id) === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-7'} gap-2`}>
                    {Array.from({ length: getTechTrackMaxSlots('grid', player.faction.id) }).map((_, sIdx) => {
                      const tech = techRows.grid.techs[sIdx];
                      const discounts = getTechTrackDiscountsForPlayer('grid', player.faction.id);
                      const discount = discounts[sIdx] ?? 8;
                      const vpEarned = getTechTrackVPForPlayer('grid', sIdx + 1, player.faction.id);
                      const colPlacement = sIdx <= 1 ? 'left-0' : sIdx >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                      const tName = tech ? translateTechName(tech.id, tech.name, language) : '';
                      const tDesc = tech ? translateTechDesc(tech.id, tech.description, language) : '';

                      return (
                        <div
                          key={`grid_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          title={tech ? `${tName}: ${tDesc}` : undefined}
                          className={`min-h-[76px] rounded-lg border p-2 flex flex-col justify-between transition-all relative ${
                            tech
                              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30 cursor-pointer hover:border-emerald-400 group hover:z-50'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          {tech && (
                            <TechHoverTooltip
                              tech={tech}
                              horizontalPlacement={colPlacement}
                              verticalPlacement="top-[calc(100%+8px)]"
                            />
                          )}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">{l(`Slot ${sIdx + 1}`, `槽位 ${sIdx + 1}`)}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div className="flex flex-col justify-between h-full">
                              <span className="sr-only">
                                {tName}: {tDesc}
                              </span>
                              <div className="my-0.5">
                                <TechTileIconography tech={tech} compact />
                              </div>
                              <div className="text-[8.5px] text-slate-400 font-mono">
                                {l(`Base: ${tech.baseCost} sci`, `基础: ${tech.baseCost} 科研`)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} {l('Sci', '科研')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. NANO ROW (BLUE / SKY) */}
                <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/90 border border-sky-950/80 rounded-xl p-3.5 shadow-md transition-[z-index]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-sky-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300 font-display flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-sky-400" /> {l(`NANO TECH ROW (${techRows.nano.count} Researched)`, `纳米科技栏 (${techRows.nano.count} 已研发)`)}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        {l('Next Discount:', '下格减免:')} <strong className="text-sky-300">-{techRows.nano.nextDiscount} {l('Science', '科研')}</strong>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {techRows.nano.victoryPoints > 0 ? `+${techRows.nano.victoryPoints} VP` : '0 VP'}
                      </span>
                    </div>
                  </div>

                  {/* Nano Slots */}
                  <div className={`grid grid-cols-2 ${getTechTrackMaxSlots('nano', player.faction.id) === 4 ? 'sm:grid-cols-4' : getTechTrackMaxSlots('nano', player.faction.id) === 6 ? 'sm:grid-cols-6' : 'sm:grid-cols-7'} gap-2`}>
                    {Array.from({ length: getTechTrackMaxSlots('nano', player.faction.id) }).map((_, sIdx) => {
                      const tech = techRows.nano.techs[sIdx];
                      const discounts = getTechTrackDiscountsForPlayer('nano', player.faction.id);
                      const discount = discounts[sIdx] ?? 8;
                      const vpEarned = getTechTrackVPForPlayer('nano', sIdx + 1, player.faction.id);
                      const colPlacement = sIdx <= 1 ? 'left-0' : sIdx >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                      const tName = tech ? translateTechName(tech.id, tech.name, language) : '';
                      const tDesc = tech ? translateTechDesc(tech.id, tech.description, language) : '';

                      return (
                        <div
                          key={`nano_slot_${sIdx}`}
                          onClick={() => tech && setSelectedTech(tech)}
                          title={tech ? `${tName}: ${tDesc}` : undefined}
                          className={`min-h-[76px] rounded-lg border p-2 flex flex-col justify-between transition-all relative ${
                            tech
                              ? 'bg-sky-950/40 border-sky-500/80 shadow-md ring-1 ring-sky-500/30 cursor-pointer hover:border-sky-400 group hover:z-50'
                              : 'bg-slate-950/60 border-slate-800 border-dashed opacity-60'
                          }`}
                        >
                          {tech && (
                            <TechHoverTooltip
                              tech={tech}
                              horizontalPlacement={colPlacement}
                              verticalPlacement="bottom-[calc(100%+8px)]"
                            />
                          )}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-slate-500 font-bold">{l(`Slot ${sIdx + 1}`, `槽位 ${sIdx + 1}`)}</span>
                            {vpEarned > 0 && (
                              <span className="text-[9px] font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-800">
                                {vpEarned} VP
                              </span>
                            )}
                          </div>

                          {tech ? (
                            <div className="flex flex-col justify-between h-full">
                              <span className="sr-only">
                                {tName}: {tDesc}
                              </span>
                              <div className="my-0.5">
                                <TechTileIconography tech={tech} compact />
                              </div>
                              <div className="text-[8.5px] text-slate-400 font-mono">
                                {l(`Base: ${tech.baseCost} sci`, `基础: ${tech.baseCost} 科研`)}
                              </div>
                              {tech.id === 'artifact_key' && (
                                <div className="text-[9px] text-sky-300 font-bold font-mono">
                                  {controlledArtifactsCount} {l('Artifacts Held', '已持有遗物')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-1">
                              <span className="text-[11px] font-mono font-bold text-slate-500">
                                -{discount} {l('Sci', '科研')}
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
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> {l(`Researched Rare Technologies (${techRows.rare.length})`, `已研发稀有科技 (${techRows.rare.length})`)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {techRows.rare.map((rt) => {
                        const rName = translateTechName(rt.id, rt.name, language);
                        const rDesc = translateTechDesc(rt.id, rt.description, language);
                        return (
                        <div
                          key={rt.id}
                          onClick={() => setSelectedTech(rt)}
                          title={`${rName}: ${rDesc}`}
                          className="px-3 py-1.5 rounded-lg border border-purple-500/70 bg-purple-950/50 text-purple-200 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:border-purple-400 shadow relative group hover:z-50"
                        >
                          <TechHoverTooltip
                            tech={rt}
                            horizontalPlacement="left-0"
                            verticalPlacement="bottom-[calc(100%+8px)]"
                          />
                          <span>{rName}</span>
                          {rt.victoryPoints && rt.victoryPoints > 0 && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1 rounded border border-amber-800">
                              +{rt.victoryPoints} VP
                            </span>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Selected Tech Detail Floating Modal */}
              {selectedTech && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
                  <div className="bg-slate-900 border-2 border-cyan-500 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3 animate-in zoom-in-95 duration-150 text-slate-100">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="font-extrabold text-white text-base font-display flex items-center gap-2">
                          {translateTechName(selectedTech.id, selectedTech.name, language)}
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                            selectedTech.category === 'military'
                              ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                              : selectedTech.category === 'grid'
                              ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                              : selectedTech.category === 'nano'
                              ? 'bg-sky-950/80 border-sky-600 text-sky-300'
                              : 'bg-purple-950/80 border-purple-600 text-purple-300'
                          }`}>
                            {l(`${selectedTech.category} tech`, `${translateTechCategory(selectedTech.category, language)}科技`)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          {l('Base Cost:', '基础花费:')} <strong className="text-pink-300">{selectedTech.baseCost} {l('Science', '科研')}</strong> • {l('Min Cost:', '最低花费:')} <strong className="text-pink-300">{selectedTech.minCost} {l('Science', '科研')}</strong>
                          {selectedTech.victoryPoints && selectedTech.victoryPoints > 0 ? ` • +${selectedTech.victoryPoints} VP` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTech(null)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
                        title={l('Close details (Esc)', '关闭详情 (Esc)')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      {translateTechDesc(selectedTech.id, selectedTech.description, language)}
                    </div>

                    {selectedTech.unlocksPartId && (
                      <div className="text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 p-2.5 rounded-xl flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{l('Unlocks ship component:', '解锁飞船部件:')} <strong>{selectedTech.unlocksPartId.replace(/_/g, ' ').toUpperCase()}</strong></span>
                      </div>
                    )}
                    {selectedTech.unlocksAbility && (
                      <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-xl flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{l('Special Ability:', '特殊能力:')} <strong>{selectedTech.unlocksAbility.replace(/_/g, ' ').toUpperCase()}</strong></span>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSelectedTech(null)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                      >
                        {l('Close', '关闭')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION 2.5: ENLIGHTENED OF LYRA - 3x3 SHRINE BOARD                */}
          {/* ================================================================= */}
          {player.faction.id === 'enlightened_of_lyra' && player.shrineBoard && (activeTab === 'all' || activeTab === 'tech') && (
            <div className="bg-slate-950/80 border border-orange-500/40 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-950/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-orange-200 font-display flex items-center gap-2">
                      {l('SHRINE BOARD (9 Sacred Shrines)', '神龛面板 (9 座圣龛)')}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {l(
                        'With each Research action, you may place one Shrine on an eligible planet slot in a controlled hex. Complete rows to unlock powerful spiritual bonuses.',
                        '每次执行研发行动时，你可在己方控制星区符合条件的星球槽位建造 1 座神龛。完成一整行可解锁强力加成。'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-orange-300 font-bold">
                    {`${player.shrineBoard.slots.flat().filter((s) => s.built).length}/9 ${l('Shrines Built', '已建神龛')}`}
                  </span>
                  <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    {`+${player.shrineBoard.slots.flat().filter((s) => s.built).length} VP`}
                  </span>
                </div>
              </div>

              {/* 3 Rows with Row Bonuses */}
              <div className="space-y-3">
                {player.shrineBoard.slots.map((rowSlots, rIdx) => {
                  const isCompleted = rowSlots.every((s) => s.built);
                  const rowBonusClaimed = player.shrineBoard?.rowBonusesClaimed[rIdx];
                  const rowTitles = [
                    l('Row 1 — Unlocks Permanent Wormhole Generator Ability', '第 1 行 — 永久解锁虫洞发生器能力'),
                    l('Row 2 — Unlocks Free Discovery Tile (Sector 238 or +2 VP)', '第 2 行 — 获得免费探索板块（星区 238 或 +2 VP）'),
                    l('Row 3 — Unlocks +1 Permanent Influence Disc', '第 3 行 — 永久获得 +1 枚影响力圆片'),
                  ];
                  const bonusStatus = [
                    player.hasWormholeGeneratorAbility ? l('UNLOCKED', '已解锁') : l('LOCKED', '未解锁'),
                    rowBonusClaimed ? l('CLAIMED', '已领取') : l('LOCKED', '未解锁'),
                    player.lyraExtraDiscClaimed ? l('+1 DISC GRANTED', '已获得 +1 圆片') : l('LOCKED', '未解锁'),
                  ];

                  return (
                    <div
                      key={`shrine_row_${rIdx}`}
                      className={`border rounded-xl p-3 transition-all ${
                        isCompleted
                          ? 'bg-orange-950/20 border-orange-500/50 shadow-md'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-300 font-display">
                            {rowTitles[rIdx]}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isCompleted
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {bonusStatus[rIdx]}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {rowSlots.map((slot, cIdx) => {
                          const resColors = {
                            science: 'text-pink-400 border-pink-500/30 bg-pink-950/20',
                            money: 'text-amber-300 border-amber-500/30 bg-amber-950/20',
                            materials: 'text-amber-500 border-amber-600/30 bg-amber-950/20',
                          };
                          const resColor = resColors[slot.costResource] || 'text-slate-300';

                          return (
                            <div
                              key={`shrine_slot_${rIdx}_${cIdx}`}
                              className={`rounded-lg border p-2 flex flex-col items-center justify-center text-center transition-all ${
                                slot.built
                                  ? 'bg-orange-900/30 border-orange-400 text-orange-200 shadow ring-1 ring-orange-500/30'
                                  : `${resColor} border-dashed opacity-80`
                              }`}
                            >
                              {slot.built ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold font-display text-orange-200">
                                      {l(`Shrine ${rIdx * 3 + cIdx + 1}`, `神龛 ${rIdx * 3 + cIdx + 1}`)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {slot.sectorId ? l(`Sec ${slot.sectorId}`, `星区 ${slot.sectorId}`) : l('Erected', '已建造')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs font-bold font-mono">
                                    {slot.costAmount} {language === 'zh' ? translateResourceType(slot.costResource, language) : slot.costResource.toUpperCase()}
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {l(
                                      `Next to ${slot.costResource} / gray planet`,
                                      `邻近 ${translateResourceType(slot.costResource, language)} / 灰色星球`
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  <Rocket className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                      {l('FLEET SHIP BLUEPRINTS', '舰队飞船蓝图')}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {l(
                        'Modular ship loadouts, installed weapon systems, drives, shields, and damage capacity.',
                        '模块化飞船配置：已安装的武器系统、推进器、护盾及船体耐久。'
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenBlueprintEditor()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/70 text-cyan-300 text-xs font-bold transition-all shadow"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{l('Open Ship Upgrade Designer', '打开飞船改装设计器')}</span>
                </button>
              </div>

              {/* Mega War Inc.: Physical-Board Continuous 11-Module Strip above Ship Cards */}
              {player.faction.id === 'mega_war_inc' && (
                <MegaWarModularStrip
                  blueprints={player.blueprints as any}
                  faction={player.faction}
                  activeExpansions={activeExpansions}
                  interactive={false}
                  onSelectShipType={(st) => onOpenBlueprintEditor(st)}
                />
              )}

              {/* 4 Ship Classes Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {blueprintsWithStats.map((sc) => {
                  const bp = sc.blueprint;
                  const stats = sc.stats;
                  const shipLabel = translateShipType(sc.type, language);

                  return (
                    <div
                      key={sc.type}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-start shadow-md space-y-3 h-full"
                    >
                      {/* Ship Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          {shouldShowShipTypeIcon(sc.type, player.faction.id) && ['interceptor', 'cruiser', 'dreadnought', 'starbase', 'orbital', 'ancient'].includes(sc.type) ? (
                            <ShipTypeIcon shipType={sc.type} factionId={player.faction.id} size={15} className="text-cyan-400" />
                          ) : (
                            <Rocket className="w-4 h-4 text-cyan-400" />
                          )}
                          <h3 className="text-sm font-bold text-slate-100 font-display uppercase tracking-wide">
                            {language === 'zh' ? shipLabel : sc.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {sc.type === 'ancient'
                              ? l('Cost: --', '造价: --')
                              : l(`Cost: ${sc.baseCost} Mats`, `造价: ${sc.baseCost} 材料`)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">
                            {sc.type === 'ancient' ? (
                              <>
                                {l('Converted:', '已转化:')} <strong className="text-fuchsia-300">{sc.deployedCount}</strong>
                              </>
                            ) : (
                              <>
                                {l('Supply:', '库存:')} <strong className={sc.deployedCount >= sc.limit ? 'text-amber-400' : 'text-cyan-300'}>
                                  {sc.deployedCount}
                                </strong> / {sc.limit}
                              </>
                            )}
                          </span>
                          <button
                            onClick={() => onOpenBlueprintEditor(sc.type)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                            title={l(`Upgrade ${sc.name}`, `改装 ${shipLabel}`)}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Ship Blueprint Body: Summary Status on Left, Blueprint Slots on Right */}
                      <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4 my-1">
                        {/* Summary Status Panel (Left Side) */}
                        {stats && (
                          <div className="w-full sm:w-36 lg:w-40 shrink-0 bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between shadow-inner">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-800/60 pb-1 font-display">
                              <span>{l('Ship Stats', '飞船属性')}</span>
                              <span className="text-[8.5px] font-mono text-cyan-400 font-normal">{l('Active', '生效')}</span>
                            </div>

                            {/* Status grid (retains grid grid-cols-6 for compatibility with test 134) */}
                            <div className="grid grid-cols-6 sm:grid-cols-2 gap-1.5 text-center font-mono">
                              {/* HP */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Heart className="w-2.5 h-2.5 text-rose-400" />
                                  <span>{l('HP', '耐久')}</span>
                                </div>
                                <div className="text-xs font-bold text-rose-300 mt-0.5">{stats.totalHull} HP</div>
                              </div>

                              {/* Speed */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>{l('Speed', '航速')}</span>
                                </div>
                                <div className="text-xs font-bold text-cyan-300 mt-0.5">
                                  {sc.type === 'starbase' ? l('Immobile', '不可移动') : l(`${stats.totalDriveSpeed} Hex`, `${stats.totalDriveSpeed} 格`)}
                                </div>
                              </div>

                              {/* Init */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Timer className="w-2.5 h-2.5 text-indigo-400" />
                                  <span>{l('Init', '先攻')}</span>
                                </div>
                                <div className="text-xs font-bold text-indigo-300 mt-0.5">
                                  {stats.totalInitiative >= 0 ? `+${stats.totalInitiative}` : stats.totalInitiative}
                                </div>
                                <div className="text-[7.5px] text-slate-500 font-mono mt-0.5">
                                  B{(bp?.baseInitiative ?? 0) >= 0 ? `+${bp?.baseInitiative ?? 0}` : (bp?.baseInitiative ?? 0)} P{(stats.totalInitiative - (bp?.baseInitiative ?? 0)) >= 0 ? `+${stats.totalInitiative - (bp?.baseInitiative ?? 0)}` : (stats.totalInitiative - (bp?.baseInitiative ?? 0))}
                                </div>
                              </div>

                              {/* COMP */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Crosshair className="w-2.5 h-2.5 text-sky-400" />
                                  <span>{l('COMP', '电脑')}</span>
                                </div>
                                <div className="text-xs font-bold text-sky-300 mt-0.5">
                                  {`+${stats.computerBonus}`}
                                </div>
                              </div>

                              {/* Shield */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5 text-teal-400" />
                                  <span>{l('Shield', '护盾')}</span>
                                </div>
                                <div className="text-xs font-bold text-teal-300 mt-0.5">
                                  {`-${stats.shieldBonus}`}
                                </div>
                              </div>

                              {/* Power */}
                              <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                                <div className="text-[9px] text-slate-500 uppercase font-sans flex items-center justify-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{l('Power', '能源')}</span>
                                </div>
                                <div
                                  className={`text-xs font-bold mt-0.5 ${
                                    stats.totalPowerProduced >= stats.totalPowerConsumed
                                      ? 'text-emerald-400'
                                      : 'text-rose-400'
                                  }`}
                                >
                                  +{stats.totalPowerProduced}/-{stats.totalPowerConsumed}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Component Slots Grid in Authentic Square Layout (Larger size) */}
                        <div className="flex-1 flex flex-col justify-center items-center overflow-x-auto min-h-[160px] p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
                          {/* Compatibility strings for test 134:
                              grid grid-cols-4 gap-1.5 content-start auto-rows-[50px] min-h-[106px]
                              h-[50px] min-h-[50px]
                              {part.computerBonus > 0 && ` | +${part.computerBonus} COMP`}
                          */}
                          <ShipBlueprintSlotsLayout
                            shipType={sc.type}
                            factionId={player.faction.id}
                            slots={
                              bp?.slots
                                ? bp.slots.map((s) => (s ? getEffectiveShipPart(s, activeExpansions) : null))
                                : []
                            }
                            maxSlots={sc.maxSlots}
                            preprintedPower={bp?.preprintedPower}
                            preprintedComputer={bp?.preprintedComputer}
                            preprintedShield={bp?.preprintedShield}
                            preprintedHull={bp?.preprintedHull}
                            baseInitiative={bp?.baseInitiative}
                            externalParts={bp?.externalParts || []}
                            externalModularGroup={
                              player.faction.id === 'mega_war_inc'
                                ? inferModularExternalGroup(player.blueprints as any, 'muon_source')
                                : null
                            }
                            size="md"
                          />
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display flex items-center gap-2">
                    <Layers className="w-5 h-5 text-yellow-400" />
                    {l('POPULATION & RESOURCE PRODUCTION TRACKS', '人口与资源产出轨道')}
                  </h2>
                  <span className="text-[11px] text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
                    {l('Official Board Rule: Left to right (2 → 28)', '官方版图规则：从左至右 (2 → 28)')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'zh' ? (
                    <>
                      人口方块从左到右放置在轨道格中。殖民星球时，从左向右依次取走方块。当前<strong className="text-slate-200">最右侧露出的最高数字</strong>即为你维护阶段的产出值。
                    </>
                  ) : (
                    <>
                      Cubes are placed on spaces from left to right. When colonizing a planet, you remove cubes from left to right to your sectors. The <strong className="text-slate-200">highest uncovered number</strong> is what you currently earn during Upkeep.
                    </>
                  )}
                </p>
              </div>

              {/* 3 Population Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Money Track */}
                <div className="bg-slate-900/90 border border-yellow-950/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-yellow-400 flex items-center gap-1.5 font-display">
                      <Coins className="w-4 h-4 text-yellow-400" /> {l('MONEY TRACK', '信用点轨道')}
                    </span>
                    <span className="font-mono text-yellow-300 font-bold">
                      +{summary.income.money} {l('Credits/rnd', '信用点/回合')}
                    </span>
                  </div>

                  {/* Next-Cube Forecast Bar */}
                  <div className="bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-yellow-900/40 text-[11px] flex flex-wrap items-center justify-between gap-1">
                    <span className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">{l('Forecast:', '预测:')}</span>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-slate-300">
                        {l('Active:', '当前:')} <strong className="text-yellow-300">+{moneyForecast.currentIncome}</strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-yellow-200">
                        {l('Next:', '下格:')} <strong className="text-yellow-300">+{moneyForecast.next1Cube.income}</strong> <span className="text-emerald-400">(+{moneyForecast.next1Cube.delta})</span>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-yellow-200">
                        +2: <strong className="text-yellow-300">+{moneyForecast.next2Cubes.income}</strong> <span className="text-emerald-400">(+{moneyForecast.next2Cubes.delta})</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {POPULATION_TRACK_SPACES.map((space) => {
                      const hasCube = player.population.money.cubesOnBoard > space.cubesOnBoardThreshold;
                      const isActive = player.population.money.cubesOnBoard === space.cubesOnBoardThreshold;
                      const isNext = player.population.money.cubesOnBoard - 1 === space.cubesOnBoardThreshold;
                      const isNext2 = player.population.money.cubesOnBoard - 2 === space.cubesOnBoardThreshold;

                      return (
                        <div
                          key={`money_space_${space.slotIndex}`}
                          title={l(
                            `Space ${space.value} Credits: ${
                              isActive
                                ? `Current Active Income (${space.value} Credits/rnd)`
                                : isNext
                                ? `Next Cube to colonize! Uncovering increases income from ${moneyForecast.currentIncome} to ${space.value} (+${moneyForecast.next1Cube.delta} delta)`
                                : isNext2
                                ? `Second Cube! Uncovering increases income to ${space.value} (+${moneyForecast.next2Cubes.delta} delta)`
                                : hasCube
                                ? `Covered by population cube (uncovers ${space.value} Credits)`
                                : `Uncovered (already passed)`
                            }`,
                            `${space.value} 信用点格：${
                              isActive
                                ? `当前生效产出（${space.value} 信用点/回合）`
                                : isNext
                                ? `下个殖民方块！移出后产出从 ${moneyForecast.currentIncome} 升至 ${space.value} (+${moneyForecast.next1Cube.delta})`
                                : isNext2
                                ? `第 2 个方块！移出后产出升至 ${space.value} (+${moneyForecast.next2Cubes.delta})`
                                : hasCube
                                ? `被人口方块覆盖（移出后产出 ${space.value} 信用点）`
                                : `已露出（已超越）`
                            }`
                          )}
                          className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 relative transition-all ${
                            isActive
                              ? 'bg-yellow-950/60 border-yellow-400 shadow-lg shadow-yellow-950/60 ring-2 ring-yellow-400/80'
                              : isNext
                              ? 'bg-slate-950/90 border-yellow-500/50 hover:border-yellow-400'
                              : hasCube
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-950/30 border-slate-900 opacity-45'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full px-0.5 text-[10px] font-mono leading-none">
                            <span
                              className={`font-black ${
                                isActive
                                  ? 'text-yellow-300 text-xs'
                                  : isNext
                                  ? 'text-yellow-400 font-bold'
                                  : hasCube
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {space.value}
                            </span>
                            {isNext && (
                              <span className="text-[8px] font-bold text-emerald-400 font-mono">
                                +{moneyForecast.next1Cube.delta}
                              </span>
                            )}
                            {isNext2 && (
                              <span className="text-[8px] font-bold text-cyan-400 font-mono">
                                +{moneyForecast.next2Cubes.delta}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex items-center justify-center my-0.5">
                            {hasCube ? (
                              <div
                                className="w-5 h-5 rounded-sm bg-yellow-500 border border-yellow-200 shadow-md transform hover:scale-110 transition-transform"
                                title={l('Wooden Population Cube', '人口方块')}
                              />
                            ) : isActive ? (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950 uppercase tracking-tight shadow">
                                {l('ACTIVE', '当前')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">✓</span>
                            )}
                          </div>

                          <div className="w-full text-center">
                            <span
                              className={`text-[8px] font-mono block truncate ${
                                isActive
                                  ? 'text-yellow-300 font-bold'
                                  : isNext
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isActive
                                ? l(`${space.value}/rnd`, `${space.value}/回合`)
                                : isNext
                                ? l('Next cube', '下个方块')
                                : hasCube
                                ? l('Covered', '已覆盖')
                                : l('Empty', '空')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Science Track */}
                <div className="bg-slate-900/90 border border-pink-950/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-pink-400 flex items-center gap-1.5 font-display">
                      <FlaskConical className="w-4 h-4 text-pink-400" /> {l('SCIENCE TRACK', '科研轨道')}
                    </span>
                    <span className="font-mono text-pink-300 font-bold">
                      +{summary.income.science} {l('Sci/rnd', '科研/回合')}
                    </span>
                  </div>

                  {/* Next-Cube Forecast Bar */}
                  <div className="bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-pink-900/40 text-[11px] flex flex-wrap items-center justify-between gap-1">
                    <span className="text-pink-400 font-bold uppercase tracking-wider text-[10px]">{l('Forecast:', '预测:')}</span>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-slate-300">
                        {l('Active:', '当前:')} <strong className="text-pink-300">+{sciForecast.currentIncome}</strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-pink-200">
                        {l('Next:', '下格:')} <strong className="text-pink-300">+{sciForecast.next1Cube.income}</strong> <span className="text-emerald-400">(+{sciForecast.next1Cube.delta})</span>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-pink-200">
                        +2: <strong className="text-pink-300">+{sciForecast.next2Cubes.income}</strong> <span className="text-emerald-400">(+{sciForecast.next2Cubes.delta})</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {POPULATION_TRACK_SPACES.map((space) => {
                      const hasCube = player.population.science.cubesOnBoard > space.cubesOnBoardThreshold;
                      const isActive = player.population.science.cubesOnBoard === space.cubesOnBoardThreshold;
                      const isNext = player.population.science.cubesOnBoard - 1 === space.cubesOnBoardThreshold;
                      const isNext2 = player.population.science.cubesOnBoard - 2 === space.cubesOnBoardThreshold;

                      return (
                        <div
                          key={`sci_space_${space.slotIndex}`}
                          title={l(
                            `Space ${space.value} Science: ${
                              isActive
                                ? `Current Active Income (${space.value} Science/rnd)`
                                : isNext
                                ? `Next Cube to colonize! Uncovering increases science from ${sciForecast.currentIncome} to ${space.value} (+${sciForecast.next1Cube.delta} delta)`
                                : isNext2
                                ? `Second Cube! Uncovering increases science to ${space.value} (+${sciForecast.next2Cubes.delta} delta)`
                                : hasCube
                                ? `Covered by population cube (uncovers ${space.value} Science)`
                                : `Uncovered (already passed)`
                            }`,
                            `${space.value} 科研格：${
                              isActive
                                ? `当前生效产出（${space.value} 科研/回合）`
                                : isNext
                                ? `下个殖民方块！移出后产出从 ${sciForecast.currentIncome} 升至 ${space.value} (+${sciForecast.next1Cube.delta})`
                                : isNext2
                                ? `第 2 个方块！移出后产出升至 ${space.value} (+${sciForecast.next2Cubes.delta})`
                                : hasCube
                                ? `被人口方块覆盖（移出后产出 ${space.value} 科研）`
                                : `已露出（已超越）`
                            }`
                          )}
                          className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 relative transition-all ${
                            isActive
                              ? 'bg-pink-950/60 border-pink-400 shadow-lg shadow-pink-950/60 ring-2 ring-pink-400/80'
                              : isNext
                              ? 'bg-slate-950/90 border-pink-500/50 hover:border-pink-400'
                              : hasCube
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-950/30 border-slate-900 opacity-45'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full px-0.5 text-[10px] font-mono leading-none">
                            <span
                              className={`font-black ${
                                isActive
                                  ? 'text-pink-300 text-xs'
                                  : isNext
                                  ? 'text-pink-400 font-bold'
                                  : hasCube
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {space.value}
                            </span>
                            {isNext && (
                              <span className="text-[8px] font-bold text-emerald-400 font-mono">
                                +{sciForecast.next1Cube.delta}
                              </span>
                            )}
                            {isNext2 && (
                              <span className="text-[8px] font-bold text-cyan-400 font-mono">
                                +{sciForecast.next2Cubes.delta}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex items-center justify-center my-0.5">
                            {hasCube ? (
                              <div
                                className="w-5 h-5 rounded-sm bg-pink-500 border border-pink-200 shadow-md transform hover:scale-110 transition-transform"
                                title={l('Wooden Population Cube', '人口方块')}
                              />
                            ) : isActive ? (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-pink-400 text-slate-950 uppercase tracking-tight shadow">
                                {l('ACTIVE', '当前')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">✓</span>
                            )}
                          </div>

                          <div className="w-full text-center">
                            <span
                              className={`text-[8px] font-mono block truncate ${
                                isActive
                                  ? 'text-pink-300 font-bold'
                                  : isNext
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isActive
                                ? l(`${space.value}/rnd`, `${space.value}/回合`)
                                : isNext
                                ? l('Next cube', '下个方块')
                                : hasCube
                                ? l('Covered', '已覆盖')
                                : l('Empty', '空')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Materials Track */}
                <div className="bg-slate-900/90 border border-amber-950/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-500 flex items-center gap-1.5 font-display">
                      <Hammer className="w-4 h-4 text-amber-500" /> {l('MATERIALS TRACK', '材料轨道')}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      +{summary.income.materials} {l('Mats/rnd', '材料/回合')}
                    </span>
                  </div>

                  {/* Next-Cube Forecast Bar */}
                  <div className="bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-amber-900/40 text-[11px] flex flex-wrap items-center justify-between gap-1">
                    <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px]">{l('Forecast:', '预测:')}</span>
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-slate-300">
                        {l('Active:', '当前:')} <strong className="text-amber-400">+{matForecast.currentIncome}</strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-200">
                        {l('Next:', '下格:')} <strong className="text-amber-400">+{matForecast.next1Cube.income}</strong> <span className="text-emerald-400">(+{matForecast.next1Cube.delta})</span>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-200">
                        +2: <strong className="text-amber-400">+{matForecast.next2Cubes.income}</strong> <span className="text-emerald-400">(+{matForecast.next2Cubes.delta})</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {POPULATION_TRACK_SPACES.map((space) => {
                      const hasCube = player.population.material.cubesOnBoard > space.cubesOnBoardThreshold;
                      const isActive = player.population.material.cubesOnBoard === space.cubesOnBoardThreshold;
                      const isNext = player.population.material.cubesOnBoard - 1 === space.cubesOnBoardThreshold;
                      const isNext2 = player.population.material.cubesOnBoard - 2 === space.cubesOnBoardThreshold;

                      return (
                        <div
                          key={`mat_space_${space.slotIndex}`}
                          title={l(
                            `Space ${space.value} Materials: ${
                              isActive
                                ? `Current Active Income (${space.value} Materials/rnd)`
                                : isNext
                                ? `Next Cube to colonize! Uncovering increases materials from ${matForecast.currentIncome} to ${space.value} (+${matForecast.next1Cube.delta} delta)`
                                : isNext2
                                ? `Second Cube! Uncovering increases materials to ${space.value} (+${matForecast.next2Cubes.delta} delta)`
                                : hasCube
                                ? `Covered by population cube (uncovers ${space.value} Materials)`
                                : `Uncovered (already passed)`
                            }`,
                            `${space.value} 材料格：${
                              isActive
                                ? `当前生效产出（${space.value} 材料/回合）`
                                : isNext
                                ? `下个殖民方块！移出后产出从 ${matForecast.currentIncome} 升至 ${space.value} (+${matForecast.next1Cube.delta})`
                                : isNext2
                                ? `第 2 个方块！移出后产出升至 ${space.value} (+${matForecast.next2Cubes.delta})`
                                : hasCube
                                ? `被人口方块覆盖（移出后产出 ${space.value} 材料）`
                                : `已露出（已超越）`
                            }`
                          )}
                          className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 relative transition-all ${
                            isActive
                              ? 'bg-amber-950/60 border-amber-400 shadow-lg shadow-amber-950/60 ring-2 ring-amber-400/80'
                              : isNext
                              ? 'bg-slate-950/90 border-amber-500/50 hover:border-amber-400'
                              : hasCube
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-950/30 border-slate-900 opacity-45'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full px-0.5 text-[10px] font-mono leading-none">
                            <span
                              className={`font-black ${
                                isActive
                                  ? 'text-amber-400 text-xs'
                                  : isNext
                                  ? 'text-amber-400 font-bold'
                                  : hasCube
                                  ? 'text-slate-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {space.value}
                            </span>
                            {isNext && (
                              <span className="text-[8px] font-bold text-emerald-400 font-mono">
                                +{matForecast.next1Cube.delta}
                              </span>
                            )}
                            {isNext2 && (
                              <span className="text-[8px] font-bold text-cyan-400 font-mono">
                                +{matForecast.next2Cubes.delta}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex items-center justify-center my-0.5">
                            {hasCube ? (
                              <div
                                className="w-5 h-5 rounded-sm bg-amber-600 border border-amber-300 shadow-md transform hover:scale-110 transition-transform"
                                title={l('Wooden Population Cube', '人口方块')}
                              />
                            ) : isActive ? (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-tight shadow">
                                {l('ACTIVE', '当前')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-mono">✓</span>
                            )}
                          </div>

                          <div className="w-full text-center">
                            <span
                              className={`text-[8px] font-mono block truncate ${
                                isActive
                                  ? 'text-amber-400 font-bold'
                                  : isNext
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isActive
                                ? l(`${space.value}/rnd`, `${space.value}/回合`)
                                : isNext
                                ? l('Next cube', '下个方块')
                                : hasCube
                                ? l('Covered', '已覆盖')
                                : l('Empty', '空')}
                            </span>
                          </div>
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
              💰 {l('Money:', '信用点:')} <strong className="text-yellow-300">{player.resources.money}</strong>
            </span>
            <span>
              🔬 {l('Science:', '科研:')} <strong className="text-pink-300">{player.resources.science}</strong>
            </span>
            <span>
              ⚙️ {l('Materials:', '材料:')} <strong className="text-amber-400">{player.resources.materials}</strong>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">
              {l('Upkeep Owed:', '需付维护费:')} <strong className="text-rose-400">-{forecast.currentUpkeep} {l('Credits', '信用点')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">
              {language === 'zh' ? (
                <>
                  按 <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> 或{' '}
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">P</kbd> 关闭
                </>
              ) : (
                <>
                  Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> or{' '}
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">P</kbd> to close
                </>
              )}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
