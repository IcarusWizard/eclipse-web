import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Technology, TechCategory } from '../../engine/types/tech';
import {
  MILITARY_TECHS,
  GRID_TECHS,
  NANO_TECHS,
  ALL_RARE_TECHS,
  calculateTechCost,
  getTechTrackMaxSlots,
  isSingleTechLineFaction,
  getTotalTechSlotsMax,
} from '../../engine/rules/techData';
import { isSpiralPhase2 } from '../../engine/rules/partData';
import { getMinorSpeciesTechDiscount } from '../../engine/rules/minorSpecies';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { getMaxResearchActivations } from '../../engine/rules/gameReducer';
import { MidasTouchBanner } from '../common/MidasTouchBanner';
import { calculateBlueprintStats } from '../../engine/rules/shipValidation';
import { ShipBlueprintSlotsLayout } from '../blueprints/ShipBlueprintSlotsLayout';
import { TechTileIconography } from '../common/PhysicalTileIconography';
import {
  Cpu,
  FlaskConical,
  Check,
  X,
  Shield,
  Zap,
  Sparkles,
  Layers,
  Package,
  CircleDot,
  HelpCircle,
  Award,
  Eye,
  AlertTriangle,
} from 'lucide-react';

import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateTechName,
  translateTechDesc,
  translateTechCategory,
  translateGamePhase,
  translateResourceType,
  translateShipType,
  translatePartName,
} from '../../i18n/catalogTranslations';

interface TechMarketModalProps {
  player: PlayerState;
  activePlayer?: PlayerState;
  players?: PlayerState[];
  sectors?: SectorTile[];
  currentSeat?: number | 'all' | 'spectator';
  phase?: string;
  techSupply: Technology[];
  techBagCount?: number;
  onResearchTech: (
    researches: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[] | string,
    targetTrack?: 'military' | 'grid' | 'nano',
    warpPortalSectorId?: string,
    shrinePlacement?: { row: number; col: number; sectorId: string; planetId: string },
    ancientInstinctUpgrade?: { shipType: ShipType; slotIndex: number; partId: string },
    useMidasTouch?: boolean
  ) => void;
  onClose: () => void;
}

type TrayViewMode = 'all' | 'military' | 'grid' | 'nano' | 'rare';

