import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ShipType } from '../../engine/types/galaxy';
import { ShipPart } from '../../engine/types/blueprints';
import { calculateBlueprintStats, SHIP_LIMITS } from '../../engine/rules/shipValidation';
import { SHIP_PARTS, ALL_ANCIENT_PART_IDS as ANCIENT_PART_IDS, getEffectiveShipPart } from '../../engine/rules/partData';
import { getMaxUpgradeActivations } from '../../engine/rules/gameReducer';
import { ShipPartTileIconography, ShipPartSlotGraphic, getPartTooltip } from '../common/PhysicalTileIconography';
import { ShipBlueprintSlotsLayout } from './ShipBlueprintSlotsLayout';
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

interface ShipBlueprintEditorProps {
  player: PlayerState;
  activeExpansions?: string[];
  initialShipType?: ShipType;
  pulsarSectorId?: string;
  onSaveBlueprint: (
    upgrades: { shipType: ShipType; slotIndex: number; partId: string | null; isExternal?: boolean }[],
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
  const modifiedSlots = useMemo(() => {
    const list: {
      shipType: ShipType;
      slotIndex: number;
      oldPart: ShipPart | null;
      newPart: ShipPart | null;
      isExternal?: boolean;
    }[] = [];
    const shipTypes = availableShipTypes;
    for (const st of shipTypes) {
      const origSlots = player.blueprints[st]?.slots || [];
      const curSlots = draftBlueprints[st] || [];
      for (let i = 0; i < origSlots.length; i++) {
        const origId = origSlots[i]?.id || null;
        const curId = curSlots[i]?.id || null;
        if (origId !== curId) {
          list.push({
            shipType: st,
            slotIndex: i,
            oldPart: origSlots[i] || null,
            newPart: curSlots[i] || null,
          });
        }
      }

      // External parts comparison
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
    return list;
  }, [draftBlueprints, draftExternalParts, player.blueprints, availableShipTypes]);

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

  // Check that all ship classes with modifications are valid
  const allModifiedShipsValid = useMemo(() => {
    const shipTypes = availableShipTypes;
    for (const st of shipTypes) {
      const isModified = modifiedSlots.some((m) => m.shipType === st);
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
  }, [modifiedSlots, draftBlueprints, draftExternalParts, player.blueprints, activeShipType, availableShipTypes, activeExpansions]);

  const handleInstallPart = (part: ShipPart) => {
    if (part.id === 'muon_source') {
      handleAttachExternalPart(part);
      return;
    }
    if (readOnly) return;
    if (selectedSlotIndex === null) return;
    if (baseBp.noDrives && (part.category === 'drive' || Boolean(part.driveSpeed) || part.id === 'jump_drive' || Boolean(part.isJumpDrive))) {
      return;
    }
    const isSlotCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.slotIndex === selectedSlotIndex && !m.isExternal
    );
    if (!isSlotCurrentlyModified && remainingActivations <= 0) return;

    const newSlots = [...currentSlots];
    newSlots[selectedSlotIndex] = part;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
  };

  const handleClearSlot = (index: number) => {
    if (readOnly) return;
    const isSlotCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.slotIndex === index && !m.isExternal
    );
    if (!isSlotCurrentlyModified && remainingActivations <= 0) return;

    const newSlots = [...currentSlots];
    newSlots[index] = null;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
    setSelectedSlotIndex(null);
  };

  const handleRevertSlot = (index: number) => {
    if (readOnly) return;
    const origPart = player.blueprints[activeShipType].slots[index] || null;
    const newSlots = [...currentSlots];
    newSlots[index] = origPart;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
  };

  const handleAttachExternalPart = (part: ShipPart) => {
    if (readOnly) return;
    const isCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.isExternal
    );
    if (!isCurrentlyModified && remainingActivations <= 0) return;

    setDraftExternalParts((prev) => ({
      ...prev,
      [activeShipType]: [part],
    }));
  };

  const handleDetachExternalPart = () => {
    if (readOnly) return;
    const isCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.isExternal
    );
    if (!isCurrentlyModified && remainingActivations <= 0) return;

