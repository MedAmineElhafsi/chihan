import { BadgeCheck, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { ListingWithStats } from "@/types/listing";
import { CategoryIcon } from "./category-icon";
import { Stars } from "./stars";

export function ListingCard({
  listing,
  categoryLabel,
  reviewsLabel,
}: {
  listing: ListingWithStats;
  categoryLabel: string;
  reviewsLabel: string;
}) {
  const place = [listing.city, listing.country].filter(Boolean).join(", ");
  const color = CATEGORY_COLORS[listing.category] ?? CATEGORY_COLORS.other;
  const photo = listing.photos?.[0];

  return (
    <Link
      href={`/directory/${listing.id}`}
      className="glass group flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-gold/40"
    >
      <div className="relative h-36 w-full overflow-hidden bg-secondary">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <CategoryIcon
              category={listing.category}
              className="size-10 opacity-60"
            />
          </div>
        )}
        <span
          className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur"
          style={{ backgroundColor: `${color}cc` }}
        >
          <CategoryIcon category={listing.category} className="size-3.5" />
          {categoryLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">
            {listing.name}
          </h3>
          {listing.is_verified && (
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-gold" />
          )}
        </div>
        {place && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 text-gold" />
            {place}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
          {listing.rating_avg != null ? (
            <>
              <Stars value={listing.rating_avg} />
              <span className="font-medium">{listing.rating_avg.toFixed(1)}</span>
              <span className="text-muted-foreground">
                · {listing.review_count} {reviewsLabel}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{reviewsLabel}: 0</span>
          )}
        </div>
      </div>
    </Link>
  );
}
