import { prisma } from "@/lib/prisma";
import { fetchAmadeusPrice } from "@/lib/providers/amadeus";
import { fetchTravelpayoutsPrice } from "@/lib/providers/travelpayouts";
import type { NormalizedFlightPrice, RouteQuery } from "@/lib/providers/types";

export interface RouteUpdateOutcome {
  routeId: string;
  status: "updated" | "failed";
  source?: NormalizedFlightPrice["source"];
  price?: number;
  error?: string;
}

export interface UpdatePricesReport {
  total: number;
  updated: number;
  failed: number;
  outcomes: RouteUpdateOutcome[];
}

type PriceFetcher = (query: RouteQuery) => Promise<NormalizedFlightPrice>;

export interface UpdatePricesDeps {
  /** Provider primario (Amadeus) e secondario (Travelpayouts), iniettabili nei test. */
  fetchPrimary?: PriceFetcher;
  fetchSecondary?: PriceFetcher;
}

/**
 * Prova il provider primario e, se fallisce, ricade sul secondario.
 * Restituisce null solo se entrambi falliscono.
 */
async function fetchWithFallback(
  query: RouteQuery,
  fetchPrimary: PriceFetcher,
  fetchSecondary: PriceFetcher
): Promise<{ price: NormalizedFlightPrice | null; errors: string[] }> {
  const errors: string[] = [];

  try {
    return { price: await fetchPrimary(query), errors };
  } catch (error) {
    errors.push(`amadeus: ${(error as Error).message}`);
  }

  try {
    return { price: await fetchSecondary(query), errors };
  } catch (error) {
    errors.push(`travelpayouts: ${(error as Error).message}`);
  }

  return { price: null, errors };
}

/**
 * Cronjob notturno. Itera sulle rotte UNICHE (`TrackedRoute`), non sugli utenti:
 * una sola chiamata API per rotta aggiorna il prezzo per tutti gli utenti che
 * l'hanno salvata. È la difesa principale contro l'esaurimento della quota
 * Amadeus (~2.000 chiamate/mese). Vedi project-brief.md, Sezione 4.1.
 *
 * Il fallimento di una rotta non interrompe il batch: ogni esito finisce nel
 * report, così si sa quali rotte non si sono aggiornate e perché.
 */
export async function updateTrackedRoutePrices({
  fetchPrimary = fetchAmadeusPrice,
  fetchSecondary = fetchTravelpayoutsPrice,
}: UpdatePricesDeps = {}): Promise<UpdatePricesReport> {
  const routes = await prisma.trackedRoute.findMany({
    include: { destination: { select: { iataCity: true } } },
  });

  const outcomes: RouteUpdateOutcome[] = [];

  for (const route of routes) {
    const query: RouteQuery = {
      originIata: route.originIata,
      destinationIata: route.destination.iataCity,
      departureYear: route.departureYear,
      departureMonth: route.departureMonth,
    };

    const { price, errors } = await fetchWithFallback(
      query,
      fetchPrimary,
      fetchSecondary
    );

    if (!price) {
      outcomes.push({
        routeId: route.id,
        status: "failed",
        error: errors.join(" | "),
      });
      continue;
    }

    await prisma.trackedRoute.update({
      where: { id: route.id },
      data: {
        lastPrice: price.price,
        priceSource: price.source,
        lastCheckedAt: new Date(),
      },
    });

    outcomes.push({
      routeId: route.id,
      status: "updated",
      source: price.source,
      price: price.price,
    });
  }

  const updated = outcomes.filter((o) => o.status === "updated").length;

  return {
    total: routes.length,
    updated,
    failed: outcomes.length - updated,
    outcomes,
  };
}
