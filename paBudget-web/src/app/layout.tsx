import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'paBudget — find places in Lusaka that fit your budget', template: '%s · paBudget' },
  description: 'See what a restaurant, cafe or outing really costs before you go. Real menus, real prices, shared by the community.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a3d2e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Header />
          <main className="mx-auto w-full flex-1 max-w-6xl px-4 py-6 sm:px-6">{children}</main>
          <footer className="mt-16 bg-brand-ground text-white/75">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
              <div className="space-y-3"><Logo variant="on-dark" className="h-7" /><p className="max-w-xs text-sm">Know the bill before you go. Real menus and prices from Lusaka, shared by the community.</p></div>
              <nav aria-label="Explore" className="space-y-2 text-sm"><p className="font-semibold text-white">Explore</p><a className="block hover:text-white" href="/places">Places</a><a className="block hover:text-white" href="/planner">Budget planner</a><a className="block hover:text-white" href="/leaderboard">Leaderboard</a></nav>
              <nav aria-label="Legal" className="space-y-2 text-sm"><p className="font-semibold text-white">Legal</p><a className="block hover:text-white" href="/terms">Terms</a><a className="block hover:text-white" href="/privacy">Privacy</a><a className="block hover:text-white" href="/takedown">Report content</a></nav>
            </div>
            <div className="border-t border-white/10"><p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">Prices are shared by the community and may change. Always confirm with the venue.</p></div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
