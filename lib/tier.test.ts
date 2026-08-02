import { describe, expect, it } from "vitest";
import { FREE_TIER_ROUTE_LIMIT } from "./auth";
import { canSaveAnotherRoute } from "./tier";

describe("canSaveAnotherRoute", () => {
  it("permette al piano gratuito di salvare sotto il limite", () => {
    expect(canSaveAnotherRoute("FREE", FREE_TIER_ROUTE_LIMIT - 1)).toBe(true);
  });

  it("blocca il piano gratuito esattamente al limite", () => {
    expect(canSaveAnotherRoute("FREE", FREE_TIER_ROUTE_LIMIT)).toBe(false);
  });

  it("blocca il piano gratuito oltre il limite", () => {
    expect(canSaveAnotherRoute("FREE", FREE_TIER_ROUTE_LIMIT + 5)).toBe(false);
  });

  it("non pone limiti al piano PRO", () => {
    expect(canSaveAnotherRoute("PRO", 500)).toBe(true);
  });
});
