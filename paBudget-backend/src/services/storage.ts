// Object storage: Cloudflare R2 (S3 API) when configured, otherwise local disk for development.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, hasR2 } from '../config.js';

let s3: S3Client | null = null;
const client = () =>
  (s3 ??= new S3Client({
    region: 'auto',
    // Presigned browser PUTs must not bake in a CRC32 of an empty body (the SDK default), or R2 rejects the real upload.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    endpoint: config.r2.endpoint,
    credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
  }));

const localPath = (key: string) => {
  const p = path.resolve(config.uploadDir, key);
  if (!p.startsWith(path.resolve(config.uploadDir) + path.sep)) throw new Error('bad key');
  return p;
};

export const publicUrl = (key: string) =>
  hasR2() && config.r2.publicBase ? `${config.r2.publicBase.replace(/\/$/, '')}/${key}` : `${config.publicUrl}/files/${key}`;

export async function presignPut(key: string, contentType: string) {
  if (hasR2()) {
    const url = await getSignedUrl(client(), new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
    return { uploadUrl: url, method: 'PUT' as const, headers: { 'Content-Type': contentType } };
  }
  return { uploadUrl: `${config.publicUrl}/uploads/raw/${key}`, method: 'PUT' as const, headers: { 'Content-Type': contentType } };
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (hasR2()) {
    await client().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    if (hasR2()) {
      const r = await client().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    }
    return await fs.readFile(localPath(key));
  } catch { return null; }
}

export async function deleteObject(key: string) {
  try {
    if (hasR2()) await client().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    else await fs.rm(localPath(key), { force: true });
  } catch { /* best effort */ }
}
