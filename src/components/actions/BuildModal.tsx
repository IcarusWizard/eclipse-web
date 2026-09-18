import React, { useEffect } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { getMaxBuildActivations } from '../../engine/rules/gameReducer';
import { SHIP_LIMITS, countPlayerShips } from '../../engine/rules/shipValidation';
import {
  Hammer,
  CircleAlert,
  X,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export interface BuildItemPayload {
  sectorId: string;
  itemType: ShipType | 'orbital' | 'monolith';
}

export interface BuildModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  eligibleSectors: SectorTile[];
  slots: BuildItemPayload[];
  onChangeSlots: (slots: BuildItemPayload[]) => void;
  activeSlotIndex: number;
  onSelectSlotIndex: (index: number) => void;
  onBuild: (items: BuildItemPayload[]) => void;
  onClose: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  player,
  sectors,
  eligibleSectors,
  slots,
  onChangeSlots,
  activeSlotIndex,
  onSelectSlotIndex,
  onBuild,
  onClose,
}) => {
  const maxBuild = getMaxBuildActivations(player);
  const hasNanorobots = player.techTrack.researched.some((t) => t.id === 'nanorobots');
  const hasOrbitalTech = player.techTrack.researched.some((t) => t.id === 'orbital');
  const hasMonolithTech = player.techTrack.researched.some((t) => t.id === 'monolith');

  // Deployed ships across the galaxy
  const deployedShips = countPlayerShips(sectors, player.id);

  // Staged ships in other slots of the construction queue (excluding the currently active slot)
  const stagedInOtherSlots: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
  };
  slots.forEach((s, idx) => {
    if (idx !== activeSlotIndex && s.itemType in stagedInOtherSlots) {
      stagedInOtherSlots[s.itemType as ShipType]++;
    }
  });

  const currentSlot = slots[activeSlotIndex] || slots[0];
  const currentSector = sectors.find((s) => s.id === currentSlot?.sectorId);

  // Starbase restrictions for current sector
  const currentSectorHasStarbase = !!currentSector?.ships.some(
    (s) => s.ownerId === player.id && s.type === 'starbase'
  );
  const anotherSlotBuildingStarbaseHere = slots.some(
    (s, idx) => idx !== activeSlotIndex && s.sectorId === currentSlot?.sectorId && s.itemType === 'starbase'
  );
  const starbaseAllowedInCurrentSector = !currentSectorHasStarbase && !anotherSlotBuildingStarbaseHere;

  const getAvailableSupply = (type: ShipType): number => {
    return Math.max(0, SHIP_LIMITS[type] - deployedShips[type] - stagedInOtherSlots[type]);
  };

  const buildItems: {
    type: ShipType | 'orbital' | 'monolith';
    name: string;
    cost: number;
    limit?: number;
    supplyLeft?: number;
    unlocked: boolean;
    disabledReason?: string;
    description: string;
  }[] = [
    {
      type: 'interceptor',
      name: 'Interceptor',
      cost: 3,
      limit: SHIP_LIMITS.interceptor,
      supplyLeft: getAvailableSupply('interceptor'),
      unlocked: getAvailableSupply('interceptor') > 0,
      disabledReason: getAvailableSupply('interceptor') <= 0 ? `Max limit of ${SHIP_LIMITS.interceptor} reached` : undefined,
      description: 'Fast, agile light fighter with high base initiative (Limit 8).',
    },
    {
      type: 'cruiser',
      name: 'Cruiser',
      cost: 5,
      limit: SHIP_LIMITS.cruiser,
      supplyLeft: getAvailableSupply('cruiser'),
      unlocked: getAvailableSupply('cruiser') > 0,
      disabledReason: getAvailableSupply('cruiser') <= 0 ? `Max limit of ${SHIP_LIMITS.cruiser} reached` : undefined,
      description: 'Medium combat warship with balanced shielding and firepower (Limit 4).',
    },
    {
      type: 'dreadnought',
      name: 'Dreadnought',
      cost: 8,
      limit: SHIP_LIMITS.dreadnought,
      supplyLeft: getAvailableSupply('dreadnought'),
      unlocked: getAvailableSupply('dreadnought') > 0,
      disabledReason: getAvailableSupply('dreadnought') <= 0 ? `Max limit of ${SHIP_LIMITS.dreadnought} reached` : undefined,
      description: 'Heavily armored capital flagship capable of carrying superweapons (Limit 2).',
    },
    {
      type: 'starbase',
      name: 'Starbase',
      cost: 3,
      limit: SHIP_LIMITS.starbase,
      supplyLeft: getAvailableSupply('starbase'),
      unlocked: getAvailableSupply('starbase') > 0 && starbaseAllowedInCurrentSector,
      disabledReason: getAvailableSupply('starbase') <= 0
        ? `Max limit of ${SHIP_LIMITS.starbase} reached`
        : !starbaseAllowedInCurrentSector
        ? 'Max 1 Starbase per sector'
        : undefined,
      description: 'Stationary defensive orbital fortress (Limit 4, max 1 per sector).',
    },
    {
      type: 'orbital',
      name: 'Orbital Structure',
      cost: 4,
      unlocked: hasOrbitalTech,
      disabledReason: !hasOrbitalTech ? 'Requires Orbital tech' : undefined,
      description: 'Artificial satellite providing a Money or Science population slot (requires Orbital tech, max 1 per sector).',
    },
    {
      type: 'monolith',
      name: 'Monolith',
      cost: 10,
      unlocked: hasMonolithTech,
      disabledReason: !hasMonolithTech ? 'Requires Monolith tech' : undefined,
      description: 'Ancient mega-structure granting 2 Victory Points at game end (requires Monolith tech).',
    },
  ];

  const getItemCost = (type: ShipType | 'orbital' | 'monolith') => {
    switch (type) {
      case 'cruiser':
        return 5;
      case 'dreadnought':
        return 8;
      case 'orbital':
        return 4;
      case 'monolith':
        return 10;
      default:
        return 3;
    }
  };

  const totalCost = slots.reduce((sum, s) => sum + getItemCost(s.itemType), 0);
  const canAfford = player.resources.materials >= totalCost;
  const allSlotsValid =
    slots.length > 0 &&
    slots.every((s) => {
      if (!s.sectorId) return false;
      if (s.itemType === 'orbital' && !hasOrbitalTech) return false;
      if (s.itemType === 'monolith' && !hasMonolithTech) return false;
      return true;
    });

  // Validate that the entire construction batch does not exceed ship limits
  const overallQueuedShips: Record<ShipType, number> = {
    interceptor: 0,
    cruiser: 0,
    dreadnought: 0,
    starbase: 0,
  };
  const starbaseSectorSet = new Set<string>();
  let hasStarbaseConflict = false;

  for (const s of slots) {
    if (s.itemType in overallQueuedShips) {
      overallQueuedShips[s.itemType as ShipType]++;
    }
    if (s.itemType === 'starbase') {
      const targetSec = sectors.find((sec) => sec.id === s.sectorId);
      if (targetSec?.ships.some((ship) => ship.ownerId === player.id && ship.type === 'starbase')) {
        hasStarbaseConflict = true;
      }
      if (starbaseSectorSet.has(s.sectorId)) {
        hasStarbaseConflict = true;
      }
      starbaseSectorSet.add(s.sectorId);
    }
  }

  const exceedsShipLimits = (['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).some(
    (t) => deployedShips[t] + overallQueuedShips[t] > SHIP_LIMITS[t]
  );

  const canBuild =
    canAfford &&
    allSlotsValid &&
    eligibleSectors.length > 0 &&
    !exceedsShipLimits &&
    !hasStarbaseConflict;

  const handleAddSlot = () => {
    if (slots.length < maxBuild) {
      let defaultType: ShipType | 'orbital' | 'monolith' = 'interceptor';
      for (const st of ['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]) {
        if (deployedShips[st] + overallQueuedShips[st] < SHIP_LIMITS[st]) {
          defaultType = st;
          break;
        }
      }
      const newSlots = [
        ...slots,
        { sectorId: eligibleSectors[0]?.id || '', itemType: defaultType },
      ];
      onChangeSlots(newSlots);
      onSelectSlotIndex(newSlots.length - 1);
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length > 1) {
      const newSlots = slots.filter((_, idx) => idx !== index);
      onChangeSlots(newSlots);
      onSelectSlotIndex(Math.max(0, index - 1));
    }
  };

  const handleUpdateSlot = (index: number, updates: Partial<BuildItemPayload>) => {
    onChangeSlots(slots.map((s, idx) => (idx === index ? { ...s, ...updates } : s)));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && canBuild) {
        e.preventDefault();
        onBuild(slots);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canBuild, slots, onBuild, onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-700/80 rounded-2xl shadow-2xl overflow-visible text-slate-100 p-4 pointer-events-auto flex flex-col gap-3 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wide text-slate-200 uppercase font-display">
                  SHIPYARDS & CONSTRUCTION
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold">
                  {slots.length} / {maxBuild} Items
                </span>
                {hasNanorobots && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                    Nanorobots
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-amber-400/90 font-medium">
                Click any highlighted amber sector on the galaxy map to choose your shipyard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-full text-xs text-amber-300 font-bold font-mono">
              <Hammer className="w-3.5 h-3.5 text-amber-400" />
              <span>{player.resources.materials} Mat</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {eligibleSectors.length === 0 ? (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <CircleAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              No eligible construction sectors! You must control an uncontested sector with your Influence Disc to construct ships or structures.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Construction Queue Slots */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {slots.map((slot, sIdx) => {
                const sec = sectors.find((s) => s.id === slot.sectorId);
                const cost = getItemCost(slot.itemType);
                const isActive = sIdx === activeSlotIndex;

                return (
                  <div
                    key={sIdx}
                    onClick={() => onSelectSlotIndex(sIdx)}
                    className={`px-3 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 shrink-0 ${
                      isActive
                        ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                        isActive
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sIdx + 1}
                    </span>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-200 uppercase">
                          {slot.itemType}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          {cost}M
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {sec ? `Sec ${sec.sectorNumber}` : 'Select Sector'}
                      </span>
                    </div>

                    {slots.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlot(sIdx);
                        }}
                        className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors ml-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {slots.length < maxBuild && (
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-3 py-2 rounded-xl border border-dashed border-amber-600/60 hover:border-amber-400 hover:bg-amber-950/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item #{slots.length + 1}</span>
                </button>
              )}
            </div>

            {/* Active Slot Customization Box */}
            {currentSlot && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2.5">
                {/* Shipyard Indicator & Selector */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Item #{activeSlotIndex + 1} Shipyard:
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/80 text-amber-300 font-bold text-xs font-mono">
                      Sector {currentSector?.sectorNumber} ({currentSector?.name || `Ring ${currentSector?.ring}`})
                    </span>
                  </div>

                  <select
                    value={currentSlot.sectorId}
                    onChange={(e) => handleUpdateSlot(activeSlotIndex, { sectorId: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                  >
                    {eligibleSectors.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Sector {sec.sectorNumber} ({sec.name || `Ring ${sec.ring}`} • {sec.ships.length} ships)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Blueprint / Structure Buttons */}
                <div className="grid grid-cols-6 gap-1.5">
                  {buildItems.map((item) => {
                    const isSelected = currentSlot.itemType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        disabled={!item.unlocked}
                        onClick={() => handleUpdateSlot(activeSlotIndex, { itemType: item.type })}
                        className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-between min-h-[64px] ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500 shadow ring-1 ring-amber-500 text-white'
                            : item.unlocked
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                            : 'bg-slate-900/40 border-slate-900 opacity-50 cursor-not-allowed text-slate-500'
                        }`}
                        title={item.disabledReason ? `${item.name}: ${item.disabledReason}` : item.description}
                      >
                        <span className="font-bold text-[11px] truncate w-full">
                          {item.name}
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {item.cost}M
                          </span>
                          {item.limit !== undefined && item.supplyLeft !== undefined && (
                            <span
                              className={`text-[9px] font-mono px-1 rounded font-bold ${
                                item.supplyLeft > 0
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              }`}
                              title={`${item.supplyLeft} available in supply out of ${item.limit}`}
                            >
                              {item.supplyLeft}/{item.limit}
                            </span>
                          )}
                        </div>
                        {item.disabledReason && (
                          <span className="text-[8px] text-rose-400/90 truncate w-full mt-0.5">
                            {item.disabledReason}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <div className="text-xs">
            <span className="text-slate-400">Total: </span>
            <strong className={canAfford ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
              {totalCost} / {player.resources.materials} Materials
            </strong>
            {!canAfford && (
              <span className="text-rose-400 ml-2 font-semibold text-[11px]">
                (Need {totalCost - player.resources.materials} more)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!canBuild}
              onClick={() => onBuild(slots)}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              Construct {slots.length} {slots.length === 1 ? 'Item' : 'Items'} (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
