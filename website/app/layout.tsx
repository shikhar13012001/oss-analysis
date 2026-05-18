import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       { default: "Hermes", template: "%s — Hermes" },
  description: "Every open-source GitHub repo analysed for commercial viability. Find your next product idea or learn exactly why something won't work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <header className="border-b border-zinc-800/60">
          <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <span className="text-base font-semibold tracking-tight">⚡ Hermes</span>
              <span className="text-xs text-zinc-600 hidden sm:block">OSS → Revenue</span>
            </a>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="/ideas"    className="hover:text-zinc-200 transition-colors">Ideas</a>
              <a href="/rejected" className="hover:text-zinc-200 transition-colors">Rejected</a>
            </div>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-zinc-800/60 mt-24 py-8 text-center text-xs text-zinc-700">
          Hermes · Automated OSS commercial analysis · Powered by Ollama Cloud · Localhost build
        </footer>
      </body>
    </html>
  );
}
