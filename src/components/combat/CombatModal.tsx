import React from 'react';
import { GameState, CombatState } from '../../engine/types/state';
import { Crosshair, Shield, Dices, Skull, Zap, CheckCircle2, X } from 'lucide-react';
import { buildCombatUnitsForSector } from '../../engine/rules/combatEngine';

interface CombatModalProps {
  state: GameState;
  combat: CombatState;
  onStepCombat: () => void;
  onAutoResolve?: () => void;
}

export const CombatModal: React.FC<CombatModalProps> = ({
  state,
  combat,
  onStepCombat,
  onAutoResolve,
}) => {
  const sector = state.sectors.find((s) => s.id === combat.sectorId);
  if (!sector) return null;

  const units = buildCombatUnitsForSector(sector, state.players);
  const aliveUnits = units.filter((u) => u.currentDamage < u.maxHull);
  aliveUnits.sort((a, b) => b.initiative - a.initiative);
  const activeAttackerIndex = aliveUnits.length > 0 ? combat.currentTurnIndex % aliveUnits.length : -1;
  const activeAttackerId = activeAttackerIndex >= 0 ? aliveUnits[activeAttackerIndex]?.id : null;

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
                Hostile forces have clashed in Ring {sector.ring}. Tactical combat resolution in progress.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-950 border border-rose-800 text-rose-300 uppercase">
            Round {combat.roundNumber}
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

                return (
                  <div
                    key={unit.id}
                    className={`p-3 rounded-lg border transition-all relative ${
                      isDestroyed
                        ? 'bg-slate-950/40 border-slate-900 opacity-40'
                        : isAttacking
                        ? 'bg-slate-900 border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/60'
                        : 'bg-slate-950 border-slate-800 shadow'
                    }`}
                  >
                    {isAttacking && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded bg-rose-600 text-white shadow">
                        Attacking
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
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            w.color === 'yellow'
                              ? 'bg-amber-950 text-amber-300'
                              : w.color === 'orange'
                              ? 'bg-orange-950 text-orange-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {w.count}x {w.damage} Dmg {w.color}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dice Rolls Log */}
          {combat.lastRolls && combat.lastRolls.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-cyan-400" /> Recent Salvo Dice Results
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
            {aliveUnits.length > 0 && activeAttackerIndex >= 0 && (
              <span>
                Salvo <strong className="text-slate-200">#{combat.currentTurnIndex + 1}</strong> • Active Initiative:{' '}
                <strong className="text-rose-400">{aliveUnits[activeAttackerIndex]?.type.toUpperCase()}</strong> (+{aliveUnits[activeAttackerIndex]?.initiative})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {onAutoResolve && (
              <button
                type="button"
                onClick={onAutoResolve}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs tracking-wider uppercase border border-slate-700 transition shadow cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" /> Auto-Resolve
              </button>
            )}
            <button
              type="button"
              onClick={onStepCombat}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-rose-950 transition cursor-pointer"
            >
              <Dices className="w-4 h-4" /> Fire Salvo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
