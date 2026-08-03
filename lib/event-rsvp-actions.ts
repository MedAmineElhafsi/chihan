"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createNotification } from "./notifications";
import type { RsvpStatus } from "@/types/post";

export async function setEventRsvp(
  postId: string,
  status: RsvpStatus | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: post } = await supabase
    .from("posts")
    .select("id, type, author_id, group_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.type !== "event") {
    return { ok: false, error: "Event not found." };
  }

  if (status == null) {
    const { error } = await supabase
      .from("event_rsvps")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("event_rsvps").upsert(
      {
        post_id: postId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id" }
    );
    if (error) return { ok: false, error: error.message };

    if (
      status === "going" &&
      post.author_id &&
      String(post.author_id) !== user.id
    ) {
      const groupId = post.group_id ? String(post.group_id) : null;
      await createNotification({
        userId: String(post.author_id),
        actorId: user.id,
        type: "message",
        entityId: postId,
        link: groupId ? `/groups/${groupId}#board` : "/feed",
      });
    }
  }

  if (post.group_id) revalidatePath(`/groups/${String(post.group_id)}`);
  revalidatePath("/feed");
  return { ok: true };
}
