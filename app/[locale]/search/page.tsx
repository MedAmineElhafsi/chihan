import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Building2,
  Newspaper,
  PenLine,
  Users,
  UsersRound,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { globalSearch } from "@/lib/search";
import { SearchForm } from "@/components/search/search-form";

const kindIcon = {
  person: Users,
  listing: Building2,
  group: UsersRound,
  post: PenLine,
  news: Newspaper,
} as const;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "" } = await searchParams;
  const t = await getTranslations("Search");
  const hits = await globalSearch(q);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>

      <SearchForm initialQuery={q} />

      <div className="mt-8">
        {!q.trim() ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("hint")}
          </p>
        ) : hits.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("empty", { q })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hits.map((h) => {
              const Icon = kindIcon[h.kind];
              return (
                <li key={`${h.kind}-${h.id}`}>
                  <Link
                    href={h.href}
                    className="glass flex items-start gap-3 rounded-xl p-4 transition-colors hover:bg-accent/40"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t(`kind_${h.kind}`)}
                      </span>
                      <span className="mt-0.5 block font-medium">{h.title}</span>
                      {h.subtitle && (
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {h.subtitle}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
