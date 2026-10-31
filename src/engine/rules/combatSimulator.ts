/**
 * Combat Simulator Engine for Eclipse: Second Dawn
 * High-performance Monte Carlo tactical battle simulation.
 * Supports Terran, Alien factions, NPC variants (Ancients, Guardians, GCDS),
 * custom blueprints with discovery tile / rare tech parts, and Antimatter Splitter.
 */

import { ShipBlueprint, ShipPart } from '../types/blueprints';
import { calculateBlueprintStats } from './shipValidation';
import { createFactionBlueprints } from './shipValidation';
import {
  getNeutralShipBlueprint,
  NeutralShipType,
  NeutralShipVariant,
  NEUTRAL_SHIP_BLUEPRINTS,
} from './neutralShips';
import { ALL_FACTIONS } from './setup';
import { GameState } from '../types/state';
import { SectorTile } from '../types/galaxy';
import { PlayerState } from '../types/player';
import {
  CombatUnit,
  rollD6,
  rollPurpleDie,
  getCombatShipTypeGroups,
  applyRiftSelfDamage,
} from './combatEngine';

export const SIMULATOR_TARGET_PRIORITY: Record<string, number> = {
  gcds: 5,
  dreadnought: 4,
  guardian: 4,
  cruiser: 3,
  ancient: 3,
  starbase: 2,
  orbital: 2,
  interceptor: 1,
};

export interface SimulatorSideConfig {
  factionId: string; // e.g. 'terran_federation', 'ancient', 'guardian', 'gcds'
  name: string;
  isNpc: boolean;
  npcVariant?: NeutralShipVariant;
  shipCounts: Record<string, number>;
  blueprints: Record<string, ShipBlueprint>;
  hasAntimatterSplitter: boolean;
}

export interface SimulationSurvivingFleet {
  key: string;
  summary: string;
  ships: { type: string; count: number }[];
  count: number;
  percentage: number; // 0 to 100
}

export interface DefenderBreakdownOutcome {
  index: number;
  name: string;
  factionId: string;
  wins: number;
  winRate: number;
  survivingOutcomes?: SimulationSurvivingFleet[];
}

export interface SimulatorParticipantOutcome {
  id: string;
  role: 'attacker' | 'defender' | 'draw';
  name: string;
  factionIds: string[];
  wins: number;
  winRate: number; // 0 to 100
  isAlliance: boolean;
  defenderIndices?: number[];
  survivingOutcomes?: SimulationSurvivingFleet[];
}

export interface SimulationResult {
  iterations: number;
  attackerWins: number;
  attackerWinRate: number; // 0 to 100
  defenderWins: number;
  defenderWinRate: number; // 0 to 100
  draws: number;
  drawRate: number; // 0 to 100
  avgRounds: number;
  attackerSurvivingOutcomes: SimulationSurvivingFleet[];
  defenderSurvivingOutcomes: SimulationSurvivingFleet[];
  defendersBreakdown?: DefenderBreakdownOutcome[];
  participants?: SimulatorParticipantOutcome[];
  validationErrors?: string[];
}

export interface SimulatorSideValidation {
  isValid: boolean;
  errors: string[];
  shipErrors: Record<string, string[]>;
}

/**
 * Validates whether the blueprints of a simulator side configuration are legal
 * by reusing calculateBlueprintStats from the upgrade action module (checks power balance,
 * drive/engine requirement, muon source placement, starbase drive limits, etc.).
 *
 * @param sideConfig The simulator side configuration.
 * @param checkOnlyParticipatingShips If true (default), only ships with count > 0 generate fatal errors.
 */
