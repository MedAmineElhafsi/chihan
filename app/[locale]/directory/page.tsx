import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getListings } from "@/lib/listings";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/directory/listing-card";
import { CategoryIcon } from "@/components/directory/category-icon";
import { cn } from "@/lib/utils";

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; country?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const category =
    sp.category && (LISTING_CATEGORIES as readonly string[]).includes(sp.category)
      ? sp.category
      : undefined;
  const country = sp.country || undefined;

  const t = await getTranslations("Directory");
  const listings = await getListings({ category, country });
  const reviewsLabel = t("reviewsShort");
  const countryQ = country ? `&country=${encodeURIComponent(country)}` : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/directory/new">
            <Plus className="size-4" />
            {t("addListing")}
          </Link>
        </Button>
      </div>

      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Link
          href={country ? `/directory?country=${country}` : "/directory"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            !category
              ? "border-cyan/50 bg-cyan/15 text-cyan"
              : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
          )}
        >
          {t("all")}
        </Link>
        {LISTING_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/directory?category=${c}${countryQ}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              category === c
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <CategoryIcon category={c} className="size-3.5" />
            {t(`cat_${c}`)}
          </Link>
        ))}
      </div>

      {country && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("filteredByCountry", { country })}{" "}
          <Link
            href={category ? `/directory?category=${category}` : "/directory"}
            className="text-cyan hover:underline"
          >
            {t("clearFilter")}
          </Link>
        </p>
      )}

      {listings.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Button asChild>
            <Link href="/directory/new">{t("emptyCta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              categoryLabel={t(`cat_${l.category}`)}
              reviewsLabel={reviewsLabel}
              professionalLabel={t("professional")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
