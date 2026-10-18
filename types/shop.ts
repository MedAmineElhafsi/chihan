export const PRODUCT_STATUSES = [
  "draft",
  "pending",
  "listed",
  "held",
  "withdrawn",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_LICENCES = ["personal", "commercial"] as const;
export type ProductLicence = (typeof PRODUCT_LICENCES)[number];

export const SHOP_FILE_BUCKET = "shop-files";
export const SHOP_PREVIEW_BUCKET = "shop-previews";

/** What a maker uploads, and what a reader sees on the shelf. */
export type Product = {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  licence: ProductLicence;
  /** Public URL of the small image anyone may look at. */
  preview_url: string | null;
  file_path: string | null;
  file_bytes: number | null;
  file_type: string | null;
  status: ProductStatus;
  flags: string[];
  downloads: number;
  created_at: string;
  updated_at: string;
  /** The maker, as far as a reader may see them. */
  maker: {
    userId: string;
    profileId: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export const PRODUCT_COLUMNS =
  "id, seller_id, slug, title, description, price_cents, currency, licence, preview_path, file_path, file_bytes, file_type, status, flags, downloads, created_at, updated_at";

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export function toProduct(
  r: Record<string, unknown>,
  previewUrl: string | null = null
): Product {
  return {
    id: String(r.id),
    seller_id: String(r.seller_id),
    slug: String(r.slug),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    price_cents: Number(r.price_cents ?? 0),
    currency: String(r.currency ?? "eur"),
    licence: (r.licence === "commercial"
      ? "commercial"
      : "personal") as ProductLicence,
    preview_url: previewUrl,
    file_path: str(r.file_path),
    file_bytes: r.file_bytes != null ? Number(r.file_bytes) : null,
    file_type: str(r.file_type),
    status: String(r.status ?? "pending") as ProductStatus,
    flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
    downloads: Number(r.downloads ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    maker: null,
  };
}

/** "2.4 MB" — a reader deciding whether to tap it on mobile data. */
export function fileSize(bytes: number | null, locale = "en"): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(mb)} MB`;
  }
  return `${new Intl.NumberFormat(locale).format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** A short word for what the file is, from its media type. */
export function fileKind(type: string | null): string {
  if (!type) return "";
  if (type === "application/pdf") return "PDF";
  if (type === "image/svg+xml") return "SVG";
  if (type === "application/zip") return "ZIP";
  if (type.startsWith("image/")) return type.slice(6).toUpperCase();
  if (type.startsWith("font/")) return type.slice(5).toUpperCase();
  return "";
}
