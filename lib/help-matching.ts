import "server-only";

import { createClient } from "./supabase/server";
import { createNotifications } from "./notifications";
import type { HelpCategory } from "./constants";

/**
 * Tell the people who said they could help that someone needs it.
 *
 * Onboarding collects "I can offer: housing help, job leads, local tips…" and
 * until now nothing read it. A request sat on a board hoping to be noticed,
 * which is the difference between a noticeboard and a network — and the
 * reason a help board dies: one person asks, nobody happens to look, they
 * never come back.
 */

/** Which offering tags actually answer each kind of request. */
const OFFERS_FOR: Record<HelpCategory, readonly string[]> = {
  housing: ["housing_help", "local_tips"],
  work: ["job_leads", "mentorship"],
  language: ["language_help"],
  paperwork: ["local_tips", "mentorship"],
  health: ["local_tips"],
  education: ["mentorship", "local_tips"],
  family: ["friendship", "local_tips"],
  legal: ["local_tips", "business_help"],
  transport: ["local_tips", "volunteering"],
  other: ["local_tips", "friendship"],
  // Interpreter requests have their own matcher below; this is its fallback.
  interpreting: ["interpreting", "language_help"],
  // An ask for things reaches volunteers; a give reaches the askers.
  items: ["volunteering"],
};

/**
 * A shoulder-tap must stay rare to keep meaning anything. Notifying fifty
 * people trains all fifty to ignore the next one.
 */
const MAX_RECIPIENTS = 12;

export async function notifyPossibleHelpers(opts: {
  requestId: string;
  askerId: string;
  category: HelpCategory;
  city: string | null;
}): Promise<number> {
  const wanted = OFFERS_FOR[opts.category] ?? OFFERS_FOR.other;

  try {
    const supabase = await createClient();

    // Same city first: help with an Ausländerbehörde appointment is worthless
    // from another country. Without a city we cannot target, so we do not
    // notify at all rather than spray everyone.
    if (!opts.city) return 0;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, offering")
      .ilike("city", opts.city)
      .neq("user_id", opts.askerId)
      .not("offering", "is", null)
      .limit(200);

    if (error) {
      console.error("[help-match] lookup failed:", error.message);
      return 0;
    }

    const recipients = (data ?? [])
      .filter((row) => {
        const offering = (row as { offering?: string[] | null }).offering ?? [];
        return offering.some((o) => wanted.includes(o));
      })
      .slice(0, MAX_RECIPIENTS)
      .map((row) => String((row as { user_id: string }).user_id));

    if (recipients.length === 0) return 0;

    await createNotifications(
      recipients.map((userId) => ({
        userId,
        actorId: opts.askerId,
        type: "help_match" as const,
        entityId: opts.requestId,
        link: `/help/${opts.requestId}`,
      }))
    );

    return recipients.length;
  } catch (err) {
    // A request must still be created if the shoulder-tap fails.
    console.error("[help-match] threw:", err);
    return 0;
  }
}

/**
 * An interpreter request goes to members who speak both languages and said
 * they can help with language — people who ticked "Interpreting" first.
 *
 * In person, they must be in the same city. By phone or video, anywhere will
 * do: a Sorani speaker in Hamburg can interpret a call in Munich.
 */
export async function notifyInterpreters(opts: {
  requestId: string;
  askerId: string;
  from: string;
  to: string;
  city: string | null;
  meeting: string | null;
}): Promise<number> {
  const remote = opts.meeting === "phone" || opts.meeting === "video";
  if (!remote && !opts.city) return 0;

  try {
    const supabase = await createClient();
    let q = supabase
      .from("profiles")
      .select("user_id, offering")
      .contains("languages", [opts.from, opts.to])
      .overlaps("offering", ["interpreting", "language_help"])
      .neq("user_id", opts.askerId)
      .limit(200);
    if (!remote && opts.city) q = q.ilike("city", opts.city);

    const { data, error } = await q;
    if (error) {
      console.error("[interpreter-match] lookup failed:", error.message);
      return 0;
    }

    const rows = (data ?? []) as Array<{
      user_id: string;
      offering: string[] | null;
    }>;
    // Those who said "I can interpret" before those who help with language.
    rows.sort(
      (a, b) =>
        Number((b.offering ?? []).includes("interpreting")) -
        Number((a.offering ?? []).includes("interpreting"))
    );
    const recipients = rows
      .slice(0, MAX_RECIPIENTS)
      .map((r) => String(r.user_id));
    if (recipients.length === 0) return 0;

    await createNotifications(
      recipients.map((userId) => ({
        userId,
        actorId: opts.askerId,
        type: "interpreter_match" as const,
        entityId: opts.requestId,
        link: `/help/${opts.requestId}`,
      }))
    );
    return recipients.length;
  } catch (err) {
    console.error("[interpreter-match] threw:", err);
    return 0;
  }
}

/**
 * Someone is giving something away: tell the people in that city who are
 * asking for things. They asked; this is the one notification they want.
 */
export async function notifyAskersOfGive(opts: {
  requestId: string;
  giverId: string;
  city: string | null;
}): Promise<number> {
  if (!opts.city) return 0;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("help_requests")
      .select("author_id")
      .eq("category", "items")
      .eq("kind", "ask")
      .eq("status", "open")
      .ilike("city", opts.city)
      .neq("author_id", opts.giverId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[give-match] lookup failed:", error.message);
      return 0;
    }
    const recipients = [
      ...new Set((data ?? []).map((r) => String(r.author_id))),
    ].slice(0, MAX_RECIPIENTS);
    if (recipients.length === 0) return 0;

    await createNotifications(
      recipients.map((userId) => ({
        userId,
        actorId: opts.giverId,
        type: "give_match" as const,
        entityId: opts.requestId,
        link: `/help/${opts.requestId}`,
      }))
    );
    return recipients.length;
  } catch (err) {
    console.error("[give-match] threw:", err);
    return 0;
  }
}
