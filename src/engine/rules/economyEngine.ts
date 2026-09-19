/**
 * Economy, Income, Upkeep and Bankruptcy Rules for Eclipse: Second Dawn
 */

import { PlayerState } from '../types/player';
import { TECH_TRACK_DISCOUNT_TABLE } from './techData';

export const INCOME_TABLE = [
  28, // 0 cubes on board (11 colonized)
  24, // 1
  21, // 2
  18, // 3
  15, // 4
  12, // 5
  10, // 6
  8,  // 7
  6,  // 8
  4,  // 9
  3,  // 10
  2,  // 11 cubes on board (0 colonized)
];

/**
 * Official track spaces from left to right as printed on the physical Control Board.
 * Index 0 is the base space (2) uncovered when 11 cubes remain on board.
 * Indices 1 to 11 correspond to spaces 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28.
 * Cubes are placed from space 3 to 28 during setup (11 cubes per track).
 * As population cubes are placed onto planets, spaces are uncovered from left to right.
 * The highest uncovered space value determines the income produced during Upkeep.
 */
export interface PopulationTrackSpace {
  slotIndex: number; // 0 to 11
  value: number; // 2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 28
  cubesOnBoardThreshold: number; // When cubesOnBoard == threshold, this space is the active uncovered income
}

export const POPULATION_TRACK_SPACES: PopulationTrackSpace[] = [
  { slotIndex: 0, value: 2, cubesOnBoardThreshold: 11 },
  { slotIndex: 1, value: 3, cubesOnBoardThreshold: 10 },
  { slotIndex: 2, value: 4, cubesOnBoardThreshold: 9 },
  { slotIndex: 3, value: 6, cubesOnBoardThreshold: 8 },
  { slotIndex: 4, value: 8, cubesOnBoardThreshold: 7 },
  { slotIndex: 5, value: 10, cubesOnBoardThreshold: 6 },
  { slotIndex: 6, value: 12, cubesOnBoardThreshold: 5 },
  { slotIndex: 7, value: 15, cubesOnBoardThreshold: 4 },
  { slotIndex: 8, value: 18, cubesOnBoardThreshold: 3 },
  { slotIndex: 9, value: 21, cubesOnBoardThreshold: 2 },
  { slotIndex: 10, value: 24, cubesOnBoardThreshold: 1 },
  { slotIndex: 11, value: 28, cubesOnBoardThreshold: 0 },
];

export const UPKEEP_TABLE: Record<number, number> = {
  16: 0,
  15: 0,
  14: 0,
  13: 0,
  12: 0, // 1 disc used (home sector) -> 0 upkeep
  11: 0, // 2 discs used -> 0 upkeep
  10: 1, // 3 discs used -> 1 upkeep
  9: 2,  // 4 discs used -> 2 upkeep
  8: 3,  // 5 discs used -> 3 upkeep
  7: 5,  // 6 discs used -> 5 upkeep
  6: 7,  // 7 discs used -> 7 upkeep
  5: 10, // 8 discs used -> 10 upkeep
  4: 13, // 9 discs used -> 13 upkeep
  3: 17, // 10 discs used -> 17 upkeep
  2: 21, // 11 discs used -> 21 upkeep
  1: 25, // 12 discs used -> 25 upkeep
  0: 30, // 13 discs used -> 30 upkeep
};

export function getIncomeForTrack(cubesOnBoard: number): number {
  const index = Math.max(0, Math.min(11, cubesOnBoard));
  return INCOME_TABLE[index] ?? 2;
}

export function getUpkeepForDiscs(discsRemaining: number): number {
  const clamped = Math.max(0, Math.min(16, discsRemaining));
  return UPKEEP_TABLE[clamped] ?? 35;
}

