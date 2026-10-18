import "server-only";

import { createClient } from "./supabase/server";
import { isEnabled } from "./features";
import { bazarReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import {
  PRODUCT_COLUMNS,
  SHOP_FILE_BUCKET,
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

/** Everything a maker has put up, in whatever state. */
export async function getMyWork(userId: string): Promise<Product[]> {
  if (!(await bazarReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return decorate(
      supabase,
      (data ?? []) as unknown as Array<Record<string, unknown>>
    );
  } catch {
    return [];
  }
}

export type Sale = {
  product_id: string;
  title: string;
  sold: number;
  gross_cents: number;
  earned_cents: number;
};

export type Owed = {
  earned_cents: number;
  paid_cents: number;
  owed_cents: number;
};

/**
 * What a maker is allowed to know about their sales: how many, and how
 * much. Never a buyer — see 0036 and the note in DECISIONS.md.
 */
export async function getMySales(
  userId: string
): Promise<{ sales: Sale[]; owed: Owed }> {
  const empty = {
    sales: [] as Sale[],
    owed: { earned_cents: 0, paid_cents: 0, owed_cents: 0 },
  };
  if (!(await bazarReady())) return empty;
  try {
    const supabase = await createClient();
    const [{ data: sales }, { data: owed }] = await Promise.all([
      supabase.rpc("shop_sales", { p_seller: userId }),
      supabase.rpc("shop_owed", { p_seller: userId }),
    ]);
    const totals = (Array.isArray(owed) ? owed[0] : owed) as Owed | null;
    return {
      sales: ((sales ?? []) as Array<Record<string, unknown>>).map((r) => ({
        product_id: String(r.product_id),
        title: String(r.title ?? ""),
        sold: Number(r.sold ?? 0),
        gross_cents: Number(r.gross_cents ?? 0),
        earned_cents: Number(r.earned_cents ?? 0),
      })),
      owed: {
        earned_cents: Number(totals?.earned_cents ?? 0),
        paid_cents: Number(totals?.paid_cents ?? 0),
        owed_cents: Number(totals?.owed_cents ?? 0),
      },
    };
  } catch {
    return empty;
  }
}

export type Purchase = {
  id: string;
  product_id: string | null;
  title: string;
  slug: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  expires_at: string;
  /** Null when the link could not be signed — the row still renders. */
  url: string | null;
};

/** What this member has bought, with a link that works now. */
export async function getMyPurchases(userId: string): Promise<Purchase[]> {
  if (!(await bazarReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_orders")
      .select(
        "id, product_id, file_path, amount_cents, currency, status, created_at, expires_at, shop_products(title, slug)"
      )
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const paths = rows
      .filter((r) => r.status === "paid")
      .map((r) => String(r.file_path));
    const links = await signPaths(supabase, SHOP_FILE_BUCKET, paths);

    return rows.map((r) => {
      const p = (
        Array.isArray(r.shop_products) ? r.shop_products[0] : r.shop_products
      ) as { title?: string; slug?: string } | null | undefined;
      return {
        id: String(r.id),
        product_id: (r.product_id as string | null) ?? null,
        title: p?.title ?? "",
        slug: p?.slug ?? null,
        amount_cents: Number(r.amount_cents ?? 0),
        currency: String(r.currency ?? "eur"),
        status: String(r.status ?? "paid"),
        created_at: String(r.created_at),
        expires_at: String(r.expires_at),
        url: links.get(String(r.file_path)) ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** Submissions waiting for somebody to read them. */
export async function getPendingProducts(): Promise<Product[]> {
  if (!(await bazarReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select(PRODUCT_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    return decorate(
      supabase,
      (data ?? []) as unknown as Array<Record<string, unknown>>
    );
  } catch {
    return [];
  }
}

/** Who is owed what, for whoever runs settlement. */
export async function getSettlement(): Promise<
  Array<{ seller_id: string; owed_cents: number; name: string | null }>
> {
  if (!(await bazarReady())) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("shop_settlement");
    const rows = (data ?? []) as Array<{
      seller_id: string;
      owed_cents: number;
    }>;
    if (rows.length === 0) return [];
    const makers = await loadMakers(
      supabase,
      rows.map((r) => String(r.seller_id))
    );
    return rows.map((r) => ({
      seller_id: String(r.seller_id),
      owed_cents: Number(r.owed_cents),
      name: makers.get(String(r.seller_id))?.displayName ?? null,
    }));
  } catch {
    return [];
  }
}
