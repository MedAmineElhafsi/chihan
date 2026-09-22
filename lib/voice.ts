import "server-only";

import { z } from "zod";

import { isEnabled } from "./features";
import { voiceReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import {
  VOICE_BUCKET,
  VOICE_MAX_MS,
  type VoiceInput,
  type VoiceNote,
} from "@/types/voice";

/** Voice notes are switched on and their migration (0028) has run. */
export async function voiceEnabled(): Promise<boolean> {
  return isEnabled("voice") && (await voiceReady());
}

/** `<user id>/<uuid>.<ext>`, the only shape the recorder produces. */
const PATH =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f-]{36}\.(webm|ogg|m4a|mp4|aac|mp3)$/i;

const schema = z.object({
  path: z.string().max(120),
  ms: z.number().int().min(500).max(VOICE_MAX_MS),
  peaks: z.array(z.number().int().min(0).max(100)).max(64).nullable(),
});

export type ParsedVoice =
  | { ok: true; voice: VoiceInput | null }
  | { ok: false; error: string };

/**
 * A note from the recorder, checked before it is stored: it must be one of
 * the signed-in member's own files. The database refuses anything else as
 * well; checking here turns that refusal into a sentence.
 */
export function parseVoice(input: unknown, userId: string): ParsedVoice {
  if (input == null) return { ok: true, voice: null };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid voice message." };
  const match = PATH.exec(parsed.data.path);
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) {
    return { ok: false, error: "Invalid voice message." };
  }
  return { ok: true, voice: parsed.data };
}

/** The three columns a row stores for a note. */
export function voiceColumns(voice: VoiceInput | null) {
  return voice
    ? {
        voice_path: voice.path,
        voice_ms: voice.ms,
        voice_peaks: voice.peaks,
      }
    : {};
}

/** Gives each note a link, in one request, with the viewer's session. */
export async function signVoiceNotes(
  supabase: Parameters<typeof signPaths>[0],
  notes: Array<VoiceNote | null | undefined>
): Promise<void> {
  const present = notes.filter((n): n is VoiceNote => Boolean(n));
  if (present.length === 0) return;
  const urls = await signPaths(
    supabase,
    VOICE_BUCKET,
    present.map((n) => n.path)
  );
  for (const n of present) n.url = urls.get(n.path) ?? null;
}
