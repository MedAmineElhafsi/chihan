import "server-only";

import { createClient } from "./supabase/server";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: string;
  user_id: string;
  document_url: string;
  note: string | null;
  status: VerificationStatus;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  /** Filled in for the admin queue. */
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  profession: string | null;
};

const COLUMNS =
  "id, user_id, document_url, note, status, decision_note, created_at, decided_at";

function mapRow(
  r: Record<string, unknown>,
  profile?: Record<string, unknown>
): VerificationRequest {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    document_url: String(r.document_url),
    note: (r.note as string | null) ?? null,
    status: r.status as VerificationStatus,
    decision_note: (r.decision_note as string | null) ?? null,
    created_at: String(r.created_at),
    decided_at: (r.decided_at as string | null) ?? null,
    display_name: (profile?.display_name as string | null) ?? null,
    avatar_url: (profile?.avatar_url as string | null) ?? null,
    city: (profile?.city as string | null) ?? null,
    country: (profile?.country as string | null) ?? null,
    profession: (profile?.profession as string | null) ?? null,
  };
}

/** The member's own most recent request, whatever its outcome. */
export async function getMyVerification(
  userId: string
): Promise<VerificationRequest | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("verification_requests")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * The admin queue. RLS already restricts this to admins; a non-admin calling it
 * gets an empty list rather than an error, which is the safer failure.
 */
export async function getVerificationQueue(
  status: VerificationStatus = "pending"
): Promise<VerificationRequest[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("verification_requests")
      .select(COLUMNS)
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error || !data?.length) return [];

    const rows = data as Array<Record<string, unknown>>;
    const ids = [...new Set(rows.map((r) => String(r.user_id)))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, city, country, profession")
      .in("user_id", ids);

    const byUser = new Map<string, Record<string, unknown>>();
    for (const p of (profs ?? []) as Array<Record<string, unknown>>) {
      byUser.set(String(p.user_id), p);
    }
    return rows.map((r) => mapRow(r, byUser.get(String(r.user_id))));
  } catch {
    return [];
  }
}

/**
 * A short-lived link to an applicant's document.
 *
 * The bucket is private, so this is the only way to see one — and the link
 * expires, which matters when the file is somebody's passport.
 */
export async function getDocumentUrl(path: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
