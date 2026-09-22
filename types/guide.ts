export const GUIDE_TOPICS = [
  "registration",
  "health_insurance",
  "schools",
  "residence",
  "work",
  "housing",
  "language",
  "money",
  "family",
  "other",
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number];

export const GUIDE_LOCALES = ["en", "de", "ku", "ckb", "ar"] as const;
export type GuideLocale = (typeof GUIDE_LOCALES)[number];

export type GuideStep = { title: string; body: string };
export type GuideLink = { label: string; url: string };

export type Guide = {
  id: string;
  slug: string;
  locale: GuideLocale;
  topic: GuideTopic;
  country: string;
  city: string | null;
  title: string;
  summary: string | null;
  steps: GuideStep[];
  links: GuideLink[];
  status: "draft" | "published";
  reviewed_on: string | null;
  updated_at: string;
  /** Every language this guide exists in (published ones, for readers). */
  languages: GuideLocale[];
};

export type GuideSuggestion = {
  id: string;
  suggested_by: string;
  suggester_name: string | null;
  request_id: string | null;
  city: string | null;
  title: string;
  note: string | null;
  status: "open" | "done" | "dismissed";
  created_at: string;
};

export const GUIDE_COLUMNS =
  "id, slug, locale, topic, country, city, title, summary, steps, links, status, reviewed_on, updated_at";

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

function steps(v: unknown): GuideStep[] {
  return Array.isArray(v)
    ? v
        .map((s) => ({
          title: String((s as GuideStep)?.title ?? "").trim(),
          body: String((s as GuideStep)?.body ?? "").trim(),
        }))
        .filter((s) => s.title || s.body)
    : [];
}

function links(v: unknown): GuideLink[] {
  return Array.isArray(v)
    ? v
        .map((l) => ({
          label: String((l as GuideLink)?.label ?? "").trim(),
          url: String((l as GuideLink)?.url ?? "").trim(),
        }))
        .filter((l) => /^https:\/\//.test(l.url))
    : [];
}

export function toGuide(
  r: Record<string, unknown>,
  languages: GuideLocale[] = []
): Guide {
  return {
    id: String(r.id),
    slug: String(r.slug),
    locale: String(r.locale) as GuideLocale,
    topic: String(r.topic) as GuideTopic,
    country: String(r.country ?? ""),
    city: str(r.city),
    title: String(r.title),
    summary: str(r.summary),
    steps: steps(r.steps),
    links: links(r.links),
    status: r.status === "published" ? "published" : "draft",
    reviewed_on: str(r.reviewed_on),
    updated_at: String(r.updated_at),
    languages,
  };
}
