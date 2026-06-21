import "server-only";

import { createClient } from "./supabase/server";

export type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
  } catch {
    return false;
  }
}

export async function getOpenReports(): Promise<Report[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reports")
      .select("id, target_type, target_id, reason, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as Report[];
  } catch {
    return [];
  }
}
