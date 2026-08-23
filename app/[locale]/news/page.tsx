import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getNews } from "@/lib/news";
import { ArticleCard } from "@/components/news/article-card";
import { cn } from "@/lib/utils";


export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations("News");
  const all = await getNews();
  const countries = [
    ...new Set(all.map((a) => a.country).filter((c): c is string => !!c)),
  ].sort();
  const country =
    sp.country && countries.includes(sp.country) ? sp.country : undefined;
  const articles = country ? all.filter((a) => a.country === country) : all;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-cyan/50 bg-cyan/15 text-cyan"
        : "border-border bg-card text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:max-w-6xl lg:py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      {countries.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/news" className={chip(!country)}>
            {t("all")}
          </Link>
          {countries.map((c) => (
            <Link
              key={c}
              href={`/news?country=${encodeURIComponent(c)}`}
              className={chip(country === c)}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              dateLabel={dateFmt.format(new Date(a.published_at))}
              readMore={t("readMore")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
