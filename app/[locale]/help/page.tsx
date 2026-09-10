import { getTranslations, setRequestLocale } from "next-intl/server";
import { HandHeart } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profiles";
import { getHelpRequests } from "@/lib/help";
import { HELP_CATEGORIES, LAUNCH_CITY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/help/request-card";
import { RequestComposer } from "@/components/help/request-composer";
import { cn } from "@/lib/utils";
import { HelpCategoryIcon } from "@/components/help/category-icon";

export default async function HelpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; city?: string; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Help");

  const user = await getCurrentUser();
  const profile = user ? await getOwnProfile(user.id) : null;

  const category =
    sp.category && (HELP_CATEGORIES as readonly string[]).includes(sp.category)
      ? sp.category
      : undefined;
  const city = sp.city ?? "";
  const status = sp.status === "resolved" ? "resolved" : "open";

  const requests = await getHelpRequests(
    { category, city: city || undefined, status },
    user?.id
  );

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { category, city: city || undefined, status, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "status" && v === "open")) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/help?${s}` : "/help";
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
      active
        ? "border-cyan bg-cyan/15 text-cyan"
        : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <span className="label-mono">
          {city || LAUNCH_CITY} — {t("index", { count: requests.length })}
        </span>
        <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      {/* Ask */}
      <div className="mt-8">
        {user ? (
          <RequestComposer defaultCity={profile?.city ?? LAUNCH_CITY} />
        ) : (
          <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-md p-5">
            <p className="text-muted-foreground text-sm">{t("signInToAsk")}</p>
            <Button asChild className="gap-2">
              <Link href="/signup">
                <HandHeart className="size-4" />
                {t("joinCta")}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-border mt-8 flex flex-col gap-3 border-b pb-5">
        <div className="flex flex-wrap gap-2">
          <Link href={qs({ category: undefined })} className={chip(!category)}>
            {t("allCategories")}
          </Link>
          {HELP_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={qs({ category: c })}
              className={chip(category === c)}
            >
              <HelpCategoryIcon category={c} />
              {t(`cat_${c}` as never)}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Link
            href={qs({ status: "open" })}
            className={chip(status === "open")}
          >
            {t("openOnly")}
          </Link>
          <Link
            href={qs({ status: "resolved" })}
            className={chip(status === "resolved")}
          >
            {t("resolvedOnly")}
          </Link>
        </div>
      </div>

      {/* Board */}
      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <HandHeart className="text-cyan size-8" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="bg-border mt-6 grid gap-px sm:grid-cols-2">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
