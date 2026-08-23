import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Punja Bhattarai — Developer · Designer · Creator",
    template: "%s — Punja Bhattarai",
  },
  description:
    "Portfolio of Punja Bhattarai, a BCS student and developer building web applications, backend systems and interactive Unity experiences.",
  keywords: [
    "Punja Bhattarai",
    "developer",
    "BCS student",
    "web development",
    "Unity",
    "portfolio",
  ],
  authors: [{ name: "Punja Bhattarai" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Punja Bhattarai — Developer · Designer · Creator",
    description:
      "BCS student & developer — web apps, backend systems, Unity experiments and photography.",
    siteName: "Punja Bhattarai",
    images: [{ url: "/images/og.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Punja Bhattarai — Developer · Designer · Creator",
    description:
      "BCS student & developer — web apps, backend systems, Unity experiments and photography.",
    images: ["/images/og.svg"],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
