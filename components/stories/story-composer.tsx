"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { createStory } from "@/lib/story-actions";
import { AVATAR_ACCEPT, LISTING_PHOTO_MAX_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StoryComposer({ userId }: { userId: string }) {
  const t = useTranslations("Stories");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setCaption("");
    setError(null);
    setLoading(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(AVATAR_ACCEPT as readonly string[]).includes(f.type)) {
      setError(t("errorPhotoType"));
      return;
    }
    if (f.size > LISTING_PHOTO_MAX_BYTES) {
      setError(t("errorPhotoSize"));
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(t("errorNeedPhoto"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/stories/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const mediaUrl = supabase.storage
        .from("post-media")
        .getPublicUrl(path).data.publicUrl;

      const res = await createStory({
        mediaUrl,
        caption: caption.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-[5rem] shrink-0 flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5"
      >
        <span className="relative flex size-16 items-center justify-center rounded-full border-2 border-dashed border-gold/55 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
          <Plus className="size-6" />
        </span>
        <span className="w-full truncate text-center text-xs font-medium leading-tight text-muted-foreground">
          {t("add")}
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t("composeTitle")}</DialogTitle>
            <DialogDescription>{t("composeBody")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {preview ? (
              <div className="relative aspect-[9/16] max-h-64 overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt=""
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute end-2 top-2 rounded-full bg-background/80 p-1"
                  aria-label={t("removePhoto")}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-28 gap-2 border-dashed"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="size-5" />
                {t("pickPhoto")}
              </Button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={AVATAR_ACCEPT.join(",")}
              className="hidden"
              onChange={onPick}
            />

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("captionPlaceholder")}
              maxLength={280}
              rows={2}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" className="gap-2" disabled={loading || !file}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {t("post")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
