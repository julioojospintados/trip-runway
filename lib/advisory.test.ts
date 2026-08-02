import { describe, expect, it } from "vitest";
import { advisoryLevelToRisk, formatMonth } from "./advisory";

describe("advisoryLevelToRisk", () => {
  it("tratta i livelli 0 e 1 come rischio basso", () => {
    expect(advisoryLevelToRisk(0)).toBe("LOW");
    expect(advisoryLevelToRisk(1)).toBe("LOW");
  });

  it("tratta il livello 2 come rischio moderato", () => {
    expect(advisoryLevelToRisk(2)).toBe("MODERATE");
  });

  it("tratta i livelli 3 e 4 come rischio alto", () => {
    expect(advisoryLevelToRisk(3)).toBe("HIGH");
    expect(advisoryLevelToRisk(4)).toBe("HIGH");
  });

  it("non declassa livelli oltre la scala nota", () => {
    // Se una fonte introducesse un livello 5, deve restare "alto", non ricadere in "basso".
    expect(advisoryLevelToRisk(5)).toBe("HIGH");
  });
});

describe("formatMonth", () => {
  it("converte i numeri nei nomi dei mesi in italiano", () => {
    expect(formatMonth(1)).toBe("gennaio");
    expect(formatMonth(9)).toBe("settembre");
    expect(formatMonth(12)).toBe("dicembre");
  });
});
