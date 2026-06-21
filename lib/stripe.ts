import "server-only";
import Stripe from "stripe";

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  if (!cached) cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  return cached;
}

export const PRICE_IDS: Record<"monthly" | "yearly", string | undefined> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
