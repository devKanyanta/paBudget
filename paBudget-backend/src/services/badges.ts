import { prisma } from '../db.js';

export const BADGES = [
  { name: 'First Contribution', rule: 'approved>=1' },
  { name: 'Menu Hunter', rule: 'menus>=3' },
  { name: 'Area Explorer', rule: 'places>=3' },
  { name: 'Reviewer', rule: 'reviews>=5' },
];

export async function ensureBadges() {
  for (const b of BADGES) await prisma.badge.upsert({ where: { name: b.name }, create: b, update: { rule: b.rule } });
}

export async function awardBadges(userId: string) {
  await ensureBadges();
  const grouped = await prisma.submission.groupBy({ by: ['type'], where: { userId, status: { in: ['APPROVED', 'AUTO_PUBLISHED'] } }, _count: true });
  const n = (t: string) => grouped.find((g) => g.type === t)?._count ?? 0;
  const approved = grouped.reduce((a, g) => a + g._count, 0);
  const earned: string[] = [];
  if (approved >= 1) earned.push('First Contribution');
  if (n('MENU') >= 3) earned.push('Menu Hunter');
  if (n('NEW_PLACE') >= 3) earned.push('Area Explorer');
  if (n('REVIEW') >= 5) earned.push('Reviewer');
  if (!earned.length) return;
  const badges = await prisma.badge.findMany({ where: { name: { in: earned } } });
  await prisma.userBadge.createMany({ data: badges.map((b) => ({ userId, badgeId: b.id })), skipDuplicates: true });
}
