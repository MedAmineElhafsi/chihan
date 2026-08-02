"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search as SearchIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <form className="mt-6 flex gap-2" onSubmit={onSubmit}>
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="ps-9"
          autoFocus
        />
      </div>
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
