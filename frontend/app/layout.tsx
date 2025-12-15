import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MiddleChalant Escrow",
  description: "A modern escrow coordination dApp interface.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakarta.variable} font-sans antialiased min-h-screen text-foreground bg-background overflow-x-hidden`}
      >
        {/* Base black background */}
        <div className="fixed inset-0 -z-30 bg-black" />

        {/* Animated glowing orbs */}
        <div className="fixed inset-0 -z-20 overflow-hidden">
          {/* Primary blue orb - top left */}
          <div
            className="glow-orb glow-orb-blue animate-float-slow animate-pulse-glow"
            style={{
              width: "600px",
              height: "600px",
              top: "-10%",
              left: "-5%",
            }}
          />

          {/* Green orb - top right */}
          <div
            className="glow-orb glow-orb-green animate-float-slower"
            style={{
              width: "500px",
              height: "500px",
              top: "5%",
              right: "-10%",
              animationDelay: "-5s",
            }}
          />

          {/* Purple accent orb - center */}
          <div
            className="glow-orb glow-orb-purple animate-float-slow animate-pulse-glow"
            style={{
              width: "400px",
              height: "400px",
              top: "40%",
              left: "30%",
              animationDelay: "-10s",
            }}
          />

          {/* Small blue orb - bottom left */}
          <div
            className="glow-orb glow-orb-blue animate-float-slower"
            style={{
              width: "350px",
              height: "350px",
              bottom: "10%",
              left: "10%",
              animationDelay: "-8s",
            }}
          />

          {/* Small green orb - bottom right */}
          <div
            className="glow-orb glow-orb-green animate-float-slow animate-pulse-glow"
            style={{
              width: "450px",
              height: "450px",
              bottom: "-5%",
              right: "15%",
              animationDelay: "-12s",
            }}
          />
        </div>

        {/* Subtle grid overlay for depth */}
        <div
          className="fixed inset-0 -z-10 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
