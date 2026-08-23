import { ExternalLink, Globe2, Newspaper } from "lucide-react";

import type { NewsArticle } from "@/types/news";

const NEWS_COLORS: Record<string, string> = {
  culture: "#e1b12c",
  community: "#1fa36b",
  politics: "#d6443b",
  diaspora: "#3b82f6",
  business: "#a855f7",
};

/** Shared by the News page and Home’s News tab. */
export function ArticleCard({
  article,
  dateLabel,
  readMore,
}: {
  article: NewsArticle;
  dateLabel: string;
  readMore: string;
}) {
  const color = NEWS_COLORS[article.category ?? ""] ?? "#94a3b8";
  return (
    <article className="social-surface hover:border-cyan/25 flex flex-col overflow-hidden transition-colors">
      <div
        className="relative flex h-40 items-center justify-center sm:h-44"
        style={{
          backgroundImage: article.image_url
            ? `url(${article.image_url})`
            : `radial-gradient(120% 140% at 30% 0%, ${color}40, transparent 70%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!article.image_url && (
          <Newspaper className="size-10 opacity-50" style={{ color }} />
        )}
        {article.category && (
          <span
            className="absolute start-3 top-3 rounded-md px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: `${color}cc` }}
          >
            {article.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        {article.country && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <Globe2 className="text-cyan size-4" />
            {article.country}
          </span>
        )}
        <h2 className="font-display text-xl leading-snug font-semibold">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-muted-foreground text-[0.95rem] leading-relaxed">
            {article.summary}
          </p>
        )}
        <div className="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-3 text-sm">
          <span className="min-w-0 truncate">
            {article.source ? `${article.source} · ` : ""}
            {dateLabel}
          </span>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
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
