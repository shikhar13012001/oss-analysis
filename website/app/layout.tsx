import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title:       { default: "Hermes", template: "%s — Hermes" },
  description: "Every open-source GitHub repo analysed for commercial viability. Find your next product idea or learn exactly why something won't work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-canvas text-ink min-h-screen antialiased font-sans">
        <header className="border-b border-hairline sticky top-0 z-50 bg-canvas/95 backdrop-blur-sm">
          <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <span className="text-sm font-semibold tracking-tight text-ink">⚡ Hermes</span>
              <span className="text-xs text-ash hidden sm:block">OSS → Revenue</span>
            </a>
            <div className="flex items-center gap-1">
              <a href="/ideas"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-mute hover:text-ink transition-colors">
                Ideas
              </a>
              <a href="/rejected"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-mute hover:text-ink transition-colors">
                Rejected
              </a>
            </div>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-12">
          {children}
        </main>

        <footer className="border-t border-hairline mt-24 py-10">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-ash">
            <span>⚡ Hermes</span>
            <span>Automated OSS commercial analysis</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
