import { AlertTriangle, CloudRain, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH";

const LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: "Rischio basso",
  MODERATE: "Rischio moderato",
  HIGH: "Rischio alto",
};

const LEVEL_COLOR: Record<RiskLevel, string> = {
  LOW: "text-advisory-low",
  MODERATE: "text-advisory-moderate",
  HIGH: "text-advisory-high",
};

interface RiskBadgeProps {
  level: RiskLevel;
  /** Descrizione leggibile del rischio: è il contenuto informativo, non un ornamento. */
  message: string;
  kind: "season" | "security";
  /** Fonte e data ultimo aggiornamento: obbligatorie per i dati di sicurezza. */
  source?: string;
  sourceUrl?: string;
  updatedAt?: Date;
  className?: string;
}

/**
 * Segnalazione di rischio (stagionale o di sicurezza).
 *
 * Regole di accessibilità, da .claude/agents/ux-accessibility.md, regola 5:
 * - mai solo colore: icona + livello testuale + messaggio esplicito;
 * - niente tooltip/hover-only, il contenuto è sempre visibile (tastiera e touch);
 * - `aria-live="polite"` sui rischi alti, così lo screen reader lo annuncia
 *   quando compare senza interrompere l'utente;
 * - nessuna animazione: un avviso di sicurezza che lampeggia sembra pubblicità.
 */
export function RiskBadge({
  level,
  message,
  kind,
  source,
  sourceUrl,
  updatedAt,
  className,
}: RiskBadgeProps) {
  const Icon =
    kind === "security"
      ? level === "LOW"
        ? Info
        : ShieldAlert
      : level === "HIGH"
        ? AlertTriangle
        : CloudRain;

  const heading = kind === "security" ? "Sicurezza" : "Stagionalità";

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border bg-advisory-surface p-3 text-sm",
        className
      )}
      // I rischi alti vengono annunciati; gli altri restano leggibili ma non interrompono.
      aria-live={level === "HIGH" ? "polite" : undefined}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-5 shrink-0", LEVEL_COLOR[level])}
      />
      <div className="space-y-1">
        <p className={cn("font-medium", LEVEL_COLOR[level])}>
          {heading} — {LEVEL_LABEL[level]}
        </p>
        <p className="text-foreground">{message}</p>
        {(source || updatedAt) && (
          <p className="text-muted-foreground">
            {source && (
              <>
                Fonte:{" "}
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source}
                  </a>
                ) : (
                  source
                )}
              </>
            )}
            {source && updatedAt && " · "}
            {updatedAt && (
              <>
                Aggiornato il{" "}
                <time dateTime={updatedAt.toISOString()}>
                  {updatedAt.toLocaleDateString("it-IT")}
                </time>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
