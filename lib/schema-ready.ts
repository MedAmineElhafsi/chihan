import "server-only";

import { cache } from "react";

import { createPublicClient } from "./supabase/public";

/*
 * New features arrive with their migrations. Until a migration has run its
 * columns do not exist, and selecting one fails the whole query — so each
 * feature asks first, stays hidden until the answer is yes, and every page
 * renders exactly as it did before.
 *
 * A yes is remembered for the life of the server: a column does not stop
 * existing. A no is asked again on the next request, so running the
 * migration switches the feature on without a redeploy.
 */
const known = new Set<string>();

const probe = cache(async (table: string, column: string): Promise<boolean> => {
  const key = `${table}.${column}`;
  if (known.has(key)) return true;
  try {
    const { error } = await createPublicClient()
      .from(table)
      .select(column)
      .limit(1);
    if (error) return false;
    known.add(key);
    return true;
  } catch {
    return false;
  }
});

/** Migration 0028: voice notes on messages, requests and replies. */
export const voiceReady = () => probe("messages", "voice_path");

/** Migration 0030: interpreter requests and Give & Ask. */
export const helpKindsReady = () => probe("help_requests", "kind");

/** Migration 0033: the buddy programme. */
export const buddiesReady = () => probe("buddy_profiles", "role");

/** Migration 0032: city guides. */
export const guidesReady = () => probe("guides", "slug");
