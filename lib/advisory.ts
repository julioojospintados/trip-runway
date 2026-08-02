import type { RiskLevel } from "@/components/risk-badge";

export const MONTH_NAMES = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

export function formatMonth(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

/**
 * Traduce il livello numerico della fonte governativa (scala 0-4 tipo
 * Farnesina/State Dept) nei tre livelli mostrati in UI.
 *
 * Non reinventiamo la classificazione: manteniamo il numero originale nel DB e
 * qui decidiamo solo come rappresentarlo. Vedi .claude/agents/data-integration.md,
 * regola 2 ("Usa la classificazione originale della fonte").
 */
export function advisoryLevelToRisk(level: number): RiskLevel {
  if (level >= 3) return "HIGH";
  if (level >= 2) return "MODERATE";
  return "LOW";
}