export function calculatePlayerRoundSummary(player: PlayerState): {
  income: { money: number; science: number; materials: number };
  upkeep: number;
  netMoneyDelta: number;
  projectedMoney: number;
  canAffordUpkeep: boolean;
} {
  const moneyIncome = getIncomeForTrack(player.population.money.cubesOnBoard);
  const scienceIncome = getIncomeForTrack(player.population.science.cubesOnBoard);
  const materialsIncome = getIncomeForTrack(player.population.material.cubesOnBoard);

  const upkeep = getUpkeepForDiscs(player.influenceTrack.discsOnTrack);
  const netMoneyDelta = moneyIncome - upkeep;
  const projectedMoney = player.resources.money + netMoneyDelta;

  return {
    income: {
      money: moneyIncome,
      science: scienceIncome,
      materials: materialsIncome,
    },
    upkeep,
    netMoneyDelta,
    projectedMoney,
    canAffordUpkeep: projectedMoney >= 0,
  };
}

export interface UpkeepPhaseResult {
  updatedPlayer: PlayerState;
  bankrupt: boolean;
  abandonedSectorIds: string[];
  eliminated: boolean;
  bankruptcyLog: string[];
}

export function abandonSectorForUpkeep(
  player: PlayerState,
  sector: SectorTile
): {
  updatedPlayer: PlayerState;
  savedUpkeep: number;
} {
  const updatedPlayer: PlayerState = JSON.parse(JSON.stringify(player));
  const oldMoneyIncome = getIncomeForTrack(player.population.money.cubesOnBoard);
  const oldUpkeep = getUpkeepForDiscs(player.influenceTrack.discsOnTrack);

  // Abandon this sector
  sector.discOwner = undefined;
  updatedPlayer.influenceTrack.discsOnTrack = Math.min(
    updatedPlayer.influenceTrack.totalDiscs,
    updatedPlayer.influenceTrack.discsOnTrack + 1
  );

  // Return population cubes from sector back to player board
  for (const p of sector.planets) {
    if (p.colonizedBy === updatedPlayer.id) {
      const res = p.colonizedResource || (p.resource !== 'any' ? p.resource : 'money');
      if (res === 'money' || res === 'science' || res === 'material') {
        updatedPlayer.population[res].cubesOnBoard = Math.min(
          11,
          updatedPlayer.population[res].cubesOnBoard + 1
        );
      }
      p.colonizedBy = undefined;
      p.colonizedResource = undefined;
    }
  }

  const newMoneyIncome = getIncomeForTrack(updatedPlayer.population.money.cubesOnBoard);
  const lostMoneyIncome = oldMoneyIncome - newMoneyIncome;

  const newUpkeep = getUpkeepForDiscs(updatedPlayer.influenceTrack.discsOnTrack);
  const savedUpkeep = oldUpkeep - newUpkeep;
  const netDelta = savedUpkeep - lostMoneyIncome;
  updatedPlayer.resources.money += netDelta;

  return { updatedPlayer, savedUpkeep: netDelta };
}

