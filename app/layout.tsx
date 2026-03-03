import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_NAME = "Theme Snapshot";
const SITE_DESCRIPTION =
  "Analyze any website's design system in seconds: fonts, color palette, theme direction, and SEO-ready visual insights.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Website Theme Analyzer`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "website theme analyzer",
    "font detector",
    "color palette extractor",
    "web design analysis",
    "brand style audit",
    "UI inspiration tool",
    "website typography checker",
    "CSS color analyzer",
  ],
  authors: [{ name: "Theme Snapshot" }],
  creator: "Theme Snapshot",
  publisher: "Theme Snapshot",
  category: "design",
  classification: "Website analysis tool",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    title: `${SITE_NAME} | Website Theme Analyzer`,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Website Theme Analyzer`,
    description: SITE_DESCRIPTION,
  },
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any",
    url: SITE_URL,
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
