import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const areas: [string, number, number][] = [
  ['Woodlands', -15.4318, 28.3128], ['Kabulonga', -15.4097, 28.3267], ['East Park', -15.3956, 28.3227],
  ['Rhodes Park', -15.4057, 28.3017], ['Northmead', -15.4000, 28.3070], ['Roma', -15.3897, 28.3340],
  ['Olympia Park', -15.4231, 28.3201], ['Longacres', -15.4189, 28.3000], ['Chilenje', -15.4440, 28.3210], ['Kalingalinga', -15.3920, 28.3460],
];
const categories = ['Restaurant', 'Cafe', 'Lounge', 'Fast food', 'Activity'];
const tags: [string, 'VIBE' | 'FEATURE'][] = [
  ['Quiet', 'VIBE'], ['Outdoor', 'VIBE'], ['Live music', 'VIBE'], ['Family-friendly', 'VIBE'], ['Romantic', 'VIBE'], ['Lively', 'VIBE'],
  ['Parking', 'FEATURE'], ['Wi-Fi', 'FEATURE'], ['Backup power', 'FEATURE'], ['Kids play area', 'FEATURE'],
];
const badges = [
  { name: 'First Contribution', rule: 'approved>=1' }, { name: 'Menu Hunter', rule: 'menus>=3' },
  { name: 'Area Explorer', rule: 'places>=3' }, { name: 'Reviewer', rule: 'reviews>=5' },
];

export async function seedReference() {
  for (const [name, lat, lng] of areas) await prisma.area.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), lat, lng }, update: {} });
  for (const name of categories) await prisma.category.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name) }, update: {} });
  for (const [name, type] of tags) await prisma.tag.upsert({ where: { slug: slug(name) }, create: { name, slug: slug(name), type }, update: {} });
  for (const b of badges) await prisma.badge.upsert({ where: { name: b.name }, create: b, update: {} });
}

async function main() {
  await seedReference();
  const email = process.env.ADMIN_EMAIL ?? 'admin@pabudget.local';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  if (!(await prisma.user.findUnique({ where: { email } }))) {
    await prisma.user.create({
      data: { name: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'ADMIN', stats: { create: { trustLevel: 'TRUSTED' } } },
    });
    console.log(`Created admin ${email} (change the password!)`);
  }
  console.log('Reference data seeded.');
}

if (process.argv[1]?.endsWith('seed.ts')) main().finally(() => prisma.$disconnect());
