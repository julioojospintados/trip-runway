export interface RetryOptions {
  /** Numero massimo di tentativi totali (non di retry aggiuntivi). */
  attempts?: number;
  /** Ritardo iniziale in ms, raddoppiato a ogni tentativo fallito. */
  baseDelayMs?: number;
  /** Iniettabile nei test per non attendere davvero. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Riprova con backoff esponenziale. Protegge le quote API esterne evitando
 * raffiche di richieste ravvicinate su un provider già in difficoltà.
 * Vedi .claude/agents/data-integration.md, regola 3 (Resilienza del Cronjob).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500, sleep = defaultSleep }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError;
}
