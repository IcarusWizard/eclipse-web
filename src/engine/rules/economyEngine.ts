/**
 * Economy, Income, Upkeep and Bankruptcy Rules for Eclipse: Second Dawn
 */

import { PlayerState } from '../types/player';

export const INCOME_TABLE = [
  32, // 0 cubes on board (12 colonized)
  28, // 1
  24, // 2
  21, // 3
  18, // 4
  15, // 5
  12, // 6
  10, // 7
  8,  // 8
  6,  // 9
  4,  // 10
  3,  // 11
  2,  // 12 cubes on board (0 colonized)
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
  5: 9,  // 8 discs used -> 9 upkeep
  4: 12, // 9 discs used -> 12 upkeep
  3: 15, // 10 discs used -> 15 upkeep
  2: 18, // 11 discs used -> 18 upkeep
  1: 21, // 12 discs used -> 21 upkeep
  0: 25, // 13 discs used -> 25 upkeep
};

export function getIncomeForTrack(cubesOnBoard: number): number {
  const index = Math.max(0, Math.min(12, cubesOnBoard));
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

export function applyUpkeepPhase(player: PlayerState): {
  updatedPlayer: PlayerState;
  bankrupt: boolean;
} {
  const summary = calculatePlayerRoundSummary(player);
  let newMoney = summary.projectedMoney;
  let newScience = player.resources.science + summary.income.science;
  let newMaterials = player.resources.materials + summary.income.materials;
  let bankrupt = false;

  if (newMoney < 0) {
    // Attempt automated trading at 2:1 ratio to avoid bankruptcy
    const deficit = Math.abs(newMoney);
    const tradeRatio = player.faction.tradeRatio || 2;
    const matsNeeded = deficit * tradeRatio;

    if (newMaterials >= matsNeeded) {
      newMaterials -= matsNeeded;
      newMoney = 0;
    } else {
      const remainingDeficit = deficit - Math.floor(newMaterials / tradeRatio);
      newMoney += Math.floor(newMaterials / tradeRatio);
      newMaterials = newMaterials % tradeRatio;

      const sciNeeded = remainingDeficit * tradeRatio;
      if (newScience >= sciNeeded) {
        newScience -= sciNeeded;
        newMoney = 0;
      } else {
        bankrupt = true;
      }
    }
  }

  // Refresh colony ships in Upkeep phase
  const refreshedColonyShips = {
    total: player.colonyShips.total,
    ready: player.colonyShips.total,
  };

  const updatedPlayer: PlayerState = {
    ...player,
    resources: {
      money: Math.max(0, newMoney),
      science: newScience,
      materials: newMaterials,
    },
    colonyShips: refreshedColonyShips,
  };

  return { updatedPlayer, bankrupt };
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
    const nextDiscount = Math.min(6, count);
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
