"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { getEntitlements } from "./entitlements";
import { geocode } from "./geocode";
import { getComments } from "./feed";
import { createNotification } from "./notifications";
import { ticketsConfigured } from "./stripe";
import { ticketsReady } from "./schema-ready";
import type { PostComment } from "@/types/post";

const postSchema = z.object({
  type: z.enum(["post", "event"]),
  body: z.string().trim().max(2000).optional().default(""),
  media: z.array(z.string()).max(4).optional().default([]),
  eventTitle: z.string().trim().max(140).optional().default(""),
  eventAt: z.string().optional().default(""),
  eventLocation: z.string().trim().max(160).optional().default(""),
  /** What a ticket costs, as typed: "10", "10.50". Empty means free. */
  ticketPrice: z.string().trim().max(12).optional().default(""),
  ticketCapacity: z.string().trim().max(7).optional().default(""),
});

export type CreatePostInput = z.input<typeof postSchema>;
export type CreatePostResult =
  | { ok: true; id: string }
  | { ok: false; locked: true }
  | { ok: false; error: string };

export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const ent = await getEntitlements(user.id);
  // Premium gating (also enforced in the UI).
  if (v.type === "event" && !ent.features.createEvents) {
    return { ok: false, locked: true };
  }
  if (v.type === "post" && !ent.features.createPosts) {
    return { ok: false, locked: true };
  }

  if (v.type === "post" && !v.body && v.media.length === 0) {
    return { ok: false, error: "Write something or add a photo." };
  }
  if (v.type === "event" && (!v.eventTitle || !v.eventAt)) {
    return { ok: false, error: "Events need a title and a date." };
  }

  // Tickets, when the organiser asked for them and Stripe can take money.
  let ticketPriceCents: number | null = null;
  let ticketCapacity: number | null = null;
  if (v.type === "event" && (v.ticketPrice || v.ticketCapacity)) {
    if (!ticketsConfigured() || !(await ticketsReady())) {
      return { ok: false, error: "Tickets are not available yet." };
    }
    const price = Number(v.ticketPrice.replace(",", "."));
    const places = Number(v.ticketCapacity);
    if (!Number.isFinite(price) || price < 1) {
      return { ok: false, error: "A ticket costs at least 1." };
    }
    if (!Number.isInteger(places) || places < 1 || places > 100000) {
      return { ok: false, error: "Say how many places there are." };
    }
    ticketPriceCents = Math.round(price * 100);
    ticketCapacity = places;
  }

  let eventLat: number | null = null;
  let eventLng: number | null = null;
  if (v.type === "event" && v.eventLocation) {
    const geo = await geocode(v.eventLocation, null);
    eventLat = geo?.lat ?? null;
    eventLng = geo?.lng ?? null;
  }

  const row: Record<string, unknown> =
    v.type === "event"
      ? {
          author_id: user.id,
          type: "event",
          body: v.body || null,
          event_title: v.eventTitle,
          event_at: new Date(v.eventAt).toISOString(),
          event_location: v.eventLocation || null,
          event_lat: eventLat,
          event_lng: eventLng,
          ...(ticketPriceCents !== null
            ? {
                ticket_price_cents: ticketPriceCents,
                ticket_capacity: ticketCapacity,
              }
            : {}),
        }
      : {
          author_id: user.id,
          type: "post",
          body: v.body || null,
          media: v.media,
        };

  const { data, error } = await supabase
    .from("posts")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/feed");
  return { ok: true, id: String(data.id) };
}

export async function toggleLike(
  postId: string
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    return { ok: true, liked: false };
  }
  await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: user.id });

  const { data: post } = await supabase
    .from("posts")
    .select("author_id, group_id")
    .eq("id", postId)
    .maybeSingle();
  if (post?.author_id && String(post.author_id) !== user.id) {
    const groupId = post.group_id ? String(post.group_id) : null;
    await createNotification({
      userId: String(post.author_id),
      actorId: user.id,
      type: "like",
      entityId: postId,
      link: groupId ? `/groups/${groupId}#board` : "/feed",
    });
  }

  return { ok: true, liked: true };
}

export async function addComment(
  postId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Empty comment." };
  if (text.length > 800) return { ok: false, error: "Comment too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: user.id, body: text });
  if (error) return { ok: false, error: error.message };

  const { data: post } = await supabase
    .from("posts")
    .select("author_id, group_id")
    .eq("id", postId)
    .maybeSingle();
  if (post?.author_id && String(post.author_id) !== user.id) {
    const groupId = post.group_id ? String(post.group_id) : null;
    await createNotification({
      userId: String(post.author_id),
      actorId: user.id,
      type: "comment",
      entityId: postId,
      link: groupId ? `/groups/${groupId}#board` : "/feed",
    });
  }

  if (post?.group_id) revalidatePath(`/groups/${String(post.group_id)}`);
  revalidatePath("/feed");
  return { ok: true };
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  return getComments(postId);
}

export async function deletePost(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("posts")
    .select("group_id")
    .eq("id", postId)
    .maybeSingle();

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

  if (existing?.group_id) revalidatePath(`/groups/${String(existing.group_id)}`);
  revalidatePath("/feed");
  return { ok: true };
}
