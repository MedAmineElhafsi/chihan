/** A recorded voice note, as stored beside a message, request or reply. */
export type VoiceNote = {
  /** `<user id>/<uuid>.<ext>` in the private `voice-notes` bucket. */
  path: string;
  /** Length in milliseconds, measured while recording. */
  ms: number;
  /** A coarse waveform, 0–100 per bar; null when none was captured. */
  peaks: number[] | null;
  /** A signed URL, when the server made one while loading the page. */
  url?: string | null;
};

export const VOICE_BUCKET = "voice-notes";

/** Longer than this and it is a speech; the database refuses over 3 minutes. */
export const VOICE_MAX_MS = 3 * 60 * 1000;

/** Shorter than this is a tap on the button, not a message. */
export const VOICE_MIN_MS = 700;

/** Bars in a waveform. The database allows up to 64. */
export const VOICE_BARS = 40;

/** The columns each table carries, for select lists. */
export const VOICE_COLUMNS = "voice_path, voice_ms, voice_peaks";

/** What a server action accepts from the recorder. */
export type VoiceInput = {
  path: string;
  ms: number;
  peaks: number[] | null;
};

/** Reads the three voice columns off a row, or null when it has none. */
export function voiceFromRow(row: Record<string, unknown>): VoiceNote | null {
  const path = row.voice_path;
  if (typeof path !== "string" || !path) return null;
  const peaks = Array.isArray(row.voice_peaks)
    ? (row.voice_peaks as unknown[]).map((p) => Number(p) || 0)
    : null;
  return { path, ms: Number(row.voice_ms) || 0, peaks };
}

/** "1:05" */
export function formatVoiceTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
