import { GoogleGenAI } from '@google/genai';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

export type AiImage = { mimeType: string; data: Buffer };
export type AiResult = { json: unknown; tokensIn: number; tokensOut: number };
export type AiProvider = (args: { prompt: string; images?: AiImage[] }) => Promise<AiResult>;

let override: AiProvider | null = null;
/** Tests inject a fake provider here. */
export const setAiProvider = (p: AiProvider | null) => { override = p; };
export const aiConfigured = () => !!override || !!config.geminiKey;

let client: GoogleGenAI | null = null;
const geminiProvider: AiProvider = async ({ prompt, images }) => {
  client ??= new GoogleGenAI({ apiKey: config.geminiKey });
  const parts: any[] = [{ text: prompt }, ...(images ?? []).map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data.toString('base64') } }))];
  const r = await client.models.generateContent({ model: config.geminiModel, contents: [{ role: 'user', parts }], config: { responseMimeType: 'application/json', temperature: 0.2 } });
  const text = r.text ?? '';
  return { json: JSON.parse(text), tokensIn: r.usageMetadata?.promptTokenCount ?? 0, tokensOut: r.usageMetadata?.candidatesTokenCount ?? 0 };
};

/** All Gemini calls go through here so every request is logged with token counts (NFR-09). */
export async function aiJson<T = unknown>(kind: string, userId: string | null, args: { prompt: string; images?: AiImage[] }, acc?: { tokensIn: number; tokensOut: number }): Promise<T> {
  if (!aiConfigured()) throw new HttpError(503, 'AI is not configured', 'ai_unavailable');
  const t0 = Date.now();
  const result = await (override ?? geminiProvider)(args);
  if (acc) { acc.tokensIn += result.tokensIn; acc.tokensOut += result.tokensOut; }
  await prisma.aiRequest.create({
    data: { userId, kind, prompt: args.prompt.slice(0, 2000), response: result.json as object, tokensIn: result.tokensIn, tokensOut: result.tokensOut, latencyMs: Date.now() - t0 },
  }).catch(() => {});
  return result.json as T;
}

export type ExtractedMenu = { sections: { name: string; items: { name: string; description?: string; priceNgwee: number }[] }[] };

export async function extractMenu(userId: string, image: AiImage): Promise<ExtractedMenu> {
  const raw = await aiJson<{ sections?: { name?: string; items?: { name?: string; description?: string; price?: number }[] }[] }>('menu_extract', userId, {
    images: [image],
    prompt: `This is a photo of a restaurant menu in Zambia. Extract every item with its price in Zambian kwacha.
Return JSON: {"sections":[{"name":"Mains","items":[{"name":"...","description":"optional","price":45.5}]}]}.
"price" is a number in kwacha (K). Group items under the menu's own section headings (use "Menu" if none). Skip items without a visible price. Never invent items.`,
  });
  const sections = (raw.sections ?? [])
    .map((s) => ({
      name: String(s.name ?? 'Menu').slice(0, 60),
      items: (s.items ?? [])
        .filter((i) => i.name && typeof i.price === 'number' && i.price > 0)
        .map((i) => ({ name: String(i.name).slice(0, 100), description: i.description ? String(i.description).slice(0, 200) : undefined, priceNgwee: Math.round(i.price! * 100) })),
    }))
    .filter((s) => s.items.length);
  return { sections };
}

export type PhotoLabel = 'food' | 'menu' | 'interior' | 'exterior' | 'people' | 'unsafe' | 'unrelated' | 'unknown';

export async function labelPhoto(userId: string, image: AiImage): Promise<PhotoLabel> {
  if (!aiConfigured()) return 'unknown';
  try {
    const r = await aiJson<{ label?: string }>('screening', userId, {
      images: [image],
      prompt: `Classify this photo uploaded to a restaurant guide. Return JSON {"label": X} where X is exactly one of: food, menu, interior, exterior, people (people are the main subject), unsafe (nudity, violence, hate, illegal), unrelated.`,
    });
    const l = r.label as PhotoLabel;
    return ['food', 'menu', 'interior', 'exterior', 'people', 'unsafe', 'unrelated'].includes(l) ? l : 'unknown';
  } catch { return 'unknown'; }
}
