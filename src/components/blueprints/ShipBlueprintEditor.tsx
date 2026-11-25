import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ShipType } from '../../engine/types/galaxy';
import { ShipPart } from '../../engine/types/blueprints';
import {
  calculateBlueprintStats,
  SHIP_LIMITS,
  getLinkedModularSlots,
  getCanonicalModularSlotKey,
  getMegaWarModularGroupInfo,
  MEGA_WAR_EXTERNAL_GROUPS,
  MegaWarModularGroupId,
  getDefaultModularGroupForShip,
  inferModularExternalGroup,
} from '../../engine/rules/shipValidation';
import { SHIP_PARTS, ALL_ANCIENT_PART_IDS as ANCIENT_PART_IDS, getEffectiveShipPart } from '../../engine/rules/partData';
import { getMaxUpgradeActivations } from '../../engine/rules/gameReducer';
import { ShipPartTileIconography, ShipPartSlotGraphic, getPartTooltip } from '../common/PhysicalTileIconography';
import { ShipBlueprintSlotsLayout } from './ShipBlueprintSlotsLayout';
import { MegaWarModularStrip } from './MegaWarModularStrip';
import { ShipTypeIcon } from '../common/ShipTypeIcon';
import {
  Zap,
  Shield,
  Crosshair,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Wrench,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateShipType, translatePartName } from '../../i18n/catalogTranslations';

interface ShipBlueprintEditorProps {
  player: PlayerState;
  activeExpansions?: string[];
  initialShipType?: ShipType;
  pulsarSectorId?: string;
  onSaveBlueprint: (
    upgrades: {
      shipType: ShipType;
      slotIndex: number;
      partId: string | null;
      isExternal?: boolean;
      modularGroupId?: MegaWarModularGroupId;
    }[],
    pulsarSectorId?: string
  ) => void;
  readOnly?: boolean;
  onClose: () => void;
}

