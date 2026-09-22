"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotification } from "./notifications";
import {
  HELP_CATEGORIES,
  HELP_PHOTO_BUCKET,
  HELP_PHOTOS_MAX,
  HELP_URGENCIES,
  INTERPRET_MEETINGS,
  INTERPRET_SETTINGS,
  SPOKEN_LANGUAGES,
  type HelpCategory,
} from "./constants";
import { isEnabled } from "./features";
import { helpKindsReady } from "./schema-ready";
import {
  notifyAskersOfGive,
  notifyInterpreters,
  notifyPossibleHelpers,
} from "./help-matching";
import { parseVoice, voiceColumns, voiceEnabled } from "./voice";
import { VOICE_BUCKET, type VoiceInput } from "@/types/voice";

/**
 * Asking for help and replying to it are NEVER paywalled. This is the reason
 * newcomers come to Cîhan; blocking it behind a subscription would break the
 * product. Premium sells reach (filters, unlimited browsing, who-viewed), not
 * access to help.
 */

const requestSchema = z.object({
  title: z.string().trim().min(6).max(140),
  body: z.string().trim().max(2000).optional().default(""),
  category: z.string(),
  urgency: z.string().optional().default("normal"),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  /** Checked by parseVoice: it must be the member's own recording. */
  voice: z.unknown().optional(),
  kind: z.enum(["ask", "give"]).optional().default("ask"),
  photos: z
    .array(z.string().max(160))
    .max(HELP_PHOTOS_MAX)
    .optional()
    .default([]),
  interpretFrom: z.string().trim().max(40).optional(),
  interpretTo: z.string().trim().max(40).optional(),
  setting: z.string().optional(),
  meeting: z.string().optional(),
  /** An ISO timestamp from the asker's own clock. */
  neededAt: z.string().max(40).optional(),
});

export type CreateHelpInput = z.input<typeof requestSchema>;

export type CreateHelpResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : null;

/** Whether a category can be asked in, given flags and migrations. */
async function categoryOpen(category: string): Promise<boolean> {
  if (!(HELP_CATEGORIES as readonly string[]).includes(category)) return false;
  if (category === "interpreting") {
    return isEnabled("interpreters") && (await helpKindsReady());
  }
  if (category === "items") {
    return isEnabled("freeItems") && (await helpKindsReady());
  }
  return true;
}

