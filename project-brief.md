# Project Brief: Travel Budget Yield App

## 1. Obiettivo del Progetto
Trasformare uno script personale per la ricerca di voli in una Web App SaaS B2C completa, basata su un modello freemium e monetizzazione tramite affiliazioni.
Il software non è un semplice aggregatore di voli, ma un "Travel Budget Engine": incrocia il costo del volo in tempo reale con il costo della vita a destinazione per calcolare i giorni massimi di permanenza sostenibili con un budget fisso.

## 2. Contesto e Workflow dello Sviluppatore
- **Approccio UX/UI:** Code-first. Salta la fase di wireframing su software statici. Costruisci l'interfaccia direttamente tramite codice sfruttando HTML, Tailwind CSS e componenti pre-stilati.
- **Dati di Test Iniziali (Seed):** Il sistema deve essere testato fin da subito su scenari reali. Imposta il file di seed del database per tracciare rotte verso il Sud-Est Asiatico (es. Thailandia, Vietnam, Indonesia) con una finestra temporale fissata per Settembre e Ottobre 2026.

## 3. Tech Stack Obbligatorio
- **Framework:** Next.js 14+ (esclusivamente App Router, cartella `app/`). Nessun utilizzo di Pages Router.
- **Styling:** Tailwind CSS + Shadcn UI + Lucide Icons.
- **Database & ORM:** PostgreSQL (Supabase) gestito tramite Prisma ORM.
- **Autenticazione:** Clerk (per delegare gestione sessioni, sicurezza e 2FA).
- **API Esterne:**
  1. *Travelpayouts (Aviasales):* Unico provider di prezzi voli (dati aggregati, gratuito, nessuna soglia di traffico) e generazione dei deeplink affiliati per la monetizzazione. **Amadeus è stato rimosso dallo stack**: il portale self-service per sviluppatori è stato chiuso definitivamente da Amadeus (decommissioning completato il 17 luglio 2026) — resta solo un canale Enterprise non percorribile per un progetto in fase di bootstrapping. Se in futuro serviranno prezzi live da GDS, il candidato di ripiego è Duffel (self-serve, a consumo, non gratuito).

## 4. Regola di Architettura e Sicurezza
1. **Modello Rotte-Centrico (Anti-Abuso):** Per non esaurire le quote gratuite delle API, il frontend non deve *mai* triggerare chiamate API dirette on-demand. L'utente salva la rotta nel database. Un cronjob notturno prenderà le rotte uniche dal database, farà una singola chiamata API per rotta, e aggiornerà i prezzi per tutti gli utenti interessati (Deduplicazione).
2. **Motore di Calcolo (Core Business Logic):** L'algoritmo primario da implementare per ordinare i risultati è:
   $$\text{MaxDays} = \text{Floor}\left(\frac{\text{TotalBudget} - \text{FlightPrice} - \text{FixedExtras}}{\text{DailyCostGround}}\right)$$
3. **Sicurezza Server Actions:** Ogni singola Server Action che modifica o cancella dati deve includere un controllo di autorizzazione rigoroso per verificare che l'utente autenticato sia il reale proprietario del record, prevenendo vulnerabilità IDOR.

## Nota sul nome del progetto
Il nome attuale dell'app è **trip-runway**, ma non è definitivo. Se in futuro emerge un altro nome in documenti, codice o configurazioni, allinealo a "trip-runway" oppure tienilo esplicitamente marcato come "draft" da validare con il team.