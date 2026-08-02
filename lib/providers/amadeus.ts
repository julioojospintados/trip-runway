import { withRetry } from "@/lib/retry";
import {
  ProviderError,
  type NormalizedFlightPrice,
  type RouteQuery,
} from "./types";

const AMADEUS_BASE_URL = "https://test.api.amadeus.com";

interface CachedToken {
  accessToken: string;
  /** Epoch ms in cui il token smette di essere considerato valido. */
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Amadeus usa OAuth2 client_credentials: il token scade (~30 min) e va rinnovato.
 * Lo teniamo in cache di modulo per non bruciare una chiamata di auth per ogni rotta
 * del batch notturno.
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new ProviderError("amadeus", "AMADEUS_API_KEY/SECRET non configurati");
  }

  const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: apiKey,
      client_secret: apiSecret,
    }),
  });

  if (!response.ok) {
    throw new ProviderError(
      "amadeus",
      `Auth fallita: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    // 60s di margine per non usare un token che scade a metà batch.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

/** Solo per i test: azzera la cache del token tra un caso e l'altro. */
export function resetAmadeusTokenCache(): void {
  cachedToken = null;
}

interface AmadeusOfferResponse {
  data?: Array<{
    price?: { total?: string; currency?: string };
  }>;
}

/**
 * Cerca l'offerta più economica per una rotta in un dato mese.
 * Amadeus non espone una ricerca "per mese": interroghiamo il giorno 1 come
 * campione rappresentativo, coerente col fatto che il prodotto ragiona su
 * finestre mensili e non su date esatte.
 */
export async function fetchAmadeusPrice(
  query: RouteQuery
): Promise<NormalizedFlightPrice> {
  const token = await getAccessToken();
  const departureDate = `${query.departureYear}-${String(
    query.departureMonth
  ).padStart(2, "0")}-01`;

  const url = new URL(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers`);
  url.searchParams.set("originLocationCode", query.originIata);
  url.searchParams.set("destinationLocationCode", query.destinationIata);
  url.searchParams.set("departureDate", departureDate);
  url.searchParams.set("adults", "1");
  url.searchParams.set("currencyCode", "EUR");
  url.searchParams.set("max", "5");

  const response = await withRetry(async () => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new ProviderError(
        "amadeus",
        `Ricerca fallita: ${res.status} ${res.statusText}`
      );
    }
    return res;
  });

  const body = (await response.json()) as AmadeusOfferResponse;
  const offers = body.data ?? [];

  const prices = offers
    .map((offer) => Number(offer.price?.total))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    throw new ProviderError("amadeus", "Nessuna offerta valida per la rotta");
  }

  return {
    price: Math.min(...prices),
    currency: offers[0]?.price?.currency ?? "EUR",
    source: "amadeus",
  };
}
