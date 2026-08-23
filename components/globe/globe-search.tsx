"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type TagOption = { value: string; label: string; group: "people" | "places" };

/**
 * Search sits over the globe rather than beside it: typing dims the world and
 * leaves the matches lit, so the map stays the answer instead of becoming
 * decoration behind a list.
 */
export function GlobeSearch({
  query,
  onQuery,
  country,
  onCountry,
  countries,
  tag,
  onTag,
  tags,
  matches,
  active,
  onClear,
  className,
}: {
  query: string;
  onQuery: (v: string) => void;
  country: string;
  onCountry: (v: string) => void;
  countries: string[];
  tag: string;
  onTag: (v: string) => void;
  tags: TagOption[];
  matches: number;
  active: boolean;
  onClear: () => void;
  className?: string;
}) {
  const t = useTranslations("Explore");
  const people = tags.filter((o) => o.group === "people");
  const places = tags.filter((o) => o.group === "places");

  return (
    <div className={cn("panel-solid flex flex-col gap-2 rounded-md p-2", className)}>
      <div className="flex items-center gap-2">
        <Search className="ms-1.5 size-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {active && (
          <button
            onClick={onClear}
            aria-label={t("clear")}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-cyan"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          value={country}
          onChange={onCountry}
          label={t("anyCountry")}
          aria-label={t("filterCountry")}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Chip>

        <Chip
          value={tag}
          onChange={onTag}
          label={t("anyProfession")}
          aria-label={t("filterProfession")}
        >
          {people.length > 0 && (
            <optgroup label={t("people")}>
              {people.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          )}
          {places.length > 0 && (
            <optgroup label={t("places")}>
              {places.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          )}
        </Chip>

        <span className="ms-auto pe-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
          {t("matchCount", { count: matches })}
        </span>
      </div>
    </div>
  );
}

function Chip({
  value,
  onChange,
  label,
  children,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "children">) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-cyan",
        value
          ? "border-cyan/50 bg-cyan/15 text-cyan"
          : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
      )}
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}
