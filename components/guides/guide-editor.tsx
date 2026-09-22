"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { localeMeta } from "@/i18n/routing";
import { deleteGuide, saveGuide } from "@/lib/guide-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GUIDE_LOCALES,
  GUIDE_TOPICS,
  type Guide,
  type GuideLink,
  type GuideStep,
} from "@/types/guide";
import { GuideTopicIcon } from "./guide-topic";

/** "Anmeldung in Berlin" → "anmeldung-in-berlin". */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Where an administrator writes a guide in one language. A second language
 * starts from the first (same address, topic and place, the same steps to
 * translate), so every version of a guide keeps the same shape.
 */
export function GuideEditor({
  guide,
  source,
  initial,
  defaultCountry,
}: {
  /** The version being edited. */
  guide?: Guide;
  /** Another language of the same guide, to start a translation from. */
  source?: Guide;
  /** A member’s suggestion: its title and city, to start from. */
  initial?: { title?: string; city?: string };
  defaultCountry: string;
}) {
  const t = useTranslations("Guides");
  const router = useRouter();
  const base = guide ?? source;

  const [locale, setLocale] = useState<string>(
    guide?.locale ??
      GUIDE_LOCALES.find(
        (l) => l !== source?.locale && !source?.languages.includes(l)
      ) ??
      "en"
  );
  const [slug, setSlug] = useState(base?.slug ?? slugify(initial?.title ?? ""));
  const [slugTouched, setSlugTouched] = useState(Boolean(base));
  const [topic, setTopic] = useState<string>(base?.topic ?? "registration");
  const [country, setCountry] = useState(base?.country ?? defaultCountry);
  const [city, setCity] = useState(base?.city ?? initial?.city ?? "");
  const [title, setTitle] = useState(guide?.title ?? initial?.title ?? "");
  const [summary, setSummary] = useState(guide?.summary ?? "");
  const [steps, setSteps] = useState<GuideStep[]>(
    guide?.steps.length
      ? guide.steps
      : source?.steps.length
        ? source.steps
        : [{ title: "", body: "" }]
  );
  const [links, setLinks] = useState<GuideLink[]>(
    guide?.links ?? source?.links ?? []
  );
  const [status, setStatus] = useState<"draft" | "published">(
    guide?.status ?? "draft"
  );
  const [reviewedOn, setReviewedOn] = useState(guide?.reviewed_on ?? today());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  function onTitle(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function moveStep(i: number, by: -1 | 1) {
    const j = i + by;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await saveGuide({
      id: guide?.id,
      slug,
      locale: locale as Guide["locale"],
      topic: topic as Guide["topic"],
      country,
      city,
      title,
      summary,
      steps,
      links,
      status,
      reviewedOn,
    });
    setSaving(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setMessage({ ok: true, text: t("saved") });
    if (!guide) router.replace(`/admin/guides/${res.id}`);
    else router.refresh();
  }

  async function remove() {
    if (!guide || !window.confirm(t("deleteConfirm"))) return;
    const res = await deleteGuide(guide.id);
    if (res.ok) router.replace("/admin/guides");
    else setMessage({ ok: false, text: res.error });
  }

  const field = "flex flex-col gap-2";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className="label-mono">{t("fieldLanguage")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={Boolean(guide)}
            className="border-input bg-card/40 shadow-elev-1 h-11 rounded-md border px-3 text-sm disabled:opacity-70"
          >
            {GUIDE_LOCALES.map((l) => (
              <option key={l} value={l}>
                {localeMeta[l].native}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          <span className="label-mono">{t("fieldSlug")}</span>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            disabled={Boolean(base)}
            dir="ltr"
            placeholder="register-your-address"
            required
          />
          <span className="text-muted-foreground text-xs">
            /guides/{slug || "…"}
          </span>
        </label>
      </div>

      <fieldset className="flex flex-col">
        <legend className="label-mono mb-2.5">{t("fieldTopic")}</legend>
        <div className="flex flex-wrap gap-2">
          {GUIDE_TOPICS.map((tp) => (
            <button
              key={tp}
              type="button"
              aria-pressed={topic === tp}
              onClick={() => setTopic(tp)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                topic === tp
                  ? "border-cyan bg-cyan/15 text-cyan"
                  : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
              )}
            >
              <GuideTopicIcon topic={tp} className="size-3.5" />
              {t(`topic_${tp}` as never)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className="label-mono">{t("fieldCountry")}</span>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </label>
        <label className={field}>
          <span className="label-mono">{t("fieldCity")}</span>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("fieldCityHint")}
          />
        </label>
      </div>

      <label className={field}>
        <span className="label-mono">{t("fieldTitle")}</span>
        <Input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={140}
          dir="auto"
          required
        />
      </label>
      <label className={field}>
        <span className="label-mono">{t("fieldSummary")}</span>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={400}
          dir="auto"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="label-mono mb-1">{t("fieldSteps")}</legend>
        {steps.map((s, i) => (
          <div
            key={i}
            className="border-border/70 grid grid-cols-[2.25rem_1fr] gap-3 rounded-md border p-3"
          >
            <span className="border-cyan/40 text-cyan flex size-8 items-center justify-center rounded-full border font-mono text-sm tabular-nums">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <Input
                value={s.title}
                onChange={(e) =>
                  setSteps(
                    steps.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x
                    )
                  )
                }
                placeholder={t("stepTitle")}
                aria-label={t("stepTitleN", { n: i + 1 })}
                maxLength={140}
                dir="auto"
              />
              <Textarea
                value={s.body}
                onChange={(e) =>
                  setSteps(
                    steps.map((x, j) =>
                      j === i ? { ...x, body: e.target.value } : x
                    )
                  )
                }
                placeholder={t("stepBody")}
                aria-label={t("stepBodyN", { n: i + 1 })}
                maxLength={2000}
                dir="auto"
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  aria-label={t("stepUp", { n: i + 1 })}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                  aria-label={t("stepDown", { n: i + 1 })}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  aria-label={t("stepRemove", { n: i + 1 })}
                  className="text-muted-foreground ms-auto"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setSteps([...steps, { title: "", body: "" }])}
          disabled={steps.length >= 30}
          className="gap-1.5 self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("stepAdd")}
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="label-mono mb-1">{t("fieldLinks")}</legend>
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <Input
              value={l.label}
              onChange={(e) =>
                setLinks(
                  links.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x
                  )
                )
              }
              placeholder={t("linkLabel")}
              aria-label={t("linkLabel")}
              maxLength={80}
              dir="auto"
            />
            <Input
              value={l.url}
              onChange={(e) =>
                setLinks(
                  links.map((x, j) =>
                    j === i ? { ...x, url: e.target.value } : x
                  )
                )
              }
              placeholder="https://"
              aria-label={t("linkUrl")}
              dir="ltr"
              type="url"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLinks(links.filter((_, j) => j !== i))}
              aria-label={t("linkRemove")}
              className="text-muted-foreground"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setLinks([...links, { label: "", url: "" }])}
          disabled={links.length >= 12}
          className="gap-1.5 self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("linkAdd")}
        </Button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className="label-mono">{t("fieldReviewed")}</span>
          <input
            type="date"
            value={reviewedOn}
            onChange={(e) => setReviewedOn(e.target.value)}
            className="border-input bg-card/40 shadow-elev-1 h-11 rounded-md border px-3 text-sm"
          />
          <span className="text-muted-foreground text-xs">
            {t("fieldReviewedHint")}
          </span>
        </label>
        <fieldset className="flex flex-col">
          <legend className="label-mono mb-2.5">{t("fieldStatus")}</legend>
          <div className="flex gap-2">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm transition-colors",
                  status === s
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                )}
              >
                {t(s === "draft" ? "draft" : "published")}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn(
            "text-sm",
            message.ok ? "text-success" : "text-destructive"
          )}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {t("save")}
        </Button>
        {guide && (
          <>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/guides/${guide.slug}`} locale={guide.locale}>
                <ExternalLink className="size-4" aria-hidden="true" />
                {t("preview")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/admin/guides/new?from=${guide.id}`}>
                <Plus className="size-4" aria-hidden="true" />
                {t("addLanguage")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void remove()}
              className="text-destructive ms-auto gap-2"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("delete")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