export function applyUpkeepPhase(
  player: PlayerState,
  sectors: SectorTile[] = []
): UpkeepPhaseResult {
  const log: string[] = [];
  const updatedPlayer: PlayerState = JSON.parse(JSON.stringify(player));
  const abandonedSectorIds: string[] = [];
  let eliminated = false;
  let bankrupt = false;

  // Step 1: Add round Money production and deduct Upkeep
  const moneyIncome = getIncomeForTrack(updatedPlayer.population.money.cubesOnBoard);
  let upkeep = getUpkeepForDiscs(updatedPlayer.influenceTrack.discsOnTrack);
  updatedPlayer.resources.money += moneyIncome - upkeep;

  if (updatedPlayer.resources.money < 0) {
    bankrupt = true;
    log.push(
      `${updatedPlayer.name} has a budget deficit of ${Math.abs(updatedPlayer.resources.money)} Credits and enters Bankruptcy!`
    );

    const tradeRatio = updatedPlayer.faction.tradeRatio || 2;

    // Step 1: Emergency trade from materials to money
    if (updatedPlayer.resources.money < 0 && updatedPlayer.resources.materials > 0) {
      const neededMoney = Math.abs(updatedPlayer.resources.money);
      const matsToTrade = Math.min(
        updatedPlayer.resources.materials,
        neededMoney * tradeRatio
      );
      const unitsTraded = Math.floor(matsToTrade / tradeRatio) * tradeRatio;
      if (unitsTraded > 0) {
        const gained = unitsTraded / tradeRatio;
        updatedPlayer.resources.materials -= unitsTraded;
        updatedPlayer.resources.money += gained;
        log.push(
          `${updatedPlayer.name} made an emergency trade of ${unitsTraded} Materials for ${gained} Credits.`
        );
      }
    }

    // Step 2: Emergency trade from science to money
    if (updatedPlayer.resources.money < 0 && updatedPlayer.resources.science > 0) {
      const neededMoney = Math.abs(updatedPlayer.resources.money);
      const sciToTrade = Math.min(
        updatedPlayer.resources.science,
        neededMoney * tradeRatio
      );
      const unitsTraded = Math.floor(sciToTrade / tradeRatio) * tradeRatio;
      if (unitsTraded > 0) {
        const gained = unitsTraded / tradeRatio;
        updatedPlayer.resources.science -= unitsTraded;
        updatedPlayer.resources.money += gained;
        log.push(
          `${updatedPlayer.name} made an emergency trade of ${unitsTraded} Science for ${gained} Credits.`
        );
      }
    }

    // Step 3: Abandon controlled sectors (start with non-home sectors)
    if (updatedPlayer.resources.money < 0 && sectors.length > 0) {
      const controlledSectors = sectors.filter(
        (s) => s.discOwner === updatedPlayer.id
      );

      // Separate non-home and home sectors
      const nonHome = controlledSectors.filter(
        (s) => s.sectorNumber !== updatedPlayer.faction.startingSectorNumber
      );
      const home = controlledSectors.filter(
        (s) => s.sectorNumber === updatedPlayer.faction.startingSectorNumber
      );

      const sectorsToConsider = [...nonHome, ...home];

      for (const sec of sectorsToConsider) {
        if (updatedPlayer.resources.money >= 0) break;

        const { updatedPlayer: afterAbandon, savedUpkeep } = abandonSectorForUpkeep(updatedPlayer, sec);
        Object.assign(updatedPlayer, afterAbandon);
        abandonedSectorIds.push(sec.id);
        upkeep = getUpkeepForDiscs(updatedPlayer.influenceTrack.discsOnTrack);

        log.push(
          `${updatedPlayer.name} abandoned Sector ${sec.sectorNumber}, returning an Influence Disc and population cubes (saved ${savedUpkeep} upkeep).`
        );
      }
    }

    // Step 4: If STILL negative, player is eliminated!
    if (updatedPlayer.resources.money < 0) {
      eliminated = true;
      updatedPlayer.isEliminated = true;
      updatedPlayer.resources.money = 0;
      log.push(
        `🚨 CIVILIZATION COLLAPSE: ${updatedPlayer.name} cannot balance their budget and is ELIMINATED from the galaxy!`
      );
    }
  }

  // Step 5: Collect Science and Materials production (only if not eliminated)
  // Per official Eclipse rules, collected after resolving any bankruptcy and sector abandonment!
  if (!eliminated) {
    const scienceIncome = getIncomeForTrack(updatedPlayer.population.science.cubesOnBoard);
    const materialsIncome = getIncomeForTrack(updatedPlayer.population.material.cubesOnBoard);
    updatedPlayer.resources.science += scienceIncome;
    updatedPlayer.resources.materials += materialsIncome;

    // Refresh colony ships in Upkeep phase
    updatedPlayer.colonyShips = {
      total: updatedPlayer.colonyShips.total,
      ready: updatedPlayer.colonyShips.total,
    };
  }

  return {
    updatedPlayer,
    bankrupt,
    abandonedSectorIds,
    eliminated,
    bankruptcyLog: log,
  };
}

export interface ActionCostForecast {
  currentDiscs: number;
  currentUpkeep: number;
  after1Action: {
    discsRemaining: number;
    upkeep: number;
    costIncrease: number; // additional credits owed in upkeep
    projectedNetMoneyDelta: number;
    canAfford: boolean;
  };
  after2Actions: {
    discsRemaining: number;
    upkeep: number;
    costIncrease: number;
    projectedNetMoneyDelta: number;
    canAfford: boolean;
  };
  after3Actions: {
    discsRemaining: number;
    upkeep: number;
    costIncrease: number;
    projectedNetMoneyDelta: number;
    canAfford: boolean;
  };
}

