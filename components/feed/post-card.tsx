"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  CalendarPlus,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import {
  addComment,
  deletePost,
  fetchComments,
  toggleLike,
} from "@/lib/feed-actions";
import { setEventRsvp } from "@/lib/event-rsvp-actions";
import { downloadEventIcs } from "@/lib/event-ics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/moderation/report-button";
import { cn } from "@/lib/utils";
import type { FeedItem, PostComment, RsvpStatus } from "@/types/post";

export function PostCard({
  item,
  currentUserId,
  canInteract,
}: {
  item: FeedItem;
  currentUserId: string | null;
  canInteract: boolean;
}) {
  const t = useTranslations("Feed");
  const locale = useLocale();
  const router = useRouter();

  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(item.my_rsvp);
  const [goingCount, setGoingCount] = useState(item.rsvp_going);
  const [interestedCount, setInterestedCount] = useState(
    item.rsvp_interested
  );
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [, startT] = useTransition();

  const name = item.author.displayName ?? t("member");
  const initial = name.charAt(0).toUpperCase();
  const isAuthor = currentUserId === item.author_id;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const eventFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  });

  function onLike() {
    if (!canInteract) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    startT(async () => {
      const res = await toggleLike(item.id);
      if (res.ok && res.liked != null) setLiked(res.liked);
    });
  }

  function toggleComments() {
    setShowComments((s) => !s);
    if (comments === null) {
      startT(async () => setComments(await fetchComments(item.id)));
    }
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    startT(async () => {
      const res = await addComment(item.id, body);
      if (res.ok) {
        setCommentText("");
        setComments(await fetchComments(item.id));
      }
    });
  }

  function onDelete() {
    startT(async () => {
      await deletePost(item.id);
      router.refresh();
    });
  }

  function onRsvp(next: RsvpStatus) {
    if (!canInteract) return;
    const prev = myRsvp;
    const clearing = prev === next;
    const status = clearing ? null : next;

    setMyRsvp(status);
    setGoingCount((c) => {
      let n = c;
      if (prev === "going") n -= 1;
      if (status === "going") n += 1;
      return Math.max(0, n);
    });
    setInterestedCount((c) => {
      let n = c;
      if (prev === "interested") n -= 1;
      if (status === "interested") n += 1;
      return Math.max(0, n);
    });

    startT(async () => {
      const res = await setEventRsvp(item.id, status);
      if (!res.ok) {
        setMyRsvp(prev);
        setGoingCount(item.rsvp_going);
        setInterestedCount(item.rsvp_interested);
      }
    });
  }

  const nameNode = item.author.profileId ? (
    <Link href={`/u/${item.author.profileId}`} className="hover:underline">
      {name}
    </Link>
  ) : (
    name
  );

  return (
    <article className="social-surface overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-11">
            {item.author.avatarUrl && (
              <AvatarImage src={item.author.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-cyan to-depth-4 text-sm text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{nameNode}</div>
            <div className="text-xs text-muted-foreground">
              {dateFmt.format(new Date(item.created_at))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.type === "event" && (
            <span className="rounded-md bg-cyan/15 px-2 py-0.5 text-[11px] font-medium text-cyan">
              {t("event")}
            </span>
          )}
          {isAuthor ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={onDelete}
              aria-label={t("delete")}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : (
            canInteract && <ReportButton targetType="post" targetId={item.id} />
          )}
        </div>
      </header>

      {item.type === "event" && (
        <div className="mx-4 mt-3 rounded-lg border border-cyan/25 bg-cyan/5 p-3.5 sm:mx-5">
          <div className="font-display text-lg font-semibold leading-snug">
            {item.event_title}
          </div>
          {item.event_at && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-cyan">
              <CalendarDays className="size-3.5 shrink-0" />
              {eventFmt.format(new Date(item.event_at))}
            </div>
          )}
          {item.event_location && (
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{item.event_location}</span>
              {item.distance_km != null && (
                <span className="shrink-0 text-cyan">
                  · {t("distanceKm", { km: Math.round(item.distance_km) })}
                </span>
              )}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "going" as const, label: t("rsvpGoing"), count: goingCount },
                {
                  key: "interested" as const,
                  label: t("rsvpInterested"),
                  count: interestedCount,
                },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                disabled={!canInteract}
                onClick={() => onRsvp(key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                  myRsvp === key
                    ? "border-cyan/50 bg-cyan/20 text-cyan"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {count > 0 ? ` · ${count}` : ""}
              </button>
            ))}
            <button
              type="button"
              onClick={() => downloadEventIcs(item)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <CalendarPlus className="size-3.5" />
              {t("addToCalendar")}
            </button>
          </div>
        </div>
      )}

      {item.body && (
        <p className="mt-3 whitespace-pre-wrap px-4 text-base leading-relaxed text-foreground/90 sm:px-5">
          {item.body}
        </p>
      )}

      {item.media.length > 0 && (
        <div className="mt-3 overflow-hidden border-y border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.media[0]}
            alt=""
            className="max-h-[32rem] w-full object-cover"
          />
        </div>
      )}

      <footer className="mt-1 grid grid-cols-2 gap-1 border-t border-border/70 px-2 py-1.5">
        <button
          onClick={onLike}
          disabled={!canInteract}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
            liked
              ? "text-destructive"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Heart className={cn("size-5", liked && "fill-destructive")} />
          {t("like")}
          {likeCount > 0 ? ` · ${likeCount}` : ""}
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <MessageSquare className="size-5" />
          {t("comment")}
          {item.comment_count > 0 ? ` · ${item.comment_count}` : ""}
        </button>
      </footer>

      {showComments && (
        <div className="flex flex-col gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5">
          {comments === null ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noComments")}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-card/80 px-3 py-2 text-sm">
                <span className="font-semibold">
                  {c.author_name ?? t("member")}
                </span>{" "}
                <span className="text-foreground/90">{c.body}</span>
              </div>
            ))
          )}
          {canInteract && (
            <form onSubmit={submitComment} className="mt-0.5 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={800}
                className="h-10 flex-1 rounded-full border border-input bg-card px-4 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
              <Button
                type="submit"
                size="icon"
                variant="outline"
                className="size-10 shrink-0 rounded-full"
                aria-label={t("comment")}
              >
                <Send className="size-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
