import type { Metadata } from "next";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { RouteCard } from "@/components/route-card";
import { SaveRouteForm } from "@/components/save-route-form";
import { Button } from "@/components/ui/button";
import { getOrCreateCurrentUser, FREE_TIER_ROUTE_LIMIT } from "@/lib/auth";
import { calculateMaxDays } from "@/lib/max-days";
import { prisma } from "@/lib/prisma";
import { buildAffiliateDeeplink } from "@/lib/providers/travelpayouts";
import type { RiskLevel } from "@/components/risk-badge";

export const metadata: Metadata = {
  title: "Le tue rotte",
  description:
    "Le rotte che stai monitorando, ordinate per giorni di permanenza sostenibili con il tuo budget.",
  // Area privata: non deve finire nell'indice.
  robots: { index: false, follow: false },
};

// I prezzi cambiano a ogni run del cronjob: niente cache statica.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getOrCreateCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Le tue rotte</h1>
        <p className="mt-2 text-muted-foreground">
          Accedi per salvare le rotte e vedere quanti giorni copre il tuo budget.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <Button>Accedi</Button>
          </SignInButton>
        </div>
      </main>
    );
  }

  const [savedRoutes, destinations] = await Promise.all([
    prisma.savedRoute.findMany({
      where: { userId: user.id },
      include: {
        trackedRoute: {
          include: {
            destination: {
              include: { seasonality: true, advisory: true },
            },
          },
        },
      },
    }),
    prisma.destination.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Il marker resta server-side; se manca, il CTA affiliato semplicemente non compare.
  const affiliateMarker = process.env.TRAVELPAYOUTS_MARKER;

  // L'ordinamento per giorni sostenibili è il cuore del prodotto: chi ha il
  // margine più ampio va in cima. Le rotte col prezzo ancora ignoto vanno in fondo.
  const rows = savedRoutes
    .map((saved) => {
      const destination = saved.trackedRoute.destination;
      const flightPrice = saved.trackedRoute.lastPrice
        ? Number(saved.trackedRoute.lastPrice)
        : null;
      const dailyCostGround = Number(destination.dailyCostGround);
      const fixedExtras = Number(destination.fixedExtras);
      const totalBudget = Number(saved.totalBudget);

      const maxDays =
        flightPrice === null
          ? null
          : calculateMaxDays({
              totalBudget,
              flightPrice,
              fixedExtras,
              dailyCostGround,
            });

      const seasonality = destination.seasonality.find(
        (entry) => entry.month === saved.trackedRoute.departureMonth
      );

      return {
        maxDays,
        props: {
          savedRouteId: saved.id,
          destinationName: destination.name,
          originIata: saved.trackedRoute.originIata,
          departureYear: saved.trackedRoute.departureYear,
          departureMonth: saved.trackedRoute.departureMonth,
          totalBudget,
          flightPrice,
          fixedExtras,
          dailyCostGround,
          seasonality: seasonality
            ? {
                level: seasonality.riskLevel as RiskLevel,
                label: seasonality.label,
                source: seasonality.source,
                updatedAt: seasonality.updatedAt,
              }
            : null,
          advisory: destination.advisory
            ? {
                level: destination.advisory.level,
                summary: destination.advisory.summary,
                source: destination.advisory.source,
                sourceUrl: destination.advisory.sourceUrl,
                updatedAt: destination.advisory.updatedAt,
              }
            : null,
          bookingUrl: affiliateMarker
            ? buildAffiliateDeeplink(
                {
                  originIata: saved.trackedRoute.originIata,
                  destinationIata: destination.iataCity,
                  departureYear: saved.trackedRoute.departureYear,
                  departureMonth: saved.trackedRoute.departureMonth,
                },
                affiliateMarker
              )
            : null,
        },
      };
    })
    .sort((a, b) => (b.maxDays ?? -1) - (a.maxDays ?? -1));

  const atLimit =
    user.tier === "FREE" && savedRoutes.length >= FREE_TIER_ROUTE_LIMIT;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Le tue rotte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordinate per giorni sostenibili con il budget che hai indicato.
          </p>
        </div>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>

      <section aria-labelledby="nuova-rotta" className="mt-10">
        <h2 id="nuova-rotta" className="text-lg font-medium">
          Aggiungi una rotta
        </h2>
        {atLimit ? (
          <p className="mt-2 rounded-md border bg-muted p-4 text-sm">
            Hai raggiunto le {FREE_TIER_ROUTE_LIMIT} rotte del piano gratuito.
            Rimuovine una per aggiungerne un&apos;altra.
          </p>
        ) : (
          <div className="mt-4">
            <SaveRouteForm
              destinations={destinations}
              years={[2026, 2027]}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="rotte-salvate" className="mt-12">
        <h2 id="rotte-salvate" className="text-lg font-medium">
          Rotte monitorate ({savedRoutes.length})
        </h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Non hai ancora salvato rotte.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {rows.map((row) => (
              <li key={row.props.savedRouteId}>
                <RouteCard {...row.props} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
