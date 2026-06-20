"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { geocode } from "./geocode";
import { LISTING_CATEGORIES } from "./constants";

const listingSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(2).max(120),
  category: z.string(),
  description: z.string().trim().max(1000).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  photos: z.array(z.string()).max(8).optional().default([]),
});

export type SaveListingInput = z.input<typeof listingSchema>;
export type SaveListingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function saveListing(
  input: SaveListingInput
): Promise<SaveListingResult> {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;
  if (!(LISTING_CATEGORIES as readonly string[]).includes(v.category)) {
    return { ok: false, error: "Invalid category." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const geo = await geocode(
    [v.address, v.city].filter(Boolean).join(", ") || v.city,
    v.country
  );

  const row = {
    name: v.name,
    category: v.category,
    description: v.description || null,
    address: v.address || null,
    city: v.city || null,
    country: v.country || null,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    phone: v.phone || null,
    email: v.email || null,
    website: v.website || null,
    photos: v.photos,
  };

  if (v.id) {
    const { data, error } = await supabase
      .from("listings")
      .update(row)
      .eq("id", v.id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true, id: String(data.id) };
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({ ...row, owner_user_id: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: String(data.id) };
}

export async function claimListing(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("listings")
    .update({ owner_user_id: user.id })
    .eq("id", id)
    .is("owner_user_id", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const reviewSchema = z.object({
  listingId: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(800).optional().default(""),
});

export type SaveReviewResult = { ok: true } | { ok: false; error: string };

export async function saveReview(
  input: z.input<typeof reviewSchema>
): Promise<SaveReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("reviews").upsert(
    { listing_id: v.listingId, author_id: user.id, rating: v.rating, body: v.body || null },
    { onConflict: "listing_id,author_id" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/directory/${v.listingId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteReview(
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("listing_id", listingId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/directory/${listingId}`);
  return { ok: true };
}