export function validateSimulatorSide(
  sideConfig: SimulatorSideConfig,
  checkOnlyParticipatingShips: boolean = true
): SimulatorSideValidation {
  if (sideConfig.isNpc) {
    return { isValid: true, errors: [], shipErrors: {} };
  }

  const errors: string[] = [];
  const shipErrors: Record<string, string[]> = {};

  if (sideConfig.blueprints) {
    for (const [shipType, bp] of Object.entries(sideConfig.blueprints)) {
      if (!bp) continue;
      const count = sideConfig.shipCounts?.[shipType] ?? 0;
      const stats = calculateBlueprintStats(bp, bp.activeExpansions);
      if (!stats.isValid) {
        shipErrors[shipType] = stats.errors;
        if (!checkOnlyParticipatingShips || count > 0) {
          for (const err of stats.errors) {
            errors.push(`${sideConfig.name || 'Fleet'} ${shipType.toUpperCase()}: ${err}`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    shipErrors,
  };
}

/**
 * Creates a default side configuration for a given faction or NPC type.
 */
export function createDefaultSimulatorSide(
  factionId: string,
  options?: {
    isNpc?: boolean;
    npcVariant?: NeutralShipVariant;
    shipCounts?: Record<string, number>;
    hasAntimatterSplitter?: boolean;
  }
): SimulatorSideConfig {
  const isNpc =
    options?.isNpc ??
    ['ancient', 'guardian', 'gcds'].includes(factionId);
  const npcVariant = options?.npcVariant || 'default';

  if (isNpc) {
    const npcType = factionId as NeutralShipType;
    const bp = getNeutralShipBlueprint(npcType, npcVariant);
    const shipCounts = options?.shipCounts || (
      factionId === 'ancient' ? { ancient: 2 } :
      factionId === 'guardian' ? { guardian: 1 } :
      { gcds: 1 }
    );

    return {
      factionId,
      name: bp.name,
      isNpc: true,
      npcVariant,
      shipCounts,
      blueprints: {},
      hasAntimatterSplitter: false,
    };
  }

  // Player faction (Terran or Alien)
  const factionInfo = ALL_FACTIONS.find((f) => f.id === factionId) || ALL_FACTIONS[0]!;
  const defaultBlueprints = createFactionBlueprints(factionId);

  // Clone blueprints so edits don't mutate defaults
  const clonedBlueprints: Record<string, ShipBlueprint> = {};
  for (const [k, v] of Object.entries(defaultBlueprints)) {
    clonedBlueprints[k] = {
      ...v,
      slots: [...v.slots],
      externalParts: v.externalParts ? [...v.externalParts] : undefined,
    };
  }

  const shipCounts = options?.shipCounts || {
    interceptor: 1,
    cruiser: 1,
    dreadnought: 1,
    starbase: 0,
    ...(factionId === 'the_exiles' ? { orbital: 0 } : {}),
  };

  return {
    factionId,
    name: factionInfo.name,
    isNpc: false,
    shipCounts,
    blueprints: clonedBlueprints,
    hasAntimatterSplitter: options?.hasAntimatterSplitter ?? false,
  };
}

/**
 * Converts a side config into an array of fresh CombatUnits for a battle iteration.
 */
export function buildSimulatorUnits(
  sideConfig: SimulatorSideConfig,
  ownerId: 'attacker' | 'defender'
): CombatUnit[] {
  const units: CombatUnit[] = [];

  if (sideConfig.isNpc) {
    const npcType = sideConfig.factionId as NeutralShipType;
    const variant = sideConfig.npcVariant || 'default';
    const bp = getNeutralShipBlueprint(npcType, variant);
    const count = sideConfig.shipCounts[npcType] ?? (sideConfig.shipCounts.npcShip ?? 0);

    for (let i = 0; i < count; i++) {
      units.push({
        id: `${ownerId}_${npcType}_${i + 1}`,
        ownerId,
        type: npcType,
        initiative: bp.initiative,
        maxHull: bp.maxHull,
        currentDamage: 0,
        computerBonus: bp.computerBonus,
        shieldBonus: bp.shieldBonus,
        weapons: bp.weapons.map((w) => ({ ...w })),
      });
    }
    return units;
  }

  // Player faction ships
  for (const [shipType, count] of Object.entries(sideConfig.shipCounts)) {
    if (!count || count <= 0) continue;
    const bp = sideConfig.blueprints[shipType];
    if (!bp) continue;

    const stats = calculateBlueprintStats(bp, bp.activeExpansions);
    const allParts = [...(bp.slots || []), ...(bp.externalParts || [])];
    const weapons: CombatUnit['weapons'] = [];
    for (const part of allParts) {
      if (part?.dice) {
        for (const d of part.dice) {
          weapons.push({
            color: d.color,
            damage: d.damagePerHit,
            count: d.count,
            isMissile: d.isMissile,
          });
        }
      }
    }

    const hasMorphShield =
      Boolean(stats.hasMorphShield) ||
      allParts.some((p) => p?.id === 'morph_shield' || p?.morphShield);

    for (let i = 0; i < count; i++) {
      units.push({
        id: `${ownerId}_${shipType}_${i + 1}`,
        ownerId,
        type: shipType,
        initiative: stats.totalInitiative,
        maxHull: Math.max(1, stats.totalHull),
        currentDamage: 0,
        computerBonus: stats.computerBonus,
        shieldBonus: stats.shieldBonus,
        weapons: weapons.map((w) => ({ ...w })),
        hasMorphShield,
      });
    }
  }

  return units;
}

/**
 * Assigns damage from a salvo of dice rolls to eligible enemy targets.
 * Handles hit condition (roll=6 always hits, roll=1 misses, computers vs shields),
 * target priority (destroy ships first, then largest target, lowest HP tie-break),
 * and Antimatter Splitter (damage splitting across multiple targets without overkill waste).
 */
export function assignSalvoDamageToTargets(
  rolls: {
    rawRoll: number;
    damage: number;
    dieColor: string;
    isHit: boolean;
    selfDamage?: number;
  }[],
  computerBonus: number,
  enemyTargets: CombatUnit[],
  allUnits: CombatUnit[],
  attackerOwnerId: string,
  hasSplitter: boolean
): void {
  for (const r of rolls) {
    // Handle purple die self-damage
    if (r.dieColor === 'purple' && r.selfDamage && r.selfDamage > 0) {
      const activeCombatMock: any = { destroyedShips: [] };
      applyRiftSelfDamage(allUnits, attackerOwnerId, r.selfDamage, activeCombatMock);
    }

    const aliveTargets = enemyTargets.filter((u) => u.currentDamage < u.maxHull);
    if (aliveTargets.length === 0) break;

    const canHit = (cand: CombatUnit) => {
      if (r.dieColor === 'purple') return r.damage > 0;
      if (r.rawRoll === 6) return true;
      if (r.rawRoll === 1) return false;
      return r.rawRoll + computerBonus - cand.shieldBonus >= 6;
    };

    const validTargets = aliveTargets.filter(canHit);
    if (validTargets.length === 0) continue;

    // Sorting function for target priority
    const sortTargets = (pool: CombatUnit[], dmgToConsider: number) => {
      return [...pool].sort((a, b) => {
        const hpA = a.maxHull - a.currentDamage;
        const hpB = b.maxHull - b.currentDamage;
        const canKillA = hpA <= dmgToConsider;
        const canKillB = hpB <= dmgToConsider;

        // Priority 1: kill a ship if possible
        if (canKillA !== canKillB) {
          return canKillA ? -1 : 1;
        }

        // Priority 2: largest ship (gcds > dreadnought/guardian > cruiser/ancient > starbase/orbital > interceptor)
        const rankA = SIMULATOR_TARGET_PRIORITY[a.type] ?? 0;
        const rankB = SIMULATOR_TARGET_PRIORITY[b.type] ?? 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }

        // Priority 3: lowest remaining HP
        return hpA - hpB;
      });
    };

    // If Antimatter Splitter is active and damage is 2 or higher (multi-damage cannon or antimatter)
    if (hasSplitter && r.damage >= 2) {
      let remDmg = r.damage;
      while (remDmg > 0) {
        const currentValid = enemyTargets.filter(
          (u) => u.currentDamage < u.maxHull && canHit(u)
        );
        if (currentValid.length === 0) break;

        const sorted = sortTargets(currentValid, remDmg);
        const chosen = sorted[0]!;
        const needed = chosen.maxHull - chosen.currentDamage;
        const applied = Math.min(remDmg, needed);
        chosen.currentDamage += applied;
        remDmg -= applied;
      }
    } else {
      // Standard Eclipse damage rule: one die allocates to one target, excess damage lost
      const sorted = sortTargets(validTargets, r.damage);
      const chosen = sorted[0]!;
      chosen.currentDamage += r.damage;
    }
  }
}

/**
 * Core engagement battle between attacker and defender combat units to resolution.
 * Supports missile round, regular cannon rounds, Morph Shield regeneration,
 * and official stalemate rules (defender wins ties).
 */
export function simulateEngagement(
  attackerUnits: CombatUnit[],
  defenderUnits: CombatUnit[],
  hasAttackerSplitter: boolean,
  hasDefenderSplitter: boolean
): {
  winner: 'attacker' | 'defender' | 'draw';
  rounds: number;
  survivingUnits: CombatUnit[];
} {
  const allUnits = [...attackerUnits, ...defenderUnits];

  // -------------------------------------------------------------
  // STAGE 1: MISSILE COMBAT STAGE
  // -------------------------------------------------------------
  const aliveUnits = () => allUnits.filter((u) => u.currentDamage < u.maxHull);
  const missileGroups = getCombatShipTypeGroups(aliveUnits(), 'defender').filter((g) =>
    g.weapons.some((w) => w.isMissile)
  );

  for (const group of missileGroups) {
    if (group.ships.every((s) => s.currentDamage >= s.maxHull)) continue;

    const enemyTargets = aliveUnits().filter((u) => u.ownerId !== group.ownerId);
    if (enemyTargets.length === 0) break;

    const groupSplitter =
      group.ownerId === 'attacker' ? hasAttackerSplitter : hasDefenderSplitter;

    // Roll missile weapons
    const rolls: {
      rawRoll: number;
      damage: number;
      dieColor: string;
      isHit: boolean;
      selfDamage?: number;
    }[] = [];

    for (const ship of group.ships) {
      if (ship.currentDamage >= ship.maxHull) continue;
      const missiles = ship.weapons.filter((w) => w.isMissile);
      for (const w of missiles) {
        for (let i = 0; i < w.count; i++) {
          if (w.color === 'purple') {
            const p = rollPurpleDie();
            rolls.push({
              rawRoll: p.rawRoll,
              damage: p.targetDamage,
              dieColor: 'purple',
              isHit: p.isHit,
              selfDamage: p.selfDamage,
            });
          } else {
            const raw = rollD6();
            rolls.push({
              rawRoll: raw,
              damage: w.damage,
              dieColor: w.color,
              isHit: raw === 6,
            });
          }
        }
      }
    }

    assignSalvoDamageToTargets(
      rolls,
      group.computerBonus,
      enemyTargets,
      allUnits,
      group.ownerId,
      groupSplitter
    );
  }

  // Check if battle ended after missile phase
  const attAliveAfterMissiles = allUnits.some(
    (u) => u.ownerId === 'attacker' && u.currentDamage < u.maxHull
  );
  const defAliveAfterMissiles = allUnits.some(
    (u) => u.ownerId === 'defender' && u.currentDamage < u.maxHull
  );

  if (!attAliveAfterMissiles && !defAliveAfterMissiles) {
    return { winner: 'draw', rounds: 0, survivingUnits: [] };
  }
  if (!defAliveAfterMissiles) {
    return {
      winner: 'attacker',
      rounds: 0,
      survivingUnits: allUnits.filter(
        (u) => u.ownerId === 'attacker' && u.currentDamage < u.maxHull
      ),
    };
  }
  if (!attAliveAfterMissiles) {
    return {
      winner: 'defender',
      rounds: 0,
      survivingUnits: allUnits.filter(
        (u) => u.ownerId === 'defender' && u.currentDamage < u.maxHull
      ),
    };
  }

  // -------------------------------------------------------------
  // STAGE 2: REGULAR ENGAGEMENT ROUNDS (Cannons Only)
  // -------------------------------------------------------------
  let round = 1;
  const MAX_ROUNDS = 50;

  while (round <= MAX_ROUNDS) {
    const currentAlive = aliveUnits();
    const hasAnyAttackerCannons = currentAlive.some(
      (u) =>
        u.ownerId === 'attacker' &&
        u.weapons.some((w) => !w.isMissile && w.count > 0 && (w.damage > 0 || w.color === 'purple'))
    );
    const hasAnyDefenderCannons = currentAlive.some(
      (u) =>
        u.ownerId === 'defender' &&
        u.weapons.some((w) => !w.isMissile && w.count > 0 && (w.damage > 0 || w.color === 'purple'))
    );

    // Official Eclipse Rulebook p. 20: If neither side can inflict damage, Defender wins stalemate
    if (!hasAnyAttackerCannons && !hasAnyDefenderCannons) {
      return {
        winner: 'defender',
        rounds: round,
        survivingUnits: currentAlive.filter((u) => u.ownerId === 'defender'),
      };
    }
    if (!hasAnyAttackerCannons && hasAnyDefenderCannons) {
      // Attacker has no weapons left to fight
      return {
        winner: 'defender',
        rounds: round,
        survivingUnits: currentAlive.filter((u) => u.ownerId === 'defender'),
      };
    }

    const groups = getCombatShipTypeGroups(currentAlive, 'defender');

    for (const group of groups) {
      if (group.ships.every((s) => s.currentDamage >= s.maxHull)) continue;

      const enemyTargets = aliveUnits().filter((u) => u.ownerId !== group.ownerId);
      if (enemyTargets.length === 0) break;

      const groupSplitter =
        group.ownerId === 'attacker' ? hasAttackerSplitter : hasDefenderSplitter;

      const rolls: {
        rawRoll: number;
        damage: number;
        dieColor: string;
        isHit: boolean;
        selfDamage?: number;
      }[] = [];

      for (const ship of group.ships) {
        if (ship.currentDamage >= ship.maxHull) continue;
        const cannons = ship.weapons.filter((w) => !w.isMissile);
        for (const w of cannons) {
          for (let i = 0; i < w.count; i++) {
            if (w.color === 'purple') {
              const p = rollPurpleDie();
              rolls.push({
                rawRoll: p.rawRoll,
                damage: p.targetDamage,
                dieColor: 'purple',
                isHit: p.isHit,
                selfDamage: p.selfDamage,
              });
            } else {
              const raw = rollD6();
              rolls.push({
                rawRoll: raw,
                damage: w.damage,
                dieColor: w.color,
                isHit: raw === 6,
              });
            }
          }
        }
      }

      assignSalvoDamageToTargets(
        rolls,
        group.computerBonus,
        enemyTargets,
        allUnits,
        group.ownerId,
        groupSplitter
      );

      // Check if enemy fleet destroyed mid-round
      const remainingEnemy = aliveUnits().filter((u) => u.ownerId !== group.ownerId);
      if (remainingEnemy.length === 0) break;
    }

    // End-of-round Morph Shield healing
    for (const u of aliveUnits()) {
      if (u.hasMorphShield && u.currentDamage > 0 && u.currentDamage < u.maxHull) {
        u.currentDamage = Math.max(0, u.currentDamage - 1);
      }
    }

    const attAlive = allUnits.some(
      (u) => u.ownerId === 'attacker' && u.currentDamage < u.maxHull
    );
    const defAlive = allUnits.some(
      (u) => u.ownerId === 'defender' && u.currentDamage < u.maxHull
    );

    if (!attAlive && !defAlive) {
      return { winner: 'draw', rounds: round, survivingUnits: [] };
    }
    if (!defAlive) {
      return {
        winner: 'attacker',
        rounds: round,
        survivingUnits: allUnits.filter(
          (u) => u.ownerId === 'attacker' && u.currentDamage < u.maxHull
        ),
      };
    }
    if (!attAlive) {
      return {
        winner: 'defender',
        rounds: round,
        survivingUnits: allUnits.filter(
          (u) => u.ownerId === 'defender' && u.currentDamage < u.maxHull
        ),
      };
    }

    round++;
  }

  // Stalemate fallback: Defender wins ties
  return {
    winner: 'defender',
    rounds: MAX_ROUNDS,
    survivingUnits: allUnits.filter(
      (u) => u.ownerId === 'defender' && u.currentDamage < u.maxHull
    ),
  };
}

/**
 * Runs a single combat battle between attacker and defender to resolution.
 */
export function simulateSingleBattle(
  attackerConfig: SimulatorSideConfig,
  defenderConfig: SimulatorSideConfig
): {
  winner: 'attacker' | 'defender' | 'draw';
  rounds: number;
  survivingUnits: CombatUnit[];
} {
  const attackerUnits = buildSimulatorUnits(attackerConfig, 'attacker');
  const defenderUnits = buildSimulatorUnits(defenderConfig, 'defender');
  return simulateEngagement(
    attackerUnits,
    defenderUnits,
    attackerConfig.hasAntimatterSplitter,
    defenderConfig.hasAntimatterSplitter
  );
}

/**
 * Determines whether two factions are peaceful allies (e.g., Descendants of Draco & Ancients/NPCs).
 * In Eclipse rules, Descendants of Draco and Ancients/Guardians/GCDS never battle each other.
 */
export function isPeacefulCombatPair(factionA?: string, factionB?: string): boolean {
  if (!factionA || !factionB) return false;
  const npcs = ['ancient', 'guardian', 'gcds'];
  return (
    (factionA === 'descendants_of_draco' && npcs.includes(factionB)) ||
    (factionB === 'descendants_of_draco' && npcs.includes(factionA))
  );
}

/**
 * Simulates a multi-wave combat battle where combatants sequentially battle
 * defenders according to official Eclipse rules (Rulebook p. 20):
 * "If there are more than two players in the battle, the person who last entered
 * the system is the attacker and attacks the player who entered second to last.
 * The winner of that battle then becomes the attacker and battles the player who
 * entered third to last, and so on, until only one player's ships remain in the hex.
 * Ships do not repair damage between these battles."
 *
 * Exception: Descendants of Draco and Ancients/NPCs are peaceful allies and never battle each other.
 */
export function simulateMultiWaveBattle(
  attackerConfig: SimulatorSideConfig,
  defenderConfigs: SimulatorSideConfig[]
): {
  winner: 'attacker' | 'defender' | 'draw';
  winningDefenderIndex?: number;
  rounds: number;
  survivingUnits: CombatUnit[];
} {
  if (defenderConfigs.length === 0) {
    const units = buildSimulatorUnits(attackerConfig, 'attacker');
    return { winner: 'attacker', rounds: 0, survivingUnits: units };
  }

  let activeSide = {
    role: 'attacker' as 'attacker' | 'defender',
    defenderIndex: undefined as number | undefined,
    config: attackerConfig,
    units: buildSimulatorUnits(attackerConfig, 'attacker'),
    hasSplitter: attackerConfig.hasAntimatterSplitter,
  };

  let totalRounds = 0;
  let defIdx = 0;

  while (defIdx < defenderConfigs.length) {
    const curDefender = defenderConfigs[defIdx]!;

    // Check if the current active side and this defender are peaceful allies (Draco and Ancients)
    if (isPeacefulCombatPair(activeSide.config.factionId, curDefender.factionId)) {
      // Draco and Ancients do not fight each other.
      // Check if there are any remaining hostile defenders later in the sequence:
      const remainingHostileIndex = defenderConfigs
        .slice(defIdx + 1)
        .findIndex((d) => !isPeacefulCombatPair(activeSide.config.factionId, d.factionId));

      if (remainingHostileIndex === -1) {
        // No remaining hostile enemies in the sector; current active side retains the sector!
        return {
          winner: activeSide.role,
          winningDefenderIndex: activeSide.defenderIndex,
          rounds: totalRounds,
          survivingUnits: activeSide.units.filter((u) => u.currentDamage < u.maxHull),
        };
      } else {
        // Advance to the next hostile defender
        defIdx += 1 + remainingHostileIndex;
        continue;
      }
    }

    const aliveActiveUnits = activeSide.units.filter((u) => u.currentDamage < u.maxHull);
    if (aliveActiveUnits.length === 0) {
      // Active fleet has no surviving ships; this defender claims victory
      return {
        winner: 'defender',
        winningDefenderIndex: defIdx,
        rounds: totalRounds,
        survivingUnits: buildSimulatorUnits(curDefender, 'defender'),
      };
    }

    // Active side fights as 'attacker', this defender fights as 'defender' (defender wins ties)
    const normalizedActiveUnits = aliveActiveUnits.map((u) => ({
      ...u,
      ownerId: 'attacker' as const,
      weapons: u.weapons.map((w) => ({ ...w })),
    }));
    const defenderUnits = buildSimulatorUnits(curDefender, 'defender');

    const res = simulateEngagement(
      normalizedActiveUnits,
      defenderUnits,
      activeSide.hasSplitter,
      curDefender.hasAntimatterSplitter
    );

    totalRounds += res.rounds;

    if (res.winner === 'attacker') {
      // Active side won this wave and continues
      activeSide.units = res.survivingUnits;
      defIdx++;
    } else if (res.winner === 'defender') {
      // This defender won this wave!
      // In accordance with Eclipse rules:
      // "The winner of that battle then becomes the attacker and battles the next defender"
      activeSide = {
        role: 'defender',
        defenderIndex: defIdx,
        config: curDefender,
        units: res.survivingUnits,
        hasSplitter: curDefender.hasAntimatterSplitter,
      };
      defIdx++;
    } else {
      // Draw (mutual destruction of active side and this defender)
      if (defIdx + 1 < defenderConfigs.length) {
        // Next defender becomes the active side
        const nextDefIdx = defIdx + 1;
        const nextDef = defenderConfigs[nextDefIdx]!;
        activeSide = {
          role: 'defender',
          defenderIndex: nextDefIdx,
          config: nextDef,
          units: buildSimulatorUnits(nextDef, 'attacker'),
          hasSplitter: nextDef.hasAntimatterSplitter,
        };
        defIdx = nextDefIdx + 1;
      } else {
        return {
          winner: 'draw',
          winningDefenderIndex: defIdx,
          rounds: totalRounds,
          survivingUnits: [],
        };
      }
    }
  }

  return {
    winner: activeSide.role,
    winningDefenderIndex: activeSide.defenderIndex,
    rounds: totalRounds,
    survivingUnits: activeSide.units.filter((u) => u.currentDamage < u.maxHull),
  };
}

/**
 * Aggregates surviving units into a clean fleet summary string and structure.
 */
function summarizeSurvivingFleet(units: CombatUnit[]): {
  key: string;
  summary: string;
  ships: { type: string; count: number }[];
} {
  if (units.length === 0) {
    return { key: 'none', summary: 'None (Fleet Destroyed)', ships: [] };
  }

  const counts: Record<string, number> = {};
  for (const u of units) {
    counts[u.type] = (counts[u.type] || 0) + 1;
  }

  const sortedTypes = Object.keys(counts).sort((a, b) => {
    const rankA = SIMULATOR_TARGET_PRIORITY[a] ?? 0;
    const rankB = SIMULATOR_TARGET_PRIORITY[b] ?? 0;
    return rankB - rankA;
  });

  const parts: string[] = [];
  const ships: { type: string; count: number }[] = [];

  for (const t of sortedTypes) {
    const cnt = counts[t]!;
    ships.push({ type: t, count: cnt });
    const formattedName =
      t === 'ancient' ? (cnt > 1 ? 'Ancients' : 'Ancient') :
      t === 'guardian' ? (cnt > 1 ? 'Guardians' : 'Guardian') :
      t === 'gcds' ? 'GCDS' :
      t.charAt(0).toUpperCase() + t.slice(1) + (cnt > 1 ? 's' : '');
    parts.push(`${cnt} ${formattedName}`);
  }

  const key = ships.map((s) => `${s.count}_${s.type}`).join('-');
  const summary = parts.join(', ');

  return { key, summary, ships };
}

/**
 * Runs a full Monte Carlo combat simulation for 1,000 or 10,000 iterations.
 * Supports multiple defenders fought in sequential wave battles (Rulebook p. 20).
 * Validates blueprint legality (power supply, engine requirement, etc.) before running.
 */
export function runCombatSimulation(
  attackerConfig: SimulatorSideConfig,
  defenderConfig: SimulatorSideConfig | SimulatorSideConfig[],
  iterations: number = 1000,
  options?: { allowIllegalBlueprints?: boolean }
): SimulationResult {
  const defenders = Array.isArray(defenderConfig) ? defenderConfig : [defenderConfig];
  const effectiveIterations = Math.max(1, iterations);

  // Validate modified blueprints for participating ships across attacker and all defenders
  const attValidation = validateSimulatorSide(attackerConfig, true);
  const defValidations = defenders.map((d) => validateSimulatorSide(d, true));
  const validationErrors = [
    ...attValidation.errors,
    ...defValidations.flatMap((v) => v.errors),
  ];

  if (!options?.allowIllegalBlueprints && validationErrors.length > 0) {
    return {
      iterations: 0,
      attackerWins: 0,
      attackerWinRate: 0,
      defenderWins: 0,
      defenderWinRate: 0,
      draws: 0,
      drawRate: 0,
      avgRounds: 0,
      attackerSurvivingOutcomes: [],
      defenderSurvivingOutcomes: [],
      defendersBreakdown: defenders.map((d, idx) => ({
        index: idx,
        name: d.name,
        factionId: d.factionId,
        wins: 0,
        winRate: 0,
      })),
      participants: [],
      validationErrors,
    };
  }

  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let totalRounds = 0;
  const defenderWinCounts: Record<number, number> = {};

  const attackerOutcomesMap = new Map<
    string,
    { summary: string; ships: { type: string; count: number }[]; count: number }
  >();
  const defenderOutcomesMap = new Map<
    string,
    { summary: string; ships: { type: string; count: number }[]; count: number }
  >();
  const defenderOutcomesMaps: Map<
    string,
    { summary: string; ships: { type: string; count: number }[]; count: number }
  >[] = defenders.map(() => new Map());

  for (let i = 0; i < effectiveIterations; i++) {
    const res = simulateMultiWaveBattle(attackerConfig, defenders);
    totalRounds += res.rounds;

    if (res.winner === 'attacker') {
      attackerWins++;
      const fleet = summarizeSurvivingFleet(res.survivingUnits);
      const existing = attackerOutcomesMap.get(fleet.key);
      if (existing) {
        existing.count++;
      } else {
        attackerOutcomesMap.set(fleet.key, {
          summary: fleet.summary,
          ships: fleet.ships,
          count: 1,
        });
      }
    } else if (res.winner === 'defender') {
      defenderWins++;
      const winIdx = res.winningDefenderIndex ?? 0;
      defenderWinCounts[winIdx] = (defenderWinCounts[winIdx] || 0) + 1;

      const fleet = summarizeSurvivingFleet(res.survivingUnits);

      // Track outcomes per defender index (clean summary without prefix)
      const defMap = defenderOutcomesMaps[winIdx];
      if (defMap) {
        const defExisting = defMap.get(fleet.key);
        if (defExisting) {
          defExisting.count++;
        } else {
          defMap.set(fleet.key, {
            summary: fleet.summary,
            ships: fleet.ships,
            count: 1,
          });
        }
      }

      // Track combined defender outcomes (backward compatible)
      const outcomeKey = defenders.length > 1 ? `def_${winIdx}_${fleet.key}` : fleet.key;
      const outcomeSummary =
        defenders.length > 1
          ? `[Defender ${winIdx + 1}: ${defenders[winIdx]?.name || 'Defender'}] ${fleet.summary}`
          : fleet.summary;

      const existing = defenderOutcomesMap.get(outcomeKey);
      if (existing) {
        existing.count++;
      } else {
        defenderOutcomesMap.set(outcomeKey, {
          summary: outcomeSummary,
          ships: fleet.ships,
          count: 1,
        });
      }
    } else {
      draws++;
    }
  }

  const formatOutcomes = (
    map: Map<string, { summary: string; ships: { type: string; count: number }[]; count: number }>
  ): SimulationSurvivingFleet[] => {
    const list: SimulationSurvivingFleet[] = [];
    for (const [key, val] of map.entries()) {
      list.push({
        key,
        summary: val.summary,
        ships: val.ships,
        count: val.count,
        percentage: Number(((val.count / effectiveIterations) * 100).toFixed(1)),
      });
    }
    list.sort((a, b) => b.count - a.count);
    return list;
  };

  const defendersBreakdown = defenders.map((d, idx) => ({
    index: idx,
    name: d.name,
    factionId: d.factionId,
    wins: defenderWinCounts[idx] || 0,
    winRate: Number((((defenderWinCounts[idx] || 0) / effectiveIterations) * 100).toFixed(1)),
    survivingOutcomes: formatOutcomes(defenderOutcomesMaps[idx] || new Map()),
  }));

  // Build participant breakdown for the win rate bar.
  // Each independent participant has their own share of the win rate bar.
  // Exception: Descendants of Draco and Ancients/NPCs are peaceful allies and defend together.
  const participants: SimulatorParticipantOutcome[] = [
    {
      id: 'attacker',
      role: 'attacker',
      name: `Attacker (${attackerConfig.name})`,
      factionIds: [attackerConfig.factionId],
      wins: attackerWins,
      winRate: Number(((attackerWins / effectiveIterations) * 100).toFixed(1)),
      isAlliance: false,
      survivingOutcomes: formatOutcomes(attackerOutcomesMap),
    },
  ];

  if (draws > 0) {
    participants.push({
      id: 'draw',
      role: 'draw',
      name: 'Draw',
      factionIds: [],
      wins: draws,
      winRate: Number(((draws / effectiveIterations) * 100).toFixed(1)),
      isAlliance: false,
      survivingOutcomes: [],
    });
  }

  // Group defenders according to peaceful alliance rules (Draco & Ancients/NPCs exception)
  const defenderGroups: {
    id: string;
    names: string[];
    factionIds: string[];
    wins: number;
    indices: number[];
  }[] = [];

  for (const d of defendersBreakdown) {
    const alliedGroup = defenderGroups.find((g) =>
      g.factionIds.some((fId) => isPeacefulCombatPair(fId, d.factionId))
    );

    if (alliedGroup) {
      alliedGroup.names.push(d.name);
      alliedGroup.factionIds.push(d.factionId);
      alliedGroup.indices.push(d.index);
      alliedGroup.wins += d.wins;
    } else {
      defenderGroups.push({
        id: `def_group_${d.index}`,
        names: [d.name],
        factionIds: [d.factionId],
        wins: d.wins,
        indices: [d.index],
      });
    }
  }

  for (const g of defenderGroups) {
    const isAlliance = g.indices.length > 1;
    const displayName = isAlliance
      ? `Allied Defenders (${g.names.join(' & ')})`
      : defendersBreakdown.length > 1
      ? `Defender ${g.indices[0]! + 1} (${g.names[0]})`
      : `Defender (${g.names[0]})`;

    // Aggregate surviving outcomes across all defender indices in this group
    const groupOutcomesMap = new Map<
      string,
      { summary: string; ships: { type: string; count: number }[]; count: number }
    >();
    for (const idx of g.indices) {
      const defMap = defenderOutcomesMaps[idx];
      if (defMap) {
        for (const [k, v] of defMap.entries()) {
          const outcomeKey = isAlliance ? `${g.names[g.indices.indexOf(idx)]}_${k}` : k;
          const outcomeSummary = isAlliance ? `[${g.names[g.indices.indexOf(idx)]}] ${v.summary}` : v.summary;
          const existing = groupOutcomesMap.get(outcomeKey);
          if (existing) {
            existing.count += v.count;
          } else {
            groupOutcomesMap.set(outcomeKey, {
              summary: outcomeSummary,
              ships: v.ships,
              count: v.count,
            });
          }
        }
      }
    }

    participants.push({
      id: g.id,
      role: 'defender',
      name: displayName,
      factionIds: g.factionIds,
      wins: g.wins,
      winRate: Number(((g.wins / effectiveIterations) * 100).toFixed(1)),
      isAlliance,
      defenderIndices: g.indices,
      survivingOutcomes: formatOutcomes(groupOutcomesMap),
    });
  }

  return {
    iterations: effectiveIterations,
    attackerWins,
    attackerWinRate: Number(((attackerWins / effectiveIterations) * 100).toFixed(1)),
    defenderWins,
    defenderWinRate: Number(((defenderWins / effectiveIterations) * 100).toFixed(1)),
    draws,
    drawRate: Number(((draws / effectiveIterations) * 100).toFixed(1)),
    avgRounds: Number((totalRounds / effectiveIterations).toFixed(1)),
    attackerSurvivingOutcomes: formatOutcomes(attackerOutcomesMap),
    defenderSurvivingOutcomes: formatOutcomes(defenderOutcomesMap),
    defendersBreakdown,
    participants,
  };
}

/**
 * In-Game Helper: Inspects the galaxy sectors to identify any sectors that have
 * pending combat, opposing fleets, or NPC encounters.
 * Supports Nebula subsector division (subsector 1, 2, 3).
 */
export function findSectorsWithPendingCombat(gameState: GameState): {
  sector: SectorTile;
  sectorNumber: number | string;
  subsector?: 1 | 2 | 3;
  description: string;
  hasCombat: boolean;
  participants: string[];
}[] {
  const results: {
    sector: SectorTile;
    sectorNumber: number | string;
    subsector?: 1 | 2 | 3;
    description: string;
    hasCombat: boolean;
    participants: string[];
  }[] = [];

  for (const sector of gameState.sectors) {
    if (sector.isNebula) {
      // Nebula hexes have 3 subsectors (1, 2, 3)
      for (const subIdx of [1, 2, 3] as const) {
        const subShips = (sector.ships || []).filter((s) => (s.subsector ?? 1) === subIdx);
        const playerShipOwnerIds = Array.from(
          new Set(subShips.map((s) => s.ownerId).filter((id) => id.startsWith('player_')))
        );

        const hasAncients = subShips.some(
          (s) => s.ownerId === 'ancient' || s.type === 'ancient'
        );
        const hasGuardian = subShips.some(
          (s) => s.ownerId === 'guardian' || s.type === 'guardian'
        );
        const hasGcds = subShips.some(
          (s) => s.ownerId === 'gcds' || s.type === 'gcds'
        );

        const npcParticipants: string[] = [];
        if (hasAncients) npcParticipants.push('Ancients');
        if (hasGuardian) npcParticipants.push('Guardian');
        if (hasGcds) npcParticipants.push('GCDS');

        const participantNames: string[] = [];
        for (const pId of playerShipOwnerIds) {
          const p = gameState.players.find((player) => player.id === pId);
          participantNames.push(p?.faction?.name || p?.name || 'Player');
        }
        participantNames.push(...npcParticipants);

        const isPendingCombat =
          (playerShipOwnerIds.length >= 2) ||
          (playerShipOwnerIds.length >= 1 && npcParticipants.length > 0) ||
          (gameState.activeCombat &&
            gameState.activeCombat.sectorId === sector.id &&
            (gameState.activeCombat.subsector ?? 1) === subIdx);

        if (subShips.length > 0 || hasAncients || hasGuardian || hasGcds) {
          const desc = isPendingCombat
            ? `⚔️ Sector ${sector.sectorNumber} (Nebula Subsector ${subIdx}): ${participantNames.join(' vs ')}`
            : `Sector ${sector.sectorNumber} (Nebula Subsector ${subIdx}): ${participantNames.join(', ')}`;

          results.push({
            sector,
            sectorNumber: sector.sectorNumber,
            subsector: subIdx,
            description: desc,
            hasCombat: Boolean(isPendingCombat),
            participants: participantNames,
          });
        }
      }
    } else {
      // Regular non-nebula sector
      const ships = sector.ships || [];
      const playerShipOwnerIds = Array.from(
        new Set(ships.map((s) => s.ownerId).filter((id) => id.startsWith('player_')))
      );

      const hasAncients =
        (sector.ancientsCount || 0) > 0 ||
        ships.some((s) => s.ownerId === 'ancient' || s.type === 'ancient');
      const hasGuardian = ships.some(
        (s) => s.ownerId === 'guardian' || s.type === 'guardian'
      );
      const hasGcds =
        Boolean(sector.hasGCDS) ||
        ships.some((s) => s.ownerId === 'gcds' || s.type === 'gcds');

      const npcParticipants: string[] = [];
      if (hasAncients) npcParticipants.push('Ancients');
      if (hasGuardian) npcParticipants.push('Guardian');
      if (hasGcds) npcParticipants.push('GCDS');

      const participantNames: string[] = [];
      for (const pId of playerShipOwnerIds) {
        const p = gameState.players.find((player) => player.id === pId);
        participantNames.push(p?.faction?.name || p?.name || 'Player');
      }
      participantNames.push(...npcParticipants);

      const isPendingCombat =
        (playerShipOwnerIds.length >= 2) ||
        (playerShipOwnerIds.length >= 1 && npcParticipants.length > 0) ||
        (gameState.activeCombat && gameState.activeCombat.sectorId === sector.id);

      if (ships.length > 0 || hasAncients || hasGuardian || hasGcds) {
        const desc = isPendingCombat
          ? `⚔️ Sector ${sector.sectorNumber}: ${participantNames.join(' vs ')}`
          : `Sector ${sector.sectorNumber}: ${participantNames.join(', ')}`;

        results.push({
          sector,
          sectorNumber: sector.sectorNumber,
          description: desc,
          hasCombat: Boolean(isPendingCombat),
          participants: participantNames,
        });
      }
    }
  }

  // Sort so sectors with pending combat appear first
  results.sort((a, b) => {
    if (a.hasCombat !== b.hasCombat) return a.hasCombat ? -1 : 1;
    return Number(a.sectorNumber) - Number(b.sectorNumber);
  });

  return results;
}

/**
 * In-Game Helper: Loads battle setup directly from a sector in the active game.
 * Supports Nebula subsectors and multiple defenders ordered according to entry order.
 */
export function loadBattleFromSector(
  gameState: GameState,
  sectorId: string,
  subsector?: 1 | 2 | 3
): {
  attacker: SimulatorSideConfig;
  defender: SimulatorSideConfig;
  defenders: SimulatorSideConfig[];
} | null {
  const sector = gameState.sectors.find((s) => s.id === sectorId);
  if (!sector) return null;

  let targetSubsector = subsector;
  if (sector.isNebula && !targetSubsector) {
    if (gameState.activeCombat && gameState.activeCombat.sectorId === sector.id && gameState.activeCombat.subsector) {
      targetSubsector = gameState.activeCombat.subsector;
    } else {
      targetSubsector = ([1, 2, 3] as const).find((sub) =>
        (sector.ships || []).some((s) => (s.subsector ?? 1) === sub)
      ) || 1;
    }
  }

  const allSectorShips = sector.ships || [];
  const relevantShips = sector.isNebula
    ? allSectorShips.filter((s) => (s.subsector ?? 1) === targetSubsector)
    : allSectorShips;

  const hasAncients = sector.isNebula
    ? relevantShips.some((s) => s.ownerId === 'ancient' || s.type === 'ancient')
    : (sector.ancientsCount || 0) > 0 || relevantShips.some((s) => s.ownerId === 'ancient' || s.type === 'ancient');
  const hasGuardian = relevantShips.some((s) => s.ownerId === 'guardian' || s.type === 'guardian');
  const hasGcds = sector.isNebula
    ? relevantShips.some((s) => s.ownerId === 'gcds' || s.type === 'gcds')
    : Boolean(sector.hasGCDS) || relevantShips.some((s) => s.ownerId === 'gcds' || s.type === 'gcds');

  const distinctOwners = Array.from(new Set(relevantShips.map((s) => s.ownerId)));
  if (hasAncients && !distinctOwners.includes('ancient')) distinctOwners.push('ancient');
  if (hasGuardian && !distinctOwners.includes('guardian')) distinctOwners.push('guardian');
  if (hasGcds && !distinctOwners.includes('gcds')) distinctOwners.push('gcds');

  if (distinctOwners.length === 0) return null;

  // Order owners by entry order (Rulebook page 20 & Descendants of Draco faction ability):
  // NPCs are passive defenders and original occupants, placed before players.
  const dracoPlayerInSector = gameState.players.find(
    (p) => p.faction.id === 'descendants_of_draco' && distinctOwners.includes(p.id)
  );

  const orderedOwners: string[] = [];

  // 1. NPCs (Ancients, Guardian, GCDS) are always considered the original occupants
  for (const npc of ['ancient', 'guardian', 'gcds']) {
    if (distinctOwners.includes(npc) && !orderedOwners.includes(npc)) {
      orderedOwners.push(npc);
    }
  }

  // 2. Original sector discOwner (if present with ships)
  if (sector.discOwner && distinctOwners.includes(sector.discOwner) && !orderedOwners.includes(sector.discOwner)) {
    orderedOwners.push(sector.discOwner);
  }

  // 3. For Draco in an NPC sector, Draco must be placed after NPCs and discOwner
  // so that when defenders are reversed, Draco is fought first (Draco faction ability)
  if (dracoPlayerInSector && !orderedOwners.includes(dracoPlayerInSector.id)) {
    orderedOwners.push(dracoPlayerInSector.id);
  }

  // 4. Other distinct owners not in playerEntryOrder
  for (const o of distinctOwners) {
    if (!orderedOwners.includes(o) && !(sector.playerEntryOrder || []).includes(o)) {
      orderedOwners.push(o);
    }
  }

  // 5. Entrants in sector playerEntryOrder
  for (const o of (sector.playerEntryOrder || [])) {
    if (distinctOwners.includes(o) && !orderedOwners.includes(o)) {
      orderedOwners.push(o);
    }
  }

  // Safety check: NPCs can NEVER be the attacker if any player is present!
  if (orderedOwners.length >= 2) {
    const lastOwner = orderedOwners[orderedOwners.length - 1]!;
    if (['ancient', 'guardian', 'gcds'].includes(lastOwner)) {
      const playerIdx = orderedOwners.slice().reverse().findIndex((o) => !['ancient', 'guardian', 'gcds'].includes(o));
      if (playerIdx !== -1) {
        const actualIdx = orderedOwners.length - 1 - playerIdx;
        const [movedPlayer] = orderedOwners.splice(actualIdx, 1);
        orderedOwners.push(movedPlayer!);
      }
    }
  }

  const buildConfigForOwner = (ownerId: string): SimulatorSideConfig => {
    if (['ancient', 'guardian', 'gcds'].includes(ownerId)) {
      const npcType = ownerId as NeutralShipType;
      const variant = gameState.neutralShipBlueprints?.[npcType] || 'default';
      const npcCount =
        npcType === 'ancient'
          ? Math.max(
              relevantShips.filter((s) => s.ownerId === 'ancient' || s.type === 'ancient').length,
              sector.isNebula ? 0 : (sector.ancientsCount || 0),
              1
            )
          : 1;

      return createDefaultSimulatorSide(npcType, {
        isNpc: true,
        npcVariant: variant,
        shipCounts: { [npcType]: npcCount },
      });
    }

    const player = gameState.players.find((p) => p.id === ownerId);
    if (!player) {
      return createDefaultSimulatorSide('ancient', { isNpc: true });
    }

    const counts: Record<string, number> = {};
    for (const s of relevantShips.filter((s) => s.ownerId === player.id)) {
      counts[s.type] = (counts[s.type] || 0) + 1;
    }

    const totalShips = Object.values(counts).reduce((a, b) => a + b, 0);
    const effectiveCounts = totalShips > 0 ? counts : { cruiser: 1 };

    return {
      factionId: player.faction.id,
      name: player.faction.name,
      isNpc: false,
      shipCounts: effectiveCounts,
      blueprints: player.blueprints,
      hasAntimatterSplitter: Boolean(
        player.techTrack?.researched?.some((t) => t.id === 'antimatter_splitter')
      ),
    };
  };

  if (orderedOwners.length >= 2) {
    const attackerOwnerId = orderedOwners[orderedOwners.length - 1]!;
    const defenderOwnerIds = orderedOwners.slice(0, orderedOwners.length - 1).reverse();

    const attacker = buildConfigForOwner(attackerOwnerId);
    const defenders = defenderOwnerIds.map(buildConfigForOwner);

    return {
      attacker,
      defender: defenders[0]!,
      defenders,
    };
  }

  // Single owner present in sector/subsector
  const soleOwnerId = orderedOwners[0]!;
  if (['ancient', 'guardian', 'gcds'].includes(soleOwnerId)) {
    const defender = buildConfigForOwner(soleOwnerId);
    const attPlayer = gameState.players[0]!;
    const attacker: SimulatorSideConfig = {
      factionId: attPlayer.faction.id,
      name: attPlayer.faction.name,
      isNpc: false,
      shipCounts: { cruiser: 1, interceptor: 1 },
      blueprints: attPlayer.blueprints,
      hasAntimatterSplitter: Boolean(
        attPlayer.techTrack?.researched?.some((t) => t.id === 'antimatter_splitter')
      ),
    };
    return { attacker, defender, defenders: [defender] };
  } else {
    const attacker = buildConfigForOwner(soleOwnerId);
    const defender = createDefaultSimulatorSide('ancient', {
      isNpc: true,
      npcVariant: 'default',
      shipCounts: { ancient: 2 },
    });
    return { attacker, defender, defenders: [defender] };
  }
}
