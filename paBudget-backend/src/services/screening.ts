import { prisma } from '../db.js';
import { haversineM } from '../lib/util.js';
import * as storage from './storage.js';
import { labelPhoto, aiConfigured } from './ai.js';

export type Screening = { score: number; reasons: string[]; autoReject?: string };

const BAD_WORDS = /\b(fuck|shit|bitch|asshole|nigger|cunt|rape)\w*/i;
const LINK = /(https?:\/\/|www\.|\.com\b|t\.me\/|wa\.me\/)/i;
const PHONE = /(\+?260|\b0)[79]\d{7,8}\b/;
const SPAM = /\b(buy now|click here|free money|win big|whatsapp me|dm me|promo code)\b/i;

function checkText(text: string | undefined, label: string, reasons: string[]) {
  let penalty = 0;
  if (!text) return { penalty, reject: undefined as string | undefined };
  if (BAD_WORDS.test(text)) return { penalty: 100, reject: `${label} contains offensive language` };
  if (LINK.test(text)) { penalty += 30; reasons.push(`${label} contains a link`); }
  if (PHONE.test(text)) { penalty += 20; reasons.push(`${label} contains a phone number`); }
  if (SPAM.test(text)) { penalty += 30; reasons.push(`${label} looks like spam`); }
  if (text.length > 20 && /^(.)\1+$/.test(text.replace(/\s/g, ''))) { penalty += 30; reasons.push(`${label} is repeated characters`); }
  return { penalty, reject: undefined };
}

async function median(areaSlug?: string) {
  const rows = await prisma.menuItem.findMany({ where: { place: { status: 'LIVE', ...(areaSlug ? { area: { slug: areaSlug } } : {}) } }, select: { priceNgwee: true }, take: 2000 });
  if (rows.length < 5) return null;
  const s = rows.map((r) => r.priceNgwee).sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export async function screen(userId: string, type: string, p: any, targetPlaceId?: string | null): Promise<Screening> {
  let score = 100;
  const reasons: string[] = [];
  let autoReject: string | undefined;
  const penalize = (n: number, why: string) => { score -= n; reasons.push(why); };

  for (const [label, text] of [['Description', p.description], ['Review text', p.body], ['Items ordered', p.itemsOrdered], ['Name', p.name], ['Reason', p.reason]] as const) {
    const r = checkText(text, label, reasons);
    score -= r.penalty;
    if (r.reject) autoReject ??= r.reject;
  }

  // Photos: Gemini vision labels (skipped when AI is not configured, then photos are simply reviewed by a human)
  const imageIds: string[] = p.imageIds ?? [];
  if (imageIds.length && aiConfigured()) {
    const imgs = await prisma.image.findMany({ where: { id: { in: imageIds } } });
    for (const img of imgs) {
      const buf = await storage.getObject((img.variantKeys as any)?.['800'] ?? img.r2Key);
      if (!buf) continue;
      const label = await labelPhoto(userId, { mimeType: 'image/webp', data: buf });
      if (label === 'unsafe') autoReject ??= 'A photo was flagged as unsafe content';
      else if (label === 'unrelated') penalize(40, 'A photo is unrelated to food or venues');
      else if (label === 'people') penalize(25, 'A photo is mainly of people');
    }
  } else if (imageIds.length) reasons.push('Photos not AI-checked');

  // Menu plausibility
  const menuSections: { items: { name: string; priceNgwee: number }[] }[] = p.sections ?? p.menu?.sections ?? [];
  if (menuSections.length) {
    const med = await median();
    let outliers = 0;
    for (const s of menuSections) for (const i of s.items) {
      const extreme = i.priceNgwee < 300 || i.priceNgwee > 150000;
      const vsMedian = med != null && (i.priceNgwee < med / 5 || i.priceNgwee > med * 8);
      if (extreme || vsMedian) { outliers++; if (outliers <= 3) reasons.push(`Unusual price: ${i.name} at K${(i.priceNgwee / 100).toFixed(2)}`); }
    }
    if (outliers) score -= Math.min(40, outliers * 12);
  }

  // Duplicate check for new places
  if (type === 'NEW_PLACE') {
    const dups = await findDuplicates(p.name, p.lat, p.lng);
    if (dups.length) penalize(40, `Possible duplicate of: ${dups.map((d) => d.name).join(', ')}`);
  }

  // Review signals (FR-95)
  if (type === 'REVIEW') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (user && Date.now() - user.createdAt.getTime() < 24 * 3600_000) penalize(10, 'Review from an account under 24 hours old');
    if (targetPlaceId) {
      const recent = await prisma.submission.count({ where: { type: 'REVIEW', targetPlaceId, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
      if (recent >= 3) penalize(20, 'Several reviews on this place within an hour');
      const place = await prisma.place.findUnique({ where: { id: targetPlaceId }, select: { avgSpendPpNgwee: true } });
      if (place?.avgSpendPpNgwee && p.amountPaidNgwee && p.amountPaidNgwee / (p.groupSize ?? 1) > place.avgSpendPpNgwee * 5) penalize(15, 'Amount paid is far above this place\'s average');
    }
    if (p.body && p.body.length > 15) {
      const same = await prisma.review.count({ where: { body: p.body } });
      if (same) penalize(40, 'Review text copied from another review');
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, autoReject };
}

export async function findDuplicates(name: string, lat: number, lng: number) {
  const rows = await prisma.$queryRaw<{ id: string; name: string; slug: string; lat: number; lng: number; sim: number }[]>`
    SELECT id, name, slug, lat, lng, similarity(name, ${name}) AS sim FROM "Place"
    WHERE status IN ('LIVE','PENDING') AND "mergedIntoId" IS NULL
      AND lat BETWEEN ${lat - 0.01} AND ${lat + 0.01} AND lng BETWEEN ${lng - 0.01} AND ${lng + 0.01}
      AND similarity(name, ${name}) > 0.35`;
  return rows
    .map((r) => ({ id: r.id, name: r.name, slug: r.slug, distanceM: Math.round(haversineM(lat, lng, r.lat, r.lng)), similarity: Number(r.sim) }))
    .filter((r) => r.distanceM <= 150 || r.similarity > 0.8)
    .sort((a, b) => b.similarity - a.similarity);
}
