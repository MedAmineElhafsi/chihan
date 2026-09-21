import { WEEKDAYS, type OpeningHours, type Weekday } from "@/types/listing";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const minutes = (hhmm: string) => {
  const m = TIME.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** What time and day it is where the listing is, not where the reader is. */
function localNow(timezone: string, now: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const day = get("weekday")?.toLowerCase().slice(0, 3) as Weekday;
    const at = Number(get("hour")) * 60 + Number(get("minute"));
    return WEEKDAYS.includes(day) && Number.isFinite(at) ? { day, at } : null;
  } catch {
    // An unknown zone name: better to say nothing than the wrong thing.
    return null;
  }
}

/**
 * Open right now, in the listing's own time zone — a Kurd in Erbil looking
 * at a bakery in Berlin gets Berlin's answer. `null` when the owner has not
 * given enough to know.
 */
export function isOpenNow(
  hours: OpeningHours | null,
  timezone: string | null,
  now = new Date()
): boolean | null {
  if (!hours || !timezone) return null;
  const local = localNow(timezone, now);
  if (!local) return null;

  const i = WEEKDAYS.indexOf(local.day);
  const today = hours[local.day];
  const yesterday = hours[WEEKDAYS[(i + 6) % 7]];
  if (today === undefined && yesterday === undefined) return null;

  // Still inside last night's hours, if they ran past midnight.
  if (yesterday) {
    const o = minutes(yesterday.open);
    const c = minutes(yesterday.close);
    if (o != null && c != null && c <= o && local.at < c) return true;
  }
  if (today) {
    const o = minutes(today.open);
    const c = minutes(today.close);
    if (o == null || c == null) return null;
    return c > o ? local.at >= o && local.at < c : local.at >= o;
  }
  return false;
}

/** The listing's weekday right now, to mark today in the table. */
export function localWeekday(
  timezone: string | null,
  now = new Date()
): Weekday | null {
  return timezone ? (localNow(timezone, now)?.day ?? null) : null;
}

/** Keep only well-formed days; everything else is dropped, not guessed. */
export function cleanHours(input: unknown): OpeningHours | null {
  if (!input || typeof input !== "object") return null;
  const out: OpeningHours = {};
  for (const day of WEEKDAYS) {
    const v = (input as Record<string, unknown>)[day];
    if (v === null) out[day] = null;
    else if (v && typeof v === "object") {
      const { open, close } = v as { open?: unknown; close?: unknown };
      if (
        typeof open === "string" &&
        typeof close === "string" &&
        TIME.test(open) &&
        TIME.test(close) &&
        open !== close
      ) {
        out[day] = { open, close };
      }
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * "0049 151-234 5678", "+49 (151) 2345678" → "+491512345678". Returns null
 * when what remains is not a plausible international number.
 */
export function normaliseWhatsapp(raw: string): string | null {
  let s = raw.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}
