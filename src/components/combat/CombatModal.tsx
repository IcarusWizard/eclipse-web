import React, { useState, useEffect } from 'react';
import { GameState, CombatState, CombatDamageAssignment, CombatRoll } from '../../engine/types/state';
import { Crosshair, Shield, Dices, Skull, Zap, CheckCircle2, X, Navigation, ArrowRight, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
import {
  buildCombatUnitsForSector,
  sortUnitsByInitiative,
  getSectorDefenderOwnerId,
  getCombatShipTypeGroups,
  CombatUnit,
} from '../../engine/rules/combatEngine';
import { areSectorsConnected } from '../../engine/rules/hexMath';
import { playerHasWormholeGenerator, getPlayerShortName } from '../../engine/rules/gameReducer';

interface CombatModalProps {
  state: GameState;
  combat: CombatState;
  onStepCombat: (
    retreatShipIds?: string[],
    retreatDestinationSectorId?: string,
    concludeCombat?: boolean,
    rerollRollIndex?: number,
    autoAssign?: boolean,
    damageAssignments?: CombatDamageAssignment[]
  ) => void;
  onRerollDie?: (rollIndex: number) => void;
  onAutoResolve?: () => void;
  currentSeat?: number | 'all' | 'spectator';
}

export const CombatModal: React.FC<CombatModalProps> = ({
  state,
  combat,
  onStepCombat,
  onRerollDie,
  onAutoResolve,
  currentSeat = 'all',
}) => {
  const sector = state.sectors.find((s) => s.id === combat.sectorId);
  if (!sector) return null;

  const units = buildCombatUnitsForSector(
    sector,
    state.players,
    combat.participatingPlayerIds,
    state.neutralShipBlueprints
  );
  const defenderOwnerId = combat.defenderOwnerId || getSectorDefenderOwnerId(sector, state.players);
  const aliveUnits = sortUnitsByInitiative(
    units.filter((u) => u.currentDamage < u.maxHull),
    defenderOwnerId
  );

  const isResolved = combat.stage === 'resolved';
  const isMissileStage = combat.stage === 'missile';

  const groups = getCombatShipTypeGroups(aliveUnits, defenderOwnerId);
  const pendingMissileGroups = isMissileStage
    ? groups.filter(
        (g) => g.weapons.some((w) => w.isMissile) && !g.shipIds.every((id) => combat.missileFiredShipIds?.includes(id))
      )
    : [];

  const activeGroup = isMissileStage
    ? (pendingMissileGroups[0] || null)
    : (groups.length > 0 ? groups[combat.currentTurnIndex % groups.length] : null);

  const pendingSalvo = combat.pendingDamageAssignment;

  const effectiveAttackerOwnerId = pendingSalvo
    ? pendingSalvo.attackerOwnerId
    : activeGroup?.ownerId || null;

  const attackerOwner = effectiveAttackerOwnerId ? state.players.find((p) => p.id === effectiveAttackerOwnerId) : null;
  const isPlayerShip = !isResolved && !!(effectiveAttackerOwnerId && attackerOwner && effectiveAttackerOwnerId.startsWith('player_'));
  const isNpcShip = !isResolved && !isPlayerShip;
  const isSeatedPlayer = typeof currentSeat === 'number';
  const myPlayer = isSeatedPlayer ? state.players[currentSeat] : null;
  const isMyShip = isPlayerShip && myPlayer ? effectiveAttackerOwnerId === myPlayer.id : false;
  const canCommandActiveShip = isResolved || currentSeat === 'all' || isNpcShip || isMyShip;
  const hasWormholeGen = attackerOwner ? playerHasWormholeGenerator(attackerOwner) : false;

  const [autoAssignDamage, setAutoAssignDamage] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eclipse_auto_assign_damage') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleAutoAssign = (val: boolean) => {
    setAutoAssignDamage(val);
    try {
      localStorage.setItem('eclipse_auto_assign_damage', String(val));
    } catch {}
  };

  const eligibleEnemyTargets = React.useMemo(() => {
    if (!pendingSalvo) return [];
    return aliveUnits.filter((u) => u.ownerId !== pendingSalvo.attackerOwnerId);
  }, [pendingSalvo, aliveUnits]);

  const [selectedTargets, setSelectedTargets] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!pendingSalvo) {
      setSelectedTargets({});
      return;
    }
    const defaults: Record<number, string> = {};
    const mockTargets = eligibleEnemyTargets.map((u) => ({ ...u }));
    pendingSalvo.rolls.forEach((r, idx) => {
      const alive = mockTargets.filter((t) => t.currentDamage < t.maxHull);
      const pool = alive.length > 0 ? alive : mockTargets;
      const sorted = [...pool].sort((a, b) => {
        const hpA = a.maxHull - a.currentDamage;
        const hpB = b.maxHull - b.currentDamage;
        return hpA - hpB;
      });
      const chosen = sorted[0] || eligibleEnemyTargets[0];
      if (chosen) {
        defaults[idx] = chosen.id;
        const hit =
          r.dieColor === 'purple'
            ? (r.damage || 0) > 0
            : r.roll === 6 || (r.roll !== 1 && r.roll + pendingSalvo.computerBonus - chosen.shieldBonus >= 6);
        if (hit) {
          chosen.currentDamage += r.damage;
        }
      }
    });
    setSelectedTargets(defaults);
  }, [pendingSalvo]);

  const handleAutoFillAssignments = () => {
    if (!pendingSalvo) return;
    const defaults: Record<number, string> = {};
    const mockTargets = eligibleEnemyTargets.map((u) => ({ ...u }));
    pendingSalvo.rolls.forEach((r, idx) => {
      const alive = mockTargets.filter((t) => t.currentDamage < t.maxHull);
      const pool = alive.length > 0 ? alive : mockTargets;
      const sorted = [...pool].sort((a, b) => {
        const hpA = a.maxHull - a.currentDamage;
        const hpB = b.maxHull - b.currentDamage;
        return hpA - hpB;
      });
      const chosen = sorted[0] || eligibleEnemyTargets[0];
      if (chosen) {
        defaults[idx] = chosen.id;
        const hit =
          r.dieColor === 'purple'
            ? (r.damage || 0) > 0
            : r.roll === 6 || (r.roll !== 1 && r.roll + pendingSalvo.computerBonus - chosen.shieldBonus >= 6);
        if (hit) {
          chosen.currentDamage += r.damage;
        }
      }
    });
    setSelectedTargets(defaults);
  };

  const handleConfirmDamage = () => {
    if (!pendingSalvo) return;
    const assignments: CombatDamageAssignment[] = pendingSalvo.rolls.map((r, idx) => ({
      rollIndex: idx,
      targetShipId: selectedTargets[idx] || eligibleEnemyTargets[0]?.id || '',
    }));
    onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage, assignments);
  };

  // Determine eligible retreat destination sectors:
  // Must be adjacent, connected by wormhole (or wormhole generator), controlled by this player, with no enemy ships
  const eligibleRetreatDestinations = !isResolved && !isMissileStage && isPlayerShip && activeGroup && activeGroup.type !== 'starbase' && attackerOwner
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
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const isAlreadyRetreating = activeGroup ? activeGroup.ships.some((s) => !!combat.retreatDeclared?.[s.id]) : false;
  const retreatDestination = isAlreadyRetreating && activeGroup
    ? state.sectors.find((s) => s.id === combat.retreatDeclared?.[activeGroup.shipIds[0] || ''])
    : null;

  const handleDeclareRetreat = () => {
    if (!activeGroup || !attackerOwner) return;
    const destId = selectedRetreatSectorId || eligibleRetreatDestinations[0]?.id;
    if (!destId) return;

    onStepCombat(activeGroup.shipIds, destId, undefined, undefined, autoAssignDamage);
  };

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/95 border-2 border-rose-500 rounded-full shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <Crosshair className="w-4 h-4 text-rose-400 animate-spin-slow" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-rose-300">
              FLEET ENGAGEMENT: SECTOR {sector.sectorNumber}
            </span>
            {combat.subsector && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 font-bold">
                SUB {combat.subsector}
              </span>
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
              {isResolved ? 'RESOLVED' : isMissileStage ? 'MISSILE' : `RND ${combat.roundNumber}`}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <button
            onClick={() => setIsMinimized(false)}
            className="px-3.5 py-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center gap-1.5"
            title="Return to combat window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Return to Combat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-18 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-130 max-w-2xl pointer-events-auto shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="bg-slate-900/95 border-2 border-rose-600/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 flex flex-col max-h-[calc(100vh-90px)]">
        {/* Combat Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-950 bg-slate-950">
          <div className="flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-rose-500 animate-spin-slow" />
            <div>
              <h2 className="text-lg font-bold text-rose-400 font-display flex items-center gap-2">
                FLEET ENGAGEMENT: SECTOR {sector.sectorNumber}
                {combat.subsector && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/80 text-indigo-300 font-mono font-bold">
                    SUBSECTOR {combat.subsector}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isResolved
                  ? 'Engagement resolved! Review the final salvo dice results below.'
                  : isMissileStage
                  ? 'Missile Stage: Ships armed with missiles launch one salvo in initiative order before regular combat.'
                  : sector.isNebula && combat.subsector
                  ? `Nebula battle localized to Subsector ${combat.subsector}. Ships in other subsectors do not participate.`
                  : `Hostile forces have clashed in Ring ${sector.ring}. Tactical cannon engagement in progress.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setIsMinimized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              title="Minimize combat window to view galaxy map"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>View Map</span>
            </button>
          </div>
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
                const isAttacking = !isDestroyed && (
                  pendingSalvo
                    ? pendingSalvo.attackerShipIds.includes(unit.id)
                    : activeGroup
                    ? activeGroup.shipIds.includes(unit.id)
                    : false
                );
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

          {/* Pending Damage Assignment Panel (Manual Dice Allocation) */}
          {pendingSalvo && (
            <div className="p-4 rounded-xl bg-slate-950 border-2 border-cyan-500/80 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-cyan-950/80 pb-2">
                <div>
                  <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    Target Damage Allocation ({pendingSalvo.attackerShipType.toUpperCase()} - {pendingSalvo.rolls.length} Dice)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Assign each die to an enemy target vessel. Attacker Computer: <strong className="text-cyan-300">+{pendingSalvo.computerBonus}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillAssignments}
                  className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer shrink-0"
                >
                  Auto-Fill Optimal
                </button>
              </div>

              {/* Individual Dice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pendingSalvo.rolls.map((roll, idx) => {
                  const targetId = selectedTargets[idx] || eligibleEnemyTargets[0]?.id;
                  const targetUnit = eligibleEnemyTargets.find((u) => u.id === targetId);
                  const isPurple = roll.dieColor === 'purple' || (roll as any).diceColor === 'purple' || (roll as any).color === 'purple';
                  const shieldBonus = targetUnit?.shieldBonus || 0;
                  const modified = isPurple ? roll.roll : roll.roll + pendingSalvo.computerBonus - shieldBonus;
                  const isHit = isPurple
                    ? (roll.damage || 0) > 0
                    : roll.roll === 6 || (roll.roll !== 1 && modified >= 6);

                  return (
                    (() => {
                      const effectiveDieColor = roll.dieColor || (roll as any).diceColor || (roll as any).color || 'yellow';
                      const colorName = effectiveDieColor.charAt(0).toUpperCase() + effectiveDieColor.slice(1);
                      return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex flex-col gap-2 transition ${
                        isHit
                          ? 'bg-slate-900/90 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-slate-950/80 border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded font-black flex items-center gap-1.5 ${
                              effectiveDieColor === 'purple'
                                ? 'bg-purple-900 border border-purple-400 text-purple-100'
                                : effectiveDieColor === 'red'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : effectiveDieColor === 'orange'
                                ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                : effectiveDieColor === 'blue'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{
                                backgroundColor:
                                  effectiveDieColor === 'purple'
                                    ? '#a855f7'
                                    : effectiveDieColor === 'red'
                                    ? '#ef4444'
                                    : effectiveDieColor === 'orange'
                                    ? '#f97316'
                                    : effectiveDieColor === 'blue'
                                    ? '#0ea5e9'
                                    : '#eab308',
                              }}
                            />
                            <span className="capitalize font-bold">
                              {colorName}
                            </span>
                            <span>{isPurple ? 'Rift' : `Die #${idx + 1}: ${roll.roll}`}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {roll.damage} Dmg
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isHit
                              ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isHit ? `HIT (+${roll.damage})` : 'MISS'}
                        </span>
                      </div>

                      {/* Target Dropdown */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                          Target Vessel:
                        </label>
                        <select
                          value={targetId}
                          onChange={(e) =>
                            setSelectedTargets((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          {eligibleEnemyTargets.map((eu) => {
                            const pOwner = state.players.find((p) => p.id === eu.ownerId);
                            const ownerName = pOwner ? getPlayerShortName(pOwner) : eu.ownerId.toUpperCase();
                            const remHp = Math.max(0, eu.maxHull - eu.currentDamage);
                            return (
                              <option key={eu.id} value={eu.id}>
                                {ownerName} {eu.type.toUpperCase()} (HP: {remHp}/{eu.maxHull}, Shield: -{eu.shieldBonus})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Math Summary & Lyra Reroll */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                        <span>
                          {isPurple
                            ? `Rift: ${roll.damage} target dmg`
                            : `Roll ${roll.roll} + ${pendingSalvo.computerBonus} - ${shieldBonus} = ${modified}`}
                        </span>

                        {(() => {
                          const rollPlayer = state.players.find((p) => p.id === pendingSalvo.attackerOwnerId);
                          const isLyra = rollPlayer?.faction.id === 'enlightened_of_lyra';
                          const hasReadyColonyShip = (rollPlayer?.colonyShips.ready || 0) > 0;
                          const canReroll =
                            isLyra &&
                            hasReadyColonyShip &&
                            (currentSeat === 'all' || (myPlayer && myPlayer.id === pendingSalvo.attackerOwnerId));

                          if (!canReroll) return null;

                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRerollDie) {
                                  onRerollDie(idx);
                                } else {
                                  onStepCombat(undefined, undefined, undefined, idx);
                                }
                              }}
                              title={`Lyra Ability: Flip 1 Colony Ship (${rollPlayer.colonyShips.ready} ready) to reroll this die`}
                              className="px-1.5 py-0.5 rounded bg-orange-600/30 hover:bg-orange-500/50 border border-orange-500 text-orange-200 text-[9px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-orange-300" />
                              <span>Reroll</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()
              );
            })}
              </div>
            </div>
          )}

          {/* Dice Rolls Log */}
          {!pendingSalvo && combat.lastRolls && combat.lastRolls.length > 0 && (
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
                 {combat.lastRolls.map((roll, idx) => {
                  const isPurple = roll.dieColor === 'purple' || (roll as any).diceColor === 'purple' || (roll as any).color === 'purple';
                  const hasSelfDmg = (roll.selfDamage || 0) > 0;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
                        isPurple
                          ? hasSelfDmg && roll.damage > 0
                            ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-1 ring-rose-500/50'
                            : hasSelfDmg
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                            : roll.isHit
                            ? 'bg-purple-950/80 border-purple-500 text-purple-200 ring-1 ring-purple-400/40'
                            : 'bg-purple-950/40 border-purple-800 text-purple-400/60'
                          : roll.isHit
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {(() => {
                        const histDieColor = roll.dieColor || (roll as any).diceColor || (roll as any).color || 'yellow';
                        const colorName = histDieColor.charAt(0).toUpperCase() + histDieColor.slice(1);
                        return (
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded font-black flex items-center gap-1.5 ${
                          histDieColor === 'purple'
                            ? 'bg-purple-900 border border-purple-400 text-purple-100'
                            : histDieColor === 'red'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : histDieColor === 'orange'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : histDieColor === 'blue'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor:
                              histDieColor === 'purple'
                                ? '#a855f7'
                                : histDieColor === 'red'
                                ? '#ef4444'
                                : histDieColor === 'orange'
                                ? '#f97316'
                                : histDieColor === 'blue'
                                ? '#0ea5e9'
                                : '#eab308',
                          }}
                        />
                        <span className="capitalize font-bold text-[10.5px]">
                          {colorName}
                        </span>
                        <span className="font-extrabold text-sm">{isPurple ? 'RIFT' : roll.roll}</span>
                      </span>
                        );
                      })()}

                      <span>
                        {isPurple ? (
                          roll.damage > 0 && hasSelfDmg ? (
                            <span className="flex items-center gap-1">
                              <span>HIT (+{roll.damage} dmg)</span>
                              <span className="text-rose-400 font-extrabold">• 💥 1 Self</span>
                            </span>
                          ) : roll.damage > 0 ? (
                            `HIT (+${roll.damage} dmg)`
                          ) : hasSelfDmg ? (
                            <span className="text-rose-400 font-extrabold">💥 1 Self Dmg</span>
                          ) : (
                            'NO DAMAGE'
                          )
                        ) : roll.isHit ? (
                          `HIT (+${roll.damage} dmg)`
                        ) : (
                          'MISS'
                        )}
                      </span>

                      {(() => {
                        const rollPlayer = state.players.find((p) => p.id === roll.shipOwner);
                        const isLyra = rollPlayer?.faction.id === 'enlightened_of_lyra';
                        const hasReadyColonyShip = (rollPlayer?.colonyShips.ready || 0) > 0;
                        const canReroll =
                          isLyra &&
                          hasReadyColonyShip &&
                          !isResolved &&
                          (currentSeat === 'all' || (myPlayer && myPlayer.id === roll.shipOwner));

                        if (!canReroll) return null;

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRerollDie) {
                                onRerollDie(idx);
                              } else {
                                onStepCombat(undefined, undefined, undefined, idx);
                              }
                            }}
                            title={`Lyra Combat Ability: Flip 1 Colony Ship (${rollPlayer.colonyShips.ready} ready) to reroll this die`}
                            className="ml-1.5 px-2 py-0.5 rounded bg-orange-600/30 hover:bg-orange-500/50 border border-orange-500 text-orange-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-orange-300" />
                            <span>Reroll (1 Ship)</span>
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
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
            ) : pendingSalvo ? (
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                Assigning Salvo Damage • {pendingSalvo.attackerShipType.toUpperCase()} ({pendingSalvo.rolls.length} Dice)
              </span>
            ) : activeGroup ? (
              <span>
                {isMissileStage ? 'Missile Salvo' : 'Salvo'}{' '}
                <strong className="text-slate-200">#{combat.currentTurnIndex + 1}</strong> • Active Initiative:{' '}
                <strong className={isMissileStage ? 'text-amber-400' : 'text-rose-400'}>
                  {activeGroup.ships.length > 1 ? `${activeGroup.ships.length}x ` : ''}
                  {activeGroup.type.toUpperCase()}
                </strong>{' '}
                (+{activeGroup.initiative})
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
            ) : pendingSalvo ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoFillAssignments}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs tracking-wider uppercase border border-slate-700 transition cursor-pointer"
                >
                  Auto-Fill
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDamage}
                  disabled={!canCommandActiveShip}
                  className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl shadow-cyan-950 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm Damage
                </button>
              </div>
            ) : (
              <>
                {/* Auto-assign damage toggle */}
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={autoAssignDamage}
                    onChange={(e) => handleToggleAutoAssign(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-medium text-slate-300">Auto-assign</span>
                </label>

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
                      Waiting for Commander <strong className="text-amber-300">{attackerOwner?.name || 'opponent'}</strong> to command their {activeGroup?.type.toUpperCase()}...
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
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage)}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-950 transition cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" /> Complete Retreat
                      </button>
                    ) : isNpcShip ? (
                      <button
                        type="button"
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, true)}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase shadow-lg bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950 transition cursor-pointer"
                        title="Neutral ship attack can be triggered by any commander"
                      >
                        <Dices className="w-4 h-4" /> Roll Neutral Salvo ({activeGroup?.type.toUpperCase()})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStepCombat(undefined, undefined, undefined, undefined, autoAssignDamage)}
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
