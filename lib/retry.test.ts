import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

const noSleep = () => Promise.resolve();

describe("withRetry", () => {
  it("restituisce subito il risultato se il primo tentativo riesce", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("riprova finché non riesce", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rilancia l'ultimo errore dopo aver esaurito i tentativi", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("sempre giù"));
    await expect(
      withRetry(fn, { attempts: 3, sleep: noSleep })
    ).rejects.toThrow("sempre giù");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("applica un backoff esponenziale tra i tentativi", async () => {
    const delays: number[] = [];
    const fn = vi.fn().mockRejectedValue(new Error("giù"));

    await expect(
      withRetry(fn, {
        attempts: 4,
        baseDelayMs: 100,
        sleep: async (ms) => {
          delays.push(ms);
        },
      })
    ).rejects.toThrow();

    // Nessuna attesa dopo l'ultimo tentativo fallito.
    expect(delays).toEqual([100, 200, 400]);
  });
});
