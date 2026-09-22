"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import {
  TICKET_FEE_PERCENT,
  getStripe,
  siteUrl,
  ticketsConfigured,
} from "./stripe";
import { ticketsReady } from "./schema-ready";

type UrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * An organiser's own Stripe account. The money for a ticket goes there
 * directly — Cîhan is never in the middle holding it, and never sees a card.
 * Stripe asks them for their details on its own pages.
 */
export async function connectPayouts(): Promise<UrlResult> {
  if (!ticketsConfigured() || !(await ticketsReady())) {
    return { ok: false, error: "unavailable" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  try {
    const stripe = getStripe();
    const svc = createServiceClient();

    const { data: existing } = await supabase
      .from("payout_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    let accountId = (existing as { stripe_account_id?: string | null } | null)
      ?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      await svc.from("payout_accounts").upsert(
        {
          user_id: user.id,
          stripe_account_id: accountId,
          charges_enabled: false,
          details_submitted: false,
        },
        { onConflict: "user_id" }
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl()}/tickets?connect=retry`,
      return_url: `${siteUrl()}/tickets?connect=done`,
      type: "account_onboarding",
    });
    return { ok: true, url: link.url };
  } catch (err) {
    console.error("[tickets] connect", err);
    return { ok: false, error: "failed" };
  }
}

/**
 * Buying places at an event. The price and the number left are read here,
 * on the server — never taken from the page — and Stripe collects the money
 * into the organiser's account, minus Cîhan's fee.
 */
export async function buyTickets(
  eventId: string,
  quantity: number
): Promise<UrlResult> {
  if (!ticketsConfigured() || !(await ticketsReady())) {
    return { ok: false, error: "unavailable" };
  }
  const qty = Math.min(10, Math.max(1, Math.round(quantity)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  try {
    const { data: post } = await supabase
      .from("posts")
      .select(
        "id, author_id, event_title, event_at, ticket_price_cents, ticket_capacity, ticket_currency"
      )
      .eq("id", eventId)
      .eq("type", "event")
      .maybeSingle();
    const event = post as {
      author_id: string;
      event_title: string | null;
      event_at: string | null;
      ticket_price_cents: number | null;
      ticket_capacity: number | null;
      ticket_currency: string | null;
    } | null;
    if (!event?.ticket_price_cents || !event.ticket_capacity) {
      return { ok: false, error: "no_tickets" };
    }
    if (event.author_id === user.id) return { ok: false, error: "own_event" };
    if (event.event_at && new Date(event.event_at) < new Date()) {
      return { ok: false, error: "past" };
    }

    const { data: sold } = await supabase.rpc("tickets_sold", {
      p_event: eventId,
    });
    const left = event.ticket_capacity - Number(sold ?? 0);
    if (left <= 0) return { ok: false, error: "sold_out" };
    if (qty > left) return { ok: false, error: "not_enough" };

    // Where the organiser is paid. Without a finished account there is
    // nowhere to send the money, so there is nothing to sell.
    const svc = createServiceClient();
    const { data: payout } = await svc
      .from("payout_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", event.author_id)
      .maybeSingle();
    const account = payout as {
      stripe_account_id: string | null;
      charges_enabled: boolean;
    } | null;
    if (!account?.stripe_account_id || !account.charges_enabled) {
      return { ok: false, error: "organiser_not_ready" };
    }

    const currency = (event.ticket_currency ?? "eur").toLowerCase();
    const total = event.ticket_price_cents * qty;
    const fee = Math.round((total * TICKET_FEE_PERCENT) / 100);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency,
            unit_amount: event.ticket_price_cents,
            product_data: {
              name: event.event_title ?? "Ticket",
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: account.stripe_account_id },
      },
      success_url: `${siteUrl()}/tickets?bought=1`,
      cancel_url: `${siteUrl()}/feed`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        kind: "ticket",
        event_id: eventId,
        buyer_id: user.id,
        quantity: String(qty),
      },
    });
    if (!session.url) return { ok: false, error: "failed" };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[tickets] buy", err);
    return { ok: false, error: "failed" };
  }
}

/** At the door: the organiser types or scans a code, once. */
export async function checkInTicket(code: string): Promise<{
  ok: boolean;
  reason: string;
  quantity: number;
}> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "not_found", quantity: 0 };
  if (!(await ticketsReady())) {
    return { ok: false, reason: "unavailable", quantity: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_signed_in", quantity: 0 };

  try {
    const { data, error } = await supabase.rpc("check_in_ticket", {
      p_code: trimmed,
    });
    if (error) return { ok: false, reason: "failed", quantity: 0 };
    const row = (Array.isArray(data) ? data[0] : data) as
      | { ok: boolean; reason: string; quantity: number }
      | undefined;
    revalidatePath("/tickets");
    return {
      ok: Boolean(row?.ok),
      reason: String(row?.reason ?? "failed"),
      quantity: Number(row?.quantity ?? 0),
    };
  } catch {
    return { ok: false, reason: "failed", quantity: 0 };
  }
}
