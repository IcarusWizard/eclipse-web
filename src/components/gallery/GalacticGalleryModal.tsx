import React, { useState, useMemo } from 'react';
import {
  NANO_TECHS,
  GRID_TECHS,
  MILITARY_TECHS,
  RARE_TECHS,
  TECH_CATALOG,
} from '../../engine/rules/techData';
import { SHIP_PARTS } from '../../engine/rules/partData';
import {
  getAllSectorsCatalog,
  SectorCatalogEntry,
  DISCOVERY_TILES,
} from '../../engine/rules/sectorData';
import { ALL_FACTIONS } from '../../engine/rules/setup';
import { Technology } from '../../engine/types/tech';
import { ShipPart } from '../../engine/types/blueprints';
import { DiscoveryTile } from '../../engine/types/galaxy';
import { FactionInfo } from '../../engine/types/player';
import {
  BookOpen,
  X,
  Search,
  Zap,
  Crosshair,
  Shield,
  Heart,
  Navigation,
  Sparkles,
  Layers,
  Globe,
  Radio,
  Award,
  Users,
  CheckCircle2,
  Lock,
  Compass,
} from 'lucide-react';

interface GalacticGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: GalleryTab;
}

export type GalleryTab =
  | 'techs'
  | 'parts'
  | 'sectors'
  | 'discoveries'
  | 'factions'
  | 'reputation';

