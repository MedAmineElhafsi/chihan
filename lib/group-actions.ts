"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { geocode } from "./geocode";

const groupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  // Private by default: a group made without thinking about privacy
  // should not be the one that leaks.
  isPrivate: z.boolean().optional().default(true),
});

export type CreateGroupInput = z.input<typeof groupSchema>;
export type CreateGroupResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createGroup(
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const geo = await geocode(v.city || null, v.country || null);

  const { data, error } = await supabase
    .from("community_groups")
    .insert({
      name: v.name,
      description: v.description || null,
      city: v.city || null,
      country: v.country || null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      created_by: user.id,
      is_private: v.isPrivate,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create group." };
  }

  const groupId = String(data.id);
  const { error: memberErr } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "owner",
  });
  if (memberErr) {
    // Roll back the orphan group if membership fails.
    await supabase.from("community_groups").delete().eq("id", groupId);
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/groups");
  return { ok: true, id: groupId };
}

export async function joinGroup(
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "member",
  });
  if (error) {
    // Already a member → treat as success.
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { ok: true };
}

export async function leaveGroup(
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .neq("role", "owner");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return { ok: true };
}
