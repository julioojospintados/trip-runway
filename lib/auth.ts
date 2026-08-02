import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/** Limite del piano gratuito. Valore ancora da confermare via pPoC — vedi todo.md, Fase 0. */
export const FREE_TIER_ROUTE_LIMIT = 3;

/**
 * Restituisce l'utente applicativo corrispondente alla sessione Clerk,
 * creandolo al primo accesso. Clerk resta la fonte di verità per l'identità:
 * il DB conserva solo ciò che serve al prodotto (tier, rotte salvate).
 */
export async function getOrCreateCurrentUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) return null;

  return prisma.user.create({ data: { clerkId, email } });
}

/** Variante per i percorsi che non possono proseguire senza utente autenticato. */
export async function requireCurrentUser() {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    throw new Error("Non autenticato");
  }
  return user;
}
