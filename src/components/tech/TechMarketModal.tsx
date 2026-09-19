import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { Technology, TechCategory } from '../../engine/types/tech';
import {
  MILITARY_TECHS,
  GRID_TECHS,
  NANO_TECHS,
  RARE_TECHS,
  calculateTechCost,
} from '../../engine/rules/techData';
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
} from 'lucide-react';

import { SectorTile } from '../../engine/types/galaxy';

interface TechMarketModalProps {
  player: PlayerState;
  activePlayer?: PlayerState;
  players?: PlayerState[];
  sectors?: SectorTile[];
  techSupply: Technology[];
  techBagCount?: number;
  onResearchTech: (
    researches: { techId: string; targetTrack?: 'military' | 'grid' | 'nano' }[] | string,
    targetTrack?: 'military' | 'grid' | 'nano'
  ) => void;
  onClose: () => void;
}

type TrayViewMode = 'all' | 'military' | 'grid' | 'nano' | 'rare';

export const TechMarketModal: React.FC<TechMarketModalProps> = ({
  player,
  activePlayer,
  players,
  sectors,
  techSupply,
  techBagCount = 0,
  onResearchTech,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<TrayViewMode>('all');
  const [selectedRareTrack, setSelectedRareTrack] = useState<Record<string, 'military' | 'grid' | 'nano'>>({});

  // Acting player is activePlayer if provided, else viewed player
  const commander = activePlayer || player;
  const isCommanderTurn = !activePlayer || activePlayer.id === player.id;
  const hasActionDiscs = commander.influenceTrack.discsOnTrack > 0;
  const hasPassed = commander.hasPassed;
  const maxResearch = commander.faction.researchActivations ?? 1;

  const [selectedForResearch, setSelectedForResearch] = useState<
    { techId: string; targetTrack: 'military' | 'grid' | 'nano' }[]
  >([]);

  // Build tech counts in techSupply
  const supplyCountMap = new Map<string, number>();
  for (const tech of techSupply) {
    supplyCountMap.set(tech.id, (supplyCountMap.get(tech.id) || 0) + 1);
  }

  // Progressive calculation of cost and discount for staged techs
  const stagedResearches = React.useMemo(() => {
    let mCount = commander.techTrack.militaryCount;
    let gCount = commander.techTrack.gridCount;
    let nCount = commander.techTrack.nanoCount;
    let totalScience = 0;

    const items = selectedForResearch.map((item) => {
      const tech = techSupply.find((t) => t.id === item.techId);
      if (!tech) return { ...item, tech: null, cost: 0, discount: 0 };
      let countBefore = 0;
      if (item.targetTrack === 'military') countBefore = mCount++;
      else if (item.targetTrack === 'grid') countBefore = gCount++;
      else countBefore = nCount++;

      const cost = calculateTechCost(tech, countBefore);
      const discount = tech.baseCost - cost;
      totalScience += cost;
      return { ...item, tech, cost, discount, countBefore };
    });

    return { items, totalScience };
  }, [selectedForResearch, commander.techTrack, techSupply]);

  // Rare techs in supply
  const rareTechsInSupply = RARE_TECHS.filter((t) => supplyCountMap.has(t.id));

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

  const renderCompartment = (tech: Technology, trackCategory?: 'military' | 'grid' | 'nano') => {
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
    const trackCount = chosenTrack ? getTrackCount(chosenTrack) : 0;
    const discountedCost = calculateTechCost(tech, trackCount);
    const canAfford = commander.resources.science >= discountedCost;
    const canResearch = isCommanderTurn && !hasPassed && hasActionDiscs && stock > 0 && !isOwned && canAfford;

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
      if (isSelected) {
        setSelectedForResearch((prev) => prev.filter((s) => s.techId !== tech.id));
      } else {
        if (selectedForResearch.length >= maxResearch) return;
        const tr = chosenTrack || 'nano';
        setSelectedForResearch((prev) => [...prev, { techId: tech.id, targetTrack: tr }]);
      }
    };

    return (
      <div
        key={tech.id}
        className={`relative rounded-xl border flex flex-col justify-between p-3 transition-all ${
          isSelected
            ? 'ring-2 ring-cyan-400 bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/60'
            : categoryTheme.border + ' ' + categoryTheme.bg
        } ${
          stock > 0
            ? 'shadow-md shadow-black/40 hover:border-slate-500'
            : 'opacity-60 bg-slate-950/40 border-slate-900'
        } ${isOwned ? 'ring-1 ring-emerald-500/40' : ''}`}
      >
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-10 flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            #{selectedIdx + 1} Selected
          </div>
        )}

        {/* Slot Header */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px] font-mono">
            <span className="text-slate-400 font-bold uppercase tracking-wider">
              {tech.tier ? `Slot ${tech.tier}` : 'Rare'} • Base {tech.baseCost}🔬
            </span>

            {/* Stock in Tray badge */}
            {stock > 0 ? (
              <span className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] flex items-center gap-1">
                <Package className="w-3 h-3 text-amber-400" />
                x{stock} in Tray
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded font-bold bg-slate-900/80 text-slate-500 border border-slate-800 text-[9px]">
                EMPTY
              </span>
            )}
          </div>

          {/* Tech Name */}
          <div className="font-bold text-sm text-slate-100 font-display flex items-center justify-between mb-1">
            <span className="truncate" title={tech.name}>
              {tech.name}
            </span>
            {tech.victoryPoints && (
              <span className="text-[10px] text-amber-400 font-sans font-bold flex items-center gap-0.5">
                <Award className="w-3 h-3 text-amber-400" />
                +{tech.victoryPoints} VP
              </span>
            )}
          </div>

          {/* Description / Effect */}
          <p className="text-[11px] text-slate-300 leading-snug mb-2 line-clamp-3">
            {tech.description}
          </p>

          {/* Artifact Key Controlled Artifacts Counter */}
          {tech.id === 'artifact_key' && (
            <div className="mb-2 px-2 py-1 rounded bg-sky-950/80 border border-sky-500/50 text-[10px] text-sky-200 flex items-center justify-between font-mono">
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                Artifacts Held:
              </span>
              <span className="font-bold text-sky-100 bg-sky-900/60 px-1.5 py-0.5 rounded border border-sky-600">
                {controlledArtifactsCount} (Yields {controlledArtifactsCount * 5} Res)
              </span>
            </div>
          )}

          {/* Other Players Researched Badge */}
          {otherPlayersWithTech.length > 0 && (
            <div
              className="mb-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-[10px] flex items-center justify-between gap-1"
              title={`Researched by: ${otherPlayersWithTech.map((p) => p.name).join(', ')}`}
            >
              <span className="text-slate-400 font-medium">
                {otherPlayersWithTech.length} {otherPlayersWithTech.length === 1 ? 'player has:' : 'players have:'}
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

          {/* Rare Tech Track Selector */}
          {tech.category === 'rare' && stock > 0 && !isOwned && (
            <div className="mb-2.5 p-1.5 rounded-lg bg-slate-950/60 border border-purple-900/40 text-[10px]">
              <div className="text-slate-400 mb-1 font-semibold">Place on Track:</div>
              <div className="grid grid-cols-3 gap-1">
                {(['military', 'grid', 'nano'] as const).map((tr) => {
                  const trCount = getTrackCount(tr);
                  const costOnTr = calculateTechCost(tech, trCount);
                  const isSelectedTr = chosenTrack === tr;
                  return (
                    <button
                      key={tr}
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
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="uppercase text-[9px]">{tr[0]}</div>
                      <div className="text-[10px]">{costOnTr}🔬</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Price & Action */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 font-semibold uppercase">Cost</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-pink-400 font-mono">
                {discountedCost}🔬
              </span>
              {tech.baseCost > discountedCost && (
                <span className="text-[10px] text-slate-500 line-through font-mono">
                  {tech.baseCost}
                </span>
              )}
            </div>
          </div>

          <div>
            {isOwned ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Researched
              </span>
            ) : stock === 0 ? (
              <span className="text-[11px] text-slate-500 italic font-semibold">
                Empty Slot
              </span>
            ) : isSelected ? (
              <button
                onClick={toggleSelect}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all font-sans flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Deselect
              </button>
            ) : canResearch ? (
              maxResearch > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleSelect}
                    disabled={selectedForResearch.length >= maxResearch}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed shadow transition-all font-sans"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => onResearchTech([{ techId: tech.id, targetTrack: chosenTrack }])}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-all font-sans"
                    title="Research only this single technology immediately"
                  >
                    Quick
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onResearchTech(tech.id, chosenTrack)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg shadow-pink-950/50 transition-all font-sans"
                >
                  Research
                </button>
              )
            ) : !canAfford ? (
              <span className="text-[10px] text-rose-400 font-bold px-2 py-1 bg-rose-950/40 rounded border border-rose-900/60">
                Need {discountedCost - commander.resources.science}🔬
              </span>
            ) : !hasActionDiscs ? (
              <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-900 rounded border border-slate-800">
                No Discs
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-900 rounded border border-slate-800">
                Not Your Turn
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Tray Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-950/80 border border-pink-700/60 text-pink-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-100 font-display tracking-wider">
                  PHYSICAL TECHNOLOGY TRAY
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Eclipse: Second Dawn
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compartmentalized plastic tray. Tiles are drawn from the cloth bag every round during Cleanup.
              </p>
            </div>
          </div>

          {/* Cloth Bag & Science Balance Counters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Cloth Bag Counter */}
            <div
              className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/80 px-3 py-1.5 rounded-xl text-xs text-indigo-300 font-bold"
              title="Official Rule: Every Cleanup Phase, tiles are drawn until (N+3) regular tiles are drawn. Rare tiles do not count against the limit."
            >
              <Package className="w-4 h-4 text-indigo-400" />
              <span>Cloth Bag: {techBagCount} tiles</span>
            </div>

            {/* Commander Science Balance */}
            <div className="flex items-center gap-2 bg-pink-950/70 border border-pink-700/80 px-3 py-1.5 rounded-xl text-xs text-pink-300 font-bold">
              <FlaskConical className="w-4 h-4 text-pink-400" />
              <span>{commander.resources.science} Science</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Tech Track Discounts & Status Banner */}
        <div className="bg-slate-900/40 px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-slate-200">{commander.name}&apos;s Tech Tracks:</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap font-mono font-bold">
            {/* Military Track Status */}
            <div className="flex items-center gap-1.5 text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/60">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Military: {commander.techTrack.militaryCount}/8 Researched</span>
            </div>

            {/* Grid Track Status */}
            <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Grid: {commander.techTrack.gridCount}/8 Researched</span>
            </div>

            {/* Nano Track Status */}
            <div className="flex items-center gap-1.5 text-sky-300 bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-900/60">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Nano: {commander.techTrack.nanoCount}/8 Researched</span>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2 text-xs font-bold overflow-x-auto">
          {[
            { id: 'all', label: 'FULL TECH TRAY (ALL TRACKS)' },
            { id: 'military', label: 'MILITARY TRACK (RED)' },
            { id: 'grid', label: 'GRID TRACK (GREEN)' },
            { id: 'nano', label: 'NANO TRACK (BLUE)' },
            { id: 'rare', label: `RARE TECHS (${rareTechsInSupply.length} IN TRAY)` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as TrayViewMode)}
              className={`px-3.5 py-2 rounded-t-xl transition-all border-t border-x whitespace-nowrap ${
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/90">
          {/* 1. MILITARY TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'military') && (
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-rose-950/60 shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-rose-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <h3 className="font-extrabold text-sm text-rose-300 font-display uppercase tracking-wider">
                    Military Technologies (Track 1)
                  </h3>
                </div>
                <span className="text-[11px] text-rose-400/80 font-mono">
                  Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {MILITARY_TECHS.map((tech) => renderCompartment(tech, 'military'))}
              </div>
            </div>
          )}

          {/* 2. GRID TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'grid') && (
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-emerald-950/60 shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <h3 className="font-extrabold text-sm text-emerald-300 font-display uppercase tracking-wider">
                    Grid Technologies (Track 2)
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {GRID_TECHS.map((tech) => renderCompartment(tech, 'grid'))}
              </div>
            </div>
          )}

          {/* 3. NANO TRACK ROW */}
          {(viewMode === 'all' || viewMode === 'nano') && (
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-sky-950/60 shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-sky-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-sky-500" />
                  <h3 className="font-extrabold text-sm text-sky-300 font-display uppercase tracking-wider">
                    Nano Technologies (Track 3)
                  </h3>
                </div>
                <span className="text-[11px] text-sky-400/80 font-mono">
                  Slots 1-8 • Base Costs: 2, 4, 6, 8, 10, 12, 14, 16
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {NANO_TECHS.map((tech) => renderCompartment(tech, 'nano'))}
              </div>
            </div>
          )}

          {/* 4. RARE TECHNOLOGIES ROW */}
          {(viewMode === 'all' || viewMode === 'rare') && (
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-purple-950/60 shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-purple-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                  <h3 className="font-extrabold text-sm text-purple-300 font-display uppercase tracking-wider">
                    Rare Technologies (Unique Tiles Drawn from Bag)
                  </h3>
                </div>
                <span className="text-[11px] text-purple-400/80 font-mono">
                  16 Unique Techs • May be placed on ANY track (receives chosen track discount)
                </span>
              </div>

              {rareTechsInSupply.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-900">
                  No Rare Technologies currently in the Tech Tray. Rare tiles are drawn randomly from the cloth bag during game setup and round cleanups.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {rareTechsInSupply.map((tech) => renderCompartment(tech))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hydran Double Research Staging Panel */}
        {maxResearch > 1 && (
          <div className="px-5 py-3 bg-slate-900/95 border-t border-cyan-500/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-base">
                🔬
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
                  <span>Hydran Double Research Staging</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-[10px] text-cyan-400 font-mono font-bold">
                    {selectedForResearch.length} / {maxResearch} Selected
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedForResearch.length === 0 ? (
                    'Select up to 2 technologies to research concurrently for 1 Action Disc.'
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {stagedResearches.items.map((item, idx) => (
                        <span
                          key={item.techId}
                          className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-200 text-[11px] flex items-center gap-1"
                        >
                          <strong className="text-cyan-400">#{idx + 1}</strong> {item.tech?.name}
                          <span className="text-pink-400 font-mono font-bold">({item.cost}🔬)</span>
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
                  onClick={() => setSelectedForResearch([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                >
                  Clear Selection
                </button>
              )}
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Combined Cost</div>
                <div className="text-sm font-mono font-black text-pink-400">
                  {stagedResearches.totalScience} 🔬
                </div>
              </div>
              <button
                disabled={
                  selectedForResearch.length === 0 ||
                  stagedResearches.totalScience > commander.resources.science ||
                  !hasActionDiscs ||
                  hasPassed ||
                  !isCommanderTurn
                }
                onClick={() => onResearchTech(selectedForResearch)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-1.5 font-sans"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Research Selected ({stagedResearches.totalScience} 🔬, 1 Disc)
              </button>
            </div>
          </div>
        )}

        {/* Tray Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>
              <strong>Official Eclipse Rule:</strong> Researched technologies immediately unlock ship parts, structures, and abilities. Costs are discounted based on existing technologies on the corresponding track.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            Close Tray
          </button>
        </div>
      </div>
    </div>
  );
};
