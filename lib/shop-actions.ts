"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { isAdmin } from "./moderation";
import { bazarReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import { PRODUCT_LICENCES, SHOP_FILE_BUCKET } from "@/types/shop";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Taking a free download.
 *
 * No account, no order, no record of who — a link to the flag pack has to
 * work for somebody who has never heard of Cîhan and is not about to make
 * an account to see a flag. The only thing kept is a number on the work
 * itself, so its maker can see it was wanted.
 *
 * Phase A sells nothing. When paid work arrives this gains a branch that
 * goes through Stripe and writes an order; free stays exactly as it is.
 */
export async function takeDownload(
  productId: string
): Promise<Result<{ url: string }>> {
  if (!(await bazarReady())) return { ok: false, error: "unavailable" };

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_products")
      .select("id, file_path, price_cents, status")
      .eq("id", productId)
      .maybeSingle();
    const product = data as {
      file_path: string | null;
      price_cents: number;
      status: string;
    } | null;

    if (!product?.file_path || product.status !== "listed") {
      return { ok: false, error: "gone" };
    }
    // Phase A: nothing here costs anything. A price means the checkout
    // that does not exist yet, so refuse rather than hand the file over.
    if (product.price_cents > 0) return { ok: false, error: "not_free" };

    // Signed with the reader's own session, so the bucket's policy is what
    // decides — and for free work that policy says anyone.
    const links = await signPaths(supabase, SHOP_FILE_BUCKET, [
      product.file_path,
    ]);
    const url = links.get(product.file_path);
    if (!url) return { ok: false, error: "gone" };

    await supabase.rpc("record_download", { p_product: productId });
    return { ok: true, url };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Stocking the shelf. Administrators only, for now — Phase B opens it up.
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "The address may use a–z, 0–9 and hyphens."
    ),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(20).max(3000),
  licence: z.enum(PRODUCT_LICENCES),
  /** Whose work it is. Empty means the administrator's own. */
  sellerId: z.string().uuid().optional().or(z.literal("")),
  filePath: z.string().trim().min(1).max(500),
  fileBytes: z.number().int().positive().max(104857600),
  fileType: z.string().trim().max(120),
  previewPath: z.string().trim().max(500).optional().default(""),
  status: z.enum(["draft", "listed", "held"]),
});

export type ProductInput = z.input<typeof productSchema>;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return { supabase, user };
}

/** Put something on the shelf, or change what is there. */
export async function saveProduct(
  input: ProductInput
): Promise<Result<{ id: string; slug: string }>> {
  if (!(await bazarReady())) {
    return { ok: false, error: "Run migration 0036 first." };
  }
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Something is missing.",
    };
  }
  const v = parsed.data;

  const row = {
    seller_id: v.sellerId || gate.user.id,
    slug: v.slug,
    title: v.title,
    description: v.description,
    // Phase A gives everything away. The column is here for Phase B.
    price_cents: 0,
    licence: v.licence,
    file_path: v.filePath,
    file_bytes: v.fileBytes,
    file_type: v.fileType,
    preview_path: v.previewPath || null,
    rights_confirmed_at: new Date().toISOString(),
    status: v.status,
  };

  const { data, error } = v.id
    ? await gate.supabase
        .from("shop_products")
        .update(row)
        .eq("id", v.id)
        .select("id, slug")
        .single()
    : await gate.supabase
        .from("shop_products")
        .insert(row)
        .select("id, slug")
        .single();

  if (error) {
    const duplicate = /duplicate key|unique constraint/i.test(error.message);
    return {
      ok: false,
      error: duplicate ? "That address is already taken." : error.message,
    };
  }

  revalidatePath("/bazar");
  revalidatePath(`/bazar/${v.slug}`);
  revalidatePath("/admin/bazar");
  return { ok: true, id: String(data.id), slug: String(data.slug) };
}

/** Take something off the shelf, or put it back. */
export async function setProductStatus(
  id: string,
  status: "listed" | "held" | "draft"
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };

  const { error } = await gate.supabase
    .from("shop_products")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/bazar");
  revalidatePath("/admin/bazar");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };

  const { error } = await gate.supabase
    .from("shop_products")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/bazar");
  revalidatePath("/admin/bazar");
  return { ok: true };
}
