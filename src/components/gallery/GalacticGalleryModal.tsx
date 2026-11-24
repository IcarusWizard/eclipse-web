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
import {
  NEUTRAL_SHIP_BLUEPRINTS,
  NeutralShipBlueprint,
  NeutralShipType,
  NeutralShipVariant,
} from '../../engine/rules/neutralShips';
import { NeutralShipBlueprintLayout } from '../blueprints/NeutralShipBlueprintLayout';
import { FactionSheetCard } from '../common/FactionSheetCard';
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
import { useLanguage, AppLanguage } from '../../i18n/LanguageContext';
import {
  translateTechName,
  translateTechDesc,
  translateTechCategory,
  translatePartName,
  translateFactionName,
  translateFactionTrait,
  translateExpansionName,
  translateMinorSpeciesName,
  translateNeutralBlueprintTitle,
  translateResourceType,
  translateShipType,
} from '../../i18n/catalogTranslations';

const MINOR_SPECIES_DETAILS_ZH: Record<string, { vp: string; ability: string }> = {
  minor_species_reputation_vp: {
    vp: '终局每拥有 1 枚声望板块得 1 VP',
    ability: '游戏结束时，声望轨上每有 1 枚声望板块便额外获得 1 分。',
  },
  minor_species_ambassador_vp: {
    vp: '终局每有 1 枚大使板块（含自身）得 1 VP',
    ability: '游戏结束时，你的势力和声望轨上每有 1 枚大使板块（含本板块）获得 1 分。',
  },
  minor_species_flat_vp: {
    vp: '终局固定得 3 VP',
    ability: '游戏结束时直接获得 3 点胜利点数。',
  },
  minor_species_population_cube: {
    vp: '终局得 1 VP',
    ability: '立即从任一资源人口轨拿取 1 枚人口方块放置在本板块上（等同提前释放产出）；终局得 1 分。',
  },
  minor_species_cruiser_discount: {
    vp: '终局得 1 VP',
    ability: '建造巡洋舰时费用减少 1 点材料；终局得 1 分。',
  },
  minor_species_dreadnought_discount: {
    vp: '终局得 1 VP',
    ability: '建造无畏舰时费用减少 2 点材料；终局得 1 分。',
  },
  minor_species_orbital_discount: {
    vp: '终局得 1 VP',
    ability: '建造轨道站时费用减少 1 点材料；终局得 1 分。',
  },
  minor_species_monolith_discount: {
    vp: '终局得 1 VP',
    ability: '建造巨石碑时费用减少 2 点材料；终局得 1 分。',
  },
  minor_species_tech_discount: {
    vp: '终局得 1 VP',
    ability: '研究科技时减少 1 点科研费用（仍受科技最低费用限制）；终局得 1 分。',
  },
};

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
  | 'npcs'
  | 'reputation'
  | 'minorSpecies';

