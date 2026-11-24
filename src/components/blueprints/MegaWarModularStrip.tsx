import React from 'react';
import { ShipBlueprint, ShipPart } from '../../engine/types/blueprints';
import { ShipType } from '../../engine/types/galaxy';
import {
  MEGA_WAR_MODULAR_STRIP_SPECS,
  MEGA_WAR_EXTERNAL_GROUPS,
  MegaWarModularGroupId,
  MegaWarModularSlotSpec,
  calculateBlueprintStats,
  getBaseBuildItemCost,
  getCanonicalModularSlotKey,
  inferModularExternalGroup,
} from '../../engine/rules/shipValidation';
import { FactionInfo } from '../../engine/types/player';
import { getEffectiveShipPart } from '../../engine/rules/partData';
import {
  LightningPip,
  ShipPartSlotGraphic,
  getPartTooltip,
} from '../common/PhysicalTileIconography';
import { ShipTypeIcon } from '../common/ShipTypeIcon';
import { AlertTriangle, CheckCircle2, Lock, Plus, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateShipType } from '../../i18n/catalogTranslations';

export interface MegaWarModularStripProps {
  blueprints: Record<ShipType, ShipBlueprint>;
  faction: FactionInfo;
  activeExpansions?: string[];
  /** Interactive editing options (used inside ShipBlueprintEditor) */
  interactive?: boolean;
  activeShipType?: ShipType;
  selectedSlotIndex?: number | null;
  modifiedCanonicalKeys?: Set<string>;
  canModifyMore?: boolean;
  hasMuonSourceAvailable?: boolean;
  externalModified?: boolean;
  onSelectModule?: (shipType: ShipType, slotIndex: number) => void;
  onRevertModule?: (shipType: ShipType, slotIndex: number) => void;
  onClearModule?: (shipType: ShipType, slotIndex: number) => void;
  onSelectExternalGroup?: (groupId: MegaWarModularGroupId) => void;
  onRevertExternal?: () => void;
  onDetachExternal?: () => void;
  onSelectShipType?: (shipType: ShipType) => void;
}

const GROUP_WRAPPER_CLASSES: Record<
  MegaWarModularSlotSpec['group']['groupId'],
  string
> = {
  int_cru_dre: 'bg-amber-950/20 border-amber-500/60',
  cru_dre: 'bg-orange-950/20 border-orange-500/65',
  dre_sb: 'bg-fuchsia-950/20 border-fuchsia-500/65',
  sb_only: 'bg-sky-950/20 border-sky-400/65',
};

const HULL_CHIPS: {
  type: ShipType;
  textClass: string;
  borderClass: string;
  activeRing: string;
  cost: number;
}[] = [
  {
    type: 'interceptor',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/70 bg-amber-950/25',
    activeRing: 'ring-2 ring-amber-400/70 border-amber-400',
    cost: 2,
  },
  {
    type: 'cruiser',
    textClass: 'text-orange-300',
    borderClass: 'border-orange-500/70 bg-orange-950/25',
    activeRing: 'ring-2 ring-orange-400/70 border-orange-400',
    cost: 5,
  },
  {
    type: 'dreadnought',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/70 bg-rose-950/25',
    activeRing: 'ring-2 ring-rose-400/70 border-rose-400',
    cost: 8,
  },
  {
    type: 'starbase',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/70 bg-sky-950/25',
    activeRing: 'ring-2 ring-sky-400/70 border-sky-400',
    cost: 3,
  },
];

/**
 * Physical-board horizontal modular chassis strip (M1–M11 + Starbase +3 Power Fixed Core)
 * with color-coded sharing brackets matching Mega War Inc.'s tabletop player mat.
 */
