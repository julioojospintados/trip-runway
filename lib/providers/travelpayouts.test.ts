import { describe, expect, it } from "vitest";
import { buildAffiliateDeeplink } from "./travelpayouts";

describe("buildAffiliateDeeplink", () => {
  const query = {
    originIata: "MXP",
    destinationIata: "BKK",
    departureYear: 2026,
    departureMonth: 9,
  };

  it("include sempre il marker affiliato", () => {
    const url = new URL(buildAffiliateDeeplink(query, "12345"));
    expect(url.searchParams.get("marker")).toBe("12345");
  });

  it("compone il segmento di ricerca nel formato Aviasales", () => {
    const url = new URL(buildAffiliateDeeplink(query, "12345"));
    // ORIGINE + GGMM + DESTINAZIONE + passeggeri
    expect(url.pathname).toBe("/search/MXP0109BKK1");
  });

  it("normalizza i mesi a due cifre", () => {
    const url = new URL(
      buildAffiliateDeeplink({ ...query, departureMonth: 10 }, "12345")
    );
    expect(url.pathname).toBe("/search/MXP0110BKK1");
  });
});
