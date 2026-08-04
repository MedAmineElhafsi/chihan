"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";
import { supabaseConfigured } from "./env";

/** Clear session cookies without waiting on the Auth API. */
async function clearSessionLocally() {
  if (!supabaseConfigured) return;
  try {
    const supabase = await createClient();
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // Still redirect — better than a stuck Sign out button.
  }
}

/** Sign out and send the user home (localized by proxy). */
export async function signOutAction() {
  await clearSessionLocally();
  revalidatePath("/", "layout");
  redirect("/");
}
