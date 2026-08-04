"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { saveProfile } from "@/lib/profile-actions";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  INTERESTS,
  KURDISH_DIALECTS,
  LOOKING_FOR,
  OFFERING,
  ORIGIN_REGIONS,
  PROFILE_PHOTOS_MAX,
  PROFESSIONS,
  PROFESSION_STYLE,
  SPOKEN_LANGUAGES,
} from "@/lib/constants";
import type { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ProfileForm({
  initial,
  userId,
}: {
  initial: Profile | null;
  userId: string;
}) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? []);
  const [dialect, setDialect] = useState(initial?.dialect ?? "");
  const [profession, setProfession] = useState(initial?.profession ?? "");
  const [originRegion, setOriginRegion] = useState(
    initial?.origin_region ?? ""
  );
  const [interests, setInterests] = useState<string[]>(
    initial?.interests ?? []
  );
  const [lookingFor, setLookingFor] = useState<string[]>(
    initial?.looking_for ?? []
  );
  const [offering, setOffering] = useState<string[]>(initial?.offering ?? []);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial?.avatar_url ?? null
  );
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = (displayName.trim().charAt(0) || "?").toUpperCase();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(AVATAR_ACCEPT as readonly string[]).includes(file.type)) {
      setError(t("errorPhotoType"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(t("errorPhotoSize"));
      return;
    }
    setError(null);
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setAvatarFile(null);
    setRemoveAvatar(true);
    setAvatarPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (galleryInput.current) galleryInput.current.value = "";
    if (files.length === 0) return;

    const remaining = PROFILE_PHOTOS_MAX - photos.length;
    if (remaining <= 0) return;

    const batch = files.slice(0, remaining);
    for (const file of batch) {
      if (!(AVATAR_ACCEPT as readonly string[]).includes(file.type)) {
        setError(t("errorPhotoType"));
        return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
        setError(t("errorPhotoSize"));
        return;
      }
    }

    setError(null);
    setGalleryUploading(true);
    try {
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const file of batch) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        uploaded.push(
          supabase.storage.from("profile-photos").getPublicUrl(path).data
            .publicUrl
        );
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, PROFILE_PHOTOS_MAX));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setGalleryUploading(false);
    }
  }

  function removeGalleryPhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  function toggleIn(
    setter: Dispatch<SetStateAction<string[]>>,
    value: string
  ) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (displayName.trim().length < 2) {
      setError(t("errorName"));
      return;
    }

    setLoading(true);
    try {
      let avatarUrl: string | null = removeAvatar
        ? null
        : (initial?.avatar_url ?? null);

      if (avatarFile) {
        const supabase = createClient();
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path)
          .data.publicUrl;
      }

      const res = await saveProfile({
        displayName: displayName.trim(),
        bio,
        city,
        country,
        languages,
        dialect,
        profession,
        originRegion,
        interests,
        lookingFor,
        offering,
        photos,
        avatarUrl,
        isPublic,
      });

      if (!res.ok) {
        setError(res.error || t("errorGeneric"));
        setLoading(false);
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-border">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-gold to-kurd-red text-2xl font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("photoLabel")}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInput.current?.click()}
              disabled={loading}
            >
              <ImagePlus className="size-4" />
              {avatarPreview ? t("photoChange") : t("photoUpload")}
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={clearPhoto}
                disabled={loading}
              >
                <Trash2 className="size-4" />
                {t("photoRemove")}
              </Button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{t("photoHint")}</span>
          <input
            ref={fileInput}
            type="file"
            accept={AVATAR_ACCEPT.join(",")}
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </div>

      {/* Photo gallery */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("photosLabel")}</Label>
        <span className="text-xs text-muted-foreground">{t("photosHint")}</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl bg-secondary ring-1 ring-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryPhoto(url)}
                disabled={loading}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1.5 text-xs font-medium text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
                {t("photosRemove")}
              </button>
            </div>
          ))}
          {photos.length < PROFILE_PHOTOS_MAX && (
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              disabled={loading || galleryUploading}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card/30 text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
            >
              {galleryUploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span className="text-xs font-medium">{t("photosAdd")}</span>
            </button>
          )}
        </div>
        <input
          ref={galleryInput}
          type="file"
          accept={AVATAR_ACCEPT.join(",")}
          multiple
          className="hidden"
          onChange={onPickGallery}
        />
      </div>

      {/* Display name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">{t("nameLabel")}</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={60}
          required
          disabled={loading}
        />
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">{t("bioLabel")}</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("bioPlaceholder")}
          maxLength={400}
          disabled={loading}
        />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">{t("cityLabel")}</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("cityPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">{t("countryLabel")}</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("countryPlaceholder")}
              disabled={loading}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("locationHint")}</p>
      </div>

      {/* Profession */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("professionLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {PROFESSIONS.map((p) => {
            const active = profession === p;
            const style = PROFESSION_STYLE[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => setProfession(active ? "" : p)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-transparent text-foreground"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
                style={
                  active
                    ? {
                        backgroundColor: `${style.color}26`,
                        borderColor: style.color,
                      }
                    : undefined
                }
              >
                <span
                  className="flex size-4 items-center justify-center rounded-full text-[0.6rem]"
                  style={{ backgroundColor: style.color }}
                >
                  {style.icon}
                </span>
                {t(`prof_${p}` as never)}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {t("professionHint")}
        </span>
      </div>

      {/* Origin */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("originLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {ORIGIN_REGIONS.map((o) => {
            const active = originRegion === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOriginRegion(active ? "" : o)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`origin_${o}` as never)}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">{t("originHint")}</span>
      </div>

      {/* Languages */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("languagesLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {SPOKEN_LANGUAGES.map((l) => {
            const active = languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleIn(setLanguages, l)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dialect */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("dialectLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {KURDISH_DIALECTS.map((d) => {
            const active = dialect === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDialect(active ? "" : d)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interests */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("interestsLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((item) => {
            const active = interests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleIn(setInterests, item)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`int_${item}` as never)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Looking for */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("lookingLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR.map((item) => {
            const active = lookingFor.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleIn(setLookingFor, item)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-kurd-green/50 bg-kurd-green/15 text-kurd-green"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`looking_${item}` as never)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offering */}
      <div className="flex flex-col gap-2.5">
        <Label>{t("offeringLabel")}</Label>
        <div className="flex flex-wrap gap-2">
          {OFFERING.map((item) => {
            const active = offering.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleIn(setOffering, item)}
                disabled={loading}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-kurd-red/50 bg-kurd-red/15 text-kurd-red"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`offer_${item}` as never)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Consent */}
      <button
        type="button"
        onClick={() => setIsPublic((v) => !v)}
        aria-pressed={isPublic}
        disabled={loading}
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
          isPublic
            ? "border-gold/50 bg-gold/10"
            : "border-border bg-card/30 hover:border-border"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            isPublic
              ? "border-gold bg-gold text-primary-foreground"
              : "border-input bg-transparent"
          )}
        >
          {isPublic && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t("consentTitle")}
          </span>
          <span className="text-sm font-medium text-foreground/90">
            {t("consentLabel")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("consentHint")}
          </span>
        </span>
      </button>

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
