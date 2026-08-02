import { CalendarDays, PlaneTakeoff, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, type RiskLevel } from "@/components/risk-badge";
import { advisoryLevelToRisk, formatMonth } from "@/lib/advisory";
import { calculateMaxDays } from "@/lib/max-days";
import { DeleteRouteButton } from "@/components/delete-route-button";

export interface RouteCardProps {
  savedRouteId: string;
  destinationName: string;
  originIata: string;
  departureYear: number;
  departureMonth: number;
  totalBudget: number;
  flightPrice: number | null;
  fixedExtras: number;
  dailyCostGround: number;
  seasonality?: {
    level: RiskLevel;
    label: string;
    source: string;
    updatedAt: Date;
  } | null;
  advisory?: {
    level: number;
    summary: string;
    source: string;
    sourceUrl: string;
    updatedAt: Date;
  } | null;
}

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function RouteCard({
  savedRouteId,
  destinationName,
  originIata,
  departureYear,
  departureMonth,
  totalBudget,
  flightPrice,
  fixedExtras,
  dailyCostGround,
  seasonality,
  advisory,
}: RouteCardProps) {
  const maxDays =
    flightPrice === null
      ? null
      : calculateMaxDays({
          totalBudget,
          flightPrice,
          fixedExtras,
          dailyCostGround,
        });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{destinationName}</CardTitle>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PlaneTakeoff aria-hidden="true" className="size-4" />
              da {originIata}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatMonth(departureMonth)} {departureYear}
            </span>
            <span className="flex items-center gap-1.5">
              <Wallet aria-hidden="true" className="size-4" />
              budget {euro.format(totalBudget)}
            </span>
          </p>
        </div>
        <DeleteRouteButton savedRouteId={savedRouteId} label={destinationName} />
      </CardHeader>

      <CardContent className="space-y-4">
        {maxDays === null ? (
          <p className="text-sm text-muted-foreground">
            Prezzo del volo non ancora disponibile: verrà aggiornato al prossimo
            controllo notturno.
          </p>
        ) : (
          <p className="text-sm">
            {/* Il numero è il dato centrale del prodotto: leggibile anche fuori contesto. */}
            <span className="text-3xl font-semibold tabular-nums">
              {maxDays}
            </span>{" "}
            {maxDays === 1 ? "giorno" : "giorni"} sostenibili
            <span className="mt-1 block text-muted-foreground">
              Volo {euro.format(flightPrice!)} + extra{" "}
              {euro.format(fixedExtras)}, poi {euro.format(dailyCostGround)} al
              giorno sul posto.
            </span>
          </p>
        )}

        {seasonality && (
          <RiskBadge
            kind="season"
            level={seasonality.level}
            message={seasonality.label}
            source={seasonality.source}
            updatedAt={seasonality.updatedAt}
          />
        )}

        {advisory && (
          <RiskBadge
            kind="security"
            level={advisoryLevelToRisk(advisory.level)}
            message={advisory.summary}
            source={advisory.source}
            sourceUrl={advisory.sourceUrl}
            updatedAt={advisory.updatedAt}
          />
        )}
      </CardContent>
    </Card>
  );
}
