import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { BUSINESS_PRICE_ID, getStripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

function periodEndISO(sub: Stripe.Subscription): string | null {
  // `current_period_end` lives on the subscription or its first item depending
  // on the API version — read defensively.
  const fromSub = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const fromItem = (
    sub.items?.data?.[0] as unknown as { current_period_end?: number }
  )?.current_period_end;
  const ts = fromSub ?? fromItem;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** What the buyer shows at the door: short, spoken aloud without trouble. */
function ticketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  return `CIH-${pick(4)}-${pick(4)}`;
}

export async function POST(request: NextRequest) {
  if (!stripeConfigured) {
    return new NextResponse("Billing not configured", { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new NextResponse("No webhook secret", { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", secret);
  } catch (err) {
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : "invalid"}`,
      { status: 400 }
    );
  }

  const svc = createServiceClient();

  async function upsert(sub: Stripe.Subscription, userId?: string) {
    const uid = userId ?? (sub.metadata?.user_id as string | undefined);
    if (!uid) return;
    const price = sub.items.data[0]?.price;
    const plan = price?.recurring?.interval === "year" ? "yearly" : "monthly";
    await svc.from("subscriptions").upsert(
      {
        user_id: uid,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        current_period_end: periodEndISO(sub),
      },
      { onConflict: "user_id" }
    );
    // Paying does not verify anyone. "Verified" means an administrator
    // checked an identity document (0023); it decides who may post jobs and
    // housing and who may be a buddy, so a subscription must neither grant
    // it nor, when cancelled, take it away.
  }

  /** A subscription is the business plan when it carries that price. */
  function isBusiness(sub: Stripe.Subscription): boolean {
    return Boolean(
      BUSINESS_PRICE_ID &&
      sub.items.data.some((i) => i.price?.id === BUSINESS_PRICE_ID)
    );
  }

  async function upsertBusiness(sub: Stripe.Subscription, userId?: string) {
    const uid = userId ?? (sub.metadata?.user_id as string | undefined);
    if (!uid) return;
    await svc.from("business_subscriptions").upsert(
      {
        user_id: uid,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEndISO(sub),
      },
      { onConflict: "user_id" }
    );
  }

  /**
   * A paid ticket becomes a row, once. The session id is unique in the
   * table, so Stripe retrying this event cannot sell the same place twice.
   */
  async function recordTicket(session: Stripe.Checkout.Session) {
    const eventId = session.metadata?.event_id;
    const buyerId = session.metadata?.buyer_id ?? session.client_reference_id;
    const quantity = Number(session.metadata?.quantity ?? 1);
    if (!eventId || !buyerId) return;

    const { data: inserted } = await svc
      .from("tickets")
      .insert({
        event_id: eventId,
        buyer_id: buyerId,
        quantity,
        amount_cents: session.amount_total ?? 0,
        currency: (session.currency ?? "eur").toLowerCase(),
        code: ticketCode(),
        stripe_session_id: session.id,
      })
      .select("id")
      .maybeSingle();
    if (!inserted) return; // already recorded, or refused

    const { data: post } = await svc
      .from("posts")
      .select("author_id")
      .eq("id", eventId)
      .maybeSingle();
    const organiser = (post as { author_id?: string } | null)?.author_id;
    if (organiser && organiser !== buyerId) {
      await svc.from("notifications").insert({
        user_id: organiser,
        actor_id: buyerId,
        type: "ticket_sold",
        entity_id: eventId,
        link: "/tickets",
      });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.kind === "ticket") {
          await recordTicket(session);
          break;
        }
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          );
          const uid = session.client_reference_id ?? undefined;
          if (session.metadata?.kind === "business" || isBusiness(sub)) {
            await upsertBusiness(sub, uid);
          } else {
            await upsert(sub, uid);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (isBusiness(sub) || sub.metadata?.kind === "business") {
          await upsertBusiness(sub);
        } else {
          await upsert(sub);
        }
        break;
      }
      // What Stripe knows about an organiser's own account: whether they
      // finished its questions, and whether it may take money yet.
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await svc
          .from("payout_accounts")
          .update({
            charges_enabled: Boolean(account.charges_enabled),
            details_submitted: Boolean(account.details_submitted),
          })
          .eq("stripe_account_id", account.id);
        break;
      }
      default:
        break;
    }
  } catch {
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