export async function createHelpRequest(
  input: CreateHelpInput
): Promise<CreateHelpResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;
  if (!(await categoryOpen(v.category))) {
    return { ok: false, error: "Invalid category." };
  }
  const urgency = (HELP_URGENCIES as readonly string[]).includes(v.urgency)
    ? v.urgency
    : "normal";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsedVoice = parseVoice(v.voice, user.id);
  if (!parsedVoice.ok) return { ok: false, error: parsedVoice.error };
  const voice = parsedVoice.voice;
  if (voice && !(await voiceEnabled())) {
    return { ok: false, error: "Voice messages are not available yet." };
  }

  // ---- The facts only an interpreter request carries.
  let interpreting: {
    interpret_from: string;
    interpret_to: string;
    setting: string | null;
    meeting: string;
    needed_at: string | null;
  } | null = null;
  if (v.category === "interpreting") {
    const from = oneOf(SPOKEN_LANGUAGES, v.interpretFrom);
    const to = oneOf(SPOKEN_LANGUAGES, v.interpretTo);
    if (!from || !to || from === to) {
      return { ok: false, error: "Choose the two languages." };
    }
    let neededAt: string | null = null;
    if (v.neededAt) {
      const d = new Date(v.neededAt);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid date." };
      }
      // A day's grace for clocks and time zones; older than that has passed.
      if (d.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
        return { ok: false, error: "That date has already passed." };
      }
      neededAt = d.toISOString();
    }
    interpreting = {
      interpret_from: from,
      interpret_to: to,
      setting: oneOf(INTERPRET_SETTINGS, v.setting),
      meeting: oneOf(INTERPRET_MEETINGS, v.meeting) ?? "in_person",
      needed_at: neededAt,
    };
  }

  // ---- Give & Ask: only things are given, and only a give has photos.
  const kind = v.category === "items" ? v.kind : "ask";
  const photoPattern = new RegExp(
    `^${user.id}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp)$`,
    "i"
  );
  const photos = kind === "give" ? v.photos : [];
  if (photos.some((p) => !photoPattern.test(p))) {
    return { ok: false, error: "Invalid photo." };
  }

  const kindsReady = await helpKindsReady();
  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      author_id: user.id,
      title: v.title,
      body: v.body || null,
      category: v.category,
      urgency: kind === "give" ? "normal" : urgency,
      city: v.city || null,
      country: v.country || null,
      ...voiceColumns(voice),
      ...(kindsReady ? { kind, photos } : {}),
      ...(interpreting ?? {}),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  const id = String(data.id);

  // Tap the people who can answer exactly this. Best-effort: a request must
  // still be created if the tap fails.
  if (interpreting) {
    await notifyInterpreters({
      requestId: id,
      askerId: user.id,
      from: interpreting.interpret_from,
      to: interpreting.interpret_to,
      city: v.city || null,
      meeting: interpreting.meeting,
    });
  } else if (kind === "give") {
    await notifyAskersOfGive({
      requestId: id,
      giverId: user.id,
      city: v.city || null,
    });
  } else {
    await notifyPossibleHelpers({
      requestId: id,
      askerId: user.id,
      category: v.category as HelpCategory,
      city: v.city || null,
    });
  }

  revalidatePath("/help");
  return { ok: true, id };
}

/** A reply in words, by voice, or both. */
export async function offerHelp(
  requestId: string,
  body: string,
  voiceInput?: VoiceInput | null
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (text.length > 1200) return { ok: false, error: "Message too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsedVoice = parseVoice(voiceInput, user.id);
  if (!parsedVoice.ok) return { ok: false, error: parsedVoice.error };
  const voice = parsedVoice.voice;
  if (!text && !voice) return { ok: false, error: "Write a message." };

  const { error } = await supabase.from("help_offers").insert({
    request_id: requestId,
    author_id: user.id,
    body: text,
    ...voiceColumns(voice),
  });
  if (error) return { ok: false, error: error.message };

  // Tell the person who asked that help arrived.
  const { data: req } = await supabase
    .from("help_requests")
    .select("author_id")
    .eq("id", requestId)
    .maybeSingle();
  if (req?.author_id && String(req.author_id) !== user.id) {
    await createNotification({
      userId: String(req.author_id),
      actorId: user.id,
      type: "comment",
      entityId: requestId,
      link: `/help/${requestId}`,
    });
  }

  revalidatePath(`/help/${requestId}`);
  revalidatePath("/help");
  return { ok: true };
}

export async function setHelpStatus(
  requestId: string,
  status: "open" | "resolved" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("help_requests")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/help/${requestId}`);
  revalidatePath("/help");
  return { ok: true };
}

export async function deleteHelpRequest(
  requestId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // What the request carried, so its files leave with it.
  const { data: files } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .eq("author_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("help_requests")
    .delete()
    .eq("id", requestId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };

  const row = (files ?? {}) as Record<string, unknown>;
  const voicePath = typeof row.voice_path === "string" ? row.voice_path : null;
  const photos = Array.isArray(row.photos)
    ? (row.photos as unknown[]).filter(
        (p): p is string => typeof p === "string"
      )
    : [];
  // Best-effort: a file left behind is unreadable once nothing points at it.
  await Promise.all([
    voicePath ? supabase.storage.from(VOICE_BUCKET).remove([voicePath]) : null,
    photos.length
      ? supabase.storage.from(HELP_PHOTO_BUCKET).remove(photos)
      : null,
  ]).catch(() => {});

  revalidatePath("/help");
  return { ok: true };
}
