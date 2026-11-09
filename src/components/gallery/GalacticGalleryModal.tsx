import React, { useState, useMemo } from 'react';
import {
  NANO_TECHS,
  GRID_TECHS,
  MILITARY_TECHS,
  RARE_TECHS,
  ALL_RARE_TECHS,
  TECH_CATALOG,
} from '../../engine/rules/techData';
import { SHIP_PARTS } from '../../engine/rules/partData';
import {
  getAllSectorsCatalog,
  SectorCatalogEntry,
  ALL_DISCOVERY_TILES,
} from '../../engine/rules/sectorData';
import { ALL_FACTIONS } from '../../engine/rules/setup';
import { getExpansionForItem } from '../../engine/rules/expansions';
import { ALL_MINOR_SPECIES_TILES } from '../../engine/rules/minorSpecies';
import { Technology } from '../../engine/types/tech';
import { ShipPart } from '../../engine/types/blueprints';
import { DiscoveryTile } from '../../engine/types/galaxy';
import { FactionInfo } from '../../engine/types/player';
import {
  TechTileIconography,
  ShipPartTileIconography,
  ShipPartSlotGraphic,
  SectorPreviewGraphic,
  WarpSectorPreviewGraphic,
  InitiativeBadge,
  PowerCostBadge,
  DiceGraphic,
  BlastPip,
  LightningPip,
  ReactorPowerGraphic,
  DriveGraphic,
  ComputerGraphic,
  ShieldGraphic,
  HullGraphic,
  MissileGraphic,
  getPartTooltip,
} from '../common/PhysicalTileIconography';
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
  Dices,
} from 'lucide-react';

interface GalacticGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: GalleryTab;
}

export type GalleryTab =
  | 'icons'
  | 'techs'
  | 'parts'
  | 'sectors'
  | 'discoveries'
  | 'factions'
  | 'reputation'
  | 'minorSpecies';

const COMBAT_DICE_SPECS = [
  {
    id: 'yellow',
    name: 'Ion Cannon',
    colorName: 'Yellow',
    damage: 1,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-300',
    textColor: 'text-slate-950',
    note: '1 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Always Misses)' },
      { face: 2, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: '1 DMG if Modified ≥ 6' },
      { face: 3, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: '1 DMG if Modified ≥ 6' },
      { face: 4, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: '1 DMG if Modified ≥ 6' },
      { face: 5, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: '1 DMG if Modified ≥ 6' },
      { face: 6, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: true, isBackfire: false, desc: 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'orange',
    name: 'Plasma Cannon',
    colorName: 'Orange',
    damage: 2,
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-300',
    textColor: 'text-slate-950',
    note: '2 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Always Misses)' },
      { face: 2, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: '2 DMG if Modified ≥ 6' },
      { face: 3, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: '2 DMG if Modified ≥ 6' },
      { face: 4, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: '2 DMG if Modified ≥ 6' },
      { face: 5, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: '2 DMG if Modified ≥ 6' },
      { face: 6, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: true, isBackfire: false, desc: 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'blue',
    name: 'Soliton Cannon',
    colorName: 'Blue',
    damage: 3,
    bgColor: 'bg-sky-500',
    borderColor: 'border-sky-300',
    textColor: 'text-slate-950',
    note: '3 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Always Misses)' },
      { face: 2, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: '3 DMG if Modified ≥ 6' },
      { face: 3, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: '3 DMG if Modified ≥ 6' },
      { face: 4, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: '3 DMG if Modified ≥ 6' },
      { face: 5, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: '3 DMG if Modified ≥ 6' },
      { face: 6, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: true, isBackfire: false, desc: 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'red',
    name: 'Antimatter Cannon',
    colorName: 'Red',
    damage: 4,
    bgColor: 'bg-rose-600',
    borderColor: 'border-rose-300',
    textColor: 'text-slate-950',
    note: '4 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Always Misses)' },
      { face: 2, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: '4 DMG if Modified ≥ 6' },
      { face: 3, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: '4 DMG if Modified ≥ 6' },
      { face: 4, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: '4 DMG if Modified ≥ 6' },
      { face: 5, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: '4 DMG if Modified ≥ 6' },
      { face: 6, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: true, isBackfire: false, desc: 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'purple',
    name: 'Rift Die',
    colorName: 'Purple',
    damage: 0,
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-300',
    textColor: 'text-white',
    note: 'Special Die: Ignores Computers & Shields. Hits are never modified. Backfire (💥) inflicts 1 self-damage to own largest ship equipped with purple dice.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Miss)' },
      { face: 2, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: 'Empty (Miss)' },
      { face: 3, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: '1 Target DMG (0 Self DMG)' },
      { face: 4, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: '2 Target DMG (0 Self DMG)' },
      { face: 5, stars: 3, targetDmg: 3, selfDmg: 1, isCrit: false, isBackfire: true, desc: '3 Target DMG + 1 Self DMG' },
      { face: 6, stars: 0, targetDmg: 0, selfDmg: 1, isCrit: false, isBackfire: true, desc: '0 Target DMG + 1 Self DMG' },
    ],
  },
];

