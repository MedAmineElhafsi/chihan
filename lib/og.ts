import type { Metadata } from "next";

/**
 * What a link looks like when it is pasted into WhatsApp (or anywhere that
 * reads Open Graph).
 *
 * Next merges `openGraph` shallowly: a page that sets any of it replaces the
 * layout's whole block, image included. So every page builds its preview
 * through here, and the brand image is always the fallback rather than
 * something one page forgets.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/og/cihan.jpg",
  width: 1200,
  height: 630,
  alt: "Cîhan",
};

export function preview({
  title,
  description,
  image,
  locale,
  type = "website",
}: {
  title: string;
  description?: string;
  /** Absolute URL, or a path under metadataBase. Falls back to the brand. */
  image?: string | null;
  locale: string;
  type?: "website" | "article";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const images = image ? [{ url: image, alt: title }] : [DEFAULT_OG_IMAGE];
  return {
    openGraph: {
      type,
      siteName: "Cîhan",
      locale,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

/** A single line for a preview: whitespace collapsed, cut at a word. */
export function snippet(text: string | null | undefined, max = 160): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}
