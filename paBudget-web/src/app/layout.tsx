import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'paBudget — find places in Lusaka that fit your budget', template: '%s · paBudget' },
  description: 'See what a restaurant, cafe or outing really costs before you go. Real menus, real prices, shared by the community.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1f7a4d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 py-5">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">
            Prices are shared by the community and may change. <a className="underline" href="/terms">Terms</a> · <a className="underline" href="/privacy">Privacy</a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