const getCombatDiceSpecs = (language: AppLanguage) => [
  {
    id: 'yellow',
    name: language === 'zh' ? '离子加农炮' : 'Ion Cannon',
    colorName: language === 'zh' ? '黄骰' : 'Yellow',
    damage: 1,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-300',
    textColor: 'text-slate-950',
    note:
      language === 'zh'
        ? '每次命中造成 1 点伤害。骰面 + 计算机 - 敌方护盾 ≥ 6 时命中。'
        : '1 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（必定失手）' : 'Empty (Always Misses)' },
      { face: 2, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 1 伤害' : '1 DMG if Modified ≥ 6' },
      { face: 3, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 1 伤害' : '1 DMG if Modified ≥ 6' },
      { face: 4, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 1 伤害' : '1 DMG if Modified ≥ 6' },
      { face: 5, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 1 伤害' : '1 DMG if Modified ≥ 6' },
      { face: 6, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: true, isBackfire: false, desc: language === 'zh' ? '星爆！必定命中' : 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'orange',
    name: language === 'zh' ? '等离子加农炮' : 'Plasma Cannon',
    colorName: language === 'zh' ? '橙骰' : 'Orange',
    damage: 2,
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-300',
    textColor: 'text-slate-950',
    note:
      language === 'zh'
        ? '每次命中造成 2 点伤害。骰面 + 计算机 - 敌方护盾 ≥ 6 时命中。'
        : '2 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（必定失手）' : 'Empty (Always Misses)' },
      { face: 2, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 2 伤害' : '2 DMG if Modified ≥ 6' },
      { face: 3, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 2 伤害' : '2 DMG if Modified ≥ 6' },
      { face: 4, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 2 伤害' : '2 DMG if Modified ≥ 6' },
      { face: 5, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 2 伤害' : '2 DMG if Modified ≥ 6' },
      { face: 6, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: true, isBackfire: false, desc: language === 'zh' ? '星爆！必定命中' : 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'blue',
    name: language === 'zh' ? '孤子加农炮' : 'Soliton Cannon',
    colorName: language === 'zh' ? '蓝骰' : 'Blue',
    damage: 3,
    bgColor: 'bg-sky-500',
    borderColor: 'border-sky-300',
    textColor: 'text-slate-950',
    note:
      language === 'zh'
        ? '每次命中造成 3 点伤害。骰面 + 计算机 - 敌方护盾 ≥ 6 时命中。'
        : '3 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（必定失手）' : 'Empty (Always Misses)' },
      { face: 2, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 3 伤害' : '3 DMG if Modified ≥ 6' },
      { face: 3, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 3 伤害' : '3 DMG if Modified ≥ 6' },
      { face: 4, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 3 伤害' : '3 DMG if Modified ≥ 6' },
      { face: 5, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 3 伤害' : '3 DMG if Modified ≥ 6' },
      { face: 6, stars: 3, targetDmg: 3, selfDmg: 0, isCrit: true, isBackfire: false, desc: language === 'zh' ? '星爆！必定命中' : 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'red',
    name: language === 'zh' ? '反物质加农炮' : 'Antimatter Cannon',
    colorName: language === 'zh' ? '红骰' : 'Red',
    damage: 4,
    bgColor: 'bg-rose-600',
    borderColor: 'border-rose-300',
    textColor: 'text-slate-950',
    note:
      language === 'zh'
        ? '每次命中造成 4 点伤害。骰面 + 计算机 - 敌方护盾 ≥ 6 时命中。'
        : '4 DMG per hit. Hits when Roll + Computers - Shields ≥ 6.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（必定失手）' : 'Empty (Always Misses)' },
      { face: 2, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 4 伤害' : '4 DMG if Modified ≥ 6' },
      { face: 3, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 4 伤害' : '4 DMG if Modified ≥ 6' },
      { face: 4, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 4 伤害' : '4 DMG if Modified ≥ 6' },
      { face: 5, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '修正 ≥ 6 时 4 伤害' : '4 DMG if Modified ≥ 6' },
      { face: 6, stars: 4, targetDmg: 4, selfDmg: 0, isCrit: true, isBackfire: false, desc: language === 'zh' ? '星爆！必定命中' : 'Critical Hit! Always Hits' },
    ],
  },
  {
    id: 'purple',
    name: language === 'zh' ? '裂隙骰' : 'Rift Die',
    colorName: language === 'zh' ? '紫骰' : 'Purple',
    damage: 0,
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-300',
    textColor: 'text-white',
    note:
      language === 'zh'
        ? '特殊骰子：无视计算机与护盾修正。回火 (💥) 会对己方装配裂隙武器中体型最大的舰船造成 1 点自伤。'
        : 'Special Die: Ignores Computers & Shields. Hits are never modified. Backfire (💥) inflicts 1 self-damage to own largest ship equipped with purple dice.',
    faces: [
      { face: 1, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（失手）' : 'Empty (Miss)' },
      { face: 2, stars: 0, targetDmg: 0, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '空白（失手）' : 'Empty (Miss)' },
      { face: 3, stars: 1, targetDmg: 1, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '1 点目标伤害 (0 自伤)' : '1 Target DMG (0 Self DMG)' },
      { face: 4, stars: 2, targetDmg: 2, selfDmg: 0, isCrit: false, isBackfire: false, desc: language === 'zh' ? '2 点目标伤害 (0 自伤)' : '2 Target DMG (0 Self DMG)' },
      { face: 5, stars: 3, targetDmg: 3, selfDmg: 1, isCrit: false, isBackfire: true, desc: language === 'zh' ? '3 点目标伤害 + 1 自伤' : '3 Target DMG + 1 Self DMG' },
      { face: 6, stars: 0, targetDmg: 0, selfDmg: 1, isCrit: false, isBackfire: true, desc: language === 'zh' ? '0 目标伤害 + 1 自伤' : '0 Target DMG + 1 Self DMG' },
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
  const { l, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<GalleryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [techCategory, setTechCategory] = useState<string>('all');
  const [partCategory, setPartCategory] = useState<string>('all');
  const [sectorCategory, setSectorCategory] = useState<string>('all');
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('all');
  const [factionCategory, setFactionCategory] = useState<'all' | 'alien' | 'human'>('all');
  const [iconCategory, setIconCategory] = useState<string>('all');
  const [iconViewMode, setIconViewMode] = useState<'tile' | 'slot'>('tile');
  const combatDiceSpecs = useMemo(() => getCombatDiceSpecs(language), [language]);

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
      const zhName = translateTechName(tech.id, tech.name, 'zh').toLowerCase();
      const zhDesc = translateTechDesc(tech.id, tech.description, 'zh').toLowerCase();
      const matchesSearch =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        zhName.includes(q) ||
        tech.description.toLowerCase().includes(q) ||
        zhDesc.includes(q) ||
        (tech.unlocksPartId && tech.unlocksPartId.toLowerCase().includes(q)) ||
        (tech.unlocksStructure && tech.unlocksStructure.toLowerCase().includes(q)) ||
        (tech.unlocksAbility && tech.unlocksAbility.toLowerCase().includes(q)) ||
        (exp && (exp.name.toLowerCase().includes(q) || translateExpansionName(exp.id, exp.name, 'zh').toLowerCase().includes(q) || 'expansion'.includes(q)));
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
      const zhName = translatePartName(part.id, part.name, 'zh').toLowerCase();
      const matchesSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        zhName.includes(q) ||
        part.category.toLowerCase().includes(q) ||
        (exp && (exp.name.toLowerCase().includes(q) || translateExpansionName(exp.id, exp.name, 'zh').toLowerCase().includes(q) || 'expansion'.includes(q)));
      return matchesCat && matchesSearch;
    });
  }, [allParts, partCategory, searchQuery]);

  // Iconography Tab Filtered Lists
  const filteredIconParts = useMemo(() => {
    return allParts.filter((part) => {
      const q = searchQuery.toLowerCase().trim();
      const zhName = translatePartName(part.id, part.name, 'zh').toLowerCase();
      const matchesSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        zhName.includes(q) ||
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
      const zhName = translateTechName(tech.id, tech.name, 'zh').toLowerCase();
      const matchesSearch =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        zhName.includes(q) ||
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
    return ALL_FACTIONS.filter((f) => {
      const matchesCat =
        factionCategory === 'all' ||
        (factionCategory === 'alien' ? !f.isHuman : f.isHuman);
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        translateFactionName(f.id, f.name, 'zh').toLowerCase().includes(q) ||
        f.traitDescription.toLowerCase().includes(q) ||
        translateFactionTrait(f.id, f.traitDescription, 'zh').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [factionCategory, searchQuery]);

  // 6. Minor Species Catalog
  const filteredMinorSpecies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_MINOR_SPECIES_TILES.filter(
      (tile) =>
        !q ||
        tile.name.toLowerCase().includes(q) ||
        translateMinorSpeciesName(tile.id, tile.name, 'zh').toLowerCase().includes(q) ||
        tile.vpDescription.toLowerCase().includes(q) ||
        tile.abilityDescription.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // 7. NPC Ship Blueprints Catalog (Ancient, Guardian, GCDS x Default/Advanced/Expert)
  const allNpcBlueprints = useMemo<NeutralShipBlueprint[]>(() => {
    const types: NeutralShipType[] = ['ancient', 'guardian', 'gcds'];
    const variants: NeutralShipVariant[] = ['default', 'advanced', 'expert'];
    return types.flatMap((t) => variants.map((v) => NEUTRAL_SHIP_BLUEPRINTS[t][v]));
  }, []);

  const filteredNpcBlueprints = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allNpcBlueprints.filter(
      (bp) =>
        !q ||
        bp.name.toLowerCase().includes(q) ||
        translateNeutralBlueprintTitle(bp.type, bp.variant, bp.name, 'zh').toLowerCase().includes(q) ||
        bp.type.toLowerCase().includes(q) ||
        bp.variant.toLowerCase().includes(q) ||
        bp.summary.toLowerCase().includes(q)
    );
  }, [allNpcBlueprints, searchQuery]);

  if (!isOpen) return null;

  const galleryTabs = [
    { id: 'icons', label: l('All Icons', '全部图标'), count: allParts.length + allTechs.length, icon: Sparkles },
    { id: 'techs', label: l('Technologies', '科技树'), count: allTechs.length, icon: Layers },
    { id: 'parts', label: l('Ship Parts', '舰船配件'), count: allParts.length, icon: Zap },
    { id: 'sectors', label: l('Sector Tiles', '星区板块'), count: allSectors.length, icon: Compass },
    { id: 'discoveries', label: l('Discoveries', '探索发现'), count: '36', icon: Award },
    { id: 'factions', label: l('Factions', '势力派系'), count: ALL_FACTIONS.length, icon: Users },
    { id: 'npcs', label: l('NPC Blueprints', '中立舰蓝图'), count: allNpcBlueprints.length, icon: Crosshair },
    { id: 'reputation', label: l('Reputation Bag', '声望袋'), count: '33', icon: Shield },
    { id: 'minorSpecies', label: l('Minor Species', '次要种族'), count: ALL_MINOR_SPECIES_TILES.length, icon: Globe },
  ];
  const activeTabLabel = galleryTabs.find((t) => t.id === activeTab)?.label || activeTab;

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
                <span>{l('GALACTIC COMPENDIUM & DATA GALLERY', '星海百科全书与规则图鉴')}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                  {l('Official 2nd Dawn Database', '第二黎明官方资料库')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {l('Inspect all authentic technologies, ship components, sector tiles, discovery rewards, alien factions, and reputation odds.', '浏览全部科技树、舰船配件、星区板块、探索发现、派系特性及声望袋概率构成。')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            aria-label={l('Close Gallery', '关闭图鉴')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {galleryTabs.map((tab) => {
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
                placeholder={l(`Search ${activeTab}...`, `搜索${activeTabLabel}...`)}
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
                    { id: 'all', label: l('All Icons', '全部图标'), count: allParts.length + allTechs.length },
                    { id: 'power', label: l('Power & Reactors', '能源与反应堆') },
                    { id: 'drives', label: l('Drives & Speed', '引擎与航速') },
                    { id: 'weapons', label: l('Cannons & Missiles', '加农炮与导弹') },
                    { id: 'defense', label: l('Shields & Hulls', '护盾与船体') },
                    { id: 'computers', label: l('Computers', '计算机') },
                    { id: 'techs', label: l('Tech Tiles', '科技板块'), count: allTechs.length },
                    { id: 'parts', label: l('Ship Parts', '舰船配件'), count: allParts.length },
                    { id: 'symbols', label: l('Core Symbols & Dice', '核心符号与战斗骰') },
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
                  <span className="text-slate-500 text-[10px] uppercase font-mono px-1">{l('Display:', '显示：')}</span>
                  <button
                    onClick={() => setIconViewMode('tile')}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                      iconViewMode === 'tile'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {l('Physical Tile', '实体板块')}
                  </button>
                  <button
                    onClick={() => setIconViewMode('slot')}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                      iconViewMode === 'slot'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {l('Blueprint Slot', '蓝图槽位')}
                  </button>
                </div>
              </div>

              {/* 1. Core Symbols & Mechanics Reference */}
              {(iconCategory === 'all' || iconCategory === 'symbols') && !searchQuery && (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {l('Core Symbols & Mechanics Reference', '核心符号与战斗机制参考')}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Combat Dice */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 block">{l('Combat Dice & Starbursts', '战斗骰与星爆伤害')}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="yellow" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('1 Ion (1★)', '1 离子 (1★)')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="orange" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('2 Plasma (2★)', '2 等离子 (2★)')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="blue" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('3 Soliton (3★)', '3 孤子 (3★)')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="red" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('4 AM (4★)', '4 反物质 (4★)')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DiceGraphic color="purple" count={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Rift Die', '裂隙骰')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Power Consumption Badges */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-400 block">{l('Power Cost / Consumption', '能量消耗图标')}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Cost 1 ⚡', '耗能 1 ⚡')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Cost 2 ⚡', '耗能 2 ⚡')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={3} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Cost 3 ⚡', '耗能 3 ⚡')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <PowerCostBadge cost={4} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Cost 4 ⚡', '耗能 4 ⚡')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Initiative Chevrons */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 block">{l('Initiative Badges (Top-Left)', '先攻标记（左上角）')}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+1 {l('Init', '先攻')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+2 {l('Init', '先攻')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={3} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+3 {l('Init', '先攻')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <InitiativeBadge init={-1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">-1 {l('Init', '先攻')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Die Badges */}
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-bold text-cyan-300 block">{l('Targeting, Shields, Hulls & Speed', '瞄准、护盾、船体与航速')}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col items-center">
                          <ComputerGraphic computerBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">+1 {l('COMP', '瞄准')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <ShieldGraphic shieldBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">-1 {l('Shield', '护盾')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <HullGraphic hullBonus={1} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">1 {l('Hull', '船体')}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <DriveGraphic speed={2} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400 mt-1">{l('Speed 2', '航速 2')}</span>
                        </div>
                        <div
                          className="flex flex-col items-center cursor-help"
                          title={l(
                            'Jump Drive (7-hex honeycomb): Once per Move activation, this ship may jump to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2 Power.',
                            '跳跃引擎（七角蜂巢徽记）：每次移动激活限一次，该舰船可无视虫洞连接直接跳跃至任意相邻星区（可跨越无虫洞边或封闭边界）。耗能 2⚡。'
                          )}
                        >
                          <DriveGraphic speed={0} isJump={true} size="sm" />
                          <span className="text-[9px] font-mono text-cyan-300 mt-1 font-semibold">{l('Jump Drive', '跳跃引擎')}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-300 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-cyan-300">{l('Jump Drive (Honeycomb):', '跳跃引擎（蜂巢标志）：')}</strong>{' '}
                            {l(
                              'Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2⚡.',
                              '每次移动激活限一次，该舰船可无视虫洞直接进入任意相邻星区（跨越无虫洞边界）。消耗 2⚡ 能量。'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Combat Dice 6-Faces Reference Guide */}
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                          <Dices className="w-4 h-4 text-purple-400" />
                          {l('Combat Dice 6-Faces Reference (All Standard Weapons & Purple Rift Die)', '战斗骰六面详情参考（常规武器骰与紫色裂隙骰）')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {l('Exact probabilities, target damage, criticals & backfire effects', '精确概率分布、目标伤害、星爆必中与裂隙回火机制')}
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {combatDiceSpecs.map((die) => (
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
                                    {l(`${die.damage} DMG / hit`, `命中 ${die.damage} 伤害`)}
                                  </span>
                                )}
                                {die.id === 'purple' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono font-bold">
                                    {l('Special Rift Die', '特殊裂隙骰')}
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
                                    {l(`Face ${f.face}`, `骰面 ${f.face}`)}
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
                                      {f.targetDmg > 0 ? l(`${f.targetDmg} DMG`, `${f.targetDmg} 伤害`) : l('Miss', '失手')}
                                    </span>
                                    {f.selfDmg > 0 ? (
                                      <span className="text-rose-400 font-bold block">
                                        {l('💥 +1 Self', '💥 +1 自伤')}
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
                      {l(`Ship Components (${filteredIconParts.length})`, `舰船配件图标 (${filteredIconParts.length})`)}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {iconViewMode === 'tile' ? l('Physical Tile Face', '实体配件版面') : l('Blueprint Slot Tile', '蓝图槽位样式')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredIconParts.map((part) => {
                      const exp = getExpansionForItem(part.id);
                      const localizedPartName = translatePartName(part.id, part.name, language);
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
                              <div className="w-24 h-24 sm:w-28 sm:h-28 aspect-square rounded-2xl bg-slate-900/90 border-2 border-slate-700 relative overflow-hidden flex items-center justify-center p-0.5 shadow-lg shadow-black/60">
                                <ShipPartSlotGraphic part={part} size="lg" />
                              </div>
                            )}
                          </div>

                          {/* Info & Category */}
                          <div className="w-full text-center">
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-cyan-300">
                              {localizedPartName}
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {part.category}
                              </span>
                              {exp && (
                                <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                                  {l('EXP', '扩展')}
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
                      {l(`Technology Tiles (${filteredIconTechs.length})`, `科技板块图标 (${filteredIconTechs.length})`)}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {l('Square Tech Cards', '方形科技板块')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                    {filteredIconTechs.map((tech) => {
                      const exp = getExpansionForItem(tech.id);
                      const techName = translateTechName(tech.id, tech.name, language);
                      const techDesc = translateTechDesc(tech.id, tech.description, language);
                      const techCat = translateTechCategory(tech.category, language);
                      return (
                        <div
                          key={tech.id}
                          title={`${techName} (${techCat.toUpperCase()})\n${l('Base Science Cost:', '基础科研费用：')} ${tech.baseCost}\n${techDesc}`}
                          className="p-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-slate-600 transition-all flex flex-col items-center justify-between gap-3 shadow-md group"
                        >
                          {/* Square Tech Icon Display */}
                          <div className="flex items-center justify-center p-1 w-full">
                            <TechTileIconography tech={tech} size="lg" />
                          </div>

                          {/* Info & Category */}
                          <div className="w-full text-center">
                            <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-emerald-300">
                              {techName}
                            </span>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                {techCat}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                                {tech.baseCost}⚛
                              </span>
                              {exp && (
                                <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-600/40">
                                  {l('EXP', '扩展')}
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
                  { id: 'all', label: l('All Technologies', '全部科技'), count: allTechs.length },
                  { id: 'military', label: l('Military (Red)', '军事 (红色)'), count: MILITARY_TECHS.length },
                  { id: 'grid', label: l('Grid (Green)', '网格 (绿色)'), count: GRID_TECHS.length },
                  { id: 'nano', label: l('Nano (Blue)', '纳米 (蓝色)'), count: NANO_TECHS.length },
                  { id: 'rare', label: l('Rare Techs (Purple)', '稀有科技 (紫色)'), count: ALL_RARE_TECHS.length },
                  { id: 'expansion', label: l('Expansions', '扩展内容'), count: allTechs.filter((t) => Boolean(getExpansionForItem(t.id))).length },
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
                  const techName = translateTechName(tech.id, tech.name, language);
                  const techDesc = translateTechDesc(tech.id, tech.description, language);
                  const techCat = translateTechCategory(tech.category, language);
                  const expName = exp ? translateExpansionName(exp.id, exp.name, language) : '';
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
                            <span>{techName}</span>
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
                                title={l(`Expansion: ${exp.name}`, `扩展：${expName}`)}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {l(`${exp.name} Expansion`, `${expName}`)}
                              </span>
                            )}
                            <span
                              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${catColor}`}
                            >
                              {techCat} {tech.tier ? `T${tech.tier}` : l('Rare', '稀有')}
                            </span>
                          </div>
                        </div>

                        {/* Physical Technology Card Icon + Description */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="shrink-0">
                            <TechTileIconography tech={tech} size="md" className="w-20 h-20 sm:w-22 sm:h-22" />
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed flex-1">
                            {techDesc}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{l('Base Science Cost:', '基础科研费用：')}</span>
                          <span className="text-cyan-300 font-bold">{l(`${tech.baseCost} Science`, `${tech.baseCost} 科研`)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{l('Minimum Cost:', '最低科研费用：')}</span>
                          <span className="text-slate-300">{l(`${tech.minCost} Science`, `${tech.minCost} 科研`)}</span>
                        </div>
                        {tech.unlocksPartId && (
                          <div className="flex justify-between text-amber-400">
                            <span>{l('Unlocks Component:', '解锁配件：')}</span>
                            <span className="font-sans font-semibold">{translatePartName(tech.unlocksPartId, tech.unlocksPartId, language)}</span>
                          </div>
                        )}
                        {tech.unlocksStructure && (
                          <div className="flex justify-between text-emerald-400">
                            <span>{l('Unlocks Structure:', '解锁建筑：')}</span>
                            <span className="font-sans font-semibold uppercase">
                              {language === 'zh'
                                ? tech.unlocksStructure === 'monolith'
                                  ? '巨石碑'
                                  : translateShipType(tech.unlocksStructure, 'zh')
                                : tech.unlocksStructure}
                            </span>
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
                  { id: 'all', label: l('All Components', '全部配件') },
                  { id: 'cannon', label: l('Cannons', '加农炮') },
                  { id: 'missile', label: l('Missiles', '导弹') },
                  { id: 'shield', label: l('Shields', '护盾') },
                  { id: 'computer', label: l('Computers', '计算机') },
                  { id: 'drive', label: l('Drives', '引擎') },
                  { id: 'reactor', label: l('Power Sources', '能源核心') },
                  { id: 'hull', label: l('Hulls', '船体') },
                  { id: 'expansion', label: l('Expansions', '扩展内容') },
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
                  const partName = translatePartName(part.id, part.name, language);
                  const expName = exp ? translateExpansionName(exp.id, exp.name, language) : '';

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
                            <span>{partName}</span>
                          </h4>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {exp && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-purple-900/80 border border-purple-400 text-purple-200 flex items-center gap-1 shadow-sm"
                                title={l(`Expansion: ${exp.name}`, `扩展：${expName}`)}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {l(`${exp.name} Expansion`, expName)}
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
                              {isAncient
                                ? l('Ancient', '远古')
                                : isRareTech
                                ? l('Rare Tech', '稀有科技')
                                : isStandard
                                ? l('Standard', '基础')
                                : l('Research', '科研')}
                            </span>
                          </div>
                        </div>

                        {/* Physical Square Component Tile */}
                        <div className="flex items-center gap-3 my-2">
                          <div className="shrink-0">
                            <ShipPartTileIconography part={part} size="md" className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-col gap-1 flex-1 font-mono">
                            <div>{l('Category:', '类别：')} <span className="text-slate-200 font-bold uppercase">{part.category}</span></div>
                            {part.isJumpDrive && (
                              <div className="text-cyan-400 font-bold flex items-center gap-1">
                                <span>{l('Drive:', '驱动：')}</span>
                                <span className="text-[9.5px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/50">{l('1 Jump / Act', '每动跳跃 1 次')}</span>
                              </div>
                            )}
                            {part.initiativeBonus !== 0 && (
                              <div className="flex items-center gap-1 text-amber-300 font-bold">
                                <span>{l('Init:', '先攻：')}</span>
                                <InitiativeBadge init={part.initiativeBonus} size="sm" />
                              </div>
                            )}
                            {part.powerConsumed > 0 && (
                              <div className="flex items-center gap-1 text-amber-400 font-bold">
                                <span>{l('Cost:', '耗能：')}</span>
                                <PowerCostBadge cost={part.powerConsumed} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/70 grid grid-cols-2 gap-1 text-[11px] font-mono">
                        {part.powerProduced > 0 && (
                          <div className="text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> +{part.powerProduced} {l('Pwr', '能量')}
                          </div>
                        )}
                        {part.powerConsumed > 0 && (
                          <div className="text-amber-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> -{part.powerConsumed} {l('Pwr', '能量')}
                          </div>
                        )}
                        {part.dice && (
                          <div className="col-span-2 text-orange-400 flex items-center gap-1 font-semibold">
                            <Crosshair className="w-3 h-3" />
                            {part.dice
                              .map((d) =>
                                d.color === 'purple'
                                  ? l(`${d.count} Purple Rift die`, `${d.count} 颗紫色裂隙骰`)
                                  : l(`${d.count} ${d.color} die (${d.damagePerHit} dmg)`, `${d.count} 颗${d.color === 'red' ? '红' : d.color === 'orange' ? '橙' : d.color === 'blue' ? '蓝' : '黄'}骰 (${d.damagePerHit} 伤)`)
                              )
                              .join(', ')}
                          </div>
                        )}
                        {part.driveSpeed ? (
                          <div className="text-cyan-400 flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> {l(`Speed ${part.driveSpeed}`, `航速 ${part.driveSpeed}`)}
                          </div>
                        ) : part.isJumpDrive ? (
                          <div className="text-cyan-400 flex items-center gap-1 font-bold">
                            <Navigation className="w-3 h-3" /> {l('Jump 1 Hex', '跳跃 1 格')}
                          </div>
                        ) : null}
                        {part.initiativeBonus > 0 && (
                          <div className="text-violet-400 flex items-center gap-1 font-bold">
                            {l(`Init +${part.initiativeBonus}`, `先攻 +${part.initiativeBonus}`)}
                          </div>
                        )}
                        {part.computerBonus > 0 && (
                          <div className="text-indigo-400 flex items-center gap-1">
                            <Crosshair className="w-3 h-3" /> +{part.computerBonus} {l('COMP', '瞄准')}
                          </div>
                        )}
                        {part.shieldBonus > 0 && (
                          <div className="text-blue-400 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> -{part.shieldBonus} {l('Shield', '护盾')}
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
                              <strong>{l('Jump Traverse:', '跳跃穿行：')}</strong>{' '}
                              {l(
                                'Non-standard drive. Once per Move activation, this ship may move to any adjacent sector regardless of wormhole connections (crosses non-wormhole edges and closed borders). Consumes 2 Power.',
                                '非标准引擎。每次移动激活限一次，可无视虫洞直接跃迁至任意相邻星区（跨越无虫洞边或封闭边界）。耗能 2⚡。'
                              )}
                            </span>
                          </div>
                        )}
                        {(part.id === 'morph_shield' || (part as any).morphShield) && (
                          <div className="col-span-2 text-rose-300 flex items-center gap-1 font-semibold text-[10px]">
                            <Heart className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{l('Morph Regen: Non-standard component. Heals 1 HP (removes 1 dmg cube) at end of each round.', '变形再生：非标准部件。每个战斗轮结束时恢复 1 点装甲（移除 1 枚伤害标记）。')}</span>
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
                  { id: 'all', label: l('All Sectors', '全部星区') },
                  { id: 'Galactic Center', label: l('Center (001)', '银河中心 (001)') },
                  { id: 'Inner (Ring 1)', label: l('Inner (Ring 1)', '内环 (第1环)') },
                  { id: 'Middle (Ring 2)', label: l('Middle (Ring 2)', '中环 (第2环)') },
                  { id: 'Guardian', label: l('Guardian Sectors', '守护者星区') },
                  { id: 'Home System', label: l('Home Systems', '母星系统') },
                  { id: 'Outer (Ring 3)', label: l('Outer (Ring 3)', '外环 (第3环)') },
                  { id: 'Warped Universe', label: l('Warped Universe', '曲率宇宙') },
                  { id: 'Galactic Events', label: l('Galactic Events', '银河事件') },
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
                                <h4 className="text-base font-bold text-slate-100">{l(sec.name, '曲率宇宙模块板')}</h4>
                              </div>
                              <p className="text-xs text-purple-300/90 mt-0.5 font-medium">
                                {l(
                                  'Warped Universe Expansion • Modular Double-Hex Board (18 Hexes, 9 Double-Hex Tiles)',
                                  '曲率宇宙扩展 • 模块化双六角图板（18 格六角区域，9 块双六角板块）'
                                )}
                              </p>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded bg-purple-900/70 text-purple-200 border border-purple-500/80 font-mono font-bold shadow-sm">
                              {l('WARPED UNIVERSE BOARD', '曲率宇宙图板')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>⚡</span> {l('12 Wormhole Conduits (R1, R2, R3)', '12 条虫洞通道（第 1/2/3 环）')}
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                {l(
                                  'Flow lines create 12 direct conduits linking left and right border sectors across Rings 1, 2, and 3 in exactly 1 Move step.',
                                  '流向线在第 1、2、3 环形成 12 条直连通道，使左右边界星区之间只需 1 步移动即可直达。'
                                )}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>🚀</span> {l('Non-Stopping Transit Zone', '不停留跃迁通道')}
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                {l(
                                  'Ships cannot end their move or stop inside the Warp Sector. Ships transit directly from one border sector to the other.',
                                  '舰船不可在曲率星区内停留或结束移动，只能直接穿过至另一侧相连星区。'
                                )}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>⚖️</span> {l('Tighter Player Balance (2–5 Players)', '2–5 人局紧凑平衡')}
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                {l(
                                  'Eliminates dead space in 2-player to 5-player galaxies. Guardian sectors are replaced by large modular warp sectors.',
                                  '消除 2 至 5 人星系中的冗余死角；守护者星区被大型模块化曲率板块替代。'
                                )}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-900/50 space-y-1">
                              <span className="font-bold text-purple-300 block flex items-center gap-1.5">
                                <span>🔬</span> {l('Wormhole Generator Synergy', '虫洞发生器联动')}
                              </span>
                              <span className="text-slate-300 text-[11px] leading-relaxed block">
                                {l(
                                  'With Wormhole Generator researched, a conduit connection is valid as long as either sector holds a wormhole on the conduit edge.',
                                  '研究【虫洞发生器】后，只要通道两端中任意一侧星区的对应边存在虫洞即可连通。'
                                )}
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
                                {sec.category === 'Home System'
                                  ? l(`Home of: ${sec.factionName}`, `母星所属：${sec.factionName}`)
                                  : sec.factionName}
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
                                {l('EVENT', '事件')}
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
                                {sec.category} ({l(`Ring ${sec.ring}`, `第 ${sec.ring} 环`)})
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9.5px]">
                                {l(`${wormholeCount} / 6 Wormholes`, `${wormholeCount} / 6 虫洞`)}
                              </span>
                            </div>

                            {sec.ancientsCount > 0 && (
                              <div className="text-rose-400 font-bold flex items-center gap-1">
                                <span>{l('Ancients:', '远古舰：')}</span>
                                <span className="px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-600/60 text-rose-200">
                                  {l(`${sec.ancientsCount} Ancient Ship${sec.ancientsCount > 1 ? 's' : ''}`, `${sec.ancientsCount} 艘远古舰`)}
                                </span>
                              </div>
                            )}

                            {sec.guardianCount && sec.guardianCount > 0 && (
                              <div className="text-amber-400 font-bold flex items-center gap-1">
                                <span>{l('Guardian:', '守护者：')}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-600/60 text-amber-200">
                                  {l('1 Guardian Ship', '1 艘守护者')}
                                </span>
                              </div>
                            )}

                            {sec.hasGCDS && (
                              <div className="text-purple-300 font-bold flex items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500 text-purple-200">
                                  {l('GCDS Defense System', '银河中心防御系统 (GCDS)')}
                                </span>
                              </div>
                            )}

                            {sec.hasDiscovery && (
                              <div className="text-amber-300 flex items-center gap-1">
                                <span>{l('Discovery:', '探索发现：')}</span>
                                <span className="text-amber-400 font-bold">{l('1 Discovery Tile', '1 枚发现板块')}</span>
                              </div>
                            )}

                            {sec.hasArtifact && (
                              <div className="text-cyan-300 flex items-center gap-1">
                                <span>{l('Artifact:', '遗物：')}</span>
                                <span className="text-cyan-400 font-bold">{l('Controlled', '带遗物标记')}</span>
                              </div>
                            )}

                            {sec.hasWarpPortal && (
                              <div className="text-purple-300 flex items-center gap-1">
                                <span>{l('Portal:', '传送门：')}</span>
                                <span className="text-purple-400 font-bold">{l('Warp Portal (+2 VP)', '曲速传送门 (+2 VP)')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Planets */}
                        <div className="space-y-1 mb-2">
                          <span className="text-[11px] text-slate-400 font-semibold block">
                            {l(`Colonizable Planetary Squares (${sec.planets.length}):`, `可殖民行星格位 (${sec.planets.length})：`)}
                          </span>
                          {sec.planets.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">{l('Empty space sector (no planets)', '深空星区（无行星）')}</span>
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
                                    <span className="capitalize">{translateResourceType(p.resource, language)}</span>
                                    {p.isAdvanced && (
                                      <span className="text-[9px] font-bold text-amber-400">{l('★ ADV', '★ 进阶')}</span>
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
                                ? l('Nebula (3 Subsectors):', '星云（3 个子星区）：')
                                : sec.sectorNumber === 393 || sec.sectorNumber === 394
                                ? l('Pulsar (3 Action Spaces):', '脉冲星（3 个行动位）：')
                                : sec.sectorNumber === 397 || sec.sectorNumber === 398
                                ? l('Supernova (Instability Check):', '超新星（稳定性检定）：')
                                : l('Black Hole (Spacetime Anomaly):', '黑洞（时空异常）：')}
                            </span>
                            <span className="text-slate-300 leading-snug block">
                              {sec.sectorNumber === 295 || sec.sectorNumber === 395
                                ? l(
                                    'No influence space. Ships enter subsector by edge. Subsector 3 holds an Ancient; Sub 1 & 2 have Discovery Tiles.',
                                    '无影响力位。舰船按进入边落入对应子星区；子星区 3 驻守远古舰，子星区 1 与 2 含发现板块。'
                                  )
                                : sec.sectorNumber === 393 || sec.sectorNumber === 394
                                ? l(
                                    'Replaces influence disc space with Move, Build, and Upgrade. Shift disc once per round for a free action activation.',
                                    '以移动/建造/升级位替代影响力位；每回合可迁移 1 次圆片触发一次免费行动激活。'
                                  )
                                : sec.sectorNumber === 397 || sec.sectorNumber === 398
                                ? l(
                                    '5 rich planets. Instability Check in Cleanup (2 yellow dice + highest tech track). If Sum < Round, star explodes!',
                                    '含 5 颗富饶行星。清理阶段需投 2 颗黄骰 + 最高科技数；若总和低于当前回合数，恒星爆发摧毁一切！'
                                  )
                                : l(
                                    'No influence space. Entering ships claim discovery and enter transit. Yellow die roll determines return round.',
                                    '无影响力位。进入舰船拾取发现板块后进入亚空间穿行，投掷黄骰决定数回合后返航星区。'
                                  )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Wormhole layout mini-diagram */}
                      <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex justify-between items-center">
                        <span>{l('Wormhole Edges:', '虫洞方位：')}</span>
                        <span className="text-slate-300">
                          {sec.wormholes.map((wh, idx) => (wh ? `E${idx}` : null)).filter(Boolean).join(', ') || l('None', '无')}
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
                  {language === 'zh' ? (
                    <>
                      官方《星蚀：第二黎明》发现板块袋共包含 <strong>36 枚基础板块</strong>（分属 <strong>24 种不同类型</strong>），另有已启用的扩展模块。
                    </>
                  ) : (
                    <>
                      Official Eclipse: Second Dawn Discovery Tile Bag contains <strong>36 base tiles</strong> across <strong>24 distinct types</strong>, plus active expansion modules.
                    </>
                  )}
                </span>
                <span className="font-mono font-bold">{l(`Catalog: ${groupedDiscoveries.length} Types`, `图鉴：共 ${groupedDiscoveries.length} 类`)}</span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  { id: 'all', label: l('All Discovery Tiles', '全部发现板块') },
                  { id: 'resources', label: l('Resource Caches', '资源补给类') },
                  { id: 'modules', label: l('Ancient Ship Modules', '远古舰船配件') },
                  { id: 'special', label: l('Ancient Tech & Structures', '远古科技与建筑') },
                  { id: 'expansion', label: l('Expansions', '扩展内容') },
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
                  const expName = exp ? translateExpansionName(exp.id, exp.name, language) : '';
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
                                title={l(`Expansion: ${exp.name}`, `扩展：${expName}`)}
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                {l(`${exp.name} Expansion`, expName)}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                              {l(`${count} ${count > 1 ? 'copies' : 'copy'} in bag`, `袋中 ${count} 枚`)}
                            </span>
                          </div>
                        </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {tile.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>{l('Alternate Choice:', '替代选择：')}</span>
                        <span className="text-amber-400 font-bold">{l('Keep for 2 VP', '保留作 2 VP')}</span>
                      </div>
                      {(tile.shipPartId || (tile as any).unlockedShipPartId) && (() => {
                        const partId = tile.shipPartId || (tile as any).unlockedShipPartId;
                        const part = SHIP_PARTS[partId];
                        return (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-cyan-400">
                              <span>{l('Unlocks Component:', '获得配件：')}</span>
                              <span className="font-sans font-semibold">{translatePartName(partId, partId, language)}</span>
                            </div>
                            {part && (
                              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div className="shrink-0">
                                    <ShipPartTileIconography part={part} size="md" className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                                  </div>
                                  <div>
                                    <span className="text-xs text-amber-300 font-sans font-bold block">
                                      {translatePartName(part.id, part.name, language)}
                                    </span>
                                    {part.isJumpDrive && (
                                      <span className="text-[10px] text-cyan-300 font-sans font-semibold block mt-0.5">
                                        {l('Jump Traverse: 1 jump/act across non-wormholes (2⚡)', '跳跃穿行：每次移动可跨无虫洞边跳跃 1 次 (2⚡)')}
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
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: l(`All Factions (${ALL_FACTIONS.length})`, `全部势力 (${ALL_FACTIONS.length})`) },
                      { id: 'alien', label: l(`Alien Species (${ALL_FACTIONS.filter((f) => !f.isHuman).length})`, `外星种族 (${ALL_FACTIONS.filter((f) => !f.isHuman).length})`) },
                      { id: 'human', label: l(`Terran / Human (${ALL_FACTIONS.filter((f) => f.isHuman).length})`, `人类文明 (${ALL_FACTIONS.filter((f) => f.isHuman).length})`) },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFactionCategory(opt.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        factionCategory === opt.id
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {l(`Showing ${filteredFactions.length} species sheets`, `显示 ${filteredFactions.length} 份势力面板`)}
                </span>
              </div>

              {/* Full Landscape Faction Sheets */}
              <div className="space-y-5">
                {filteredFactions.map((f: FactionInfo) => (
                  <FactionSheetCard key={f.id} faction={f} />
                ))}
              </div>
            </div>
          )}

          {/* ===================== TAB 6: REPUTATION BAG ===================== */}
          {activeTab === 'reputation' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h3 className="text-sm font-bold text-cyan-400 font-display uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  {l('Official Reputation Bag Composition (33 Tiles Total)', '官方声望袋构成（共 33 枚板块）')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {l(
                    "In Eclipse: Second Dawn for the Galaxy, whenever your fleet engages in combat or destroys enemy ships, you draw reputation tiles from the official 33-tile bag. You choose 1 tile to place on your player board's reputation track, returning the remaining drawn tiles back to the bag.",
                    '在《星蚀：第二黎明》中，每当你的舰队参与战斗或摧毁敌舰，即可从 33 枚官方声望袋中抽取声望板块；从中秘密挑选 1 枚放入你的声望轨，其余放回声望袋中。'
                  )}
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
                        {l(`${tile.count} Tiles in Bag`, `袋内 ${tile.count} 枚`)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {l(`${tile.percentage} of Bag`, `占比 ${tile.percentage}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistical & Rules Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] text-cyan-400 mb-2">
                    {l('Official Combat Draw Rules', '官方战斗抽取规则')}
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-200">{l('Participation Draw:', '参战保底抽取：')}</strong>{' '}
                      {l(
                        'If you engaged in battle in a sector (and at least one ship was destroyed or retreated), you draw 1 tile for participating.',
                        '只要在星区参与战斗（且至少有一艘船被毁或撤退），即可保底抽取 1 枚。'
                      )}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Per Ship Destroyed:', '击毁加抽：')}</strong>{' '}
                      {l(
                        'You draw +1 additional tile for every enemy ship you destroyed in the battle (Interceptors, Cruisers, Dreadnoughts, Starbases, Ancients, GCDS).',
                        '在本场战斗中每击毁 1 艘敌舰（含拦截机、巡洋舰、无畏舰、星际基地、远古舰、GCDS），额外多抽 +1 枚。'
                      )}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Selection:', '秘密挑选：')}</strong>{' '}
                      {l(
                        'You inspect all drawn tiles in secret, choose at most 1 tile to place on your reputation track, and return the others to the bag.',
                        '秘密检视全部抽到的板块，至多保留 1 枚放入声望轨，其余放回袋中。'
                      )}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Track Full Overwrite:', '轨满替换规则：')}</strong>{' '}
                      {l(
                        'If all slots on your track are occupied, you may replace a lower-value tile with the newly drawn higher-value tile (returning the old one to the bag).',
                        '当声望轨已满时，可用新抽到的高分板块替换轨上分值较低的板块（旧板块放回袋中）。'
                      )}
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] text-cyan-400 mb-2">
                    {l('Faction Reputation Slot Limits', '各派系声望槽位上限')}
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-200">{l('Terran Federation & Variants:', '地球联邦及其人类变体：')}</strong> {l('5 Reputation Slots', '5 个声望槽位')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Hydran Progress:', '海德拉学者：')}</strong> {l('4 Reputation Slots', '4 个声望槽位')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Descendants of Draco:', '德拉科后裔：')}</strong> {l('4 Reputation Slots', '4 个声望槽位')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Orion Hegemony:', '猎户座霸权：')}</strong> {l('5 Reputation Slots (Militaristic bonus slot)', '5 个声望槽位（军事加值槽）')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Planta:', '植物种族：')}</strong> {l('4 Reputation Slots (Offset by +1 VP per controlled sector trait)', '4 个声望槽位（由每控 1 星区 +1 VP 补偿）')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Eridani Empire:', '埃里达尼帝国：')}</strong> {l('4 Reputation Slots', '4 个声望槽位')}
                    </li>
                    <li>
                      <strong className="text-slate-200">{l('Mechanema:', '机械种族：')}</strong> {l('4 Reputation Slots', '4 个声望槽位')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: NPC BLUEPRINTS ===================== */}
          {activeTab === 'npcs' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-rose-400 font-display uppercase tracking-wider flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-rose-400" />
                    {l('Neutral Ship Blueprints (Ancients, Guardians & GCDS)', '中立舰船蓝图（远古舰、守护者与 GCDS）')}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-700/60 font-bold uppercase">
                    {l('Base • Advanced • Remnants', '基础 • 进阶 • 遗迹')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {l(
                    'Visual square-box blueprints for all 9 neutral NPC ship configurations across Base, Advanced, and Remnants variants.',
                    '展示全部 9 种中立非玩家舰船在基础、进阶与遗迹 (Remnants) 版本下的方块化蓝图配置。'
                  )}
                </p>
              </div>

              {(['ancient', 'guardian', 'gcds'] as NeutralShipType[]).map((npcType) => {
                const groupBps = filteredNpcBlueprints.filter((bp) => bp.type === npcType);
                if (groupBps.length === 0) return null;

                const groupTitle =
                  npcType === 'ancient'
                    ? l('Ancient Ships', '远古舰')
                    : npcType === 'guardian'
                    ? l('Guardian Defenders', '守护者防卫舰')
                    : l('Galactic Center Defense System (GCDS)', '银河中心防御系统 (GCDS)');
                const groupAccent =
                  npcType === 'guardian'
                    ? 'text-pink-300 border-pink-700/50 bg-pink-950/20'
                    : npcType === 'gcds'
                    ? 'text-amber-300 border-amber-700/50 bg-amber-950/20'
                    : 'text-rose-300 border-rose-700/50 bg-rose-950/20';

                return (
                  <div key={npcType} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <h4 className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${groupAccent}`}>
                        {groupTitle}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500">
                        {l(`${groupBps.length} Variant${groupBps.length > 1 ? 's' : ''}`, `${groupBps.length} 个变体`)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {groupBps.map((bp) => {
                        const variantBadge =
                          bp.variant === 'expert'
                            ? {
                                label: l('Remnants', '遗迹 (Remnants)'),
                                cls: 'bg-rose-950/80 text-rose-300 border-rose-700/70',
                              }
                            : bp.variant === 'advanced'
                            ? {
                                label: l('Advanced', '进阶版'),
                                cls: 'bg-amber-950/80 text-amber-300 border-amber-700/70',
                              }
                            : {
                                label: l('Default (Base)', '基础版'),
                                cls: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70',
                              };
                        const localizedBpName = translateNeutralBlueprintTitle(bp.type, bp.variant, bp.name, language);

                        return (
                          <div
                            key={`${bp.type}_${bp.variant}`}
                            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-bold font-display text-slate-100">
                                  {localizedBpName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {bp.summary}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full border font-mono font-bold uppercase shrink-0 ${variantBadge.cls}`}
                              >
                                {variantBadge.label}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-center min-h-[148px]">
                              <NeutralShipBlueprintLayout blueprint={bp} size="md" />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                              <span>{l(`Init ${bp.initiative}`, `先攻 ${bp.initiative}`)}</span>
                              <span>•</span>
                              <span>{l(`Hull ${bp.maxHull}`, `船体 ${bp.maxHull}`)}</span>
                              {bp.computerBonus > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-300">{l(`+${bp.computerBonus} Hit`, `+${bp.computerBonus} 瞄准`)}</span>
                                </>
                              )}
                              {bp.shieldBonus > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-teal-300">{l(`-${bp.shieldBonus} Shield`, `-${bp.shieldBonus} 护盾`)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredNpcBlueprints.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500">
                  {l(`No NPC ship blueprints match "${searchQuery}".`, `没有与“${searchQuery}”匹配的中立舰船蓝图。`)}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 7: MINOR SPECIES ===================== */}
          {activeTab === 'minorSpecies' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    {l('Minor Species Expansion: Ambassador Tiles (9 Authentic Tiles)', '次要种族扩展：外交大使板块（共 9 枚）')}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold uppercase">
                    {l('Minor Species Expansion', '次要种族扩展')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {l(
                    'In games with the Minor Species expansion, 4 random Minor Species Ambassador Tiles are placed in the play area. During their actions, any player can pay the Money cost to place a tile on an empty Ambassador space on their Reputation Track, gaining powerful permanent discounts and endgame Victory Points.',
                    '启用【次要种族】扩展时，游戏开局会在公共区域随机放置 4 枚次要种族大使板块。任意玩家在自己行动期间可支付对应信用点费用，将其放置于声望轨的空余大使槽位上，从而获得永久折扣、人口或终局胜利点数奖励。'
                  )}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {filteredMinorSpecies.map((tile) => {
                    const zhDetails = MINOR_SPECIES_DETAILS_ZH[tile.id];
                    return (
                    <div
                      key={tile.id}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-xs font-bold text-slate-100">{translateMinorSpeciesName(tile.id, tile.name, language)}</h4>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 shrink-0">
                            {l(`${tile.cost} Money`, `${tile.cost} 信用点`)}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-400 mb-2">
                          {language === 'zh' && zhDetails ? zhDetails.vp : tile.vpDescription}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                          {language === 'zh' && zhDetails ? zhDetails.ability : tile.abilityDescription}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{l('Ambassador Tile', '大使板块')}</span>
                        <span className="text-emerald-400 font-bold">{l('Minor Species', '次要种族')}</span>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-between items-center text-xs text-slate-500 shrink-0 font-mono">
          <span>{l('Eclipse: Second Dawn for the Galaxy Official Reference', '《星蚀：第二黎明》官方中文图鉴参考')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-all"
          >
            {l('Close Compendium', '关闭图鉴')}
          </button>
        </div>
      </div>
    </div>
  );
};