export const MegaWarModularStrip: React.FC<MegaWarModularStripProps> = ({
  blueprints,
  faction,
  activeExpansions,
  interactive = false,
  activeShipType,
  selectedSlotIndex = null,
  modifiedCanonicalKeys,
  canModifyMore = true,
  hasMuonSourceAvailable = false,
  externalModified = false,
  onSelectModule,
  onRevertModule,
  onClearModule,
  onSelectExternalGroup,
  onRevertExternal,
  onDetachExternal,
  onSelectShipType,
}) => {
  const { language, l } = useLanguage();
  const activeExternalGroup = inferModularExternalGroup(blueprints, 'muon_source');

  const selectedCanonicalKey =
    interactive && activeShipType && selectedSlotIndex !== null && selectedSlotIndex >= 0
      ? getCanonicalModularSlotKey(activeShipType, selectedSlotIndex)
      : null;

  const getModulePart = (spec: MegaWarModularSlotSpec): ShipPart | null => {
    const bp = blueprints[spec.representativeShipType];
    const raw = bp?.slots?.[spec.representativeSlotIndex] || null;
    return raw ? getEffectiveShipPart(raw, activeExpansions) : null;
  };

  const renderSlotCell = (spec: MegaWarModularSlotSpec) => {
    const canonicalKey = getCanonicalModularSlotKey(
      spec.representativeShipType,
      spec.representativeSlotIndex
    );
    const part = getModulePart(spec);
    const isSelected = selectedCanonicalKey === canonicalKey;
    const isModified = Boolean(modifiedCanonicalKeys?.has(canonicalKey));
    const canInteract = interactive && (isModified || canModifyMore);
    const groupLabel = language === 'zh' ? spec.group.shortLabelZh : spec.group.shortLabel;

    const frameClasses = isSelected
      ? 'border-2 border-cyan-300 bg-cyan-950/50 ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-950/60'
      : isModified
      ? 'border-2 border-indigo-400 bg-indigo-950/45 ring-2 ring-indigo-400/50'
      : `${part ? 'bg-slate-900/70' : 'bg-slate-950/60'} ${spec.group.slotAccentClass}`;

    return (
      <div
        key={canonicalKey}
        data-testid={`mega-war-module-m${spec.moduleIndex + 1}`}
        onClick={() => {
          if (interactive && onSelectModule && canInteract) {
            onSelectModule(spec.representativeShipType, spec.representativeSlotIndex);
          }
        }}
        title={`${spec.group.code} (${groupLabel})${spec.group.allowsDrives ? '' : ' • No Drives'}\n${
          part ? `${part.name}\n${getPartTooltip(part)}` : l('Empty Modular Slot', '空模块化槽位')
        }`}
        className={`relative w-[54px] h-[54px] rounded-lg flex items-center justify-center transition-all overflow-hidden select-none shrink-0 ${frameClasses} ${
          interactive && canInteract
            ? 'cursor-pointer hover:brightness-110'
            : interactive
            ? 'opacity-70 cursor-not-allowed'
            : ''
        }`}
      >
        {part ? (
          <div className="w-full h-full relative">
            <ShipPartSlotGraphic part={part} size="sm" showInitiative={true} />
            {interactive && (
              <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 z-20">
                {isModified && onRevertModule && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevertModule(spec.representativeShipType, spec.representativeSlotIndex);
                    }}
                    className="text-cyan-300 hover:text-white p-0.5 bg-slate-950/85 rounded-full"
                    title={l('Revert module change', '撤回该槽位改动')}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}
                {onClearModule && canInteract && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearModule(spec.representativeShipType, spec.representativeSlotIndex);
                    }}
                    className="text-slate-300 hover:text-rose-400 p-0.5 bg-slate-950/85 rounded-full"
                    title={l('Remove part from linked ships', '从关联战舰移除此部件')}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <Plus className="w-3.5 h-3.5 text-slate-600 opacity-50" />
        )}

        <div
          className={`absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded border text-[7px] font-mono font-black leading-none z-20 pointer-events-none ${spec.group.badgeClass}`}
        >
          {spec.group.code}
        </div>
        {!spec.group.allowsDrives && !part && (
          <span
            className="absolute top-0.5 right-0.5 text-[7px] text-fuchsia-300/80 font-mono leading-none pointer-events-none"
            title={l('Drives prohibited (shared with Starbase)', '禁止安装推进器（与星际基地共享）')}
          >
            ✕⚡
          </span>
        )}
      </div>
    );
  };

  const groups: {
    groupId: MegaWarModularSlotSpec['group']['groupId'];
    specs: MegaWarModularSlotSpec[];
    label: string;
    labelZh: string;
  }[] = [
    {
      groupId: 'int_cru_dre',
      specs: MEGA_WAR_MODULAR_STRIP_SPECS.slice(0, 4),
      label: 'M1–M4 • INT + CRU + DRE',
      labelZh: 'M1–M4 • 拦截+巡洋+无畏',
    },
    {
      groupId: 'cru_dre',
      specs: MEGA_WAR_MODULAR_STRIP_SPECS.slice(4, 6),
      label: 'M5–M6 • CRU + DRE',
      labelZh: 'M5–M6 • 巡洋+无畏',
    },
    {
      groupId: 'dre_sb',
      specs: MEGA_WAR_MODULAR_STRIP_SPECS.slice(6, 8),
      label: 'M7–M8 • DRE + SB',
      labelZh: 'M7–M8 • 无畏+基地',
    },
    {
      groupId: 'sb_only',
      specs: MEGA_WAR_MODULAR_STRIP_SPECS.slice(8, 11),
      label: 'M9–M11 • SB Only',
      labelZh: 'M9–M11 • 仅星际基地',
    },
  ];

  const starbaseBp = blueprints.starbase;

  return (
    <div
      data-testid="mega-war-modular-strip"
      className="bg-slate-950/90 border border-indigo-500/40 rounded-xl p-3 space-y-2.5 shadow-inner"
    >
      {/* Header + Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 font-display">
            {l('Physical Modular Chassis Strip (M1–M11)', '物理版图模块化联装槽位总览 (M1–M11)')}
          </span>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/70 text-indigo-200 font-mono font-bold">
            {l('1 Slot = All Linked Ships', '改动 1 格 = 同步全部联装船体')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono">
          <span className="px-1.5 py-0.5 rounded border bg-amber-950/70 border-amber-500/70 text-amber-300 font-bold">
            {l('Yellow: INT+CRU+DRE', '黄：拦+巡+无')}
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-orange-950/70 border-orange-500/70 text-orange-300 font-bold">
            {l('Orange: CRU+DRE', '橙：巡+无')}
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-fuchsia-950/70 border-fuchsia-500/70 text-fuchsia-300 font-bold">
            {l('Purple: DRE+SB (No Drive)', '紫：无+站(禁引擎)')}
          </span>
          <span className="px-1.5 py-0.5 rounded border bg-sky-950/70 border-sky-400/70 text-sky-300 font-bold">
            {l('Blue: SB Only', '蓝：仅基地')}
          </span>
        </div>
      </div>

      {/* Physical-Board Horizontal Strip with Top/Bottom Ship Brackets */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[780px] flex flex-col gap-1">
          {/* Row 1 Overhead Bracket: CRUISER (M1–M6) + STARBASE (M7–M11 + Fixed) */}
          <div className="grid grid-cols-12 gap-1.5 items-end text-[9.5px] font-bold font-mono">
            <div className="col-span-6 border-t-2 border-x-2 border-orange-500/80 rounded-t-md pt-0.5 px-2 text-orange-300 flex items-center justify-between bg-orange-950/15">
              <span className="flex items-center gap-1">
                <ShipTypeIcon shipType="cruiser" factionId={faction.id} size={11} />
                <span>{translateShipType('cruiser', language).toUpperCase()}</span>
              </span>
              <span className="text-[8.5px] opacity-85">M1–M6 • 5M</span>
            </div>
            <div className="col-span-6 border-t-2 border-x-2 border-sky-400/80 rounded-t-md pt-0.5 px-2 text-sky-300 flex items-center justify-between bg-sky-950/15">
              <span className="flex items-center gap-1">
                <ShipTypeIcon shipType="starbase" factionId={faction.id} size={11} />
                <span>{translateShipType('starbase', language).toUpperCase()}</span>
              </span>
              <span className="text-[8.5px] opacity-85">M7–M11 + 3⚡ • 3M ({l('No Drives', '禁引擎')})</span>
            </div>
          </div>

          {/* Row 2 Overhead Bracket: INTERCEPTOR (M1–M4) */}
          <div className="grid grid-cols-12 gap-1.5 items-end text-[9.5px] font-bold font-mono">
            <div className="col-span-4 border-t-2 border-x-2 border-amber-400/85 rounded-t-md pt-0.5 px-2 text-amber-300 flex items-center justify-between bg-amber-950/20">
              <span className="flex items-center gap-1">
                <ShipTypeIcon shipType="interceptor" factionId={faction.id} size={11} />
                <span>{translateShipType('interceptor', language).toUpperCase()}</span>
              </span>
              <span className="text-[8.5px] opacity-85">M1–M4 • 2M</span>
            </div>
            <div className="col-span-2 text-center text-[8px] text-orange-300/70">+2 Cruisers</div>
            <div className="col-span-2 text-center text-[8px] text-fuchsia-300/85 font-bold">
              {l('DRE ⇄ SB Link', '无畏 ⇄ 基地联动')}
            </div>
            <div className="col-span-4 text-center text-[8px] text-sky-300/75">
              {l('Stationary Core', '固定防御核心')}
            </div>
          </div>

          {/* Main 11-Module Strip + Starbase Fixed Core */}
          <div className="grid grid-cols-12 gap-1.5 items-stretch">
            {groups.map((grp) => {
              const colSpanClass = grp.specs.length === 4 ? 'col-span-4' : grp.specs.length === 3 ? 'col-span-3' : 'col-span-2';
              const hasMuonHere = activeExternalGroup === grp.groupId;
              const grpMeta = MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === grp.groupId)!;
              return (
                <div
                  key={grp.groupId}
                  className={`${colSpanClass} rounded-lg border p-1.5 flex flex-col gap-1 ${GROUP_WRAPPER_CLASSES[grp.groupId]}`}
                >
                  <div className="flex items-center justify-between gap-1 px-0.5">
                    {grp.specs.map((spec) => renderSlotCell(spec))}
                  </div>
                  <div className="text-[8px] font-mono font-bold text-center text-slate-300/90 tracking-tight truncate">
                    {language === 'zh' ? grp.labelZh : grp.label}
                  </div>
                  {hasMuonHere && (
                    <div
                      data-testid="mega-war-strip-muon-badge"
                      className={`mt-0.5 px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold flex items-center justify-between gap-1 ${grpMeta.badgeClass}`}
                    >
                      <span className="flex items-center gap-0.5 truncate">
                        <Zap className="w-2.5 h-2.5 shrink-0" />
                        <span>+2⚡ +1Init {l('MUON EXT', 'μ子外置')}</span>
                      </span>
                      {interactive && (externalModified || canModifyMore) && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          {externalModified && onRevertExternal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevertExternal();
                              }}
                              className="text-cyan-300 hover:text-white"
                              title={l('Revert Muon Source', '撤回μ子能源改动')}
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {onDetachExternal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDetachExternal();
                              }}
                              className="text-rose-300 hover:text-rose-100"
                              title={l('Detach Muon Source', '卸下μ子能源')}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Col 12: Starbase Integrated +3 Power Fixed Tile */}
            <div
              className="col-span-1 rounded-lg border-2 border-emerald-500/70 bg-emerald-950/35 p-1 flex flex-col items-center justify-center text-center select-none"
              title={l(
                'Starbase Power Core (+3 Energy, No Drives allowed in M7–M11)',
                '星际基地固有能源核心（+3 能量，M7–M11 槽位禁止引擎）'
              )}
            >
              <div className="flex items-center gap-0.5 text-[7px] font-mono font-bold text-emerald-300 uppercase">
                <Lock className="w-2 h-2" />
                <span>SB</span>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-display font-black text-amber-300 text-xs leading-none">
                  +{starbaseBp?.preprintedPower ?? 3}
                </span>
                <LightningPip size={10} color="#fbbf24" />
              </div>
              <span className="text-[7px] font-mono text-emerald-300/80 mt-0.5 leading-none">
                {l('FIXED', '固定')}
              </span>
            </div>
          </div>

          {/* Bottom Bracket: DREADNOUGHT (M1–M8) */}
          <div className="grid grid-cols-12 gap-1.5 items-start text-[9.5px] font-bold font-mono">
            <div className="col-span-8 border-b-2 border-x-2 border-rose-500/85 rounded-b-md pb-0.5 px-2 text-rose-300 flex items-center justify-between bg-rose-950/15">
              <span className="flex items-center gap-1">
                <ShipTypeIcon shipType="dreadnought" factionId={faction.id} size={11} />
                <span>{translateShipType('dreadnought', language).toUpperCase()}</span>
              </span>
              <span className="text-[8.5px] opacity-85">M1–M8 • 8M • Init +1</span>
            </div>
            <div className="col-span-4 text-center text-[8px] text-sky-300/70 pt-0.5">
              {l('Starbase only (M9–M11)', '仅限星际基地 (M9–M11)')}
            </div>
          </div>
        </div>
      </div>

      {/* Modular External Attachment Row (Muon Source: attach to any of the 4 color groups) */}
      {interactive && onSelectExternalGroup && (hasMuonSourceAvailable || activeExternalGroup) && (
        <div
          data-testid="mega-war-muon-group-picker"
          className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]"
        >
          <span className="font-bold text-amber-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{l('Attach Muon Source (+2⚡/+1 Init External) to Color Group:', '将外置 μ子能源 (+2⚡/+1先攻) 装配到模块颜色组：')}</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {MEGA_WAR_EXTERNAL_GROUPS.map((grp) => {
              const isSelectedGrp = activeExternalGroup === grp.id;
              const enabled = externalModified || canModifyMore;
              return (
                <button
                  key={grp.id}
                  type="button"
                  disabled={!enabled}
                  data-testid={`mega-war-muon-group-${grp.id}`}
                  onClick={() => onSelectExternalGroup(grp.id)}
                  className={`px-2 py-0.5 rounded border font-mono font-bold transition ${grp.buttonClass} ${
                    isSelectedGrp ? 'ring-2 ring-cyan-400 shadow' : 'opacity-85 hover:opacity-100'
                  } ${!enabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {language === 'zh'
                    ? `${grp.colorNameZh} (${grp.shortLabelZh})`
                    : `${grp.colorName}: ${grp.shortLabel}`}
                </button>
              );
            })}
            {activeExternalGroup && (externalModified || canModifyMore) && onDetachExternal && (
              <button
                type="button"
                onClick={onDetachExternal}
                className="px-2 py-0.5 rounded border border-rose-700/80 bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{l('Detach', '卸下')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Validation & Stat Readout across all 4 linked ship hulls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80">
        {HULL_CHIPS.map((chip) => {
          const bp = blueprints[chip.type];
          if (!bp) return null;
          const st = calculateBlueprintStats(bp, activeExpansions);
          const isCurrent = activeShipType === chip.type;
          const buildCost = getBaseBuildItemCost({ faction, blueprints } as any, chip.type);

          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => onSelectShipType?.(chip.type)}
              className={`p-1.5 rounded-lg border text-left transition-all ${
                isCurrent ? chip.activeRing : chip.borderClass
              } ${onSelectShipType ? 'cursor-pointer hover:brightness-110' : 'cursor-default'} ${
                !st.isValid ? 'border-rose-500 bg-rose-950/40' : ''
              }`}
              title={
                st.isValid
                  ? `${translateShipType(chip.type, language)} (${l('Valid', '合法')})`
                  : st.errors.join(' ')
              }
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={`flex items-center gap-1 ${chip.textClass}`}>
                  <ShipTypeIcon shipType={chip.type} factionId={faction.id} size={11} />
                  <span>{translateShipType(chip.type, language)}</span>
                </span>
                {st.isValid ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                )}
              </div>
              <div className="mt-0.5 text-[9px] font-mono text-slate-300 flex items-center justify-between gap-1">
                <span>
                  {buildCost}M • {st.totalHull}HP •{' '}
                  {chip.type === 'starbase' ? `I+${st.totalInitiative}` : `S${st.totalDriveSpeed}/I+${st.totalInitiative}`}
                </span>
                <span
                  className={
                    st.totalPowerProduced >= st.totalPowerConsumed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {st.totalPowerProduced - st.totalPowerConsumed >= 0
                    ? `+${st.totalPowerProduced - st.totalPowerConsumed}⚡`
                    : `${st.totalPowerProduced - st.totalPowerConsumed}⚡`}
                </span>
              </div>
              {!st.isValid && st.errors[0] && (
                <div className="mt-0.5 text-[8px] text-rose-300 truncate">{st.errors[0]}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
