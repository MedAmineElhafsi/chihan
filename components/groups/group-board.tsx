"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarPlus,
  ImagePlus,
  Loader2,
  Megaphone,
  PenLine,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { createGroupPost } from "@/lib/group-feed-actions";
import { AVATAR_ACCEPT, LISTING_PHOTO_MAX_BYTES } from "@/lib/constants";
import { PostCard } from "@/components/feed/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/types/post";

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-card/40 px-3.5 text-sm shadow-elev-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

export function GroupBoard({
  groupId,
  userId,
  canPost,
  initialPosts,
}: {
  groupId: string;
  userId: string | null;
  canPost: boolean;
  initialPosts: FeedItem[];
}) {
  const t = useTranslations("Groups");
  const tFeed = useTranslations("Feed");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"post" | "event">("post");
  const [body, setBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(AVATAR_ACCEPT as readonly string[]).includes(f.type)) {
      setError(tFeed("errorPhotoType"));
      return;
    }
    if (f.size > LISTING_PHOTO_MAX_BYTES) {
      setError(tFeed("errorPhotoSize"));
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !canPost) return;
    setError(null);
    setLoading(true);
    try {
      let media: string[] = [];
      if (tab === "post" && file) {
        const supabase = createClient();
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) throw upErr;
        media = [
          supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl,
        ];
      }

      const res =
        tab === "event"
          ? await createGroupPost({
              groupId,
              type: "event",
              body,
              eventTitle,
              eventAt,
              eventLocation,
            })
          : await createGroupPost({
              groupId,
              type: "post",
              body,
              media,
            });

      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setBody("");
      setEventTitle("");
      setEventAt("");
      setEventLocation("");
      setFile(null);
      setPreview(null);
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tFeed("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <section id="board" className="mt-10 scroll-mt-24">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="size-4 text-cyan" />
        <h2 className="font-display text-xl font-semibold">{t("boardTitle")}</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("boardSubtitle")}</p>

      {!canPost ? (
        <p className="panel rounded-lg px-4 py-8 text-center text-sm text-muted-foreground">
          {userId ? t("boardJoinHint") : t("boardSignInHint")}
        </p>
      ) : (
        <div className="panel rounded-lg p-4">
          <div className="mb-3 flex gap-1.5">
            {(
              [
                { key: "post", label: t("boardTabPost"), icon: PenLine },
                { key: "event", label: t("boardTabEvent"), icon: CalendarPlus },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-cyan/50 bg-cyan/15 text-cyan"
                    : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            {tab === "event" && (
              <>
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={tFeed("eventTitle")}
                  maxLength={140}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="datetime-local"
                    value={eventAt}
                    onChange={(e) => setEventAt(e.target.value)}
                    className={fieldClass}
                  />
                  <Input
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder={tFeed("eventLocation")}
                  />
                </div>
              </>
            )}

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                tab === "event" ? tFeed("eventBody") : t("boardPlaceholder")
              }
              maxLength={2000}
            />

            {tab === "post" && (
              <div className="flex items-center gap-3">
                {preview && (
                  <div className="relative size-16 overflow-hidden rounded-lg border border-border">
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
                      className="absolute end-1 top-1 rounded-full bg-background/80 p-0.5"
                      aria-label="remove"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  {tFeed("addPhoto")}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept={AVATAR_ACCEPT.join(",")}
                  className="hidden"
                  onChange={onPick}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" className="gap-2" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {tab === "event" ? tFeed("createEvent") : t("boardPublish")}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {initialPosts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("boardEmpty")}
          </p>
        ) : (
          initialPosts.map((item) => (
            <PostCard
              key={item.id}
              item={item}
              currentUserId={userId}
              canInteract={canPost}
            />
          ))
        )}
      </div>
    </section>
  );
}
