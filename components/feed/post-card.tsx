"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedItem, PostComment } from "@/types/post";

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

  const nameNode = item.author.profileId ? (
    <Link href={`/u/${item.author.profileId}`} className="hover:underline">
      {name}
    </Link>
  ) : (
    name
  );

  return (
    <article className="glass rounded-2xl p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            {item.author.avatarUrl && (
              <AvatarImage src={item.author.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-sm text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{nameNode}</div>
            <div className="text-xs text-muted-foreground">
              {dateFmt.format(new Date(item.created_at))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {item.type === "event" && (
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
              {t("event")}
            </span>
          )}
          {isAuthor && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={onDelete}
              aria-label={t("delete")}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {item.type === "event" && (
        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
          <div className="font-display text-lg font-semibold">
            {item.event_title}
          </div>
          {item.event_at && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gold">
              <CalendarDays className="size-4" />
              {eventFmt.format(new Date(item.event_at))}
            </div>
          )}
          {item.event_location && (
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {item.event_location}
            </div>
          )}
        </div>
      )}

      {item.body && (
        <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">
          {item.body}
        </p>
      )}

      {item.media.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.media[0]} alt="" className="max-h-96 w-full object-cover" />
        </div>
      )}

      <footer className="mt-4 flex items-center gap-5 border-t border-border/60 pt-3">
        <button
          onClick={onLike}
          disabled={!canInteract}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors disabled:opacity-60",
            liked ? "text-kurd-red" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("size-4", liked && "fill-kurd-red")} />
          {likeCount}
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageSquare className="size-4" />
          {item.comment_count}
        </button>
      </footer>

      {showComments && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border/60 pt-3">
          {comments === null ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noComments")}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.author_name ?? t("member")}</span>{" "}
                <span className="text-foreground/90">{c.body}</span>
              </div>
            ))
          )}
          {canInteract && (
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={800}
                className="h-10 flex-1 rounded-full border border-input bg-card/40 px-4 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
