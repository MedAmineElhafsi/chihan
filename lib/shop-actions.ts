"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { isAdmin } from "./moderation";
import { bazarReady } from "./schema-ready";
import { signPaths } from "./signed-urls";
import {
  SHOP_MIN_PRICE_CENTS,
  getStripe,
  shopSellingConfigured,
  siteUrl,
} from "./stripe";
import { PRODUCT_LICENCES, SHOP_FILE_BUCKET } from "@/types/shop";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/**
 * Taking a free download.
 *
 * No account, no order, no record of who — a link to the flag pack has to
 * work for somebody who has never heard of Grêdan and is not about to make
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
  /** In cents. Zero is free, which is a first-class case. */
  priceCents: z.number().int().min(0).max(50000).optional().default(0),
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

  if (v.priceCents > 0) {
    if (!shopSellingConfigured()) {
      return { ok: false, error: "Selling is not switched on yet." };
    }
    if (v.priceCents < SHOP_MIN_PRICE_CENTS) {
      return {
        ok: false,
        error: `The smallest price worth charging is ${SHOP_MIN_PRICE_CENTS / 100}.`,
      };
    }
  }

  const row = {
    seller_id: v.sellerId || gate.user.id,
    slug: v.slug,
    title: v.title,
    description: v.description,
    price_cents: v.priceCents,
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

// ---------------------------------------------------------------------------
// Buying.
//
// Grêdan is the merchant here, not the maker — a download is taxed where the
// buyer is, and nobody should hand an OSS registration to somebody selling
// six posters. Stripe Tax works the rate out and collects it; the maker is
// paid their share afterwards (shop_payouts), not by a destination charge.
// ---------------------------------------------------------------------------

/**
 * Start a checkout.
 *
 * `waived` is the buyer saying, before the button was enabled, that they
 * want the file now and understand that this ends their fortnight's right
 * to change their mind. Without it there is no sale — the table refuses a
 * paid order that does not carry the acknowledgement.
 */
export async function buyProduct(
  productId: string,
  waived: boolean
): Promise<Result<{ url: string }>> {
  if (!shopSellingConfigured() || !(await bazarReady())) {
    return { ok: false, error: "unavailable" };
  }
  if (!waived) return { ok: false, error: "no_waiver" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  try {
    const { data } = await supabase
      .from("shop_products")
      .select(
        "id, seller_id, title, slug, price_cents, currency, status, file_path"
      )
      .eq("id", productId)
      .maybeSingle();
    const product = data as {
      seller_id: string;
      title: string;
      slug: string;
      price_cents: number;
      currency: string;
      status: string;
      file_path: string | null;
    } | null;

    if (!product?.file_path || product.status !== "listed") {
      return { ok: false, error: "gone" };
    }
    if (product.price_cents <= 0) return { ok: false, error: "is_free" };
    if (product.seller_id === user.id) return { ok: false, error: "own_work" };

    // Nothing is bought twice: the file is already theirs.
    const { data: already } = await supabase
      .from("shop_orders")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("product_id", productId)
      .eq("status", "paid")
      .maybeSingle();
    if (already) return { ok: false, error: "already_bought" };

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (product.currency ?? "eur").toLowerCase(),
            unit_amount: product.price_cents,
            // The price on the card is what they pay. Anything else is a
            // surprise at the last step, which is how people abandon a
            // basket and stop trusting a site.
            tax_behavior: "inclusive",
            product_data: {
              name: product.title,
              // "Electronically supplied services". Worth an accountant's
              // eye before the first real sale.
              tax_code: "txcd_10000000",
            },
          },
        },
      ],
      // Stripe works out the rate for where the buyer is and collects it.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      success_url: `${siteUrl()}/bazar/downloads?bought=1`,
      cancel_url: `${siteUrl()}/bazar/${product.slug}`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        kind: "shop",
        product_id: productId,
        buyer_id: user.id,
        seller_id: product.seller_id,
        file_path: product.file_path,
        waived_at: new Date().toISOString(),
      },
    });
    if (!session.url) return { ok: false, error: "failed" };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[bazar] checkout", err);
    return { ok: false, error: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Settlement. Grêdan took the money, so Grêdan sends the share on.
// ---------------------------------------------------------------------------

/**
 * Pay a maker everything outstanding, into the account they connected for
 * tickets. The payout row is written first and only marked sent once Stripe
 * says the transfer went — a crash in between leaves something pending for
 * a person to look at, never a payment nobody recorded.
 */
export async function settleSeller(sellerId: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };
  if (!shopSellingConfigured()) {
    return { ok: false, error: "Selling is not switched on." };
  }

  try {
    const { data: owed } = await gate.supabase
      .rpc("shop_owed", { p_seller: sellerId })
      .maybeSingle();
    const amount = Number(
      (owed as { owed_cents?: number } | null)?.owed_cents ?? 0
    );
    if (amount <= 0) return { ok: false, error: "Nothing outstanding." };

    const svc = createServiceClient();
    const { data: account } = await svc
      .from("payout_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", sellerId)
      .maybeSingle();
    const destination = (
      account as { stripe_account_id?: string | null } | null
    )?.stripe_account_id;
    if (!destination) {
      return { ok: false, error: "They have not connected an account yet." };
    }

    const period = new Date();
    period.setUTCDate(1);
    const { data: payout, error: insertError } = await svc
      .from("shop_payouts")
      .insert({
        seller_id: sellerId,
        period: period.toISOString().slice(0, 10),
        amount_cents: amount,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) {
      const settled = /duplicate key|unique constraint/i.test(
        insertError.message
      );
      return {
        ok: false,
        error: settled ? "This month is already settled." : insertError.message,
      };
    }

    const transfer = await getStripe().transfers.create({
      amount,
      currency: "eur",
      destination,
      metadata: { payout_id: String(payout.id), seller_id: sellerId },
    });

    await svc
      .from("shop_payouts")
      .update({
        status: "sent",
        stripe_transfer_id: transfer.id,
        sent_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    revalidatePath("/admin/bazar");
    return { ok: true };
  } catch (err) {
    console.error("[bazar] settle", err);
    return { ok: false, error: "The transfer failed." };
  }
}

/** An administrator's verdict on a submission. */
export async function decideProduct(
  productId: string,
  approve: boolean,
  note?: string
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate) return { ok: false, error: "Forbidden." };

  const { error } = await gate.supabase.rpc("decide_product", {
    p_product: productId,
    p_approve: approve,
    p_note: note ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/bazar");
  revalidatePath("/admin/bazar");
  return { ok: true };
}
