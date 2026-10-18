import "server-only";

import { createClient } from "./supabase/server";
import { isEnabled } from "./features";
import { bazarReady } from "./schema-ready";
import {
  PRODUCT_COLUMNS,
  SHOP_PREVIEW_BUCKET,
  toProduct,
  type Product,
} from "@/types/shop";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The Bazar is switched on and migration 0036 has run. */
export async function bazarEnabled(): Promise<boolean> {
  return isEnabled("bazar") && (await bazarReady());
}

/** Previews live in a public bucket, so a card needs no signing. */
function previewUrl(supabase: Supabase, path: unknown): string | null {
  if (typeof path !== "string" || !path) return null;
  return (
    supabase.storage.from(SHOP_PREVIEW_BUCKET).getPublicUrl(path).data
      .publicUrl ?? null
  );
}

/** Who made it, as far as a reader may see them. */
async function loadMakers(
  supabase: Supabase,
  userIds: string[]
): Promise<Map<string, Product["maker"]>> {
  const out = new Map<string, Product["maker"]>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return out;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url")
      .in("user_id", unique);
    for (const p of (data ?? []) as Array<Record<string, unknown>>) {
      out.set(String(p.user_id), {
        userId: String(p.user_id),
        profileId: String(p.id),
        displayName: (p.display_name as string | null) ?? null,
        avatarUrl: (p.avatar_url as string | null) ?? null,
      });
    }
  } catch {
    // A card without a name still works.
  }
  return out;
}

async function decorate(
  supabase: Supabase,
  rows: Array<Record<string, unknown>>
): Promise<Product[]> {
  const products = rows.map((r) =>
    toProduct(r, previewUrl(supabase, r.preview_path))
  );
  const makers = await loadMakers(
    supabase,
    products.map((p) => p.seller_id)
  );
  return products.map((p) => ({
    ...p,
    maker: makers.get(p.seller_id) ?? null,
  }));
}

/**
 * What is on the shelf. Read with the anonymous client, because the whole
 * point of the free work is that a link to it opens for somebody who has
 * never heard of Cîhan.
 */
export async function getProducts(): Promise<Product[]> {
  if (!(await bazarEnabled())) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "listed")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error || !data) return [];
    return decorate(
      supabase,
      data as unknown as Array<Record<string, unknown>>
    );
  } catch {
    return [];
  }
}

/** One piece of work by its address. */
export async function getProduct(slug: string): Promise<Product | null> {
  if (!(await bazarEnabled())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    const [product] = await decorate(supabase, [
      data as unknown as Record<string, unknown>,
    ]);
    return product ?? null;
  } catch {
    return null;
  }
}

/** Everything, in every state — for the administrator who stocks it. */
export async function getAllProducts(): Promise<Product[]> {
  if (!(await bazarReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    return decorate(
      supabase,
      (data ?? []) as unknown as Array<Record<string, unknown>>
    );
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!(await bazarReady())) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const [product] = await decorate(supabase, [
      data as unknown as Record<string, unknown>,
    ]);
    return product ?? null;
  } catch {
    return null;
  }
}
