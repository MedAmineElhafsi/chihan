import "server-only";

import { isEnabled } from "./features";

/**
 * Google's Cloud Translation (Basic). Chosen because it is the one service
 * that translates both Kurmanji ("ku", since 2016) and Sorani ("ckb", since
 * 2022) — and its codes match this site's locales exactly.
 *
 * The key lives in `.env.local` as GOOGLE_TRANSLATE_API_KEY. Without it the
 * Translate button never appears; nothing else changes.
 */
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

export function translationAvailable(): boolean {
  return (
    isEnabled("translate") && Boolean(process.env.GOOGLE_TRANSLATE_API_KEY)
  );
}

export type Translated = { text: string; detected: string | null };

/** Several texts into one language, in one call. Throws on any failure. */
export async function googleTranslate(
  texts: string[],
  target: string
): Promise<Translated[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("translation is not configured");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // In a header rather than the URL, so it never lands in a log line.
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({ q: texts, target, format: "text" }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`translation failed: ${res.status}`);

  const json = (await res.json()) as {
    data?: {
      translations?: Array<{
        translatedText?: string;
        detectedSourceLanguage?: string;
      }>;
    };
  };
  const list = json.data?.translations ?? [];
  if (list.length !== texts.length) {
    throw new Error("translation failed: unexpected response");
  }
  return list.map((t) => ({
    text: t.translatedText ?? "",
    detected: t.detectedSourceLanguage ?? null,
  }));
}
