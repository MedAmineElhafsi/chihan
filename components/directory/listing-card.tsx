import { BadgeCheck, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { ListingWithStats } from "@/types/listing";
import { Stars } from "./stars";

export function ListingCard({
  listing,
  categoryLabel,
  reviewsLabel,
  professionalLabel,
}: {
  listing: ListingWithStats;
  categoryLabel: string;
  reviewsLabel: string;
  /** Shown when the listing is a person rather than a business. */
  professionalLabel: string;
}) {
  const place = [listing.city, listing.country].filter(Boolean).join(", ");
  const color = CATEGORY_COLORS[listing.category] ?? CATEGORY_COLORS.other;
  const photo = listing.photos?.[0];
  const isPerson = listing.kind === "professional";

  return (
    <Link
      href={`/directory/${listing.id}`}
      className="panel group hover:border-cyan/40 flex flex-col overflow-hidden rounded-lg transition-colors"
    >
      {/* A card with no photo should not pretend to have one. Reserving 144px
          for an image most listings do not have left the grid mostly empty
          gradient — a photo-shaped hole is a promise the content cannot keep. */}
      {photo ? (
        <div className="bg-secondary relative h-36 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="bg-depth-0/70 text-foreground/90 absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur">
            {/* The category colour survives as a dot. On the globe it separates
                hundreds of points and earns its place; here the word already
                says it, so the colour is a mark, not a fill. */}
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {categoryLabel}
          </span>
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="h-0.5 w-full shrink-0"
          style={{ backgroundColor: color, opacity: 0.5 }}
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {!photo && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {categoryLabel}
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight font-semibold">
            {listing.name}
          </h3>
          {isPerson && (
            <span className="label-mono border-cyan/40 text-cyan shrink-0 rounded-sm border px-1.5 py-0.5">
              {professionalLabel}
            </span>
          )}
          {listing.is_verified && (
            <BadgeCheck className="text-cyan mt-0.5 size-4 shrink-0" />
          )}
        </div>
        {place && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="text-cyan size-3.5" />
            {place}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
          {listing.rating_avg != null ? (
            <>
              <Stars value={listing.rating_avg} />
              <span className="font-medium">
                {listing.rating_avg.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                · {listing.review_count} {reviewsLabel}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
