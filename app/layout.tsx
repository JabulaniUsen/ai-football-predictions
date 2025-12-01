import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const roboto = Roboto({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Football Game Predictor | AI-Powered Match Predictions",
  description: "Get accurate football match predictions powered by advanced statistical analysis. Analyze head-to-head records, team form, and performance data to make informed predictions.",
  keywords: "football predictions, match predictions, football analysis, sports betting, football statistics",
  authors: [{ name: "Football Game Predictor" }],
  openGraph: {
  title: "Football Game Predictor",
  description: "AI-powered football match predictions based on head-to-head data, team statistics, and recent form",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${roboto.variable} antialiased font-sans bg-slate-950 text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
