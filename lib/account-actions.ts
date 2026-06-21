"use server";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * Full account erasure (GDPR). Deletes the auth user; all owned rows cascade
 * via their `on delete cascade` foreign keys. Requires the service role.
 */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  try {
    const svc = createServiceClient();
    const { error } = await svc.auth.admin.deleteUser(user.id);
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete account.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
