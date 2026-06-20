import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, Globe2, Newspaper } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getNews } from "@/lib/news";
import type { NewsArticle } from "@/types/news";
import { cn } from "@/lib/utils";

const NEWS_COLORS: Record<string, string> = {
  culture: "#e1b12c",
  community: "#1fa36b",
  politics: "#d6443b",
  diaspora: "#3b82f6",
  business: "#a855f7",
};

function ArticleCard({
  article,
  dateLabel,
  readMore,
}: {
  article: NewsArticle;
  dateLabel: string;
  readMore: string;
}) {
  const color =
    NEWS_COLORS[article.category ?? ""] ?? "#94a3b8";
  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      <div
        className="relative flex h-28 items-center justify-center"
        style={{
          backgroundImage: article.image_url
            ? `url(${article.image_url})`
            : `radial-gradient(120% 140% at 30% 0%, ${color}40, transparent 70%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!article.image_url && (
          <Newspaper className="size-8 opacity-50" style={{ color }} />
        )}
        {article.category && (
          <span
            className="absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: `${color}cc` }}
          >
            {article.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        {article.country && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Globe2 className="size-3.5 text-gold" />
            {article.country}
          </span>
        )}
        <h2 className="font-display text-lg font-semibold leading-tight">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {article.summary}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
          <span>
            {article.source ? `${article.source} · ` : ""}
            {dateLabel}
          </span>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-gold hover:underline"
            >
              {readMore}
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

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
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-gold/50 bg-gold/15 text-gold"
        : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      {countries.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
