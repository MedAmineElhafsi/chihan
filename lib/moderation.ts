import "server-only";

import { createClient } from "./supabase/server";

export type Report = {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export type ReportStatusFilter = "open" | "dismissed" | "actioned" | "all";

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

export async function getReports(
  status: ReportStatusFilter = "open"
): Promise<Report[]> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from("reports")
      .select(
        "id, reporter_id, target_type, target_id, reason, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status !== "all") {
      q = q.eq("status", status);
    }

    const { data } = await q;
    return (data ?? []).map((row) => {
      const r = row as Report;
      return {
        ...r,
        reporter_id: r.reporter_id ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** @deprecated Prefer getReports("open") */
export async function getOpenReports(): Promise<Report[]> {
  return getReports("open");
}
