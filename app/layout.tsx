import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import MaintenanceNotification from "./components/MaintenanceNotification";
import { AuthProvider } from '../contexts/AuthContext';
import { MaintenanceProvider } from '../contexts/MaintenanceContext';
import { Analytics } from "@vercel/analytics/react";
// import VidsrcFixer from "./components/VidsrcFixer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDP Movie | Stream Films",
  description: "Stream your favorite movies on PDP Movie",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
    other: [
      {
        rel: 'manifest',
        url: '/site.webmanifest',
      },
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <AuthProvider>
          <MaintenanceProvider>
            {/* Temporarily disabled VidsrcFixer to troubleshoot */}
            {/* <VidsrcFixer /> */}
            <div className="min-h-screen flex flex-col">
              <div className="relative z-50">
                <Navbar />
                <MaintenanceNotification />
              </div>
              <main className="flex-grow relative z-10">
                {children}
              </main>
              <div className="text-center py-4 text-gray-500 text-xs border-t border-gray-800">
                <p className="mb-1">© 2025 PDP Inc. All rights reserved.</p>
                <p>Made with ❤️ for movie lovers</p>
              </div>
            </div>
          </MaintenanceProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
