import React, { useState } from 'react';
import { FactionInfo, ReputationSlotType } from '../../engine/types/player';
import { PlanetSlot } from '../../engine/types/galaxy';
import {
  getFactionSheetData,
  FactionRuleIcon,
} from '../../engine/rules/factionSheets';
import { getExpansionForItem } from '../../engine/rules/expansions';
import { TECH_CATALOG } from '../../engine/rules/techData';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  translateExpansionName,
  translateFactionName,
  translateShipType,
  translateTechName,
} from '../../i18n/catalogTranslations';
import { SectorPreviewGraphic } from './SectorPreviewGraphic';
import { TechTileIconography, TechHoverTooltip } from './PhysicalTileIconography';
import { ShipTypeIcon } from './ShipTypeIcon';
import {
  AlertTriangle,
  Award,
  CircleDot,
  Coins,
  Compass,
  FlaskConical,
  Hammer,
  Rocket,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';

export interface FactionSheetCardProps {
  faction: FactionInfo;
  className?: string;
}

const RULE_ICON_MAP: Record<FactionRuleIcon, React.FC<{ className?: string }>> = {
  rep: Shield,
  disc: Users,
  ship: Rocket,
  tech: FlaskConical,
  vp: Award,
  trade: Coins,
  explore: Compass,
  colony: Sparkles,
  shrine: Sparkles,
  warning: AlertTriangle,
};

const ReputationSlotIcon: React.FC<{ slotType: ReputationSlotType; title: string }> = ({
  slotType,
  title,
}) => {
  return (
    <div
      title={title}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 relative ${
        slotType === 'rep_only'
          ? 'bg-amber-950/50 border-amber-500/70'
          : slotType === 'amb_only'
          ? 'bg-cyan-950/50 border-cyan-500/70 border-dashed'
          : 'bg-slate-900/90 border-slate-500/70'
      }`}
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7">
        {/* Square border representing Reputation Tile compatibility */}
        {(slotType === 'both' || slotType === 'rep_only') && (
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="2.5"
            fill="none"
            stroke={slotType === 'rep_only' ? '#f59e0b' : '#cbd5e1'}
            strokeWidth="2"
          />
        )}
        {/* Octagon/Hexagon representing Ambassador compatibility */}
        {(slotType === 'both' || slotType === 'amb_only') && (
          <polygon
            points="11,5 21,5 27,11 27,21 21,27 11,27 5,21 5,11"
            fill="none"
            stroke={slotType === 'amb_only' ? '#38bdf8' : '#94a3b8'}
            strokeWidth={slotType === 'amb_only' ? '2.2' : '1.5'}
            strokeDasharray={slotType === 'both' ? '3 1.5' : undefined}
          />
        )}
        <text
          x="16"
          y="18.5"
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill={
            slotType === 'rep_only'
              ? '#fcd34d'
              : slotType === 'amb_only'
              ? '#7dd3fc'
              : '#e2e8f0'
          }
        >
          {slotType === 'rep_only' ? 'REP' : slotType === 'amb_only' ? 'AMB' : 'R/A'}
        </text>
      </svg>
    </div>
  );
};

const PlanetStripIcon: React.FC<{ planet: PlanetSlot; lang: 'en' | 'zh' }> = ({ planet, lang }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; labelEn: string; labelZh: string }> = {
    money: {
      bg: 'bg-amber-400/20',
      border: 'border-amber-400/80',
      text: 'text-amber-300',
      labelEn: 'Money',
      labelZh: '信用点',
    },
    science: {
      bg: 'bg-fuchsia-500/20',
      border: 'border-fuchsia-400/80',
      text: 'text-fuchsia-300',
      labelEn: 'Science',
      labelZh: '科研',
    },
    material: {
      bg: 'bg-orange-600/25',
      border: 'border-orange-500/80',
      text: 'text-orange-300',
      labelEn: 'Materials',
      labelZh: '材料',
    },
    any: {
      bg: 'bg-slate-200/20',
      border: 'border-slate-300/80',
      text: 'text-slate-100',
      labelEn: planet.isOrbital ? 'Orbital (Wild)' : 'Wild',
      labelZh: planet.isOrbital ? '轨道站(任意)' : '任意资源',
    },
  };
  const style = colorMap[planet.resource] || colorMap.any;
  const label = lang === 'zh' ? style.labelZh : style.labelEn;

  return (
    <div
      title={`${planet.isAdvanced ? (lang === 'zh' ? '进阶' : 'Advanced ') : ''}${label}`}
      className={`relative w-7 h-7 rounded-md border flex items-center justify-center ${style.bg} ${style.border}`}
    >
      {planet.resource === 'money' && <Coins className={`w-3.5 h-3.5 ${style.text}`} />}
      {planet.resource === 'science' && <FlaskConical className={`w-3.5 h-3.5 ${style.text}`} />}
      {planet.resource === 'material' && <Hammer className={`w-3.5 h-3.5 ${style.text}`} />}
      {planet.resource === 'any' && (
        <span className={`text-[9px] font-black ${style.text}`}>
          {planet.isOrbital ? 'ORB' : 'ALL'}
        </span>
      )}
      {planet.isAdvanced && (
        <span className="absolute -top-1.5 -right-1 text-[10px] leading-none font-black text-amber-300 drop-shadow">
          ★
        </span>
      )}
    </div>
  );
};

export const FactionSheetCard: React.FC<FactionSheetCardProps> = ({
  faction,
  className = '',
}) => {
  const { language, l } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);

  const sheet = getFactionSheetData(faction);
  const exp = getExpansionForItem(faction.id);
  const factionName = translateFactionName(faction.id, faction.name, language);
  const expLabel = faction.expansionTag
    ? faction.expansionTag
    : exp
    ? translateExpansionName(exp.id, exp.name, language)
    : null;

  const historyText = language === 'zh' ? sheet.historyZh : sheet.historyEn;

  const repCounts = sheet.reputationSlotTypes.reduce(
    (acc, t) => {
      acc[t] += 1;
      return acc;
    },
    { both: 0, rep_only: 0, amb_only: 0 }
  );

  const repSummaryParts: string[] = [];
  if (repCounts.amb_only > 0) {
    repSummaryParts.push(
      l(`${repCounts.amb_only} Ambassador Only`, `${repCounts.amb_only} 仅限大使`)
    );
  }
  if (repCounts.both > 0) {
    repSummaryParts.push(
      l(`${repCounts.both} Rep / Ambassador`, `${repCounts.both} 声望或大使`)
    );
  }
  if (repCounts.rep_only > 0) {
    repSummaryParts.push(
      l(`${repCounts.rep_only} Reputation Only`, `${repCounts.rep_only} 仅限声望`)
    );
  }

  const actionsList = [
    { key: 'EXP', label: l('EXP', '探索'), count: sheet.activations.explore, base: 1 },
    { key: 'RES', label: l('RES', '研究'), count: sheet.activations.research, base: 1 },
    { key: 'UPG', label: l('UPG', '升级'), count: sheet.activations.upgrade, base: 2 },
    { key: 'BUI', label: l('BUI', '建造'), count: sheet.activations.build, base: 2 },
    { key: 'MOV', label: l('MOV', '移动'), count: sheet.activations.move, base: 2 },
    { key: 'INF', label: l('INF', '影响'), count: sheet.activations.influence, base: 2 },
  ];

  return (
    <div
      data-testid={`faction-sheet-${faction.id}`}
      className={`relative hover:z-30 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 shadow-2xl ${className}`}
    >
      {/* Top Landscape Strip: Species Header + History Archive Quote */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-800/90 bg-slate-950/70 rounded-t-2xl overflow-hidden">
        {/* Top-Left Banner & Name */}
        <div className="lg:col-span-4 p-4 pb-3 flex flex-col justify-between gap-2.5 border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-md bg-slate-800 border border-slate-600/70 text-[10px] font-black tracking-widest uppercase text-slate-200 font-display">
              {faction.isHuman
                ? l('TERRAN CIVILIZATION', '人类星际文明')
                : l('ALIEN SPECIES', '外星高等种族')}
            </span>
            {expLabel && (
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-[10px] font-mono font-bold text-purple-200">
                {expLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-0.5">
            <div
              className="w-6 h-5 rounded-full border-2 border-white/30 shadow-md shrink-0 flex items-center justify-center"
              style={{ backgroundColor: faction.defaultColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-wide uppercase font-display text-white leading-tight">
              {factionName}
            </h3>
          </div>
        </div>

        {/* Top-Right History Lore Box */}
        <div className="lg:col-span-8 p-4 flex flex-col justify-center bg-gradient-to-r from-slate-900/40 to-slate-900/80">
          <div className="text-[10.5px] italic text-slate-400 text-right mb-1">
            {l(
              'Excerpts from the Archive of History, Library of the Galactic Center',
              '摘录自银河中心图书馆《星海历史档案馆》'
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-200 italic border-l-2 border-cyan-500/50 pl-3 py-0.5">
            {historyText}
          </p>
        </div>
      </div>

      {/* Main 3-Column Landscape Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Column 1 (Left): Portrait & Activations Per Action */}
        <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between gap-4 bg-slate-950/40">
          {/* Portrait */}
          <div
            className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-inner"
            style={{ boxShadow: `inset 0 0 28px ${faction.defaultColor}25` }}
          >
            {sheet.portraitUrl && !imgFailed ? (
              <img
                src={sheet.portraitUrl}
                alt={factionName}
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{
                  background: `radial-gradient(circle at center, ${faction.defaultColor}33 0%, #090d16 75%)`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-full border-2 border-white/25 shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: faction.defaultColor }}
                >
                  <Users className="w-8 h-8 text-white/90" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  {factionName}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
          </div>

          {/* Activations Per Action */}
          <div>
            <div className="text-[10.5px] font-black tracking-widest uppercase text-slate-300 text-center mb-2 font-display">
              {l('ACTIVATIONS PER ACTION', '每次行动激活次数')}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {actionsList.map((act) => {
                const isBoosted = act.count > act.base;
                return (
                  <div key={act.key} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black font-mono border-2 shadow-sm ${
                        isBoosted
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-400/20'
                          : 'bg-slate-800/95 border-slate-500/80 text-slate-100'
                      }`}
                    >
                      {act.label}
                    </div>
                    <span
                      className={`text-sm font-black font-mono ${
                        isBoosted ? 'text-amber-300' : 'text-slate-100'
                      }`}
                    >
                      {act.count}
                    </span>
                    {faction.id === 'atlantians' && act.key === 'RES' && (
                      <span className="text-[9px] font-black font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-1 rounded leading-tight">
                        +1 UPG
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2 (Middle): Setup & Stats, Home Sector, Reputation Track, Trade Value */}
        <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between gap-3 bg-slate-900/35">
          <div className="space-y-3">
            <h4 className="text-xs font-black tracking-widest uppercase text-cyan-300 font-display border-b border-slate-800 pb-1">
              {l('SETUP AND STATS', '初始配置与基础数值')}
            </h4>

            {/* Resources & Colony Ships & Discs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <Hammer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="font-mono font-bold text-orange-200">
                  {faction.startingResources.materials}
                </span>
                <span className="text-slate-400 text-[11px]">{l('Materials', '材料')}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <FlaskConical className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                <span className="font-mono font-bold text-fuchsia-200">
                  {faction.startingResources.science}
                </span>
                <span className="text-slate-400 text-[11px]">{l('Science', '科研')}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono font-bold text-amber-200">
                  {faction.startingResources.money}
                </span>
                <span className="text-slate-400 text-[11px]">{l('Money', '信用点')}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <Rocket className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-mono font-bold text-indigo-200">
                  {faction.startingColonyShips}
                </span>
                <span className="text-slate-400 text-[11px] truncate">
                  {l('Colony Ships', '殖民船')}
                </span>
              </div>
            </div>

            {/* Influence Discs & Starting Fleet */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5">
                <CircleDot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <strong className="font-mono text-slate-100">{faction.startingDiscs}</strong>
                <span className="text-slate-400 text-[11px]">
                  {l('Track Discs', '影响力圆片')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sheet.startingShips.map((st, idx) => (
                  <span
                    key={`${st.shipType}_${idx}`}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-cyan-200"
                  >
                    <ShipTypeIcon
                      shipType={st.shipType}
                      factionId={faction.id}
                      size={11}
                      className="text-cyan-400"
                    />
                    {st.count}× {translateShipType(st.shipType, language)}
                  </span>
                ))}
              </div>
            </div>

            {/* Starting Techs (In-game physical tile icons + identical hover tooltip) */}
            <div className="text-xs space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                {l('Starting Technologies:', '初始科技：')}
              </div>
              {faction.startingTechIds.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {faction.startingTechIds.map((tid) => {
                    const techObj = TECH_CATALOG.find((t) => t.id === tid);
                    if (!techObj) {
                      return (
                        <span
                          key={tid}
                          className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-200 text-[11px] font-bold uppercase tracking-wide font-mono"
                        >
                          {translateTechName(tid, tid, language)}
                        </span>
                      );
                    }
                    return (
                      <div
                        key={tid}
                        data-testid={`starting-tech-icon-${tid}`}
                        className="relative group hover:z-50 cursor-help"
                      >
                        <TechTileIconography tech={techObj} compact className="w-16 h-16" />
                        <TechHoverTooltip
                          tech={techObj}
                          horizontalPlacement="left-1/2 -translate-x-1/2"
                          verticalPlacement="bottom-[calc(100%+8px)]"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  {l('None (Flexible Terran Start)', '无初始科技')}
                </span>
              )}
            </div>

            {/* Home Sector */}
            <div className="p-2.5 rounded-xl bg-slate-950/75 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span>{l(`Sector ${sheet.homeSector.sectorNumber}`, `${sheet.homeSector.sectorNumber} 号星区`)}</span>
                  {sheet.homeSector.name && (
                    <span className="text-[10.5px] text-slate-400 font-normal truncate">
                      ({sheet.homeSector.name})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[10.5px] font-black font-mono">
                    {sheet.homeSector.victoryPoints ?? 3} ◆
                  </span>
                  {(sheet.homeSector.planets || []).map((pl, idx) => (
                    <PlanetStripIcon key={pl.id || idx} planet={pl} lang={language} />
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <SectorPreviewGraphic sector={sheet.homeSector} size="sm" />
              </div>
            </div>
          </div>

          {/* Reputation Track & Trade Value */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-bold uppercase tracking-wider text-slate-300">
                  {l('Reputation Track', '声望轨')}
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {l(`${sheet.reputationSlotTypes.length} Slots`, `${sheet.reputationSlotTypes.length} 格`)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sheet.reputationSlotTypes.map((st, idx) => (
                  <ReputationSlotIcon
                    key={`${st}_${idx}`}
                    slotType={st}
                    title={
                      st === 'rep_only'
                        ? l('Reputation Tile Only', '仅限声望板块')
                        : st === 'amb_only'
                        ? l('Ambassador Only', '仅限外交大使')
                        : l('Reputation Tile or Ambassador', '声望板块 或 外交大使')
                    }
                  />
                ))}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                {repSummaryParts.join(' · ')}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-slate-800 text-xs">
              <span className="text-slate-300 font-bold uppercase tracking-wider text-[10.5px]">
                {l('Trade Value', '贸易比率')}
              </span>
              <div className="flex items-center gap-2 font-mono font-black text-amber-300">
                <span>{faction.tradeRatio} : 1</span>
                {faction.id === 'rho_indi_syndicate' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-600/60 text-amber-200">
                    {l('3M ➔ 2', '3金换2')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3 (Right): Species Rules & Ship Blueprint Modifiers */}
        <div className="lg:col-span-4 p-4 flex flex-col justify-between gap-3 bg-slate-900/20">
          <div className="space-y-2.5">
            <h4 className="text-xs font-black tracking-widest uppercase text-amber-300 font-display border-b border-slate-800 pb-1">
              {l('SPECIES RULES', '种族特殊规则与能力')}
            </h4>
            <ul className="space-y-2">
              {sheet.rules.map((rule) => {
                const IconComp = RULE_ICON_MAP[rule.icon] || Sparkles;
                return (
                  <li
                    key={rule.id}
                    className="flex items-start gap-2.5 text-xs text-slate-200 leading-snug bg-slate-950/55 p-2 rounded-xl border border-slate-800/80"
                  >
                    <IconComp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{language === 'zh' ? rule.zh : rule.en}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Blueprint Modifiers */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-300 font-display">
              {l('Ship Blueprint Traits', '舰船蓝图特性')}
            </div>
            {sheet.blueprintModifiers.length > 0 ? (
              <div className="space-y-1.5">
                {sheet.blueprintModifiers.map((mod) => (
                  <div
                    key={mod.shipType}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-slate-800 text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 font-bold uppercase font-mono text-slate-200">
                      <ShipTypeIcon
                        shipType={mod.shipType}
                        factionId={faction.id}
                        size={11}
                        className="text-cyan-400"
                      />
                      {translateShipType(mod.shipType, language)}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {mod.badges.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border ${
                            b.tone === 'positive'
                              ? 'bg-cyan-950/80 border-cyan-600/60 text-cyan-200'
                              : b.tone === 'negative'
                              ? 'bg-rose-950/80 border-rose-600/60 text-rose-200'
                              : 'bg-slate-800 border-slate-600 text-slate-200'
                          }`}
                        >
                          {language === 'zh' ? b.zh : b.en}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/70 text-[11px] text-slate-400 italic">
                {l('Standard Human Ship Blueprints (No Preprinted Modifiers)', '标准人类舰船蓝图（无额外预印修正）')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
