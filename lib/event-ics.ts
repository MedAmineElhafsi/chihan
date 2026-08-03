import type { FeedItem } from "@/types/post";

function icsEscape(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Build a minimal VCALENDAR/VEVENT for an event feed item. */
export function buildEventIcs(item: FeedItem): string | null {
  if (item.type !== "event" || !item.event_at || !item.event_title) return null;
  const start = toIcsUtc(item.event_at);
  const endDate = new Date(item.event_at);
  endDate.setHours(endDate.getHours() + 2);
  const end = toIcsUtc(endDate.toISOString());
  const stamp = toIcsUtc(new Date().toISOString());
  const uid = `${item.id}@cihan.app`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cihan//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(item.event_title)}`,
  ];
  if (item.event_location) {
    lines.push(`LOCATION:${icsEscape(item.event_location)}`);
  }
  if (item.body) {
    lines.push(`DESCRIPTION:${icsEscape(item.body)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadEventIcs(item: FeedItem) {
  const ics = buildEventIcs(item);
  if (!ics) return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(item.event_title || "event").replace(/[^\w\-]+/g, "_").slice(0, 40)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
