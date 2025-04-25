import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { AuthProvider } from '../contexts/AuthContext';
import VidsrcFixer from "./components/VidsrcFixer";

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
          <VidsrcFixer />
          <div className="min-h-screen flex flex-col">
            <div className="relative z-50">
              <Navbar />
            </div>
            <main className="flex-grow relative z-10">
              {children}
            </main>
            <div className="text-center py-4 text-gray-500 text-xs border-t border-gray-800">
              <p className="mb-1">© 2025 PDP Inc. All rights reserved.</p>
              <p>Made with ❤️ for movie lovers</p>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
