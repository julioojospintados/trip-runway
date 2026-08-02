import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DESCRIPTION =
  "Calcola quanti giorni puoi viaggiare con il tuo budget: incrociamo il prezzo del volo con il costo della vita a destinazione.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Il template lascia a ogni pagina il proprio titolo, mantenendo il brand in coda.
  title: {
    default: "trip-runway — quanti giorni dura il tuo budget di viaggio",
    template: "%s — trip-runway",
  },
  description: DESCRIPTION,
  // Intento di ricerca a coda lunga, non chiavi generiche ad altissima competizione.
  keywords: [
    "calcolatore budget viaggio",
    "quanto costa vivere in Thailandia",
    "budget nomadi digitali",
    "costo della vita sud-est asiatico",
    "quanti giorni posso viaggiare",
  ],
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "trip-runway",
    title: "Quanto dura davvero il tuo budget di viaggio?",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Quanto dura davvero il tuo budget di viaggio?",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="it"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
