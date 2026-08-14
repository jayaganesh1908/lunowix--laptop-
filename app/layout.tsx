import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BackgroundParticles } from "@/components/layout/BackgroundParticles";
import { AppProviders } from "@/components/providers/AppProviders";
import { themeInitScript } from "@/components/providers/ThemeProvider";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { SessionAccount } from "@/lib/hooks/useAuth";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Reading the session cookie here makes every route dynamic. That is the
  // trade for a navbar that knows who you are on first paint; the alternative
  // is a signed-out flash on every navigation.
  const profile = await getCurrentProfile();

  const initialAccount: SessionAccount | null = profile
    ? {
        id: profile.id,
        email: profile.email,
        name: profile.full_name ?? profile.email.split("@")[0],
        avatarUrl: profile.avatar_url,
        role: profile.role,
        joinedAt: profile.created_at,
      }
    : null;

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
        <AppProviders initialAccount={initialAccount}>
          <BackgroundParticles />
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
