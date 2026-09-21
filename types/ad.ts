import type { ListingWithStats } from "./listing";

export type AdStatus = "pending" | "approved" | "rejected" | "ended";

/** An ad as its owner and administrators see it (supabase/migrations/0026). */
export type Ad = {
  id: string;
  listing_id: string;
  owner_id: string;
  headline: string;
  body: string | null;
  status: AdStatus;
  decision_note: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
};

export const AD_COLUMNS =
  "id, listing_id, owner_id, headline, body, status, decision_note, starts_at, ends_at, impressions, clicks, created_at";

/** What Explore shows: the words on the card and the listing behind them. */
export type SponsoredItem = {
  id: string;
  headline: string;
  body: string | null;
  listing: ListingWithStats;
};

/** An ad waiting for an administrator, with what they need to judge it. */
export type PendingAd = {
  ad: Ad;
  listing: ListingWithStats;
  ownerName: string | null;
};

/** Where an ad stands from its owner's side. `approved` splits in two:
 *  running during its week, ended after it. */
export type AdPhase = "pending" | "running" | "ended" | "rejected";

export const HEADLINE_MIN = 3;
export const HEADLINE_MAX = 80;
export const BODY_MAX = 280;
