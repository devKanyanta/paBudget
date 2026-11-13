/** Prices are integer ngwee (K1 = 100 ngwee). */
export function kwacha(ngwee: number | null | undefined): string {
  if (ngwee == null) return '—';
  const k = ngwee / 100;
  return 'K' + (Number.isInteger(k) ? k.toLocaleString('en-US') : k.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

export function toNgwee(input: string | number): number {
  const n = typeof input === 'number' ? input : parseFloat(input.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const priceLevelLabel = (level: number) => 'K'.repeat(Math.min(Math.max(level, 1), 3));

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDistance(m: number | null | undefined): string | null {
  if (m == null) return null;
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const days = Math.floor((now - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

export function groupHours(hours: { weekday: number; opensAt: string; closesAt: string }[]) {
  return WEEKDAYS.map((d, i) => ({ day: d, slots: hours.filter((h) => h.weekday === i).map((h) => `${h.opensAt}–${h.closesAt}`) }));
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
export function whatsappUrl(phone: string) {
  let p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '260' + p.slice(1);
  return `https://wa.me/${p}`;
}
