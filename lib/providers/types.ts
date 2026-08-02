/**
 * Formato interno normalizzato: Amadeus e Travelpayouts rispondono con schemi
 * diversi, ma tutto ciò che entra nel DB passa da qui.
 * Vedi .claude/agents/data-integration.md, regola 2 (Normalizzazione & Deduplicazione).
 */
export interface NormalizedFlightPrice {
  /** Prezzo più basso trovato per la rotta, nella valuta indicata. */
  price: number;
  currency: string;
  source: FlightPriceSource;
  /** Deeplink affiliato, presente solo per Travelpayouts. */
  deeplink?: string;
}

export type FlightPriceSource = "amadeus" | "travelpayouts";

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
