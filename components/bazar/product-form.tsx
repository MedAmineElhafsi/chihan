"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { FileUp, ImagePlus, Loader2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { saveProduct, deleteProduct } from "@/lib/shop-actions";
import { shrinkImage } from "@/lib/image-shrink";
import {
  PRODUCT_LICENCES,
  SHOP_FILE_BUCKET,
  SHOP_PREVIEW_BUCKET,
  fileSize,
  type Product,
} from "@/types/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FILE_ACCEPT = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/zip",
  "font/otf",
  "font/ttf",
];
const FILE_MAX_BYTES = 100 * 1024 * 1024;
const PREVIEW_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** a–z, digits and hyphens, from whatever was typed. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Putting something on the shelf.
 *
 * Phase A gives everything away, so there is no price here at all — the
 * column exists in the database for Phase B, and leaving the field out is
 * the clearest way of saying that nothing is for sale yet.
 */
export function ProductForm({
  product,
  userId,
  selling = false,
}: {
  product?: Product;
  /** Whose folder the uploads go in. */
  userId: string;
  /** Whether anything here can carry a price yet. */
  selling?: boolean;
}) {
  const t = useTranslations("Bazar");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const previewInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [description, setDescription] = useState(product?.description ?? "");
  const [licence, setLicence] = useState(product?.licence ?? "personal");
  const [price, setPrice] = useState(
    product?.price_cents ? String(product.price_cents / 100) : ""
  );
  const [status, setStatus] = useState<"draft" | "listed" | "held">(
    product?.status === "listed" || product?.status === "held"
      ? product.status
      : "draft"
  );

  const [filePath, setFilePath] = useState(product?.file_path ?? "");
  const [fileBytes, setFileBytes] = useState(product?.file_bytes ?? 0);
  const [fileType, setFileType] = useState(product?.file_type ?? "");
  const [fileName, setFileName] = useState("");

  const [previewPath, setPreviewPath] = useState("");
  const [previewUrl, setPreviewUrl] = useState(product?.preview_url ?? "");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!FILE_ACCEPT.includes(f.type)) {
      setError(t("errorFileType"));
      return;
    }
    if (f.size > FILE_MAX_BYTES) {
      setError(t("errorFileSize"));
      return;
    }
    setError(null);
    setBusy("file");
    try {
      const supabase = createClient();
      const ext = f.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(SHOP_FILE_BUCKET)
        .upload(path, f, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      setFilePath(path);
      setFileBytes(f.size);
      setFileType(f.type);
      setFileName(f.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function pickPreview(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!PREVIEW_ACCEPT.includes(f.type)) {
      setError(t("errorFileType"));
      return;
    }
    setError(null);
    setBusy("preview");
    try {
      // Shrunk in the browser, which also drops the camera's metadata.
      const small = await shrinkImage(f, 1200);
      const supabase = createClient();
      const path = `${userId}/${Date.now()}-preview.jpg`;
      const { error: upErr } = await supabase.storage
        .from(SHOP_PREVIEW_BUCKET)
        .upload(path, small, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      setPreviewPath(path);
      setPreviewUrl(
        supabase.storage.from(SHOP_PREVIEW_BUCKET).getPublicUrl(path).data
          .publicUrl
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFailed"));
    } finally {
      setBusy(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!filePath) {
      setError(t("errorNoFile"));
      return;
    }
    start(async () => {
      const res = await saveProduct({
        id: product?.id,
        slug,
        title,
        description,
        licence,
        priceCents: Math.round(Number(price.replace(",", ".") || 0) * 100),
        sellerId: product?.seller_id ?? "",
        filePath,
        fileBytes,
        fileType,
        previewPath,
        status,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/bazar");
      router.refresh();
    });
  }

  function remove() {
    if (!product) return;
    start(async () => {
      const res = await deleteProduct(product.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/admin/bazar");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">{t("formTitle")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={140}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">{t("formSlug")}</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          dir="ltr"
          className="font-mono"
          required
        />
        <span className="text-muted-foreground text-xs">
          /bazar/{slug || "…"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("formDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={3000}
          required
          className="min-h-[7rem]"
        />
        <span className="text-muted-foreground text-xs">
          {t("formDescriptionHint")}
        </span>
      </div>

      {/* The file itself */}
      <div className="panel flex flex-col gap-3 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{t("formFile")}</h2>
            <p className="text-muted-foreground text-sm">
              {filePath
                ? [fileName || filePath.split("/").pop(), fileSize(fileBytes)]
                    .filter(Boolean)
                    .join(" · ")
                : t("formFileHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
            className="gap-2"
          >
            {busy === "file" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileUp className="size-4" aria-hidden="true" />
            )}
            {filePath ? t("formReplace") : t("formChoose")}
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={FILE_ACCEPT.join(",")}
          onChange={pickFile}
          className="hidden"
        />
      </div>

      {/* What anybody may look at */}
      <div className="panel flex flex-col gap-3 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{t("formPreview")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("formPreviewHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => previewInput.current?.click()}
            disabled={busy !== null}
            className="gap-2"
          >
            {busy === "preview" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-4" aria-hidden="true" />
            )}
            {previewUrl ? t("formReplace") : t("formChoose")}
          </Button>
        </div>
        {previewUrl && (
          <div className="border-border relative w-fit overflow-hidden rounded-md border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-28 w-auto object-cover" />
            <button
              type="button"
              onClick={() => {
                setPreviewUrl("");
                setPreviewPath("");
              }}
              aria-label={t("formRemovePreview")}
              className="bg-background/80 absolute top-1 right-1 rounded-full p-1"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <input
          ref={previewInput}
          type="file"
          accept={PREVIEW_ACCEPT.join(",")}
          onChange={pickPreview}
          className="hidden"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {selling && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">{t("formPrice")}</Label>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("formPricePlaceholder")}
            />
            <span className="text-muted-foreground text-xs">
              {t("formPriceHint")}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="licence">{t("formLicence")}</Label>
          <select
            id="licence"
            value={licence}
            onChange={(e) =>
              setLicence(e.target.value as (typeof PRODUCT_LICENCES)[number])
            }
            className="border-input bg-card/40 h-11 rounded-md border px-3 text-sm"
          >
            {PRODUCT_LICENCES.map((l) => (
              <option key={l} value={l}>
                {t(`licence_${l}` as never)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">{t("formStatus")}</Label>
          <select
            id="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "draft" | "listed" | "held")
            }
            className="border-input bg-card/40 h-11 rounded-md border px-3 text-sm"
          >
            <option value="draft">{t("status_draft")}</option>
            <option value="listed">{t("status_listed")}</option>
            <option value="held">{t("status_held")}</option>
          </select>
        </div>
      </div>

      {!selling && (
        <p className="text-muted-foreground text-sm">{t("formFreeNote")}</p>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending || busy !== null}
          className="gap-2"
        >
          {pending && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {t("formSave")}
        </Button>
        {product && (
          <Button
            type="button"
            variant="outline"
            onClick={remove}
            disabled={pending}
            className="text-destructive"
          >
            {t("formDelete")}
          </Button>
        )}
      </div>
    </form>
  );
}
