"use client";

import { useId, useState, useTransition } from "react";
import { saveRoute } from "@/app/actions/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMonth } from "@/lib/advisory";

interface DestinationOption {
  id: string;
  name: string;
}

interface SaveRouteFormProps {
  destinations: DestinationOption[];
  /** Anni proposti nel selettore; il primo è il default. */
  years: number[];
}

const FIELD_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring";

export function SaveRouteForm({ destinations, years }: SaveRouteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const originId = useId();
  const destinationId = useId();
  const monthId = useId();
  const yearId = useId();
  const budgetId = useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await saveRoute({
        originIata: String(data.get("originIata") ?? ""),
        destinationId: String(data.get("destinationId") ?? ""),
        departureYear: Number(data.get("departureYear")),
        departureMonth: Number(data.get("departureMonth")),
        totalBudget: Number(data.get("totalBudget")),
      });

      if (result.ok) {
        setMessage({ type: "success", text: "Rotta salvata." });
        form.reset();
      } else {
        setMessage({
          type: "error",
          text: result.error ?? "Non è stato possibile salvare la rotta.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={originId} className="text-sm font-medium">
            Aeroporto di partenza
          </label>
          <Input
            id={originId}
            name="originIata"
            required
            maxLength={3}
            placeholder="MXP"
            autoComplete="off"
            // Il formato atteso è esplicito, non affidato al solo placeholder
            // (che sparisce appena si digita ed è invisibile agli screen reader).
            aria-describedby={`${originId}-hint`}
            className="uppercase"
          />
          <p id={`${originId}-hint`} className="text-xs text-muted-foreground">
            Codice IATA di 3 lettere, es. MXP per Milano Malpensa.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={destinationId} className="text-sm font-medium">
            Destinazione
          </label>
          <select
            id={destinationId}
            name="destinationId"
            required
            className={FIELD_CLASS}
            defaultValue=""
          >
            <option value="" disabled>
              Scegli una destinazione
            </option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={monthId} className="text-sm font-medium">
            Mese di partenza
          </label>
          <select
            id={monthId}
            name="departureMonth"
            required
            className={FIELD_CLASS}
            defaultValue="9"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={yearId} className="text-sm font-medium">
            Anno di partenza
          </label>
          <select
            id={yearId}
            name="departureYear"
            required
            className={FIELD_CLASS}
            defaultValue={years[0]}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={budgetId} className="text-sm font-medium">
          Budget totale (€)
        </label>
        <Input
          id={budgetId}
          name="totalBudget"
          type="number"
          required
          min={1}
          step={10}
          inputMode="numeric"
          placeholder="1500"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvataggio…" : "Salva rotta"}
      </Button>

      {/* Il contenitore esiste sempre: uno screen reader annuncia il messaggio che
          vi compare dentro. Se comparisse insieme al nodo, l'annuncio si perderebbe. */}
      <p
        role="status"
        aria-live="polite"
        className={
          message?.type === "error"
            ? "text-sm text-destructive"
            : "text-sm text-muted-foreground"
        }
      >
        {message?.text ?? ""}
      </p>
    </form>
  );
}
