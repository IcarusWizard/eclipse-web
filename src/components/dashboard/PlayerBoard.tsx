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
  Rocket,
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
  Handshake,
  Swords,
} from 'lucide-react';
import { canExchangeAmbassadors, getPlayerDisplayName } from '../../engine/rules/gameReducer';
import { getPlayerReputationTrackSlots } from '../../engine/rules/setup';
import { ALL_MINOR_SPECIES_TILES, MinorSpeciesTile } from '../../engine/rules/minorSpecies';
import { useLanguage } from '../../i18n/LanguageContext';
import { ShipTypeIcon } from '../common/ShipTypeIcon';
import {
  translateFactionName,
  translateFactionTrait,
  translateMinorSpeciesName,
  translateShipType,
  translateTechCategory,
  translateTechDesc,
  translateTechName,
} from '../../i18n/catalogTranslations';

interface PlayerBoardProps {
  player: PlayerState;
  isActive: boolean;
  sectors?: SectorTile[];
  onOpenBlueprints: () => void;
  onOpenTechMarket: () => void;
  onOpenTrade: () => void;
  onOpenPhysicalBoard?: () => void;
  onConvertColonyShip?: (resource: 'money' | 'science' | 'materials') => void;
  onOpenCombatSimulator?: () => void;
  hideOpponentReputation?: boolean;
  allPlayers?: PlayerState[];
  traitorPlayerId?: string | null;
  gamePhase?: string;
  warpedUniverse?: { conduits: any } | null;
  onInitiateDiplomacy?: (targetPlayerId: string) => void;
  onBetrayAlliance?: (targetPlayerId: string) => void;
  delayedBlackHoleShips?: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip[];
  onOpenMinorSpecies?: () => void;
  minorSpeciesSupply?: any[];
  hasMinorSpeciesExpansion?: boolean;
}

