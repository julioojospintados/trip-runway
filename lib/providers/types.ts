/**
 * Formato interno normalizzato in cui atterra tutto ciò che entra nel DB.
 * Vedi .claude/agents/data-integration.md, regola 2 (Normalizzazione & Deduplicazione).
 */
export interface NormalizedFlightPrice {
  /** Prezzo più basso trovato per la rotta, nella valuta indicata. */
  price: number;
  currency: string;
  source: FlightPriceSource;
  /** Deeplink affiliato per la monetizzazione. */
  deeplink: string;
}

/**
 * Unico provider oggi (Travelpayouts). Amadeus è stato rimosso: il portale
 * self-service è stato chiuso da Amadeus a luglio 2026 — vedi project-brief.md.
 * Tipo mantenuto come union per non dover toccare tutta la catena se in futuro
 * si aggiunge un secondo provider (es. Duffel).
 */
export type FlightPriceSource = "travelpayouts";

export interface RouteQuery {
  originIata: string;
  destinationIata: string;
  departureYear: number;
  /** 1-12 */
  departureMonth: number;
}

/** Un provider fallisce senza far cadere l'intero batch: vedi lib/cron/update-prices.ts. */
export class ProviderError extends Error {
  constructor(
    public readonly provider: FlightPriceSource,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
