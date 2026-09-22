"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";

import { HELP_PHOTOS_MAX } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export type PickedPhoto = { file: File; url: string };

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
/** Before shrinking; a phone's full-size photo is well under this. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Up to four photos of the thing being given away, previewed in place. */
export function PhotoPicker({
  photos,
  onChange,
  onError,
  disabled,
}: {
  photos: PickedPhoto[];
  onChange: (next: PickedPhoto[]) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Help");
  const input = useRef<HTMLInputElement>(null);

  // Previews are object URLs; free them when they leave.
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  useEffect(
    () => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)),
    []
  );

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    const room = HELP_PHOTOS_MAX - photos.length;
    const good = files.filter(
      (f) => ACCEPT.includes(f.type) && f.size <= MAX_INPUT_BYTES
    );
    onError(good.length < files.length ? t("photoType") : null);
    if (good.length > room) onError(t("photoMax", { max: HELP_PHOTOS_MAX }));
    onChange([
      ...photos,
      ...good.slice(0, room).map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function remove(i: number) {
    URL.revokeObjectURL(photos[i].url);
    onChange(photos.filter((_, j) => j !== i));
  }

  return (
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
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={t("photoRemove", { n: i + 1 })}
              className="bg-depth-0/80 text-air absolute end-1 top-1 flex size-6 items-center justify-center rounded-full"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.length < HELP_PHOTOS_MAX && (
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
            disabled={disabled}
            className="h-20 gap-1.5"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            {t("photosAdd")}
          </Button>
        )}
      </div>
      <span className="text-muted-foreground text-xs">{t("photosHint")}</span>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}
