"use server";

import { createClient } from "./supabase/server";
import { PRICE_IDS, getStripe, siteUrl, stripeConfigured } from "./stripe";

type ActionResult = { ok: true; url: string } | { ok: false; error: string };

async function getCustomerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  const id = (data as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id;
  return id ?? undefined;
}

export async function createCheckout(
  plan: "monthly" | "yearly"
): Promise<ActionResult> {
  if (!stripeConfigured) return { ok: false, error: "Billing is not configured." };
  const priceId = PRICE_IDS[plan];
  if (!priceId) return { ok: false, error: "This plan is unavailable." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  try {
    const stripe = getStripe();
    const customerId = await getCustomerId(supabase, user.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/dashboard?upgraded=1`,
      cancel_url: `${siteUrl()}/pricing`,
      client_reference_id: user.id,
      customer: customerId,
      customer_email: customerId ? undefined : (user.email ?? undefined),
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
    });
    if (!session.url) return { ok: false, error: "Could not start checkout." };
    return { ok: true, url: session.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Checkout failed.",
    };
  }
}

export async function createPortal(): Promise<ActionResult> {
  if (!stripeConfigured) return { ok: false, error: "Billing is not configured." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  try {
    const customerId = await getCustomerId(supabase, user.id);
    if (!customerId) return { ok: false, error: "No subscription found." };
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/pricing`,
    });
    return { ok: true, url: session.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not open the portal.",
    };
  }
}
