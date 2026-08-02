import { beforeEach, describe, expect, it, vi } from "vitest";

const savedRoute = {
  count: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
};
const destination = { findUnique: vi.fn() };
const trackedRoute = { upsert: vi.fn() };
const requireCurrentUser = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { savedRoute, destination, trackedRoute },
}));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>(
    "@/lib/auth"
  );
  return {
    FREE_TIER_ROUTE_LIMIT: actual.FREE_TIER_ROUTE_LIMIT,
    requireCurrentUser: () => requireCurrentUser(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveRoute, deleteSavedRoute, updateSavedRouteBudget } = await import(
  "./routes"
);

const OWNER = { id: "user-owner", tier: "FREE" };

const validInput = {
  originIata: "MXP",
  destinationId: "dest-1",
  departureYear: 2026,
  departureMonth: 9,
  totalBudget: 1500,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(OWNER);
  destination.findUnique.mockResolvedValue({ id: "dest-1" });
  savedRoute.count.mockResolvedValue(0);
  savedRoute.findUnique.mockResolvedValue(null);
  savedRoute.create.mockResolvedValue({});
  trackedRoute.upsert.mockResolvedValue({ id: "tracked-1" });
});

describe("deleteSavedRoute — confine IDOR", () => {
  it("restringe la cancellazione all'utente autenticato", async () => {
    savedRoute.deleteMany.mockResolvedValue({ count: 1 });

    await deleteSavedRoute("route-1");

    // Il filtro deve contenere sia l'id sia lo userId: se contenesse solo l'id,
    // un utente potrebbe cancellare la rotta di chiunque.
    expect(savedRoute.deleteMany).toHaveBeenCalledWith({
      where: { id: "route-1", userId: OWNER.id },
    });
  });

  it("non cancella nulla se la rotta appartiene a un altro utente", async () => {
    // La query non trova righe perché lo userId non combacia.
    savedRoute.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteSavedRoute("rotta-di-un-altro");

    expect(result.ok).toBe(false);
  });

  it("non rivela se la rotta esiste ma è di un altro utente", async () => {
    savedRoute.deleteMany.mockResolvedValue({ count: 0 });

    const inesistente = await deleteSavedRoute("non-esiste");
    const altrui = await deleteSavedRoute("rotta-di-un-altro");

    // Messaggi identici: la risposta non è utilizzabile per sondare l'esistenza
    // dei record altrui.
    expect(altrui.error).toBe(inesistente.error);
  });

  it("richiede un utente autenticato", async () => {
    requireCurrentUser.mockRejectedValue(new Error("Non autenticato"));

    await expect(deleteSavedRoute("route-1")).rejects.toThrow(
      "Non autenticato"
    );
    expect(savedRoute.deleteMany).not.toHaveBeenCalled();
  });
});

describe("updateSavedRouteBudget — confine IDOR", () => {
  it("restringe l'aggiornamento all'utente autenticato", async () => {
    savedRoute.updateMany.mockResolvedValue({ count: 1 });

    await updateSavedRouteBudget("route-1", 2000);

    expect(savedRoute.updateMany).toHaveBeenCalledWith({
      where: { id: "route-1", userId: OWNER.id },
      data: { totalBudget: 2000 },
    });
  });

  it("non aggiorna la rotta di un altro utente", async () => {
    savedRoute.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateSavedRouteBudget("rotta-di-un-altro", 2000);

    expect(result.ok).toBe(false);
  });

  it("rifiuta un budget non positivo prima di toccare il DB", async () => {
    const result = await updateSavedRouteBudget("route-1", 0);

    expect(result.ok).toBe(false);
    expect(savedRoute.updateMany).not.toHaveBeenCalled();
  });
});

describe("saveRoute", () => {
  it("salva la rotta agganciandola all'utente autenticato", async () => {
    const result = await saveRoute(validInput);

    expect(result.ok).toBe(true);
    expect(savedRoute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: OWNER.id }),
    });
  });

  it("riusa la stessa TrackedRoute invece di duplicarla", async () => {
    await saveRoute(validInput);

    // L'upsert è ciò che garantisce una sola chiamata API per rotta condivisa.
    expect(trackedRoute.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} })
    );
  });

  it("normalizza il codice IATA in maiuscolo", async () => {
    await saveRoute({ ...validInput, originIata: " mxp " });

    expect(trackedRoute.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ originIata: "MXP" }),
      })
    );
  });

  it("blocca il piano gratuito oltre il limite di rotte", async () => {
    savedRoute.count.mockResolvedValue(3);

    const result = await saveRoute(validInput);

    expect(result.ok).toBe(false);
    expect(savedRoute.create).not.toHaveBeenCalled();
  });

  it("non applica il limite al piano PRO", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-pro", tier: "PRO" });
    savedRoute.count.mockResolvedValue(50);

    const result = await saveRoute(validInput);

    expect(result.ok).toBe(true);
  });

  it("rifiuta un codice IATA non valido", async () => {
    const result = await saveRoute({ ...validInput, originIata: "MILANO" });

    expect(result.ok).toBe(false);
    expect(trackedRoute.upsert).not.toHaveBeenCalled();
  });

  it("rifiuta un mese fuori intervallo", async () => {
    const result = await saveRoute({ ...validInput, departureMonth: 13 });

    expect(result.ok).toBe(false);
    expect(trackedRoute.upsert).not.toHaveBeenCalled();
  });

  it("rifiuta un budget non positivo", async () => {
    const result = await saveRoute({ ...validInput, totalBudget: -5 });

    expect(result.ok).toBe(false);
    expect(trackedRoute.upsert).not.toHaveBeenCalled();
  });

  it("rifiuta una destinazione inesistente", async () => {
    destination.findUnique.mockResolvedValue(null);

    const result = await saveRoute(validInput);

    expect(result.ok).toBe(false);
    expect(trackedRoute.upsert).not.toHaveBeenCalled();
  });

  it("non duplica una rotta già salvata dallo stesso utente", async () => {
    savedRoute.findUnique.mockResolvedValue({ id: "existing" });

    const result = await saveRoute(validInput);

    expect(result.ok).toBe(false);
    expect(savedRoute.create).not.toHaveBeenCalled();
  });
});
