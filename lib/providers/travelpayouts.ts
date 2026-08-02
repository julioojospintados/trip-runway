import { withRetry } from "@/lib/retry";
import {
  ProviderError,
  type NormalizedFlightPrice,
  type RouteQuery,
} from "./types";

const TRAVELPAYOUTS_BASE_URL = "https://api.travelpayouts.com";

/**
 * Costruisce il deeplink affiliato Aviasales. È la fonte di monetizzazione del
 * prodotto: il marker identifica l'account partner e va sempre incluso.
 * Vedi .claude/agents/monetization-marketing.md, regola 1.
 *
 * Funzione pura e senza rete, così è testabile senza chiamare il provider.
 */
export function buildAffiliateDeeplink(
  query: RouteQuery,
  marker: string
): string {
  const day = "01";
  const month = String(query.departureMonth).padStart(2, "0");
  // Formato Aviasales: ORIGINE + GGMM + DESTINAZIONE + numero passeggeri.
  const searchSegment = `${query.originIata}${day}${month}${query.destinationIata}1`;

  const url = new URL(`https://www.aviasales.com/search/${searchSegment}`);
  url.searchParams.set("marker", marker);
  return url.toString();
}

interface TravelpayoutsResponse {
  success?: boolean;
  data?: Array<{ price?: number }>;
}

/**
 * Unico provider di prezzi voli. È gratuito (nessuna soglia di traffico per
 * questo endpoint dati aggregati) e allineato alla monetizzazione: stesso
 * account, stesso token, deeplink affiliato incluso in ogni risposta.
 */
export async function fetchTravelpayoutsPrice(
  query: RouteQuery
): Promise<NormalizedFlightPrice> {
  const token = process.env.TRAVELPAYOUTS_API_TOKEN;
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  if (!token || !marker) {
    throw new ProviderError(
      "travelpayouts",
      "TRAVELPAYOUTS_API_TOKEN/MARKER non configurati"
    );
  }

  const departureMonth = `${query.departureYear}-${String(
    query.departureMonth
  ).padStart(2, "0")}-01`;

  const url = new URL(`${TRAVELPAYOUTS_BASE_URL}/aviasales/v3/prices_for_dates`);
  url.searchParams.set("origin", query.originIata);
  url.searchParams.set("destination", query.destinationIata);
  url.searchParams.set("departure_at", departureMonth);
  url.searchParams.set("currency", "eur");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("limit", "10");
  url.searchParams.set("one_way", "true");

  const response = await withRetry(async () => {
    const res = await fetch(url, { headers: { "X-Access-Token": token } });
    if (!res.ok) {
      throw new ProviderError(
        "travelpayouts",
        `Ricerca fallita: ${res.status} ${res.statusText}`
      );
    }
    return res;
  });

  const body = (await response.json()) as TravelpayoutsResponse;
  const prices = (body.data ?? [])
    .map((entry) => Number(entry.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    throw new ProviderError(
      "travelpayouts",
      "Nessuna offerta valida per la rotta"
    );
  }

  return {
    price: Math.min(...prices),
    currency: "EUR",
    source: "travelpayouts",
    deeplink: buildAffiliateDeeplink(query, marker),
  };
}
