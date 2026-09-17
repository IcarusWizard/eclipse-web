import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { ShipType } from '../../engine/types/galaxy';
import { ShipPart } from '../../engine/types/blueprints';
import { calculateBlueprintStats, SHIP_LIMITS } from '../../engine/rules/shipValidation';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { getMaxUpgradeActivations } from '../../engine/rules/gameReducer';
import {
  Zap,
  Shield,
  Crosshair,
  Heart,
  Navigation,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Wrench,
  RotateCcw,
} from 'lucide-react';

interface ShipBlueprintEditorProps {
  player: PlayerState;
  onSaveBlueprint: (upgrades: { shipType: ShipType; slotIndex: number; partId: string | null }[]) => void;
  onClose: () => void;
}

export const ShipBlueprintEditor: React.FC<ShipBlueprintEditorProps> = ({
  player,
  onSaveBlueprint,
  onClose,
}) => {
  const [activeShipType, setActiveShipType] = useState<ShipType>('interceptor');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Local draft of blueprints
  const [draftBlueprints, setDraftBlueprints] = useState<Record<ShipType, (ShipPart | null)[]>>(() => ({
    interceptor: [...player.blueprints.interceptor.slots],
    cruiser: [...player.blueprints.cruiser.slots],
    dreadnought: [...player.blueprints.dreadnought.slots],
    starbase: [...player.blueprints.starbase.slots],
  }));

  const maxUpgrades = getMaxUpgradeActivations(player);

  // Compute modified slots across all ship classes relative to original player blueprints
  const modifiedSlots = useMemo(() => {
    const list: {
      shipType: ShipType;
      slotIndex: number;
      oldPart: ShipPart | null;
      newPart: ShipPart | null;
    }[] = [];
    const shipTypes: ShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];
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
    }
    return list;
  }, [draftBlueprints, player.blueprints]);

  const usedActivations = modifiedSlots.length;
  const remainingActivations = Math.max(0, maxUpgrades - usedActivations);

  const currentSlots = draftBlueprints[activeShipType] || [];
  const baseBp = player.blueprints[activeShipType];

  const currentBlueprint = {
    ...baseBp,
    slots: currentSlots,
  };

  const stats = calculateBlueprintStats(currentBlueprint);

  // Check that all ship classes with modifications are valid
  const allModifiedShipsValid = useMemo(() => {
    const shipTypes: ShipType[] = ['interceptor', 'cruiser', 'dreadnought', 'starbase'];
    for (const st of shipTypes) {
      const isModified = modifiedSlots.some((m) => m.shipType === st);
      if (isModified || st === activeShipType) {
        const bp = { ...player.blueprints[st], slots: draftBlueprints[st] || [] };
        const bpStats = calculateBlueprintStats(bp);
        if (!bpStats.isValid) return false;
      }
    }
    return true;
  }, [modifiedSlots, draftBlueprints, player.blueprints, activeShipType]);

  const handleInstallPart = (part: ShipPart) => {
    if (selectedSlotIndex === null) return;
    const isSlotCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.slotIndex === selectedSlotIndex
    );
    if (!isSlotCurrentlyModified && remainingActivations <= 0) return;

    const newSlots = [...currentSlots];
    newSlots[selectedSlotIndex] = part;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
  };

  const handleClearSlot = (index: number) => {
    const isSlotCurrentlyModified = modifiedSlots.some(
      (m) => m.shipType === activeShipType && m.slotIndex === index
    );
    if (!isSlotCurrentlyModified && remainingActivations <= 0) return;

    const newSlots = [...currentSlots];
    newSlots[index] = null;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
    setSelectedSlotIndex(null);
  };

  const handleRevertSlot = (index: number) => {
    const origPart = player.blueprints[activeShipType].slots[index] || null;
    const newSlots = [...currentSlots];
    newSlots[index] = origPart;
    setDraftBlueprints((prev) => ({ ...prev, [activeShipType]: newSlots }));
  };

  const handleSave = () => {
    if (usedActivations === 0 || usedActivations > maxUpgrades || !allModifiedShipsValid) return;
    const upgradesToApply = modifiedSlots.map((m) => ({
      shipType: m.shipType,
      slotIndex: m.slotIndex,
      partId: m.newPart?.id || null,
    }));
    onSaveBlueprint(upgradesToApply);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
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

        {/* Ship Class Tabs with Per-Ship Upgrade Badges */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2">
          {(['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).map((type) => {
            const isActive = activeShipType === type;
            const bp = { ...player.blueprints[type], slots: draftBlueprints[type] || [] };
            const bpStats = calculateBlueprintStats(bp);
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {/* Left 2 Cols: Ship Blueprint Grid & Live Stats */}
          <div className="md:col-span-2 space-y-6">
            {/* Live Stats HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> POWER BALANCE
                </span>
                <span
                  className={`text-base font-bold mt-1 ${
                    stats.totalPowerProduced >= stats.totalPowerConsumed
                      ? 'text-emerald-400'
                      : 'text-rose-400 animate-pulse'
                  }`}
                >
                  +{stats.totalPowerProduced} / -{stats.totalPowerConsumed} PWR
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Heart className="w-3.5 h-3.5 text-rose-400" /> HULL / HP
                </span>
                <span className="text-base font-bold text-slate-200 mt-1">
                  {stats.totalHull} HP
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" /> DRIVE SPEED
                </span>
                <span
                  className={`text-base font-bold mt-1 ${
                    activeShipType === 'starbase' || stats.totalDriveSpeed > 0
                      ? 'text-cyan-400'
                      : 'text-rose-400'
                  }`}
                >
                  {stats.totalDriveSpeed} Speed
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Crosshair className="w-3.5 h-3.5 text-indigo-400" /> INITIATIVE
                </span>
                <span className="text-base font-bold text-indigo-300 mt-1">
                  +{stats.totalInitiative} Init
                </span>
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
                  Modular Component Slots ({currentSlots.length} Slots)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {remainingActivations > 0
                    ? `${remainingActivations} upgrade${remainingActivations > 1 ? 's' : ''} available`
                    : 'All activations allocated'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentSlots.map((part, idx) => {
                  const isSelected = selectedSlotIndex === idx;
                  const isModified = modifiedSlots.some(
                    (m) => m.shipType === activeShipType && m.slotIndex === idx
                  );
                  const canSelect = isModified || remainingActivations > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (canSelect) {
                          setSelectedSlotIndex(idx);
                        }
                      }}
                      className={`relative min-h-[100px] rounded-lg border-2 p-2.5 flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950 cursor-pointer'
                          : isModified
                          ? 'border-indigo-500 bg-indigo-950/30 shadow ring-1 ring-indigo-500/40 cursor-pointer'
                          : part
                          ? canSelect
                            ? 'border-slate-700 bg-slate-800/60 hover:border-slate-500 cursor-pointer'
                            : 'border-slate-800 bg-slate-900/40 opacity-70 cursor-not-allowed'
                          : canSelect
                          ? 'border-dashed border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer'
                          : 'border-dashed border-slate-900 bg-slate-950/20 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          Slot {idx + 1}
                          {isModified && (
                            <span className="text-[9px] bg-indigo-500 text-white font-black px-1 rounded uppercase">
                              Modified
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {isModified && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertSlot(idx);
                              }}
                              className="text-cyan-400 hover:text-cyan-200 p-0.5"
                              title="Revert to original component"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {part && (
                            <button
                              disabled={!isModified && remainingActivations <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearSlot(idx);
                              }}
                              className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                              title="Remove part"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {part ? (
                        <div className="mt-1">
                          <div className="font-bold text-xs text-slate-200 leading-tight">
                            {part.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1">
                            {part.powerProduced > 0 && (
                              <span className="text-emerald-400">+{part.powerProduced} Pwr</span>
                            )}
                            {part.powerConsumed > 0 && (
                              <span className="text-amber-400">-{part.powerConsumed} Pwr</span>
                            )}
                            {part.dice && (
                              <span className="text-orange-400">
                                {part.dice.map((d) => `${d.count} ${d.color}`).join(', ')}
                              </span>
                            )}
                            {part.driveSpeed && (
                              <span className="text-cyan-400">Spd {part.driveSpeed}</span>
                            )}
                            {part.hullBonus > 0 && (
                              <span className="text-rose-400">+{part.hullBonus} HP</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-3 text-slate-600">
                          <Plus className="w-5 h-5 mb-1 opacity-60" />
                          <span className="text-[10px]">Empty Slot</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Ship Parts Supply Tray */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h3 className="text-xs font-bold text-cyan-400 tracking-wider mb-2 uppercase flex items-center justify-between">
              <span>Component Supply</span>
              <span className="text-[10px] text-slate-400 font-mono lowercase">
                ({remainingActivations} upgrade(s) left)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              {selectedSlotIndex !== null
                ? `Select a component to equip in Slot ${selectedSlotIndex + 1}:`
                : 'Click any slot on the left to equip a component.'}
            </p>

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

            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {Object.values(SHIP_PARTS).map((part) => {
                const STANDARD_PART_IDS = ['nuclear_source', 'nuclear_drive', 'electron_computer', 'ion_cannon', 'hull'];
                const ANCIENT_PART_IDS = ['ion_turret', 'shard_hull', 'flux_shield'];
                const isStandard = STANDARD_PART_IDS.includes(part.id);
                const isAncientPart = ANCIENT_PART_IDS.includes(part.id);
                const isAncientUnlocked = (player.unlockedAncientParts || []).includes(part.id);
                const isTechResearched = (player.techTrack.researched || []).some(
                  (t) => t.unlocksPartId === part.id || t.id === part.id
                );
                const isUnlocked = isStandard || isTechResearched || isAncientUnlocked;

                const isSelectedSlotModified =
                  selectedSlotIndex !== null &&
                  modifiedSlots.some(
                    (m) => m.shipType === activeShipType && m.slotIndex === selectedSlotIndex
                  );
                const canEquip =
                  isUnlocked &&
                  selectedSlotIndex !== null &&
                  (isSelectedSlotModified || remainingActivations > 0);

                return (
                  <button
                    key={part.id}
                    disabled={!canEquip}
                    onClick={() => handleInstallPart(part)}
                    className={`w-full text-left p-2.5 rounded border transition-all ${
                      isAncientUnlocked
                        ? 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-400'
                        : isUnlocked
                        ? 'border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-600'
                        : 'border-slate-900 bg-slate-950/60 opacity-50 cursor-not-allowed'
                    } ${canEquip ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        {part.name}
                        {isAncientUnlocked && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-mono">
                            ANCIENT
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 inline" /> {isAncientPart ? 'Discovery' : 'Research'}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">{part.category}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1.5">
                      {part.powerProduced > 0 && (
                        <span className="text-emerald-400">+{part.powerProduced} Pwr</span>
                      )}
                      {part.powerConsumed > 0 && (
                        <span className="text-amber-400">-{part.powerConsumed} Pwr</span>
                      )}
                      {part.dice && (
                        <span className="text-orange-400">
                          {part.dice.map((d) => `${d.count} ${d.color}`).join(', ')}
                        </span>
                      )}
                      {part.driveSpeed && (
                        <span className="text-cyan-400">Speed {part.driveSpeed}</span>
                      )}
                      {part.computerBonus > 0 && (
                        <span className="text-indigo-400">+{part.computerBonus} Hit</span>
                      )}
                      {part.shieldBonus > 0 && (
                        <span className="text-blue-400">-{part.shieldBonus} Shield</span>
                      )}
                      {part.hullBonus > 0 && (
                        <span className="text-rose-400">+{part.hullBonus} HP</span>
                      )}
                    </div>
                  </button>
                );
              })}
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
              disabled={usedActivations === 0 || usedActivations > maxUpgrades || !allModifiedShipsValid}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg transition-all"
            >
              {usedActivations === 0
                ? `Make Up to ${maxUpgrades} Upgrades`
                : `Save ${usedActivations} Upgrade${usedActivations > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
