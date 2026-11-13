import sharp from 'sharp';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import * as storage from './storage.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function presign(userId: string, i: { contentType: string; size: number; purpose: 'photo' | 'menu-scan' }) {
  if (!ALLOWED.includes(i.contentType)) throw badRequest('Only JPEG, PNG or WebP images are allowed');
  if (i.size > config.maxUploadBytes) throw badRequest('Image is larger than 8 MB');
  const img = await prisma.image.create({
    data: { ownerType: 'SUBMISSION', r2Key: 'pending', uploadedById: userId, status: 'PENDING' },
  });
  const rawKey = i.purpose === 'menu-scan' ? `menu-scans/${userId}/${img.id}` : `incoming/${userId}/${img.id}`;
  await prisma.image.update({ where: { id: img.id }, data: { r2Key: rawKey } });
  const target = await storage.presignPut(rawKey, i.contentType);
  return { imageId: img.id, ...target, key: rawKey };
}

/** Called after the client has uploaded. Validates the real file type, strips metadata, makes 400/800 WebP. */
export async function complete(userId: string, imageId: string) {
  const img = await prisma.image.findUnique({ where: { id: imageId } });
  if (!img) throw notFound('Image not found');
  if (img.uploadedById !== userId) throw forbidden();
  if (img.processedAt) return serialize(img);
  const raw = await storage.getObject(img.r2Key);
  if (!raw) throw badRequest('Upload not found; upload the file first');
  if (raw.length > config.maxUploadBytes) { await storage.deleteObject(img.r2Key); throw badRequest('Image is larger than 8 MB'); }
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try { meta = await sharp(raw).metadata(); } catch { await storage.deleteObject(img.r2Key); throw badRequest('Not a valid image'); }
  if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) { await storage.deleteObject(img.r2Key); throw badRequest('Unsupported image type'); }

  // Menu scans stay private and are only used for AI extraction.
  if (img.r2Key.startsWith('menu-scans/')) {
    const updated = await prisma.image.update({ where: { id: img.id }, data: { width: meta.width, height: meta.height, processedAt: new Date() } });
    return { id: updated.id, private: true };
  }

  const base = `images/${img.id}`;
  const pipeline = () => sharp(raw).rotate(); // rotate applies EXIF orientation; output drops all metadata (incl. GPS)
  const [orig, w800, w400] = await Promise.all([
    pipeline().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    pipeline().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
    pipeline().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
  ]);
  const keys = { original: `${base}/original.webp`, '800': `${base}/800.webp`, '400': `${base}/400.webp` };
  await Promise.all([
    storage.putObject(keys.original, orig, 'image/webp'),
    storage.putObject(keys['800'], w800, 'image/webp'),
    storage.putObject(keys['400'], w400, 'image/webp'),
  ]);
  await storage.deleteObject(img.r2Key);
  const updated = await prisma.image.update({
    where: { id: img.id },
    data: { r2Key: keys.original, variantKeys: keys, width: meta.width, height: meta.height, processedAt: new Date() },
  });
  return serialize(updated);
}

export function urls(variantKeys: unknown) {
  const k = variantKeys as Record<string, string> | null;
  if (!k) return null;
  return { thumb: storage.publicUrl(k['400']), medium: storage.publicUrl(k['800']), full: storage.publicUrl(k.original) };
}

export const serialize = (img: { id: string; width: number | null; height: number | null; variantKeys: unknown; status: string }) => ({
  id: img.id, width: img.width, height: img.height, status: img.status, ...(urls(img.variantKeys) ?? {}),
});
