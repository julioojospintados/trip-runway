import { prisma } from "@/lib/prisma";
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
  /** Iniettabile nei test. */
  fetchPrice?: PriceFetcher;
}

/**
 * Cronjob notturno. Itera sulle rotte UNICHE (`TrackedRoute`), non sugli utenti:
 * una sola chiamata API per rotta aggiorna il prezzo per tutti gli utenti che
 * l'hanno salvata. Vedi project-brief.md, Sezione 4.1.
 *
 * Il fallimento di una rotta non interrompe il batch: ogni esito finisce nel
 * report, così si sa quali rotte non si sono aggiornate e perché.
 */
export async function updateTrackedRoutePrices({
  fetchPrice = fetchTravelpayoutsPrice,
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

    try {
      const price = await fetchPrice(query);

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
    } catch (error) {
      outcomes.push({
        routeId: route.id,
        status: "failed",
        error: (error as Error).message,
      });
    }
  }

  const updated = outcomes.filter((o) => o.status === "updated").length;

  return {
    total: routes.length,
    updated,
    failed: outcomes.length - updated,
    outcomes,
  };
}