export const GalacticGalleryModal: React.FC<GalacticGalleryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'techs',
}) => {
  const [activeTab, setActiveTab] = useState<GalleryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [techCategory, setTechCategory] = useState<string>('all');
  const [partCategory, setPartCategory] = useState<string>('all');
  const [sectorCategory, setSectorCategory] = useState<string>('all');
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('all');

  // Reset search when switching tabs
  const handleTabChange = (tab: GalleryTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // 1. Technologies Catalog
  const allTechs = useMemo<Technology[]>(() => {
    return [...NANO_TECHS, ...GRID_TECHS, ...MILITARY_TECHS, ...RARE_TECHS];
  }, []);

  const filteredTechs = useMemo(() => {
    return allTechs.filter((tech) => {
      const matchesCat =
        techCategory === 'all' || tech.category === techCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        tech.description.toLowerCase().includes(q) ||
        (tech.unlocksPartId && tech.unlocksPartId.toLowerCase().includes(q)) ||
        (tech.unlocksStructure && tech.unlocksStructure.toLowerCase().includes(q)) ||
        (tech.unlocksAbility && tech.unlocksAbility.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allTechs, techCategory, searchQuery]);

  // 2. Ship Parts Catalog
  const allParts = useMemo<ShipPart[]>(() => {
    return Object.values(SHIP_PARTS);
  }, []);

  const filteredParts = useMemo(() => {
    return allParts.filter((part) => {
      const matchesCat =
        partCategory === 'all' || part.category === partCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        part.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [allParts, partCategory, searchQuery]);

  // 3. Sector Tiles Catalog
  const allSectors = useMemo<SectorCatalogEntry[]>(() => {
    return getAllSectorsCatalog();
  }, []);

  const filteredSectors = useMemo(() => {
    return allSectors.filter((sec) => {
      const matchesCat =
        sectorCategory === 'all' || sec.category === sectorCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sec.name.toLowerCase().includes(q) ||
        String(sec.sectorNumber).includes(q) ||
        (sec.factionName && sec.factionName.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allSectors, sectorCategory, searchQuery]);

  // 4. Discovery Tiles Catalog
  // Group 36 discovery tiles by unique name and count
  const groupedDiscoveries = useMemo(() => {
    const map = new Map<string, { tile: DiscoveryTile; count: number }>();
    for (const t of DISCOVERY_TILES) {
      if (!map.has(t.name)) {
        map.set(t.name, { tile: t, count: 1 });
      } else {
        map.get(t.name)!.count++;
      }
    }
    return Array.from(map.values());
  }, []);

  const filteredDiscoveries = useMemo(() => {
    return groupedDiscoveries.filter(({ tile }) => {
      let cat = 'special';
      if (tile.immediateReward?.materials || tile.immediateReward?.science || tile.immediateReward?.money) {
        cat = 'resources';
      } else if (tile.unlockedShipPartId) {
        cat = 'modules';
      }
      const matchesCat =
        discoveryCategory === 'all' || discoveryCategory === cat;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tile.name.toLowerCase().includes(q) ||
        tile.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [groupedDiscoveries, discoveryCategory, searchQuery]);

  // 5. Factions Catalog
  const filteredFactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_FACTIONS.filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.traitDescription.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-slate-100 flex items-center gap-2">
                <span>GALACTIC COMPENDIUM & DATA GALLERY</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                  Official 2nd Dawn Database
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspect all authentic technologies, ship components, sector tiles, discovery rewards, alien factions, and reputation odds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close Gallery"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {[
              { id: 'techs', label: 'Technologies', count: allTechs.length, icon: Sparkles },
              { id: 'parts', label: 'Ship Parts', count: allParts.length, icon: Zap },
              { id: 'sectors', label: 'Sector Tiles', count: allSectors.length, icon: Compass },
              { id: 'discoveries', label: 'Discoveries', count: '36', icon: Award },
              { id: 'factions', label: 'Factions', count: ALL_FACTIONS.length, icon: Users },
              { id: 'reputation', label: 'Reputation Bag', count: '33', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as GalleryTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                      active ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          {activeTab !== 'reputation' && (
            <div className="relative min-w-[200px] sm:min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ===================== TAB 1: TECHNOLOGIES ===================== */}
          {activeTab === 'techs' && (
            <div>
              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: 'All Technologies', count: allTechs.length },
                  { id: 'military', label: 'Military (Red)', count: MILITARY_TECHS.length },
                  { id: 'grid', label: 'Grid (Green)', count: GRID_TECHS.length },
                  { id: 'nano', label: 'Nano (Blue)', count: NANO_TECHS.length },
                  { id: 'rare', label: 'Rare Techs (Purple)', count: RARE_TECHS.length },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setTechCategory(chip.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      techCategory === chip.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {chip.label} ({chip.count})
                  </button>
                ))}
              </div>

              {/* Grid of Tech Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTechs.map((tech) => {
                  const isRare = tech.category === 'rare';
                  const catColor =
                    tech.category === 'military'
                      ? 'border-rose-500/40 bg-rose-950/10 text-rose-300'
                      : tech.category === 'grid'
                      ? 'border-emerald-500/40 bg-emerald-950/10 text-emerald-300'
                      : tech.category === 'nano'
                      ? 'border-cyan-500/40 bg-cyan-950/10 text-cyan-300'
                      : 'border-purple-500/40 bg-purple-950/10 text-purple-300';

                  return (
                    <div
                      key={tech.id}
                      className={`p-4 rounded-xl border bg-slate-950/80 flex flex-col justify-between hover:border-slate-600 transition-all ${
                        isRare ? 'border-purple-500/40' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{tech.name}</span>
                            {tech.victoryPoints ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                                {tech.victoryPoints} VP
                              </span>
                            ) : null}
                          </h4>
                          <span
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${catColor}`}
                          >
                            {tech.category} {tech.tier ? `T${tech.tier}` : 'Rare'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                          {tech.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Base Science Cost:</span>
                          <span className="text-cyan-300 font-bold">{tech.baseCost} Science</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Minimum Cost:</span>
                          <span className="text-slate-300">{tech.minCost} Science</span>
                        </div>
                        {tech.unlocksPartId && (
                          <div className="flex justify-between text-amber-400">
                            <span>Unlocks Component:</span>
                            <span className="font-sans font-semibold">{tech.unlocksPartId}</span>
                          </div>
                        )}
                        {tech.unlocksStructure && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Unlocks Structure:</span>
                            <span className="font-sans font-semibold uppercase">{tech.unlocksStructure}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 2: SHIP PARTS ===================== */}
          {activeTab === 'parts' && (
            <div>
              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: 'All Components' },
                  { id: 'cannon', label: 'Cannons' },
                  { id: 'missile', label: 'Missiles' },
                  { id: 'shield', label: 'Shields' },
                  { id: 'computer', label: 'Computers' },
                  { id: 'drive', label: 'Drives' },
                  { id: 'reactor', label: 'Power Sources' },
                  { id: 'hull', label: 'Hulls' },
                ].map((chip) => {
                  const count =
                    chip.id === 'all'
                      ? allParts.length
                      : allParts.filter((p) => p.category === chip.id).length;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setPartCategory(chip.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        partCategory === chip.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {chip.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Grid of Ship Parts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredParts.map((part) => {
                  const STANDARD_IDS = ['nuclear_source', 'nuclear_drive', 'electron_computer', 'ion_cannon', 'hull'];
                  const ANCIENT_DISCOVERY_IDS = [
                    'ion_disruptor', 'ion_turret', 'plasma_turret', 'soliton_charger',
                    'ion_missile', 'axion_computer', 'antimatter_missile', 'muon_source',
                    'flux_shield', 'conformal_drive', 'nonlinear_drive', 'shard_hull',
                    'hypergrid_source', 'inversion_shield', 'soliton_missile',
                  ];
                  const isStandard = STANDARD_IDS.includes(part.id);
                  const isAncient = ANCIENT_DISCOVERY_IDS.includes(part.id);
                  const isRareTech = [
                    'conifold_field', 'absorption_shield', 'sentient_hull',
                    'soliton_cannon', 'transition_drive', 'flux_missile', 'zero_point_source',
                  ].includes(part.id);

                  return (
                    <div
                      key={part.id}
                      className={`p-3.5 rounded-xl border bg-slate-950/90 flex flex-col justify-between hover:border-slate-600 transition-all ${
                        isAncient
                          ? 'border-amber-500/40 bg-amber-950/10'
                          : isRareTech
                          ? 'border-purple-500/40 bg-purple-950/10'
                          : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                            <span>{part.name}</span>
                          </h4>
                          <span
                            className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold shrink-0 ${
                              isAncient
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : isRareTech
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : isStandard
                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {isAncient ? 'Ancient' : isRareTech ? 'Rare Tech' : isStandard ? 'Standard' : 'Research'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 uppercase font-mono mb-2">
                          Category: <span className="text-slate-200">{part.category}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/70 grid grid-cols-2 gap-1 text-[11px] font-mono">
                        {part.powerProduced > 0 && (
                          <div className="text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> +{part.powerProduced} Pwr
                          </div>
                        )}
                        {part.powerConsumed > 0 && (
                          <div className="text-amber-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> -{part.powerConsumed} Pwr
                          </div>
                        )}
                        {part.dice && (
                          <div className="col-span-2 text-orange-400 flex items-center gap-1 font-semibold">
                            <Crosshair className="w-3 h-3" />
                            {part.dice.map((d) => `${d.count} ${d.color} die (${d.damagePerHit} dmg)`).join(', ')}
                          </div>
                        )}
                        {part.driveSpeed && (
                          <div className="text-cyan-400 flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Speed {part.driveSpeed}
                          </div>
                        )}
                        {part.initiativeBonus > 0 && (
                          <div className="text-violet-400 flex items-center gap-1 font-bold">
                            Init +{part.initiativeBonus}
                          </div>
                        )}
                        {part.computerBonus > 0 && (
                          <div className="text-indigo-400 flex items-center gap-1">
                            <Crosshair className="w-3 h-3" /> +{part.computerBonus} Hit
                          </div>
                        )}
                        {part.shieldBonus > 0 && (
                          <div className="text-blue-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> -{part.shieldBonus} Shield
                          </div>
                        )}
                        {part.hullBonus > 0 && (
                          <div className="text-rose-400 flex items-center gap-1">
                            <Heart className="w-3 h-3" /> +{part.hullBonus} HP
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: SECTOR TILES ===================== */}
          {activeTab === 'sectors' && (
            <div>
              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: 'All Sectors' },
                  { id: 'Galactic Center', label: 'Center (001)' },
                  { id: 'Inner (Ring 1)', label: 'Inner (Ring 1)' },
                  { id: 'Middle (Ring 2)', label: 'Middle (Ring 2)' },
                  { id: 'Guardian', label: 'Guardian Sectors' },
                  { id: 'Home System', label: 'Home Systems' },
                  { id: 'Outer (Ring 3)', label: 'Outer (Ring 3)' },
                ].map((chip) => {
                  const count =
                    chip.id === 'all'
                      ? allSectors.length
                      : allSectors.filter((s) => s.category === chip.id).length;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setSectorCategory(chip.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        sectorCategory === chip.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {chip.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Grid of Sector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSectors.map((sec) => {
                  const wormholeCount = sec.wormholes.filter(Boolean).length;

                  return (
                    <div
                      key={`${sec.category}_${sec.sectorNumber}_${sec.name}`}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col justify-between hover:border-slate-600 transition-all"
                    >
                      <div>
                        {/* Header: Sector #, Name, VP */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black font-mono text-cyan-400">
                                #{String(sec.sectorNumber).padStart(3, '0')}
                              </span>
                              <h4 className="text-sm font-bold text-slate-100">{sec.name}</h4>
                            </div>
                            {sec.factionName && (
                              <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                                Home of: {sec.factionName}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                              {sec.victoryPoints} VP
                            </span>
                          </div>
                        </div>

                        {/* Badges: Ring, Wormholes, Ancients */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {sec.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {wormholeCount} / 6 Wormholes
                          </span>
                          {sec.ancientsCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/50 border border-rose-700/60 text-rose-300 font-mono font-bold">
                              {sec.ancientsCount} Ancient Ship{sec.ancientsCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {sec.guardianCount && sec.guardianCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/60 text-amber-300 font-mono font-bold">
                              1 Guardian Ship (Sector {sec.sectorNumber})
                            </span>
                          )}
                          {sec.hasGCDS && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/50 border border-purple-700/60 text-purple-300 font-mono font-bold">
                              Galactic Center Defense System (GCDS)
                            </span>
                          )}
                          {sec.hasDiscovery && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-700/50 text-cyan-300 font-mono">
                              Discovery Tile Slot
                            </span>
                          )}
                          {sec.hasArtifact && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 border border-amber-700/50 text-amber-300 font-mono">
                              Artifact Controlled
                            </span>
                          )}
                        </div>

                        {/* Planets */}
                        <div className="space-y-1 mb-2">
                          <span className="text-[11px] text-slate-400 font-semibold block">
                            Colonizable Planetary Squares ({sec.planets.length}):
                          </span>
                          {sec.planets.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Empty space sector (no planets)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {sec.planets.map((p, pIdx) => {
                                const resColor =
                                  p.resource === 'money'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : p.resource === 'science'
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    : p.resource === 'material'
                                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                    : 'bg-slate-700/40 text-slate-300 border-slate-600/40';

                                return (
                                  <span
                                    key={pIdx}
                                    className={`text-[10px] px-2 py-0.5 rounded border font-mono flex items-center gap-1 ${resColor}`}
                                  >
                                    <span className="capitalize">{p.resource}</span>
                                    {p.isAdvanced && (
                                      <span className="text-[9px] font-bold text-amber-400">★ ADV</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Wormhole layout mini-diagram */}
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex justify-between items-center">
                        <span>Wormhole Edges:</span>
                        <span className="text-slate-300">
                          {sec.wormholes.map((wh, idx) => (wh ? `E${idx}` : null)).filter(Boolean).join(', ') || 'None'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: DISCOVERIES ===================== */}
          {activeTab === 'discoveries' && (
            <div>
              <div className="p-3 mb-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-300 flex items-center justify-between">
                <span>
                  Official Eclipse: Second Dawn Discovery Tile Bag contains exactly <strong>36 tiles</strong> across <strong>24 distinct types</strong>.
                </span>
                <span className="font-mono font-bold">Total: 36 Tiles</span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: 'All Discovery Tiles' },
                  { id: 'resources', label: 'Resource Caches' },
                  { id: 'modules', label: 'Ancient Ship Modules' },
                  { id: 'special', label: 'Ancient Tech & Structures' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setDiscoveryCategory(chip.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      discoveryCategory === chip.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Grid of Discovery Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDiscoveries.map(({ tile, count }) => (
                  <div
                    key={tile.name}
                    className="p-4 rounded-xl border border-cyan-500/30 bg-slate-950/90 flex flex-col justify-between hover:border-cyan-400/60 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{tile.name}</span>
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                          {count} {count > 1 ? 'copies' : 'copy'} in bag
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {tile.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Alternate Choice:</span>
                        <span className="text-amber-400 font-bold">Keep for 2 VP</span>
                      </div>
                      {tile.unlockedShipPartId && (
                        <div className="flex justify-between text-cyan-400">
                          <span>Unlocks Component:</span>
                          <span className="font-sans">{tile.unlockedShipPartId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== TAB 5: FACTIONS ===================== */}
          {activeTab === 'factions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFactions.map((f: FactionInfo) => (
                <div
                  key={f.id}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-950/90 flex flex-col justify-between hover:border-slate-600 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shadow shrink-0"
                          style={{ backgroundColor: f.defaultColor }}
                        />
                        <h3 className="text-base font-bold text-slate-100 font-display">
                          {f.name}
                        </h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
                        {f.isHuman ? 'Human Civilization' : 'Alien Species'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4 italic">
                      "{f.traitDescription}"
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono mb-4">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Starting Money</span>
                        <span className="text-amber-300 font-bold text-sm">
                          {f.startingResources.money}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Starting Science</span>
                        <span className="text-cyan-300 font-bold text-sm">
                          {f.startingResources.science}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Starting Materials</span>
                        <span className="text-orange-300 font-bold text-sm">
                          {f.startingResources.materials}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Starting Discs</span>
                        <span className="text-slate-200 font-bold text-sm">
                          {f.startingDiscs} Discs
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Colony Ships</span>
                        <span className="text-slate-200 font-bold text-sm">
                          {f.startingColonyShips} Ships
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Trade Ratio</span>
                        <span className="text-slate-200 font-bold text-sm">{f.tradeRatio}:1</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reputation Track Capacity:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {f.reputationSlots} slots
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Action Activations:</span>
                      <span className="font-mono text-slate-200">
                        Explore {f.exploreActivations}, Research {f.researchActivations}, Upgrade {f.upgradeActivations}, Build {f.buildActivations}, Move {f.moveActivations}
                      </span>
                    </div>
                    {f.startingTechIds.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Starting Technologies:</span>
                        <span className="font-mono text-cyan-300">
                          {f.startingTechIds.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===================== TAB 6: REPUTATION BAG ===================== */}
          {activeTab === 'reputation' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h3 className="text-sm font-bold text-cyan-400 font-display uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Official Reputation Bag Composition (33 Tiles Total)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  In Eclipse: Second Dawn for the Galaxy, whenever your fleet engages in combat or destroys enemy ships, you draw reputation tiles from the official 33-tile bag. You choose 1 tile to place on your player board's reputation track, returning the remaining drawn tiles back to the bag.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { vp: 1, count: 16, percentage: '48.5%', color: 'from-amber-700/30 to-amber-900/10' },
                    { vp: 2, count: 9, percentage: '27.3%', color: 'from-amber-600/30 to-amber-800/10' },
                    { vp: 3, count: 5, percentage: '15.2%', color: 'from-amber-500/30 to-amber-700/10' },
                    { vp: 4, count: 3, percentage: '9.1%', color: 'from-amber-400/30 to-amber-600/10' },
                  ].map((tile) => (
                    <div
                      key={tile.vp}
                      className={`p-4 rounded-xl border border-amber-500/30 bg-gradient-to-b ${tile.color} flex flex-col items-center justify-center text-center`}
                    >
                      <span className="text-2xl sm:text-3xl font-black font-display text-amber-300 mb-1">
                        {tile.vp} VP
                      </span>
                      <span className="text-sm font-bold text-slate-100 font-mono mb-0.5">
                        {tile.count} Tiles in Bag
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {tile.percentage} of Bag
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical & Rules Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] text-cyan-400 mb-2">
                    Official Combat Draw Rules
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-200">Participation Draw:</strong> If you engaged in battle in a sector (and at least one ship was destroyed or retreated), you draw 1 tile for participating.
                    </li>
                    <li>
                      <strong className="text-slate-200">Per Ship Destroyed:</strong> You draw +1 additional tile for every enemy ship you destroyed in the battle (Interceptors, Cruisers, Dreadnoughts, Starbases, Ancients, GCDS).
                    </li>
                    <li>
                      <strong className="text-slate-200">Selection:</strong> You inspect all drawn tiles in secret, choose at most 1 tile to place on your reputation track, and return the others to the bag.
                    </li>
                    <li>
                      <strong className="text-slate-200">Track Full Overwrite:</strong> If all slots on your track are occupied, you may replace a lower-value tile with the newly drawn higher-value tile (returning the old one to the bag).
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] text-cyan-400 mb-2">
                    Faction Reputation Slot Limits
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-200">Terran Federation & Variants:</strong> 5 Reputation Slots
                    </li>
                    <li>
                      <strong className="text-slate-200">Hydran Progress:</strong> 4 Reputation Slots
                    </li>
                    <li>
                      <strong className="text-slate-200">Descendants of Draco:</strong> 4 Reputation Slots
                    </li>
                    <li>
                      <strong className="text-slate-200">Orion Hegemony:</strong> 5 Reputation Slots (Militaristic bonus slot)
                    </li>
                    <li>
                      <strong className="text-slate-200">Planta:</strong> 4 Reputation Slots (Offset by +1 VP per controlled sector trait)
                    </li>
                    <li>
                      <strong className="text-slate-200">Eridani Empire:</strong> 4 Reputation Slots
                    </li>
                    <li>
                      <strong className="text-slate-200">Mechanema:</strong> 4 Reputation Slots
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-between items-center text-xs text-slate-500 shrink-0 font-mono">
          <span>Eclipse: Second Dawn for the Galaxy Official Reference</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-all"
          >
            Close Compendium
          </button>
        </div>
      </div>
    </div>
  );
};
