import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const interSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Habesha Exchange — Your Trusted Home for Crypto",
  description:
    "Habesha Exchange — buy, sell and hold BTC, USDT, USDC and TON. Pay in Birr, withdraw to any Ethiopian bank, and trade with people you trust.",
  keywords: ["Habesha Exchange", "crypto exchange Ethiopia", "buy USDT Ethiopia", "bitcoin", "USDT", "USDC", "TON", "trade crypto", "ETB crypto"],
  icons: { icon: "/habesha-mark.jpg" },
};

// CRITICAL: viewport meta tag — makes the website auto-fit phone screens
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0E1A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${interSans.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {/* Animated gradient mesh background */}
          <div className="mesh-bg">
            <div className="mesh-orb mesh-orb-1" />
            <div className="mesh-orb mesh-orb-2" />
            <div className="mesh-orb mesh-orb-3" />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
