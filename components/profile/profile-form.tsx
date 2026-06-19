"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { saveProfile } from "@/lib/profile-actions";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  KURDISH_DIALECTS,
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

  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? []);
  const [dialect, setDialect] = useState(initial?.dialect ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial?.avatar_url ?? null
  );
  const [removeAvatar, setRemoveAvatar] = useState(false);

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

  function toggleLanguage(l: string) {
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
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
                onClick={() => toggleLanguage(l)}
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
