/**
 * Wrap a value that goes into a translated sentence — a name, a date, a
 * note someone typed — in Unicode first-strong isolates, so its direction
 * is its own. Without it, "From Mohamed · 21/09/2026" inside an Arabic
 * sentence reorders into "2026/09/Mohamed · 21".
 */
export function isolate(value: string): string {
  return `⁨${value}⁩`;
}
