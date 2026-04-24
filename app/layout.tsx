import type { Metadata, Viewport } from "next";
import { Marcellus, Josefin_Sans } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./providers";

const marcellus = Marcellus({
  subsets: ["latin"],
  variable: "--font-marcellus",
  weight: ["400"],
  display: "swap",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KHABARCAST — YOUR READING LIST, SPOKEN.",
  description:
    "Newsletters and articles turned into podcast-style audio briefings. Listen anywhere your eyes are busy.",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className={`${marcellus.variable} ${josefin.variable}`}>
        <body className="deco-crosshatch">
          {/* Film grain overlay — print-poster texture, 1920s cinematograph quality */}
          <svg
            className="noise"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Film grain</title>
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
