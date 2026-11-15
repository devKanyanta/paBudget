import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { haversineM, isOpenAt, priceLevelFor } from '../lib/util.js';
import { computeAvgSpend } from './avgspend.js';
import { notFound } from '../lib/errors.js';
import { urls } from './images.js';

export type ListQuery = {
  q?: string; area?: string; category?: string; tags?: string[];
  maxPpNgwee?: number; groupSize?: number; totalBudgetNgwee?: number;
  openNow?: boolean; lat?: number; lng?: number;
  sort?: 'cheapest' | 'nearest' | 'rating' | 'newest';
  ids?: string[];
  limit: number; offset: number;
};

async function textMatchIds(q: string): Promise<Set<string>> {
  const like = `%${q}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM "Place" p WHERE p.name ILIKE ${like} OR word_similarity(${q}, p.name) > 0.4
    UNION SELECT m."placeId" FROM "MenuItem" m WHERE m.name ILIKE ${like}
    UNION SELECT p.id FROM "Place" p JOIN "Area" a ON a.id = p."areaId" WHERE a.name ILIKE ${like}`;
  return new Set(rows.map((r) => r.id));
}

const coverInclude = { where: { status: 'APPROVED' as const }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }], take: 1 };

export async function ratingMap(placeIds: string[]) {
  const g = await prisma.review.groupBy({ by: ['placeId'], where: { placeId: { in: placeIds }, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
  return new Map(g.map((r) => [r.placeId, { rating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, ratingCount: r._count }]));
}

export async function listPlaces(q: ListQuery) {
  const where: Prisma.PlaceWhereInput = { status: 'LIVE', mergedIntoId: null };
  if (q.area) where.area = { slug: q.area };
  if (q.category) where.category = { slug: q.category };
  if (q.tags?.length) where.AND = q.tags.map((t) => ({ tags: { some: { tag: { slug: t } } } }));
  const maxPp = q.maxPpNgwee ?? (q.totalBudgetNgwee && q.groupSize ? Math.floor(q.totalBudgetNgwee / q.groupSize) : undefined);
  if (maxPp != null) where.avgSpendPpNgwee = { lte: maxPp };
  if (q.q) where.id = { in: [...(await textMatchIds(q.q))] };
  if (q.ids) where.id = q.q ? { in: [...(where.id as { in: string[] }).in].filter((i) => q.ids!.includes(i)) } : { in: q.ids };

  const rows = await prisma.place.findMany({
    where,
    include: { category: true, area: true, hours: true, tags: { include: { tag: true } }, images: coverInclude },
  });
  const ratings = await ratingMap(rows.map((r) => r.id));
  const now = new Date();
  let items = rows.map((p) => {
    const openNow = isOpenAt(p.hours, now);
    const distanceM = q.lat != null && q.lng != null ? Math.round(haversineM(q.lat, q.lng, p.lat, p.lng)) : null;
    const r = ratings.get(p.id);
    return {
      id: p.id, name: p.name, slug: p.slug, category: p.category.name, area: p.area.name, areaSlug: p.area.slug,
      priceLevel: p.priceLevel, avgSpendPpNgwee: p.avgSpendPpNgwee, isFeatured: p.isFeatured,
      menuUpdatedAt: p.menuUpdatedAt, lat: p.lat, lng: p.lng,
      thumb: p.images[0] ? urls(p.images[0].variantKeys)?.thumb ?? null : null,
      tags: p.tags.map((t) => t.tag.slug), openNow, distanceM,
      rating: r?.rating ?? null, ratingCount: r?.ratingCount ?? 0, createdAt: p.createdAt,
    };
  });
  if (q.openNow) items = items.filter((i) => i.openNow === true);
  const sort = q.sort ?? (q.lat != null ? 'nearest' : 'rating');
  const byFeatured = (a: { isFeatured: boolean }, b: { isFeatured: boolean }) => Number(b.isFeatured) - Number(a.isFeatured);
  items.sort((a, b) => {
    if (sort === 'cheapest') return (a.avgSpendPpNgwee ?? 1e12) - (b.avgSpendPpNgwee ?? 1e12);
    if (sort === 'nearest') return (a.distanceM ?? 1e12) - (b.distanceM ?? 1e12);
    if (sort === 'newest') return b.createdAt.getTime() - a.createdAt.getTime();
    return byFeatured(a, b) || (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount;
  });
  const total = items.length;
  const page = items.slice(q.offset, q.offset + q.limit).map(({ createdAt, ...rest }) => rest);
  return { total, items: page };
}

export async function getPlace(idOrSlug: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const p = await prisma.place.findFirst({
    where: { status: 'LIVE', ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }) },
    include: {
      category: true, area: true, hours: { orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
      tags: { include: { tag: true } },
      images: { where: { status: 'APPROVED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { uploadedBy: { select: { name: true } } } },
      sections: { orderBy: { sortOrder: 'asc' }, include: { items: { where: { isAvailable: true }, orderBy: { priceNgwee: 'asc' } } } },
      deals: { where: { startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, orderBy: { endsAt: 'asc' } },
    },
  });
  if (!p) throw notFound('Place not found');
  const [rating, menuSub, itemImages] = await Promise.all([
    ratingMap([p.id]),
    prisma.submission.findFirst({ where: { type: 'MENU', targetPlaceId: p.id, status: { in: ['APPROVED', 'AUTO_PUBLISHED'] } }, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
    prisma.image.findMany({ where: { id: { in: p.sections.flatMap((s) => s.items.map((i) => i.imageId).filter(Boolean) as string[]) } } }),
  ]);
  const itemImg = new Map(itemImages.map((i) => [i.id, urls(i.variantKeys)?.thumb ?? null]));
  const r = rating.get(p.id);
  return {
    id: p.id, name: p.name, slug: p.slug, description: p.description, address: p.address,
    category: p.category.name, categorySlug: p.category.slug, area: p.area.name, areaSlug: p.area.slug,
    lat: p.lat, lng: p.lng, phone: p.phone, whatsapp: p.whatsapp,
    priceLevel: p.priceLevel, avgSpendPpNgwee: p.avgSpendPpNgwee, isFeatured: p.isFeatured,
    closedPermanently: p.closedPermanently, menuUpdatedAt: p.menuUpdatedAt,
    menuAddedBy: menuSub?.user.name ?? null,
    openNow: isOpenAt(p.hours), hours: p.hours.map((h) => ({ weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt })),
    tags: p.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name, type: t.tag.type })),
    images: p.images.map((i) => ({ id: i.id, width: i.width, height: i.height, ...(urls(i.variantKeys) ?? {}), by: i.uploadedBy?.name ?? null })),
    menu: p.sections.map((s) => ({
      id: s.id, name: s.name,
      items: s.items.map((i) => ({ id: i.id, name: i.name, description: i.description, priceNgwee: i.priceNgwee, lastConfirmedAt: i.lastConfirmedAt, image: i.imageId ? itemImg.get(i.imageId) ?? null : null })),
    })),
    deals: p.deals.map((d) => ({ id: d.id, title: d.title, priceNgwee: d.priceNgwee, endsAt: d.endsAt })),
    rating: r?.rating ?? null, ratingCount: r?.ratingCount ?? 0,
  };
}

export async function placeReviews(placeId: string, limit: number, offset: number) {
  const rows = await prisma.review.findMany({
    where: { placeId, status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
    include: { user: { select: { name: true } } },
  });
  const imgIds = rows.flatMap((r) => r.imageIds);
  const imgs = imgIds.length ? await prisma.image.findMany({ where: { id: { in: imgIds }, status: 'APPROVED' } }) : [];
  const m = new Map(imgs.map((i) => [i.id, urls(i.variantKeys)]));
  return rows.map((r) => ({
    id: r.id, rating: r.rating, body: r.body, amountPaidNgwee: r.amountPaidNgwee, groupSize: r.groupSize,
    itemsOrdered: r.itemsOrdered, vibeTags: r.vibeTags, author: r.user.name, createdAt: r.createdAt, ownerReply: r.ownerReply,
    images: r.imageIds.map((id) => m.get(id)).filter(Boolean),
  }));
}

/** Recalculates the average spend per person from the place's menu. */
export async function recalcAvgSpend(placeId: string) {
  const items = await prisma.menuItem.findMany({ where: { placeId, isAvailable: true }, include: { section: true } });
  if (!items.length) return;
  const avg = computeAvgSpend(items.map((i) => ({ price: i.priceNgwee, section: i.section.name })));
  await prisma.place.update({ where: { id: placeId }, data: { avgSpendPpNgwee: avg, priceLevel: priceLevelFor(avg), menuUpdatedAt: new Date() } });
}
