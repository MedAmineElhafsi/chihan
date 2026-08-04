"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { createClient } from "./supabase/server";
import { BRAND } from "./constants";

const emailSchema = z.string().trim().email().max(254);

export type AppInviteRow = {
  id: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  expires_at: string;
};

export type CreateAppInviteResult =
  | { ok: true; link: string; emailed: boolean }
  | { ok: false; error: string };

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

async function sendInviteEmail(
  to: string,
  link: string,
  inviterName: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${BRAND.name} <onboarding@resend.dev>`,
        to: [to],
        subject: `${inviterName} invited you to ${BRAND.name}`,
        html: `<p><strong>${inviterName}</strong> invited you to join ${BRAND.name}.</p>
<p><a href="${link}">Accept invitation</a></p>
<p>Or copy this link: ${link}</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createAppInvite(
  email: string
): Promise<CreateAppInviteResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const locale = await getLocale();
  const token = randomBytes(24).toString("hex");
  const link = `${siteBase()}/${locale}/invite/${token}`;

  const { error } = await supabase.from("app_invites").insert({
    inviter_id: user.id,
    email: parsed.data.toLowerCase(),
    token,
  });
  if (error) return { ok: false, error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const inviterName =
    (profile?.display_name as string | null)?.trim() || BRAND.name;

  const emailed = await sendInviteEmail(parsed.data, link, inviterName);

  revalidatePath("/settings/invite");
  return { ok: true, link, emailed };
}

export async function listMyInvites(): Promise<AppInviteRow[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("app_invites")
      .select("id, email, token, status, created_at, expires_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      email: String(r.email),
      token: String(r.token),
      status: r.status as AppInviteRow["status"],
      created_at: String(r.created_at),
      expires_at: String(r.expires_at),
    }));
  } catch {
    return [];
  }
}

export async function revokeInvite(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("app_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("inviter_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/invite");
  return { ok: true };
}
