import { FREE_TIER_ROUTE_LIMIT } from "@/lib/auth";

export type Tier = "FREE" | "PRO";

/**
 * Il piano gratuito deve far percepire il valore ma scontrarsi con un limite
 * operativo. Vedi .claude/agents/monetization-marketing.md, regola 2.
 *
 * Funzione pura: la regola di business è testabile senza DB né sessione.
 */
export function canSaveAnotherRoute(
  tier: Tier,
  currentRouteCount: number
): boolean {
  if (tier === "PRO") return true;
  return currentRouteCount < FREE_TIER_ROUTE_LIMIT;
}