export const PlayerBoard: React.FC<PlayerBoardProps> = ({
  player,
  isActive,
  sectors = [],
  onOpenBlueprints,
  onOpenTechMarket,
  onOpenTrade,
  onOpenPhysicalBoard,
  onConvertColonyShip,
  onOpenCombatSimulator,
  hideOpponentReputation = false,
  allPlayers = [],
  traitorPlayerId = null,
  gamePhase = 'ACTION_PHASE',
  warpedUniverse,
  onInitiateDiplomacy,
  onBetrayAlliance,
  delayedBlackHoleShips = [],
  onOpenMinorSpecies,
  minorSpeciesSupply = [],
  hasMinorSpeciesExpansion = false,
}) => {
  const { language, l } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [showFleet, setShowFleet] = useState<boolean>(false);
  const [showTech, setShowTech] = useState<boolean>(false);

  const summary = calculatePlayerRoundSummary(player);
  const forecast = calculateActionCostForecast(player);
  const deployed = countPlayerShips(sectors, player.id);
  const moneyForecast = getIncomeForecast(player.population.money.cubesOnBoard);
  const sciForecast = getIncomeForecast(player.population.science.cubesOnBoard);
  const matForecast = getIncomeForecast(player.population.material.cubesOnBoard);

  const reputationVP = player.reputationTiles.reduce((a, b) => a + b, 0);
  const trackSlots = getPlayerReputationTrackSlots(player, allPlayers);
  const occupiedSlotCount = trackSlots.filter((s) => Boolean(s.tile)).length;
  const totalShipsDeployed = deployed.interceptor + deployed.cruiser + deployed.dreadnought + deployed.starbase;

  const traitorPlayer = traitorPlayerId
    ? allPlayers.find((p) => p.id === traitorPlayerId) || (traitorPlayerId === player.id ? player : null)
    : null;
  const isSelfTraitor = traitorPlayer?.id === player.id;
  const traitorVpPenalty = traitorPlayer?.faction.id === 'rho_indi_syndicate' ? 0 : -2;
  const traitorSelfBadgeText = l(`🗡️ Traitor (${traitorVpPenalty})`, `🗡️ 背叛者 (${traitorVpPenalty})`);
  const traitorSelfTooltip = l(
    `Traitor Tile: ${traitorVpPenalty} VP penalty. Diplomacy broken.`,
    `背叛者板块：${traitorVpPenalty} VP 惩罚。外交已破裂。`
  );

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
            <span
              className="font-bold text-xs text-slate-100 font-display truncate"
              title={getPlayerDisplayName(player)}
            >
              {getPlayerDisplayName(player)}
            </span>
            {player.hasPassed && (
              <span className="text-[9px] bg-slate-800 text-amber-400 px-1 py-0.2 rounded uppercase">
                {l('Pass', '已过')}
              </span>
            )}
            {player.isFirstPasser && (
              <span
                className="text-[9px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/70 px-1 py-0.2 rounded shrink-0"
                title={l('Passed first — Starting Player next round', '本轮首位跳过 — 下回合起始玩家')}
              >
                {l('👑 1st', '👑 首家')}
              </span>
            )}
            {isSelfTraitor && (
              <span
                className="text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-600 px-1 py-0.2 rounded uppercase shrink-0 animate-pulse"
                title={traitorSelfTooltip}
              >
                {traitorSelfBadgeText}
              </span>
            )}
          </div>

          {/* Quick buttons & Expand */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenPhysicalBoard && (
              <button
                onClick={onOpenPhysicalBoard}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                title={l('Full Physical Board (P)', '完整实体面板 (P)')}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenTrade}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors"
              title={l(`Trade (${player.faction.tradeRatio ?? 2}:1)`, `交易 (${player.faction.tradeRatio ?? 2}:1)`)}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenTechMarket}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-pink-400 transition-colors"
              title={l('Tech Market', '科技市场')}
            >
              <Cpu className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenBlueprints}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              title={l('Ship Designer', '飞船蓝图设计')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {onOpenCombatSimulator && (
              <button
                onClick={onOpenCombatSimulator}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
                title={l('Combat Simulator', '战斗模拟器')}
              >
                <Swords className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition-colors ml-0.5"
              title={l('Expand Commander Dashboard', '展开指挥官面板')}
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
            title={l(
              `Money: ${player.resources.money} | Income: +${summary.income.money} | Upkeep: -${summary.upkeep}`,
              `信用点：${player.resources.money} | 收入：+${summary.income.money} | 维护费：-${summary.upkeep}`
            )}
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
            title={l(
              `Science: ${player.resources.science} | Income: +${summary.income.science}`,
              `科研：${player.resources.science} | 收入：+${summary.income.science}`
            )}
          >
            <FlaskConical className="w-3 h-3 text-pink-400" />
            <span className="font-bold">{player.resources.science}</span>
          </div>

          {/* Materials */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300"
            title={l(
              `Materials: ${player.resources.materials} | Income: +${summary.income.materials}`,
              `材料：${player.resources.materials} | 收入：+${summary.income.materials}`
            )}
          >
            <Hammer className="w-3 h-3 text-amber-500" />
            <span className="font-bold">{player.resources.materials}</span>
          </div>

          {/* Discs */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300"
            title={l(
              `Influence Discs on Track: ${player.influenceTrack.discsOnTrack} / ${player.influenceTrack.totalDiscs}`,
              `影响力圆片轨道：${player.influenceTrack.discsOnTrack} / ${player.influenceTrack.totalDiscs}`
            )}
          >
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{player.influenceTrack.discsOnTrack}</span>
          </div>

          {/* Colony Ships */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300"
            title={l(
              `Colony Ships: ${player.colonyShips.ready} Ready / ${player.colonyShips.total}`,
              `殖民船：${player.colonyShips.ready} 就绪 / ${player.colonyShips.total}`
            )}
          >
            <Rocket className="w-3 h-3 text-indigo-400" />
            <span>{player.colonyShips.ready}</span>
          </div>

          {/* Magellan Scavenge Colony Ship Quick Buttons (Collapsed) */}
          {player.faction.id === 'wardens_of_magellan' && onConvertColonyShip && (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-700 text-[9px]">
              <span className="text-purple-300 font-bold">{l('Conv:', '转化:')}</span>
              <button
                onClick={() => onConvertColonyShip('money')}
                disabled={player.colonyShips.ready <= 0 || !isActive}
                className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 disabled:opacity-40 cursor-pointer"
                title={l('Convert 1 ready Colony Ship to 1 Money', '将 1 艘就绪殖民船转化为 1 信用点')}
              >
                +1 🪙
              </button>
              <button
                onClick={() => onConvertColonyShip('science')}
                disabled={player.colonyShips.ready <= 0 || !isActive}
                className="px-1.5 py-0.5 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 disabled:opacity-40 cursor-pointer"
                title={l('Convert 1 ready Colony Ship to 1 Science', '将 1 艘就绪殖民船转化为 1 科研')}
              >
                +1 🔬
              </button>
              <button
                onClick={() => onConvertColonyShip('materials')}
                disabled={player.colonyShips.ready <= 0 || !isActive}
                className="px-1.5 py-0.5 rounded bg-amber-700/20 hover:bg-amber-700/30 text-amber-200 border border-amber-700/40 disabled:opacity-40 cursor-pointer"
                title={l('Convert 1 ready Colony Ship to 1 Material', '将 1 艘就绪殖民船转化为 1 材料')}
              >
                +1 ⚙️
              </button>
            </div>
          )}

          {/* Ambassadors & Minor Species */}
          {((allPlayers && allPlayers.length > 1) || hasMinorSpeciesExpansion) && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                hasMinorSpeciesExpansion && onOpenMinorSpecies ? 'cursor-pointer hover:border-indigo-400' : ''
              } ${
                (player.ambassadorTiles?.length || 0) > 0
                  ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
              onClick={hasMinorSpeciesExpansion ? onOpenMinorSpecies : undefined}
              title={l(
                `Ambassadors: ${player.ambassadorTiles?.length || 0} / ${player.faction.ambassadorSlots ?? 3}${hasMinorSpeciesExpansion ? ' • Click to view Minor Species' : ''}`,
                `大使：${player.ambassadorTiles?.length || 0} / ${player.faction.ambassadorSlots ?? 3}${hasMinorSpeciesExpansion ? ' • 点击查看次要物种' : ''}`
              )}
            >
              <Handshake className="w-3 h-3 text-indigo-400" />
              <span>{player.ambassadorTiles?.length || 0}/{player.faction.ambassadorSlots ?? 3}</span>
            </div>
          )}

          {/* Traitor Badge (shown on the traitor's own mini-HUD) */}
          {isSelfTraitor && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-600 text-rose-300 font-bold shrink-0 animate-pulse"
              title={traitorSelfTooltip}
            >
              <span>{traitorSelfBadgeText}</span>
            </div>
          )}

          {/* Reputation */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-600/50 text-amber-300 ml-auto"
            title={
              hideOpponentReputation
                ? l(
                    `Reputation Track: ? VP (${occupiedSlotCount}/${trackSlots.length} slots occupied, secret)`,
                    `声望轨：? VP（已占 ${occupiedSlotCount}/${trackSlots.length} 格，隐藏）`
                  )
                : l(
                    `Reputation Track: ${reputationVP} VP (${occupiedSlotCount}/${trackSlots.length} slots occupied)`,
                    `声望轨：${reputationVP} VP（已占 ${occupiedSlotCount}/${trackSlots.length} 格）`
                  )
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
              <span title={getPlayerDisplayName(player)}>{getPlayerDisplayName(player)}</span>
              {player.isBot && (
                <span
                  className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-600/70 px-1.5 py-0.2 rounded uppercase font-sans shrink-0"
                  title={l('Controlled by Terran AI', '由人族 AI 自动控制')}
                >
                  {l('🤖 AI', '🤖 AI')}
                </span>
              )}
              {player.hasPassed && (
                <span className="text-[9px] bg-slate-800 text-amber-400 px-1 py-0.2 rounded uppercase font-sans">
                  {l('Passed', '已过')}
                </span>
              )}
              {player.isFirstPasser && (
                <span
                  className="text-[9px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/70 px-1.5 py-0.2 rounded font-sans shrink-0"
                  title={l('Passed first — Starting Player next round', '本轮首位跳过 — 下回合起始玩家')}
                >
                  {l('👑 1st', '👑 下轮起始')}
                </span>
              )}
              {isSelfTraitor && (
                <span
                  className="text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-600 px-1.5 py-0.5 rounded flex items-center gap-1 shadow animate-pulse font-sans"
                  title={traitorSelfTooltip}
                >
                  {traitorSelfBadgeText}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {translateFactionTrait(player.faction.id, player.faction.traitDescription, language)}
            </div>
          </div>
        </div>

        {/* Action buttons + Minimize */}
        <div className="flex items-center gap-1 shrink-0">
          {onOpenPhysicalBoard && (
            <button
              onClick={onOpenPhysicalBoard}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              title={l('Full Physical Player Board (Key: P)', '完整实体玩家面板 (快捷键: P)')}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onOpenTrade}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition-colors"
            title={l(`Trade (${player.faction.tradeRatio ?? 2}:1 for Credits)`, `交易 (${player.faction.tradeRatio ?? 2}:1 兑换信用点)`)}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenTechMarket}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-pink-400 transition-colors"
            title={l('Tech Research Display', '科技研究展板')}
          >
            <Cpu className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenBlueprints}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
            title={l('Ship Blueprints Designer', '飞船蓝图设计器')}
          >
            <Settings className="w-4 h-4" />
          </button>
          {onOpenCombatSimulator && (
            <button
              onClick={onOpenCombatSimulator}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
              /* title="Combat Simulator" */
              title={l('Combat Simulator', '战斗模拟器')}
            >
              <Swords className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title={l('Minimize Dashboard', '收起面板')}
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
              <Coins className="w-3 h-3 text-yellow-400" /> {l('MONEY', '信用点')}
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
            {l('Inc:', '收入:')} +{summary.income.money} <span className="text-yellow-400 font-mono font-bold">(+{moneyForecast.next1Cube.delta})</span>
          </span>
        </div>

        {/* Science */}
        <div className="bg-slate-950/80 border border-pink-950/50 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[10.5px] text-pink-400 font-semibold">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-pink-400" /> {l('SCIENCE', '科研')}
            </span>
            <span className="text-[9.5px] font-mono text-emerald-400">+{summary.income.science}</span>
          </div>
          <span className="text-lg font-bold text-pink-300 font-display mt-0.5">
            {player.resources.science}
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            {player.techTrack.researched.length} {l('Techs', '科技')} <span className="text-pink-400 font-mono font-bold">(+{sciForecast.next1Cube.delta})</span>
          </span>
        </div>

        {/* Materials */}
        <div className="bg-slate-950/80 border border-amber-900/40 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-[10.5px] text-amber-500 font-semibold">
            <span className="flex items-center gap-1">
              <Hammer className="w-3 h-3 text-amber-500" /> {l('MATERIALS', '材料')}
            </span>
            <span className="text-[9.5px] font-mono text-emerald-400">+{summary.income.materials}</span>
          </div>
          <span className="text-lg font-bold text-amber-400 font-display mt-0.5">
            {player.resources.materials}
          </span>
          <span className="text-[9px] text-slate-500 truncate">
            {l('Fleet', '舰队')} <span className="text-amber-400 font-mono font-bold">(+{matForecast.next1Cube.delta})</span>
          </span>
        </div>
      </div>

      {/* Discs, Colony Ships, and Reputation Bar */}
      <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
        {/* Discs */}
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/90 p-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>{l('Discs', '圆片')}</span>
          </div>
          <span className="font-bold text-slate-200 font-mono text-xs mt-0.5">
            {player.influenceTrack.discsOnTrack} / {player.influenceTrack.totalDiscs}
          </span>
        </div>

        {/* Colony Ships */}
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/90 p-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Rocket className="w-3 h-3 text-indigo-400" />
            <span>{l('Colony Ships', '殖民船')}</span>
          </div>
          <span className="font-bold text-slate-200 font-mono text-xs mt-0.5">
            {player.colonyShips.ready} / {player.colonyShips.total}
          </span>
        </div>

        {/* Reputation Tiles */}
        <div className="bg-slate-950/70 rounded-lg border border-amber-800/40 px-1 py-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-amber-400">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> {l('Rep', '声望')}
            </span>
            <span className="font-bold font-mono text-amber-300">
              {hideOpponentReputation ? '? VP' : `${reputationVP} VP`}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mt-0.5 overflow-hidden">
            {trackSlots.map((slot) => {
              const isAmbassador = slot.tile?.type === 'ambassador';
              const isRep = slot.tile?.type === 'reputation';
              const repVal = isRep ? slot.tile.vp : undefined;

              if (isAmbassador) {
                const allyId = slot.tile?.allyId;
                const ally = allPlayers?.find((p) => p.id === allyId);
                const allyName = slot.tile?.allyName || ally?.name || allyId || l('Ally', '盟友');
                const allyColor = slot.tile?.allyColor || ally?.color || '#818cf8';
                return (
                  <span
                    key={`hud_rep_slot_${slot.slotIndex}`}
                    className="w-3.5 h-3.5 rounded-sm border text-[8px] font-bold flex items-center justify-center font-mono bg-indigo-950/80 text-indigo-200 shrink-0 cursor-help"
                    style={{ borderColor: allyColor }}
                    title={l(
                      `Ambassador (${allyName}): +1 VP (occupying Reputation Slot #${slot.slotIndex + 1})`,
                      `大使 (${allyName})：+1 VP（占用声望槽 #${slot.slotIndex + 1}）`
                    )}
                  >
                    🤝
                  </span>
                );
              }

              return (
                <span
                  key={`hud_rep_slot_${slot.slotIndex}`}
                  className={`w-3.5 h-3.5 rounded-sm border text-[8px] font-bold flex items-center justify-center font-mono shrink-0 ${
                    isRep
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'border-dashed border-slate-800 text-slate-700'
                  }`}
                  title={
                    isRep
                      ? hideOpponentReputation
                        ? l('Facedown Reputation Tile (Secret)', '暗置声望板块（保密）')
                        : l(`Reputation Tile: +${repVal} VP (Slot #${slot.slotIndex + 1})`, `声望板块：+${repVal} VP（槽位 #${slot.slotIndex + 1}）`)
                      : l(
                          `Empty Slot #${slot.slotIndex + 1} (${
                            slot.slotType === 'amb_only'
                              ? 'Ambassador Only'
                              : slot.slotType === 'both'
                              ? 'Ambassador or Reputation'
                              : 'Reputation Only'
                          })`,
                          `空槽位 #${slot.slotIndex + 1}（${
                            slot.slotType === 'amb_only'
                              ? '仅限大使'
                              : slot.slotType === 'both'
                              ? '大使或声望'
                              : '仅限声望'
                          }）`
                        )
                  }
                >
                  {isRep ? (hideOpponentReputation ? '?' : repVal) : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Magellan Scavenge Colony Ship Ability */}
      {player.faction.id === 'wardens_of_magellan' && onConvertColonyShip && (
        <div
          data-testid="magellan-convert-colony-ship-panel"
          className="bg-purple-950/30 rounded-lg border border-purple-800/50 p-2 mb-2 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-1 text-[11px] text-purple-300 font-bold">
            <Rocket className="w-3.5 h-3.5 text-purple-400" />
            <span>{l('Convert Colony Ship:', '转化殖民船:')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onConvertColonyShip('money')}
              disabled={player.colonyShips.ready <= 0 || !isActive}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors disabled:opacity-40 cursor-pointer"
              title={l('Convert 1 ready Colony Ship to 1 Money', '将 1 艘就绪殖民船转化为 1 信用点')}
            >
              {l('+1 🪙 Money', '+1 🪙 信用点')}
            </button>
            <button
              onClick={() => onConvertColonyShip('science')}
              disabled={player.colonyShips.ready <= 0 || !isActive}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 transition-colors disabled:opacity-40 cursor-pointer"
              title={l('Convert 1 ready Colony Ship to 1 Science', '将 1 艘就绪殖民船转化为 1 科研')}
            >
              {l('+1 🔬 Science', '+1 🔬 科研')}
            </button>
            <button
              onClick={() => onConvertColonyShip('materials')}
              disabled={player.colonyShips.ready <= 0 || !isActive}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-700/20 hover:bg-amber-700/30 text-amber-200 border border-amber-700/40 transition-colors disabled:opacity-40 cursor-pointer"
              title={l('Convert 1 ready Colony Ship to 1 Material', '将 1 艘就绪殖民船转化为 1 材料')}
            >
              {l('+1 ⚙️ Material', '+1 ⚙️ 材料')}
            </button>
          </div>
        </div>
      )}

      {/* Traitor Tile Banner (for the player holding the Traitor Tile, right above Ambassadors panel) */}
      {isSelfTraitor && (
        <div
          className="flex items-center justify-between gap-2 px-2 py-1 mb-2 rounded-lg bg-rose-950/70 border border-rose-600/80 text-[10.5px] text-rose-200 shadow-sm"
          title={traitorSelfTooltip}
        >
          <span className="font-bold text-rose-300 shrink-0">
            {l('🗡️ Traitor Tile', '🗡️ 背叛者板块')}
          </span>
          <span className="font-mono text-[9.5px] text-rose-200 truncate">
            {l(`${traitorVpPenalty} VP • Diplomacy forbidden`, `${traitorVpPenalty} VP • 禁止外交`)}
          </span>
        </div>
      )}

      {/* Ambassadors & Diplomatic Relations (including Minor Species) */}
      {((allPlayers && allPlayers.length > 1) || hasMinorSpeciesExpansion) && (
        <div className="bg-slate-950/60 rounded-lg border border-slate-800/80 p-2 mb-2">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-indigo-400">
              <Handshake className="w-3.5 h-3.5 text-indigo-400" /> {l('Ambassadors', '大使')}
            </span>
            <span className="font-mono text-[9px] text-slate-400">
              {player.ambassadorTiles?.length || 0} / {player.faction.ambassadorSlots ?? 3} {l('Slots', '槽位')}
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Claimed Minor Species Ambassador Tiles */}
            {hasMinorSpeciesExpansion &&
              (player.ambassadorTiles || [])
                .filter((id) => id.startsWith('minor_species_'))
                .map((id) => {
                  const ms = ALL_MINOR_SPECIES_TILES.find((t) => t.id === id);
                  if (!ms) return null;
                  const msName = translateMinorSpeciesName(ms.id, ms.name, language);
                  return (
                    <div
                      key={ms.id}
                      className="flex items-center justify-between px-2 py-1 rounded bg-emerald-950/50 border border-emerald-700/60 text-[10.5px] transition-colors"
                      title={l(
                        `Minor Species Ambassador: ${ms.name} • ${ms.abilityDescription} • +${ms.vp} VP`,
                        `次要物种大使：${msName} • ${ms.abilityDescription} • +${ms.vp} VP`
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs">🌿</span>
                        <span className="font-bold text-emerald-200 truncate">{msName}</span>
                        <span className="text-[9px] text-emerald-400/80 truncate">({ms.vpDescription})</span>
                      </div>
                      <span className="font-mono text-[9.5px] text-emerald-300 font-bold shrink-0">
                        {l(`Allied (+${ms.vp}★)`, `已结盟 (+${ms.vp}★)`)}
                      </span>
                    </div>
                  );
                })}

            {/* 2. Player-to-Player Diplomatic Relations */}
            {allPlayers &&
              allPlayers
                .filter((other) => other.id !== player.id)
                .map((other) => {
                  const isAllied = player.ambassadorTiles?.includes(other.id);
                  const check = canExchangeAmbassadors(
                    { phase: gamePhase, traitorPlayerId, players: allPlayers, sectors, warpedUniverse: warpedUniverse ?? undefined },
                    player.id,
                    other.id
                  );
                  const isEligible = check.canExchange && isActive && gamePhase === 'ACTION_PHASE';
                  const cubeType = player.ambassadorCubes?.[other.id];
                  const cubeIcon =
                    cubeType === 'money' ? '💰' : cubeType === 'science' ? '🔬' : cubeType === 'material' ? '🔨' : '★';
                  const otherFactionName = translateFactionName(other.faction.id, other.faction.name, language);

                  if (isAllied) {
                    return (
                      <div
                        key={other.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/90 border border-slate-900 text-slate-500 text-[10.5px] transition-colors"
                        title={l(
                          `Allied with ${other.name} (${other.faction.name}) • +1 VP`,
                          `已与 ${other.name} (${otherFactionName}) 结盟 • +1 VP`
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 opacity-40 shadow-sm"
                            style={{ backgroundColor: other.color }}
                          />
                          <span className="font-medium text-slate-400 truncate">{other.name}</span>
                          <span className="text-[9px] text-slate-600 truncate">({otherFactionName})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="font-mono text-[9.5px] text-slate-500 flex items-center gap-1 shrink-0"
                            title={l(
                              'Active diplomatic alliance (+1 VP). Only broken if you end a Move action in a sector with their ship or Influence Disc.',
                              '已建立外交同盟（+1 VP）。只有当你在其飞船或控制圆片所在星区结束移动时才会打破同盟。'
                            )}
                          >
                            <Handshake className="w-3 h-3 text-slate-600" /> {l('Allied', '已结盟')} {cubeIcon} (+1★)
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (isEligible) {
                    return (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => onInitiateDiplomacy?.(other.id)}
                        className="w-full flex items-center justify-between px-2 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/70 text-indigo-200 hover:text-white text-[10.5px] font-medium transition cursor-pointer shadow-sm shadow-indigo-950/50 group"
                        title={l(
                          `Click to exchange Ambassadors with ${other.name} (${other.faction.name}) • +1 VP each`,
                          `点击与 ${other.name} (${otherFactionName}) 交换大使 • 双方各 +1 VP`
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: other.color }}
                          />
                          <span className="font-bold text-slate-100 truncate">{other.name}</span>
                          <span className="text-[9px] text-indigo-300/80 truncate">({otherFactionName})</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors">
                          <Handshake className="w-2.5 h-2.5" /> {l('Exchange', '交换')}
                        </span>
                      </button>
                    );
                  }

                  const isOtherTraitor = other.id === traitorPlayerId;
                  const otherTraitorPenalty = other.faction.id === 'rho_indi_syndicate' ? 0 : -2;
                  return (
                    <div
                      key={other.id}
                      className={`flex items-center justify-between px-2 py-1 rounded border text-[10.5px] cursor-not-allowed ${
                        isOtherTraitor
                          ? 'bg-rose-950/40 border-rose-800/70 text-rose-200 opacity-90'
                          : 'bg-slate-950/40 border-slate-900/60 text-slate-600 opacity-60'
                      }`}
                      title={check.reason || l('Not eligible for diplomacy', '暂不可外交')}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOtherTraitor ? 'opacity-80' : 'opacity-30'}`}
                          style={{ backgroundColor: other.color }}
                        />
                        <span className="truncate">{other.name}</span>
                        <span className={`text-[9px] truncate ${isOtherTraitor ? 'text-rose-300/80' : 'text-slate-700'}`}>({otherFactionName})</span>
                      </div>
                      {isOtherTraitor ? (
                        <span className="text-[9px] font-bold text-rose-300 shrink-0 font-mono">
                          {l(`🗡️ Traitor (${otherTraitorPenalty})`, `🗡️ 背叛者 (${otherTraitorPenalty})`)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 truncate max-w-[130px] font-mono">
                          {check.reason ? (check.reason.length > 22 ? `${check.reason.slice(0, 20)}…` : check.reason) : l('Ineligible', '不可交换')}
                        </span>
                      )}
                    </div>
                  );
                })}

            {/* 3. Minor Species Expansion Contacts Button / Status */}
            {hasMinorSpeciesExpansion && (
              <div className="pt-1.5 border-t border-slate-800/80 mt-1 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-xs">🌿</span>
                  <span>{l('Minor Species:', '次要物种:')}</span>
                  <span className="text-emerald-300 font-bold font-mono">
                    {minorSpeciesSupply?.length ?? 0} {l('in Galaxy', '在银河中')}
                  </span>
                </div>
                {onOpenMinorSpecies && (
                  <button
                    type="button"
                    onClick={onOpenMinorSpecies}
                    className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 hover:text-white text-[9.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title={l('Open Minor Species window to view abilities or form diplomatic relations', '打开次要物种窗口查看能力或建立外交关系')}
                  >
                    <span>{l('View & Ally', '查看与结盟')}</span>
                    <span className="text-[10px]">➔</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Upkeep Forecast Strip */}
      <div
        onClick={onOpenPhysicalBoard}
        className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg p-1.5 transition-all cursor-pointer group mb-2"
        title={l('Click to view full Physical Board & Upkeep Forecaster (P)', '点击查看完整实体面板与维护费预测 (P)')}
      >
        <div className="flex items-center justify-between text-[9.5px] font-semibold text-slate-400 mb-1">
          <span className="flex items-center gap-1 text-amber-400 group-hover:text-amber-300">
            <Zap className="w-2.5 h-2.5 text-amber-400" /> {l('Upkeep Forecast', '维护费预测')}
          </span>
          <span className="text-[8.5px] text-cyan-400 font-mono group-hover:underline">
            {l('Board (P) →', '实体面板 (P) →')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10.5px] font-mono">
          <div className="bg-slate-900/90 rounded px-1.5 py-0.5 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[9px]">{l('+1 Act:', '+1 行动:')}</span>
            <span className="font-bold text-amber-300">
              -{forecast.after1Action.upkeep}{' '}
              <span className="text-[8.5px] text-rose-400">(+{forecast.after1Action.costIncrease})</span>
            </span>
          </div>
          <div className="bg-slate-900/90 rounded px-1.5 py-0.5 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[9px]">{l('+2 Act:', '+2 行动:')}</span>
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
              {language === 'zh' ? (
                <>
                  <Rocket className="w-3 h-3" /> 现役舰队 ({totalShipsDeployed})
                </>
              ) : (
                <>
                  <Rocket className="w-3 h-3" /> Fleet In Service ({totalShipsDeployed})
                </>
              )}
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
              {showFleet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          </button>
          {showFleet && (
            <div className={`p-2 pt-0 grid ${player.faction.id === 'the_exiles' ? 'grid-cols-5' : 'grid-cols-4'} gap-1 text-center font-mono`}>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800 flex flex-col items-center">
                <ShipTypeIcon shipType="interceptor" size={10} className="text-cyan-400 my-0.5" />
                <div className="text-[8px] text-slate-400 uppercase">{l('Int', '拦截')}</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.interceptor}/{SHIP_LIMITS.interceptor}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800 flex flex-col items-center">
                <ShipTypeIcon shipType="cruiser" size={10} className="text-cyan-400 my-0.5" />
                <div className="text-[8px] text-slate-400 uppercase">{l('Cru', '巡洋')}</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.cruiser}/{SHIP_LIMITS.cruiser}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800 flex flex-col items-center">
                <ShipTypeIcon shipType="dreadnought" size={10} className="text-cyan-400 my-0.5" />
                <div className="text-[8px] text-slate-400 uppercase">{l('Dre', '无畏')}</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.dreadnought}/{SHIP_LIMITS.dreadnought}
                </div>
              </div>
              <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800 flex flex-col items-center">
                <ShipTypeIcon shipType="starbase" size={10} className="text-cyan-400 my-0.5" />
                <div className="text-[8px] text-slate-400 uppercase">{l('Sta', '星基')}</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {deployed.starbase}/{SHIP_LIMITS.starbase}
                </div>
              </div>
              {player.faction.id === 'the_exiles' && (
                <div className="bg-slate-900/90 rounded py-0.5 px-1 border border-slate-800 flex flex-col items-center">
                  <ShipTypeIcon shipType="orbital" size={10} className="text-cyan-400 my-0.5" />
                  <div className="text-[8px] text-slate-400 uppercase">{l('Orb', '轨道')}</div>
                  <div className="text-[10px] font-bold text-cyan-300">
                    {deployed.orbital}/{SHIP_LIMITS.orbital}
                  </div>
                </div>
              )}

              {delayedBlackHoleShips && delayedBlackHoleShips.filter((s) => s.ownerId === player.id).length > 0 && (
                <div className={`${player.faction.id === 'the_exiles' ? 'col-span-5' : 'col-span-4'} mt-1 p-1 rounded bg-indigo-950/60 border border-indigo-700/50 text-[9px] text-indigo-200 text-left flex items-center justify-between`}>
                  <span className="flex items-center gap-1 font-sans font-semibold">
                    <span>🌀</span> {l('In Black Hole:', '黑洞滞留:')}
                  </span>
                  <span className="font-mono font-bold">
                    {delayedBlackHoleShips
                      .filter((s) => s.ownerId === player.id)
                      .map((s) => `${language === 'zh' ? translateShipType(s.shipType, language) : s.shipType.slice(0, 3).toUpperCase()} (R${s.returnRound})`)
                      .join(', ')}
                  </span>
                </div>
              )}
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
                <Cpu className="w-3 h-3" /> {l('Researched Techs', '已研发科技')} ({player.techTrack.researched.length})
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500">
                {showTech ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </button>
            {showTech && (
              <div className="p-2 pt-0 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {player.techTrack.researched.map((tech) => {
                  const techName = translateTechName(tech.id, tech.name, language);
                  const techDesc = translateTechDesc(tech.id, tech.description, language);
                  const techCat = translateTechCategory(tech.category, language);
                  return (
                    <span
                      key={tech.id}
                      title={l(
                        `${tech.name} (${tech.category.toUpperCase()} Tech)\n\n${tech.description}\nBase Cost: ${tech.baseCost} Science${tech.victoryPoints ? ` • +${tech.victoryPoints} VP` : ''}`,
                        `${techName}（${techCat}科技）\n\n${techDesc}\n基础花费：${tech.baseCost} 科研${tech.victoryPoints ? ` • +${tech.victoryPoints} VP` : ''}`
                      )}
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border cursor-help transition-all hover:scale-105 ${
                        tech.category === 'military'
                          ? 'bg-rose-950/50 border-rose-800/60 text-rose-300 hover:border-rose-500'
                          : tech.category === 'grid'
                          ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:border-emerald-500'
                          : tech.category === 'nano'
                          ? 'bg-sky-950/50 border-sky-800/60 text-sky-300 hover:border-sky-500'
                          : 'bg-purple-950/50 border-purple-800/60 text-purple-300 hover:border-purple-500'
                      }`}
                    >
                      {techName}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Kept Discoveries Badge */}
        {((player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0) ||
          (player.unlockedAncientParts && player.unlockedAncientParts.length > 0)) && (
          <div
            className="px-2 py-1 bg-amber-950/30 border border-amber-800/40 rounded-lg flex flex-col gap-0.5 text-[9.5px]"
            title={player.keptDiscoveryTiles?.map((t) => `${t.name} (+2 VP)`).join('\n')}
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                ★ {l('Kept Discoveries', '保留探索板块')} ({player.keptDiscoveryTiles?.length || 0})
              </span>
              <span className="text-amber-300 font-bold font-mono">
                +{((player.keptDiscoveryTiles?.length || 0) * 2)} VP
              </span>
            </div>
            {player.keptDiscoveryTiles && player.keptDiscoveryTiles.length > 0 && (
              <div className="text-[8.5px] text-amber-200/70 truncate">
                {player.keptDiscoveryTiles.map((t) => t.name).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
