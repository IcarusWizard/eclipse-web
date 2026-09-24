import React, { useState } from 'react';
import { GameState, CombatState } from '../../engine/types/state';
import { Crosshair, Shield, Dices, Skull, Zap, CheckCircle2, X, Navigation, ArrowRight } from 'lucide-react';
import { buildCombatUnitsForSector, sortUnitsByInitiative, getSectorDefenderOwnerId } from '../../engine/rules/combatEngine';
import { areSectorsConnected } from '../../engine/rules/hexMath';

interface CombatModalProps {
  state: GameState;
  combat: CombatState;
  onStepCombat: (retreatShipIds?: string[], retreatDestinationSectorId?: string, concludeCombat?: boolean) => void;
  onAutoResolve?: () => void;
  currentSeat?: number | 'all' | 'spectator';
}

export const CombatModal: React.FC<CombatModalProps> = ({
  state,
  combat,
  onStepCombat,
  onAutoResolve,
  currentSeat = 'all',
}) => {
  const sector = state.sectors.find((s) => s.id === combat.sectorId);
  if (!sector) return null;

  const units = buildCombatUnitsForSector(sector, state.players, combat.participatingPlayerIds);
  const defenderOwnerId = combat.defenderOwnerId || getSectorDefenderOwnerId(sector);
  const aliveUnits = sortUnitsByInitiative(
    units.filter((u) => u.currentDamage < u.maxHull),
    defenderOwnerId
  );

  const isResolved = combat.stage === 'resolved';
  const isMissileStage = combat.stage === 'missile';
  const pendingMissileUnits = isMissileStage
    ? aliveUnits.filter(
        (u) => u.weapons.some((w) => w.isMissile) && !combat.missileFiredShipIds?.includes(u.id)
      )
    : [];

  const activeAttacker = isMissileStage
    ? (pendingMissileUnits[0] || null)
    : (aliveUnits.length > 0 ? aliveUnits[combat.currentTurnIndex % aliveUnits.length] : null);
  const activeAttackerId = activeAttacker?.id || null;

  const attackerOwner = activeAttacker ? state.players.find((p) => p.id === activeAttacker.ownerId) : null;
  const isPlayerShip = !isResolved && !!(activeAttacker && attackerOwner && activeAttacker.ownerId.startsWith('player_'));
  const isNpcShip = !isResolved && !isPlayerShip;
  const isSeatedPlayer = typeof currentSeat === 'number';
  const myPlayer = isSeatedPlayer ? state.players[currentSeat] : null;
  const isMyShip = isPlayerShip && myPlayer ? activeAttacker?.ownerId === myPlayer.id : false;
  // Neutral NPC ships (Ancients, Guardians, GCDS) can be triggered by any player; player ships require owner authority
  const canCommandActiveShip = isResolved || currentSeat === 'all' || isNpcShip || isMyShip;
  const hasWormholeGen = attackerOwner?.techTrack.researched.some((t) => t.id === 'wormhole_generator') || false;

  // Determine eligible retreat destination sectors:
  // Must be adjacent, connected by wormhole (or wormhole generator), controlled by this player, with no enemy ships
  const eligibleRetreatDestinations = !isResolved && !isMissileStage && isPlayerShip && activeAttacker?.type !== 'starbase'
    ? state.sectors.filter((s) => {
        if (s.id === sector.id) return false;
        if (s.discOwner !== attackerOwner.id) return false;
        if (s.ships.some((sh) => sh.ownerId !== attackerOwner.id)) return false;
        return areSectorsConnected(sector, s, hasWormholeGen);
      })
    : [];

  const [selectedRetreatSectorId, setSelectedRetreatSectorId] = useState<string>(
    eligibleRetreatDestinations[0]?.id || ''
  );

  const isAlreadyRetreating = activeAttacker ? !!combat.retreatDeclared?.[activeAttacker.id] : false;
  const retreatDestination = isAlreadyRetreating && activeAttacker
    ? state.sectors.find((s) => s.id === combat.retreatDeclared[activeAttacker.id])
    : null;

  const handleDeclareRetreat = () => {
    if (!activeAttacker || !attackerOwner) return;
    const destId = selectedRetreatSectorId || eligibleRetreatDestinations[0]?.id;
    if (!destId) return;

    // Move all ships of this type belonging to player to retreat status
    const sameTypeIds = aliveUnits
      .filter((u) => u.ownerId === activeAttacker.ownerId && u.type === activeAttacker.type)
      .map((u) => u.id);

    onStepCombat(sameTypeIds, destId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-600/60 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        {/* Combat Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-rose-500 animate-spin-slow" />
            <div>
              <h2 className="text-lg font-bold text-rose-400 font-display flex items-center gap-2">
                FLEET ENGAGEMENT: SECTOR {sector.sectorNumber}
              </h2>
              <p className="text-xs text-slate-400">
                {isResolved
                  ? 'Engagement resolved! Review the final salvo dice results below.'
                  : isMissileStage
                  ? 'Missile Stage: Ships armed with missiles launch one salvo in initiative order before regular combat.'
                  : `Hostile forces have clashed in Ring ${sector.ring}. Tactical cannon engagement in progress.`}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded border uppercase ${
              isResolved
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : isMissileStage
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-rose-950 border-rose-800 text-rose-300'
            }`}
          >
            {isResolved ? '🏆 RESOLVED' : isMissileStage ? '🚀 MISSILE STAGE' : `Round ${combat.roundNumber}`}
          </span>
        </div>

        {/* Combat Field */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Opposing Forces Fleet Roster */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Fleet Units in Sector
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {units.map((unit) => {
                const owner = state.players.find((p) => p.id === unit.ownerId);
                const isDestroyed = unit.currentDamage >= unit.maxHull;
                const isAttacking = unit.id === activeAttackerId && !isDestroyed;
                const isRetreating = !!combat.retreatDeclared?.[unit.id];
                const destSec = isRetreating
                  ? state.sectors.find((s) => s.id === combat.retreatDeclared[unit.id])
                  : null;

                return (
                  <div
                    key={unit.id}
                    className={`p-3 rounded-lg border transition-all relative ${
                      isDestroyed
                        ? 'bg-slate-950/40 border-slate-900 opacity-40'
                        : isAttacking
                        ? 'bg-slate-900 border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/60'
                        : isRetreating
                        ? 'bg-amber-950/20 border-amber-500/60 shadow'
                        : 'bg-slate-950 border-slate-800 shadow'
                    }`}
                  >
                    {isAttacking && (
                      <span
                        className={`absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded text-white shadow ${
                          isMissileStage ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300 animate-pulse' : 'bg-rose-600'
                        }`}
                      >
                        {isMissileStage ? 'Firing Missiles' : 'Attacking'}
                      </span>
                    )}
                    {isRetreating && !isAttacking && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500 text-slate-950 shadow">
                        Retreating (Sec {destSec?.sectorNumber || '?'})
                      </span>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: owner?.color || (unit.ownerId === 'gcds' ? '#a855f7' : '#f43f5e'),
                          }}
                        />
                        <span className="font-bold text-xs uppercase text-slate-200 font-display">
                          {unit.type}
                        </span>
                        {isRetreating && isAttacking && (
                          <span className="text-[9px] font-bold text-amber-400 font-mono">
                            [Retreat Ready]
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold">
                        Init +{unit.initiative}
                      </span>
                    </div>

                    {/* Health Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Hull / HP</span>
                        <span>
                          {Math.max(0, unit.maxHull - unit.currentDamage)} / {unit.maxHull} HP
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDestroyed
                              ? 'bg-slate-600'
                              : unit.currentDamage > 0
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              ((unit.maxHull - unit.currentDamage) / unit.maxHull) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Weapons list */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {unit.weapons.map((w, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                            w.isMissile
                              ? isMissileStage && isAttacking
                                ? 'bg-amber-400 text-slate-950 font-black shadow ring-1 ring-amber-300'
                                : 'bg-purple-950 text-purple-300 border border-purple-800/80'
                              : !isMissileStage && isAttacking
                              ? 'ring-1 ring-rose-500 font-black ' +
                                (w.color === 'yellow'
                                  ? 'bg-amber-950 text-amber-300'
                                  : w.color === 'orange'
                                  ? 'bg-orange-950 text-orange-300'
                                  : 'bg-rose-950 text-rose-300')
                              : w.color === 'yellow'
                              ? 'bg-amber-950 text-amber-300'
                              : w.color === 'orange'
                              ? 'bg-orange-950 text-orange-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {w.isMissile ? '🚀 ' : ''}
                          {w.count}x {w.damage} Dmg {w.color}
                          {w.isMissile ? ' (Missile)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolved Engagement Banner */}
          {isResolved && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-300 font-display">
                    ENGAGEMENT CONCLUDED
                  </h3>
                  <p className="text-xs text-slate-300">
                    Final salvo delivered. Victor:{' '}
                    <strong className="text-emerald-300">
                      {state.players.find((p) => p.id === (combat as any).winnerOwnerId)?.name ||
                        ((combat as any).winnerOwnerId ? (combat as any).winnerOwnerId.toUpperCase() : 'Surviving Fleet')}
                    </strong>
                    . Review the lethal dice results below and conclude engagement to continue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onStepCombat(undefined, undefined, true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer shrink-0"
              >
                <span>Conclude Engagement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Dice Rolls Log */}
          {combat.lastRolls && combat.lastRolls.length > 0 && (
            <div
              className={`p-4 rounded-lg border transition-all ${
                isResolved
                  ? 'bg-slate-950 border-emerald-600/60 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Dices className={`w-4 h-4 ${isResolved ? 'text-emerald-400' : 'text-cyan-400'}`} />{' '}
                {isResolved ? 'Final Salvo Lethal Dice Results' : 'Recent Salvo Dice Results'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {combat.lastRolls.map((roll, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold ${
                      roll.isHit
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="font-mono text-sm">{roll.roll}</span>
                    <span>
                      {roll.isHit ? `HIT (+${roll.damage} dmg)` : 'MISS'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {isResolved ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Engagement completed • Victor:{' '}
                <strong className="text-slate-100">
                  {state.players.find((p) => p.id === (combat as any).winnerOwnerId)?.name ||
                    ((combat as any).winnerOwnerId ? (combat as any).winnerOwnerId.toUpperCase() : 'Surviving Fleet')}
                </strong>
              </span>
            ) : activeAttacker ? (
              <span>
                {isMissileStage ? 'Missile Salvo' : 'Salvo'}{' '}
                <strong className="text-slate-200">#{combat.currentTurnIndex + 1}</strong> • Active Initiative:{' '}
                <strong className={isMissileStage ? 'text-amber-400' : 'text-rose-400'}>
                  {activeAttacker.type.toUpperCase()}
                </strong>{' '}
                (+{activeAttacker.initiative})
                {isAlreadyRetreating && (
                  <span className="text-amber-400 ml-1">
                    (Retreating to Sec {retreatDestination?.sectorNumber || '?'})
                  </span>
                )}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {isResolved ? (
              <button
                type="button"
                onClick={() => onStepCombat(undefined, undefined, true)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Conclude Engagement & Continue
              </button>
            ) : (
              <>
                {/* Auto-Resolve Option - only in 'all' / sandbox mode to prevent skipping human decisions */}
                {onAutoResolve && currentSeat === 'all' && !isAlreadyRetreating && (
                  <button
                    type="button"
                    onClick={onAutoResolve}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs tracking-wider uppercase border border-slate-700 transition shadow cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Auto-Resolve
                  </button>
                )}

                {!canCommandActiveShip ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-300 shadow">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>
                      Waiting for Commander <strong className="text-amber-300">{attackerOwner?.name || 'opponent'}</strong> to command their {activeAttacker?.type.toUpperCase()}...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Declare Retreat Option (If active unit is mobile player ship and has eligible retreat destination) */}
                    {!isAlreadyRetreating && isPlayerShip && eligibleRetreatDestinations.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-600/50 rounded-lg p-1">
                        <select
                          value={selectedRetreatSectorId || eligibleRetreatDestinations[0]?.id}
                          onChange={(e) => setSelectedRetreatSectorId(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none"
                        >
                          {eligibleRetreatDestinations.map((dest) => (
                            <option key={dest.id} value={dest.id}>
                              Sector {dest.sectorNumber}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleDeclareRetreat}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase shadow transition cursor-pointer"
                          title="Retreat all ships of this type to selected sector"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Retreat
                        </button>
                      </div>
                    )}

                    {/* Complete Retreat or Fire Salvo */}
                    {isAlreadyRetreating ? (
                      <button
                        type="button"
                        onClick={() => onStepCombat()}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950 transition cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" /> Complete Retreat
                      </button>
                    ) : isNpcShip ? (
                      <button
                        type="button"
                        onClick={() => onStepCombat()}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950 transition cursor-pointer"
                        title="Neutral ship attack can be triggered by any commander"
                      >
                        <Dices className="w-4 h-4" /> Roll Neutral Salvo ({activeAttacker?.type.toUpperCase()})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStepCombat()}
                        className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg transition cursor-pointer ${
                          isMissileStage
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
                        }`}
                      >
                        <Dices className="w-4 h-4" /> {isMissileStage ? 'Launch Missiles' : 'Fire Salvo'}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
