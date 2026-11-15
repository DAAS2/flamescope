import type { Metadata, Viewport } from "next";
import { Exo_2, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jb = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin"], weight: ["300", "400", "600", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "FlameScope: Fire Safety Insights from Microgravity Combustion",
  description:
    "An AI-powered dashboard that summarizes, ranks and interprets NASA PSI microgravity combustion investigations to deliver fire safety insights for the Moon, Mars and beyond.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jb.variable} ${exo.variable} antialiased`}>{children}</body>
    </html>
  );
}
