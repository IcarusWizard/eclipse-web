import React, { useState } from 'react';
import { GameState, PendingCombatConquest } from '../../engine/types/state';
import { PlanetSlot } from '../../engine/types/galaxy';
import { canColonizePlanetSlot } from '../../engine/rules/gameReducer';
import {
  Trophy,
  CircleDot,
  Ship,
  Coins,
  FlaskConical,
  Hammer,
  CheckCircle2,
  Lock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface CombatConquestModalProps {
  state: GameState;
  conquest: PendingCombatConquest;
  onConfirm: (claimInfluence: boolean, colonizePlanetIndices: number[]) => void;
}

export const CombatConquestModal: React.FC<CombatConquestModalProps> = ({
  state,
  conquest,
  onConfirm,
}) => {
  const sector = state.sectors.find((s) => s.id === conquest.sectorId);
  const winner = state.players.find((p) => p.id === conquest.winnerPlayerId);

  if (!sector || !winner) return null;

  const alreadyControls = sector.discOwner === winner.id;
  const hasDiscsAvailable = winner.influenceTrack.discsOnTrack > 0;

  // Default to true if user has available discs and doesn't already control the sector
  const [claimInfluence, setClaimInfluence] = useState<boolean>(
    alreadyControls || hasDiscsAvailable
  );

  const [selectedPlanetIndices, setSelectedPlanetIndices] = useState<number[]>([]);

  const readyColonyShips = winner.colonyShips.ready;
  const remainingColonyShips = readyColonyShips - selectedPlanetIndices.length;

  const handleTogglePlanet = (idx: number) => {
    if (selectedPlanetIndices.includes(idx)) {
      setSelectedPlanetIndices(selectedPlanetIndices.filter((i) => i !== idx));
    } else {
      if (remainingColonyShips > 0) {
        setSelectedPlanetIndices([...selectedPlanetIndices, idx]);
      }
    }
  };

  const handleConfirm = () => {
    // If not claiming influence, clear planet colonization
    const effectivePlanets = (claimInfluence || alreadyControls) ? selectedPlanetIndices : [];
    onConfirm(alreadyControls ? false : claimInfluence, effectivePlanets);
  };

  const handleDeclineAll = () => {
    onConfirm(false, []);
  };

  const willControl = alreadyControls || claimInfluence;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/70 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Victory Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-amber-300 font-display">
                  SECTOR CONQUEST: SECTOR {sector.sectorNumber}
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {sector.victoryPoints} VP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Commander <span className="text-slate-200 font-bold">{winner.name}</span> emerged victorious!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Step 1: Claim Sector Influence */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <CircleDot className="w-4 h-4 text-cyan-400" />
                <span>1. Sector Control (Influence Disc)</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Discs on Track: <strong className="text-cyan-300 font-bold">{winner.influenceTrack.discsOnTrack}</strong> / {winner.influenceTrack.totalDiscs}
              </div>
            </div>

            {alreadyControls ? (
              <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>You already control this sector with an Influence Disc.</span>
              </div>
            ) : hasDiscsAvailable ? (
              <label
                onClick={() => setClaimInfluence(!claimInfluence)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  claimInfluence
                    ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={claimInfluence}
                  onChange={(e) => setClaimInfluence(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 accent-cyan-500 shrink-0"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    Place an Influence Disc to take control of Sector {sector.sectorNumber}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Establishes territory control, unlocks sector colonization, and awards {sector.victoryPoints} Victory Points at game end.
                  </p>
                </div>
              </label>
            ) : (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>No Influence Discs remaining on track. Sector remains uninfluenced.</span>
              </div>
            )}
          </div>

          {/* Step 2: Planetary Colonization */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Ship className="w-4 h-4 text-indigo-400" />
                <span>2. Planetary Colonization (Optional)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <span>Colony Ships:</span>
                <span className="text-indigo-300 font-bold">
                  {remainingColonyShips} / {readyColonyShips} Ready
                </span>
              </div>
            </div>

            {!willControl ? (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                You must take control of this sector with an Influence Disc to deploy Colony Ships and colonize its habitats.
              </div>
            ) : sector.planets.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                There are no planetary habitats in Sector {sector.sectorNumber}.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sector.planets.map((planet, pIdx) => {
                    const isColonized = !!planet.colonizedBy;
                    const isSelected = selectedPlanetIndices.includes(pIdx);
                    const check = canColonizePlanetSlot(winner, planet);
                    const canSelect = isSelected || (check.canColonize && remainingColonyShips > 0);

                    return (
                      <div
                        key={planet.id || pIdx}
                        onClick={() => {
                          if (!isColonized && canSelect) {
                            handleTogglePlanet(pIdx);
                          }
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                          isColonized
                            ? 'bg-slate-900/40 border-slate-900 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-950/70 border-indigo-500 shadow ring-1 ring-indigo-500/60 cursor-pointer'
                            : canSelect
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer'
                            : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Resource Icon badge */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs ${
                              planet.resource === 'money'
                                ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                                : planet.resource === 'science'
                                ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                                : 'bg-amber-800/30 border-amber-600 text-amber-500'
                            }`}
                          >
                            {planet.resource === 'money' && <Coins className="w-3.5 h-3.5" />}
                            {planet.resource === 'science' && <FlaskConical className="w-3.5 h-3.5" />}
                            {planet.resource === 'material' && <Hammer className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex flex-col text-left">
                            <span className="font-bold text-xs capitalize text-slate-200 flex items-center gap-1.5">
                              {planet.resource} Planet
                              {planet.isAdvanced && (
                                <span className="text-[9px] font-mono px-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
                                  Adv
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isColonized
                                ? 'Already Colonized'
                                : isSelected
                                ? 'Deploying Colony Ship'
                                : !check.canColonize
                                ? check.reason
                                : 'Ready to Colonize'}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox / Lock */}
                        <div>
                          {isColonized ? (
                            <span className="text-[10px] text-slate-500">Taken</span>
                          ) : !check.canColonize && !isSelected ? (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!canSelect}
                              onChange={() => handleTogglePlanet(pIdx)}
                              className="w-4 h-4 rounded border-slate-700 text-indigo-500 focus:ring-indigo-400 accent-indigo-500 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950">
          {!alreadyControls && (
            <button
              onClick={handleDeclineAll}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Leave Unclaimed
            </button>
          )}
          {alreadyControls && <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all"
            >
              <span>Confirm Conquest</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
