import "server-only";

import { createServiceClient } from "./supabase/service";

export type InviteByToken = {
  id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  inviter: {
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

/** Public invite lookup via service role (token is the secret). */
export async function getInviteByToken(
  token: string
): Promise<InviteByToken | null> {
  if (!token || token.length < 16) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_invites")
      .select("id, email, token, status, expires_at, inviter_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return null;

    const inviterId = String(data.inviter_id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", inviterId)
      .maybeSingle();

    return {
      id: String(data.id),
      email: String(data.email),
      token: String(data.token),
      status: String(data.status),
      expires_at: String(data.expires_at),
      inviter: {
        userId: inviterId,
        displayName: (profile?.display_name as string | null) ?? null,
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
      },
    };
  } catch {
    return null;
  }
}
