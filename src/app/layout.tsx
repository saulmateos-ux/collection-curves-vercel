import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Collection Curves Dashboard",
  description: "Complete Portfolio Analytics Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <nav className="bg-gray-900 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">📊 Collection Curves</h1>
              <div className="flex space-x-6">
                <Link href="/" className="hover:text-blue-400 transition">Portfolio</Link>
                <Link href="/providers" className="hover:text-blue-400 transition">Providers</Link>
                <Link href="/curves" className="hover:text-blue-400 transition">Collection Curves</Link>
                <Link href="/analytics" className="hover:text-blue-400 transition">Analytics</Link>
                <Link href="/admin" className="hover:text-blue-400 transition">Admin Tools</Link>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Data:</span> <span className="text-green-400">Live</span>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}