import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, Outfit } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { SessionProvider } from "@/components/SessionProvider";

const bodyFont = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const uiFont = Manrope({
  variable: "--font-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CommonPlace - Capture Your Ideas",
  description: "AI-powered voice memo capture and organization",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#efe6dc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${uiFont.variable} font-sans antialiased min-h-screen`}
      >
        <SessionProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 min-h-screen">
              <div className="max-w-6xl mx-auto px-5 py-6 lg:px-10 lg:py-8 pb-24 lg:pb-8 page-enter">
                {children}
              </div>
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
