import React from 'react';
import { Rocket, Wrench, Archive, Trophy, Zap, Cpu, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';
import { SectorTile, DiscoveryTile, ShipType } from '../../engine/types/galaxy';
import { PlayerState } from '../../engine/types/player';
import { Technology } from '../../engine/types/tech';
import { SHIP_PARTS } from '../../engine/rules/partData';
import { calculateBlueprintStats, SHIP_LIMITS, countPlayerShips } from '../../engine/rules/shipValidation';

interface DiscoveryChoiceModalProps {
  discovery: DiscoveryTile;
  player: PlayerState;
  techSupply?: Technology[];
  sectors?: SectorTile[];
  onChoice: (
    keepForVictoryPoints: boolean,
    equipShipType?: ShipType,
    equipSlotIndex?: number,
    chosenTechId?: string,
    colonizeOrbitalResource?: 'money' | 'science',
    chosenResource?: 'money' | 'science' | 'material'
  ) => void;
}

export const DiscoveryChoiceModal: React.FC<DiscoveryChoiceModalProps> = ({
  discovery,
  player,
  techSupply,
  sectors,
  onChoice,
}) => {
  const part = discovery.shipPartId ? SHIP_PARTS[discovery.shipPartId] : null;

  const [isMinimized, setIsMinimized] = React.useState<boolean>(false);
  const [selectedShipType, setSelectedShipType] = React.useState<ShipType>('cruiser');
  const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number>(0);
  const [selectedTechId, setSelectedTechId] = React.useState<string>('');
  const [colonizeOrbitalResource, setColonizeOrbitalResource] = React.useState<'money' | 'science' | null>(null);
  const [chosenBonusResource, setChosenBonusResource] = React.useState<'money' | 'science' | 'material'>('money');

  const hasColonyShipReady = player.colonyShips.ready > 0;

  const currentBlueprint = player.blueprints[selectedShipType];

  // Auto-select first empty slot when ship type changes
  React.useEffect(() => {
    if (currentBlueprint) {
      const emptyIdx = currentBlueprint.slots.findIndex((s) => s === null);
      setSelectedSlotIndex(emptyIdx !== -1 ? emptyIdx : 0);
    }
  }, [selectedShipType, currentBlueprint]);

  // Bug 53: Validate power for immediate installation
  const testBp = React.useMemo(() => {
    if (!currentBlueprint || !part || selectedSlotIndex < 0 || selectedSlotIndex >= currentBlueprint.maxSlots) {
      return null;
    }
    const cloned = { ...currentBlueprint, slots: [...currentBlueprint.slots] };
    cloned.slots[selectedSlotIndex] = part;
    return cloned;
  }, [currentBlueprint, part, selectedSlotIndex]);

  const testStats = testBp ? calculateBlueprintStats(testBp) : null;
  const isPowerDeficit = testStats ? testStats.totalPowerConsumed > testStats.totalPowerProduced : false;

  // Bug 56: Ancient Technology discovery tile eligible regular techs
  const eligibleTechs = React.useMemo(() => {
    if (!discovery.immediateReward?.ancientTech || !techSupply) return [];
    const owned = new Set(player.techTrack.researched.map((t) => t.id));
    return techSupply
      .filter((t) => ['military', 'grid', 'nano'].includes(t.category) && !owned.has(t.id))
      .sort((a, b) => a.baseCost - b.baseCost);
  }, [discovery, techSupply, player.techTrack.researched]);

  const minTechCost = eligibleTechs.length > 0 ? eligibleTechs[0].baseCost : 0;
  const tiedTechs = React.useMemo(() => {
    return eligibleTechs.filter((t) => t.baseCost === minTechCost);
  }, [eligibleTechs, minTechCost]);

  React.useEffect(() => {
    if (tiedTechs.length > 0 && !selectedTechId) {
      setSelectedTechId(tiedTechs[0].id);
    }
  }, [tiedTechs, selectedTechId]);

  const grantShipType = discovery.immediateReward?.grantShipType || (discovery.id === 'disc_ancient_cruiser' ? 'cruiser' : undefined);
  const isShipSupplyDepleted = Boolean(
    grantShipType &&
    sectors &&
    countPlayerShips(sectors, player.id)[grantShipType] >= SHIP_LIMITS[grantShipType]
  );

  // Minimized floating banner at top
  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-amber-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-300 font-display">
            ANCIENT DISCOVERY: {discovery.name} ({player.name})
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
            title="Return to discovery resolution"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Resolve Discovery</span>
          </button>
        </div>
      </div>
    );
  }

  // Side window (Bug 123)
  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-125 max-w-xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="relative w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-md p-5 flex flex-col items-center text-center overflow-y-auto max-h-[calc(100vh-90px)]">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Action Bar */}
        <div className="w-full flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80">
            Ancient Artifact
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Minimize to inspect map"
          >
            <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>View Map</span>
          </button>
        </div>

        {/* Discovery Icon Header */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-2 border border-amber-300/40">
          <svg
            className="w-7 h-7 text-slate-950"
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

        <h2 className="text-xl font-black text-white tracking-wide mb-1">
          {discovery.name}
        </h2>
        <div className="text-xs text-slate-400 mb-3 font-medium">
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
                  {part.isJumpDrive && 'Jump: 1 adjacent sector regardless of wormholes | '}
                  {part.morphShield && 'Morph Shield: -1 Shield, heals 1 dmg/round | '}
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
                <div className="w-full mt-2 p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-left">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    +1 Free Regular Technology (Lowest Printed Cost: {minTechCost}🔬)
                  </div>
                  {tiedTechs.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No eligible technologies in supply</div>
                  ) : tiedTechs.length === 1 ? (
                    <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                      <span>Awarded:</span>
                      <strong className="text-cyan-200">{tiedTechs[0].name}</strong>
                      <span className="text-[10px] text-slate-400">({tiedTechs[0].category.toUpperCase()} • Cost {tiedTechs[0].baseCost}🔬)</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-300 font-medium">
                        Multiple lowest-cost technologies available ({minTechCost}🔬). Choose which to receive:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {tiedTechs.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTechId(t.id)}
                            className={`p-2 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                              selectedTechId === t.id
                                ? 'bg-cyan-600/30 border-cyan-400 text-white font-bold shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                              {t.category[0].toUpperCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {discovery.immediateReward.grantStructure === 'orbital' && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-blue-950/60 border border-blue-500/40 text-left">
                  <div className="text-xs font-bold text-blue-300 flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-400" />
                      Ancient Orbital Habitat (+2 Materials)
                    </span>
                    <span className="text-[10px] font-mono text-blue-200">
                      Ready Colony Ships: <strong>{player.colonyShips.ready}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2">
                    You may immediately colonize the new Orbital using 1 ready Colony Ship. Orbitals can produce Money or Science.
                  </p>
                  {hasColonyShipReady ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setColonizeOrbitalResource(null)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          colonizeOrbitalResource === null
                            ? 'bg-slate-700 border-white text-white shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Leave Empty (No Colonization)
                      </button>
                      <button
                        type="button"
                        disabled={player.population.money.cubesOnBoard <= 0}
                        onClick={() => setColonizeOrbitalResource('money')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                          colonizeOrbitalResource === 'money'
                            ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-yellow-400/80 hover:text-yellow-300'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                        Colonize with Money (🪙)
                      </button>
                      <button
                        type="button"
                        disabled={player.population.science.cubesOnBoard <= 0}
                        onClick={() => setColonizeOrbitalResource('science')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                          colonizeOrbitalResource === 'science'
                            ? 'bg-pink-500/30 border-pink-400 text-pink-200 font-bold shadow'
                            : 'bg-slate-900 border-slate-700 text-pink-400/80 hover:text-pink-300'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                        Colonize with Science (🔬)
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      No ready colony ships available to colonize immediately.
                    </div>
                  )}
                </div>
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
              {discovery.immediateReward.artifactCodex && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Artifact Codex (+1 VP per Controlled Artifact at Game End)
                </span>
              )}
              {discovery.immediateReward.ancientMight && (
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Ancient Might (+1 VP per 3 VP in Reputation Tiles at Game End)
                </span>
              )}
              {discovery.immediateReward.choose3Resource && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-left">
                  <div className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Gain +3 Money plus 3 additional Resources of your choice:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('money')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'money'
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      +3 Money (🪙 Total +6)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('science')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'science'
                          ? 'bg-pink-500/30 border-pink-400 text-pink-200 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                      +3 Science (🔬 3 Money + 3 Science)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosenBonusResource('material')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        chosenBonusResource === 'material'
                          ? 'bg-amber-700/30 border-amber-600 text-amber-300 font-bold shadow'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                      +3 Materials (⚙️ 3 Money + 3 Materials)
                    </button>
                  </div>
                </div>
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

        {/* Bug 53: Power Deficit Alert */}
        {part && isPowerDeficit && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Cannot Equip Immediately:</strong> Power consumed ({testStats?.powerConsumed}⚡) exceeds power produced ({testStats?.powerProduced}⚡) on {selectedShipType.toUpperCase()}. Store in reserve or keep for VP.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {part ? (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isPowerDeficit}
              onClick={() => onChoice(false, selectedShipType, selectedSlotIndex)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-cyan-500/60 bg-cyan-600/20 hover:bg-cyan-600/35 disabled:opacity-30 disabled:cursor-not-allowed transition group cursor-pointer"
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
          <div className="w-full">
            {isShipSupplyDepleted && grantShipType && (
              <div className="w-full mb-3 p-2.5 rounded-xl bg-amber-950/70 border border-amber-600/70 text-amber-200 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Supply Depleted:</strong> All {SHIP_LIMITS[grantShipType]} {grantShipType.toUpperCase()}s are already deployed. You cannot take another {grantShipType}; you must keep this tile for 2 VP instead.
                </span>
              </div>
            )}
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
                disabled={isShipSupplyDepleted}
                onClick={() =>
                  onChoice(
                    false,
                    undefined,
                    undefined,
                    selectedTechId || tiedTechs[0]?.id,
                    colonizeOrbitalResource || undefined,
                    chosenBonusResource
                  )
                }
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition group cursor-pointer ${
                  isShipSupplyDepleted
                    ? 'border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed'
                    : 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/25'
                }`}
                title={isShipSupplyDepleted ? `Cannot claim: maximum limit of ${SHIP_LIMITS[grantShipType!]} reached` : undefined}
              >
                <div className={`flex items-center gap-1.5 font-bold text-sm mb-1 ${isShipSupplyDepleted ? 'text-slate-400' : 'text-cyan-400 group-hover:scale-105 transition-transform'}`}>
                  <Zap className={`w-4 h-4 ${isShipSupplyDepleted ? 'text-slate-500' : 'text-cyan-400'}`} /> Take Immediate Reward
                </div>
                <span className="text-xs text-slate-400">
                  {isShipSupplyDepleted
                    ? `Max supply reached (${SHIP_LIMITS[grantShipType!]} deployed)`
                    : discovery.immediateReward?.grantShipType
                    ? `Deploy free ${discovery.immediateReward.grantShipType} to sector`
                    : discovery.immediateReward?.ancientTech
                    ? `Claim ${(selectedTechId && tiedTechs.find((t) => t.id === selectedTechId)?.name) || tiedTechs[0]?.name || 'Tech'}`
                    : discovery.immediateReward?.artifactCodex
                    ? 'Activate Artifact Codex (+1 VP per Artifact)'
                    : discovery.immediateReward?.ancientMight
                    ? 'Activate Ancient Might (+1 VP per 3 VP Reputation)'
                    : discovery.immediateReward?.choose3Resource
                    ? `Collect +3 Money and +3 ${chosenBonusResource.toUpperCase()}`
                    : 'Collect resources immediately'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
