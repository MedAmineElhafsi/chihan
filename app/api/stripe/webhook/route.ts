import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe, stripeConfigured } from "@/lib/stripe";
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

    // Premium unlocks the verified badge on the member profile.
    const premium =
      sub.status === "active" || sub.status === "trialing";
    await svc
      .from("profiles")
      .update({ is_verified: premium })
      .eq("user_id", uid);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id
          );
          await upsert(sub, session.client_reference_id ?? undefined);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsert(event.data.object as Stripe.Subscription);
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
