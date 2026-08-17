"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotification } from "./notifications";
import { HELP_CATEGORIES, HELP_URGENCIES } from "./constants";

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
});

export type CreateHelpResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createHelpRequest(
  input: z.input<typeof requestSchema>
): Promise<CreateHelpResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;
  if (!(HELP_CATEGORIES as readonly string[]).includes(v.category)) {
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

  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      author_id: user.id,
      title: v.title,
      body: v.body || null,
      category: v.category,
      urgency,
      city: v.city || null,
      country: v.country || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/help");
  return { ok: true, id: String(data.id) };
}

export async function offerHelp(
  requestId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a message." };
  if (text.length > 1200) return { ok: false, error: "Message too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("help_offers")
    .insert({ request_id: requestId, author_id: user.id, body: text });
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
  const { error } = await supabase
    .from("help_requests")
    .delete()
    .eq("id", requestId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/help");
  return { ok: true };
}
