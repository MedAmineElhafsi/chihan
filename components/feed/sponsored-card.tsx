"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, ChevronRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/directory/category-icon";
import { Stars } from "@/components/directory/stars";
import type { SponsoredItem } from "@/types/ad";

const SEEN = "cihan:ad-seen:";

function alreadySeen(id: string) {
  try {
    return sessionStorage.getItem(SEEN + id) === "1";
  } catch {
    return false;
  }
}

function markSeen(id: string) {
  try {
    sessionStorage.setItem(SEEN + id, "1");
  } catch {
    // Private windows can refuse storage; the view still counts once here.
  }
}

/** Fire and forget: a count that fails must never cost the reader anything. */
function record(adId: string, kind: "view" | "click") {
  void Promise.resolve(
    createClient().rpc("record_ad_event", { p_ad: adId, p_kind: kind })
  ).catch(() => {});
}

/**
 * A promoted listing in Explore.
 *
 * It sits in the feed as a post does — same card, same rhythm — and says
 * "Sponsored" plainly in the corner, because an ad that passes for a post
 * spends the trust the feed runs on. The whole card leads to the listing,
 * where the reviews, the contact details and the message button already are.
 *
 * A view is counted once per browser session, after the card has been at
 * least half on screen for a second — a card scrolled past is not a card
 * seen. `preview` renders the same card for its owner and for the review
 * queue, without counting anything and without a link.
 */
export function SponsoredCard({
  item,
  preview = false,
}: {
  item: SponsoredItem;
  preview?: boolean;
}) {
  const t = useTranslations("Ads");
  const tDir = useTranslations("Directory");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (preview || !el || alreadySeen(item.id)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer ??= setTimeout(() => {
            markSeen(item.id);
            record(item.id, "view");
            io.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [item.id, preview]);

  const { listing } = item;
  const color = CATEGORY_COLORS[listing.category] ?? CATEGORY_COLORS.other;
  const photo = listing.photos[0];
  const place = listing.city || listing.country;

  const content: ReactNode = (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="ring-border flex size-11 shrink-0 items-center justify-center rounded-full ring-1"
            style={{ backgroundColor: `${color}26`, color }}
          >
            <CategoryIcon category={listing.category} className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-base font-semibold">
              <span dir="auto" className="truncate">
                {listing.name}
              </span>
              {listing.is_verified && (
                <BadgeCheck
                  aria-label={t("verified")}
                  className="text-cyan size-4 shrink-0"
                />
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {tDir(`cat_${listing.category}`)}
              {place && (
                <>
                  {" · "}
                  <bdi>{place}</bdi>
                </>
              )}
            </div>
          </div>
        </div>
        <span className="label-mono shrink-0">{t("sponsored")}</span>
      </div>

      {/* The advertiser writes in whichever language they write in: dir=auto
          lets Latin text sit left-to-right inside an Arabic or Sorani page,
          instead of having its full stop thrown to the wrong end. */}
      <p
        dir="auto"
        className="font-display text-air mt-3 px-4 text-lg leading-snug font-semibold text-balance sm:px-5"
      >
        {item.headline}
      </p>
      {item.body && (
        <p
          dir="auto"
          className="text-muted-foreground mt-1 px-4 text-sm leading-relaxed whitespace-pre-line sm:px-5"
        >
          {item.body}
        </p>
      )}

      {/* Never taller than a post's media (32rem), and a good deal less: the
          ad is a pointer to the listing, not a billboard. */}
      {photo && (
        <div className="border-border mt-3 aspect-[16/9] max-h-72 overflow-hidden border-y">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="size-full object-cover" />
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 sm:px-5",
          !photo && "border-border/70 mt-3 border-t"
        )}
      >
        {listing.rating_avg != null ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Stars value={listing.rating_avg} />
            <span className="font-medium">{listing.rating_avg.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({listing.review_count})
            </span>
          </span>
        ) : (
          <span />
        )}
        <span className="text-cyan inline-flex items-center gap-1 text-sm font-semibold">
          {t("view")}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </span>
      </div>
    </>
  );

  if (preview) {
    return (
      <article className="social-surface overflow-hidden">{content}</article>
    );
  }

  return (
    <article
      ref={ref}
      className="social-surface hover:border-cyan/25 overflow-hidden transition-colors"
    >
      <Link
        href={`/directory/${listing.id}`}
        onClick={() => record(item.id, "click")}
        aria-label={t("cardLabel", {
          name: listing.name,
          headline: item.headline,
        })}
        className="block rounded-[inherit]"
      >
        {content}
      </Link>
    </article>
  );
}
