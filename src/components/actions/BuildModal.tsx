import React, { useState } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile, ShipType } from '../../engine/types/galaxy';
import { getMaxBuildActivations } from '../../engine/rules/gameReducer';
import {
  Hammer,
  Rocket,
  Shield,
  Building2,
  CircleAlert,
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface BuildItemPayload {
  sectorId: string;
  itemType: ShipType | 'orbital' | 'monolith';
}

interface BuildModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  onBuild: (items: BuildItemPayload[]) => void;
  onClose: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  player,
  sectors,
  onBuild,
  onClose,
}) => {
  // Find eligible sectors (controlled by player, no enemy ships)
  const eligibleSectors = sectors.filter((s) => {
    if (s.discOwner !== player.id) return false;
    const hasEnemies = s.ships.some((ship) => ship.ownerId !== player.id);
    return !hasEnemies;
  });

  const maxBuild = getMaxBuildActivations(player);
  const hasNanorobots = player.techTrack.researched.some((t) => t.id === 'nanorobots');
  const hasOrbitalTech = player.techTrack.researched.some((t) => t.id === 'orbital');
  const hasMonolithTech = player.techTrack.researched.some((t) => t.id === 'monolith');

  const [slots, setSlots] = useState<BuildItemPayload[]>([
    { sectorId: eligibleSectors[0]?.id || '', itemType: 'interceptor' },
  ]);

  const buildItems: {
    type: ShipType | 'orbital' | 'monolith';
    name: string;
    cost: number;
    unlocked: boolean;
    description: string;
  }[] = [
    {
      type: 'interceptor',
      name: 'Interceptor',
      cost: 3,
      unlocked: true,
      description: 'Fast, agile light fighter with high base initiative.',
    },
    {
      type: 'cruiser',
      name: 'Cruiser',
      cost: 5,
      unlocked: true,
      description: 'Medium combat warship with balanced shielding and firepower.',
    },
    {
      type: 'dreadnought',
      name: 'Dreadnought',
      cost: 8,
      unlocked: true,
      description: 'Heavily armored capital flagship capable of carrying superweapons.',
    },
    {
      type: 'starbase',
      name: 'Starbase',
      cost: 3,
      unlocked: true,
      description: 'Stationary defensive orbital fortress with high firepower.',
    },
    {
      type: 'orbital',
      name: 'Orbital Structure',
      cost: 5,
      unlocked: hasOrbitalTech,
      description: 'Artificial satellite providing an additional planetary slot (requires Orbital tech).',
    },
    {
      type: 'monolith',
      name: 'Monolith',
      cost: 10,
      unlocked: hasMonolithTech,
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
        return 5;
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

  const canBuild = canAfford && allSlotsValid && eligibleSectors.length > 0;

  const handleAddSlot = () => {
    if (slots.length < maxBuild) {
      setSlots([
        ...slots,
        { sectorId: eligibleSectors[0]?.id || '', itemType: 'interceptor' },
      ]);
    }
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, idx) => idx !== index));
    }
  };

  const handleUpdateSlot = (index: number, updates: Partial<BuildItemPayload>) => {
    setSlots(slots.map((s, idx) => (idx === index ? { ...s, ...updates } : s)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-100 font-display">
                  SHIPYARDS & CONSTRUCTION
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold">
                  Up to {maxBuild} Items
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1 Build Action Disc allows building up to {maxBuild} ships or structures ({hasNanorobots ? 'Nanorobots active' : 'Standard 2'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-800/80 px-3 py-1 rounded-full text-xs text-amber-300 font-bold font-mono">
              <Hammer className="w-3.5 h-3.5 text-amber-400" />
              <span>{player.resources.materials} Mat</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {eligibleSectors.length === 0 ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
              <CircleAlert className="w-5 h-5 shrink-0 text-rose-400" />
              <span>
                No eligible construction sectors! You must control an uncontested sector with your Influence Disc to construct ships or structures.
              </span>
            </div>
          ) : (
            <>
              {/* Construction Slots */}
              <div className="space-y-4">
                {slots.map((slot, slotIdx) => {
                  const cost = getItemCost(slot.itemType);

                  return (
                    <div
                      key={slotIdx}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 relative shadow-inner"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            {slotIdx + 1}
                          </span>
                          <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                            Construction Item #{slotIdx + 1}
                            {slotIdx === 2 && ' (Nanorobots Bonus)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded">
                            {cost} Materials
                          </span>
                          {slots.length > 1 && (
                            <button
                              onClick={() => handleRemoveSlot(slotIdx)}
                              className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sector picker */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Shipyard Sector:
                        </label>
                        <select
                          value={slot.sectorId}
                          onChange={(e) => handleUpdateSlot(slotIdx, { sectorId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                        >
                          {eligibleSectors.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              Sector {sec.sectorNumber} ({sec.name || `Ring ${sec.ring}`} • {sec.ships.length} ships stationed)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Item Type choices */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Select Blueprint or Structure:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {buildItems.map((item) => {
                            const isSelected = slot.itemType === item.type;
                            return (
                              <button
                                key={item.type}
                                type="button"
                                disabled={!item.unlocked}
                                onClick={() => handleUpdateSlot(slotIdx, { itemType: item.type })}
                                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500 text-white'
                                    : item.unlocked
                                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                                    : 'bg-slate-900/40 border-slate-900 opacity-40 cursor-not-allowed text-slate-600'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-xs">{item.name}</span>
                                  <span className="text-[10px] font-mono font-bold text-amber-400">
                                    {item.cost}M
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 line-clamp-1">
                                  {item.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add slot button */}
              {slots.length < maxBuild && (
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-600/50 hover:border-amber-500 hover:bg-amber-950/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    Add {slots.length === 1 ? '2nd' : '3rd'} Construction Item (uses same Action Disc)
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <div>
            <div className="text-xs text-slate-300">
              Total Materials:{' '}
              <strong className={canAfford ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                {totalCost} / {player.resources.materials} Mat
              </strong>
            </div>
            {!canAfford && (
              <div className="text-[11px] text-rose-400 font-semibold">
                Need {totalCost - player.resources.materials} more Materials!
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!canBuild}
              onClick={() => onBuild(slots)}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs tracking-wide shadow-lg transition-all"
            >
              Construct {slots.length} {slots.length === 1 ? 'Item' : 'Items'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