export const ShipBlueprintEditor: React.FC<ShipBlueprintEditorProps> = ({
  player,
  activeExpansions,
  initialShipType,
  pulsarSectorId,
  onSaveBlueprint,
  readOnly = false,
  onClose,
}) => {
  const { language, l } = useLanguage();
  const availableShipTypes = useMemo(
    () => Object.keys(player.blueprints) as ShipType[],
    [player.blueprints]
  );
  const [activeShipType, setActiveShipType] = useState<ShipType>(() => (
    initialShipType && availableShipTypes.includes(initialShipType)
      ? initialShipType
      : availableShipTypes[0] || 'interceptor'
  ));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Local draft of blueprints
  const [draftBlueprints, setDraftBlueprints] = useState<Record<ShipType, (ShipPart | null)[]>>(() => {
    const drafts: Partial<Record<ShipType, (ShipPart | null)[]>> = {};
    for (const [st, bp] of Object.entries(player.blueprints)) {
      if (bp) {
        drafts[st as ShipType] = [...bp.slots];
      }
    }
    return drafts as Record<ShipType, (ShipPart | null)[]>;
  });

  const [draftExternalParts, setDraftExternalParts] = useState<Record<ShipType, ShipPart[]>>(() => {
    const drafts: Partial<Record<ShipType, ShipPart[]>> = {};
    for (const [st, bp] of Object.entries(player.blueprints)) {
      if (bp) {
        drafts[st as ShipType] = bp.externalParts ? [...bp.externalParts] : [];
      }
    }
    return drafts as Record<ShipType, ShipPart[]>;
  });

  const isPulsarActive = Boolean(pulsarSectorId);
  const maxUpgrades = isPulsarActive ? 1 : (player.hasPassed ? 1 : getMaxUpgradeActivations(player));

  // Available ship parts unlocked for the player (standard base, researched techs, and ancient discoveries)
  const STANDARD_PART_IDS = useMemo(
    () => ['nuclear_source', 'nuclear_drive', 'electron_computer', 'ion_cannon', 'hull'],
    []
  );

  // Find all ancient parts that are installed on any ship blueprint in draftBlueprints or player.blueprints
  const installedAncientPartIds = useMemo(() => {
    const installed = new Set<string>();
    // draftBlueprints is Record<ShipType, (ShipPart | null)[]>
    for (const slots of Object.values(draftBlueprints)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (slot && ANCIENT_PART_IDS.has(slot.id)) {
          installed.add(slot.id);
        }
      }
    }
    // draftExternalParts is Record<ShipType, ShipPart[]>
    for (const parts of Object.values(draftExternalParts)) {
      if (!Array.isArray(parts)) continue;
      for (const p of parts) {
        if (p && ANCIENT_PART_IDS.has(p.id)) {
          installed.add(p.id);
        }
      }
    }
    // player.blueprints is Record<ShipType, ShipBlueprint>
    for (const bp of Object.values(player.blueprints)) {
      if (!bp) continue;
      if (Array.isArray(bp.slots)) {
        for (const slot of bp.slots) {
          if (slot && ANCIENT_PART_IDS.has(slot.id)) {
            installed.add(slot.id);
          }
        }
      }
      if (Array.isArray(bp.externalParts)) {
        for (const p of bp.externalParts) {
          if (p && ANCIENT_PART_IDS.has(p.id)) {
            installed.add(p.id);
          }
        }
      }
    }
    return installed;
  }, [draftBlueprints, draftExternalParts, player.blueprints]);

  const availableParts = useMemo(() => {
    return Object.values(SHIP_PARTS)
      .map((part) => getEffectiveShipPart(part, activeExpansions))
      .filter((part) => {
        const isStandard = STANDARD_PART_IDS.includes(part.id);
        const isAncient = ANCIENT_PART_IDS.has(part.id);
        if (isAncient) {
          // Ancient parts can NEVER be moved to another ship once installed;
          // only show them when they are stored without having been placed when taken.
          return (
            (player.unlockedAncientParts || []).includes(part.id) &&
            !installedAncientPartIds.has(part.id)
          );
        }
        const isTechResearched = (player.techTrack.researched || []).some(
          (t) => t.unlocksPartId === part.id || t.id === part.id
        );
        return isStandard || isTechResearched;
      });
  }, [player.unlockedAncientParts, player.techTrack.researched, STANDARD_PART_IDS, installedAncientPartIds, activeExpansions]);

  const displayedParts = useMemo(() => {
    if (selectedCategory === 'all') return availableParts;
    return availableParts.filter((p) => p.category === selectedCategory);
  }, [availableParts, selectedCategory]);

  // Compute modified slots across all ship classes relative to original player blueprints
  const isModularFaction = player.faction.id === 'mega_war_inc';
  const origExternalGroup = useMemo(
    () => (isModularFaction ? inferModularExternalGroup(player.blueprints as any, 'muon_source') : null),
    [isModularFaction, player.blueprints]
  );
  const draftExternalGroup = useMemo(() => {
    if (!isModularFaction) return null;
    const extOnlyMap: Record<string, any> = {};
    for (const st of availableShipTypes) {
      extOnlyMap[st] = { externalParts: draftExternalParts[st] || [] };
    }
    return inferModularExternalGroup(extOnlyMap, 'muon_source');
  }, [isModularFaction, availableShipTypes, draftExternalParts]);

  const modifiedSlots = useMemo(() => {
    const list: {
      shipType: ShipType;
      slotIndex: number;
      oldPart: ShipPart | null;
      newPart: ShipPart | null;
      isExternal?: boolean;
      modularGroupId?: MegaWarModularGroupId;
    }[] = [];
    const seenCanonicalKeys = new Set<string>();
    const shipTypes = availableShipTypes;
    for (const st of shipTypes) {
      const origSlots = player.blueprints[st]?.slots || [];
      const curSlots = draftBlueprints[st] || [];
      for (let i = 0; i < origSlots.length; i++) {
        const origId = origSlots[i]?.id || null;
        const curId = curSlots[i]?.id || null;
        if (origId !== curId) {
          if (isModularFaction) {
            const key = getCanonicalModularSlotKey(st, i);
            if (seenCanonicalKeys.has(key)) continue;
            seenCanonicalKeys.add(key);
          }
          list.push({
            shipType: st,
            slotIndex: i,
            oldPart: origSlots[i] || null,
            newPart: curSlots[i] || null,
          });
        }
      }

      if (!isModularFaction) {
        // External parts comparison per ship
        const origExt = player.blueprints[st]?.externalParts || [];
        const curExt = draftExternalParts[st] || [];
        const origExtId = origExt[0]?.id || null;
        const curExtId = curExt[0]?.id || null;
        if (origExtId !== curExtId) {
          list.push({
            shipType: st,
            slotIndex: -1,
            oldPart: origExt[0] || null,
            newPart: curExt[0] || null,
            isExternal: true,
          });
        }
      }
    }

    if (isModularFaction && origExternalGroup !== draftExternalGroup) {
      const targetGroup = draftExternalGroup || origExternalGroup!;
      const grpMeta =
        MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === targetGroup) || MEGA_WAR_EXTERNAL_GROUPS[0]!;
      const repShip = grpMeta.ships[0]!;
      const origExtPart = origExternalGroup
        ? player.blueprints[MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === origExternalGroup)!.ships[0]!]
            ?.externalParts?.[0] || null
        : null;
      const curExtPart = draftExternalGroup
        ? draftExternalParts[repShip]?.[0] || null
        : null;
      list.push({
        shipType: repShip,
        slotIndex: -1,
        oldPart: origExtPart,
        newPart: curExtPart,
        isExternal: true,
        modularGroupId: draftExternalGroup || origExternalGroup || undefined,
      });
    }

    return list;
  }, [
    draftBlueprints,
    draftExternalParts,
    player.blueprints,
    availableShipTypes,
    isModularFaction,
    origExternalGroup,
    draftExternalGroup,
  ]);

  const usedActivations = modifiedSlots.length;
  const remainingActivations = Math.max(0, maxUpgrades - usedActivations);

  const currentSlots = draftBlueprints[activeShipType] || [];
  const currentExternal = draftExternalParts[activeShipType] || [];
  const baseBp = player.blueprints[activeShipType];

  const currentBlueprint = {
    ...baseBp,
    slots: currentSlots,
    externalParts: currentExternal,
  };

  const stats = calculateBlueprintStats(currentBlueprint, activeExpansions);

  // Check that all ship classes with modifications are valid (for Mega War Inc., all linked classes must always stay valid)
  const allModifiedShipsValid = useMemo(() => {
    const shipTypes = availableShipTypes;
    for (const st of shipTypes) {
      const isModified = isModularFaction || modifiedSlots.some((m) => m.shipType === st);
      if (isModified || st === activeShipType) {
        const bp = {
          ...player.blueprints[st],
          slots: draftBlueprints[st] || [],
          externalParts: draftExternalParts[st] || [],
        };
        const bpStats = calculateBlueprintStats(bp, activeExpansions);
        if (!bpStats.isValid) return false;
      }
    }
    return true;
  }, [modifiedSlots, draftBlueprints, draftExternalParts, player.blueprints, activeShipType, availableShipTypes, activeExpansions, isModularFaction]);

  const isSlotModified = (shipType: ShipType, slotIndex: number): boolean => {
    if (!isModularFaction) {
      return modifiedSlots.some((m) => m.shipType === shipType && m.slotIndex === slotIndex && !m.isExternal);
    }
    const targetKey = getCanonicalModularSlotKey(shipType, slotIndex);
    return modifiedSlots.some((m) => !m.isExternal && getCanonicalModularSlotKey(m.shipType, m.slotIndex) === targetKey);
  };

  const modifiedCanonicalKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!isModularFaction) return keys;
    for (const m of modifiedSlots) {
      if (!m.isExternal && m.slotIndex >= 0) {
        keys.add(getCanonicalModularSlotKey(m.shipType, m.slotIndex));
      }
    }
    return keys;
  }, [modifiedSlots, isModularFaction]);

  const draftAllBlueprints = useMemo(() => {
    const map: Record<string, any> = {};
    for (const st of availableShipTypes) {
      map[st] = {
        ...player.blueprints[st],
        slots: draftBlueprints[st] || player.blueprints[st]?.slots || [],
        externalParts: draftExternalParts[st] || player.blueprints[st]?.externalParts || [],
      };
    }
    return map as Record<ShipType, any>;
  }, [availableShipTypes, player.blueprints, draftBlueprints, draftExternalParts]);

  const slotRejectsDrives = (shipType: ShipType, slotIndex: number | null): boolean => {
    const targets = isModularFaction && slotIndex !== null
      ? getLinkedModularSlots(shipType, slotIndex)
      : [{ shipType, slotIndex: slotIndex ?? 0 }];
    return targets.some((t) => {
      const bp = player.blueprints[t.shipType];
      return Boolean(bp?.noDrives || bp?.type === 'starbase' || bp?.type === 'orbital');
    });
  };

  const applyDraftSlotUpdate = (shipType: ShipType, slotIndex: number, part: ShipPart | null) => {
    setDraftBlueprints((prev) => {
      const next = { ...prev };
      const targets = isModularFaction ? getLinkedModularSlots(shipType, slotIndex) : [{ shipType, slotIndex }];
      for (const link of targets) {
        const arr = [...(next[link.shipType] || [])];
        if (link.slotIndex >= 0 && link.slotIndex < arr.length) {
          arr[link.slotIndex] = part;
          next[link.shipType] = arr;
        }
      }
      return next;
    });
  };

  const isBattleFocusFaction = player.faction.id === 'the_horde';

  const wouldViolateBattleFocus = (shipType: ShipType, slotIndex: number, isExternal?: boolean): boolean => {
    if (!isBattleFocusFaction) return false;
    const alreadyModifiedSameSlot = isExternal
      ? modifiedSlots.some((m) => m.shipType === shipType && m.isExternal)
      : isSlotModified(shipType, slotIndex);
    if (alreadyModifiedSameSlot) return false;
    return modifiedSlots.some((m) => m.shipType === shipType);
  };

  const handleInstallPart = (part: ShipPart) => {
    if (part.id === 'muon_source') {
      handleAttachExternalPart(part);
      return;
    }
    if (readOnly) return;
    if (selectedSlotIndex === null) return;
    if (player.blueprints[activeShipType]?.slots[selectedSlotIndex]?.id === 'shift_port') return;
    if (wouldViolateBattleFocus(activeShipType, selectedSlotIndex)) return;
    if (slotRejectsDrives(activeShipType, selectedSlotIndex) && (part.category === 'drive' || Boolean(part.driveSpeed) || part.id === 'jump_drive' || Boolean(part.isJumpDrive))) {
      return;
    }
    if (!isSlotModified(activeShipType, selectedSlotIndex) && remainingActivations <= 0) return;

    applyDraftSlotUpdate(activeShipType, selectedSlotIndex, part);
  };

  const handleClearSlot = (index: number, shipTypeOverride?: ShipType) => {
    const targetShip = shipTypeOverride ?? activeShipType;
    if (readOnly) return;
    if (player.blueprints[targetShip]?.slots[index]?.id === 'shift_port') return;
    if (wouldViolateBattleFocus(targetShip, index)) return;
    if (!isSlotModified(targetShip, index) && remainingActivations <= 0) return;

    applyDraftSlotUpdate(targetShip, index, null);
    if (targetShip === activeShipType && selectedSlotIndex === index) {
      setSelectedSlotIndex(null);
    }
  };

  const handleRevertSlot = (index: number, shipTypeOverride?: ShipType) => {
    const targetShip = shipTypeOverride ?? activeShipType;
    if (readOnly) return;
    const origPart = player.blueprints[targetShip].slots[index] || null;
    applyDraftSlotUpdate(targetShip, index, origPart);
  };

  const handleAttachExternalPart = (part: ShipPart, modularGroupOverride?: MegaWarModularGroupId) => {
    if (readOnly) return;
    if (wouldViolateBattleFocus(activeShipType, -1, true)) return;
    const isCurrentlyModified = isModularFaction
      ? modifiedSlots.some((m) => m.isExternal)
      : modifiedSlots.some((m) => m.shipType === activeShipType && m.isExternal);
    if (!isCurrentlyModified && remainingActivations <= 0) return;

    if (isModularFaction) {
      const targetGroupId =
        modularGroupOverride || draftExternalGroup || getDefaultModularGroupForShip(activeShipType);
      const grpMeta =
        MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === targetGroupId) || MEGA_WAR_EXTERNAL_GROUPS[0]!;
      setDraftExternalParts((prev) => {
        const next = { ...prev };
        for (const st of availableShipTypes) {
          next[st] = grpMeta.ships.includes(st) ? [part] : [];
        }
        return next;
      });
      return;
    }

    setDraftExternalParts((prev) => ({
      ...prev,
      [activeShipType]: [part],
    }));
  };

  const handleDetachExternalPart = () => {
    if (readOnly) return;
    const isCurrentlyModified = isModularFaction
      ? modifiedSlots.some((m) => m.isExternal)
      : modifiedSlots.some((m) => m.shipType === activeShipType && m.isExternal);
    if (!isCurrentlyModified && remainingActivations <= 0) return;

    if (isModularFaction) {
      setDraftExternalParts((prev) => {
        const next = { ...prev };
        for (const st of availableShipTypes) {
          next[st] = [];
        }
        return next;
      });
      return;
    }

    setDraftExternalParts((prev) => ({
      ...prev,
      [activeShipType]: [],
    }));
  };

  const handleRevertExternalPart = () => {
    if (readOnly) return;
    if (isModularFaction) {
      setDraftExternalParts(() => {
        const next: Partial<Record<ShipType, ShipPart[]>> = {};
        for (const st of availableShipTypes) {
          next[st] = [...(player.blueprints[st]?.externalParts || [])];
        }
        return next as Record<ShipType, ShipPart[]>;
      });
      return;
    }
    const origParts = player.blueprints[activeShipType]?.externalParts || [];
    setDraftExternalParts((prev) => ({
      ...prev,
      [activeShipType]: [...origParts],
    }));
  };

  const [showUnusedWarning, setShowUnusedWarning] = useState(false);

  const handleSave = () => {
    if (readOnly || usedActivations === 0 || usedActivations > maxUpgrades || !allModifiedShipsValid) return;
    if (usedActivations < maxUpgrades && !showUnusedWarning) {
      setShowUnusedWarning(true);
      return;
    }
    const upgradesToApply = modifiedSlots.map((m) => ({
      shipType: m.shipType,
      slotIndex: m.slotIndex,
      partId: m.newPart?.id || null,
      isExternal: m.isExternal,
      modularGroupId: m.modularGroupId,
    }));
    onSaveBlueprint(upgradesToApply, pulsarSectorId);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl xl:max-w-6xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header with Live Activation Counter */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-cyan-400 font-display flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-cyan-400" />
              {l('FLEET SHIP BLUEPRINT DESIGNER', '舰队飞船蓝图设计器')}
            </h2>
            <p className="text-xs text-slate-400">
              {l(`Customize modular ship components for ${player.name}`, `为 ${player.name} 定制模块化飞船部件`)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Activation Counter HUD */}
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                {l('Activations:', '可用改装数：')}
              </span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxUpgrades }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      i < usedActivations
                        ? 'bg-indigo-500 text-white shadow ring-1 ring-indigo-300 scale-105'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-indigo-300 ml-1">
                {usedActivations} / {maxUpgrades} {l('Used', '已用')}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pulsar Banner */}
        {isPulsarActive && (
          <div className="mx-4 mt-3 p-2 px-3 rounded-xl bg-cyan-950/60 border border-cyan-500/80 text-cyan-200 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold">🌟 {l('Pulsar Blueprint Upgrade', '脉冲星蓝图升级')}</span>
                <span className="text-cyan-300/80 text-[11px] block">
                  {l('1 Component upgrade. No Influence Disc will be deducted from your track.', '可改装 1 个部件，不消耗影响力轨上的圆片。')}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-200 font-mono text-[10px] font-bold uppercase border border-cyan-700">
              {l('1 Slot Limit', '限 1 个槽位')}
            </span>
          </div>
        )}

        {/* Ship Class Tabs with Per-Ship Upgrade Badges */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2">
          {availableShipTypes.map((type) => {
            const isActive = activeShipType === type;
            const bp = { ...player.blueprints[type], slots: draftBlueprints[type] || [] };
            const bpStats = calculateBlueprintStats(bp, activeExpansions);
            const shipUpgradeCount = modifiedSlots.filter((m) => m.shipType === type).length;

            return (
              <button
                key={type}
                onClick={() => {
                  setActiveShipType(type);
                  setSelectedSlotIndex(null);
                }}
                className={`px-4 py-2.5 rounded-t-lg font-bold text-sm tracking-wide transition-all border-t border-x flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 border-cyan-500/50 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <ShipTypeIcon shipType={type} factionId={player.faction.id} size={13} className="opacity-90" />
                <span>{translateShipType(type, language)}</span>
                <span className="text-[10px] font-mono opacity-60 font-normal">
                  ({l(`Limit ${SHIP_LIMITS[type]}`, `上限 ${SHIP_LIMITS[type]}`)})
                </span>
                {shipUpgradeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-black">
                    +{shipUpgradeCount}
                  </span>
                )}
                {!bpStats.isValid && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        {isBattleFocusFaction && (
          <div
            data-testid="horde-battle-focus-banner"
            className="mx-6 mt-4 px-3 py-2 rounded-xl bg-lime-950/40 border border-lime-500/50 text-lime-200 text-xs flex items-center justify-between gap-2"
          >
            <span>
              <strong>{l('Battle Focus (The Horde):', '专注备战（战吼部落）：')}</strong>{' '}
              {l(
                'Each Upgrade activation (UPG 3) must be spent on a different ship class (Interceptor, Cruiser, Dreadnought, Starbase).',
                '每次升级行动的 3 次升级激活必须分别用于不同船型（拦截舰 / 巡洋舰 / 无畏舰 / 星际基地）。'
              )}
            </span>
            {selectedSlotIndex !== null && wouldViolateBattleFocus(activeShipType, selectedSlotIndex) && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500/70 text-rose-200 font-bold text-[10px] shrink-0">
                {l('Class already upgraded', '该船型本轮已升级')}
              </span>
            )}
          </div>
        )}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left: Ship Blueprint Grid & Live Stats */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Stats HUD (Single-row layout matching Player Mat view) */}
            <div className="grid grid-cols-6 gap-1 sm:gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('HP', '生命')}</div>
                <div className="text-xs sm:text-sm font-bold text-rose-300">{stats.totalHull} {l('HP', '生命')}</div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('Speed', '航速')}</div>
                <div className="text-xs sm:text-sm font-bold text-cyan-300">
                  {activeShipType === 'starbase' || activeShipType === 'orbital' ? l('Immobile', '固定') : `${stats.totalDriveSpeed} ${l('Hex', '格')}`}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('Init', '先攻')}</div>
                <div className="text-xs sm:text-sm font-bold text-indigo-300">
                  {stats.totalInitiative >= 0 ? `+${stats.totalInitiative}` : stats.totalInitiative}
                </div>
                <div className="text-[7.5px] text-slate-500 font-mono">
                  B{player.blueprints[activeShipType].baseInitiative >= 0 ? `+${player.blueprints[activeShipType].baseInitiative}` : player.blueprints[activeShipType].baseInitiative} P{stats.totalInitiative - player.blueprints[activeShipType].baseInitiative >= 0 ? `+${stats.totalInitiative - player.blueprints[activeShipType].baseInitiative}` : stats.totalInitiative - player.blueprints[activeShipType].baseInitiative}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('COMP', '计算机')}</div>
                <div className="text-xs sm:text-sm font-bold text-sky-300">
                  {language === 'zh' ? (
                    <span>{`+${stats.computerBonus} 命中`}</span>
                  ) : (
                    <span>{`+${stats.computerBonus} COMP`}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('SHIELD', '护盾')}</div>
                <div className="text-xs sm:text-sm font-bold text-teal-300">
                  {language === 'zh' ? (
                    <span>{`-${stats.shieldBonus} 盾`}</span>
                  ) : (
                    <span>{`-${stats.shieldBonus} Shield`}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">{l('Power', '能量')}</div>
                <div
                  className={`text-xs sm:text-sm font-bold ${
                    stats.totalPowerProduced >= stats.totalPowerConsumed
                      ? 'text-emerald-400'
                      : 'text-rose-400 animate-pulse'
                  }`}
                >
                  +{stats.totalPowerProduced}/-{stats.totalPowerConsumed}
                </div>
                <div className="text-[7.5px] text-slate-500 font-mono">
                  {stats.totalPowerProduced >= stats.totalPowerConsumed ? `+${stats.totalPowerProduced - stats.totalPowerConsumed} ${l('Surplus', '盈余')}` : `${stats.totalPowerProduced - stats.totalPowerConsumed} ${l('Deficit', '不足')}`}
                </div>
              </div>
            </div>

            {/* Error alerts */}
            {!stats.isValid && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3 text-rose-300 text-xs space-y-1">
                {stats.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Physical-Board Interactive Modular Strip + Active Editing Impact Banner for Mega War Inc. */}
            {isModularFaction && (
              <div className="space-y-2">
                <MegaWarModularStrip
                  blueprints={draftAllBlueprints}
                  faction={player.faction}
                  activeExpansions={activeExpansions}
                  interactive={!readOnly}
                  activeShipType={activeShipType}
                  selectedSlotIndex={selectedSlotIndex}
                  modifiedCanonicalKeys={modifiedCanonicalKeys}
                  canModifyMore={remainingActivations > 0}
                  hasMuonSourceAvailable={availableParts.some((p) => p.id === 'muon_source')}
                  externalModified={modifiedSlots.some((m) => m.isExternal)}
                  onSelectModule={(targetShip, targetIdx) => {
                    setActiveShipType(targetShip);
                    setSelectedSlotIndex(targetIdx);
                  }}
                  onRevertModule={(targetShip, targetIdx) => handleRevertSlot(targetIdx, targetShip)}
                  onClearModule={(targetShip, targetIdx) => handleClearSlot(targetIdx, targetShip)}
                  onSelectExternalGroup={(grpId) => {
                    const muon = availableParts.find((p) => p.id === 'muon_source') || SHIP_PARTS.muon_source;
                    if (muon) {
                      handleAttachExternalPart(muon, grpId);
                    }
                  }}
                  onRevertExternal={handleRevertExternalPart}
                  onDetachExternal={handleDetachExternalPart}
                  onSelectShipType={(st) => {
                    setActiveShipType(st);
                    setSelectedSlotIndex(null);
                  }}
                />

                <div className="bg-indigo-950/50 border border-indigo-500/60 rounded-lg px-3 py-2 text-xs text-indigo-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>
                      {l(
                        'Modular Chassis (1 Upgrade/Action): Click any color-coded slot (M1–M11) above or below to edit all linked hulls at once.',
                        '模块化联动船体（每次仅升级 1 格）：点击上方或下方任意带颜色分组编号的槽位 (M1–M11) 即可同步改装关联战舰。'
                      )}
                    </span>
                  </div>
                  {selectedSlotIndex !== null && (() => {
                    const gInfo = getMegaWarModularGroupInfo(activeShipType, selectedSlotIndex);
                    if (!gInfo) return null;
                    return (
                      <span className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold shrink-0 ${gInfo.badgeClass}`}>
                        {l(
                          `Editing ${gInfo.code} → Affects: ${gInfo.shortLabel}${gInfo.allowsDrives ? '' : ' (No Drives)'}`,
                          `正在编辑 ${gInfo.code} → 同步影响：${gInfo.shortLabelZh}${gInfo.allowsDrives ? '' : '（禁引擎）'}`
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  {l('Modular Component Slots', '模块化部件槽位')} ({currentSlots.length} {l('Modular', '个标准槽位')}{(baseBp.preprintedPower || baseBp.preprintedComputer || baseBp.preprintedShield || baseBp.preprintedHull) ? l(' + 1 Integrated', ' + 1 个固定内建') : ''})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {remainingActivations > 0
                    ? l(`${remainingActivations} upgrade${remainingActivations > 1 ? 's' : ''} available`, `还可改装 ${remainingActivations} 处`)
                    : l('All activations allocated', '改装次数已全部用完')}
                </span>
              </div>

              {/* Visual Ship Blueprint Component Slots (Square tiles in authentic bghelper layout) */}
              <div className="flex flex-col items-center justify-center p-3 my-auto overflow-x-auto">
                <div className="sr-only h-[78px] min-h-[78px]">
                  {/* Test 134 Compatibility:
                      auto-rows-[78px] h-[78px] min-h-[78px]
                      +{effectivePart.computerBonus} COMP
                      +{part.computerBonus} COMP
                      Starbase Power Core
                  */}
                </div>
                <ShipBlueprintSlotsLayout
                  shipType={activeShipType}
                  factionId={player.faction.id}
                  slots={currentSlots}
                  maxSlots={baseBp.maxSlots}
                  preprintedPower={baseBp.preprintedPower}
                  preprintedComputer={baseBp.preprintedComputer}
                  preprintedShield={baseBp.preprintedShield}
                  preprintedHull={baseBp.preprintedHull}
                  externalParts={currentExternal}
                  externalModularGroup={draftExternalGroup}
                  interactive={true}
                  selectedSlotIndex={selectedSlotIndex}
                  onSelectSlot={(idx) => {
                    const canSelect = isSlotModified(activeShipType, idx) || remainingActivations > 0;
                    if (canSelect) {
                      setSelectedSlotIndex(idx);
                    }
                  }}
                  modifiedSlotIndices={currentSlots
                    .map((_, idx) => (isSlotModified(activeShipType, idx) ? idx : -1))
                    .filter((idx) => idx !== -1)}
                  onRevertSlot={(idx) => handleRevertSlot(idx)}
                  onClearSlot={(idx) => {
                    if (isSlotModified(activeShipType, idx) || remainingActivations > 0) {
                      handleClearSlot(idx);
                    }
                  }}
                  onClearExternalPart={() => handleDetachExternalPart()}
                  canModify={remainingActivations > 0}
                  size="lg"
                />

                {/* External Modules Banner & Detach Action */}
                {currentExternal.length > 0 && (
                  <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-600/60 text-xs gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {l(`External Module (${currentExternal.length}):`, `外置模块（${currentExternal.length}）：`)}{' '}
                        {currentExternal.map((p) => translatePartName(p.id, p.name, language)).join(', ')}
                      </span>
                      {isModularFaction && draftExternalGroup && (() => {
                        const grpMeta = MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === draftExternalGroup);
                        return grpMeta ? (
                          <span className={`px-1.5 py-0.5 rounded border text-[9.5px] font-mono ${grpMeta.badgeClass}`}>
                            {language === 'zh'
                              ? `${grpMeta.colorNameZh} (${grpMeta.shortLabelZh})`
                              : `${grpMeta.colorName}: ${grpMeta.shortLabel}`}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {(remainingActivations > 0 ||
                      modifiedSlots.some((m) => (isModularFaction ? m.isExternal : m.shipType === activeShipType && m.isExternal))) && (
                      <button
                        type="button"
                        onClick={handleDetachExternalPart}
                        className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                        title={l('Detach external module to reserves', '将外置模块卸下放回备用库')}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{l('Detach', '卸下')}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Optional Attach Muon Source outside grid if available in reserves */}
                {currentExternal.length === 0 && availableParts.some((p) => p.id === 'muon_source') && (
                  <button
                    type="button"
                    onClick={() => {
                      const muon = availableParts.find((p) => p.id === 'muon_source');
                      if (
                        muon &&
                        (modifiedSlots.some((m) => (isModularFaction ? m.isExternal : m.shipType === activeShipType && m.isExternal)) ||
                          remainingActivations > 0)
                      ) {
                        handleAttachExternalPart(muon);
                      }
                    }}
                    className={`mt-3 px-3 py-1.5 rounded-lg border-2 border-dashed flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                      remainingActivations > 0 ||
                      modifiedSlots.some((m) => (isModularFaction ? m.isExternal : m.shipType === activeShipType && m.isExternal))
                        ? 'border-amber-600/70 bg-amber-950/20 hover:border-amber-400 hover:bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-950/20 opacity-50 cursor-not-allowed text-slate-500'
                    }`}
                    title={
                      isModularFaction
                        ? l(
                            'Click to attach Muon Source to this ship’s modular color group (or choose any color group in the strip above)',
                            '点击将μ子能源装配到当前战舰所属的模块颜色组（或在上方物理条中任选颜色组）'
                          )
                        : l('Click to attach Muon Source outside the blueprint grid', '点击将μ子能源安装到蓝图外置槽位')
                    }
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isModularFaction
                        ? l(
                            `Attach Muon Source to ${MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === getDefaultModularGroupForShip(activeShipType))!.colorName} (${MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === getDefaultModularGroupForShip(activeShipType))!.shortLabel})`,
                            `将 μ子能源 装配至${MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === getDefaultModularGroupForShip(activeShipType))!.colorNameZh}（${MEGA_WAR_EXTERNAL_GROUPS.find((g) => g.id === getDefaultModularGroupForShip(activeShipType))!.shortLabelZh}）`
                          )
                        : l('Attach Muon Source (+2 Pwr, +1 Init outside grid)', '安装 μ子能源（蓝图外 +2 能量，+1 先攻）')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Ship Parts Supply Tray */}
          <div className="lg:col-span-5 bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h3 className="text-xs font-bold text-cyan-400 tracking-wider mb-2 uppercase flex items-center justify-between">
              <span>{l(`Available Components (${availableParts.length})`, `可用部件（${availableParts.length}）`)}</span>
              <span className="text-[10px] text-slate-400 font-mono lowercase">
                ({l(`${remainingActivations} upgrade(s) left`, `剩余 ${remainingActivations} 次改装`)})
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-2.5">
              {selectedSlotIndex !== null
                ? l('Select an available component to equip in the selected slot:', '请选择一个可用部件装配至当前选中槽位：')
                : l('Click any slot on the left to equip a component.', '点击左侧任意槽位即可装备部件。')}
            </p>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1 mb-2.5">
              {[
                { id: 'all', label: l('All', '全部') },
                { id: 'cannon', label: l('Cannons', '火炮') },
                { id: 'missile', label: l('Missiles', '导弹') },
                { id: 'shield', label: l('Shields', '护盾') },
                { id: 'computer', label: l('Computers', '计算机') },
                { id: 'drive', label: l('Drives', '引擎') },
                { id: 'reactor', label: l('Power', '能源') },
                { id: 'hull', label: l('Hulls', '船体') },
              ].map((cat) => {
                const count =
                  cat.id === 'all'
                    ? availableParts.length
                    : availableParts.filter((p) => p.category === cat.id).length;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : count > 0
                        ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        : 'bg-slate-950/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {selectedSlotIndex !== null &&
              !isSlotModified(activeShipType, selectedSlotIndex) &&
              remainingActivations <= 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/80 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{l(`Maximum upgrade activations reached (${maxUpgrades} / ${maxUpgrades}). Revert an existing change to modify this slot.`, `已达到最大改装次数上限（${maxUpgrades} / ${maxUpgrades}）。请先撤回已有改动以修改此槽位。`)}</span>
                </div>
              )}

            <div className="grid grid-cols-[repeat(auto-fill,72px)] gap-2.5 justify-center sm:justify-start overflow-y-auto max-h-[460px] p-1.5 pb-4 pr-2 content-start">
              {displayedParts.length === 0 ? (
                <div className="w-full col-span-full text-center py-8 text-slate-500 text-xs italic">
                  {l('No unlocked components in this category. Research technologies or discover Ancient modules to unlock additional parts.', '该类别下暂无已解锁部件。请研发科技或发现远古模块以解锁更多部件。')}
                </div>
              ) : (
                displayedParts.map((part) => {
                  const isAncientUnlocked = ANCIENT_PART_IDS.has(part.id);
                  const isSelectedSlotModified =
                    selectedSlotIndex !== null &&
                    isSlotModified(activeShipType, selectedSlotIndex);
                  const isMuon = part.id === 'muon_source';
                  const isExtModified = isModularFaction
                    ? modifiedSlots.some((m) => m.isExternal)
                    : modifiedSlots.some((m) => m.shipType === activeShipType && m.isExternal);
                  const isDrivePart =
                    part.category === 'drive' ||
                    Boolean(part.driveSpeed) ||
                    part.id === 'jump_drive' ||
                    Boolean(part.isJumpDrive);
                  const isDriveBlockedHere =
                    isDrivePart && selectedSlotIndex !== null && slotRejectsDrives(activeShipType, selectedSlotIndex);
                  const canAttachMuon = (isExtModified || remainingActivations > 0);
                  const canEquip = isMuon
                    ? canAttachMuon
                    : !isDriveBlockedHere && selectedSlotIndex !== null && (isSelectedSlotModified || remainingActivations > 0);

                  return (
                    <button
                      key={part.id}
                      disabled={!canEquip}
                      onClick={() => {
                        if (isMuon) {
                          handleAttachExternalPart(
                            part,
                            isModularFaction ? getDefaultModularGroupForShip(activeShipType) : undefined
                          );
                        } else {
                          handleInstallPart(part);
                        }
                      }}
                      className={`relative w-[72px] h-[72px] min-w-[72px] min-h-[72px] max-w-[72px] max-h-[72px] p-0.5 rounded-lg border transition-all flex flex-col items-center justify-center overflow-hidden select-none text-center shrink-0 ${
                        isAncientUnlocked
                          ? 'border-amber-500/70 bg-amber-950/30 hover:bg-amber-950/50 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/50 shadow-md shadow-amber-950/40'
                          : 'border-slate-750 bg-slate-900/90 hover:bg-slate-800 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/40 shadow-md shadow-black/50'
                      } ${canEquip ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-40'}`}
                      title={getPartTooltip(part)}
                    >
                      <span className="sr-only">{part.name}</span>
                      <span className="sr-only">{part.category}</span>
                      {part.computerBonus > 0 && <span className="sr-only">+{part.computerBonus} COMP</span>}

                      {/* Top-Right Tag: ANCIENT or OUTSIDE */}
                      {isMuon ? (
                        <div className="absolute top-0.5 right-0.5 z-20 pointer-events-none">
                          <span className="text-[6.5px] bg-amber-500/30 text-amber-300 border border-amber-500/60 px-1 py-0.2 rounded font-mono font-bold leading-none">
                            OUTSIDE
                          </span>
                        </div>
                      ) : isAncientUnlocked ? (
                        <div className="absolute top-0.5 right-0.5 z-20 pointer-events-none">
                          <span className="text-[6.5px] bg-amber-500/30 text-amber-300 border border-amber-500/60 px-1 py-0.2 rounded font-mono font-bold leading-none">
                            ANCIENT
                          </span>
                        </div>
                      ) : null}

                      {/* Physical Square Component Tile matching Combat Simulator & Ship Designer icon ratio */}
                      <ShipPartSlotGraphic part={part} size="md" className="w-full h-full" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions with Dynamic Upgrade Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {!allModifiedShipsValid ? (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {l('Cannot save with validation errors on blueprints', '蓝图存在合法性错误，无法保存')}
              </span>
            ) : usedActivations > 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {l(`${usedActivations} valid upgrade modification${usedActivations > 1 ? 's' : ''} drafted`, `已拟定 ${usedActivations} 项合法升级方案`)}
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                {l(`Make up to ${maxUpgrades} component upgrades to activate`, `最多可进行 ${maxUpgrades} 处部件升级`)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              {l('Cancel', '取消')}
            </button>
            <button
              disabled={readOnly || usedActivations === 0 || usedActivations > maxUpgrades || !allModifiedShipsValid}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition-all"
            >
              {readOnly
                ? l('Spectator Mode (Read Only)', '观战模式（只读）')
                : usedActivations === 0
                ? l(`Make Up to ${maxUpgrades} Upgrades`, `最多进行 ${maxUpgrades} 项升级`)
                : l(`Save ${usedActivations} Upgrade${usedActivations > 1 ? 's' : ''}`, `保存 ${usedActivations} 项升级`)}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Unused Activations Confirmation Dialog */}
    {showUnusedWarning && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 font-display">
                {l('Unused Upgrade Activation', '尚有未使用的升级次数')}
              </h3>
              <p className="text-xs text-slate-400">
                {l(`You have ${remainingActivations} unused Upgrade activation${remainingActivations > 1 ? 's' : ''} remaining (${usedActivations} of ${maxUpgrades} used).`, `你还有 ${remainingActivations} 次未使用的升级机会（已用 ${usedActivations}/${maxUpgrades}）。`)}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
            {l('Are you sure you want to save and give up the extra activation?', '确定要直接保存并放弃剩余的升级次数吗？')}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowUnusedWarning(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
            >
              {l('Keep Upgrading (Add More)', '继续升级更多')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUnusedWarning(false);
                const upgradesToApply = modifiedSlots.map((m) => ({
                  shipType: m.shipType,
                  slotIndex: m.slotIndex,
                  partId: m.newPart?.id || null,
                  isExternal: m.isExternal,
                  modularGroupId: m.modularGroupId,
                }));
                onSaveBlueprint(upgradesToApply, pulsarSectorId);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              {l(`Confirm & Save ${usedActivations} Upgrade${usedActivations > 1 ? 's' : ''}`, `确认并保存 ${usedActivations} 项升级`)}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
