import type { Ad, AdPhase, SponsoredItem } from "@/types/ad";

/** Where an ad stands. An approved ad is running during its week and ended
 *  after it, whether or not anything has marked it so yet. */
export function adPhase(
  ad: Pick<Ad, "status" | "ends_at">,
  now = Date.now()
): AdPhase {
  if (ad.status === "pending") return "pending";
  if (ad.status === "rejected") return "rejected";
  if (ad.status === "approved" && ad.ends_at && Date.parse(ad.ends_at) > now) {
    return "running";
  }
  return "ended";
}

const same = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Businesses in the viewer's city first, then their country, then the rest.
 * Within each group the order is shuffled on every request, so no advertiser
 * owns the first slot for the whole week.
 */
export function nearestFirst(
  items: SponsoredItem[],
  viewer: { city?: string | null; country?: string | null }
): SponsoredItem[] {
  const rank = (i: SponsoredItem) =>
    same(i.listing.city, viewer.city)
      ? 0
      : same(i.listing.country, viewer.country)
        ? 1
        : 2;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.sort((a, b) => rank(a) - rank(b));
}

export type FeedEntry<P> =
  | { kind: "post"; item: P }
  | { kind: "ad"; item: SponsoredItem };

/**
 * One sponsored card after every `every` posts. A feed shorter than that
 * still carries one, at its end, so a young community's advertisers are
 * seen; an empty feed carries none, so an ad is never the only thing there.
 */
export function withSponsored<P>(
  posts: P[],
  ads: SponsoredItem[],
  every = 5
): FeedEntry<P>[] {
  const out: FeedEntry<P>[] = [];
  let next = 0;
  posts.forEach((post, i) => {
    out.push({ kind: "post", item: post });
    if ((i + 1) % every === 0 && next < ads.length) {
      out.push({ kind: "ad", item: ads[next++] });
    }
  });
  if (next === 0 && posts.length > 0 && ads.length > 0) {
    out.push({ kind: "ad", item: ads[0] });
  }
  return out;
}
