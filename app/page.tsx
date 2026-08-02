import Link from "next/link";
import { CalendarClock, Gauge, ShieldCheck } from "lucide-react";
import { Show, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const POINTS = [
  {
    icon: Gauge,
    title: "Quanti giorni, non quanto costa",
    body: "Dato un budget, calcoliamo i giorni di permanenza sostenibili: prezzo del volo, extra fissi e costo della vita a destinazione.",
  },
  {
    icon: CalendarClock,
    title: "Prezzi aggiornati ogni notte",
    body: "Salvi la rotta una volta. Il monitoraggio dei prezzi avviene in background, senza che tu debba ricontrollare.",
  },
  {
    icon: ShieldCheck,
    title: "Ti diciamo anche quando non andare",
    body: "Stagione monsonica o advisory di sicurezza sulla destinazione: le segnalazioni arrivano prima che prenoti, con la fonte ufficiale.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">
        Quanto dura davvero il tuo budget di viaggio?
      </h1>
      <p className="mt-4 text-lg text-muted-foreground text-pretty">
        trip-runway incrocia il costo reale del volo con il costo della vita a
        destinazione e ti dice quanti giorni puoi restare. Nessuna stima a
        occhio.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Show
          when="signed-in"
          fallback={
            <SignInButton mode="modal">
              <Button size="lg">Inizia gratis</Button>
            </SignInButton>
          }
        >
          <Button size="lg" render={<Link href="/dashboard" />}>
            Vai alle tue rotte
          </Button>
        </Show>
      </div>

      <section aria-labelledby="come-funziona" className="mt-20">
        <h2 id="come-funziona" className="text-xl font-medium">
          Come funziona
        </h2>
        <ul className="mt-6 space-y-6">
          {POINTS.map((point) => (
            <li key={point.title} className="flex gap-4">
              <point.icon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-muted-foreground"
              />
              <div>
                <h3 className="font-medium">{point.title}</h3>
                <p className="mt-1 text-muted-foreground text-pretty">
                  {point.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
