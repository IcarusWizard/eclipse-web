import React from 'react';
import { SectorTile, SectorShip, HexEdge } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';

export const EDGE_NAMES: Record<HexEdge, string> = {
  0: '0-E',
  1: '1-SE',
  2: '2-SW',
  3: '3-W',
  4: '4-NW',
  5: '5-NE',
};

export function getSubsectorEdgesDescription(subIdx: 1 | 2 | 3, rotation: number = 0): string {
  const rot = ((rotation % 6) + 6) % 6;
  const baseEdges: Record<1 | 2 | 3, [HexEdge, HexEdge]> = {
    1: [4, 5],
    2: [2, 3],
    3: [0, 1],
  };
  const [eA, eB] = baseEdges[subIdx];
  const boardEdgeA = ((eA + rot) % 6) as HexEdge;
  const boardEdgeB = ((eB + rot) % 6) as HexEdge;
  return `Edges ${EDGE_NAMES[boardEdgeA]} & ${EDGE_NAMES[boardEdgeB]}`;
}
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import { getPlayerDisplayName } from '../../engine/rules/gameReducer';
import { ShipTypeIcon, shouldShowShipTypeIcon } from '../common/ShipTypeIcon';
import {
  Rocket,
  Shield,
  Zap,
  Crosshair,
  Award,
  CircleDot,
  X,
  Coins,
  FlaskConical,
  Hammer,
  AlertTriangle,
  Radio,
  Sparkles,
  Layers,
  Lock,
  Check,
  Globe,
  RotateCcw,
  Info,
} from 'lucide-react';

import {
  NeutralShipConfig,
  NeutralShipType,
  getNeutralShipBlueprint,
  getNeutralShipSummary,
} from '../../engine/rules/neutralShips';
import { NeutralShipBlueprintLayout } from '../blueprints/NeutralShipBlueprintLayout';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateNeutralBlueprintSummary,
  translateResourceType,
  translateShipType,
  translateTechName,
} from '../../i18n/catalogTranslations';

interface SectorInspectorProps {
  sector: SectorTile;
  players: PlayerState[];
  activePlayer: PlayerState;
  neutralShipBlueprints?: Partial<NeutralShipConfig>;
  onColonizePlanet?: (
    sectorId: string,
    planetIndex: number,
    chosenResource?: 'money' | 'science' | 'material'
  ) => void;
  onAbandonInfluence?: (sectorId: string) => void;
  onClose: () => void;
  pendingBankruptcy?: { playerId: string; deficit: number } | null;
  stagedAbandonedSectorIds?: string[];
  onToggleAbandonSector?: (sectorId: string) => void;
  onActivatePulsar?: (sectorId: string) => void;
  isPulsarActivatedThisRound?: boolean;
  currentRound?: number;
  blackHoleDelayedShips?: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip[];
  onReturnBlackHoleShip?: (ship: import('../../engine/rules/galacticEvents').BlackHoleDelayedShip) => void;
}

