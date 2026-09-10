"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { createHelpRequest } from "@/lib/help-actions";
import {
  HELP_CATEGORIES,
  HELP_CATEGORY_STYLE,
  HELP_URGENCIES,
  LAUNCH_CITY,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HelpCategoryIcon } from "./category-icon";

export function RequestComposer({ defaultCity }: { defaultCity?: string }) {
  const t = useTranslations("Help");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("housing");
  const [urgency, setUrgency] = useState<string>("normal");
  const [city, setCity] = useState(defaultCity ?? LAUNCH_CITY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 6) {
      setError(t("errorTitle"));
      return;
    }
    setLoading(true);
    const res = await createHelpRequest({
      title,
      body,
      category,
      urgency,
      city,
      country: "",
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle("");
    setBody("");
    setOpen(false);
    router.push(`/help/${res.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("askCta")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="panel flex w-full flex-col gap-5 rounded-md p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-air">
            {t("askTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("askBody")}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label={t("cancel")}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-mono">{t("whatLabel")}</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={140}
          required
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-mono">{t("categoryLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {HELP_CATEGORIES.map((c) => {
            const s = HELP_CATEGORY_STYLE[c];
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-transparent text-air"
                    : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                )}
                style={
                  active
                    ? { backgroundColor: `${s.color}26`, borderColor: s.color }
                    : undefined
                }
              >
                <HelpCategoryIcon category={c} />
                {t(`cat_${c}` as never)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <span className="label-mono">{t("urgencyLabel")}</span>
          <div className="flex gap-2">
            {HELP_URGENCIES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgency(u)}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm transition-colors",
                  urgency === u
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                )}
              >
                {t(`urg_${u}` as never)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="label-mono">{t("cityLabel")}</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-mono">{t("detailsLabel")}</span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("detailsPlaceholder")}
          maxLength={2000}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="label-mono">{t("freeNote")}</p>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("postCta")}
        </Button>
      </div>
    </form>
  );
}
