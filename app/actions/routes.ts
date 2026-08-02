"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSaveAnotherRoute, type Tier } from "@/lib/tier";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface SaveRouteInput {
  originIata: string;
  destinationId: string;
  departureYear: number;
  departureMonth: number;
  totalBudget: number;
}

function isValidIata(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

/**
 * Salva una rotta per l'utente corrente.
 *
 * Il frontend non chiama mai i provider di volo: crea (o riusa) la `TrackedRoute`
 * condivisa e vi aggancia la `SavedRoute` dell'utente. Sarà il cronjob notturno a
 * popolarne il prezzo. Vedi project-brief.md, Sezione 4.1.
 */
export async function saveRoute(input: SaveRouteInput): Promise<ActionResult> {
  const user = await requireCurrentUser();

  const originIata = input.originIata.trim().toUpperCase();
  if (!isValidIata(originIata)) {
    return { ok: false, error: "Codice aeroporto di partenza non valido." };
  }
  if (!Number.isInteger(input.departureMonth) || input.departureMonth < 1 || input.departureMonth > 12) {
    return { ok: false, error: "Mese di partenza non valido." };
  }
  if (!Number.isInteger(input.departureYear) || input.departureYear < 2000) {
    return { ok: false, error: "Anno di partenza non valido." };
  }
  if (!Number.isFinite(input.totalBudget) || input.totalBudget <= 0) {
    return { ok: false, error: "Il budget deve essere maggiore di zero." };
  }

  const destination = await prisma.destination.findUnique({
    where: { id: input.destinationId },
    select: { id: true },
  });
  if (!destination) {
    return { ok: false, error: "Destinazione non trovata." };
  }

  const savedCount = await prisma.savedRoute.count({
    where: { userId: user.id },
  });
  if (!canSaveAnotherRoute(user.tier as Tier, savedCount)) {
    return {
      ok: false,
      error: "Hai raggiunto il limite di rotte del piano gratuito.",
    };
  }

  // Deduplicazione: la stessa rotta salvata da più utenti resta una sola riga,
  // quindi una sola chiamata API per notte.
  const trackedRoute = await prisma.trackedRoute.upsert({
    where: {
      originIata_destinationId_departureYear_departureMonth: {
        originIata,
        destinationId: destination.id,
        departureYear: input.departureYear,
        departureMonth: input.departureMonth,
      },
    },
    update: {},
    create: {
      originIata,
      destinationId: destination.id,
      departureYear: input.departureYear,
      departureMonth: input.departureMonth,
    },
  });

  const alreadySaved = await prisma.savedRoute.findUnique({
    where: {
      userId_trackedRouteId: {
        userId: user.id,
        trackedRouteId: trackedRoute.id,
      },
    },
    select: { id: true },
  });
  if (alreadySaved) {
    return { ok: false, error: "Hai già salvato questa rotta." };
  }

  await prisma.savedRoute.create({
    data: {
      userId: user.id,
      trackedRouteId: trackedRoute.id,
      totalBudget: input.totalBudget,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Cancella una rotta salvata.
 *
 * L'id arriva dal client e non è mai affidabile: la cancellazione filtra sempre
 * anche per `userId`, così un id altrui non tocca il record di nessun altro
 * (anti-IDOR). Vedi project-brief.md, Sezione 4.3.
 */
export async function deleteSavedRoute(
  savedRouteId: string
): Promise<ActionResult> {
  const user = await requireCurrentUser();

  const result = await prisma.savedRoute.deleteMany({
    where: { id: savedRouteId, userId: user.id },
  });

  if (result.count === 0) {
    // Stesso messaggio sia per "non esiste" sia per "non è tuo": non confermiamo
    // a un attaccante l'esistenza di record altrui.
    return { ok: false, error: "Rotta non trovata." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Aggiorna il budget di una rotta salvata. Stesso vincolo di ownership della delete.
 */
export async function updateSavedRouteBudget(
  savedRouteId: string,
  totalBudget: number
): Promise<ActionResult> {
  const user = await requireCurrentUser();

  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    return { ok: false, error: "Il budget deve essere maggiore di zero." };
  }

  const result = await prisma.savedRoute.updateMany({
    where: { id: savedRouteId, userId: user.id },
    data: { totalBudget },
  });

  if (result.count === 0) {
    return { ok: false, error: "Rotta non trovata." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