export const SectorInspector: React.FC<SectorInspectorProps> = ({
  sector,
  players,
  activePlayer,
  neutralShipBlueprints,
  onColonizePlanet,
  onAbandonInfluence,
  onClose,
  pendingBankruptcy,
  stagedAbandonedSectorIds = [],
  onToggleAbandonSector,
  onActivatePulsar,
  isPulsarActivatedThisRound = false,
  currentRound,
  blackHoleDelayedShips = [],
  onReturnBlackHoleShip,
}) => {
  const { language, l } = useLanguage();
  const isStagedForAbandonment = stagedAbandonedSectorIds.includes(sector.id);
  const discOwner = players.find((p) => p.id === sector.discOwner);
  const isCenter = sector.sectorNumber === 1;

  const isNebula = Boolean(sector.isNebula || sector.sectorNumber === 295 || sector.sectorNumber === 395);
  const isPulsar = Boolean(sector.isPulsar || sector.sectorNumber === 393 || sector.sectorNumber === 394);
  const isBlackHole = Boolean(sector.isBlackHole || sector.sectorNumber === 396 || sector.sectorNumber === 399);
  const isSupernova = Boolean(sector.isSupernova || sector.sectorNumber === 397 || sector.sectorNumber === 398);

  // Group ships by owner
  const shipsByOwner = new Map<string, SectorShip[]>();
  for (const ship of sector.ships) {
    const list = shipsByOwner.get(ship.ownerId) || [];
    list.push(ship);
    shipsByOwner.set(ship.ownerId, list);
  }

  const isDraco = activePlayer?.faction?.id === 'descendants_of_draco';
  const hasHostiles = sector.isNebula
    ? ([1, 2, 3] as const).some((sub) => {
        const shipsInSub = sector.ships.filter((s) => (s.subsector || 1) === sub);
        const playerInSub = shipsInSub.some((s) => s.ownerId === activePlayer.id);
        const hostilesInSub = shipsInSub.filter((s) => {
          if (s.ownerId === activePlayer.id) return false;
          if (s.ownerId === 'ancient') return !isDraco;
          return true;
        });
        return playerInSub && hostilesInSub.length > 0;
      })
    : (
        shipsByOwner.size > 1 ||
        (!isDraco && (sector.ancientsCount > 0 || sector.ships.some((s) => s.ownerId === 'ancient'))) ||
        sector.ships.some((s) => s.ownerId === 'gcds' || s.ownerId === 'guardian')
      );

  const hasFriendlyShips = sector.ships.some((s) => s.ownerId === activePlayer.id);
  const isBankruptcyActive = Boolean(
    pendingBankruptcy && pendingBankruptcy.playerId === activePlayer.id
  );
  const canAbandonControl =
    sector.discOwner === activePlayer.id &&
    Boolean(onAbandonInfluence);

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl w-84 sm:w-96 shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[82vh] font-sans">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100 font-display">
                {sector.name ? sector.name.toUpperCase() : l(`SECTOR ${sector.sectorNumber}`, `星区 ${sector.sectorNumber}`)}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                {l('SEC', '星区')} {sector.sectorNumber}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {l(
                `${isCenter ? 'Galactic Center' : `Ring ${sector.ring} Orbit`} • Coord: (${sector.coord.q}, ${sector.coord.r}) • ${sector.victoryPoints + (sector.structures?.monolith ? 3 : 0)} Victory Points${sector.structures?.monolith ? ` (${sector.victoryPoints} Base + 3 Monolith)` : ''}`,
                `${isCenter ? '银河中心' : `第 ${sector.ring} 环轨道`} • 坐标: (${sector.coord.q}, ${sector.coord.r}) • ${sector.victoryPoints + (sector.structures?.monolith ? 3 : 0)} VP${sector.structures?.monolith ? ` (${sector.victoryPoints} 基础 + 3 巨石柱)` : ''}`
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          title={l('Close Sector Inspector', '关闭星区详情')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto text-xs">
        {/* Sector Control Status */}
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold">{l('Sector Control:', '星区控制权:')}</span>
            {discOwner ? (
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className="w-3 h-3 rounded-full ring-2 ring-white/30"
                  style={{ backgroundColor: discOwner.color }}
                />
                <span className="text-slate-100">{getPlayerDisplayName(discOwner)}</span>
              </div>
            ) : isNebula || isBlackHole ? (
              <span className="text-slate-400 font-medium italic">{l('Spacetime Anomaly (No Influence Disc)', '时空异常区（无影响力圆片）')}</span>
            ) : (
              <span className="text-slate-400 font-medium italic">{l('Unclaimed / Neutral', '未占领 / 中立')}</span>
            )}
          </div>

          {isBankruptcyActive && sector.discOwner === activePlayer.id && (onToggleAbandonSector || onAbandonInfluence) && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (onToggleAbandonSector) {
                    onToggleAbandonSector(sector.id);
                  } else if (onAbandonInfluence) {
                    onAbandonInfluence(sector.id);
                  }
                }}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  isStagedForAbandonment
                    ? 'bg-rose-900/70 hover:bg-rose-800 text-white border-rose-500 shadow-md ring-1 ring-rose-500/50'
                    : 'bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border-slate-700 hover:border-rose-700'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${isStagedForAbandonment ? 'text-white' : 'text-rose-400'}`} />
                <span>
                  {isStagedForAbandonment
                    ? l('Staged for Abandonment (Click to Keep Sector)', '已选为待放弃（点击保留星区）')
                    : l('Stage Sector for Abandonment', '标记为放弃该星区')}
                </span>
              </button>
            </div>
          )}
          {!isBankruptcyActive && sector.discOwner === activePlayer.id && onAbandonInfluence && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onAbandonInfluence(sector.id)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>{l('Retrieve Influence Disc (Influence Action)', '收回影响力圆片（影响行动）')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Supernova Sector Alert & Rules */}
        {isSupernova && (
          <div
            data-testid="sector-rules-supernova"
            className={`p-3 rounded-xl border space-y-2 ${
              sector.isSupernovaExploded
                ? 'bg-red-950/70 border-red-700/80 shadow-inner'
                : 'bg-amber-950/40 border-amber-600/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 text-xs ${sector.isSupernovaExploded ? 'text-red-400' : 'text-amber-300'}`}>
                <AlertTriangle className={`w-3.5 h-3.5 ${sector.isSupernovaExploded ? 'text-red-400' : 'text-amber-400'}`} />
                {sector.isSupernovaExploded
                  ? l('Supernova Collapsed Void', '超新星坍缩虚空')
                  : l(`Supernova Sector (${sector.name || 'Unstable Star'})`, `超新星星区 (${sector.name || '不稳定恒星'})`)}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border uppercase ${
                sector.isSupernovaExploded
                  ? 'bg-red-900/60 text-red-200 border-red-600'
                  : 'bg-amber-900/60 text-amber-200 border-amber-600'
              }`}>
                {sector.isSupernovaExploded ? l('Collapsed', '已坍缩') : l('Cleanup Check', '清理阶段检定')}
              </span>
            </div>

            {sector.isSupernovaExploded ? (
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <p>
                  {l(
                    'This star went supernova and collapsed into empty space. All planets, population slots, and wormholes have been completely obliterated.',
                    '这颗恒星已爆发超新星并坍缩为空白空间。所有星球、人口格及虫洞连接均已被摧毁。'
                  )}
                </p>
                <div className="text-[10px] text-red-300 font-mono">
                  {l('Traversal: Only ships equipped with a Wormhole Generator can enter this empty void.', '通行限制：只有装备虫洞发生器的飞船可进入此空域。')}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{l('Supernova Rules (Galactic Events)', '超新星规则（银河事件）')}</span>
                </div>
                <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                  <li>
                    <strong className="text-slate-100">{l('Rich Planetary Resources:', '富饶星球资源:')}</strong>{' '}
                    {l('Contains 5 rich resource squares (1 Adv Money, 1 Adv Material, 1 Science, 2 Wild/Any).', '包含 5 个富饶资源格（1 高级信用点、1 高级材料、1 科研、2 任意资源）。')}
                  </li>
                  <li>
                    <strong className="text-slate-100">{l('Cleanup Instability Check:', '清理阶段不稳定检定:')}</strong>{' '}
                    {language === 'zh' ? (
                      <>
                        每轮清理阶段需为超新星投掷不稳定检定：<span className="text-amber-300 font-mono font-bold">2 颗黄骰 + 单条科技轨道最高科技数</span>。
                      </>
                    ) : (
                      <>
                        In the Cleanup Phase of each round, an Instability Check must be rolled for the Supernova: <span className="text-amber-300 font-mono font-bold">2 Yellow Dice + highest single tech track count</span>.
                      </>
                    )}
                  </li>
                  <li>
                    <strong className="text-slate-100">{l('Explosion Condition:', '爆发条件:')}</strong>{' '}
                    {language === 'zh' ? (
                      <>
                        若总和严格小于当前轮数（<span className="text-amber-300 font-mono font-bold">总和 &lt; 当前轮数</span>），恒星立即爆发！
                      </>
                    ) : (
                      <>
                        If the total sum is strictly less than the current round number (<span className="text-amber-300 font-mono font-bold">Sum &lt; Round</span>), the star explodes!
                      </>
                    )}
                  </li>
                  <li>
                    <strong className="text-slate-100">{l('Catastrophic Explosion:', '毁灭性爆发:')}</strong>{' '}
                    {l(
                      'When it explodes, all ships, structures (orbitals/monoliths), population cubes, and influence discs in the sector are destroyed and returned to supply (cubes to graveyard). The sector turns into an empty void with no wormholes (accessible only via Wormhole Generator).',
                      '爆发时，该星区内的所有飞船、建筑（轨道站/巨石柱）、人口方块及影响力圆片全部被摧毁并放回供应区（方块进入坟场）。该星区变为无虫洞的虚空（仅可通过虫洞发生器进入）。'
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Galactic Events: Nebula Subsectors Breakdown & Rules */}
        {isNebula && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {l('Nebula Sector (3 Subsectors)', '星云星区（3 个子星区）')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-mono font-bold border border-emerald-600 uppercase">
                {l('Internal Wormholes', '内部虫洞')}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1.5">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">{l('Subsector 1', '子星区 1')}</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(1, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.subsectors ? (
                      sector.subsectors[0]?.discoveryTile ? (
                        <span className="text-amber-300 font-semibold">{l('❓ Discovery Tile Present', '❓ 存在探索板块')}</span>
                      ) : (
                        <span className="text-slate-500 italic">{l('Discovery Tile Claimed', '探索板块已被拿取')}</span>
                      )
                    ) : (
                      <span className="text-amber-300 font-semibold">{l('❓ Discovery Tile Present', '❓ 存在探索板块')}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => (s.subsector || 1) === 1).length} {l('ship(s)', '艘飞船')}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">{l('Subsector 2', '子星区 2')}</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(2, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.subsectors ? (
                      sector.subsectors[1]?.discoveryTile ? (
                        <span className="text-amber-300 font-semibold">{l('❓ Discovery Tile Present', '❓ 存在探索板块')}</span>
                      ) : (
                        <span className="text-slate-500 italic">{l('Discovery Tile Claimed', '探索板块已被拿取')}</span>
                      )
                    ) : (
                      <span className="text-amber-300 font-semibold">{l('❓ Discovery Tile Present', '❓ 存在探索板块')}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => s.subsector === 2).length} {l('ship(s)', '艘飞船')}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-mono font-bold">{l('Subsector 3', '子星区 3')}</span>
                    <span className="text-[10px] text-slate-400">({getSubsectorEdgesDescription(3, sector.rotation)})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {sector.ships.some((s) => s.ownerId === 'ancient' && (s.subsector === 3 || !s.subsector)) ? (
                      <span className="text-rose-400 font-semibold">{l('👾 Ancient Ship Stationed', '👾 远古巡洋舰驻守')}</span>
                    ) : (
                      <span className="text-slate-500 italic">{l('Ancient Defeated', '远古舰已被击败')}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {sector.ships.filter((s) => s.subsector === 3).length} {l('ship(s)', '艘飞船')}
                </span>
              </div>
            </div>

            {/* Dedicated Nebula Rules Card */}
            <div data-testid="sector-rules-nebula" className="pt-2 border-t border-emerald-800/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{l('Nebula Rules (Galactic Events)', '星云规则（银河事件）')}</span>
              </div>
              <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                <li><strong className="text-slate-100">{l('No Influence Space:', '无影响力空位:')}</strong> {l('Cannot place an Influence Disc (cannot be claimed by any player; no upkeep cost).', '不能放置影响力圆片（无法被任何玩家控制，也无维护费）。')}</li>
                <li><strong className="text-slate-100">{l('Subsector Entry:', '进入子星区:')}</strong> {language === 'zh' ? (
                  <>进入的飞船根据入口边缘落在对应子星区：子星区 1 ({getSubsectorEdgesDescription(1, sector.rotation)})、子星区 2 ({getSubsectorEdgesDescription(2, sector.rotation)}) 或子星区 3 ({getSubsectorEdgesDescription(3, sector.rotation)})。</>
                ) : (
                  <>Incoming ships land in the subsector matching their entry edge: Subsector 1 ({getSubsectorEdgesDescription(1, sector.rotation)}), Subsector 2 ({getSubsectorEdgesDescription(2, sector.rotation)}), or Subsector 3 ({getSubsectorEdgesDescription(3, sector.rotation)}).</>
                )}</li>
                <li><strong className="text-slate-100">{l('Internal Movement:', '内部移动:')}</strong> {l('Moving between subsectors costs 1 Movement Point (MP) along internal wormholes.', '在子星区之间沿内部虫洞移动每次消耗 1 移动力 (MP)。')}</li>
                <li><strong className="text-slate-100">{l('Localized Pinning:', '局部牵制:')}</strong> {l('Pinning is resolved strictly within each subsector. Ships in other subsectors do not pin you.', '牵制仅在各自子星区内部判定。其他子星区的飞船不会牵制你。')}</li>
                <li><strong className="text-slate-100">{l('Combat & Discoveries:', '战斗与探索:')}</strong> {l('Combat resolves per subsector during the Combat Phase. Subsector 3 harbors an Ancient ship; Subsectors 1 & 2 each contain 1 Discovery Tile, claimed after all combat in that subsector concludes.', '战斗阶段按子星区分开结算。子星区 3 有一艘远古舰；子星区 1 和 2 各含 1 枚探索板块，在该子星区战斗全部结束后领取。')}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Hostile Contest Alert */}
        {hasHostiles && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-rose-300 font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{l('Contested Sector! Combat will resolve during Combat Phase.', '交战星区！战斗将在战斗阶段结算。')}</span>
          </div>
        )}

        {/* Fleet Deployment Roster */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-cyan-400" />
              {l(
                `Stationed Fleets (${sector.ships.length} ${sector.ships.length === 1 ? 'Ship' : 'Ships'})`,
                `驻守舰队（共 ${sector.ships.length} 艘）`
              )}
            </h4>
          </div>

          {sector.ships.length === 0 ? (
            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl text-center text-slate-500 text-[11px] italic">
              {l('No ships currently stationed in this sector.', '该星区当前无驻守飞船。')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from(shipsByOwner.entries()).map(([ownerId, ships]) => {
                let ownerName = l('Unknown Commander', '未知指挥官');
                let ownerColor = '#38bdf8';
                let isNpc = false;

                if (ownerId === 'ancient') {
                  ownerName = l('Ancient Defenders', '远古防卫者');
                  ownerColor = '#f43f5e';
                  isNpc = true;
                } else if (ownerId === 'gcds') {
                  ownerName = l('Galactic Center Defense System', '银河中心防御系统 (GCDS)');
                  ownerColor = '#fb7185';
                  isNpc = true;
                } else if (ownerId === 'guardian') {
                  ownerName = l('Guardian Drone', '守护者无人机');
                  ownerColor = '#ec4899';
                  isNpc = true;
                } else {
                  const pl = players.find((p) => p.id === ownerId);
                  if (pl) {
                    ownerName = pl.name;
                    ownerColor = pl.color;
                  }
                }

                // Tally ship types
                const shipsByType: Record<string, SectorShip[]> = {};
                for (const s of ships) {
                  shipsByType[s.type] = shipsByType[s.type] || [];
                  shipsByType[s.type]!.push(s);
                }

                return (
                  <div
                    key={ownerId}
                    className="p-2.5 rounded-xl border bg-slate-900/60"
                    style={{ borderColor: `${ownerColor}60` }}
                  >
                    {/* Owner Subheading */}
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-white/40"
                          style={{ backgroundColor: ownerColor }}
                        />
                        <span className="text-slate-200">{ownerName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {l(
                          `${ships.length} ${ships.length === 1 ? 'Ship' : 'Ships'}`,
                          `${ships.length} 艘飞船`
                        )}
                      </span>
                    </div>

                    {/* Ship Cards */}
                    <div className="space-y-1.5">
                      {Object.entries(shipsByType).map(([type, typeShips]) => {
                        const firstShip = typeShips[0]!;
                        const pl = players.find((p) => p.id === ownerId);
                        const bp = pl ? pl.blueprints[type] : null;
                        const stats = bp ? calculateBlueprintStats(bp) : null;

                        const isNpcBlueprint = isNpc && (type === 'ancient' || type === 'guardian' || type === 'gcds');
                        const npcVariant = neutralShipBlueprints?.[type as NeutralShipType] || 'standard';
                        const npcBp = isNpcBlueprint
                          ? getNeutralShipBlueprint(
                              type as NeutralShipType,
                              neutralShipBlueprints?.[type as NeutralShipType]
                            )
                          : null;

                        return (
                          <div
                            key={type}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-extrabold text-[11px] text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                                  {shouldShowShipTypeIcon(type, pl?.faction.id) && (
                                    <ShipTypeIcon
                                      shipType={type}
                                      factionId={pl?.faction.id}
                                      size={13}
                                      className="text-cyan-400"
                                    />
                                  )}
                                  <span className="font-mono text-cyan-400 font-bold">
                                    {typeShips.length}×
                                  </span>
                                  <span>{translateShipType(type, language)}</span>
                                  {typeShips.some((s) => s.damage > 0) && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                                      {l('Damaged', '受损')}
                                    </span>
                                  )}
                                  {sector.isNebula && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                                      {l('Sub', '子区')} {Array.from(new Set(typeShips.map((s) => s.subsector || 1))).sort().join(', ')}
                                    </span>
                                  )}
                                </div>

                                {/* Stats / Weapons Preview */}
                                {stats ? (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                    <span>{l('Hull:', '耐久:')} {stats.totalHull}</span>
                                    <span>• {l('Speed:', '航速:')} {stats.totalDriveSpeed}</span>
                                    <span>• {l('Init:', '先攻:')} {stats.totalInitiative}</span>
                                    {stats.computerBonus > 0 && <span>• +{stats.computerBonus} {l('COMP', '电脑')}</span>}
                                    {stats.shieldBonus > 0 && <span>• -{stats.shieldBonus} {l('Shield', '护盾')}</span>}
                                  </div>
                                ) : isNpcBlueprint ? (
                                  <div className={`text-[10px] font-mono mt-0.5 ${type === 'guardian' ? 'text-pink-300/80' : 'text-rose-300/80'}`}>
                                    {neutralShipBlueprints?.[type as NeutralShipType] === 'advanced' && (
                                      <span className="text-amber-400 font-bold mr-1.5">{l('[Advanced]', '[进阶]')}</span>
                                    )}
                                    {neutralShipBlueprints?.[type as NeutralShipType] === 'expert' && (
                                      <span className="text-rose-400 font-bold mr-1.5">{l('[Remnants]', '[遗迹/残骸]')}</span>
                                    )}
                                    {language === 'zh' && npcBp
                                      ? translateNeutralBlueprintSummary(npcBp, language)
                                      : getNeutralShipSummary(type as NeutralShipType, neutralShipBlueprints?.[type as NeutralShipType])}
                                  </div>
                                ) : null}
                              </div>

                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
                                style={{
                                  backgroundColor: `${ownerColor}20`,
                                  color: ownerColor,
                                  borderColor: `${ownerColor}60`,
                                  borderWidth: '1px',
                                }}
                              >
                                {translateShipType(type, language)}
                              </span>
                            </div>

                            {/* Square-Box Blueprint View for NPCs */}
                            {npcBp && (
                              <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800/80 flex items-center justify-center">
                                <NeutralShipBlueprintLayout blueprint={npcBp} size="sm" />
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
          )}
        </div>

        {/* Planetary Colonies Grid */}
        {!sector.isSupernovaExploded && (
          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              {l(`Planetary Population Squares (${sector.planets.length})`, `星球人口方格 (${sector.planets.length})`)}
            </h4>

          {sector.planets.length === 0 ? (
            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl text-center text-slate-500 text-[11px] italic">
              {l('No habitable planet squares in this sector.', '此星区无宜居星球方格。')}
            </div>
          ) : (
            <div className="space-y-2">
              {sector.planets.map((planet, pIdx) => {
                const colonizer = players.find((p) => p.id === planet.colonizedBy);

                const hasAdvancedEconomy = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_economy' || t.id === 'metasynthesis'
                );
                const hasAdvancedLabs = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_labs' || t.id === 'metasynthesis'
                );
                const hasAdvancedMining = activePlayer.techTrack.researched.some(
                  (t) => t.id === 'advanced_mining' || t.id === 'metasynthesis'
                );

                const isWild = planet.resource === 'any';
                const isOrb = !!planet.isOrbital;

                const reqTechName = isWild
                  ? l('Adv Economy / Labs / Mining', '进阶经济 / 实验室 / 采矿')
                  : planet.resource === 'money'
                  ? translateTechName('advanced_economy', 'Advanced Economy', language)
                  : planet.resource === 'science'
                  ? translateTechName('advanced_labs', 'Advanced Labs', language)
                  : translateTechName('advanced_mining', 'Advanced Mining', language);

                const hasRequiredTech =
                  !planet.isAdvanced ||
                  (isWild
                    ? hasAdvancedEconomy || hasAdvancedLabs || hasAdvancedMining
                    : planet.resource === 'money'
                    ? hasAdvancedEconomy
                    : planet.resource === 'science'
                    ? hasAdvancedLabs
                    : planet.resource === 'material'
                    ? hasAdvancedMining
                    : true);

                const canColonize =
                  !planet.colonizedBy &&
                  sector.discOwner === activePlayer.id &&
                  activePlayer.colonyShips.ready > 0;

                const resourceTheme = isOrb
                  ? {
                      name: l('Orbital Habitat (Money or Science)', '轨道站栖息地（信用点或科研）'),
                      badge: 'bg-cyan-500 text-slate-950 font-extrabold',
                      border: 'border-cyan-500/40 bg-cyan-950/15',
                      text: 'text-cyan-300',
                      icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
                    }
                  : isWild
                  ? planet.isAdvanced
                    ? {
                        name: l('★ Advanced Wild Habitat', '★ 进阶任意资源栖息地'),
                        badge: 'bg-white text-slate-950 font-black',
                        border: 'border-white/80 bg-slate-900/60 ring-1 ring-white/50',
                        text: 'text-white font-bold',
                        icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
                      }
                    : {
                        name: l('Standard Wild Habitat (Any Resource)', '标准任意资源栖息地'),
                        badge: 'bg-slate-300 text-slate-950 font-extrabold',
                        border: 'border-slate-500/40 bg-slate-900/40',
                        text: 'text-slate-200',
                        icon: <Globe className="w-3.5 h-3.5 text-slate-300" />,
                      }
                  : planet.resource === 'money'
                  ? {
                      name: l('Money (Economy)', '信用点（经济）'),
                      badge: 'bg-yellow-400 text-slate-950 font-extrabold',
                      border: 'border-yellow-500/40 bg-yellow-950/15',
                      text: 'text-yellow-300',
                      icon: <Coins className="w-3.5 h-3.5 text-yellow-400" />,
                    }
                  : planet.resource === 'science'
                  ? {
                      name: l('Science (Research)', '科研（研发）'),
                      badge: 'bg-pink-500 text-white font-bold',
                      border: 'border-pink-500/40 bg-pink-950/15',
                      text: 'text-pink-300',
                      icon: <FlaskConical className="w-3.5 h-3.5 text-pink-400" />,
                    }
                  : {
                      name: l('Materials (Production)', '材料（生产）'),
                      badge: 'bg-amber-900 text-amber-100 font-bold',
                      border: 'border-amber-700/40 bg-amber-950/20',
                      text: 'text-amber-400',
                      icon: <Hammer className="w-3.5 h-3.5 text-amber-500" />,
                    };

                return (
                  <div
                    key={planet.id || `planet-${pIdx}`}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${resourceTheme.border}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-900 border border-slate-800">
                        {resourceTheme.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={resourceTheme.text}>{resourceTheme.name}</span>
                          {planet.isAdvanced ? (
                            hasRequiredTech ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase font-mono flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-emerald-400" /> {l('Advanced', '进阶')}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 uppercase font-mono flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-rose-400" /> {l(`Need ${reqTechName}`, `需要 ${reqTechName}`)}
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 uppercase font-mono">
                              {isOrb ? l('Orbital', '轨道站') : isWild ? l('Wild', '任意') : l('Standard', '标准')}
                            </span>
                          )}
                        </div>

                        {colonizer ? (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{l('Colonized by', '殖民者:')}</span>
                            <span className="font-bold text-slate-200">{colonizer.name}</span>
                            <span
                              className="w-2 h-2 rounded-sm inline-block"
                              style={{ backgroundColor: colonizer.color }}
                            />
                            {planet.colonizedResource && (
                              <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-300 font-mono ml-1">
                                {translateResourceType(planet.colonizedResource, language)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            {planet.isAdvanced && !hasRequiredTech
                              ? l(`Requires ${reqTechName} tech`, `需要科技：${reqTechName}`)
                              : l('Uncolonized Square', '未殖民格位')}
                          </div>
                        )}
                      </div>
                    </div>

                    {canColonize && onColonizePlanet && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {isOrb ? (
                          <>
                            <button
                              disabled={activePlayer.population.money.cubesOnBoard <= 0}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'money')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow"
                              title={l('Colonize with Money Cube', '用信用点方块殖民')}
                            >
                              + {l('Money', '信用点')} ({activePlayer.population.money.cubesOnBoard})
                            </button>
                            <button
                              disabled={activePlayer.population.science.cubesOnBoard <= 0}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'science')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title={l('Colonize with Science Cube', '用科研方块殖民')}
                            >
                              + {l('Science', '科研')} ({activePlayer.population.science.cubesOnBoard})
                            </button>
                          </>
                        ) : isWild ? (
                          <>
                            <button
                              disabled={activePlayer.population.money.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedEconomy)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'money')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow"
                              title={l('Colonize with Money Cube', '用信用点方块殖民')}
                            >
                              + {l('Money', '信用点')}
                            </button>
                            <button
                              disabled={activePlayer.population.science.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedLabs)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'science')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title={l('Colonize with Science Cube', '用科研方块殖民')}
                            >
                              + {l('Science', '科研')}
                            </button>
                            <button
                              disabled={activePlayer.population.material.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedMining)}
                              onClick={() => onColonizePlanet(sector.id, pIdx, 'material')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white shadow"
                              title={l('Colonize with Material Cube', '用材料方块殖民')}
                            >
                              + {l('Material', '材料')}
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={!hasRequiredTech || activePlayer.population[planet.resource as 'money' | 'science' | 'material'].cubesOnBoard <= 0}
                            onClick={() => onColonizePlanet(sector.id, pIdx, planet.resource as any)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow transition-all font-sans"
                          >
                            {l('Colonize', '殖民')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Special Features & Structures */}
        {(isPulsar || isBlackHole || sector.hasArtifact || sector.hasDiscovery || sector.discoveryTile || sector.structures?.monolith || (sector.guardiansCount && sector.guardiansCount > 0)) && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {l('Special Features & Structures', '特殊地形与建筑')}
            </h4>

            {isPulsar && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-600/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {l(`Pulsar Anomaly (${sector.name || `Sector ${sector.sectorNumber}`})`, `脉冲星异常区 (${sector.name || `星区 ${sector.sectorNumber}`})`)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 font-mono font-bold border border-cyan-600 uppercase">
                    {l('Slot:', '槽位:')} {sector.pulsarSlot || 'move'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {sector.discOwner ? (
                    sector.discOwner === activePlayer.id ? (
                      isPulsarActivatedThisRound ? (
                        <span className="text-slate-400 italic">{l('Already activated this round.', '本轮已激活过。')}</span>
                      ) : (
                        <span className="text-emerald-300 font-medium">{l('Ready for free action activation this round!', '本轮可执行一次免费脉冲星行动！')}</span>
                      )
                    ) : (
                      <span className="text-slate-400">{l('Controlled by another commander.', '由其他指挥官控制。')}</span>
                    )
                  ) : (
                    <span className="text-slate-400">{l('Control this sector with an Influence Disc to shift the disc for free actions.', '用影响力圆片控制此星区即可每轮移动圆片触发免费行动。')}</span>
                  )}
                </div>
                {sector.discOwner === activePlayer.id && !isPulsarActivatedThisRound && !activePlayer.hasPassed && onActivatePulsar && (
                  <button
                    type="button"
                    onClick={() => onActivatePulsar(sector.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{l('Activate Pulsar (Shift Slot)', '激活脉冲星（切换行动格）')}</span>
                  </button>
                )}

                {/* Dedicated Pulsar Rules Card */}
                <div data-testid="sector-rules-pulsar" className="pt-2 border-t border-cyan-800/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{l('Pulsar Rules (Galactic Events)', '脉冲星规则（银河事件）')}</span>
                  </div>
                  <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                    <li><strong className="text-slate-100">{l('3 Action Spaces:', '3 个行动格:')}</strong> {language === 'zh' ? (<>以 <span className="text-cyan-300 font-semibold">移动</span>、<span className="text-cyan-300 font-semibold">建造</span>、<span className="text-cyan-300 font-semibold">升级</span> 3 个行动格取代常规影响力格。控制时圆片初始置于「移动」。</>) : (<>Replaces normal influence space with 3 Action Spaces: <span className="text-cyan-300 font-semibold">Move</span>, <span className="text-cyan-300 font-semibold">Build</span>, and <span className="text-cyan-300 font-semibold">Upgrade</span>. Influence Disc starts on Move upon control.</>)}</li>
                    <li><strong className="text-slate-100">{l('Free Action Shifting:', '免费切换行动:')}</strong> {l('Once per round on your turn during the Action Phase (in place of a normal action, before passing), shift your disc to a different slot to execute 1 activation:', '每轮行动阶段（在放弃前替代常规行动）可将圆片移至另一格执行 1 次激活：')}
                      <ul className="pl-4 space-y-0.5 list-disc list-inside text-cyan-200">
                        <li><strong className="text-slate-100">{l('Move:', '移动:')}</strong> {l('Move 1 ship up to its full drive speed.', '将 1 艘飞船移动至多相当于其引擎航速的距离。')}</li>
                        <li><strong className="text-slate-100">{l('Build:', '建造:')}</strong> {l('Build 1 ship or structure (paying normal material cost).', '建造 1 艘飞船或建筑（正常支付材料花费）。')}</li>
                        <li><strong className="text-slate-100">{l('Upgrade:', '升级:')}</strong> {l('Upgrade 1 ship blueprint (up to 2 ship parts).', '升级 1 种飞船蓝图（最多更换/安装 2 个部件）。')}</li>
                      </ul>
                    </li>
                    <li><strong className="text-slate-100">{l('Zero Upkeep Disc:', '零维护费圆片:')}</strong> {l('Shifts the disc already on the sector; does NOT place a disc from your player board track, saving discs and upkeep.', '仅移动星区上的现有圆片；不从个人面板拿取圆片，不增加维护费。')}</li>
                    <li><strong className="text-slate-100">{l('Pass Restriction:', '放弃限制:')}</strong> {l('Cannot be activated after passing for the round.', '本轮已放弃行动后不可激活。')}</li>
                  </ul>
                </div>
              </div>
            )}

            {isBlackHole && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-300 font-bold flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    {l(`Black Hole Anomaly (${sector.sectorNumber === 396 ? 'Cygnus X-1' : 'V616 Mon'})`, `黑洞异常区 (${sector.sectorNumber === 396 ? '天鹅座 X-1' : '麒麟座 V616'})`)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono font-bold border border-indigo-600">
                    {sector.sectorNumber === 396 ? l('Ring I Return', '第 I 环回归') : l('Empty Zone Return', '空白星区回归')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {blackHoleDelayedShips && blackHoleDelayedShips.length > 0 ? (
                    <div className="space-y-1.5 mt-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {l('Ships in Spacetime Anomaly:', '时空异常区中的飞船:')}
                      </div>
                      {blackHoleDelayedShips.map((ds) => {
                        const owner = players.find((p) => p.id === ds.ownerId);
                        const canReturn = currentRound !== undefined && currentRound >= ds.returnRound;
                        const isMine = ds.ownerId === activePlayer.id;
                        return (
                          <div
                            key={ds.shipId}
                            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: owner?.color || '#94a3b8' }} />
                                <span>{owner ? owner.name : ds.ownerId}</span>
                                <span className="text-indigo-300 uppercase font-mono">[{translateShipType(ds.shipType, language)}]</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {canReturn ? (
                                  <span className="text-emerald-400 font-bold">{l(`Emerging this round (Round ${ds.returnRound})!`, `本轮重返（第 ${ds.returnRound} 轮）！`)}</span>
                                ) : (
                                  <span>{l(`Returns in Round ${ds.returnRound} (${currentRound !== undefined ? ds.returnRound - currentRound : 1} round(s) left)`, `第 ${ds.returnRound} 轮返回（剩余 ${currentRound !== undefined ? ds.returnRound - currentRound : 1} 轮）`)}</span>
                                )}
                              </div>
                            </div>
                            {canReturn && isMine && onReturnBlackHoleShip && (
                              <button
                                type="button"
                                onClick={() => onReturnBlackHoleShip(ds)}
                                className="px-2.5 py-1 rounded-md bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-[11px] transition shadow cursor-pointer"
                              >
                                {l('Return Now', '立即返回')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">{l('No ships currently trapped in spacetime anomaly.', '当前没有飞船滞留在黑洞中。')}</span>
                  )}
                </div>

                {/* Dedicated Black Hole Rules Card */}
                <div data-testid="sector-rules-black-hole" className="pt-2 border-t border-indigo-800/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{l('Black Hole Rules (Galactic Events)', '黑洞规则（银河事件）')}</span>
                  </div>
                  <ul className="text-[10px] text-slate-300 space-y-1 list-disc list-inside leading-snug">
                    <li><strong className="text-slate-100">{l('Spacetime Anomaly:', '时空异常区:')}</strong> {l('Cannot place an Influence Disc (no influence space / 0 VP).', '不能放置影响力圆片（无影响力空位 / 0 VP）。')}</li>
                    <li><strong className="text-slate-100">{l('Discovery Tile:', '探索板块:')}</strong> {l('The first ship entering the Black Hole immediately claims the Discovery Tile.', '第一艘进入黑洞的飞船立即领取其探索板块。')}</li>
                    <li><strong className="text-slate-100">{l('Transit Duration (Yellow Die):', '跃迁延迟（黄骰）:')}</strong> {l('Ships end movement immediately and enter transit. Roll yellow die:', '飞船立即结束移动并进入时空跃迁，投掷 1 颗黄骰：')}
                      <ul className="pl-4 space-y-0.5 list-disc list-inside text-indigo-200">
                        <li><strong className="text-slate-100">{l('Star (1) or Blank (6):', '星标 (1) 或空白 (6):')}</strong> {l('Returns immediately this round, taking 1 damage.', '本轮立即返回并受到 1 点伤害。')}</li>
                        <li><strong className="text-slate-100">{l('2 or 3:', '2 或 3:')}</strong> {l('Trapped for 1 round (returns in Round + 1).', '滞留 1 轮（第 Round+1 轮返回）。')}</li>
                        <li><strong className="text-slate-100">{l('4 or 5:', '4 或 5:')}</strong> {l('Trapped for 2 rounds (returns in Round + 2).', '滞留 2 轮（第 Round+2 轮返回）。')}</li>
                      </ul>
                    </li>
                    <li><strong className="text-slate-100">{l('Return Location:', '返回位置:')}</strong> {sector.sectorNumber === 396 ? l('Sector 396 (Cygnus X-1) returns to any Ring I sector.', '星区 396（天鹅座 X-1）返回任意第 I 环星区。') : l('Sector 399 (V616 Mon) returns to any sector with a wormhole facing empty space/void.', '星区 399（麒麟座 V616）返回任意虫洞朝向空白太空的星区。')}</li>
                    <li><strong className="text-slate-100">{l('Return Decision:', '返回选择:')}</strong> {l("On the player's first turn of the return round, a side window prompts whether to return the ship now or postpone until next round.", '在返回轮次玩家的首个回合，侧边弹窗会询问立即返回飞船或推迟至下一轮。')}</li>
                  </ul>
                </div>
              </div>
            )}

            {sector.structures?.monolith && (
              <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between">
                <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {l('Ancient Monolith', '远古巨石柱')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 font-mono font-bold border border-indigo-600">
                  {l('+3 Victory Points', '+3 VP')}
                </span>
              </div>
            )}

            {Boolean(sector.guardiansCount && sector.guardiansCount > 0) && (
              <div className="p-2 rounded-lg bg-pink-950/40 border border-pink-700/60 flex items-center justify-between">
                <span className="text-pink-300 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-pink-400" />
                  {l(`Guardian Defender (Sector ${sector.sectorNumber})`, `守护者防卫舰 (星区 ${sector.sectorNumber})`)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-900/60 text-pink-200 font-mono font-bold border border-pink-600">
                  {l('3 Hull • 3 Ion Dice • 2 VP', '3 耐久 • 3 离子骰 • 2 VP')}
                </span>
              </div>
            )}

            {sector.hasArtifact && (
              <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center justify-between">
                <span className="text-sky-300 font-bold flex items-center gap-1.5">
                  <span className="font-mono text-xs text-sky-400 font-black">[A]</span>
                  {l('Planetary Artifact', '星球远古遗物')}
                </span>
                <span className="text-[10px] text-sky-400 font-mono">{l('Artifact Key Target (0 VP)', '遗物钥匙目标 (0 VP)')}</span>
              </div>
            )}

            {(sector.discoveryTile || (sector.hasDiscovery && !sector.discoveryClaimed)) && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50">
                {sector.discoveryClaimed && sector.discoveryTile ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-amber-300 font-bold text-xs">
                        ★ {sector.discoveryTile.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 font-mono border border-emerald-800">
                        {l('Claimed', '已领取')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sector.discoveryTile.description}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs font-mono shadow">
                        ★
                      </div>
                      <div>
                        <span className="text-amber-300 font-bold text-xs block">
                          {l('Face-Down Discovery Tile', '暗置探索板块')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {l('Hidden from all players until claimed by securing sector control.', '对所有玩家保密，直到控制该星区时方可翻开领取。')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 font-mono font-bold border border-amber-700/50">
                      {l('Unexplored', '未探索')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
