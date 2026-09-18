import React from 'react';
import { Rocket, Wrench, Archive, Trophy, Zap, Cpu } from 'lucide-react';
import { DiscoveryTile, ShipType } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { SHIP_PARTS } from '../../engine/rules/partData';

interface DiscoveryChoiceModalProps {
  discovery: DiscoveryTile;
  player: PlayerState;
  onChoice: (keepForVictoryPoints: boolean, equipShipType?: ShipType, equipSlotIndex?: number) => void;
}

export const DiscoveryChoiceModal: React.FC<DiscoveryChoiceModalProps> = ({
  discovery,
  player,
  onChoice,
}) => {
  const part = discovery.shipPartId ? SHIP_PARTS[discovery.shipPartId] : null;

  const [selectedShipType, setSelectedShipType] = React.useState<ShipType>('cruiser');
  const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number>(0);

  const currentBlueprint = player.blueprints[selectedShipType];

  // Auto-select first empty slot when ship type changes
  React.useEffect(() => {
    if (currentBlueprint) {
      const emptyIdx = currentBlueprint.slots.findIndex((s) => s === null);
      setSelectedSlotIndex(emptyIdx !== -1 ? emptyIdx : 0);
    }
  }, [selectedShipType, currentBlueprint]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/20 p-6 flex flex-col items-center text-center overflow-hidden">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Discovery Icon Header */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3 border border-amber-300/40">
          <svg
            className="w-8 h-8 text-slate-950"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>

        <div className="text-xs uppercase tracking-widest text-amber-400 font-black mb-1">
          Ancient Discovery Uncovered
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide mb-1">
          {discovery.name}
        </h2>
        <div className="text-xs text-slate-400 mb-4 font-medium">
          Commander <span className="font-bold text-slate-200">{player.name}</span> must decide how to utilize this ancient artifact.
        </div>

        {/* Tile Details Card */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-4 text-left">
          <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
            {discovery.description}
          </p>

          {part && (
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Ancient Tech Module: {part.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {part.powerConsumed > 0 && `Power Consumed: ${part.powerConsumed} | `}
                  {part.powerProduced > 0 && `Power Produced: +${part.powerProduced} | `}
                  {part.initiativeBonus > 0 && `Initiative: +${part.initiativeBonus} | `}
                  {part.driveSpeed && `Drive Speed: ${part.driveSpeed} | `}
                  {part.hullBonus > 0 && `Hull: +${part.hullBonus} | `}
                  {part.shieldBonus > 0 && `Shield: -${part.shieldBonus} | `}
                  {part.computerBonus > 0 && `Computer: +${part.computerBonus} | `}
                  {part.dice && part.dice.length > 0 && (
                    <span className="text-amber-300 font-semibold">
                      {part.dice.map((d) => `${d.count}x ${d.damagePerHit} Dmg ${d.color} ${d.isMissile ? '🚀 (Missile)' : '(Cannon)'}`).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-mono font-bold">
                ANCIENT
              </span>
            </div>
          )}

          {discovery.immediateReward && (
            <div className="flex flex-wrap gap-2 mt-2">
              {discovery.immediateReward.money && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  +{discovery.immediateReward.money} Credits
                </span>
              )}
              {discovery.immediateReward.science && (
                <span className="px-2.5 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                  +{discovery.immediateReward.science} Science
                </span>
              )}
              {discovery.immediateReward.materials && (
                <span className="px-2.5 py-1 bg-amber-700/20 border border-amber-700/40 text-amber-500 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  +{discovery.immediateReward.materials} Materials
                </span>
              )}
              {discovery.immediateReward.grantShipType && (
                <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-purple-400" />
                  +1 Free {discovery.immediateReward.grantShipType.toUpperCase()}
                </span>
              )}
              {discovery.immediateReward.ancientTech && (
                <span className="px-2.5 py-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  +1 Free Regular Technology (Lowest Printed Cost)
                </span>
              )}
              {discovery.immediateReward.grantStructure === 'orbital' && (
                <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  +1 Ancient Orbital (+2 Materials)
                </span>
              )}
              {discovery.immediateReward.grantStructure === 'monolith' && (
                <span className="px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  +1 Ancient Monolith (3 VP)
                </span>
              )}
              {discovery.immediateReward.warpPortal && (
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                  Ancient Warp Portal (Connects all Warp Portals, 2 VP)
                </span>
              )}
            </div>
          )}
        </div>

        {/* If Ancient Tech Module: Immediate Blueprint Installation Interface */}
        {part && currentBlueprint && (
          <div className="w-full bg-slate-950/60 border border-cyan-900/50 rounded-xl p-3 mb-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Equip Immediately to Ship (Free)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Select ship class and slot to equip
              </span>
            </div>

            {/* Ship Class Tabs */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {(['interceptor', 'cruiser', 'dreadnought', 'starbase'] as ShipType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedShipType(st)}
                  className={`py-1 px-2 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                    selectedShipType === st
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Slot Grid for Chosen Blueprint */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-1">
              {currentBlueprint.slots.map((sl, sIdx) => {
                const isSelected = selectedSlotIndex === sIdx;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setSelectedSlotIndex(sIdx)}
                    className={`p-1.5 rounded-lg border text-left transition cursor-pointer text-[11px] ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/70 ring-1 ring-cyan-400 shadow'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                      <span>Slot {sIdx + 1}</span>
                      {isSelected && <span className="text-cyan-300 font-bold">TARGET</span>}
                    </div>
                    <div className="font-bold truncate text-slate-200">
                      {sl ? sl.name : <span className="text-slate-500 italic">Empty Slot</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {part ? (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChoice(false, selectedShipType, selectedSlotIndex)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-cyan-500/60 bg-cyan-600/20 hover:bg-cyan-600/35 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Wrench className="w-3.5 h-3.5" /> Equip Immediately
              </div>
              <span className="text-[10px] text-slate-300">
                To <strong>{selectedShipType.toUpperCase()}</strong> (Slot {selectedSlotIndex + 1})
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChoice(false)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Archive className="w-3.5 h-3.5 text-slate-400" /> Store in Reserve
              </div>
              <span className="text-[10px] text-slate-400">
                Save for later Upgrade action
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChoice(true)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-0.5 group-hover:scale-105 transition-transform">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Keep for 2 VP
              </div>
              <span className="text-[10px] text-slate-400">
                Score <strong className="text-amber-300">+2 VP</strong> at game end
              </span>
            </button>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChoice(true)}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/25 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4 text-amber-400" /> Keep for Victory Points
              </div>
              <span className="text-xs text-slate-400">
                Score <strong className="text-amber-300">+2 VP</strong> at game end
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChoice(false)}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/25 transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-sm mb-1 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-cyan-400" /> Take Immediate Reward
              </div>
              <span className="text-xs text-slate-400">
                {discovery.immediateReward?.grantShipType
                  ? `Deploy free ${discovery.immediateReward.grantShipType} to sector`
                  : 'Collect resources immediately'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
