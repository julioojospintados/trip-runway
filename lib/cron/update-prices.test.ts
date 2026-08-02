import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trackedRoute: {
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

const { updateTrackedRoutePrices } = await import("./update-prices");

function route(id: string, destinationIata: string) {
  return {
    id,
    originIata: "MXP",
    destinationId: `dest-${destinationIata}`,
    departureYear: 2026,
    departureMonth: 9,
    destination: { iataCity: destinationIata },
  };
}

describe("updateTrackedRoutePrices", () => {
  beforeEach(() => {
    findMany.mockReset();
    update.mockReset();
    update.mockResolvedValue({});
  });

  it("aggiorna il prezzo quando il provider risponde", async () => {
    findMany.mockResolvedValue([route("r1", "BKK")]);
    const fetchPrice = vi.fn().mockResolvedValue({
      price: 480,
      currency: "EUR",
      source: "travelpayouts",
      deeplink: "https://example.test",
    });

    const report = await updateTrackedRoutePrices({ fetchPrice });

    expect(report).toMatchObject({ total: 1, updated: 1, failed: 0 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({
          lastPrice: 480,
          priceSource: "travelpayouts",
        }),
      })
    );
  });

  it("registra la rotta come fallita se il provider fallisce", async () => {
    findMany.mockResolvedValue([route("r1", "BKK")]);

    const report = await updateTrackedRoutePrices({
      fetchPrice: vi.fn().mockRejectedValue(new Error("quota esaurita")),
    });

    expect(report).toMatchObject({ total: 1, updated: 0, failed: 1 });
    expect(report.outcomes[0].error).toContain("quota esaurita");
    expect(update).not.toHaveBeenCalled();
  });

  it("una rotta fallita non interrompe le altre del batch", async () => {
    findMany.mockResolvedValue([
      route("r1", "BKK"),
      route("r2", "SGN"),
      route("r3", "DPS"),
    ]);

    const fetchPrice = vi.fn(async (query: { destinationIata: string }) => {
      if (query.destinationIata === "SGN") throw new Error("rotta rotta");
      return {
        price: 500,
        currency: "EUR",
        source: "travelpayouts" as const,
        deeplink: "https://example.test",
      };
    });

    const report = await updateTrackedRoutePrices({ fetchPrice });

    expect(report).toMatchObject({ total: 3, updated: 2, failed: 1 });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("interroga una sola volta per rotta unica, non per utente", async () => {
    // Tre utenti che salvano la stessa rotta producono una sola TrackedRoute:
    // il batch riceve una riga e fa una sola chiamata.
    findMany.mockResolvedValue([route("r1", "BKK")]);
    const fetchPrice = vi.fn().mockResolvedValue({
      price: 480,
      currency: "EUR",
      source: "travelpayouts",
      deeplink: "https://example.test",
    });

    await updateTrackedRoutePrices({ fetchPrice });

    expect(fetchPrice).toHaveBeenCalledTimes(1);
  });
});