export function calculateActionCostForecast(player: PlayerState): ActionCostForecast {
  const currentDiscs = player.influenceTrack.discsOnTrack;
  const currentUpkeep = getUpkeepForDiscs(currentDiscs);
  const moneyIncome = getIncomeForTrack(player.population.money.cubesOnBoard);

  const getStep = (stepCount: number) => {
    const discsRemaining = Math.max(0, currentDiscs - stepCount);
    const upkeep = getUpkeepForDiscs(discsRemaining);
    const costIncrease = Math.max(0, upkeep - currentUpkeep);
    const projectedNetMoneyDelta = moneyIncome - upkeep;
    const projectedTotalMoney = player.resources.money + projectedNetMoneyDelta;
    return {
      discsRemaining,
      upkeep,
      costIncrease,
      projectedNetMoneyDelta,
      canAfford: projectedTotalMoney >= 0,
    };
  };

  return {
    currentDiscs,
    currentUpkeep,
    after1Action: getStep(1),
    after2Actions: getStep(2),
    after3Actions: getStep(3),
  };
}

export const TECH_ROW_VP_TABLE: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 1,
  5: 2,
  6: 3,
  7: 5,
};

export const TECH_ROW_SLOT_COUNT = 7;

export interface PlayerTechRows {
  military: {
    techs: import('../types/tech').Technology[];
    count: number;
    nextDiscount: number;
    victoryPoints: number;
  };
  grid: {
    techs: import('../types/tech').Technology[];
    count: number;
    nextDiscount: number;
    victoryPoints: number;
  };
  nano: {
    techs: import('../types/tech').Technology[];
    count: number;
    nextDiscount: number;
    victoryPoints: number;
  };
  rare: import('../types/tech').Technology[];
}

export function getPlayerTechRows(player: PlayerState): PlayerTechRows {
  const militaryTechs: import('../types/tech').Technology[] = [];
  const gridTechs: import('../types/tech').Technology[] = [];
  const nanoTechs: import('../types/tech').Technology[] = [];
  const rareTechs: import('../types/tech').Technology[] = [];

  for (const tech of player.techTrack.researched) {
    const track = tech.placedTrack || (tech.category !== 'rare' ? tech.category : null);
    if (track === 'military') {
      militaryTechs.push(tech);
    } else if (track === 'grid') {
      gridTechs.push(tech);
    } else if (track === 'nano') {
      nanoTechs.push(tech);
    } else {
      rareTechs.push(tech);
    }
  }

  const getRowStats = (techs: import('../types/tech').Technology[]) => {
    const count = techs.length;
    const nextDiscount = TECH_TRACK_DISCOUNT_TABLE[Math.min(7, count)] ?? 0;
    const victoryPoints = TECH_ROW_VP_TABLE[Math.min(7, count)] || (count >= 7 ? 5 : 0);
    return { techs, count, nextDiscount, victoryPoints };
  };

  return {
    military: getRowStats(militaryTechs),
    grid: getRowStats(gridTechs),
    nano: getRowStats(nanoTechs),
    rare: rareTechs,
  };
}

export interface IncomeForecast {
  currentCubes: number;
  currentIncome: number;
  next1Cube: {
    cubesRemaining: number;
    income: number;
    delta: number;
  };
  next2Cubes: {
    cubesRemaining: number;
    income: number;
    delta: number;
  };
}

export function getIncomeForecast(cubesOnBoard: number): IncomeForecast {
  const currentIncome = getIncomeForTrack(cubesOnBoard);
  const c1 = Math.max(0, cubesOnBoard - 1);
  const inc1 = getIncomeForTrack(c1);
  const c2 = Math.max(0, cubesOnBoard - 2);
  const inc2 = getIncomeForTrack(c2);

  return {
    currentCubes: cubesOnBoard,
    currentIncome,
    next1Cube: {
      cubesRemaining: c1,
      income: inc1,
      delta: inc1 - currentIncome,
    },
    next2Cubes: {
      cubesRemaining: c2,
      income: inc2,
      delta: inc2 - currentIncome,
    },
  };
}
