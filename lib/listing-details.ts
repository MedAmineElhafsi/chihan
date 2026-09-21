import "server-only";

import { cache } from "react";

import { createPublicClient } from "./supabase/public";
import { cleanHours } from "./opening-hours";
import type { ListingDetails } from "@/types/listing";

/*
 * Hours, WhatsApp and services live in columns added by migration 0027.
 * Until it has run, these return "not available" and every page that uses
 * them renders exactly as before; the listing form hides the new fields.
 */

/** Whether migration 0027 has run. Asked once per request. */
export const listingDetailsReady = cache(async (): Promise<boolean> => {
  try {
    const { error } = await createPublicClient()
      .from("listings")
      .select("opening_hours")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
});

export async function getListingDetails(
  id: string
): Promise<ListingDetails | null> {
  if (!(await listingDetailsReady())) return null;
  try {
    const { data } = await createPublicClient()
      .from("listings")
      .select("whatsapp, opening_hours, timezone, services")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      whatsapp: (data.whatsapp as string | null) ?? null,
      opening_hours: cleanHours(data.opening_hours),
      timezone: (data.timezone as string | null) ?? null,
      services: ((data.services as string[] | null) ?? []).filter(Boolean),
    };
  } catch {
    return null;
  }
}
