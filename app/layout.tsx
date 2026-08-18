import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChromeSlot } from "@/components/layout/ChromeSlot";
import { BackgroundParticles } from "@/components/layout/BackgroundParticles";
import { AppProviders } from "@/components/providers/AppProviders";
import { themeInitScript } from "@/components/providers/ThemeProvider";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lunowix — Find Your Perfect Electronics",
    template: "%s · Lunowix",
  },
  description:
    "Browse laptops by budget, compare specs side by side, and check real gaming performance and software compatibility before you buy.",
  keywords: [
    "laptop recommendations",
    "laptop comparison",
    "gaming laptop",
    "laptop by budget",
    "laptop buying guide India",
  ],
  authors: [{ name: "Lunowix" }],
  openGraph: {
    type: "website",
    siteName: "Lunowix",
    title: "Lunowix — Find Your Perfect Electronics",
    description:
      "Budget-first laptop recommendations with gaming benchmarks and software compatibility for every machine.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Lunowix — Find Your Perfect Electronics",
    description:
      "Budget-first laptop recommendations with gaming benchmarks and software compatibility.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

/* No session read here any more. That call was the only thing forcing every
   route to be dynamic — without it the shell can be statically rendered. */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables sit on <html> so `:root`-scoped theme tokens can see them.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppProviders>
          <BackgroundParticles />
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main id="main" className="flex-1">
              {children}
            </main>
            {/* Auth routes run edge to edge; the marketing footer would put
                300px of scroll under a page meant to fill the viewport. */}
            <ChromeSlot hiddenOn={["/auth"]}>
              <Footer />
            </ChromeSlot>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
