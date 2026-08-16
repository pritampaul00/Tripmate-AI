import type { Metadata } from "next";
import {
  Geist,
  Special_Elite,
  Inter,
  Shippori_Mincho,
  IBM_Plex_Mono,
} from "next/font/google";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const shipporiMincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "600", "800"],
  variable: "--font-shippori",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Travora | Where will you go next?",
  description:
    "Tell Travora where you're going and what you love. Generate personalized AI travel itineraries in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`
        ${geist.variable}
        ${specialElite.variable}
        ${inter.variable}
        ${shipporiMincho.variable}
        ${ibmPlexMono.variable}
      `}
    >
      <body className="font-sans antialiased bg-white text-[#1a1a1a]">
        {children}
      </body>
    </html>
  );
}