export const renderDieFacePips = (
  dieId: string,
  face: number,
  stars: number,
  isBackfire?: boolean
) => {
  if (dieId === 'purple') {
    const pipColor = '#0f172a';

    if (face === 1 || face === 2) {
      return null; // Empty face on miss side (physical Eclipse Rift die is blank on Faces 1 & 2)
    }

    if (face === 3) {
      return <BlastPip size={15} color={pipColor} />;
    }

    if (face === 4) {
      return (
        <div className="flex items-center justify-center gap-0.5">
          <BlastPip size={11} color={pipColor} />
          <BlastPip size={11} color={pipColor} />
        </div>
      );
    }

    if (face === 5) {
      // Face 5: 2x2 layout for 3 damage stars and 1 self-damage explosion symbol
      return (
        <div className="grid grid-cols-2 gap-0.5 place-items-center w-full h-full p-1">
          <BlastPip size={8.5} color={pipColor} />
          <BlastPip size={8.5} color={pipColor} />
          <BlastPip size={8.5} color={pipColor} />
          <span className="text-[10.5px] leading-none select-none filter drop-shadow-xs">
            💥
          </span>
        </div>
      );
    }

    if (face === 6) {
      // Face 6: 0 damage, 1 self-damage (Backfire explosion only)
      return (
        <div className="flex items-center justify-center leading-none">
          <span className="text-sm select-none filter drop-shadow">💥</span>
        </div>
      );
    }
  }

  // Standard combat dice: Yellow (Ion), Orange (Plasma), Blue (Soliton), Red (Antimatter)
  // Face 1 is empty, Faces 2-5 show roll numbers (2, 3, 4, 5), Face 6 shows damage stars (critical hit)
  if (face === 1) {
    return null; // Empty face on miss side
  }

  if (face >= 2 && face <= 5) {
    return (
      <span className="font-display font-black text-sm leading-none select-none text-slate-950">
        {face}
      </span>
    );
  }

  if (face === 6) {
    const pipColor = '#0f172a';

    if (dieId === 'orange') {
      // Orange (Plasma): 2 stars for Face 6 (2 DMG)
      return (
        <div className="flex items-center justify-center gap-0.5">
          <BlastPip size={11} color={pipColor} />
          <BlastPip size={11} color={pipColor} />
        </div>
      );
    }

    if (dieId === 'blue') {
      // Blue (Soliton): 3 stars for Face 6 (3 DMG)
      return (
        <div className="flex flex-col items-center justify-center -space-y-0.5">
          <div className="flex gap-0.5">
            <BlastPip size={9} color={pipColor} />
            <BlastPip size={9} color={pipColor} />
          </div>
          <BlastPip size={9} color={pipColor} />
        </div>
      );
    }

    if (dieId === 'red') {
      // Red (Antimatter): 4 stars for Face 6 (4 DMG in 2x2 grid)
      return (
        <div className="grid grid-cols-2 gap-0.5 place-items-center">
          <BlastPip size={8.5} color={pipColor} />
          <BlastPip size={8.5} color={pipColor} />
          <BlastPip size={8.5} color={pipColor} />
          <BlastPip size={8.5} color={pipColor} />
        </div>
      );
    }

    // Yellow (Ion): 1 star for Face 6 (1 DMG)
    return <BlastPip size={15} color={pipColor} />;
  }

  return null;
};

