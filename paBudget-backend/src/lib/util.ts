export const ngwee = (kwacha: number) => Math.round(kwacha * 100);
export const kwacha = (n: number) => `K${(n / 100).toFixed(n % 100 === 0 ? 0 : 2)}`;

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** price level: 1 = K, 2 = KK, 3 = KKK based on avg spend per person (ngwee) */
export function priceLevelFor(avgPpNgwee: number | null | undefined) {
  if (avgPpNgwee == null) return 1;
  if (avgPpNgwee <= 15000) return 1;
  if (avgPpNgwee <= 35000) return 2;
  return 3;
}

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Open-now check; times are Africa/Lusaka (UTC+2, no DST). Handles after-midnight closes. */
export function isOpenAt(hours: { weekday: number; opensAt: string; closesAt: string }[], at: Date = new Date()) {
  if (!hours.length) return null;
  const local = new Date(at.getTime() + 2 * 3600_000);
  const day = local.getUTCDay();
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  const prev = (day + 6) % 7;
  for (const h of hours) {
    const o = toMin(h.opensAt), c = toMin(h.closesAt);
    if (h.weekday === day) {
      if (c > o ? mins >= o && mins < c : mins >= o) return true;
    }
    if (h.weekday === prev && c <= o && mins < c) return true;
  }
  return false;
}
