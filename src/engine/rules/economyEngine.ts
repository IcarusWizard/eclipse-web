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
  12: 1,
  11: 2,
  10: 3,
  9: 5,
  8: 7,
  7: 9,
  6: 12,
  5: 15,
  4: 18,
  3: 21,
  2: 25,
  1: 30,
  0: 35,
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
