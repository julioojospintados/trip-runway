import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { updateTrackedRoutePrices } from "@/lib/cron/update-prices";

// Il batch interroga i provider esterni per ogni rotta: non deve essere
// prerenderizzato né cachato.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  // Confronto a tempo costante: evita di rivelare il segreto un byte alla volta.
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

/**
 * Endpoint del cronjob notturno prezzi, invocato da Vercel Cron (vedi vercel.json).
 * Protetto da CRON_SECRET: senza, chiunque potrebbe innescare il batch e bruciare
 * la quota API. Vedi .claude/agents/architecture-security.md, regola 3.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const report = await updateTrackedRoutePrices();

    // Log server-side: serve a capire quali rotte non si sono aggiornate e perché.
    console.info("[cron:update-prices]", {
      total: report.total,
      updated: report.updated,
      failed: report.failed,
    });
    for (const outcome of report.outcomes) {
      if (outcome.status === "failed") {
        console.warn("[cron:update-prices] rotta fallita", {
          routeId: outcome.routeId,
          error: outcome.error,
        });
      }
    }

    return NextResponse.json({
      total: report.total,
      updated: report.updated,
      failed: report.failed,
    });
  } catch (error) {
    console.error("[cron:update-prices] batch interrotto", error);
    return NextResponse.json(
      { error: "Aggiornamento prezzi fallito" },
      { status: 500 }
    );
  }
}
