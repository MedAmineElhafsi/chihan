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

/** The monthly plan a business buys: longer ads, and its own numbers. */
export const BUSINESS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS;

/** Whether the business plan can be bought at all. */
export function businessPlanConfigured(): boolean {
  return stripeConfigured && Boolean(BUSINESS_PRICE_ID);
}

/**
 * Cîhan keeps this much of a ticket; the rest goes straight to the
 * organiser Stripe account. Change it here, and in the terms.
 */
export const TICKET_FEE_PERCENT = 5;

/** Selling tickets needs Stripe Connect switched on for the account. */
export function ticketsConfigured(): boolean {
  return stripeConfigured && process.env.STRIPE_CONNECT !== "off";
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
