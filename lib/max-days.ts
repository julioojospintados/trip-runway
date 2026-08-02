export interface MaxDaysInput {
  totalBudget: number;
  flightPrice: number;
  fixedExtras: number;
  dailyCostGround: number;
}

/**
 * MaxDays = Floor((TotalBudget - FlightPrice - FixedExtras) / DailyCostGround)
 * Vedi project-brief.md, Sezione 4.2.
 */
export function calculateMaxDays({
  totalBudget,
  flightPrice,
  fixedExtras,
  dailyCostGround,
}: MaxDaysInput): number {
  if (dailyCostGround <= 0) {
    throw new Error("dailyCostGround deve essere maggiore di zero");
  }

  const remainingBudget = totalBudget - flightPrice - fixedExtras;
  if (remainingBudget <= 0) {
    return 0;
  }

  return Math.floor(remainingBudget / dailyCostGround);
}
