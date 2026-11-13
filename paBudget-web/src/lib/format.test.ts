import { describe, expect, it } from 'vitest';
import { directionsUrl, formatDistance, groupHours, kwacha, priceLevelLabel, timeAgo, toNgwee, whatsappUrl } from './format';

describe('format', () => {
  it('formats ngwee as kwacha', () => {
    expect(kwacha(12000)).toBe('K120');
    expect(kwacha(12550)).toBe('K125.50');
    expect(kwacha(150000)).toBe('K1,500');
    expect(kwacha(null)).toBe('—');
  });
  it('parses user input to ngwee without float drift', () => {
    expect(toNgwee('45.5')).toBe(4550);
    expect(toNgwee('K1,200')).toBe(120000);
    expect(toNgwee('0.29')).toBe(29);
    expect(toNgwee('abc')).toBe(0);
  });
  it('labels price levels', () => {
    expect(priceLevelLabel(1)).toBe('K'); expect(priceLevelLabel(3)).toBe('KKK'); expect(priceLevelLabel(9)).toBe('KKK');
  });
  it('formats distance and time', () => {
    expect(formatDistance(430)).toBe('430 m'); expect(formatDistance(2340)).toBe('2.3 km'); expect(formatDistance(null)).toBeNull();
    const now = Date.parse('2026-11-13T12:00:00Z');
    expect(timeAgo('2026-11-13T08:00:00Z', now)).toBe('today');
    expect(timeAgo('2026-11-12T08:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-10-01T08:00:00Z', now)).toBe('1 mo ago');
    expect(timeAgo(null, now)).toBe('never');
  });
  it('groups hours by weekday', () => {
    const g = groupHours([{ weekday: 1, opensAt: '08:00', closesAt: '17:00' }]);
    expect(g[1]).toEqual({ day: 'Mon', slots: ['08:00–17:00'] }); expect(g[0].slots).toEqual([]);
  });
  it('builds links', () => {
    expect(whatsappUrl('0971234567')).toBe('https://wa.me/260971234567');
    expect(directionsUrl(-15.4, 28.3)).toContain('destination=-15.4,28.3');
  });
});
