"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { geocode } from "./geocode";
import { createNotifications } from "./notifications";

const schema = z.object({
  groupId: z.string().uuid(),
  type: z.enum(["post", "event"]),
  body: z.string().trim().max(2000).optional().default(""),
  media: z.array(z.string()).max(4).optional().default([]),
  eventTitle: z.string().trim().max(140).optional().default(""),
  eventAt: z.string().optional().default(""),
  eventLocation: z.string().trim().max(160).optional().default(""),
});

export type CreateGroupPostInput = z.input<typeof schema>;
export type CreateGroupPostResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createGroupPost(
  input: CreateGroupPostInput
): Promise<CreateGroupPostResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", v.groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Join the group to post." };

  if (v.type === "post" && !v.body && v.media.length === 0) {
    return { ok: false, error: "Write something or add a photo." };
  }
  if (v.type === "event" && (!v.eventTitle || !v.eventAt)) {
    return { ok: false, error: "Events need a title and a date." };
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
          group_id: v.groupId,
          type: "event",
          body: v.body || null,
          event_title: v.eventTitle,
          event_at: new Date(v.eventAt).toISOString(),
          event_location: v.eventLocation || null,
          event_lat: eventLat,
          event_lng: eventLng,
        }
      : {
          author_id: user.id,
          group_id: v.groupId,
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

  const { data: others } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", v.groupId)
    .neq("user_id", user.id)
    .limit(40);
  await createNotifications(
    (others ?? []).map((o) => ({
      userId: String(o.user_id),
      actorId: user.id,
      type: "message" as const,
      entityId: v.groupId,
      link: `/groups/${v.groupId}#board`,
    }))
  );

  revalidatePath(`/groups/${v.groupId}`);
  return { ok: true, id: String(data.id) };
}

export async function deleteGroupPost(
  postId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}
