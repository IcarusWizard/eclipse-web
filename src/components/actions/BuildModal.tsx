import React, { useEffect, useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { getMaxBuildActivations } from '../../engine/rules/gameReducer';
import {
  SHIP_LIMITS,
  countPlayerShips,
  getBaseBuildItemCost,
  countDiscoveryPartsOnBlueprint,
} from '../../engine/rules/shipValidation';
import { getMinorSpeciesBuildDiscount } from '../../engine/rules/minorSpecies';
import {
  Hammer,
  CircleAlert,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateShipType } from '../../i18n/catalogTranslations';
import { ShipTypeIcon, shouldShowShipTypeIcon } from '../common/ShipTypeIcon';

export interface BuildItemPayload {
  sectorId: string;
  itemType: ShipType | 'orbital' | 'monolith';
  /** Mega War Inc.: upgrades an existing Interceptor->Cruiser or Cruiser->Dreadnought anywhere on map. */
  upgradeFromShipId?: string;
}

export interface BuildModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  eligibleSectors: SectorTile[];
  slots: BuildItemPayload[];
  onChangeSlots: (slots: BuildItemPayload[]) => void;
  activeSlotIndex: number;
  onSelectSlotIndex: (index: number) => void;
  onBuild: (items: BuildItemPayload[], pulsarSectorId?: string) => void;
  onClose: () => void;
  pulsarSectorId?: string;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  player,
  sectors,
  eligibleSectors,
  slots,
  onChangeSlots,
  activeSlotIndex,
  onSelectSlotIndex,
  onBuild,
  onClose,
  pulsarSectorId,
}) => {
  const { language, l } = useLanguage();
  const isPulsarActive = Boolean(pulsarSectorId);
  const maxBuild = isPulsarActive ? 1 : (player.hasPassed ? 1 : getMaxBuildActivations(player));
  const hasNanorobots = player.techTrack.researched.some((t) => t.id === 'nanorobots');
  const hasOrbitalTech = player.techTrack.researched.some((t) => t.id === 'orbital');
  const hasMonolithTech = player.techTrack.researched.some((t) => t.id === 'monolith');
  const hasStarbaseTech = player.techTrack.researched.some((t) => t.id === 'starbase');

  // Deployed ships across the galaxy
  const deployedShips = countPlayerShips(sectors, player.id);

  const isRhoIndi = player.faction.id === 'rho_indi_syndicate';
  const isExiles = player.faction.id === 'the_exiles';
  const isMegaWar = player.faction.id === 'mega_war_inc';

  // Net supply delta queued by OTHER slots (positive = newly built/target; negative = freed hull by Mega War upgrade)
  const stagedInOtherSlots: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
    orbital: 0,
  };
  slots.forEach((s, idx) => {
    if (idx !== activeSlotIndex && s.itemType in stagedInOtherSlots) {
      stagedInOtherSlots[s.itemType as ShipType]++;
      if (s.upgradeFromShipId) {
        const fromType: ShipType = s.itemType === 'cruiser' ? 'interceptor' : 'cruiser';
        stagedInOtherSlots[fromType]--;
      }
    }
  });

  const currentSlot = slots[activeSlotIndex] || slots[0];
  const currentSector = sectors.find((s) => s.id === currentSlot?.sectorId);

  const otherSlotHasMonolithInSector = slots.some(
    (s, idx) => idx !== activeSlotIndex && s.sectorId === currentSlot?.sectorId && s.itemType === 'monolith'
  );
  const currentSectorHasMonolith = !!(currentSector?.structures?.monolith || currentSector?.hasMonolith || otherSlotHasMonolithInSector);

  const otherSlotHasOrbitalInSector = slots.some(
    (s, idx) => idx !== activeSlotIndex && s.sectorId === currentSlot?.sectorId && s.itemType === 'orbital'
  );
  const currentSectorHasOrbital = !!(
    currentSector?.structures?.orbital ||
    currentSector?.hasOrbital ||
    currentSector?.planets.some((p) => p.isOrbital) ||
    otherSlotHasOrbitalInSector
  );

  const getAvailableSupply = (type: ShipType): number => {
    if (isRhoIndi && type === 'dreadnought') return 0;
    if (isExiles && type === 'starbase') return 0;
    return Math.max(0, SHIP_LIMITS[type] - deployedShips[type] - stagedInOtherSlots[type]);
  };

  const getItemCost = (type: ShipType | 'orbital' | 'monolith', isUpgradeBuild?: boolean) => {
    const base = getBaseBuildItemCost(player, type, isUpgradeBuild);
    const discount = getMinorSpeciesBuildDiscount(player, type);
    return Math.max(0, base - discount);
  };

  // Deployed upgradeable ships across ALL sectors on map (even pinned / enemy territory) for Mega War Inc.,
  // taking into account any earlier Build slots that already promoted a ship (e.g. Slot #1 INT->CRU enables Slot #2 CRU->DRE).
  const upgradeableShipsOnMap = React.useMemo(() => {
    if (!isMegaWar) return [];
    const stagedTypesBeforeCurrent = new Map<string, ShipType>();
    for (let idx = 0; idx < activeSlotIndex && idx < slots.length; idx++) {
      const s = slots[idx];
      if (s?.upgradeFromShipId && (s.itemType === 'cruiser' || s.itemType === 'dreadnought')) {
        stagedTypesBeforeCurrent.set(s.upgradeFromShipId, s.itemType);
      }
    }
    const usedInLaterSlots = new Set<string>();
    for (let idx = activeSlotIndex + 1; idx < slots.length; idx++) {
      const s = slots[idx];
      if (s?.upgradeFromShipId) {
        usedInLaterSlots.add(s.upgradeFromShipId);
      }
    }

    const list: {
      shipId: string;
      shipType: 'interceptor' | 'cruiser';
      targetType: 'cruiser' | 'dreadnought';
      sectorId: string;
      sectorNumber: number;
      sectorName?: string;
      inEnemyOrUncontrolled: boolean;
      stagedFromEarlierSlot: boolean;
      blockedByLaterSlot: boolean;
    }[] = [];
    for (const sec of sectors) {
      const hasEnemies = sec.ships.some((sh) => sh.ownerId !== player.id);
      for (const sh of sec.ships) {
        if (sh.ownerId !== player.id) continue;
        const effectiveType = stagedTypesBeforeCurrent.get(sh.id) ?? sh.type;
        if (effectiveType === 'interceptor' || effectiveType === 'cruiser') {
          list.push({
            shipId: sh.id,
            shipType: effectiveType,
            targetType: effectiveType === 'interceptor' ? 'cruiser' : 'dreadnought',
            sectorId: sec.id,
            sectorNumber: sec.sectorNumber,
            sectorName: sec.name,
            inEnemyOrUncontrolled: sec.discOwner !== player.id || hasEnemies,
            stagedFromEarlierSlot: stagedTypesBeforeCurrent.has(sh.id),
            blockedByLaterSlot: usedInLaterSlots.has(sh.id),
          });
        }
      }
    }
    return list;
  }, [isMegaWar, sectors, player.id, slots, activeSlotIndex]);

  const getPriceOfPowerNote = (type: ShipType) => {
    if (player.faction.id !== 'atlantians') return '';
    const extra = Math.max(0, countDiscoveryPartsOnBlueprint(player.blueprints[type]) - 1);
    return extra > 0 ? l(` • Price of Power +${extra}`, ` • 额外发现+${extra}材料`) : '';
  };

  const buildItems: {
    type: ShipType | 'orbital' | 'monolith';
    name: string;
    cost: number;
    limit?: number;
    supplyLeft?: number;
    unlocked: boolean;
    disabledReason?: string;
    description: string;
  }[] = [
    {
      type: 'interceptor',
      name: l('Interceptor', '拦截舰'),
      cost: getItemCost('interceptor'),
      limit: SHIP_LIMITS.interceptor,
      supplyLeft: getAvailableSupply('interceptor'),
      unlocked: getAvailableSupply('interceptor') > 0,
      disabledReason: getAvailableSupply('interceptor') <= 0 ? l(`Max limit of ${SHIP_LIMITS.interceptor} reached`, `已达上限 ${SHIP_LIMITS.interceptor} 艘`) : undefined,
      description: l(`Fast, agile light fighter with high base initiative (Limit 8, Cost ${getItemCost('interceptor')} Mats${getPriceOfPowerNote('interceptor')}).`, `高速敏捷的轻型战机，拥有高基础先攻（上限 8，费用 ${getItemCost('interceptor')} 材料${getPriceOfPowerNote('interceptor')}）。`),
    },
    {
      type: 'cruiser',
      name: l('Cruiser', '巡洋舰'),
      cost: getItemCost('cruiser'),
      limit: SHIP_LIMITS.cruiser,
      supplyLeft: getAvailableSupply('cruiser'),
      unlocked: getAvailableSupply('cruiser') > 0,
      disabledReason: getAvailableSupply('cruiser') <= 0 ? l(`Max limit of ${SHIP_LIMITS.cruiser} reached`, `已达上限 ${SHIP_LIMITS.cruiser} 艘`) : undefined,
      description: l(`Medium combat warship with balanced shielding and firepower (Limit 4, Cost ${getItemCost('cruiser')} Mats${getPriceOfPowerNote('cruiser')}).`, `均衡防御与火力的中型主力战舰（上限 4，费用 ${getItemCost('cruiser')} 材料${getPriceOfPowerNote('cruiser')}）。`),
    },
    {
      type: 'dreadnought',
      name: l('Dreadnought', '无畏舰'),
      cost: getItemCost('dreadnought'),
      limit: isRhoIndi ? 0 : SHIP_LIMITS.dreadnought,
      supplyLeft: getAvailableSupply('dreadnought'),
      unlocked: getAvailableSupply('dreadnought') > 0,
      disabledReason: isRhoIndi
        ? l('Rho Indi Syndicate cannot construct Dreadnoughts.', '罗印迪辛迪加无法建造无畏舰。')
        : getAvailableSupply('dreadnought') <= 0
        ? l(`Max limit of ${SHIP_LIMITS.dreadnought} reached`, `已达上限 ${SHIP_LIMITS.dreadnought} 艘`)
        : undefined,
      description: l(`Heavily armored capital flagship capable of carrying superweapons (Limit 2, Cost ${getItemCost('dreadnought')} Mats${getPriceOfPowerNote('dreadnought')}).`, `重装甲主力旗舰，可搭载重型武器（上限 2，费用 ${getItemCost('dreadnought')} 材料${getPriceOfPowerNote('dreadnought')}）。`),
    },
    {
      type: 'starbase',
      name: l('Starbase', '星际基地'),
      cost: getItemCost('starbase'),
      limit: isExiles ? 0 : SHIP_LIMITS.starbase,
      supplyLeft: getAvailableSupply('starbase'),
      unlocked: !isExiles && hasStarbaseTech && getAvailableSupply('starbase') > 0,
      disabledReason: isExiles
        ? l('The Exiles cannot construct Starbases.', '流亡者无法建造星际基地。')
        : !hasStarbaseTech
        ? l('Requires Starbase tech', '需要星际基地科技')
        : getAvailableSupply('starbase') <= 0
        ? l(`Max limit of ${SHIP_LIMITS.starbase} reached`, `已达上限 ${SHIP_LIMITS.starbase} 座`)
        : undefined,
      description: l(`Stationary defensive orbital fortress (Limit 4, Cost ${getItemCost('starbase')} Mats${getPriceOfPowerNote('starbase')}, requires Starbase tech).`, `固定轨道防御要塞（上限 4，费用 ${getItemCost('starbase')} 材料${getPriceOfPowerNote('starbase')}，需要星际基地科技）。`),
    },
    {
      type: 'orbital',
      name: isExiles ? l('Exiles Orbital', '流亡者轨道站') : l('Orbital Structure', '轨道站'),
      cost: getItemCost('orbital'),
      unlocked: hasOrbitalTech && !currentSectorHasOrbital,
      disabledReason: !hasOrbitalTech
        ? l('Requires Orbital tech', '需要轨道站科技')
        : currentSectorHasOrbital
        ? l('Sector already has Orbital', '星区已有轨道站')
        : undefined,
      description: isExiles
        ? l(`Armed orbital station acting as a combat ship when colonized (Cost 5 Mats, max 1 per sector).`, `武装轨道站，殖民后可视为战舰参与战斗（费用 5 材料，每星区限 1 座）。`)
        : l(`Artificial satellite providing a Money or Science population slot (Cost ${getItemCost('orbital')} Mats, max 1 per sector).`, `提供金钱或科研人口格的人造卫星（费用 ${getItemCost('orbital')} 材料，每星区限 1 座）。`),
    },
    {
      type: 'monolith',
      name: l('Monolith', '方尖碑'),
      cost: getItemCost('monolith'),
      unlocked: !isMegaWar && hasMonolithTech && !currentSectorHasMonolith,
      disabledReason: isMegaWar
        ? l('Mega War Inc. cannot construct Monoliths.', '巨战公司无法建造方尖碑。')
        : !hasMonolithTech
        ? l('Requires Monolith tech', '需要方尖碑科技')
        : currentSectorHasMonolith
        ? l('Sector already has Monolith', '星区已有方尖碑')
        : undefined,
      description: l(`Ancient mega-structure granting 3 Victory Points at game end (Cost ${getItemCost('monolith')} Mats, requires Monolith tech).`, `远古巨构建筑，终局提供 3 胜利分（费用 ${getItemCost('monolith')} 材料，需要方尖碑科技）。`),
    },
  ];

  const totalCost = slots.reduce((sum, s) => sum + getItemCost(s.itemType, Boolean(s.upgradeFromShipId)), 0);
  const canAfford = player.resources.materials >= totalCost;
  const allSlotsValid =
    slots.length > 0 &&
    slots.every((s, idx) => {
      if (!s.sectorId) return false;
      const sec = sectors.find((sector) => sector.id === s.sectorId);
      if (!sec) return false;
      if (s.upgradeFromShipId) {
        if (!isMegaWar) return false;
        const expectedFrom: ShipType = s.itemType === 'cruiser' ? 'interceptor' : 'cruiser';
        const sh = sec.ships.find((ship) => ship.id === s.upgradeFromShipId && ship.ownerId === player.id);
        if (!sh || sh.type !== expectedFrom) return false;
        if (slots.slice(0, idx).some((prev) => prev.upgradeFromShipId === s.upgradeFromShipId)) return false;
        return true;
      }
      if (s.itemType === 'starbase' && !hasStarbaseTech) return false;
      if (s.itemType === 'orbital') {
        if (!hasOrbitalTech) return false;
        if (sec.structures?.orbital || sec.hasOrbital || sec.planets.some((p) => p.isOrbital)) return false;
        if (slots.slice(0, idx).some((prev) => prev.sectorId === s.sectorId && prev.itemType === 'orbital')) return false;
      }
      if (s.itemType === 'monolith') {
        if (isMegaWar || !hasMonolithTech) return false;
        if (sec.structures?.monolith || sec.hasMonolith) return false;
        if (slots.slice(0, idx).some((prev) => prev.sectorId === s.sectorId && prev.itemType === 'monolith')) return false;
      }
      return true;
    });

  // Validate that the entire construction batch does not exceed ship limits
  const overallQueuedShips: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
    orbital: 0,
  };

  for (const s of slots) {
    if (s.itemType in overallQueuedShips) {
      overallQueuedShips[s.itemType as ShipType]++;
      if (s.upgradeFromShipId) {
        const fromType: ShipType = s.itemType === 'cruiser' ? 'interceptor' : 'cruiser';
        overallQueuedShips[fromType]--;
      }
    }
  }

  const exceedsShipLimits = (['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).some(
    (t) => {
      const maxLimit = isRhoIndi && t === 'dreadnought' ? 0 : isExiles && t === 'starbase' ? 0 : SHIP_LIMITS[t];
      return deployedShips[t] + overallQueuedShips[t] > maxLimit;
    }
  );

  const canBuild =
    canAfford &&
    allSlotsValid &&
    (eligibleSectors.length > 0 || (isMegaWar && upgradeableShipsOnMap.length > 0)) &&
    !exceedsShipLimits;

  const handleAddSlot = () => {
    if (slots.length < maxBuild) {
      let defaultType: ShipType | 'orbital' | 'monolith' = 'interceptor';
      for (const st of ['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]) {
        const maxLimit = isRhoIndi && st === 'dreadnought' ? 0 : isExiles && st === 'starbase' ? 0 : SHIP_LIMITS[st];
        if (deployedShips[st] + overallQueuedShips[st] < maxLimit) {
          defaultType = st;
          break;
        }
      }
      const lastSlotSectorId = slots[slots.length - 1]?.sectorId;
      const defaultSectorId =
        lastSlotSectorId && eligibleSectors.some((s) => s.id === lastSlotSectorId)
          ? lastSlotSectorId
          : eligibleSectors[0]?.id || '';
      const newSlots = [
        ...slots,
        { sectorId: defaultSectorId, itemType: defaultType },
      ];
      onChangeSlots(newSlots);
      onSelectSlotIndex(newSlots.length - 1);
    }
  };

  const sanitizeChainedUpgrades = (candidateSlots: BuildItemPayload[]): BuildItemPayload[] => {
    if (!isMegaWar) return candidateSlots;
    const simShipTypes = new Map<string, ShipType>();
    for (const sec of sectors) {
      for (const sh of sec.ships) {
        if (sh.ownerId === player.id && (sh.type === 'interceptor' || sh.type === 'cruiser' || sh.type === 'dreadnought')) {
          simShipTypes.set(sh.id, sh.type);
        }
      }
    }
    return candidateSlots.map((slot) => {
      if (!slot.upgradeFromShipId) return slot;
      const curType = simShipTypes.get(slot.upgradeFromShipId);
      const expectedFrom = slot.itemType === 'cruiser' ? 'interceptor' : slot.itemType === 'dreadnought' ? 'cruiser' : null;
      if (!curType || !expectedFrom || curType !== expectedFrom) {
        // Prior chained step was removed/changed; fall back to standard new-hull slot cleanly
        return { sectorId: slot.sectorId, itemType: 'interceptor' };
      }
      simShipTypes.set(slot.upgradeFromShipId, slot.itemType as ShipType);
      return slot;
    });
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length > 1) {
      const newSlots = sanitizeChainedUpgrades(slots.filter((_, idx) => idx !== index));
      onChangeSlots(newSlots);
      onSelectSlotIndex(Math.max(0, index - 1));
    }
  };

  const handleUpdateSlot = (index: number, updates: Partial<BuildItemPayload>) => {
    const updated = slots.map((s, idx) => (idx === index ? { ...s, ...updates } : s));
    onChangeSlots(sanitizeChainedUpgrades(updated));
  };

  const [showUnusedWarning, setShowUnusedWarning] = useState(false);

  const handleTriggerBuild = () => {
    if (!canBuild) return;
    if (slots.length < maxBuild && !showUnusedWarning) {
      setShowUnusedWarning(true);
      return;
    }
    onBuild(slots, pulsarSectorId);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showUnusedWarning) {
          setShowUnusedWarning(false);
        } else {
          onClose();
        }
      } else if (e.key === 'Enter' && canBuild) {
        e.preventDefault();
        if (slots.length < maxBuild && !showUnusedWarning) {
          setShowUnusedWarning(true);
        } else {
          onBuild(slots, pulsarSectorId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canBuild, slots, onBuild, onClose, pulsarSectorId, maxBuild, showUnusedWarning]);

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-700/80 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto text-slate-100 p-4 pointer-events-auto flex flex-col gap-3 transition-all scrollbar-thin">
        {/* Pulsar Banner */}
        {isPulsarActive && (
          <div className="p-2 px-3 rounded-xl bg-cyan-950/60 border border-cyan-500/80 text-cyan-200 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold">🌟 {l('Pulsar Construction Activation', '脉冲星建造激活')}</span>
                <span className="text-cyan-300/80 text-[11px] block">
                  {l('1 Free Construction item. No Influence Disc will be deducted from your track.', '可免费执行 1 次建造（仍需支付材料），不消耗影响力圆片。')}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-200 font-mono text-[10px] font-bold uppercase border border-cyan-700">
              {l('1 Item Limit', '限 1 项')}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wide text-slate-200 uppercase font-display">
                  {l('SHIPYARDS & CONSTRUCTION', '船坞与建造')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold">
                  {slots.length} / {maxBuild} {l('Items', '项')}
                </span>
                {hasNanorobots && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    {l('Nanorobots', '纳米机器人')}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-amber-400/90 font-medium">
                {l('Click any highlighted amber sector on the galaxy map to choose your shipyard.', '点击星图上任意琥珀色高亮星区作为你的船坞。')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-full text-xs text-amber-300 font-bold font-mono">
              <Hammer className="w-3.5 h-3.5 text-amber-400" />
              <span>{player.resources.materials} {l('Mat', '材料')}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              title={l('Close (Esc)', '关闭 (Esc)')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {eligibleSectors.length === 0 && !(isMegaWar && upgradeableShipsOnMap.length > 0) ? (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <CircleAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {l('No eligible construction sectors! You must control an uncontested sector with your Influence Disc to construct ships or structures.', '没有可用于建造的星区！你必须用影响力圆片控制一个无敌舰交战的星区才能建造飞船或建筑。')}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Construction Queue Slots */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {slots.map((slot, sIdx) => {
                const sec = sectors.find((s) => s.id === slot.sectorId);
                const cost = getItemCost(slot.itemType, Boolean(slot.upgradeFromShipId));
                const isActive = sIdx === activeSlotIndex;

                return (
                  <div
                    key={sIdx}
                    onClick={() => onSelectSlotIndex(sIdx)}
                    className={`px-3 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 shrink-0 ${
                      isActive
                        ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                        isActive
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sIdx + 1}
                    </span>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-200 uppercase">
                          {translateShipType(slot.itemType, language)}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          {cost}{l('M', '材')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {sec ? l(`Sec ${sec.sectorNumber}`, `星区 ${sec.sectorNumber}`) : l('Select Sector', '选择星区')}
                      </span>
                    </div>

                    {slots.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlot(sIdx);
                        }}
                        className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors ml-1"
                        title={l('Remove item', '移除此项')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {slots.length < maxBuild && (
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3 py-2 rounded-xl border border-dashed border-amber-600/60 hover:border-amber-400 hover:bg-amber-950/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{l(`Add Item #${slots.length + 1}`, `添加第 ${slots.length + 1} 项`)}</span>
                </button>
              )}
            </div>

            {/* Active Slot Customization Box */}
            {currentSlot && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                {/* Shipyard Indicator & Selector */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {l(`Item #${activeSlotIndex + 1} Shipyard:`, `第 ${activeSlotIndex + 1} 项船坞：`)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-300 font-bold text-xs font-mono">
                      {l('Sector ', '星区 ')}{currentSector?.sectorNumber} ({currentSector?.name || l(`Ring ${currentSector?.ring}`, `第 ${currentSector?.ring} 环`)})
                    </span>
                  </div>

                  <select
                    value={currentSlot.sectorId}
                    onChange={(e) => handleUpdateSlot(activeSlotIndex, { sectorId: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                  >
                    {eligibleSectors.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {l(`Sector ${sec.sectorNumber}`, `星区 ${sec.sectorNumber}`)} ({sec.name || l(`Ring ${sec.ring}`, `第 ${sec.ring} 环`)} • {sec.ships.length} {l('ships', '艘船')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Blueprint / Structure Buttons */}
                <div className="grid grid-cols-6 gap-1.5">
                  {buildItems.map((item) => {
                    const isSelected = !currentSlot.upgradeFromShipId && currentSlot.itemType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        disabled={!item.unlocked}
                        onClick={() => handleUpdateSlot(activeSlotIndex, { itemType: item.type, upgradeFromShipId: undefined })}
                        className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between min-h-[64px] ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500 shadow ring-1 ring-amber-500 text-white'
                            : item.unlocked
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                            : 'bg-slate-900/40 border-slate-900 opacity-50 cursor-not-allowed text-slate-500'
                        }`}
                        title={item.disabledReason ? `${item.name}: ${item.disabledReason}` : item.description}
                      >
                        <div className="flex items-center justify-center gap-1 w-full">
                          {item.type !== 'monolith' && shouldShowShipTypeIcon(item.type, player.faction.id) && (
                            <ShipTypeIcon
                              shipType={item.type}
                              factionId={player.faction.id}
                              size={12}
                              className={isSelected ? 'text-amber-300' : 'text-cyan-400'}
                            />
                          )}
                          <span className="font-bold text-[11px] truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {item.cost}{l('M', '材')}
                          </span>
                          {item.limit !== undefined && item.supplyLeft !== undefined && (
                            <span
                              className={`text-[9px] font-mono px-1 rounded font-bold ${
                                item.supplyLeft > 0
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              }`}
                              title={l(`${item.supplyLeft} available in supply out of ${item.limit}`, `供应区剩余 ${item.supplyLeft} / ${item.limit}`)}
                            >
                              {item.supplyLeft}/{item.limit}
                            </span>
                          )}
                        </div>
                        {item.disabledReason && (
                          <span className="text-[8px] text-rose-400/90 truncate w-full mt-0.5">
                            {item.disabledReason}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mega War Inc.: Field Hull Upgrade (Anywhere on Map, including Enemy / Pinned Territory) */}
                {isMegaWar && upgradeableShipsOnMap.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        {l(
                          'Field Hull Upgrade (Any Sector, Including Enemy / Pinned):',
                          '战地船体改型（任意星区，含敌方/牵制星区）：'
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-amber-300 font-bold">
                        {l('Cost: 3 Mats (1 Build Activation)', '费用：3 材料（占 1 次建造）')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {upgradeableShipsOnMap.map((cand) => {
                        const hasSupply = getAvailableSupply(cand.targetType) > 0;
                        const isPicked = currentSlot.upgradeFromShipId === cand.shipId;
                        const isDisabled = cand.blockedByLaterSlot || (!isPicked && !hasSupply);
                        const upCost = getItemCost(cand.targetType, true);
                        return (
                          <button
                            key={cand.shipId}
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                              handleUpdateSlot(activeSlotIndex, {
                                sectorId: cand.sectorId,
                                itemType: cand.targetType,
                                upgradeFromShipId: cand.shipId,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              isPicked
                                ? 'bg-indigo-600/80 border-indigo-400 text-white shadow ring-1 ring-indigo-300'
                                : isDisabled
                                ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-45 cursor-not-allowed'
                                : 'bg-slate-900 border-indigo-900/60 hover:border-indigo-500 text-indigo-200'
                            }`}
                          >
                            <span className="uppercase">{cand.shipType.slice(0, 3)} → {cand.targetType.slice(0, 3)}</span>
                            <span className="text-slate-400 font-mono">
                              @{l(`Sec ${cand.sectorNumber}`, `星区${cand.sectorNumber}`)}
                            </span>
                            {cand.stagedFromEarlierSlot && (
                              <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[9px]">
                                {l('Chained', '连续升级')}
                              </span>
                            )}
                            {cand.inEnemyOrUncontrolled && (
                              <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px]">
                                {l('Field', '前线')}
                              </span>
                            )}
                            <span className="text-amber-300 font-mono">{upCost}M</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <div className="text-xs">
            <span className="text-slate-400">{l('Total: ', '总计：')}</span>
            <strong className={canAfford ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
              {totalCost} / {player.resources.materials} {l('Materials', '材料')}
            </strong>
            {!canAfford && (
              <span className="text-rose-400 ml-2 font-semibold text-[11px]">
                ({l(`Need ${totalCost - player.resources.materials} more`, `还需 ${totalCost - player.resources.materials}`)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              {l('Cancel', '取消')}
            </button>
            <button
              disabled={!canBuild}
              onClick={handleTriggerBuild}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              {l(`Construct ${slots.length} ${slots.length === 1 ? 'Item' : 'Items'} (Enter)`, `建造 ${slots.length} 项 (Enter)`)}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Unused Activations Confirmation Dialog */}
    {showUnusedWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 font-display">
                {l('Unused Build Activation', '尚有未使用的建造次数')}
              </h3>
              <p className="text-xs text-slate-400">
                {l(`You have ${maxBuild - slots.length} unused Build activation${maxBuild - slots.length > 1 ? 's' : ''} remaining (${slots.length} of ${maxBuild} used).`, `你还有 ${maxBuild - slots.length} 次未使用的建造机会（已用 ${slots.length}/${maxBuild}）。`)}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
            {l(`Are you sure you want to construct only ${slots.length} item${slots.length > 1 ? 's' : ''} and give up the extra activation?`, `确定只建造 ${slots.length} 项并放弃剩余建造机会吗？`)}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowUnusedWarning(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
            >
              {l('Keep Building (Add More)', '继续添加建造')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUnusedWarning(false);
                onBuild(slots, pulsarSectorId);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              {l(`Confirm & Construct ${slots.length} Item${slots.length > 1 ? 's' : ''}`, `确认建造 ${slots.length} 项`)}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
