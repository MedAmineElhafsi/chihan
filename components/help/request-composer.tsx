"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, X } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { createHelpRequest } from "@/lib/help-actions";
import { shrinkImage } from "@/lib/image-shrink";
import {
  HELP_CATEGORIES,
  HELP_CATEGORY_STYLE,
  HELP_PHOTO_BUCKET,
  HELP_URGENCIES,
  LAUNCH_CITY,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useVoiceRecorder } from "@/components/voice/use-voice-recorder";
import { VoiceField } from "@/components/voice/voice-recorder-ui";
import { HelpCategoryIcon } from "./category-icon";
import {
  InterpreterFields,
  defaultInterpreterDraft,
  type InterpreterDraft,
} from "./interpreter-fields";
import { PhotoPicker, type PickedPhoto } from "./photo-picker";

export function RequestComposer({
  defaultCity,
  userId,
  voiceEnabled = false,
  interpreters = false,
  freeItems = false,
  spokenLanguages = [],
}: {
  defaultCity?: string;
  userId: string;
  /** Each of these is offered once its migration has run. */
  voiceEnabled?: boolean;
  interpreters?: boolean;
  freeItems?: boolean;
  /** The asker's own languages, to guess an interpreter request's pair. */
  spokenLanguages?: string[];
}) {
  const t = useTranslations("Help");
  const router = useRouter();
  const recorder = useVoiceRecorder();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("housing");
  const [urgency, setUrgency] = useState<string>("normal");
  const [city, setCity] = useState(defaultCity ?? LAUNCH_CITY);
  const [kind, setKind] = useState<"ask" | "give">("ask");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [interp, setInterp] = useState<InterpreterDraft>(() =>
    defaultInterpreterDraft(spokenLanguages)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = HELP_CATEGORIES.filter(
    (c) =>
      (c !== "interpreting" || interpreters) && (c !== "items" || freeItems)
  );
  const isInterpreting = category === "interpreting";
  const isItems = category === "items";
  const giving = isItems && kind === "give";
  // A give has no urgency, and an interpreter request has a date and time,
  // which says more than "soon" — two "When"s would only confuse.
  const showUrgency = !giving && !isInterpreting;
  const hasVoice = Boolean(recorder.result);

  // With a voice note the words are optional: the recording says it. The
  // board still needs a line to show, so it gets a plain one.
  const effectiveTitle =
    title.trim().length >= 6 || !hasVoice
      ? title
      : t("voiceTitle", { category: t(`cat_${category}` as never) });

  async function uploadPhotos(): Promise<string[] | null> {
    const supabase = createClient();
    const paths: string[] = [];
    for (const p of photos) {
      let blob: Blob;
      try {
        blob = await shrinkImage(p.file);
      } catch {
        setError(t("photoType"));
        return null;
      }
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(HELP_PHOTO_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        setError(t("photoUpload"));
        return null;
      }
      paths.push(path);
    }
    return paths;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (effectiveTitle.trim().length < 6) {
      setError(t("errorTitle"));
      return;
    }
    if (isInterpreting && interp.from === interp.to) {
      setError(t("interpSame"));
      return;
    }
    setLoading(true);
    const voice = recorder.result ? await recorder.upload(userId) : null;
    if (recorder.result && !voice) {
      setLoading(false);
      return;
    }
    const photoPaths = giving && photos.length ? await uploadPhotos() : [];
    if (photoPaths === null) {
      setLoading(false);
      return;
    }

    const res = await createHelpRequest({
      title: effectiveTitle,
      body,
      category,
      urgency: showUrgency ? urgency : "normal",
      city,
      country: "",
      voice,
      kind: isItems ? kind : "ask",
      photos: photoPaths,
      ...(isInterpreting
        ? {
            interpretFrom: interp.from,
            interpretTo: interp.to,
            setting: interp.setting ?? undefined,
            meeting: interp.meeting,
            neededAt: interp.neededAt
              ? new Date(interp.neededAt).toISOString()
              : undefined,
          }
        : {}),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle("");
    setBody("");
    setPhotos([]);
    recorder.reset();
    setOpen(false);
    // The action has already refreshed the board; refreshing here as well
    // would cancel this navigation and leave the asker on the board.
    router.push(`/help/${res.id}`);
  }

  if (!open) {
    return (
      <Button size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("askCta")}
      </Button>
    );
  }

  const placeholder = isInterpreting
    ? t("interpTitlePlaceholder")
    : giving
      ? t("giveTitlePlaceholder")
      : isItems
        ? t("askItemTitlePlaceholder")
        : t("titlePlaceholder");

  return (
    <form
      onSubmit={submit}
      className="panel flex w-full flex-col gap-5 rounded-md p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-air text-xl font-semibold">
            {giving ? t("giveTitle") : t("askTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {giving ? t("giveBody") : t("askBody")}
          </p>
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

      <div className="flex flex-col gap-2.5">
        <span className="label-mono">{t("categoryLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const s = HELP_CATEGORY_STYLE[c];
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "text-air border-transparent"
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

      {isItems && (
        <div
          role="radiogroup"
          aria-label={t("kindLabel")}
          className="grid grid-cols-2 gap-2"
        >
          {(["ask", "give"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-sm border px-3 py-2.5 text-sm transition-colors",
                kind === k
                  ? "border-cyan bg-cyan/15 text-cyan"
                  : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
              )}
            >
              {t(k === "give" ? "kindGive" : "kindAsk")}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="label-mono">
          {giving ? t("giveWhatLabel") : t("whatLabel")}
        </span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={140}
          required={!hasVoice}
        />
        {hasVoice && title.trim().length < 6 && (
          <span className="text-muted-foreground text-xs">
            {t("voiceTitleHint", { title: effectiveTitle })}
          </span>
        )}
      </div>

      {isInterpreting && (
        <InterpreterFields value={interp} onChange={setInterp} />
      )}

      {giving && (
        <PhotoPicker
          photos={photos}
          onChange={setPhotos}
          onError={setError}
          disabled={loading}
        />
      )}

      <div className={cn("grid gap-4", showUrgency && "sm:grid-cols-2")}>
        {showUrgency && (
          <div className="flex flex-col gap-2.5">
            <span className="label-mono">{t("urgencyLabel")}</span>
            <div className="flex gap-2">
              {HELP_URGENCIES.map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={urgency === u}
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
        )}

        <div className="flex flex-col gap-2">
          <span className="label-mono">
            {giving ? t("pickupLabel") : t("cityLabel")}
          </span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label-mono">{t("detailsLabel")}</span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            giving ? t("giveDetailsPlaceholder") : t("detailsPlaceholder")
          }
          maxLength={2000}
        />
      </div>

      {voiceEnabled && (
        <div className="flex flex-col gap-2">
          <span className="label-mono">{t("voiceLabel")}</span>
          <VoiceField recorder={recorder} disabled={loading} />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="label-mono">{t("freeNote")}</p>
        <Button
          type="submit"
          disabled={loading || recorder.status === "recording"}
          className="gap-2"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {giving ? t("giveCta") : t("postCta")}
        </Button>
      </div>
    </form>
  );
}
