import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});

const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "InkVerse",
  description: "Your handwritten memory archive.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InkVerse",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // stylus/canvas later — avoid pinch-zoom fights
  themeColor: "#1c1b18",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spectral.variable}`}>
      <body className="safe-top safe-bottom">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
