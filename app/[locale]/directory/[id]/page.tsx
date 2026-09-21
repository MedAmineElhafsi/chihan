import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getListingById, getReviews } from "@/lib/listings";
import { CATEGORY_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/directory/stars";
import { CategoryIcon } from "@/components/directory/category-icon";
import { ReviewForm } from "@/components/directory/review-form";
import { ReviewItem } from "@/components/directory/review-item";
import { canReview } from "@/lib/reviews";
import { ClaimButton } from "@/components/directory/claim-button";
import { ListingMap } from "@/components/directory/listing-map";
import { ReportButton } from "@/components/moderation/report-button";
import { ListingPromotion } from "@/components/directory/listing-promotion";
import { getLatestAd } from "@/lib/ads";
import { isEnabled } from "@/lib/features";
import { ShareButton } from "@/components/share/share-button";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { preview, snippet } from "@/lib/og";
import { getListingDetails } from "@/lib/listing-details";
import { isOpenNow, localWeekday } from "@/lib/opening-hours";
import { cn } from "@/lib/utils";
import { WEEKDAYS, type Weekday } from "@/types/listing";

/** A shared listing previews as itself: its name, what and where it is,
 *  and its first photo. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const listing = await getListingById(id);
  if (!listing) return {};
  const t = await getTranslations({ locale, namespace: "Directory" });
  const where = [listing.city, listing.country].filter(Boolean).join(", ");
  const description =
    [
      [t(`cat_${listing.category}`), where].filter(Boolean).join(" · "),
      snippet(listing.description, 140),
    ]
      .filter(Boolean)
      .join(" — ") || undefined;
  return {
    title: listing.name,
    description,
    ...preview({
      title: listing.name,
      description,
      image: listing.photos[0] ?? null,
      locale,
    }),
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const listing = await getListingById(id);
  if (!listing) notFound();

  const t = await getTranslations("Directory");
  const reviews = await getReviews(id);
  const user = await getCurrentUser();

  const isOwner = !!user && listing.owner_user_id === user.id;
  const latestAd =
    isOwner && isEnabled("ads") ? await getLatestAd(listing.id) : null;
  const mayReview = await canReview(id, user?.id ?? null);
  const canClaim = !!user && listing.owner_user_id === null;
  const myReview = user
    ? reviews.find((r) => r.author_id === user.id)
    : undefined;

  const place = [listing.address, listing.city, listing.country]
    .filter(Boolean)
    .join(", ");
  const located = listing.lat != null && listing.lng != null;
  const color = CATEGORY_COLORS[listing.category] ?? CATEGORY_COLORS.other;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // Hours, WhatsApp and services (migration 0027); null until it has run.
  const details = await getListingDetails(listing.id);
  const hours = details?.opening_hours ?? null;
  const open = isOpenNow(hours, details?.timezone ?? null);
  const today = localWeekday(details?.timezone ?? null);
  const dayName = (d: Weekday) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(
      // 1 January 2024 was a Monday.
      new Date(Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(d)))
    );
  const whatsappHref = details?.whatsapp
    ? `https://wa.me/${details.whatsapp.replace(/^\+/, "")}`
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/directory"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {t("back")}
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: `${color}cc` }}
          >
            <CategoryIcon category={listing.category} className="size-3.5" />
            {t(`cat_${listing.category}`)}
          </span>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
            {listing.name}
            {listing.is_verified && <BadgeCheck className="size-6 text-cyan" />}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            {listing.rating_avg != null ? (
              <>
                <Stars value={listing.rating_avg} />
                <span className="font-medium">
                  {listing.rating_avg.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  · {t("reviewCount", { count: listing.review_count })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("noRatings")}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareButton
            path={`/directory/${listing.id}`}
            title={listing.name}
            size="default"
          />
          {isOwner && (
            <Button asChild variant="outline" className="gap-1.5">
              <Link href={`/directory/${listing.id}/edit`}>
                <Pencil className="size-4" />
                {t("edit")}
              </Link>
            </Button>
          )}
          {canClaim && <ClaimButton listingId={listing.id} />}
          {user && !isOwner && (
            <ReportButton targetType="listing" targetId={listing.id} />
          )}
        </div>
      </div>

      {/* Photos */}
      {listing.photos.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {listing.photos.slice(0, 6).map((url, i) => (
            <div
              key={url}
              className={
                i === 0
                  ? "relative col-span-full aspect-[16/7] overflow-hidden rounded-xl border border-border sm:col-span-3"
                  : "relative aspect-square overflow-hidden rounded-xl border border-border"
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {isOwner && isEnabled("ads") && (
            <ListingPromotion listing={listing} ad={latestAd} />
          )}

          {listing.description && (
            <p className="leading-relaxed text-foreground/90">
              {listing.description}
            </p>
          )}

          {details && details.services.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-semibold">
                {t("servicesTitle")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {details.services.map((s) => (
                  <li
                    key={s}
                    dir="auto"
                    className="border-border bg-card/40 rounded-full border px-3 py-1 text-sm"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {located && (
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-semibold">
                {t("location")}
              </h2>
              <ListingMap lat={listing.lat!} lng={listing.lng!} />
            </div>
          )}

          {/* Reviews */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold">
              {t("reviews")}
            </h2>
            <ReviewForm
              listingId={listing.id}
              isAuthenticated={!!user}
              mayReview={mayReview || !!myReview}
              isOwner={isOwner}
              initialRating={myReview?.rating ?? 0}
              initialBody={myReview?.body ?? ""}
              hasReview={!!myReview}
            />
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {reviews.map((r) => (
                  <ReviewItem
                    key={r.id}
                    review={r}
                    listingId={listing.id}
                    isOwner={isOwner}
                    date={dateFmt.format(new Date(r.created_at))}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Contact sidebar */}
        <aside className="lg:col-span-1">
          <div className="panel sticky top-20 flex flex-col gap-3 rounded-lg p-5">
            <h2 className="font-display text-lg font-semibold">{t("contact")}</h2>
            {/* Most of this community reaches a business on WhatsApp first. */}
            {whatsappHref && (
              <Button asChild variant="outline" className="w-full gap-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppGlyph className="size-4 text-[#25d366]" />
                  {t("whatsappButton")}
                </a>
              </Button>
            )}
            {place && (
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-cyan" />
                <span>{place}</span>
              </div>
            )}
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="flex items-center gap-2.5 text-sm transition-colors hover:text-cyan"
                dir="ltr"
              >
                <Phone className="size-4 shrink-0 text-cyan" />
                {listing.phone}
              </a>
            )}
            {listing.email && (
              <a
                href={`mailto:${listing.email}`}
                className="flex items-center gap-2.5 break-all text-sm transition-colors hover:text-cyan"
                dir="ltr"
              >
                <Mail className="size-4 shrink-0 text-cyan" />
                {listing.email}
              </a>
            )}
            {listing.website && (
              <a
                href={
                  listing.website.startsWith("http")
                    ? listing.website
                    : `https://${listing.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 break-all text-sm transition-colors hover:text-cyan"
                dir="ltr"
              >
                <Globe className="size-4 shrink-0 text-cyan" />
                {t("visitWebsite")}
              </a>
            )}
            {!place &&
              !listing.phone &&
              !listing.email &&
              !listing.website &&
              !whatsappHref && (
                <p className="text-sm text-muted-foreground">
                  {t("noContact")}
                </p>
              )}

            {hours && (
              <div className="border-border mt-1 flex flex-col gap-2 border-t pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{t("hoursTitle")}</h3>
                  {/* Worked out in the listing's own time zone, so it is right
                      for someone looking from another country. */}
                  {open !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        open
                          ? "bg-success/15 text-success"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {open ? t("openNow") : t("closedNow")}
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                  {WEEKDAYS.map((d) => {
                    const h = hours[d];
                    if (h === undefined) return null;
                    const isToday = d === today;
                    return (
                      <Fragment key={d}>
                        <dt
                          className={cn(
                            isToday
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {dayName(d)}
                        </dt>
                        <dd
                          className={cn(
                            "text-end tabular-nums",
                            isToday && "font-medium"
                          )}
                        >
                          {h ? (
                            // A time range reads left to right in every
                            // language; the column still aligns to the page.
                            <span dir="ltr">
                              {h.open}–{h.close}
                            </span>
                          ) : (
                            t("closedDay")
                          )}
                        </dd>
                      </Fragment>
                    );
                  })}
                </dl>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
