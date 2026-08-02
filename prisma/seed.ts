import { prisma } from "../lib/prisma.js";

// Origine di default per il seed — cambiala qui se vuoi testare da un altro aeroporto.
const ORIGIN_IATA = "MXP";

// Finestra fissata da project-brief.md: Settembre e Ottobre 2026.
const SEED_YEAR = 2026;
const SEED_MONTHS = [9, 10];

const DESTINATIONS = [
  {
    iataCity: "BKK",
    countryCode: "TH",
    name: "Bangkok, Thailandia",
    dailyCostGround: 35,
    fixedExtras: 20, // assicurazione viaggio; ingresso esente visto per cittadini UE fino a 60gg
    seasonality: {
      9: {
        riskLevel: "HIGH" as const,
        label: "Piena stagione monsonica: piogge intense e frequenti allagamenti urbani.",
      },
      10: {
        riskLevel: "HIGH" as const,
        label: "Coda della stagione monsonica: piogge ancora frequenti, in graduale attenuazione.",
      },
    },
  },
  {
    iataCity: "SGN",
    countryCode: "VN",
    name: "Ho Chi Minh City, Vietnam",
    dailyCostGround: 30,
    fixedExtras: 30, // e-visa richiesto per molte nazionalità + assicurazione
    seasonality: {
      9: {
        riskLevel: "HIGH" as const,
        label: "Picco della stagione delle piogge nel sud del Vietnam, rischio di nubifragi.",
      },
      10: {
        riskLevel: "MODERATE" as const,
        label: "Piogge in attenuazione ma ancora presenti; possibile coda di tifoni dal centro/nord.",
      },
    },
  },
  {
    iataCity: "DPS",
    countryCode: "ID",
    name: "Denpasar (Bali), Indonesia",
    dailyCostGround: 40,
    fixedExtras: 35, // visto all'arrivo + assicurazione
    seasonality: {
      9: {
        riskLevel: "LOW" as const,
        label: "Stagione secca: clima favorevole, precipitazioni minime.",
      },
      10: {
        riskLevel: "LOW" as const,
        label: "Fine stagione secca: clima ancora favorevole, possibili prime piogge sporadiche.",
      },
    },
  },
];

async function main() {
  for (const dest of DESTINATIONS) {
    const destination = await prisma.destination.upsert({
      where: { iataCity: dest.iataCity },
      update: {
        countryCode: dest.countryCode,
        name: dest.name,
        dailyCostGround: dest.dailyCostGround,
        fixedExtras: dest.fixedExtras,
      },
      create: {
        iataCity: dest.iataCity,
        countryCode: dest.countryCode,
        name: dest.name,
        dailyCostGround: dest.dailyCostGround,
        fixedExtras: dest.fixedExtras,
      },
    });

    for (const month of SEED_MONTHS) {
      const season = dest.seasonality[month as 9 | 10];
      await prisma.climateSeasonality.upsert({
        where: { destinationId_month: { destinationId: destination.id, month } },
        update: {
          riskLevel: season.riskLevel,
          label: season.label,
          source: "Seed manuale — sostituire con feed climatico automatizzato prima del lancio",
        },
        create: {
          destinationId: destination.id,
          month,
          riskLevel: season.riskLevel,
          label: season.label,
          source: "Seed manuale — sostituire con feed climatico automatizzato prima del lancio",
        },
      });

      await prisma.trackedRoute.upsert({
        where: {
          originIata_destinationId_departureYear_departureMonth: {
            originIata: ORIGIN_IATA,
            destinationId: destination.id,
            departureYear: SEED_YEAR,
            departureMonth: month,
          },
        },
        update: {},
        create: {
          originIata: ORIGIN_IATA,
          destinationId: destination.id,
          departureYear: SEED_YEAR,
          departureMonth: month,
        },
      });
    }

    // Advisory di sicurezza: placeholder illustrativo, NON verificato in tempo reale.
    // Vedi agents/data-integration.md, "Disclaimer obbligatorio" — va sostituito con il feed
    // automatizzato (Farnesina/FCDO/State Dept) prima di mostrare qualunque dato agli utenti reali.
    await prisma.securityAdvisory.upsert({
      where: { destinationId: destination.id },
      update: {},
      create: {
        destinationId: destination.id,
        level: 1,
        summary:
          "Dato segnaposto di sviluppo — da verificare e sostituire con la fonte ufficiale prima del lancio.",
        source: "Seed manuale (non verificato)",
        sourceUrl: "https://www.viaggiaresicuri.it/",
      },
    });
  }

  console.log(
    `Seed completato: ${DESTINATIONS.length} destinazioni, ${SEED_MONTHS.length} mesi, origine ${ORIGIN_IATA}.`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
