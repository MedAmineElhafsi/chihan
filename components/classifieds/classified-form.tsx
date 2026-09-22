"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ImagePlus,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { createClassified } from "@/lib/classified-actions";
import { shrinkImage } from "@/lib/image-shrink";
import { SPOKEN_LANGUAGES } from "@/lib/constants";
import { languageLabel } from "@/lib/language-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BOARD_PHOTO_BUCKET,
  CLASSIFIED_PHOTOS_MAX,
  HOUSING_TYPES,
  JOB_TYPES,
  PAY_UNITS,
  RENT_KINDS,
  type ClassifiedKind,
} from "@/types/classified";

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-card/40 px-3 text-sm shadow-elev-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

/**
 * The same phrases the database watches for, so an honest poster who was
 * about to write "deposit before viewing" is told before they post rather
 * than after their advert is held.
 */
const WATCHED = [
  /before (the )?(viewing|visit)/i,
  /(western union|money ?gram|wire transfer)/i,
  /(bitcoin|usdt|crypto)/i,
  /(keys by (post|mail)|i am abroad)/i,
  /(registration|application|training) fee/i,
];

export function ClassifiedForm({
  kind,
  userId,
  locale,
  verified,
}: {
  kind: ClassifiedKind;
  userId: string;
  locale: string;
  verified: boolean;
}) {
  const t = useTranslations("Board");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState<string>(
    kind === "housing" ? "room" : "part_time"
  );
  const [rent, setRent] = useState("");
  const [rentKind, setRentKind] = useState<string>("warm");
  const [sizeM2, setSizeM2] = useState("");
  const [rooms, setRooms] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [deposit, setDeposit] = useState("");
  const [employer, setEmployer] = useState("");
  const [pay, setPay] = useState("");
  const [payUnit, setPayUnit] = useState<string>("hour");
  const [languages, setLanguages] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Array<{ file: File; url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watched = WATCHED.some((re) => re.test(`${title} ${description}`));
  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : null);

  if (!verified) {
    return (
      <div className="panel flex flex-col gap-3 rounded-md p-5">
        <p className="text-air flex items-center gap-2 font-medium">
          <ShieldCheck className="text-cyan size-5" aria-hidden="true" />
          {t("verifyTitle")}
        </p>
        <p className="text-muted-foreground text-sm">{t("verifyBody")}</p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/profile">{t("verifyCta")}</Link>
        </Button>
      </div>
    );
  }

  function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    const room = CLASSIFIED_PHOTOS_MAX - photos.length;
    setPhotos([
      ...photos,
      ...files
        .filter((f) =>
          ["image/jpeg", "image/png", "image/webp"].includes(f.type)
        )
        .slice(0, room)
        .map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  }

  async function uploadPhotos(): Promise<string[] | null> {
    const supabase = createClient();
    const paths: string[] = [];
    for (const p of photos) {
      try {
        const blob = await shrinkImage(p.file);
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BOARD_PHOTO_BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      } catch {
        setError(t("error_photo"));
        return null;
      }
    }
    return paths;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const paths =
      kind === "housing" && photos.length ? await uploadPhotos() : [];
    if (paths === null) {
      setLoading(false);
      return;
    }

    const res = await createClassified({
      kind,
      title,
      description,
      city,
      district,
      ...(kind === "housing"
        ? {
            housingType: type,
            rent: num(rent),
            rentKind,
            sizeM2: num(sizeM2),
            rooms: num(rooms),
            availableFrom,
            deposit: num(deposit),
            photos: paths,
          }
        : {
            jobType: type,
            employer,
            pay: num(pay),
            payUnit,
            languages,
          }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t(`error_${res.error}` as never));
      return;
    }
    router.push(
      `${kind === "housing" ? "/housing" : "/jobs"}/${res.id}${res.held ? "?held=1" : ""}`
    );
  }

  const types = kind === "housing" ? HOUSING_TYPES : JOB_TYPES;

  return (
    <form
      onSubmit={submit}
      className="panel flex flex-col gap-5 rounded-md p-5"
    >
      <fieldset className="flex flex-col">
        <legend className="label-mono mb-2.5">{t("typeLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={type === x}
              onClick={() => setType(x)}
              className={cn(
                "rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                type === x
                  ? "border-cyan bg-cyan/15 text-cyan"
                  : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
              )}
            >
              {t(`${kind === "housing" ? "housing" : "job"}_${x}` as never)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="label-mono">{t("titleLabel")}</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            kind === "housing" ? "titleHousingHint" : "titleJobHint"
          )}
          maxLength={140}
          dir="auto"
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="label-mono">{t("cityLabel")}</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">
            {t(kind === "housing" ? "districtLabel" : "employerLabel")}
          </span>
          {kind === "housing" ? (
            <Input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              dir="auto"
            />
          ) : (
            <Input
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              maxLength={120}
              dir="auto"
            />
          )}
        </label>
      </div>

      {kind === "housing" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("rentLabel")}</span>
              <Input
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                inputMode="numeric"
                dir="ltr"
              />
            </label>
            <fieldset className="flex flex-col">
              <legend className="label-mono mb-2.5">
                {t("rentKindLabel")}
              </legend>
              <div className="flex gap-2">
                {RENT_KINDS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={rentKind === r}
                    onClick={() => setRentKind(r)}
                    className={cn(
                      "flex-1 rounded-sm border px-2 py-2 text-sm transition-colors",
                      rentKind === r
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                    )}
                  >
                    {t(`rent_${r}` as never)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("depositLabel")}</span>
              <Input
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                inputMode="numeric"
                dir="ltr"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("sizeLabel")}</span>
              <Input
                value={sizeM2}
                onChange={(e) => setSizeM2(e.target.value)}
                inputMode="numeric"
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("roomsLabel")}</span>
              <Input
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                inputMode="decimal"
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("fromLabel")}</span>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="label-mono">{t("payLabel")}</span>
              <Input
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                inputMode="numeric"
                dir="ltr"
              />
            </label>
            <fieldset className="flex flex-col">
              <legend className="label-mono mb-2.5">{t("payUnitLabel")}</legend>
              <div className="flex gap-2">
                {PAY_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={payUnit === u}
                    onClick={() => setPayUnit(u)}
                    className={cn(
                      "flex-1 rounded-sm border px-2 py-2 text-sm transition-colors",
                      payUnit === u
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                    )}
                  >
                    {t(`payUnit_${u}` as never)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <fieldset className="flex flex-col">
            <legend className="label-mono mb-2.5">{t("languagesLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {SPOKEN_LANGUAGES.map((l) => {
                const on = languages.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setLanguages(
                        on
                          ? languages.filter((x) => x !== l)
                          : languages.length < 4
                            ? [...languages, l]
                            : languages
                      )
                    }
                    className={cn(
                      "rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                      on
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                    )}
                  >
                    {languageLabel(l, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}

      <label className="flex flex-col gap-2">
        <span className="label-mono">{t("descriptionLabel")}</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(
            kind === "housing" ? "descriptionHousingHint" : "descriptionJobHint"
          )}
          maxLength={3000}
          dir="auto"
          className="min-h-[8rem]"
          required
        />
      </label>

      {kind === "housing" && (
        <div className="flex flex-col gap-2.5">
          <span className="label-mono">{t("photosLabel")}</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {photos.map((p, i) => (
              <div
                key={p.url}
                className="border-border relative size-20 overflow-hidden rounded-md border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(p.url);
                    setPhotos(photos.filter((_, j) => j !== i));
                  }}
                  aria-label={t("photoRemove", { n: i + 1 })}
                  className="bg-depth-0/80 text-air absolute end-1 top-1 flex size-6 items-center justify-center rounded-full"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {photos.length < CLASSIFIED_PHOTOS_MAX && (
              <label className="border-border text-muted-foreground hover:text-air flex h-20 cursor-pointer items-center gap-1.5 rounded-md border px-4 text-sm transition-colors">
                <ImagePlus className="size-4" aria-hidden="true" />
                {t("photosAdd")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={pickPhotos}
                />
              </label>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {t("photosHint")}
          </span>
        </div>
      )}

      {watched && (
        <p className="border-destructive/40 bg-destructive/10 text-foreground/90 flex items-start gap-2 rounded-md border p-3 text-sm">
          <TriangleAlert
            className="text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {t("watchedHint")}
        </p>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-mono">{t("expiryNote")}</p>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("post")}
        </Button>
      </div>
    </form>
  );
}
