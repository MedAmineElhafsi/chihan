"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { saveListing } from "@/lib/listing-actions";
import {
  LISTING_CATEGORIES,
  LISTING_PHOTO_MAX_BYTES,
  AVATAR_ACCEPT,
} from "@/lib/constants";
import {
  WEEKDAYS,
  type Listing,
  type ListingDetails,
  type OpeningHours,
  type Weekday,
} from "@/types/listing";
import { normaliseWhatsapp } from "@/lib/opening-hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

type DayDraft = { closed: boolean; open: string; close: string };

/** The editor keeps every day as three plain fields; they become the stored
 *  shape only on save, so half-typed times are never saved. */
function toDrafts(hours: OpeningHours | null | undefined) {
  return Object.fromEntries(
    WEEKDAYS.map((d) => {
      const h = hours?.[d];
      return [
        d,
        h === null
          ? { closed: true, open: "", close: "" }
          : { closed: false, open: h?.open ?? "", close: h?.close ?? "" },
      ];
    })
  ) as Record<Weekday, DayDraft>;
}

function fromDrafts(drafts: Record<Weekday, DayDraft>): OpeningHours | null {
  const out: OpeningHours = {};
  for (const d of WEEKDAYS) {
    const v = drafts[d];
    if (v.closed) out[d] = null;
    else if (v.open && v.close && v.open !== v.close) {
      out[d] = { open: v.open, close: v.close };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function ListingForm({
  initial,
  userId,
  details = null,
  detailsReady = false,
}: {
  initial: Listing | null;
  userId: string;
  /** Hours, WhatsApp and services already saved (migration 0027). */
  details?: ListingDetails | null;
  /** Whether migration 0027 has run; until then those fields are hidden. */
  detailsReady?: boolean;
}) {
  const t = useTranslations("Directory");
  const locale = useLocale();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [whatsapp, setWhatsapp] = useState(details?.whatsapp ?? "");
  const [services, setServices] = useState(
    (details?.services ?? []).join(", ")
  );
  const [hours, setHours] = useState(() => toDrafts(details?.opening_hours));
  const setDay = (d: Weekday, patch: Partial<DayDraft>) =>
    setHours((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  const dayName = (d: Weekday) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(d))));

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "restaurant");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");

  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    initial?.photos ?? []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const valid: File[] = [];
    for (const f of files) {
      if (!(AVATAR_ACCEPT as readonly string[]).includes(f.type)) {
        setError(t("errorPhotoType"));
        continue;
      }
      if (f.size > LISTING_PHOTO_MAX_BYTES) {
        setError(t("errorPhotoSize"));
        continue;
      }
      valid.push(f);
    }
    setNewFiles((prev) => [...prev, ...valid].slice(0, 8));
    setNewPreviews((prev) =>
      [...prev, ...valid.map((f) => URL.createObjectURL(f))].slice(0, 8)
    );
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(t("errorName"));
      return;
    }
    const wa = whatsapp.trim();
    const waNumber = wa ? normaliseWhatsapp(wa) : null;
    if (detailsReady && wa && !waNumber) {
      setError(t("whatsappInvalid"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) throw upErr;
        uploaded.push(
          supabase.storage.from("listing-photos").getPublicUrl(path).data
            .publicUrl
        );
      }

      const res = await saveListing({
        id: initial?.id ?? null,
        name: name.trim(),
        category,
        description,
        address,
        city,
        country,
        phone,
        email,
        website,
        photos: [...existingPhotos, ...uploaded],
        details: detailsReady
          ? {
              whatsapp: waNumber ?? "",
              services: [
                ...new Set(
                  services
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                ),
              ].slice(0, 12),
              opening_hours: fromDrafts(hours),
              // The hours are in the owner's time, and the owner is almost
              // always where the business is.
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : undefined,
      });

      if (!res.ok) {
        setError(res.error || t("errorGeneric"));
        setLoading(false);
        return;
      }
      router.push(`/directory/${res.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <Label>{t("categoryLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {/* "classes" needs migration 0027's category rule to be saved. */}
          {LISTING_CATEGORIES.filter(
            (c) => detailsReady || c !== "classes"
          ).map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                disabled={loading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-cyan/50 bg-cyan/15 text-cyan"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <CategoryIcon category={c} className="size-3.5" />
                {t(`cat_${c}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          maxLength={1000}
          disabled={loading}
        />
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("photosLabel")}</Label>
        <div className="flex flex-wrap gap-3">
          {existingPhotos.map((url) => (
            <div
              key={url}
              className="relative size-24 overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() =>
                  setExistingPhotos((p) => p.filter((x) => x !== url))
                }
                className="absolute end-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
                aria-label="remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {newPreviews.map((url, i) => (
            <div
              key={url}
              className="relative size-24 overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setNewPreviews((p) => p.filter((_, j) => j !== i));
                  setNewFiles((p) => p.filter((_, j) => j !== i));
                }}
                className="absolute end-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
                aria-label="remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={loading}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <ImagePlus className="size-5" />
            <span className="text-xs">{t("addPhoto")}</span>
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{t("photosHint")}</span>
        <input
          ref={fileInput}
          type="file"
          accept={AVATAR_ACCEPT.join(",")}
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address">{t("addressLabel")}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("addressPlaceholder")}
            disabled={loading}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">{t("cityLabel")}</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">{t("countryLabel")}</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{t("locationHint")}</span>
      </div>

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">{t("phoneLabel")}</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            dir="ltr"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="website">{t("websiteLabel")}</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={t("websitePlaceholder")}
            disabled={loading}
            dir="ltr"
          />
        </div>
      </div>

      {detailsReady && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">{t("whatsappLabel")}</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+49 151 2345678"
              aria-describedby="whatsapp-hint"
              disabled={loading}
              dir="ltr"
            />
            <span id="whatsapp-hint" className="text-muted-foreground text-xs">
              {t("whatsappHint")}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="services">{t("servicesLabel")}</Label>
            <Input
              id="services"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder={t("servicesPlaceholder")}
              aria-describedby="services-hint"
              disabled={loading}
            />
            <span id="services-hint" className="text-muted-foreground text-xs">
              {t("servicesHint")}
            </span>
          </div>

          <fieldset className="flex flex-col gap-3" disabled={loading}>
            <legend className="text-sm font-medium">{t("hoursLabel")}</legend>
            <p className="text-muted-foreground text-xs">
              {t("hoursHint")}
            </p>
            <div className="flex flex-col gap-2">
              {WEEKDAYS.map((d) => {
                const v = hours[d];
                return (
                  // On a phone the two times drop under the day; from sm up
                  // the wrapper dissolves and all four share one row.
                  <div
                    key={d}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(5.5rem,auto)_auto_1fr_1fr]"
                  >
                    <span className="text-sm">{dayName(d)}</span>
                    <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={v.closed}
                        onChange={(e) => setDay(d, { closed: e.target.checked })}
                        className="accent-cyan size-4"
                      />
                      {t("hoursClosed")}
                    </label>
                    <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
                      <Input
                        type="time"
                        value={v.open}
                        onChange={(e) => setDay(d, { open: e.target.value })}
                        disabled={v.closed}
                        aria-label={`${dayName(d)}: ${t("hoursOpens")}`}
                        dir="ltr"
                      />
                      <Input
                        type="time"
                        value={v.close}
                        onChange={(e) => setDay(d, { close: e.target.value })}
                        disabled={v.closed}
                        aria-label={`${dayName(d)}: ${t("hoursCloses")}`}
                        dir="ltr"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={!hours.mon.open || !hours.mon.close}
              onClick={() =>
                setHours(
                  (prev) =>
                    Object.fromEntries(
                      WEEKDAYS.map((d) => [
                        d,
                        {
                          closed: false,
                          open: prev.mon.open,
                          close: prev.mon.close,
                        },
                      ])
                    ) as Record<Weekday, DayDraft>
                )
              }
            >
              {t("hoursCopy", { day: dayName("mon") })}
            </Button>
          </fieldset>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" size="lg" className="gap-2" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
