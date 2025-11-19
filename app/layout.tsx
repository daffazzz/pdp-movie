import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { Analytics } from "@vercel/analytics/react";
import CacheMonitor from "./components/CacheMonitor";
import SocialBarAd from "./components/SocialBarAd";
import PopunderAd from "./components/PopunderAd";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "PDP Movie | Stream Films",
  description: "Stream your favorite movies on PDP Movie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${poppins.variable} antialiased bg-background text-white`}
      >
        <div className="min-h-screen flex flex-col">
          <div className="relative z-50">
            <Navbar />
          </div>
          <main className="flex-grow relative z-10">
            {children}
          </main>
          <div className="text-center py-4 text-gray-500 text-xs border-t border-gray-800">
            <p className="mb-1">© 2025 PDP Inc. All rights reserved.</p>
            <p>Made with    ❤️ for movie lovers BY: DAFFAA_AR</p>
          </div>
          <CacheMonitor />
        </div>
        <Analytics />
        {/* Global socialbar ads */}
        <SocialBarAd />
        <PopunderAd />
      </body>
    </html>
  );
}
