import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile } from '../../engine/types/galaxy';
import { areSectorsConnected } from '../../engine/rules/hexMath';
import { getMaxInfluenceActivations } from '../../engine/rules/gameReducer';
import {
  CircleDot,
  Ship,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface InfluenceModalProps {
  player: PlayerState;
  sectors: SectorTile[];
  onClose: () => void;
  onConfirm: (claimSectors: string[], abandonSectors: string[]) => void;
}

export const InfluenceModal: React.FC<InfluenceModalProps> = ({
  player,
  sectors,
  onClose,
  onConfirm,
}) => {
  const maxActivations = getMaxInfluenceActivations(player);
  const [claimSectors, setClaimSectors] = useState<string[]>([]);
  const [abandonSectors, setAbandonSectors] = useState<string[]>([]);

  const hasWormholeGen = player.techTrack.researched.some((t) => t.id === 'wormhole_generator');

  const isDraco = player.faction.id === 'descendants_of_draco';

  // Sectors eligible to claim:
  // - Not controlled by anyone
  // - No hostile forces (ancients, gcds, enemy ships) - Draco coexists peacefully with Ancients!
  // - Stationed friendly ship OR connected by wormhole to friendly-controlled sector
  const eligibleToClaim = useMemo(() => {
    return sectors.filter((sec) => {
      if (sec.discOwner) return false;
      const hasHostiles =
        (!isDraco && sec.ancientsCount > 0) ||
        sec.hasGCDS ||
        sec.ships.some(
          (s) => s.ownerId !== player.id && (!isDraco || (s.ownerId !== 'ancient' && s.type !== 'ancient'))
        );
      if (hasHostiles) {
        return false;
      }
      const hasFriendlyShip = sec.ships.some((s) => s.ownerId === player.id);
      const hasConnectedFriendly = sectors.some((other) => {
        if (other.id === sec.id) return false;
        const isFriendly = other.discOwner === player.id || other.ships.some((s) => s.ownerId === player.id);
        if (!isFriendly) return false;
        return areSectorsConnected(other, sec, hasWormholeGen);
      });
      return hasFriendlyShip || hasConnectedFriendly;
    });
  }, [sectors, player.id, hasWormholeGen, isDraco]);

  // Sectors currently controlled by this player (eligible to abandon)
  const controlledSectors = useMemo(() => {
    return sectors.filter((sec) => sec.discOwner === player.id);
  }, [sectors, player.id]);

  const totalActivations = claimSectors.length + abandonSectors.length;
  const readyShipsAfter = Math.min(player.colonyShips.total, player.colonyShips.ready + 2);
  const discsRemainingAfter = player.influenceTrack.discsOnTrack - 1 - claimSectors.length + abandonSectors.length;
  const canAffordDiscs = player.influenceTrack.discsOnTrack >= 1 && discsRemainingAfter >= 0;

  const toggleClaim = (sectorId: string) => {
    if (claimSectors.includes(sectorId)) {
      setClaimSectors(claimSectors.filter((id) => id !== sectorId));
    } else {
      if (totalActivations >= maxActivations) return;
      // Also ensure not in abandon
      setAbandonSectors(abandonSectors.filter((id) => id !== sectorId));
      setClaimSectors([...claimSectors, sectorId]);
    }
  };

  const toggleAbandon = (sectorId: string) => {
    if (abandonSectors.includes(sectorId)) {
      setAbandonSectors(abandonSectors.filter((id) => id !== sectorId));
    } else {
      if (totalActivations >= maxActivations) return;
      // Also ensure not in claim
      setClaimSectors(claimSectors.filter((id) => id !== sectorId));
      setAbandonSectors([...abandonSectors, sectorId]);
    }
  };

  const handleExecute = () => {
    if (!canAffordDiscs) return;
    onConfirm(claimSectors, abandonSectors);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400">
              <CircleDot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-display flex items-center gap-2">
                INFLUENCE ACTION
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                  {totalActivations} / {maxActivations} Activations
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Flip up to 2 Colony Ships faceup, and modify Control on up to {maxActivations} eligible sectors.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Colony Ships Readying Perk */}
          <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
                <Ship className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                  Colony Ships Readied
                </div>
                <div className="text-[11px] text-slate-400">
                  Flips up to 2 used Colony Ships faceup automatically upon action execution.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold font-mono">
              <span className="text-slate-400">{player.colonyShips.ready} Ready</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-emerald-400">{readyShipsAfter} Ready</span>
              <span className="text-xs text-slate-500 font-sans">/ {player.colonyShips.total}</span>
            </div>
          </div>

          {/* Influence Discs Balance Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">On Track</div>
              <div className="text-base font-bold text-slate-200 font-mono">
                {player.influenceTrack.discsOnTrack}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Action Cost</div>
              <div className="text-base font-bold text-rose-400 font-mono">-1</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Net Claims / Returns</div>
              <div className="text-base font-bold font-mono text-cyan-300">
                {abandonSectors.length - claimSectors.length >= 0
                  ? `+${abandonSectors.length - claimSectors.length}`
                  : `${abandonSectors.length - claimSectors.length}`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Projected Track</div>
              <div
                className={`text-base font-bold font-mono ${
                  discsRemainingAfter >= 0 ? 'text-emerald-400' : 'text-rose-500'
                }`}
              >
                {discsRemainingAfter} / {player.influenceTrack.totalDiscs}
              </div>
            </div>
          </div>

          {/* Sectors Available to Claim */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" /> Claim Sector Control ({claimSectors.length} selected)
              </span>
              <span className="text-[11px] text-slate-500">Costs 1 Disc from Track per sector</span>
            </div>

            {eligibleToClaim.length === 0 ? (
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500">
                No uncontrolled sectors currently eligible for claiming.
                Station a ship or establish a wormhole connection from a controlled sector.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {eligibleToClaim.map((sec) => {
                  const isSelected = claimSectors.includes(sec.id);
                  const hasShip = sec.ships.some((s) => s.ownerId === player.id);
                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleClaim(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                          <span>Sector {sec.sectorNumber}</span>
                          <span className="text-[10px] text-slate-500 font-normal">Ring {sec.ring}</span>
                          {hasShip && (
                            <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded font-mono">
                              Ship stationed
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sec.planets.length} Planet Slots • {sec.victoryPoints} VP
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Claiming' : 'Claim'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sectors Controlled (Available to Abandon) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Minus className="w-3.5 h-3.5 text-amber-400" /> Abandon Controlled Sector ({abandonSectors.length} selected)
              </span>
              <span className="text-[11px] text-slate-500">Returns 1 Disc to Track & returns population cubes</span>
            </div>

            {controlledSectors.length === 0 ? (
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500">
                You currently do not control any sectors to abandon.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {controlledSectors.map((sec) => {
                  const isSelected = abandonSectors.includes(sec.id);
                  const popCount = sec.planets.filter((p) => p.colonizedBy === player.id).length;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleAbandon(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                          <span>Sector {sec.sectorNumber}</span>
                          <span className="text-[10px] text-slate-500 font-normal">Ring {sec.ring}</span>
                        </div>
                        <div className="text-[10px] text-amber-400 mt-0.5">
                          {popCount > 0 ? `${popCount} Population Cube(s) will return` : 'No population'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isSelected ? 'Abandoning' : 'Abandon'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {!canAffordDiscs && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Insufficient influence discs on track.
              </span>
            )}
            {canAffordDiscs && totalActivations === 0 && (
              <span>Optionally ready 2 colony ships without moving sector discs.</span>
            )}
            {canAffordDiscs && totalActivations > 0 && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to execute {totalActivations} sector activation(s).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!canAffordDiscs}
              onClick={handleExecute}
              className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow ${
                canAffordDiscs
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Execute Influence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