export const TechMarketModal: React.FC<TechMarketModalProps> = ({
  player,
  activePlayer,
  players,
  sectors,
  currentSeat = 'all',
  phase = 'ACTION_PHASE',
  techSupply,
  techBagCount = 0,
  onResearchTech,
  onClose,
}) => {
  const { language, l } = useLanguage();
  const [viewMode, setViewMode] = useState<TrayViewMode>('all');
  const [selectedRareTrack, setSelectedRareTrack] = useState<Record<string, 'military' | 'grid' | 'nano'>>({});
  const [warpPortalSectorId, setWarpPortalSectorId] = useState<string>('');
  const [showUnusedWarning, setShowUnusedWarning] = useState(false);

  const initialCommanderId =
    typeof currentSeat === 'number' && players?.[currentSeat]
      ? players[currentSeat].id
      : (player?.id || activePlayer?.id || '');

  const [viewedCommanderId, setViewedCommanderId] = useState<string>(initialCommanderId);
  const commander = (players || []).find((p) => p.id === viewedCommanderId) || (typeof currentSeat === 'number' && players?.[currentSeat]) || player || activePlayer;
  const isActionPhase = !phase || phase === 'ACTION_PHASE';
  const isCommanderTurn =
    isActionPhase &&
    Boolean(activePlayer && activePlayer.id === commander.id) &&
    (currentSeat === 'all' || (typeof currentSeat === 'number' && players?.[currentSeat]?.id === commander.id));
  const hasActionDiscs = commander.influenceTrack.discsOnTrack > 0;
  const hasPassed = commander.hasPassed;
  const [useMidasTouch, setUseMidasTouch] = useState<boolean>(false);
  const isMidasTouchEligible =
    commander.faction.id === 'legion_of_midas' && isCommanderTurn && hasActionDiscs && !hasPassed;
  const effectiveMidasTouch = isMidasTouchEligible && useMidasTouch;
  const maxResearch = getMaxResearchActivations(commander, effectiveMidasTouch);

  // Player-controlled sectors for Warp Portal placement (Bug 79)
  const controlledSectors = React.useMemo(
    () => (sectors || []).filter((s) => s.discOwner === commander.id),
    [sectors, commander.id]
  );

  const [selectedForResearch, setSelectedForResearch] = useState<
    { techId: string; targetTrack: 'military' | 'grid' | 'nano' }[]
  >([]);

  // Lyra Shrine Placement State (Optional with Research action)
  const [selectedShrineSlot, setSelectedShrineSlot] = useState<{ row: number; col: number } | null>(null);
  const [selectedPlanetTarget, setSelectedPlanetTarget] = useState<{ sectorId: string; planetId: string } | null>(null);

  // Atlantians Ancient Instinct State (Optional Upgrade 1 with the researched technology)
  const [ancientInstinctPending, setAncientInstinctPending] = useState<{
    tech: Technology;
    chosenTrack: 'military' | 'grid' | 'nano';
    warpPortalSectorId?: string;
  } | null>(null);
  const [instinctShipType, setInstinctShipType] = useState<ShipType>('cruiser');
  const [instinctSlotIndex, setInstinctSlotIndex] = useState<number>(0);

  const instinctPart = ancientInstinctPending?.tech.unlocksPartId
    ? SHIP_PARTS[ancientInstinctPending.tech.unlocksPartId] || null
    : null;
  const instinctBlueprint = commander.blueprints[instinctShipType];
  const instinctTestStats = React.useMemo(() => {
    if (!instinctBlueprint || !instinctPart) return null;
    if (instinctSlotIndex < 0 || instinctSlotIndex >= instinctBlueprint.maxSlots) return null;
    const simBp = {
      ...instinctBlueprint,
      slots: [...instinctBlueprint.slots],
      externalParts: instinctBlueprint.externalParts ? [...instinctBlueprint.externalParts] : undefined,
    };
    simBp.slots[instinctSlotIndex] = instinctPart;
    return calculateBlueprintStats(simBp);
  }, [instinctBlueprint, instinctPart, instinctSlotIndex]);

  const selectedShrine = React.useMemo(() => {
    if (!selectedShrineSlot || !commander.shrineBoard) return null;
    return commander.shrineBoard.slots[selectedShrineSlot.row]?.[selectedShrineSlot.col] || null;
  }, [selectedShrineSlot, commander.shrineBoard]);

  const eligiblePlanetSlots = React.useMemo(() => {
    if (!selectedShrine) return [];
    const results: { sector: SectorTile; planet: any; planetIndex: number }[] = [];
    for (const sec of controlledSectors) {
      sec.planets.forEach((p, idx) => {
        if (!p.shrineOwner && p.colonizedBy === commander.id) {
          const costRes = selectedShrine.costResource;
          const planetRes = p.resource;
          const isMatch =
            planetRes === 'any' ||
            (costRes === 'science' && planetRes === 'science') ||
            (costRes === 'money' && planetRes === 'money') ||
            (costRes === 'materials' && (planetRes === 'materials' || planetRes === 'material'));
          if (isMatch) {
            results.push({ sector: sec, planet: p, planetIndex: idx });
          }
        }
      });
    }
    return results;
  }, [selectedShrine, controlledSectors]);

  const shrinePlacement = React.useMemo(() => {
    if (!selectedShrineSlot || !selectedPlanetTarget) return undefined;
    return {
      row: selectedShrineSlot.row,
      col: selectedShrineSlot.col,
      sectorId: selectedPlanetTarget.sectorId,
      planetId: selectedPlanetTarget.planetId,
    };
  }, [selectedShrineSlot, selectedPlanetTarget]);

  const isShrinePartiallySelected = Boolean(selectedShrineSlot && !selectedPlanetTarget);

  // Build tech counts in techSupply
  const supplyCountMap = new Map<string, number>();
  for (const tech of techSupply) {
    supplyCountMap.set(tech.id, (supplyCountMap.get(tech.id) || 0) + 1);
  }

  // Progressive calculation of cost and discount for staged techs
  const isSingleLine = isSingleTechLineFaction(commander.faction.id);
  const stagedResearches = React.useMemo(() => {
    let totalSingleCount = commander.techTrack.researched.length;
    let mCount = commander.techTrack.militaryCount;
    let gCount = commander.techTrack.gridCount;
    let nCount = commander.techTrack.nanoCount;
    let totalScience = 0;

    const items = selectedForResearch.map((item) => {
      const tech = techSupply.find((t) => t.id === item.techId);
      if (!tech) return { ...item, tech: null, cost: 0, discount: 0 };
      let countBefore = 0;
      if (isSingleLine) {
        countBefore = totalSingleCount++;
      } else if (item.targetTrack === 'military') countBefore = mCount++;
      else if (item.targetTrack === 'grid') countBefore = gCount++;
      else countBefore = nCount++;

      const baseCost = calculateTechCost(tech, countBefore, item.targetTrack, commander.faction.id);
      const msDiscount = getMinorSpeciesTechDiscount(commander);
      const cost = Math.max(tech.minCost, baseCost - msDiscount);
      const discount = tech.baseCost - cost;
      totalScience += cost;
      return { ...item, tech, cost, discount, countBefore };
    });

    return { items, totalScience };
  }, [selectedForResearch, commander.techTrack, commander.faction.id, isSingleLine, techSupply]);

  // Rare techs in supply
  const rareTechsInSupply = ALL_RARE_TECHS.filter((t) => supplyCountMap.has(t.id));

  // Determine current discount counts for commander
  const getTrackCount = (cat: 'military' | 'grid' | 'nano'): number => {
    if (cat === 'military') return commander.techTrack.militaryCount;
    if (cat === 'grid') return commander.techTrack.gridCount;
    return commander.techTrack.nanoCount;
  };

  const getRareBestTrack = (tech: Technology): 'military' | 'grid' | 'nano' => {
    if (selectedRareTrack[tech.id]) return selectedRareTrack[tech.id];
    const mCount = commander.techTrack.militaryCount;
    const gCount = commander.techTrack.gridCount;
    const nCount = commander.techTrack.nanoCount;
    if (mCount >= gCount && mCount >= nCount) return 'military';
    if (gCount >= nCount) return 'grid';
    return 'nano';
  };

  const renderCompartment = (tech: Technology, trackCategory?: 'military' | 'grid' | 'nano', itemIndex?: number) => {
    const stock = supplyCountMap.get(tech.id) || 0;
    const isOwned = commander.techTrack.researched.some((t) => t.id === tech.id);
    const otherPlayersWithTech = (players || []).filter(
      (p) => p.id !== commander.id && p.techTrack.researched.some((t) => t.id === tech.id)
    );
    const controlledArtifactsCount = (sectors || []).filter(
      (s) => s.discOwner === commander.id && s.hasArtifact
    ).length;

    let chosenTrack = trackCategory;
    if (tech.category === 'rare') {
      chosenTrack = getRareBestTrack(tech);
    }
    const trackCount = isSingleLine
      ? commander.techTrack.researched.length
      : (chosenTrack ? getTrackCount(chosenTrack) : 0);
    const maxSlots = isSingleLine
      ? getTotalTechSlotsMax(commander.faction.id)
      : (chosenTrack ? getTechTrackMaxSlots(chosenTrack, commander.faction.id) : 7);
    const isTrackFull = trackCount >= maxSlots;
    const isRestrictedForFaction = commander.faction.id === 'mega_war_inc' && tech.id === 'monolith';
    const msDiscount = getMinorSpeciesTechDiscount(commander);
    const discountedCost = Math.max(
      tech.minCost,
      calculateTechCost(tech, trackCount, chosenTrack, commander.faction.id) - msDiscount
    );
    const canAfford = commander.resources.science >= discountedCost;
    const canResearch =
      isCommanderTurn &&
      !hasPassed &&
      hasActionDiscs &&
      stock > 0 &&
      !isOwned &&
      !isRestrictedForFaction &&
      canAfford &&
      !isTrackFull;

    const categoryTheme =
      tech.category === 'military'
        ? {
            border: 'border-rose-900/60',
            bg: 'bg-rose-950/20',
            text: 'text-rose-400',
            badge: 'bg-rose-950 text-rose-300 border-rose-800',
            accent: 'border-rose-500/50',
          }
        : tech.category === 'grid'
        ? {
            border: 'border-emerald-900/60',
            bg: 'bg-emerald-950/20',
            text: 'text-emerald-400',
            badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
            accent: 'border-emerald-500/50',
          }
        : tech.category === 'nano'
        ? {
            border: 'border-sky-900/60',
            bg: 'bg-sky-950/20',
            text: 'text-sky-400',
            badge: 'bg-sky-950 text-sky-300 border-sky-800',
            accent: 'border-sky-500/50',
          }
        : {
            border: 'border-purple-900/60',
            bg: 'bg-purple-950/20',
            text: 'text-purple-400',
            badge: 'bg-purple-950 text-purple-300 border-purple-800',
            accent: 'border-purple-500/50',
          };

    const isSelected = selectedForResearch.some((s) => s.techId === tech.id);
    const selectedIdx = selectedForResearch.findIndex((s) => s.techId === tech.id);

    const toggleSelect = () => {
      if (!isCommanderTurn) return;
      if (showUnusedWarning) setShowUnusedWarning(false);
      if (isSelected) {
        setSelectedForResearch((prev) => prev.filter((s) => s.techId !== tech.id));
      } else {
        if (selectedForResearch.length >= maxResearch) return;
        if (isTrackFull) return;
        const tr = chosenTrack || 'nano';
        setSelectedForResearch((prev) => [...prev, { techId: tech.id, targetTrack: tr }]);
      }
    };

    const isTopRow =
      viewMode !== 'all' ||
      trackCategory === 'military' ||
      tech.category === 'military';

    let horizontalPlacement = 'left-1/2 -translate-x-1/2';
    if (tech.tier) {
      if (tech.tier <= 2) {
        horizontalPlacement = 'left-0';
      } else if (tech.tier === 3) {
        horizontalPlacement = 'left-0 md:left-1/2 md:-translate-x-1/2 lg:left-0';
      } else if (tech.tier === 4) {
        horizontalPlacement = 'right-0 lg:left-1/2 lg:-translate-x-1/2';
      } else if (tech.tier === 5) {
        horizontalPlacement = 'left-0 lg:left-1/2 lg:-translate-x-1/2';
      } else if (tech.tier === 6) {
        horizontalPlacement = 'right-0 md:left-1/2 md:-translate-x-1/2 lg:right-0';
      } else if (tech.tier >= 7) {
        horizontalPlacement = 'right-0';
      }
    } else if (itemIndex !== undefined) {
      const col4 = itemIndex % 4;
      if (col4 === 0) horizontalPlacement = 'left-0';
      else if (col4 === 3) horizontalPlacement = 'right-0';
      else horizontalPlacement = 'left-1/2 -translate-x-1/2';
    }

    let verticalPlacement = 'bottom-[calc(100%+8px)]';
    if (viewMode === 'all') {
      verticalPlacement =
        trackCategory === 'military' || tech.category === 'military'
          ? 'top-[calc(100%+8px)]'
          : 'bottom-[calc(100%+8px)]';
    } else {
      // In single tech tray view (e.g. MILITARY TRACK RED):
      // All cards (T1-T8) open downward cleanly into the spacious tray area below the cards,
      // floating above the bottom bar with a full-height yellow box covering all text.
      verticalPlacement = 'top-[calc(100%+8px)]';
    }

    return (
      <div
        key={tech.id}
        title={`${translateTechName(tech.id, tech.name, language)}: ${translateTechDesc(tech.id, tech.description, language)}`}
        className={`group relative hover:z-50 rounded-xl border flex flex-col justify-between p-3 transition-all ${
          isSelected
            ? 'ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/60'
            : categoryTheme.border + ' ' + categoryTheme.bg
        } ${
          stock > 0
            ? 'shadow-md shadow-black/40 hover:border-slate-500'
            : 'opacity-60 bg-slate-950/40 border-slate-900'
        } ${isOwned ? 'ring-1 ring-emerald-500/40' : ''}`}
      >
        {/* Detailed Description Hover Tooltip (Bug 214, Bug 237, Bug 243) */}
        <div
          role="tooltip"
          style={{ backgroundColor: '#020617' }}
          className={`hidden group-hover:block absolute ${horizontalPlacement} ${verticalPlacement} z-50 w-72 max-w-[calc(100vw-2rem)] p-3 bg-slate-950 border-2 border-amber-500/90 rounded-xl shadow-2xl shadow-black text-xs text-slate-100 pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
            <span className="font-bold text-amber-300 text-sm font-display">{translateTechName(tech.id, tech.name, language)}</span>
            <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
              {translateTechCategory(tech.category, language)}
            </span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed mb-2 font-normal">
            {translateTechDesc(tech.id, tech.description, language)}
          </p>
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              {l('Base Cost:', '基础费用：')} {tech.baseCost}
              <FlaskConical className="w-3 h-3 text-pink-400 inline" />
            </span>
            <span className="flex items-center gap-1">
              {l('Min Cost:', '最低费用：')} {tech.minCost}
              <FlaskConical className="w-3 h-3 text-pink-400 inline" />
            </span>
            {tech.victoryPoints ? (
              <span className="text-amber-400 font-bold">+{tech.victoryPoints} {l('VP', '分')}</span>
            ) : null}
          </div>
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-10 flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            {l(`#${selectedIdx + 1} Selected`, `已选 #${selectedIdx + 1}`)}
          </div>
        )}

        {/* Slot Header */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px] font-mono whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">
                {tech.tier ? l(`Slot ${tech.tier}`, `栏位 ${tech.tier}`) : l('Rare Tech', '稀有科技')}
              </span>
              {tech.victoryPoints && (
                <span className="text-[10px] text-amber-400 font-sans font-bold flex items-center gap-0.5">
                  <Award className="w-3 h-3 text-amber-400" />
                  +{tech.victoryPoints} {l('VP', '分')}
                </span>
              )}
            </div>

            {/* Stock count badge */}
            {stock > 0 ? (
              <span
                className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] flex items-center gap-1 shrink-0 whitespace-nowrap"
                title={l(`${stock} available in Tech Tray`, `科技盘中剩余 ${stock} 个`)}
              >
                <Package className="w-3 h-3 text-amber-400" />
                <span>{`x${stock}`}</span>
              </span>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded font-bold bg-slate-900/80 text-slate-500 border border-slate-800 text-[9px] shrink-0 whitespace-nowrap"
                title={l('Out of stock in Tech Tray', '科技盘已空')}
              >
                {l('EMPTY', '已空')}
              </span>
            )}
          </div>

          {/* Physical Tile Iconography Face (Second Dawn board game design, no text name on face) */}
          <div className="my-1.5 cursor-help" title={`${translateTechName(tech.id, tech.name, language)}: ${translateTechDesc(tech.id, tech.description, language)}`}>
            <TechTileIconography tech={tech} />
          </div>

          {/* Artifact Key Controlled Artifacts Counter */}
          {tech.id === 'artifact_key' && (
            <div className="mb-2 px-2 py-1 rounded bg-sky-950/80 border border-sky-500/50 text-[10px] text-sky-200 flex items-center justify-between font-mono">
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                {l('Artifacts Held:', '持有遗迹：')}
              </span>
              <span className="font-bold text-sky-100 bg-sky-900/60 px-1.5 py-0.5 rounded border border-sky-600">
                {controlledArtifactsCount}
              </span>
            </div>
          )}

          {/* Other Players Researched Badge */}
          {otherPlayersWithTech.length > 0 && (
            <div
              className="mb-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-[10px] flex items-center justify-between gap-1"
              title={l(`Researched by: ${otherPlayersWithTech.map((p) => p.name).join(', ')}`, `已研发玩家：${otherPlayersWithTech.map((p) => p.name).join(', ')}`)}
            >
              <span className="text-slate-400 font-medium">
                {l(`${otherPlayersWithTech.length} ${otherPlayersWithTech.length === 1 ? 'player has:' : 'players have:'}`, `${otherPlayersWithTech.length} 名玩家已研发：`)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {otherPlayersWithTech.map((p) => (
                  <span
                    key={p.id}
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white/40"
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rare Tech Track Selector (omitted for single-line The Spiral) */}
          {tech.category === 'rare' && !isSingleLine && stock > 0 && !isOwned && (
            <div className="mb-2.5 p-1.5 rounded-lg bg-slate-950/60 border border-purple-900/40 text-[10px]">
              <div className="text-slate-400 mb-1 font-semibold">{l('Place on Track:', '放置到科技轨：')}</div>
              <div className="grid grid-cols-3 gap-1">
                {(['military', 'grid', 'nano'] as const).map((tr) => {
                  const trCount = getTrackCount(tr);
                  const trMax = getTechTrackMaxSlots(tr, commander.faction.id);
                  const isTrFull = trCount >= trMax;
                  const costOnTr = Math.max(
                    tech.minCost,
                    calculateTechCost(tech, trCount, tr, commander.faction.id) - msDiscount
                  );
                  const isSelectedTr = chosenTrack === tr;
                  return (
                    <button
                      key={tr}
                      disabled={isTrFull}
                      onClick={() => {
                        setSelectedRareTrack((prev) => ({ ...prev, [tech.id]: tr }));
                        if (isSelected) {
                          setSelectedForResearch((prev) =>
                            prev.map((s) => (s.techId === tech.id ? { ...s, targetTrack: tr } : s))
                          );
                        }
                      }}
                      className={`px-1 py-1 rounded text-center font-bold transition-all border ${
                        isSelectedTr
                          ? 'bg-purple-600 border-purple-400 text-white shadow'
                          : isTrFull
                          ? 'bg-slate-950 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="uppercase text-[9px]">{language === 'zh' ? translateTechCategory(tr, language) : tr[0]} {isTrFull ? l('(Full)', '(满)') : `(${trCount}/${trMax})`}</div>
                      <div className="text-[10px] flex items-center justify-center gap-0.5">
                        <span>{costOnTr}</span>
                        <FlaskConical className="w-2.5 h-2.5 text-pink-400 inline" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warp Portal Rare Tech Controlled Sector Placement Selector (Bug 61) */}
          {tech.id === 'warp_portal' && stock > 0 && !isOwned && (
            <div className="mb-2.5 p-1.5 rounded-lg bg-slate-950/60 border border-purple-900/40 text-[10px]">
              <div className="text-purple-300 mb-1 font-semibold flex items-center justify-between">
                <span>{l('Place Portal on Sector:', '将传送门放置于星区：')}</span>
                <span className="text-[9px] text-purple-400 font-bold">+1 {l('VP', '分')}</span>
              </div>
              {controlledSectors.length === 0 ? (
                <div className="text-rose-400 italic text-[10px]">{l('Must control a sector to place portal', '必须控制至少一个星区才能放置传送门')}</div>
              ) : (
                <select
                  value={warpPortalSectorId || controlledSectors[0]?.id}
                  onChange={(e) => setWarpPortalSectorId(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-700/60 rounded px-1.5 py-1 text-slate-200 text-[10px] font-mono"
                >
                  {controlledSectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {l(`Sector ${s.sectorNumber} (Ring ${s.ring})`, `星区 ${s.sectorNumber}（第 ${s.ring} 环）`)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer: Price (Row 1) & Action (Row 2) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
          {/* Row 1: Cost: <base> (MIN <min>) <beaker> */}
          <div className="flex items-center justify-between text-[10px] font-mono whitespace-nowrap">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-semibold uppercase">{l('Cost:', '费用：')}</span>
              <span className="font-extrabold text-pink-400 font-mono text-[11px]">{discountedCost}</span>
              {tech.baseCost > discountedCost && (
                <span className="text-[9px] text-slate-500 line-through font-mono">
                  {tech.baseCost}
                </span>
              )}
              <span className="text-slate-500 font-normal text-[9.5px]">
                {language === 'zh' ? `(最低 ${tech.minCost})` : <>(MIN {tech.minCost})</>}
              </span>
            </div>
            <FlaskConical className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          </div>

          {/* Row 2: Action or Status */}
          <div className="w-full">
            {isOwned ? (
              <span className="w-full py-1 rounded-lg text-[10.5px] font-bold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {l('Researched', '已研发')}
              </span>
            ) : isRestrictedForFaction ? (
              <span className="w-full py-1 rounded text-[10px] text-rose-400 font-bold flex items-center justify-center bg-rose-950/40 border border-rose-900/70">
                {l('Forbidden (Mega War)', '巨战公司禁用')}
              </span>
            ) : stock === 0 ? (
              <span className="w-full py-1 rounded text-[10.5px] text-slate-500 italic font-semibold flex items-center justify-center bg-slate-950/40 border border-slate-900">
                {l('Empty Slot', '空栏位')}
              </span>
            ) : isSelected ? (
              <button
                type="button"
                onClick={toggleSelect}
                className="w-full py-1 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all font-sans flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> {l('Deselect', '取消选择')}
              </button>
            ) : canResearch ? (
              maxResearch > 1 ? (
                <button
                  type="button"
                  onClick={toggleSelect}
                  disabled={selectedForResearch.length >= maxResearch}
                  className="w-full py-1 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed shadow transition-all font-sans cursor-pointer flex items-center justify-center"
                >
                  {l('Select', '选择')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const portalSec = tech.id === 'warp_portal' ? (warpPortalSectorId || controlledSectors[0]?.id) : undefined;
                    if (
                      commander.faction.id === 'atlantians' &&
                      tech.unlocksPartId &&
                      SHIP_PARTS[tech.unlocksPartId]
                    ) {
                      const defaultShipType: ShipType = commander.blueprints.cruiser ? 'cruiser' : 'interceptor';
                      const bp = commander.blueprints[defaultShipType];
                      const emptyIdx = bp ? bp.slots.findIndex((s) => s === null) : 0;
                      setInstinctShipType(defaultShipType);
                      setInstinctSlotIndex(emptyIdx >= 0 ? emptyIdx : 0);
                      setAncientInstinctPending({
                        tech,
                        chosenTrack: chosenTrack || 'nano',
                        warpPortalSectorId: portalSec,
                      });
                      return;
                    }
                    onResearchTech(tech.id, chosenTrack, portalSec, shrinePlacement, undefined, effectiveMidasTouch || undefined);
                  }}
                  disabled={isShrinePartiallySelected}
                  className="w-full py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-md shadow-pink-950/50 transition-all font-sans disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                  title={isShrinePartiallySelected ? l('Select target planet for Shrine or deselect Shrine', '请为神殿选择目标星球，或取消选择神殿') : l('Research technology', '研发科技')}
                >
                  {l('Research', '研发')}
                </button>
              )
            ) : isTrackFull ? (
              <span className="w-full py-1 rounded bg-amber-950/40 border border-amber-900/60 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                {l(`Track Full (${maxSlots}/${maxSlots})`, `科技轨已满 (${maxSlots}/${maxSlots})`)}
              </span>
            ) : !canAfford ? (
              <div className="w-full py-0.5 rounded bg-rose-950/50 border border-rose-900/70 text-rose-300 font-bold text-[10px] flex items-center justify-center gap-1">
                <span>{l(`Need ${discountedCost - commander.resources.science}`, `还缺 ${discountedCost - commander.resources.science}`)}</span>
                <FlaskConical className="w-3 h-3 text-pink-400 inline shrink-0" />
              </div>
            ) : !hasActionDiscs ? (
              <span className="w-full py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-[10px] flex items-center justify-center">
                {l('No Discs', '无可用圆片')}
              </span>
            ) : (
              <span className="w-full py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-[10px] flex items-center justify-center">
                {currentSeat === 'spectator' ? l('Spectator Mode', '观战模式') : l('Not Your Turn', '非你的回合')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl shadow-2xl flex flex-col min-h-[480px] sm:min-h-[580px] max-h-[92vh] overflow-hidden text-slate-100">
        {/* Tray Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-950/80 border border-pink-700/60 text-pink-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-100 font-display tracking-wider">
                  {l('PHYSICAL TECHNOLOGY TRAY', '科技供应盘')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {l('Eclipse: Second Dawn', '星蚀：第二黎明')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {l('Compartmentalized plastic tray. Tiles are drawn from the cloth bag every round during Cleanup.', '分格科技收纳盘。每轮清理阶段都会从布袋中抽取新的科技板块。')}
              </p>
            </div>
          </div>

          {/* Cloth Bag & Science Balance Counters */}
          <div className="flex items-center gap-3 flex-wrap">
            {currentSeat === 'spectator' && (
              <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/80 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-bold">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{l('Spectator Mode (Observing)', '观战模式（旁观中）')}</span>
              </div>
            )}
            {/* Cloth Bag Counter */}
            <div
              className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/80 px-3 py-1.5 rounded-xl text-xs text-indigo-300 font-bold"
              title={l('Official Rule: Every Cleanup Phase, tiles are drawn until (N+3) regular tiles are drawn. Rare tiles do not count against the limit.', '官方规则：每个清理阶段从布袋抽取板块，直到抽满 (N+3) 枚常规科技；稀有科技不计入该上限。')}
            >
              <Package className="w-4 h-4 text-indigo-400" />
              <span>{l(`Cloth Bag: ${techBagCount} tiles`, `科技布袋：${techBagCount} 枚`)}</span>
            </div>

            {/* Commander Science Balance */}
            <div className="flex items-center gap-2 bg-pink-950/70 border border-pink-700/80 px-3 py-1.5 rounded-xl text-xs text-pink-300 font-bold">
              <FlaskConical className="w-4 h-4 text-pink-400" />
              <span>{l(`${commander.resources.science} Science`, `${commander.resources.science} 科研`)}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Switcher & Tech Track Discounts Status Banner */}
        <div className="bg-slate-900/60 px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          {isMidasTouchEligible && (
            <MidasTouchBanner
              player={commander}
              actionType="RESEARCH"
              enabled={useMidasTouch}
              onToggle={(next) => {
                setUseMidasTouch(next);
                if (!next) {
                  setSelectedForResearch([]);
                  setShowUnusedWarning(false);
                }
              }}
              className="w-full"
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-400">{l('Viewing Commander:', '当前查看指挥官：')}</span>
            {players && players.length > 1 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {players.map((p, idx) => {
                  const isSelected = p.id === commander.id;
                  const isSeat = typeof currentSeat === 'number' && currentSeat === idx;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setViewedCommanderId(p.id);
                        setSelectedForResearch([]);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                      {isSeat && <span className="text-[10px] text-indigo-200 font-mono font-normal">{l('(You)', '(你)')}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="font-bold text-slate-200">{commander.name}</span>
            )}
            {phase && phase !== 'ACTION_PHASE' && (
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[10px] font-mono font-bold">
                {translateGamePhase(phase, language)} ({l('Read-Only', '只读')})
              </span>
            )}
          </div>

          {isSingleLine ? (
            <div className="flex items-center gap-3 flex-wrap font-mono font-bold">
              <div
                data-testid="spiral-single-tech-line-status"
                className="flex items-center gap-1.5 text-sky-200 bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-700/70"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>
                  {l(
                    `Single Tech Line: ${commander.techTrack.researched.length}/${getTotalTechSlotsMax(commander.faction.id)} Researched`,
                    `单一科技轨：${commander.techTrack.researched.length}/${getTotalTechSlotsMax(commander.faction.id)} 已研发`
                  )}
                </span>
              </div>
              <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-[11px] text-amber-300">
                {isSpiralPhase2(commander.techTrack.researched)
                  ? l('Shift Port Phase 2 Active (5+ Techs)', '转换接口第 2 阶段激活 (5+ 科技)')
                  : l('Shift Port Phase 1 (5th Tech Upgrades)', '转换接口第 1 阶段 (第 5 项升级)')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap font-mono font-bold">
              {/* Military Track Status */}
              <div className="flex items-center gap-1.5 text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/60">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{l(`Military: ${commander.techTrack.militaryCount}/${getTechTrackMaxSlots('military', commander.faction.id)} Researched`, `军事：${commander.techTrack.militaryCount}/${getTechTrackMaxSlots('military', commander.faction.id)} 已研发`)}</span>
              </div>

              {/* Grid Track Status */}
              <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{l(`Grid: ${commander.techTrack.gridCount}/${getTechTrackMaxSlots('grid', commander.faction.id)} Researched`, `网络：${commander.techTrack.gridCount}/${getTechTrackMaxSlots('grid', commander.faction.id)} 已研发`)}</span>
              </div>

              {/* Nano Track Status */}
              <div className="flex items-center gap-1.5 text-sky-300 bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-900/60">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>{l(`Nano: ${commander.techTrack.nanoCount}/${getTechTrackMaxSlots('nano', commander.faction.id)} Researched`, `纳米：${commander.techTrack.nanoCount}/${getTechTrackMaxSlots('nano', commander.faction.id)} 已研发`)}</span>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2 text-xs font-bold overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0 sticky top-0 z-10">
          {[
            { id: 'all', label: l('FULL TECH TRAY (ALL TRACKS)', '完整科技盘（全轨道）') },
            { id: 'military', label: l('MILITARY TRACK (RED)', '军事轨（红）') },
            { id: 'grid', label: l('GRID TRACK (GREEN)', '网络轨（绿）') },
            { id: 'nano', label: l('NANO TRACK (BLUE)', '纳米轨（蓝）') },
            { id: 'rare', label: l(`RARE TECHS (${rareTechsInSupply.length} IN TRAY)`, `稀有科技（${rareTechsInSupply.length} 项在盘）`) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as TrayViewMode)}
              className={`px-3.5 py-2 rounded-t-xl transition-all border-t border-x whitespace-nowrap cursor-pointer ${
                viewMode === tab.id
                  ? 'bg-slate-900 border-pink-500/60 text-pink-300 shadow'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tray Rows Body */}
        <div className={`p-4 sm:p-6 ${viewMode === 'all' ? 'overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]' : 'overflow-visible min-h-[420px] pb-44'} space-y-6 flex-1 min-h-0 bg-slate-950/90 relative z-20`}>
          {/* 1. MILITARY TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'military') && (
            <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/50 rounded-2xl p-4 border border-rose-950/60 shadow-inner transition-[z-index]">
              <div className="flex items-center justify-between mb-3 border-b border-rose-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <h3 className="font-extrabold text-sm text-rose-300 font-display uppercase tracking-wider">
                    {l('Military Technologies (Track 1)', '军事科技（第 1 轨）')}
                  </h3>
                </div>
                <span className="text-[11px] text-rose-400/80 font-mono">
                  {l('Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16', '栏位 1-8 • 基础费用：2, 4, 6, 8, 10, 12, 14, 16')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {MILITARY_TECHS.map((tech, idx) => renderCompartment(tech, 'military', idx))}
              </div>
            </div>
          )}

          {/* 2. GRID TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'grid') && (
            <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/50 rounded-2xl p-4 border border-emerald-950/60 shadow-inner transition-[z-index]">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <h3 className="font-extrabold text-sm text-emerald-300 font-display uppercase tracking-wider">
                    {l('Grid Technologies (Track 2)', '网络科技（第 2 轨）')}
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  {l('Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16', '栏位 1-8 • 基础费用：2, 4, 6, 8, 10, 12, 14, 16')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {GRID_TECHS.map((tech, idx) => renderCompartment(tech, 'grid', idx))}
              </div>
            </div>
          )}

          {/* 3. NANO TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'nano') && (
            <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/50 rounded-2xl p-4 border border-sky-950/60 shadow-inner transition-[z-index]">
              <div className="flex items-center justify-between mb-3 border-b border-sky-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-sky-500" />
                  <h3 className="font-extrabold text-sm text-sky-300 font-display uppercase tracking-wider">
                    {l('Nano Technologies (Track 3)', '纳米科技（第 3 轨）')}
                  </h3>
                </div>
                <span className="text-[11px] text-sky-400/80 font-mono">
                  {l('Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16', '栏位 1-8 • 基础费用：2, 4, 6, 8, 10, 12, 14, 16')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {NANO_TECHS.map((tech, idx) => renderCompartment(tech, 'nano', idx))}
              </div>
            </div>
          )}

          {/* 4. RARE TECHNOLOGIES ROW */}
          {(viewMode === 'all' || viewMode === 'rare') && (
            <div className="relative hover:z-40 focus-within:z-40 bg-slate-900/50 rounded-2xl p-4 border border-purple-950/60 shadow-inner transition-[z-index]">
              <div className="flex items-center justify-between mb-3 border-b border-purple-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                  <h3 className="font-extrabold text-sm text-purple-300 font-display uppercase tracking-wider">
                    {l('Rare Technologies (Unique Tiles Drawn from Bag)', '稀有科技（从布袋抽取的独特板块）')}
                  </h3>
                </div>
                <span className="text-[11px] text-purple-400/80 font-mono">
                  {l('16 Unique Techs • May be placed on ANY track (receives chosen track discount)', '16 项独特科技 • 可置于任意科技轨并享受该轨折扣')}
                </span>
              </div>

              {rareTechsInSupply.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
                  {l('No Rare Technologies currently in the Tech Tray. Rare tiles are drawn randomly from the cloth bag during game setup and round cleanups.', '科技盘中当前没有稀有科技。稀有科技会在开局设置和每轮清理阶段随机从布袋抽出。')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {rareTechsInSupply.map((tech, idx) => renderCompartment(tech, undefined, idx))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Atlantians Ancient Instinct Upgrade 1 Panel */}
        {commander.faction.id === 'atlantians' && ancientInstinctPending && instinctPart && isCommanderTurn && (
          <div className="px-5 py-3.5 bg-cyan-950/25 border-t border-cyan-500/50 shrink-0 relative z-20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-display">
                  {l(
                    `Ancient Instinct — Upgrade 1 with ${translatePartName(instinctPart.id, instinctPart.name, language)}`,
                    `远古本能 — 研发并免费升级 1 次（${translatePartName(instinctPart.id, instinctPart.name, language)}）`
                  )}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAncientInstinctPending(null)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                {l('Back to Tech Tray', '返回科技盘')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).map((st) => {
                const bp = commander.blueprints[st];
                if (!bp) return null;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setInstinctShipType(st);
                      const emptyIdx = bp.slots.findIndex((s) => s === null);
                      setInstinctSlotIndex(emptyIdx >= 0 ? emptyIdx : 0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                      instinctShipType === st
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {translateShipType(st, language)}
                  </button>
                );
              })}
            </div>

            {instinctBlueprint && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="overflow-x-auto">
                  <ShipBlueprintSlotsLayout
                    shipType={instinctShipType}
                    factionId={commander.faction.id}
                    slots={instinctBlueprint.slots}
                    maxSlots={instinctBlueprint.maxSlots}
                    preprintedPower={instinctBlueprint.preprintedPower}
                    preprintedComputer={instinctBlueprint.preprintedComputer}
                    preprintedShield={instinctBlueprint.preprintedShield}
                    preprintedHull={instinctBlueprint.preprintedHull}
                    externalParts={instinctBlueprint.externalParts}
                    interactive={true}
                    canModify={true}
                    selectedSlotIndex={instinctSlotIndex}
                    onSelectSlot={(sIdx) => setInstinctSlotIndex(sIdx)}
                    size="sm"
                  />
                </div>
                <div className="flex flex-col gap-2 shrink-0 min-w-[220px]">
                  <div className="text-[11px] font-mono text-slate-300">
                    {l(`Target: ${instinctShipType.toUpperCase()} Slot ${instinctSlotIndex + 1}`, `目标：${translateShipType(instinctShipType, language)} 槽位 ${instinctSlotIndex + 1}`)}
                    {instinctTestStats && !instinctTestStats.isValid && (
                      <div className="text-rose-400 font-semibold mt-1 text-[10.5px]">
                        {instinctTestStats.errors[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!instinctTestStats?.isValid}
                      onClick={() => {
                        const pending = ancientInstinctPending;
                        setAncientInstinctPending(null);
                        onResearchTech(
                          [{ techId: pending.tech.id, targetTrack: pending.chosenTrack }],
                          pending.chosenTrack,
                          pending.warpPortalSectorId,
                          undefined,
                          { shipType: instinctShipType, slotIndex: instinctSlotIndex, partId: instinctPart.id }
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs cursor-pointer"
                    >
                      {l('Research & Upgrade 1', '研发并免费升级 1 次')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pending = ancientInstinctPending;
                        setAncientInstinctPending(null);
                        onResearchTech(
                          [{ techId: pending.tech.id, targetTrack: pending.chosenTrack }],
                          pending.chosenTrack,
                          pending.warpPortalSectorId
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      {l('Research Only', '仅研发不升级')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enlightened of Lyra Shrine Placement Panel */}
        {commander.faction.id === 'enlightened_of_lyra' && commander.shrineBoard && isCommanderTurn && (
          <div className="px-5 py-3.5 bg-orange-950/20 border-t border-orange-500/40 shrink-0 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <h4 className="text-xs font-bold text-orange-200 uppercase tracking-wider font-display">
                  {l('Enlightened of Lyra — Shrine Placement (Optional with this Research Action)', '天琴座启蒙者 — 建造神殿（本次研发行动可选）')}
                </h4>
              </div>
              {selectedShrineSlot && (
                <button
                  onClick={() => {
                    setSelectedShrineSlot(null);
                    setSelectedPlanetTarget(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline font-sans"
                >
                  {l('Cancel Shrine Placement', '取消建造神殿')}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              {l('With each Research action, you may also place one Shrine onto an eligible planet slot in a controlled hex (matching resource color or gray). Complete rows to unlock bonuses!', '每次执行研发行动时，你还可以在已控制星区的一个符合条件的星球格（同色或灰色）上放置一座神殿。填满整行即可解锁奖励！')}
            </p>

            {/* Shrine Slot Selector */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300">
                {l('Step 1: Choose an unbuilt Shrine from your 3x3 board:', '第 1 步：从你的 3x3 神殿面板中选择一座尚未建造的神殿：')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {commander.shrineBoard.slots.map((rowSlots, rIdx) => {
                  const rowNames = [
                    l('Row 1 (Wormhole Gen)', '第 1 行（虫洞发生器）'),
                    l('Row 2 (Discovery Tile)', '第 2 行（探索发现板块）'),
                    l('Row 3 (+1 Disc)', '第 3 行（+1 圆片）'),
                  ];
                  return (
                    <div key={`lyra_shrine_row_${rIdx}`} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                      <div className="text-[10px] font-bold text-orange-300/80 mb-1.5">{rowNames[rIdx]}</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {rowSlots.map((slot, cIdx) => {
                          const isSelected = selectedShrineSlot?.row === rIdx && selectedShrineSlot?.col === cIdx;
                          const canAfford = commander.resources[slot.costResource] >= slot.costAmount;
                          return (
                            <button
                              key={`shrine_opt_${rIdx}_${cIdx}`}
                              disabled={slot.built || (!canAfford && !isSelected)}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedShrineSlot(null);
                                  setSelectedPlanetTarget(null);
                                } else {
                                  setSelectedShrineSlot({ row: rIdx, col: cIdx });
                                  setSelectedPlanetTarget(null);
                                }
                              }}
                              className={`p-1.5 rounded border text-[10px] font-mono transition-all flex flex-col items-center justify-center ${
                                slot.built
                                  ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-orange-500 border-orange-400 text-slate-950 font-black shadow-md ring-2 ring-orange-400/50'
                                  : canAfford
                                  ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                                  : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {slot.built ? (
                                <span>{l('Built ✓', '已建 ✓')}</span>
                              ) : (
                                <>
                                  <span className="font-bold">{slot.costAmount}</span>
                                  <span className="text-[9px] uppercase">{language === 'zh' ? translateResourceType(slot.costResource, language) : slot.costResource.slice(0, 3)}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Target Planet Slot Selector (only shown if a shrine is selected) */}
            {selectedShrineSlot && selectedShrine && (
              <div className="mt-3 pt-3 border-t border-orange-950/60 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>
                    {l(`Step 2: Choose target planet slot in a controlled hex (Cost: ${selectedShrine.costAmount} ${selectedShrine.costResource}):`, `第 2 步：选择已控制星区中的目标星球格（费用：${selectedShrine.costAmount} ${translateResourceType(selectedShrine.costResource, language)}）：`)}
                  </span>
                  {selectedPlanetTarget && (
                    <span className="text-emerald-400 font-bold">
                      ✓ {l(`Ready to build Shrine on Sector ${selectedPlanetTarget.sectorId}`, `准备在星区 ${selectedPlanetTarget.sectorId} 建造神殿`)}
                    </span>
                  )}
                </div>

                {eligiblePlanetSlots.length === 0 ? (
                  <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/60 rounded-lg p-2.5">
                    {l(`No eligible planet slots available for this shrine in your controlled sectors. The planet must match the shrine color (${selectedShrine.costResource}) or be gray/wildcard, and cannot already have a shrine.`, `你所控制的星区中没有符合此神殿条件的星球格。星球颜色必须与神殿费用（${translateResourceType(selectedShrine.costResource, language)}）一致或为灰色万能格，且尚未建有神殿。`)}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {eligiblePlanetSlots.map(({ sector: sec, planet: pl, planetIndex }) => {
                      const isTargeted = selectedPlanetTarget?.sectorId === sec.id && selectedPlanetTarget?.planetId === pl.id;
                      const resBadgeColors = {
                        science: 'bg-pink-950/60 text-pink-300 border-pink-700',
                        money: 'bg-amber-950/60 text-amber-300 border-amber-700',
                        materials: 'bg-amber-900/60 text-amber-200 border-amber-800',
                        material: 'bg-amber-900/60 text-amber-200 border-amber-800',
                        any: 'bg-slate-800 text-slate-300 border-slate-700',
                      };
                      const badgeClass = resBadgeColors[pl.resource as keyof typeof resBadgeColors] || 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <button
                          key={`pl_target_${sec.id}_${pl.id}`}
                          onClick={() => setSelectedPlanetTarget({ sectorId: sec.id, planetId: pl.id })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                            isTargeted
                              ? 'bg-orange-500 border-orange-300 text-slate-950 font-bold shadow-md ring-2 ring-orange-400/50'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                          }`}
                        >
                          <span>{l(`Sector ${sec.sectorNumber || sec.id}`, `星区 ${sec.sectorNumber || sec.id}`)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono ${badgeClass}`}>
                            {pl.resource === 'any' ? l('Wild', '万能') : translateResourceType(pl.resource, language)}
                          </span>
                          {pl.isAdvanced && <span className="text-[10px]">★</span>}
                          {pl.colonizedBy && <span className="text-[10px] text-emerald-400">{l('(Colonized)', '(已殖民)')}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hydran Double Research Staging Panel */}
        {maxResearch > 1 && (
          <div className="px-5 py-3 bg-slate-900/95 border-t border-cyan-500/40 flex flex-wrap items-center justify-between gap-4 shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-base">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                  <span>
                    {commander.faction.id === 'legion_of_midas'
                      ? l('Midas Touch Double Research Staging', '点金手双重研发暂存区')
                      : l('Hydran Double Research Staging', '海德拉双重研发暂存区')}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-[10px] text-cyan-400 font-mono font-bold">
                    {selectedForResearch.length} / {maxResearch} {l('Selected', '已选')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedForResearch.length === 0 ? (
                    l('Select up to 2 technologies to research concurrently for 1 Action Disc.', '最多可选择 2 项科技，仅消耗 1 枚行动圆片同时研发。')
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {stagedResearches.items.map((item, idx) => (
                        <span
                          key={item.techId}
                          className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-200 text-[11px] flex items-center gap-1"
                        >
                          <strong className="text-cyan-400">#{idx + 1}</strong> {item.tech ? translateTechName(item.tech.id, item.tech.name, language) : item.techId}
                          <span className="text-pink-400 font-mono font-bold flex items-center gap-0.5">
                            ({item.cost}
                            <FlaskConical className="w-2.5 h-2.5 text-pink-400 inline" />)
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedForResearch.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForResearch([]);
                    setShowUnusedWarning(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  {l('Clear Selection', '清空选择')}
                </button>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">{l('Combined Cost', '合计费用')}</div>
                <div className="text-sm font-mono font-black text-pink-400 flex items-center justify-end gap-1">
                  <span>{stagedResearches.totalScience}</span>
                  <FlaskConical className="w-4 h-4 text-pink-400" />
                </div>
              </div>
              <button
                type="button"
                disabled={
                  !isActionPhase ||
                  selectedForResearch.length === 0 ||
                  stagedResearches.totalScience > commander.resources.science ||
                  !hasActionDiscs ||
                  hasPassed ||
                  !isCommanderTurn ||
                  isShrinePartiallySelected
                }
                onClick={() => {
                  if (maxResearch > 1 && selectedForResearch.length < maxResearch && !showUnusedWarning) {
                    setShowUnusedWarning(true);
                    return;
                  }
                  const hasWarp = selectedForResearch.some((s) => s.techId === 'warp_portal');
                  const targetSecId = hasWarp ? (warpPortalSectorId || (sectors || []).find((s) => s.discOwner === commander.id)?.id) : undefined;
                  onResearchTech(selectedForResearch, undefined, targetSecId, shrinePlacement, undefined, effectiveMidasTouch || undefined);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-1.5 font-sans cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isActionPhase ? (
                  isCommanderTurn ? (
                    <span className="flex items-center gap-1">
                      <span>{l(`Research Selected (${stagedResearches.totalScience}`, `研发所选 (${stagedResearches.totalScience}`)}</span>
                      <FlaskConical className="w-3.5 h-3.5 inline text-slate-950" />
                      <span>{l(', 1 Disc)', ', 1 圆片)')}</span>
                    </span>
                  ) : currentSeat === 'spectator' ? (
                    l(`Spectator Mode (Observing ${activePlayer?.name || 'Commander'})`, `观战模式（正在旁观 ${activePlayer?.name || '指挥官'}）`)
                  ) : (
                    l(`Waiting for ${activePlayer?.name || 'Commander'}...`, `正在等待 ${activePlayer?.name || '指挥官'}...`)
                  )
                ) : (
                  l(`Research Unavailable (${phase.replace('_', ' ')})`, `研发不可用（${translateGamePhase(phase, language)}）`)
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tray Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 relative z-10">
          <div className="text-slate-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>
              <strong>{l('Official Eclipse Rule:', '星蚀官方规则：')}</strong> {l('Researched technologies immediately unlock ship parts, structures, and abilities. Costs are discounted based on existing technologies on the corresponding track.', '已研发的科技会立即解锁飞船部件、建筑与能力，费用会根据对应科技轨上已有科技数量获得减免。')}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            {l('Close Tray', '关闭科技盘')}
          </button>
        </div>
      </div>
    </div>

    {/* Unused Activations Confirmation Dialog */}
    {showUnusedWarning && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200 font-sans">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 font-display">
                {l('Unused Research Activation', '尚有未使用的研发次数')}
              </h3>
              <p className="text-xs text-slate-400">
                {l(`You have ${maxResearch - selectedForResearch.length} unused Research activation${maxResearch - selectedForResearch.length > 1 ? 's' : ''} remaining (${selectedForResearch.length} of ${maxResearch} used).`, `你还有 ${maxResearch - selectedForResearch.length} 次未使用的研发激活（已用 ${selectedForResearch.length}/${maxResearch}）。`)}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
            {l(`Are you sure you want to research only ${selectedForResearch.length} tech${selectedForResearch.length > 1 ? 's' : ''} and give up the extra activation?`, `确定只研发这 ${selectedForResearch.length} 项科技并放弃额外的研发激活吗？`)}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowUnusedWarning(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
            >
              {l('Keep Selecting (Add More)', '继续选择更多')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUnusedWarning(false);
                const hasWarp = selectedForResearch.some((s) => s.techId === 'warp_portal');
                const targetSecId = hasWarp ? (warpPortalSectorId || (sectors || []).find((s) => s.discOwner === commander.id)?.id) : undefined;
                onResearchTech(selectedForResearch, undefined, targetSecId, shrinePlacement, undefined, effectiveMidasTouch || undefined);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              {l(`Confirm & Research ${selectedForResearch.length} Tech${selectedForResearch.length > 1 ? 's' : ''}`, `确认研发 ${selectedForResearch.length} 项科技`)}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
