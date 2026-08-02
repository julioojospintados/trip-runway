import { describe, expect, it } from "vitest";
import { calculateMaxDays } from "./max-days";

describe("calculateMaxDays", () => {
  it("calcola i giorni arrotondando per difetto", () => {
    expect(
      calculateMaxDays({
        totalBudget: 1000,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: 35,
      })
    ).toBe(19); // (1000 - 300 - 20) / 35 = 19.43 -> 19
  });

  it("restituisce 0 se il budget non copre nemmeno volo ed extra", () => {
    expect(
      calculateMaxDays({
        totalBudget: 200,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: 35,
      })
    ).toBe(0);
  });

  it("restituisce 0 se il budget residuo è esattamente zero", () => {
    expect(
      calculateMaxDays({
        totalBudget: 320,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: 35,
      })
    ).toBe(0);
  });

  it("lancia un errore se dailyCostGround è zero", () => {
    expect(() =>
      calculateMaxDays({
        totalBudget: 1000,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: 0,
      })
    ).toThrow();
  });

  it("lancia un errore se dailyCostGround è negativo", () => {
    expect(() =>
      calculateMaxDays({
        totalBudget: 1000,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: -10,
      })
    ).toThrow();
  });

  it("gestisce fixedExtras a zero", () => {
    expect(
      calculateMaxDays({
        totalBudget: 700,
        flightPrice: 300,
        fixedExtras: 0,
        dailyCostGround: 40,
      })
    ).toBe(10); // (700 - 300) / 40 = 10
  });

  it("gestisce un budget molto più alto del necessario", () => {
    expect(
      calculateMaxDays({
        totalBudget: 100000,
        flightPrice: 300,
        fixedExtras: 20,
        dailyCostGround: 35,
      })
    ).toBe(2848);
  });
});