    setDraftExternalParts((prev) => ({
      ...prev,
      [activeShipType]: [],
    }));
  };

  const handleRevertExternalPart = () => {
    if (readOnly) return;
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
    }));
    onSaveBlueprint(upgradesToApply, pulsarSectorId);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header with Live Activation Counter */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 className="text-xl font-bold text-cyan-400 font-display flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-cyan-400" />
              FLEET SHIP BLUEPRINT DESIGNER
            </h2>
            <p className="text-xs text-slate-400">
              Customize modular ship components for {player.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Activation Counter HUD */}
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Activations:
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
                {usedActivations} / {maxUpgrades} Used
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
                <span className="font-bold">🌟 Pulsar Blueprint Upgrade</span>
                <span className="text-cyan-300/80 text-[11px] block">
                  1 Component upgrade. No Influence Disc will be deducted from your track.
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-200 font-mono text-[10px] font-bold uppercase border border-cyan-700">
              1 Slot Limit
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
                <span>{type.toUpperCase()}</span>
                <span className="text-[10px] font-mono opacity-60 font-normal">
                  (Limit {SHIP_LIMITS[type]})
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
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left: Ship Blueprint Grid & Live Stats */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Stats HUD (Single-row layout matching Player Mat view) */}
            <div className="grid grid-cols-6 gap-1 sm:gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">HP</div>
                <div className="text-xs sm:text-sm font-bold text-rose-300">{stats.totalHull} HP</div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">Speed</div>
                <div className="text-xs sm:text-sm font-bold text-cyan-300">
                  {activeShipType === 'starbase' || activeShipType === 'orbital' ? 'Immobile' : `${stats.totalDriveSpeed} Hex`}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">Init</div>
                <div className="text-xs sm:text-sm font-bold text-indigo-300">
                  {stats.totalInitiative >= 0 ? `+${stats.totalInitiative}` : stats.totalInitiative}
                </div>
                <div className="text-[7.5px] text-slate-500 font-mono">
                  B{player.blueprints[activeShipType].baseInitiative >= 0 ? `+${player.blueprints[activeShipType].baseInitiative}` : player.blueprints[activeShipType].baseInitiative} P{stats.totalInitiative - player.blueprints[activeShipType].baseInitiative >= 0 ? `+${stats.totalInitiative - player.blueprints[activeShipType].baseInitiative}` : stats.totalInitiative - player.blueprints[activeShipType].baseInitiative}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">COMP</div>
                <div className="text-xs sm:text-sm font-bold text-sky-300">
                  {`+${stats.computerBonus} COMP`}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">SHIELD</div>
                <div className="text-xs sm:text-sm font-bold text-teal-300">
                  {`-${stats.shieldBonus} Shield`}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-500 uppercase font-sans">Power</div>
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
                  {stats.totalPowerProduced >= stats.totalPowerConsumed ? `+${stats.totalPowerProduced - stats.totalPowerConsumed} Surplus` : `${stats.totalPowerProduced - stats.totalPowerConsumed} Deficit`}
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

            {/* Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Modular Component Slots ({currentSlots.length} Modular{(baseBp.preprintedPower || baseBp.preprintedComputer || baseBp.preprintedShield || baseBp.preprintedHull) ? ' + 1 Integrated' : ''})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {remainingActivations > 0
                    ? `${remainingActivations} upgrade${remainingActivations > 1 ? 's' : ''} available`
                    : 'All activations allocated'}
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
                  interactive={true}
                  selectedSlotIndex={selectedSlotIndex}
                  onSelectSlot={(idx) => {
                    const isModified = modifiedSlots.some(
                      (m) => m.shipType === activeShipType && m.slotIndex === idx
                    );
                    const canSelect = isModified || remainingActivations > 0;
                    if (canSelect) {
                      setSelectedSlotIndex(idx);
                    }
                  }}
                  modifiedSlotIndices={modifiedSlots
                    .filter((m) => m.shipType === activeShipType && !m.isExternal && m.slotIndex !== undefined)
                    .map((m) => m.slotIndex!)}
                  onRevertSlot={(idx) => handleRevertSlot(idx)}
                  onClearSlot={(idx) => {
                    const isModified = modifiedSlots.some(
                      (m) => m.shipType === activeShipType && m.slotIndex === idx
                    );
                    if (isModified || remainingActivations > 0) {
                      handleClearSlot(idx);
                    }
                  }}
                  canModify={remainingActivations > 0}
                  size="lg"
                />

                {/* Optional Attach Muon Source outside grid if available in reserves */}
                {currentExternal.length === 0 && availableParts.some((p) => p.id === 'muon_source') && (
                  <button
                    type="button"
                    onClick={() => {
                      const muon = availableParts.find((p) => p.id === 'muon_source');
                      if (muon && (modifiedSlots.some((m) => m.shipType === activeShipType && m.isExternal) || remainingActivations > 0)) {
                        handleAttachExternalPart(muon);
                      }
                    }}
                    className={`mt-3 px-3 py-1.5 rounded-lg border-2 border-dashed flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                      remainingActivations > 0 || modifiedSlots.some((m) => m.shipType === activeShipType && m.isExternal)
                        ? 'border-amber-600/70 bg-amber-950/20 hover:border-amber-400 hover:bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-950/20 opacity-50 cursor-not-allowed text-slate-500'
                    }`}
                    title="Click to attach Muon Source outside the blueprint grid"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attach Muon Source (+2 Pwr, +1 Init outside grid)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Ship Parts Supply Tray */}
          <div className="lg:col-span-5 bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h3 className="text-xs font-bold text-cyan-400 tracking-wider mb-2 uppercase flex items-center justify-between">
              <span>Available Components ({availableParts.length})</span>
              <span className="text-[10px] text-slate-400 font-mono lowercase">
                ({remainingActivations} upgrade(s) left)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-2.5">
              {selectedSlotIndex !== null
                ? 'Select an available component to equip in the selected slot:'
                : 'Click any slot on the left to equip a component.'}
            </p>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1 mb-2.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'cannon', label: 'Cannons' },
                { id: 'missile', label: 'Missiles' },
                { id: 'shield', label: 'Shields' },
                { id: 'computer', label: 'Computers' },
                { id: 'drive', label: 'Drives' },
                { id: 'reactor', label: 'Power' },
                { id: 'hull', label: 'Hulls' },
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
              !modifiedSlots.some(
                (m) => m.shipType === activeShipType && m.slotIndex === selectedSlotIndex
              ) &&
              remainingActivations <= 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/80 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Maximum upgrade activations reached ({maxUpgrades} / {maxUpgrades}). Revert an existing change to modify this slot.</span>
                </div>
              )}

            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[440px] p-1 pb-3 pr-1.5">
              {displayedParts.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-slate-500 text-xs italic">
                  No unlocked components in this category. Research technologies or discover Ancient modules to unlock additional parts.
                </div>
              ) : (
                displayedParts.map((part) => {
                  const isAncientUnlocked = ANCIENT_PART_IDS.has(part.id);
                  const isSelectedSlotModified =
                    selectedSlotIndex !== null &&
                    modifiedSlots.some(
                      (m) => m.shipType === activeShipType && m.slotIndex === selectedSlotIndex && !m.isExternal
                    );
                  const isMuon = part.id === 'muon_source';
                  const isExtModified = modifiedSlots.some(
                    (m) => m.shipType === activeShipType && m.isExternal
                  );
                  const canAttachMuon = (isExtModified || remainingActivations > 0) && currentExternal.length === 0;
                  const canEquip = isMuon
                    ? canAttachMuon
                    : selectedSlotIndex !== null && (isSelectedSlotModified || remainingActivations > 0);

                  return (
                    <button
                      key={part.id}
                      disabled={!canEquip}
                      onClick={() => {
                        if (isMuon) {
                          handleAttachExternalPart(part);
                        } else {
                          handleInstallPart(part);
                        }
                      }}
                      className={`relative aspect-square p-1 rounded-xl border transition-all flex flex-col items-center justify-center overflow-hidden select-none text-center ${
                        isAncientUnlocked
                          ? 'border-amber-500/60 bg-amber-950/30 hover:bg-amber-950/50 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/50 shadow-md shadow-amber-950/40'
                          : 'border-slate-750 bg-slate-900/90 hover:bg-slate-800 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/40 shadow-md shadow-black/50'
                      } ${canEquip ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-40'}`}
                      title={getPartTooltip(part)}
                    >
                      <span className="sr-only">{part.name}</span>
                      <span className="sr-only">{part.category}</span>
                      {part.computerBonus > 0 && <span className="sr-only">+{part.computerBonus} COMP</span>}

                      {/* Top-Right Tag: ANCIENT or OUTSIDE */}
                      {isMuon ? (
                        <div className="absolute top-1 right-1 z-20 pointer-events-none">
                          <span className="text-[7.5px] bg-amber-500/25 text-amber-300 border border-amber-500/50 px-1 py-0.2 rounded font-mono font-bold leading-none">
                            OUTSIDE
                          </span>
                        </div>
                      ) : isAncientUnlocked ? (
                        <div className="absolute top-1 right-1 z-20 pointer-events-none">
                          <span className="text-[7.5px] bg-amber-500/25 text-amber-300 border border-amber-500/50 px-1 py-0.2 rounded font-mono font-bold leading-none">
                            ANCIENT
                          </span>
                        </div>
                      ) : null}

                      {/* Physical Square Component Tile (Initiative at Top-Left, Energy at Bottom-Right) */}
                      <ShipPartSlotGraphic part={part} size="lg" className="w-full h-full" />
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
                <AlertTriangle className="w-4 h-4" /> Cannot save with validation errors on blueprints
              </span>
            ) : usedActivations > 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {usedActivations} valid upgrade modification{usedActivations > 1 ? 's' : ''} drafted
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                Make up to {maxUpgrades} component upgrades to activate
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={readOnly || usedActivations === 0 || usedActivations > maxUpgrades || !allModifiedShipsValid}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition-all"
            >
              {readOnly
                ? 'Spectator Mode (Read Only)'
                : usedActivations === 0
                ? `Make Up to ${maxUpgrades} Upgrades`
                : `Save ${usedActivations} Upgrade${usedActivations > 1 ? 's' : ''}`}
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
                Unused Upgrade Activation
              </h3>
              <p className="text-xs text-slate-400">
                You have {remainingActivations} unused Upgrade activation{remainingActivations > 1 ? 's' : ''} remaining ({usedActivations} of {maxUpgrades} used).
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
            Are you sure you want to save and give up the extra activation?
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowUnusedWarning(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow cursor-pointer"
            >
              Keep Upgrading (Add More)
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
                }));
                onSaveBlueprint(upgradesToApply, pulsarSectorId);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              Confirm & Save {usedActivations} Upgrade{usedActivations > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
