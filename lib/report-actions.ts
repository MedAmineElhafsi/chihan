"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

const TARGET_TABLES: Record<string, string> = {
  listing: "listings",
  post: "posts",
  comment: "post_comments",
  review: "reviews",
};

async function requireAdmin(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Forbidden." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    return { ok: false, error: "Forbidden." };
  }
  return { ok: true, supabase };
}

export async function createReport(
  targetType: string,
  targetId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function banProfile(
  profileId: string
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const svc = createServiceClient();
  const { error } = await svc
    .from("profiles")
    .update({ is_banned: true, is_public: false })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export async function resolveReport(
  reportId: string,
  action: "dismiss" | "remove" | "ban"
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;
  const { supabase } = gate;

  const { data: report } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Report not found." };

  const r = report as { target_type: string; target_id: string };

  if (action === "dismiss") {
    await supabase.from("reports").update({ status: "dismissed" }).eq("id", reportId);
  } else {
    const svc = createServiceClient();
    if (action === "ban" && r.target_type === "profile") {
      await svc
        .from("profiles")
        .update({ is_banned: true, is_public: false })
        .eq("id", r.target_id);
    } else if (r.target_type === "profile") {
      // Don't delete a person — just hide them from discovery.
      await svc.from("profiles").update({ is_public: false }).eq("id", r.target_id);
    } else {
      const table = TARGET_TABLES[r.target_type];
      if (table) await svc.from(table).delete().eq("id", r.target_id);
    }
    await supabase.from("reports").update({ status: "actioned" }).eq("id", reportId);
  }

  revalidatePath("/admin");
  return { ok: true };
}
