// Fictional demo data for local development of the apps. NOT the real seed places.
import { PrismaClient } from '@prisma/client';
import { seedReference } from './seed.js';
import { applyMenu } from '../src/services/submissions.js';
import * as storage from '../src/services/storage.js';
import sharp from 'sharp';

const prisma = new PrismaClient();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const week = (o: string, c: string) => [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: o, closesAt: c }));

const demo = [
  { name: 'Demo Nshima House', area: 'woodlands', cat: 'restaurant', lat: -15.4318, lng: 28.3128, tags: ['family-friendly', 'parking'], hours: week('08:00', '21:00'), phone: '0971000001',
    menu: [['Mains', [['Nshima & Chicken', 6500], ['Nshima & Beef Stew', 6000], ['Village Chicken', 9500]]], ['Drinks', [['Coke 300ml', 1500], ['Mosi Lager', 2500], ['Fresh Juice', 2500]]]] },
  { name: 'Demo Cafe Latte', area: 'kabulonga', cat: 'cafe', lat: -15.4097, lng: 28.3267, tags: ['quiet', 'wi-fi', 'romantic'], hours: week('07:00', '19:00'), phone: '0971000002',
    menu: [['Mains', [['Chicken Wrap', 9500], ['Club Sandwich', 11000], ['Pancake Stack', 8500]]], ['Drinks', [['Cappuccino', 4500], ['Iced Latte', 5500], ['Smoothie', 6000]]]] },
  { name: 'Demo Garden Grill', area: 'east-park', cat: 'restaurant', lat: -15.3956, lng: 28.3227, tags: ['outdoor', 'live-music', 'parking', 'backup-power'], hours: week('11:00', '23:30'), phone: '0971000003',
    menu: [['Mains', [['Ribeye Steak', 24000], ['Grilled Tilapia', 18000], ['Burger & Chips', 14000]]], ['Drinks', [['Draught Beer', 3000], ['House Wine glass', 9000], ['Soda', 2000]]]] },
  { name: 'Demo Chips & Co', area: 'northmead', cat: 'fast-food', lat: -15.4, lng: 28.307, tags: ['lively'], hours: week('09:00', '22:00'), phone: '0971000004',
    menu: [['Meals', [['Chips & Chicken', 5500], ['Burger', 6500], ['Fish & Chips', 7500]]], ['Drinks', [['Soda 500ml', 1200], ['Water', 800]]]] },
  { name: 'Demo Sunset Lounge', area: 'rhodes-park', cat: 'lounge', lat: -15.4057, lng: 28.3017, tags: ['lively', 'live-music', 'outdoor'], hours: [{ weekday: 5, opensAt: '17:00', closesAt: '02:00' }, { weekday: 6, opensAt: '17:00', closesAt: '02:00' }, { weekday: 4, opensAt: '17:00', closesAt: '00:00' }],
    menu: [['Mains', [['Wings Platter', 12000], ['Nachos', 9500]]], ['Cocktails', [['Mojito', 7000], ['Gin & Tonic', 6500]]]] },
  { name: 'Demo Picnic Park', area: 'woodlands', cat: 'activity', lat: -15.435, lng: 28.31, tags: ['outdoor', 'family-friendly', 'quiet'], hours: week('06:00', '18:00'), phone: undefined,
    menu: [['Snacks', [['Popcorn', 1000], ['Ice cream', 2000]]]] },
] as const;

// Stock photos (Unsplash) per demo place, fetched and run through the same WebP pipeline as real uploads.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&fm=jpg`;
const photos: Record<string, string[]> = {
  'demo-nshima-house': ['1504674900247-0877df9cc836', '1476224203421-9ac39bcb3327', '1555396273-367ea4eb4db5'],
  'demo-cafe-latte': ['1495474472287-4d71bcdd2085', '1554118811-1e0d58224f24', '1567620905732-2d1ec7ab7445'],
  'demo-garden-grill': ['1559339352-11d035aa65de', '1544148103-0773bf10d330', '1414235077428-338989a2e8c0'],
  'demo-chips-co': ['1568901346375-23c9450c58cd', '1550547660-d9450f859349', '1513104890138-7c749659a591'],
  'demo-sunset-lounge': ['1514933651103-005eec06c04b', '1517248135467-4c7edcad34c4'],
  'demo-picnic-park': ['1530062845289-9109b2c9c868', '1482049016688-2d3e1b311543'],
};

async function addPhotos(placeId: string, slugKey: string, uploadedById?: string) {
  if (await prisma.image.count({ where: { placeId } })) return;
  let order = 0;
  for (const id of photos[slugKey] ?? []) {
    const res = await fetch(U(id));
    if (!res.ok) { console.warn(`photo ${id}: HTTP ${res.status}, skipped`); continue; }
    const raw = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(raw).metadata();
    const img = await prisma.image.create({ data: { ownerType: 'PLACE', ownerId: placeId, placeId, r2Key: 'pending', uploadedById, status: 'APPROVED', sortOrder: order++ } });
    const base = `images/${img.id}`;
    const keys = { original: `${base}/original.webp`, '800': `${base}/800.webp`, '400': `${base}/400.webp` };
    const make = (w: number, q: number) => sharp(raw).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer();
    const [o, m, t] = await Promise.all([make(1600, 80), make(800, 75), make(400, 70)]);
    await Promise.all([storage.putObject(keys.original, o, 'image/webp'), storage.putObject(keys['800'], m, 'image/webp'), storage.putObject(keys['400'], t, 'image/webp')]);
    await prisma.image.update({ where: { id: img.id }, data: { r2Key: keys.original, variantKeys: keys, width: meta.width, height: meta.height, processedAt: new Date() } });
  }
}

async function main() {
  await seedReference();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  for (const d of demo) {
    const existing = await prisma.place.findUnique({ where: { slug: slug(d.name) } });
    if (existing) { await addPhotos(existing.id, existing.slug, admin?.id); continue; }
    const [area, category, tags] = await Promise.all([
      prisma.area.findUniqueOrThrow({ where: { slug: d.area } }), prisma.category.findUniqueOrThrow({ where: { slug: d.cat } }),
      prisma.tag.findMany({ where: { slug: { in: [...d.tags] } } }),
    ]);
    const place = await prisma.place.create({
      data: {
        name: d.name, slug: slug(d.name), areaId: area.id, categoryId: category.id, lat: d.lat, lng: d.lng, phone: (d as { phone?: string }).phone, whatsapp: (d as { phone?: string }).phone,
        description: 'Fictional demo listing for development.', address: `${area.name}, Lusaka`, status: 'LIVE', source: 'SEED', createdById: admin?.id,
        hours: { create: d.hours.map((h) => ({ ...h })) }, tags: { create: tags.map((t) => ({ tagId: t.id })) },
      },
    });
    await addPhotos(place.id, place.slug, admin?.id);
    await prisma.$transaction((tx) => applyMenu(tx, place.id, { mode: 'merge', sections: d.menu.map(([name, items]) => ({ name, items: items.map(([n, p]) => ({ name: n, priceNgwee: p })) })) }));
  }
  console.log('Demo places ready.');
}
main().finally(() => prisma.$disconnect());
