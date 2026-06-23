import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habesha Exchange — Trade Crypto with Confidence",
  description:
    "Habesha Exchange — a premium cryptocurrency exchange. Trade BTC, USDT, USDC, TON and the exclusive Habesha Token. Secure, fast and built for everyone.",
  keywords: ["Habesha Exchange", "crypto exchange", "bitcoin", "USDT", "Habesha Token", "trade crypto"],
  icons: { icon: "/habesha-mark.jpg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
