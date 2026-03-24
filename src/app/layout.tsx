import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Family Dinner Planner",
  description: "Wochenplanung, Rezeptverwaltung und Einkaufslisten für die Familie",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Family Dinner Planner",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2D2A26",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body
        style={{
          fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
          backgroundColor: "#FAF6F1",
          color: "#2D2A26",
        }}
      >
        {children}
      </body>
    </html>
  );
}
