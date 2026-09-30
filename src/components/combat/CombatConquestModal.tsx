import React, { useState } from 'react';
import { GameState, PendingCombatConquest } from '../../engine/types/state';
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
  Shield,
  Crosshair,
  Flame,
} from 'lucide-react';

interface CombatConquestModalProps {
  state: GameState;
  conquest: PendingCombatConquest;
  onConfirm: (
    claimInfluence: boolean,
    colonizePlanetIndices: number[],
    planetResourceChoices?: Record<number, 'money' | 'science' | 'material'>
  ) => void;
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
  const canClaim = conquest.canClaimInfluence !== false;

  // Default to true if user has available discs, can claim, and doesn't already control the sector
  const [claimInfluence, setClaimInfluence] = useState<boolean>(
    canClaim && (alreadyControls || hasDiscsAvailable)
  );

  const [selectedPlanetIndices, setSelectedPlanetIndices] = useState<number[]>([]);
  const [planetResourceChoices, setPlanetResourceChoices] = useState<
    Record<number, 'money' | 'science' | 'material'>
  >({});

  const hasAdvancedEconomy = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_economy' || t.id === 'metasynthesis'
  );
  const hasAdvancedLabs = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_labs' || t.id === 'metasynthesis'
  );
  const hasAdvancedMining = winner.techTrack.researched.some(
    (t) => t.id === 'advanced_mining' || t.id === 'metasynthesis'
  );

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
    // If not claiming influence or cannot claim, clear planet colonization
    const effectivePlanets = canClaim && (claimInfluence || alreadyControls) ? selectedPlanetIndices : [];
    onConfirm(
      canClaim && !alreadyControls ? claimInfluence : false,
      effectivePlanets,
      planetResourceChoices
    );
  };

  const handleDeclineAll = () => {
    onConfirm(false, []);
  };

  const willControl = canClaim && (alreadyControls || claimInfluence);

  const getDiceColorBadge = (color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300';
      case 'orange':
        return 'bg-orange-500/20 border-orange-500/60 text-orange-300';
      case 'blue':
        return 'bg-blue-500/20 border-blue-500/60 text-blue-300';
      case 'red':
        return 'bg-red-500/20 border-red-500/60 text-red-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/70 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Victory / Bombardment Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                canClaim
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-950/40'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-rose-950/40'
              }`}
            >
              {canClaim ? (
                <Trophy className="w-5 h-5 text-amber-400" />
              ) : (
                <Crosshair className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-amber-300 font-display">
                  {canClaim ? `SECTOR CONQUEST: SECTOR ${sector.sectorNumber}` : `BOMBARDMENT REPORT: SECTOR ${sector.sectorNumber}`}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    canClaim
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  {canClaim ? `${sector.victoryPoints} VP` : 'CONTESTED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {canClaim ? (
                  <>
                    Commander <span className="text-slate-200 font-bold">{winner.name}</span> emerged victorious!
                  </>
                ) : (
                  <>
                    <span className="text-slate-200 font-bold">{winner.name}</span> cleared hostile ships, but defender population survived.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Bombardment Summary Panel */}
          {conquest.bombardmentSummary && (
            <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                  <Crosshair className="w-4 h-4 text-rose-400" />
                  <span>Planetary Bombardment & Population Assault</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Attacker: <strong className="text-slate-200">{conquest.bombardmentSummary.attackerName}</strong> vs{' '}
                  <strong className="text-slate-200">{conquest.bombardmentSummary.defenderName}</strong>
                </div>
              </div>

              {conquest.bombardmentSummary.hasNeutronBombs ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-700/40 flex items-start gap-2.5">
                  <Flame className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300">Neutron Bombs Active</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Planetary shields and surface structures bypassed! All defender population cubes were eliminated automatically without rolling dice.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Bombardment Rolls (Non-missile weapons vs 0 Shield):</span>
                    <span className="font-mono font-bold text-amber-300">
                      Total Damage: {conquest.bombardmentSummary.totalDamage} pts (1 dmg = 1 cube)
                    </span>
                  </div>

                  {conquest.bombardmentSummary.rolls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {conquest.bombardmentSummary.rolls.map((r, i) => (
                        <div
                          key={i}
                          className="bg-slate-900 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs border ${getDiceColorBadge(
                                r.diceColor
                              )}`}
                            >
                              {r.roll}
                            </div>
                            <span className="text-[11px] capitalize text-slate-300 font-medium">
                              {r.shipType}
                            </span>
                          </div>
                          <div>
                            {r.isHit ? (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300">
                                HIT (+{r.damage})
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-500 px-1 py-0.5">
                                MISS
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No non-missile weapons available to bombard.</div>
                  )}
                </div>
              )}

              {/* Casualty Slot Callout */}
              {conquest.bombardmentSummary.cubesDestroyed.length > 0 && (
                <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Casualty Slot Rule</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong className="text-purple-300 font-semibold">{conquest.bombardmentSummary.cubesDestroyed.length} cube(s)</strong> (
                    {conquest.bombardmentSummary.cubesDestroyed.map((c) => c.resource).join(', ')}
                    ) destroyed and placed in{' '}
                    <strong className="text-slate-200">{conquest.bombardmentSummary.defenderName}</strong>'s Casualty Slot.
                    Their round income is preserved for this round, and cubes will return to their tracks during Cleanup (preventing mid-round bankruptcy).
                  </p>
                </div>
              )}

              {/* Status Outcome */}
              {conquest.bombardmentSummary.cubesRemaining > 0 ? (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 text-xs flex items-center gap-2.5 text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>{conquest.bombardmentSummary.cubesRemaining} defender cube(s) survived!</strong> Defender retains control of Sector {sector.sectorNumber}.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-600/40 text-xs flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All defender population neutralized. Sector control is overthrown and ready for conquest!</span>
                </div>
              )}
            </div>
          )}

          {/* If canClaim is true: show Step 1 and Step 2 */}
          {canClaim && (
            <>
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

                        const isWild = planet.resource === 'any';
                        const isOrb = !!planet.isOrbital;

                        // Default resource selection if not chosen yet
                        const defaultRes: 'money' | 'science' | 'material' = isOrb
                          ? winner.population.money.cubesOnBoard > 0
                            ? 'money'
                            : 'science'
                          : winner.population.money.cubesOnBoard > 0
                          ? 'money'
                          : winner.population.science.cubesOnBoard > 0
                          ? 'science'
                          : 'material';

                        const chosenRes = planetResourceChoices[pIdx] || defaultRes;
                        const displayResource = isWild || isOrb ? chosenRes : planet.resource;

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
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Resource Icon badge */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 ${
                                  displayResource === 'money'
                                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                                    : displayResource === 'science'
                                    ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                                    : displayResource === 'material'
                                    ? 'bg-amber-800/30 border-amber-600 text-amber-500'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                                }`}
                              >
                                {displayResource === 'money' && <Coins className="w-3.5 h-3.5" />}
                                {displayResource === 'science' && <FlaskConical className="w-3.5 h-3.5" />}
                                {displayResource === 'material' && <Hammer className="w-3.5 h-3.5" />}
                              </div>

                              <div className="flex flex-col text-left min-w-0">
                                <span className="font-bold text-xs capitalize text-slate-200 flex items-center gap-1.5">
                                  {isOrb ? 'Orbital Station' : isWild ? 'Wild Habitat' : `${planet.resource} Planet`}
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
                                    ? `Deploying Colony Ship (${chosenRes.toUpperCase()})`
                                    : !check.canColonize
                                    ? check.reason
                                    : 'Ready to Colonize'}
                                </span>

                                {/* Resource Selector for Wild / Orbital Habitats */}
                                {(isWild || isOrb) && !isColonized && (
                                  <div
                                    className="flex items-center gap-1 mt-1.5 flex-wrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Money Button */}
                                    <button
                                      type="button"
                                      disabled={winner.population.money.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedEconomy)}
                                      onClick={() => {
                                        setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'money' }));
                                        if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                          setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                        chosenRes === 'money'
                                          ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-sm'
                                          : 'bg-slate-800 text-yellow-400 border-slate-700 hover:border-yellow-500/50'
                                      } disabled:opacity-30 disabled:pointer-events-none`}
                                      title="Colonize with Money Cube"
                                    >
                                      <Coins className="w-2.5 h-2.5" />
                                      <span>Money ({winner.population.money.cubesOnBoard})</span>
                                    </button>

                                    {/* Science Button */}
                                    <button
                                      type="button"
                                      disabled={winner.population.science.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedLabs)}
                                      onClick={() => {
                                        setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'science' }));
                                        if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                          setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                        chosenRes === 'science'
                                          ? 'bg-pink-500 text-white border-pink-400 shadow-sm'
                                          : 'bg-slate-800 text-pink-400 border-slate-700 hover:border-pink-500/50'
                                      } disabled:opacity-30 disabled:pointer-events-none`}
                                      title="Colonize with Science Cube"
                                    >
                                      <FlaskConical className="w-2.5 h-2.5" />
                                      <span>Science ({winner.population.science.cubesOnBoard})</span>
                                    </button>

                                    {/* Material Button (only if not orbital) */}
                                    {!isOrb && (
                                      <button
                                        type="button"
                                        disabled={winner.population.material.cubesOnBoard <= 0 || (planet.isAdvanced && !hasAdvancedMining)}
                                        onClick={() => {
                                          setPlanetResourceChoices((prev) => ({ ...prev, [pIdx]: 'material' }));
                                          if (!selectedPlanetIndices.includes(pIdx) && remainingColonyShips > 0) {
                                            setSelectedPlanetIndices((prev) => [...prev, pIdx]);
                                          }
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all flex items-center gap-1 ${
                                          chosenRes === 'material'
                                            ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                                            : 'bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-500/50'
                                        } disabled:opacity-30 disabled:pointer-events-none`}
                                        title="Colonize with Material Cube"
                                      >
                                        <Hammer className="w-2.5 h-2.5" />
                                        <span>Materials ({winner.population.material.cubesOnBoard})</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Checkbox / Lock */}
                            <div className="shrink-0 ml-2">
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950">
          {!canClaim ? (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={handleDeclineAll}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all"
              >
                <span>Acknowledge & Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
