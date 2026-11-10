import React, { useState, useMemo } from 'react';
import { PlayerState } from '../../engine/types/player';
import { SectorTile } from '../../engine/types/galaxy';
import { areSectorsConnected } from '../../engine/rules/hexMath';
import {
  getMaxInfluenceActivations,
  getInfluenceColonyShipRefreshes,
  playerHasWormholeGenerator,
  findValidClaimSequence,
} from '../../engine/rules/gameReducer';
import type { WarpConduit } from '../../engine/rules/warpedUniverse';
import {
  CircleDot,
  Rocket,
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
  onConfirm: (
    claimSectors: string[],
    abandonSectors: string[],
    abandonReturnTrack?: Record<string, 'money' | 'science' | 'material'>
  ) => void;
  warpConduits?: WarpConduit[];
}

export const InfluenceModal: React.FC<InfluenceModalProps> = ({
  player,
  sectors,
  onClose,
  onConfirm,
  warpConduits,
}) => {
  const maxActivations = getMaxInfluenceActivations(player);
  const [claimSectors, setClaimSectors] = useState<string[]>([]);
  const [abandonSectors, setAbandonSectors] = useState<string[]>([]);
  const [abandonReturnTrack, setAbandonReturnTrack] = useState<
    Record<string, 'money' | 'science' | 'material'>
  >({});

  const hasWormholeGen = playerHasWormholeGenerator(player);

  const isDraco = player.faction.id === 'descendants_of_draco';

  // Sectors eligible to claim (either already selected in claimSectors or reachable next in sequence)
  const eligibleToClaim = useMemo(() => {
    // 1. Base controlled sectors (excluding sectors currently marked for abandonment)
    const baseControlled = new Set(
      sectors
        .filter((s) => s.discOwner === player.id && !abandonSectors.includes(s.id))
        .map((s) => s.id)
    );
    // 2. Currently simulated controlled sectors (including sectors already chosen to claim)
    const currentControlled = new Set([...baseControlled, ...claimSectors]);

    // Helper: is sector reachable from currentControlled?
    const isReachable = (sec: SectorTile) => {
      const hasFriendlyShip = sec.ships.some((s) => s.ownerId === player.id);
      if (hasFriendlyShip) return true;
      return sectors.some((other) => {
        if (other.id === sec.id) return false;
        const isFriendly =
          currentControlled.has(other.id) ||
          other.ships.some((s) => s.ownerId === player.id);
        if (!isFriendly) return false;
        return areSectorsConnected(other, sec, hasWormholeGen, warpConduits);
      });
    };

    // Helper: is sector directly reachable from baseControlled (without needing any claimSectors)?
    const isBaseReachable = (sec: SectorTile) => {
      const hasFriendlyShip = sec.ships.some((s) => s.ownerId === player.id);
      if (hasFriendlyShip) return true;
      return sectors.some((other) => {
        if (other.id === sec.id) return false;
        const isFriendly =
          baseControlled.has(other.id) ||
          other.ships.some((s) => s.ownerId === player.id);
        if (!isFriendly) return false;
        return areSectorsConnected(other, sec, hasWormholeGen, warpConduits);
      });
    };

    const candidates: Array<{
      sector: SectorTile;
      isSelected: boolean;
      activationIndex: number;
      unlockedBySectorNumber?: number;
    }> = [];

    // First, add all currently selected sectors in their sequential order
    for (let i = 0; i < claimSectors.length; i++) {
      const secId = claimSectors[i];
      const sec = sectors.find((s) => s.id === secId);
      if (!sec) continue;

      let unlockedBySectorNumber: number | undefined;
      if (!isBaseReachable(sec)) {
        // Find which earlier claimed sector unlocked it
        for (let j = 0; j < i; j++) {
          const prevSec = sectors.find((s) => s.id === claimSectors[j]);
          if (prevSec && areSectorsConnected(prevSec, sec, hasWormholeGen, warpConduits)) {
            unlockedBySectorNumber = prevSec.sectorNumber;
            break;
          }
        }
      }

      candidates.push({
        sector: sec,
        isSelected: true,
        activationIndex: i + 1,
        unlockedBySectorNumber,
      });
    }

    // Next, find all other eligible uncontrolled sectors
    for (const sec of sectors) {
      if (claimSectors.includes(sec.id)) continue;
      if (sec.discOwner) continue;
      if (sec.isNebula || sec.isBlackHole || sec.isSupernovaExploded) continue;

      const hasHostiles =
        (!isDraco && sec.ancientsCount > 0) ||
        sec.hasGCDS ||
        sec.ships.some(
          (s) => s.ownerId !== player.id && (!isDraco || (s.ownerId !== 'ancient' && s.type !== 'ancient'))
        );
      if (hasHostiles) continue;

      if (!isReachable(sec)) continue;

      let unlockedBySectorNumber: number | undefined;
      if (!isBaseReachable(sec)) {
        // Find which claimed sector unlocked this one
        for (const claimedId of claimSectors) {
          const prevSec = sectors.find((s) => s.id === claimedId);
          if (prevSec && areSectorsConnected(prevSec, sec, hasWormholeGen, warpConduits)) {
            unlockedBySectorNumber = prevSec.sectorNumber;
            break;
          }
        }
      }

      candidates.push({
        sector: sec,
        isSelected: false,
        activationIndex: 0,
        unlockedBySectorNumber,
      });
    }

    return candidates;
  }, [sectors, player.id, claimSectors, abandonSectors, hasWormholeGen, isDraco, warpConduits]);

  // Sectors currently controlled by this player (eligible to abandon)
  const controlledSectors = useMemo(() => {
    return sectors.filter((sec) => sec.discOwner === player.id);
  }, [sectors, player.id]);

  const colonyShipRefreshes = getInfluenceColonyShipRefreshes(player);
  const totalActivations = claimSectors.length + abandonSectors.length;
  const readyShipsAfter = Math.min(player.colonyShips.total, player.colonyShips.ready + colonyShipRefreshes);
  const discsRemainingAfter = player.influenceTrack.discsOnTrack - 1 - claimSectors.length + abandonSectors.length;
  const canAffordDiscs = player.influenceTrack.discsOnTrack >= 1 && discsRemainingAfter >= 0;

  const toggleClaim = (sectorId: string) => {
    if (claimSectors.includes(sectorId)) {
      // Prune any subsequent claim that was only valid because of this claimed sector
      const remaining = claimSectors.filter((id) => id !== sectorId);
      const validSeq = findValidClaimSequence(
        remaining,
        sectors,
        player.id,
        abandonSectors,
        hasWormholeGen,
        warpConduits,
        isDraco
      );
      setClaimSectors(validSeq || []);
    } else {
      if (totalActivations >= maxActivations) return;
      const nextClaims = [...claimSectors, sectorId];
      const validSeq = findValidClaimSequence(
        nextClaims,
        sectors,
        player.id,
        abandonSectors,
        hasWormholeGen,
        warpConduits,
        isDraco
      );
      if (validSeq) {
        setAbandonSectors(abandonSectors.filter((id) => id !== sectorId));
        setClaimSectors(validSeq);
      }
    }
  };

  const toggleAbandon = (sectorId: string) => {
    if (abandonSectors.includes(sectorId)) {
      setAbandonSectors(abandonSectors.filter((id) => id !== sectorId));
    } else {
      if (totalActivations >= maxActivations) return;
      const nextAbandon = [...abandonSectors, sectorId];
      setAbandonSectors(nextAbandon);
      // Re-validate claimSectors in case abandoning this sector broke a connection
      const validClaims = findValidClaimSequence(
        claimSectors.filter((id) => id !== sectorId),
        sectors,
        player.id,
        nextAbandon,
        hasWormholeGen,
        warpConduits,
        isDraco
      );
      setClaimSectors(validClaims || []);
    }
  };

  const handleExecute = () => {
    if (!canAffordDiscs) return;
    onConfirm(claimSectors, abandonSectors, abandonReturnTrack);
  };

  const moneyFull = player.population.money.cubesOnBoard >= 11;
  const scienceFull = player.population.science.cubesOnBoard >= 11;

  return (
    <div className="fixed top-14 right-4 z-40 w-96 sm:w-[440px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-80px)] pointer-events-auto font-sans animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="bg-slate-950/95 border-2 border-cyan-500/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 shrink-0">
              <CircleDot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                INFLUENCE
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                  {totalActivations} / {maxActivations} Activations
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 leading-tight">
                Flip up to {colonyShipRefreshes} Colony Ship{colonyShipRefreshes === 1 ? '' : 's'}, modify Control on up to {maxActivations} sectors in sequence.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Influence window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Colony Ships Readying Perk */}
          <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                  Colony Ships Readied
                </div>
                <div className="text-[11px] text-slate-400">
                  Flips up to {colonyShipRefreshes} used Colony Ship{colonyShipRefreshes === 1 ? '' : 's'} faceup automatically upon action execution.
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
              <span className="text-[11px] text-slate-500">1 Disc per sector • Resolved in sequence</span>
            </div>

            {eligibleToClaim.length === 0 ? (
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500">
                No uncontrolled sectors currently eligible for claiming.
                Station a ship or establish a wormhole connection from a controlled sector.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {eligibleToClaim.map(({ sector: sec, isSelected, activationIndex, unlockedBySectorNumber }) => {
                  const hasShip = sec.ships.some((s) => s.ownerId === player.id);
                  const isMaxReached = !isSelected && totalActivations >= maxActivations;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => !isMaxReached && toggleClaim(sec.id)}
                      className={`p-3 rounded-xl border transition-all ${
                        isMaxReached
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      } flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : !isMaxReached
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          : ''
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5 flex-wrap">
                          <span>Sector {sec.sectorNumber}</span>
                          <span className="text-[10px] text-slate-500 font-normal">Ring {sec.ring}</span>
                          {hasShip && (
                            <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded font-mono">
                              Ship stationed
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-bold">
                              Activation #{activationIndex}
                            </span>
                          )}
                          {unlockedBySectorNumber && (
                            <span className="text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                              ⚡ Unlocked via Sector {unlockedBySectorNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sec.planets.length} Planet Slots • {sec.victoryPoints} VP
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isMaxReached}
                        className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 hover:bg-rose-500 hover:text-white'
                            : isMaxReached
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title={isSelected ? 'Click to unclaim' : isMaxReached ? 'Max activations reached' : 'Click to claim'}
                      >
                        {isSelected ? `Claiming #${activationIndex}` : isMaxReached ? 'Max Reached' : 'Claim'}
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
              <div className="grid grid-cols-1 gap-2">
                {controlledSectors.map((sec) => {
                  const isSelected = abandonSectors.includes(sec.id);
                  const popCount = sec.planets.filter((p) => p.colonizedBy === player.id).length;
                  const flexiblePlanets = sec.planets.filter(
                    (p) => p.colonizedBy === player.id && (p.isOrbital || p.resource === 'any')
                  );

                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleAbandon(sec.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
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

                      {/* Bug 120: Destination track selection for orbital or wild planet cubes */}
                      {isSelected && flexiblePlanets.length > 0 && (
                        <div
                          className="mt-2.5 pt-2 border-t border-amber-900/60 space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {flexiblePlanets.map((fp) => {
                            const isOrb = Boolean(fp.isOrbital);
                            const options: ('money' | 'science' | 'material')[] = isOrb
                              ? ['money', 'science']
                              : ['money', 'science', 'material'];
                            const currentChoice =
                              abandonReturnTrack[fp.id] ||
                              (isOrb
                                ? fp.colonizedResource === 'science' && !scienceFull
                                  ? 'science'
                                  : !moneyFull
                                  ? 'money'
                                  : 'science'
                                : fp.colonizedResource && player.population[fp.colonizedResource].cubesOnBoard < 11
                                ? fp.colonizedResource
                                : !moneyFull
                                ? 'money'
                                : !scienceFull
                                ? 'science'
                                : 'material');

                            return (
                              <div
                                key={fp.id}
                                className="text-[10px] bg-slate-900/90 p-1.5 rounded-lg border border-slate-800"
                              >
                                <span className="font-semibold text-slate-300">
                                  Return {isOrb ? 'Orbital' : 'Wild'} Cube to:
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  {options.map((opt) => {
                                    const isOptFull = player.population[opt].cubesOnBoard >= 11;
                                    const isChosen = currentChoice === opt;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        disabled={isOptFull}
                                        onClick={() => {
                                          setAbandonReturnTrack((prev) => ({
                                            ...prev,
                                            [fp.id]: opt,
                                          }));
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                          isOptFull
                                            ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed line-through'
                                            : isChosen
                                            ? 'bg-amber-400 text-slate-950 font-black shadow'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                        }`}
                                        title={
                                          isOptFull
                                            ? 'Track is FULL (11 cubes / production 2)'
                                            : `Return to ${opt}`
                                        }
                                      >
                                        {opt} {isOptFull ? '(Full)' : `(${player.population[opt].cubesOnBoard}/11)`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
              <span>Optionally ready {colonyShipRefreshes} colony ship{colonyShipRefreshes === 1 ? '' : 's'} without moving sector discs.</span>
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
