import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { SessionProvider } from "@/components/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
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
  themeColor: "#3b1f0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        <SessionProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 min-h-screen">
              <div className="max-w-3xl mx-auto px-4 py-6 lg:px-10 lg:py-8 pb-24 lg:pb-10">
                {children}
              </div>
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
