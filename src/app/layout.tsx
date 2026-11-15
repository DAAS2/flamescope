import type { Metadata, Viewport } from "next";
import { Funnel_Display, Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const funnel = Funnel_Display({ variable: "--font-funnel", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "FlameScope: Fire Safety Intelligence from Microgravity Combustion",
  description:
    "FlameScope summarizes, ranks and interprets NASA PSI microgravity combustion investigations, with live simulations and AI analysis, to deliver fire safety insights for the Moon, Mars and beyond.",
};

export const viewport: Viewport = { themeColor: "#070a14" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${funnel.variable} antialiased`}>{children}</body>
    </html>
  );
}