export const GalacticGalleryModal: React.FC<GalacticGalleryModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'icons',
}) => {
  const [activeTab, setActiveTab] = useState<GalleryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [techCategory, setTechCategory] = useState<string>('all');
  const [partCategory, setPartCategory] = useState<string>('all');
  const [sectorCategory, setSectorCategory] = useState<string>('all');
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('all');
  const [iconCategory, setIconCategory] = useState<string>('all');
  const [iconViewMode, setIconViewMode] = useState<'tile' | 'slot'>('tile');

  // Reset search when switching tabs
  const handleTabChange = (tab: GalleryTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // 1. Technologies Catalog
  const allTechs = useMemo<Technology[]>(() => {
    return [...NANO_TECHS, ...GRID_TECHS, ...MILITARY_TECHS, ...ALL_RARE_TECHS];
  }, []);

  const filteredTechs = useMemo(() => {
    return allTechs.filter((tech) => {
      const exp = getExpansionForItem(tech.id);
      const matchesCat =
        techCategory === 'all' ||
        (techCategory === 'expansion' ? Boolean(exp) : tech.category === techCategory);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        tech.description.toLowerCase().includes(q) ||
        (tech.unlocksPartId && tech.unlocksPartId.toLowerCase().includes(q)) ||
        (tech.unlocksStructure && tech.unlocksStructure.toLowerCase().includes(q)) ||
        (tech.unlocksAbility && tech.unlocksAbility.toLowerCase().includes(q)) ||
        (exp && (exp.name.toLowerCase().includes(q) || 'expansion'.includes(q)));
      return matchesCat && matchesSearch;
    });
  }, [allTechs, techCategory, searchQuery]);

  // 2. Ship Parts Catalog
  const allParts = useMemo<ShipPart[]>(() => {
    return Object.values(SHIP_PARTS);
  }, []);

  const filteredParts = useMemo(() => {
    return allParts.filter((part) => {
      const exp = getExpansionForItem(part.id);
      const matchesCat =
        partCategory === 'all' ||
        (partCategory === 'expansion' ? Boolean(exp) : part.category === partCategory);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        part.category.toLowerCase().includes(q) ||
        (exp && (exp.name.toLowerCase().includes(q) || 'expansion'.includes(q)));
      return matchesCat && matchesSearch;
    });
  }, [allParts, partCategory, searchQuery]);

  // Iconography Tab Filtered Lists
  const filteredIconParts = useMemo(() => {
    return allParts.filter((part) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        part.category.toLowerCase().includes(q) ||
        part.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (iconCategory === 'all' || iconCategory === 'parts') return true;
      if (iconCategory === 'power') return part.category === 'reactor' || part.powerProduced > 0;
      if (iconCategory === 'drives') return part.category === 'drive';
      if (iconCategory === 'weapons') return part.category === 'cannon' || part.category === 'missile' || Boolean(part.dice);
      if (iconCategory === 'defense') return part.category === 'shield' || part.category === 'hull' || part.shieldBonus > 0 || part.hullBonus > 0;
      if (iconCategory === 'computers') return part.category === 'computer' || part.computerBonus > 0;
      return false;
    });
  }, [allParts, iconCategory, searchQuery]);

  const filteredIconTechs = useMemo(() => {
    return allTechs.filter((tech) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        tech.category.toLowerCase().includes(q) ||
        tech.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (iconCategory === 'all' || iconCategory === 'techs') return true;
      if (iconCategory === 'power') return tech.id.includes('source') || tech.id.includes('energy');
      if (iconCategory === 'drives') return tech.id.includes('drive');
      if (iconCategory === 'weapons') return tech.id.includes('cannon') || tech.id.includes('missile') || tech.id.includes('bomb');
      if (iconCategory === 'defense') return tech.id.includes('shield') || tech.id.includes('hull') || tech.id.includes('field');
      if (iconCategory === 'computers') return tech.id.includes('computer');
      return false;
    });
  }, [allTechs, iconCategory, searchQuery]);

  // 3. Sector Tiles Catalog
  const allSectors = useMemo<SectorCatalogEntry[]>(() => {
    return getAllSectorsCatalog(true);
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
  // Group discovery tiles by unique name and count
  const groupedDiscoveries = useMemo(() => {
    const map = new Map<string, { tile: DiscoveryTile; count: number }>();
    for (const t of ALL_DISCOVERY_TILES) {
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
      const exp = getExpansionForItem(tile.id) || getExpansionForItem(tile.name);
      let cat = 'special';
      if (tile.immediateReward?.materials || tile.immediateReward?.science || tile.immediateReward?.money) {
        cat = 'resources';
      } else if (tile.shipPartId || (tile as any).unlockedShipPartId) {
        cat = 'modules';
      }
      const matchesCat =
        discoveryCategory === 'all' ||
        (discoveryCategory === 'expansion' ? Boolean(exp) : discoveryCategory === cat);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tile.name.toLowerCase().includes(q) ||
        tile.description.toLowerCase().includes(q) ||
        (exp && (exp.name.toLowerCase().includes(q) || 'expansion'.includes(q)));
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

  // 6. Minor Species Catalog
  const filteredMinorSpecies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_MINOR_SPECIES_TILES.filter(
      (tile) =>
        !q ||
        tile.name.toLowerCase().includes(q) ||
        tile.vpDescription.toLowerCase().includes(q) ||
        tile.abilityDescription.toLowerCase().includes(q)
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
              { id: 'icons', label: 'All Icons', count: allParts.length + allTechs.length, icon: Sparkles },
              { id: 'techs', label: 'Technologies', count: allTechs.length, icon: Layers },
              { id: 'parts', label: 'Ship Parts', count: allParts.length, icon: Zap },
              { id: 'sectors', label: 'Sector Tiles', count: allSectors.length, icon: Compass },
              { id: 'discoveries', label: 'Discoveries', count: '36', icon: Award },
              { id: 'factions', label: 'Factions', count: ALL_FACTIONS.length, icon: Users },
              { id: 'reputation', label: 'Reputation Bag', count: '33', icon: Shield },
              { id: 'minorSpecies', label: 'Minor Species', count: ALL_MINOR_SPECIES_TILES.length, icon: Globe },
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
          {/* ===================== TAB 0: ALL ICONS (ICONOGRAPHY GALLERY) ===================== */}
          {activeTab === 'icons' && (
            <div className="space-y-6">
              {/* Category Filter Chips & View Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Icons', count: allParts.length + allTechs.length },
                    { id: 'power', label: 'Power & Reactors' },
                    { id: 'drives', label: 'Drives & Speed' },
                    { id: 'weapons', label: 'Cannons & Missiles' },
                    { id: 'defense', label: 'Shields & Hulls' },
                    { id: 'computers', label: 'Computers' },
                    { id: 'techs', label: 'Tech Tiles', count: allTechs.length },
                    { id: 'parts', label: 'Ship Parts', count: allParts.length },
                    { id: 'symbols', label: 'Core Symbols & Dice' },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setIconCategory(chip.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        iconCategory === chip.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {chip.label} {chip.count !== undefined ? `(${chip.count})` : ''}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle: Physical Card Face vs Blueprint Slot Tile */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-500 text-[10px] uppercase font-mono px-1">Display:</span>
                  <button
                    onClick={() => setIconViewMode('tile')}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                      iconViewMode === 'tile'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Physical Tile
                  </button>
                  <button
                    onClick={() => setIconViewMode('slot')}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                      iconViewMode === 'slot'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Blueprint Slot
                  </button>
                </div>
              </div>

              {/* 1. Core Symbols & Mechanics Reference */}
              {(iconCategory === 'all' || iconCategory === 'symbols') && !searchQuery && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Core Symbols & Mechanics Reference
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Combat Dice */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 block">Combat Dice & Starbursts</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="yellow" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">1 Ion (1★)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="orange" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">2 Plasma (2★)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="blue" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">3 Soliton (3★)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="red" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">4 AM (4★)</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="purple" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Rift Die</span>
                        </div>
                      </div>
                    </div>

                    {/* Power Consumption Badges */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-400 block">Power Cost / Consumption</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Cost 1 ⚡</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Cost 2 ⚡</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={3} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Cost 3 ⚡</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={4} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Cost 4 ⚡</span>
                        </div>
                      </div>
                    </div>

                    {/* Initiative Chevrons */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 block">Initiative Badges (Top-Left)</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+1 Init</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+2 Init</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={3} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+3 Init</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={-1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">-1 Init</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Die Badges */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-cyan-300 block">Targeting, Shields, Hulls & Speed</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <ComputerGraphic computerBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+1 COMP</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <ShieldGraphic shieldBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">-1 Shield</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <HullGraphic hullBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">1 Hull</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DriveGraphic speed={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">Speed 2</span>
                        </div>
                        <div
                          className="flex flex-col items-center cursor-help"
                          title="Jump Drive (7-hex honeycomb): Once per Move activation, this ship may jump to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2 Power."
                        >
                          <DriveGraphic speed={0} isJump={true} size="sm" />
                          <span className="text-[9px] font-mono text-cyan-300 mt-1 font-semibold">Jump Drive</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-300 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-cyan-300">Jump Drive (Honeycomb):</strong> Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2⚡.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Combat Dice 6-Faces Reference Guide */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                          <Dices className="w-4 h-4 text-purple-400" />
                          Combat Dice 6-Faces Reference (All Standard Weapons & Purple Rift Die)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Exact probabilities, target damage, criticals & backfire effects
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {COMBAT_DICE_SPECS.map((die) => (
                          <div
                            key={die.id}
                            className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <DiceGraphic color={die.id} count={1} size="sm" />
                                <span className="text-xs font-bold text-slate-200">
                                  {`${die.name} (${die.colorName})`}
                                </span>
                                {die.damage > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold">
                                    {die.damage} DMG / hit
                                  </span>
                                )}
                                {die.id === 'purple' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono font-bold">
                                    Special Rift Die
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-sans italic">
                                {die.note}
                              </span>
                            </div>

                            {/* 6 Dice Faces Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                              {die.faces.map((f) => (
                                <div
                                  key={f.face}
                                  className="p-2 rounded-md bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-between gap-1 text-center shadow-xs"
                                >
                                  <span className="text-[9.5px] font-mono font-bold text-slate-400">
                                    Face {f.face}
                                  </span>
                                  <div
                                    className={`w-9 h-9 rounded-md ${die.bgColor} border ${die.borderColor} ${die.textColor} flex items-center justify-center shadow select-none relative`}
                                  >
                                    {renderDieFacePips(die.id, f.face, f.stars, f.isBackfire)}
                                  </div>
                                  <div className="text-[9px] font-mono leading-tight">
                                    <span
                                      className={
                                        f.targetDmg > 0
                                          ? 'text-emerald-400 font-bold block'
                                          : 'text-slate-500 block'
                                      }
                                    >
                                      {f.targetDmg > 0 ? `${f.targetDmg} DMG` : 'Miss'}
                                    </span>
                                    {f.selfDmg > 0 ? (
                                      <span className="text-rose-400 font-bold block">
                                        💥 +1 Self
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 block text-[8px] truncate max-w-[80px]" title={f.desc}>
                                        {f.desc}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Ship Component Icons Grid */}
              {filteredIconParts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      Ship Components ({filteredIconParts.length})
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {iconViewMode === 'tile' ? 'Physical Tile Face' : 'Blueprint Slot Tile'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredIconParts.map((part) => {
                      const exp = getExpansionForItem(part.id);
                      return (
                        <div
                          key={part.id}
                          title={getPartTooltip(part)}
                          className="p-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-slate-600 transition-all flex flex-col items-center justify-between gap-3 shadow-md group"
                        >
                          {/* Square Icon Display */}
                          <div className="flex items-center justify-center p-1 w-full">
                            {iconViewMode === 'tile' ? (
                              <ShipPartTileIconography part={part} size="lg" />
                            ) : (
                              <div className="w-24 h-24 sm:w-28 sm:h-28 aspect-square rounded-2xl bg-slate-900/90 border-2 border-slate-700 relative overflow-hidden flex items-center justify-center p-1 shadow-lg shadow-black/60">
                                <ShipPartSlotGraphic part={part} size="lg" />
                              </div>
                            )}
                          </div>

                          {/* Info & Category */}
                          <div className="w-full text-center">
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-cyan-300">
                              {part.name}
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {part.category}
                              </span>
                              {exp && (
                                <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                                  EXP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Technology Tiles Grid */}
              {filteredIconTechs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      Technology Tiles ({filteredIconTechs.length})
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Square Tech Cards
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredIconTechs.map((tech) => {
                      const exp = getExpansionForItem(tech.id);
                      return (
                        <div
                          key={tech.id}
                          title={`${tech.name} (${tech.category.toUpperCase()})\nBase Science Cost: ${tech.baseCost}\n${tech.description}`}
                          className="p-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-slate-600 transition-all flex flex-col items-center justify-between gap-3 shadow-md group"
                        >
                          {/* Square Tech Icon Display */}
                          <div className="flex items-center justify-center p-1 w-full">
                            <TechTileIconography tech={tech} size="lg" />
                          </div>

                          {/* Info & Category */}
                          <div className="w-full text-center">
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-emerald-300">
                              {tech.name}
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {tech.category}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                                {tech.baseCost}⚛
                              </span>
                              {exp && (
                                <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                                  EXP
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
                  { id: 'rare', label: 'Rare Techs (Purple)', count: ALL_RARE_TECHS.length },
                  { id: 'expansion', label: 'Expansions', count: allTechs.filter((t) => Boolean(getExpansionForItem(t.id))).length },
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
                  const exp = getExpansionForItem(tech.id);
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
                      className={`p-4 rounded-xl border flex flex-col justify-between hover:border-slate-600 transition-all ${
                        exp
                          ? 'border-purple-500/60 bg-purple-950/20 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/40'
                          : isRare
                          ? 'border-purple-500/40 bg-slate-950/80'
                          : 'border-slate-800 bg-slate-950/80'
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
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {exp && (
                              <span
                                className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-purple-900/80 border border-purple-400 text-purple-200 flex items-center gap-1 shadow-sm"
                                title={`Expansion: ${exp.name}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {`${exp.name} Expansion`}
                              </span>
                            )}
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${catColor}`}
                            >
                              {tech.category} {tech.tier ? `T${tech.tier}` : 'Rare'}
                            </span>
                          </div>
                        </div>

                        {/* Physical Technology Card Icon + Description */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="shrink-0">
                            <TechTileIconography tech={tech} size="md" className="w-20 h-20 sm:w-22 sm:h-22" />
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed flex-1">
                            {tech.description}
                          </p>
                        </div>
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
                  { id: 'expansion', label: 'Expansions' },
                ].map((chip) => {
                  const count =
                    chip.id === 'all'
                      ? allParts.length
                      : chip.id === 'expansion'
                      ? allParts.filter((p) => Boolean(getExpansionForItem(p.id))).length
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
                    'hypergrid_source', 'inversion_shield', 'soliton_missile', 'rift_conductor',
                    'jump_drive', 'morph_shield',
                  ];
                  const isStandard = STANDARD_IDS.includes(part.id);
                  const isAncient = ANCIENT_DISCOVERY_IDS.includes(part.id);
                  const isRareTech = [
                    'conifold_field', 'absorption_shield', 'sentient_hull',
                    'soliton_cannon', 'transition_drive', 'flux_missile', 'zero_point_source',
                    'rift_cannon',
                  ].includes(part.id);
                  const exp = getExpansionForItem(part.id);

                  return (
                    <div
                      key={part.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between hover:border-slate-600 transition-all ${
                        exp
                          ? 'border-purple-500/60 bg-purple-950/20 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/40'
                          : isAncient
                          ? 'border-amber-500/40 bg-amber-950/10'
                          : isRareTech
                          ? 'border-purple-500/40 bg-purple-950/10'
                          : 'border-slate-800 bg-slate-950/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                            <span>{part.name}</span>
                          </h4>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {exp && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-purple-900/80 border border-purple-400 text-purple-200 flex items-center gap-1 shadow-sm"
                                title={`Expansion: ${exp.name}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {`${exp.name} Expansion`}
                              </span>
                            )}
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
                        </div>

                        {/* Physical Square Component Tile */}
                        <div className="flex items-center gap-3 my-2">
                          <div className="shrink-0">
                            <ShipPartTileIconography part={part} size="md" className="w-20 h-20 sm:w-22 sm:h-22" />
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-col gap-1 flex-1 font-mono">
                            <div>Category: <span className="text-slate-200 font-bold uppercase">{part.category}</span></div>
                            {part.isJumpDrive && (
                              <div className="text-cyan-400 font-bold flex items-center gap-1">
                                <span>Drive:</span>
                                <span className="text-[9.5px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/50">1 Jump / Act</span>
                              </div>
                            )}
                            {part.initiativeBonus !== 0 && (
                              <div className="flex items-center gap-1 text-amber-300 font-bold">
                                <span>Init:</span>
                                <InitiativeBadge init={part.initiativeBonus} size="sm" />
                              </div>
                            )}
                            {part.powerConsumed > 0 && (
                              <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <span>Cost:</span>
                                <PowerCostBadge cost={part.powerConsumed} size="sm" />
                              </div>
                            )}
                          </div>
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
                            {part.dice
                              .map((d) =>
                                d.color === 'purple'
                                  ? `${d.count} Purple Rift die`
                                  : `${d.count} ${d.color} die (${d.damagePerHit} dmg)`
                              )
                              .join(', ')}
                          </div>
                        )}
                        {part.driveSpeed ? (
                          <div className="text-cyan-400 flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Speed {part.driveSpeed}
                          </div>
                        ) : part.isJumpDrive ? (
                          <div className="text-cyan-400 flex items-center gap-1 font-bold">
                            <Navigation className="w-3 h-3" /> Jump 1 Hex
                          </div>
                        ) : null}
                        {part.initiativeBonus > 0 && (
                          <div className="text-violet-400 flex items-center gap-1 font-bold">
                            Init +{part.initiativeBonus}
                          </div>
                        )}
                        {part.computerBonus > 0 && (
                          <div className="text-indigo-400 flex items-center gap-1">
                            <Crosshair className="w-3 h-3" /> +{part.computerBonus} COMP
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
                        {(part.id === 'jump_drive' || (part as any).isJumpDrive) && (
                          <div className="col-span-2 text-cyan-300 flex items-start gap-1.5 font-semibold text-[10px] bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/30">
                            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Jump Traverse:</strong> Non-standard drive. Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2 Power.
                            </span>
                          </div>
                        )}
                        {(part.id === 'morph_shield' || (part as any).morphShield) && (
                          <div className="col-span-2 text-rose-300 flex items-center gap-1 font-semibold text-[10px]">
                            <Heart className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Morph Regen: Non-standard component. Heals 1 HP (removes 1 dmg cube) at end of each round.</span>
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
                  { id: 'Warped Universe', label: 'Warped Universe' },
                  { id: 'Galactic Events', label: 'Galactic Events' },
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredSectors.map((sec) => {
                  const wormholeCount = sec.wormholes.filter(Boolean).length;
                  const isWarp = sec.category === 'Warped Universe' || sec.sectorNumber === 900;
                  const isGE = sec.category === 'Galactic Events';
                  const isGuardian = sec.category === 'Guardian' || (sec.sectorNumber >= 271 && sec.sectorNumber <= 274);

                  if (isWarp) {
                    return (
                      <div
                        key="warped_universe_board"
                        className="col-span-1 md:col-span-2 lg:col-span-3 p-5 rounded-2xl border border-purple-800/80 bg-gradient-to-br from-purple-950/40 via-slate-950/90 to-purple-950/20 hover:border-purple-500 transition-all shadow-xl shadow-purple-950/30 flex flex-col md:flex-row items-center gap-6"
                      >
                        {/* Left: Full 18-Hex Modular Board with 12 Conduits */}
                        <div className="shrink-0 flex items-center justify-center p-3 bg-slate-950/90 rounded-2xl border border-purple-800/60 shadow-inner">
                          <WarpSectorPreviewGraphic size="lg" />
                        </div>

                        {/* Right: Rules and Details */}
                        <div className="flex-1 min-w-0 text-left space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black font-mono text-purple-400">#900</span>
                                <h4 className="text-base font-bold text-slate-100">{sec.name}</h4>
                              </div>
                              <p className="text-xs text-purple-300/90 mt-0.5 font-medium">
                                Warped Universe Expansion • Modular Double-Hex Board (18 Hexes, 9 Double-Hex Tiles)
                              </p>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded bg-purple-900/70 text-purple-200 border border-purple-500/80 font-mono font-bold shadow-sm">
                              WARPED UNIVERSE BOARD
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>⚡</span> 12 Wormhole Conduits (R1, R2, R3)
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                Flow lines create 12 direct conduits linking left and right border sectors across Rings 1, 2, and 3 in exactly 1 Move step.
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>🚀</span> Non-Stopping Transit Zone
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                Ships cannot end their move or stop inside the Warp Sector. Ships transit directly from one border sector to the other.
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>⚖️</span> Tighter Player Balance (2–5 Players)
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                Eliminates dead space in 2-player to 5-player galaxies. Guardian sectors are replaced by large modular warp sectors.
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>🔬</span> Wormhole Generator Synergy
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                With Wormhole Generator researched, a conduit connection is valid as long as either sector holds a wormhole on the conduit edge.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${sec.category}_${sec.sectorNumber}_${sec.name}`}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all group ${
                        isGE
                          ? 'border-emerald-800/60 bg-emerald-950/20 hover:border-emerald-500'
                          : isGuardian
                          ? 'border-amber-800/60 bg-amber-950/20 hover:border-amber-500'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        {/* Header: Sector #, Name, VP */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black font-mono ${isGE ? 'text-emerald-400' : isGuardian ? 'text-amber-400' : 'text-cyan-400'}`}>
                                #{String(sec.sectorNumber).padStart(3, '0')}
                              </span>
                              <h4 className="text-sm font-bold text-slate-100 truncate">{sec.name}</h4>
                            </div>
                            {sec.factionName && (
                              <div className={`text-[10px] font-semibold mt-0.5 truncate ${isGE ? 'text-emerald-300/90' : 'text-amber-400'}`}>
                                {sec.category === 'Home System' ? `Home of: ${sec.factionName}` : sec.factionName}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sec.victoryPoints > 0 ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                                ★ {sec.victoryPoints} VP
                              </span>
                            ) : isGE ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/60 font-mono font-bold">
                                EVENT
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Graphic Preview & Key Stats Side-by-Side */}
                        <div className="flex items-center gap-3 my-2.5">
                          {/* Hexagonal Sector Preview Graphic */}
                          <div className="shrink-0 flex items-center justify-center p-1 bg-slate-900/60 rounded-xl border border-slate-800 shadow-md shadow-black/50">
                            <SectorPreviewGraphic sector={sec} size="md" className="w-24 h-24 sm:w-26 sm:h-26" />
                          </div>

                          {/* Badges and Encounters */}
                          <div className="text-[10px] text-slate-400 flex flex-col gap-1.5 flex-1 font-mono min-w-0">
                            <div className="flex flex-wrap gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] ${isGE ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-300'}`}>
                                {sec.category} (Ring {sec.ring})
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9.5px]">
                                {wormholeCount} / 6 Wormholes
                              </span>
                            </div>

                            {sec.ancientsCount > 0 && (
                              <div className="text-rose-400 font-bold flex items-center gap-1">
                                <span>Ancients:</span>
                                <span className="px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-600/60 text-rose-200">
                                  {sec.ancientsCount} Ancient Ship{sec.ancientsCount > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {sec.guardianCount && sec.guardianCount > 0 && (
                              <div className="text-amber-400 font-bold flex items-center gap-1">
                                <span>Guardian:</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-600/60 text-amber-200">
                                  1 Guardian Ship
                                </span>
                              </div>
                            )}

                            {sec.hasGCDS && (
                              <div className="text-purple-300 font-bold flex items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500 text-purple-200">
                                  GCDS Defense System
                                </span>
                              </div>
                            )}

                            {sec.hasDiscovery && (
                              <div className="text-amber-300 flex items-center gap-1">
                                <span>Discovery:</span>
                                <span className="text-amber-400 font-bold">1 Discovery Tile</span>
                              </div>
                            )}

                            {sec.hasArtifact && (
                              <div className="text-cyan-300 flex items-center gap-1">
                                <span>Artifact:</span>
                                <span className="text-cyan-400 font-bold">Controlled</span>
                              </div>
                            )}

                            {sec.hasWarpPortal && (
                              <div className="text-purple-300 flex items-center gap-1">
                                <span>Portal:</span>
                                <span className="text-purple-400 font-bold">Warp Portal (+2 VP)</span>
                              </div>
                            )}
                          </div>
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

                        {/* Galactic Events Rules Summary */}
                        {isGE && (
                          <div className="p-2 mb-2 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-[10px] text-emerald-200 space-y-0.5">
                            <span className="font-bold text-emerald-300 block">
                              {sec.sectorNumber === 295 || sec.sectorNumber === 395
                                ? 'Nebula (3 Subsectors):'
                                : sec.sectorNumber === 393 || sec.sectorNumber === 394
                                ? 'Pulsar (3 Action Spaces):'
                                : sec.sectorNumber === 397 || sec.sectorNumber === 398
                                ? 'Supernova (Instability Check):'
                                : 'Black Hole (Spacetime Anomaly):'}
                            </span>
                            <span className="text-slate-300 leading-snug block">
                              {sec.sectorNumber === 295 || sec.sectorNumber === 395
                                ? 'No influence space. Ships enter subsector by edge. Subsector 3 holds an Ancient; Sub 1 & 2 have Discovery Tiles.'
                                : sec.sectorNumber === 393 || sec.sectorNumber === 394
                                ? 'Replaces influence disc space with Move, Build, and Upgrade. Shift disc once per round for a free action activation.'
                                : sec.sectorNumber === 397 || sec.sectorNumber === 398
                                ? '5 rich planets. Instability Check in Cleanup (2 yellow dice + highest tech track). If Sum < Round, star explodes!'
                                : 'No influence space. Entering ships claim discovery and enter transit. Yellow die roll determines return round.'}
                            </span>
                          </div>
                        )}
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
                  Official Eclipse: Second Dawn Discovery Tile Bag contains <strong>36 base tiles</strong> across <strong>24 distinct types</strong>, plus active expansion modules.
                </span>
                <span className="font-mono font-bold">Catalog: {groupedDiscoveries.length} Types</span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: 'All Discovery Tiles' },
                  { id: 'resources', label: 'Resource Caches' },
                  { id: 'modules', label: 'Ancient Ship Modules' },
                  { id: 'special', label: 'Ancient Tech & Structures' },
                  { id: 'expansion', label: 'Expansions' },
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
                {filteredDiscoveries.map(({ tile, count }) => {
                  const exp = getExpansionForItem(tile.id) || getExpansionForItem(tile.name);
                  return (
                    <div
                      key={tile.name}
                      className={`p-4 rounded-xl border flex flex-col justify-between hover:border-cyan-400/60 transition-all ${
                        exp
                          ? 'border-purple-500/60 bg-purple-950/20 shadow-md shadow-purple-950/30 ring-1 ring-purple-500/40'
                          : 'border-cyan-500/30 bg-slate-950/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            <Award className={`w-4 h-4 shrink-0 ${exp ? 'text-purple-400' : 'text-cyan-400'}`} />
                            <span>{tile.name}</span>
                          </h4>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {exp && (
                              <span
                                className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-purple-900/80 border border-purple-400 text-purple-200 flex items-center gap-1 shadow-sm"
                                title={`Expansion: ${exp.name}`}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {`${exp.name} Expansion`}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                              {count} {count > 1 ? 'copies' : 'copy'} in bag
                            </span>
                          </div>
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
                      {(tile.shipPartId || (tile as any).unlockedShipPartId) && (() => {
                        const partId = tile.shipPartId || (tile as any).unlockedShipPartId;
                        const part = SHIP_PARTS[partId];
                        return (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-cyan-400">
                              <span>Unlocks Component:</span>
                              <span className="font-sans font-semibold">{partId}</span>
                            </div>
                            {part && (
                              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div className="shrink-0">
                                    <ShipPartTileIconography part={part} size="md" className="w-18 h-18 sm:w-20 sm:h-20" />
                                  </div>
                                  <div>
                                    <span className="text-xs text-amber-300 font-sans font-bold block">
                                      {part.name}
                                    </span>
                                    {part.isJumpDrive && (
                                      <span className="text-[10px] text-cyan-300 font-sans font-semibold block mt-0.5">
                                        Jump Traverse: 1 jump/act across non-wormholes (2⚡)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* ===================== TAB 5: FACTIONS ===================== */}
          {activeTab === 'factions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFactions.map((f: FactionInfo) => {
                const exp = getExpansionForItem(f.id);
                return (
                  <div
                    key={f.id}
                    className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                      exp
                        ? 'border-purple-500/50 bg-purple-950/20 shadow-md shadow-purple-950/20 hover:border-purple-400/80'
                        : 'border-slate-800 bg-slate-950/90 hover:border-slate-600'
                    }`}
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
                        <div className="flex items-center gap-1.5">
                          {exp && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-purple-900/80 border border-purple-500/60 text-purple-200 font-mono font-semibold">
                              {exp.name}
                            </span>
                          )}
                          <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
                            {f.isHuman ? 'Human Civilization' : 'Alien Species'}
                          </span>
                        </div>
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
              );
            })}
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

          {/* ===================== TAB 7: MINOR SPECIES ===================== */}
          {activeTab === 'minorSpecies' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    Minor Species Expansion: Ambassador Tiles (9 Authentic Tiles)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold uppercase">
                    Minor Species Expansion
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In games with the Minor Species expansion, 4 random Minor Species Ambassador Tiles are placed in the play area. During their actions, any player can pay the Money cost to place a tile on an empty Ambassador space on their Reputation Track, gaining powerful permanent discounts and endgame Victory Points.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {filteredMinorSpecies.map((tile) => (
                    <div
                      key={tile.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-bold text-slate-100">{tile.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 shrink-0">
                            {tile.cost} Money
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-400 mb-2">
                          {tile.vpDescription}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                          {tile.abilityDescription}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Ambassador Tile</span>
                        <span className="text-emerald-400 font-bold">Minor Species</span>
                      </div>
                    </div>
                  ))}
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
