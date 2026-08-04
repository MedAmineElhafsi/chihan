"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { markRead, sendMessage } from "@/lib/chat-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage, ConversationSummary } from "@/types/chat";

type Props = {
  currentUserId: string;
  conversations: ConversationSummary[];
  activeId: string | null;
  partnerName: string | null;
  partnerAvatar: string | null;
  partnerUserId: string | null;
  initialMessages: ChatMessage[];
  initialOtherLastRead: string | null;
};

export function ChatShell({
  currentUserId,
  conversations: initialConversations,
  activeId,
  partnerName,
  partnerAvatar,
  partnerUserId,
  initialMessages,
  initialOtherLastRead,
}: Props) {
  const t = useTranslations("Chat");
  const locale = useLocale();
  const [convs, setConvs] = useState(initialConversations);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [otherLastRead, setOtherLastRead] = useState(initialOtherLastRead);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale]
  );

  // Mark the active conversation read on open (its unread is derived to 0 below).
  useEffect(() => {
    if (activeId) markRead(activeId);
  }, [activeId]);

  // Realtime: new messages (RLS-scoped to my conversations) + read receipts.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (m.conversation_id === activeId) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
            if (m.sender_id !== currentUserId) markRead(activeId);
          }
          setConvs((prev) =>
            prev.map((c) =>
              c.id === m.conversation_id
                ? {
                    ...c,
                    lastMessage: {
                      body: m.body,
                      created_at: m.created_at,
                      sender_id: m.sender_id,
                    },
                    unread:
                      m.conversation_id === activeId || m.sender_id === currentUserId
                        ? c.unread
                        : c.unread + 1,
                  }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_participants" },
        (payload) => {
          const row = payload.new as {
            conversation_id: string;
            user_id: string;
            last_read_at: string | null;
          };
          if (row.conversation_id === activeId && row.user_id === partnerUserId) {
            setOtherLastRead(row.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, currentUserId, partnerUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    setSending(true);
    setText("");
    const res = await sendMessage(activeId, body);
    setSending(false);
    if (res.ok) {
      setMessages((prev) =>
        prev.some((x) => x.id === res.message.id) ? prev : [...prev, res.message]
      );
    } else {
      setText(body);
    }
  }

  const sortedConvs = [...convs].sort((a, b) =>
    (b.lastMessage?.created_at ?? "").localeCompare(a.lastMessage?.created_at ?? "")
  );

  const myLastMsg = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId);
  const seen =
    myLastMsg != null &&
    otherLastRead != null &&
    new Date(otherLastRead) >= new Date(myLastMsg.created_at);

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full flex-col border-e border-border bg-card/40 md:flex md:w-[22rem]",
          activeId ? "hidden md:flex" : "flex"
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-display text-lg font-semibold">{t("title")}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedConvs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              <p>{t("empty")}</p>
              <p className="mt-1">{t("emptyHint")}</p>
            </div>
          ) : (
            sortedConvs.map((c) => {
              const name = c.partner?.displayName ?? t("partnerFallback");
              const initial = name.trim().charAt(0).toUpperCase();
              const unread = c.id === activeId ? 0 : c.unread;
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/50 px-3.5 py-3 transition-colors hover:bg-accent/70",
                    c.id === activeId && "bg-accent"
                  )}
                >
                  <span className="relative shrink-0">
                    <Avatar className="size-12">
                      {c.partner?.avatarUrl && (
                        <AvatarImage src={c.partner.avatarUrl} alt={name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-sm text-primary-foreground">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    {unread > 0 && (
                      <span className="absolute -end-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-gold text-[0.65rem] font-bold text-primary-foreground ring-2 ring-card">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          unread > 0 ? "font-semibold" : "font-medium"
                        )}
                      >
                        {name}
                      </span>
                    </div>
                    {c.lastMessage && (
                      <p
                        className={cn(
                          "mt-0.5 truncate text-xs",
                          unread > 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {c.lastMessage.sender_id === currentUserId
                          ? `${t("you")}: `
                          : ""}
                        {c.lastMessage.body}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={cn(
          "flex-1 flex-col bg-muted/15",
          activeId ? "flex" : "hidden md:flex"
        )}
      >
        {!activeId ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
            {t("selectConversation")}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border bg-card/60 px-3 py-2.5 backdrop-blur-sm">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("back")}
              >
                <Link href="/messages">
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
              <Avatar className="size-9">
                {partnerAvatar && (
                  <AvatarImage src={partnerAvatar} alt={partnerName ?? ""} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-gold to-kurd-red text-sm text-primary-foreground">
                  {(partnerName ?? t("partnerFallback")).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold">
                {partnerName ?? t("partnerFallback")}
              </span>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-4"
            >
              {messages.map((m) => {
                const mine = m.sender_id === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-0.5",
                      mine ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-[1.15rem] px-3.5 py-2 text-sm leading-snug shadow-sm",
                        mine
                          ? "rounded-ee-md bg-primary text-primary-foreground"
                          : "rounded-es-md bg-card text-card-foreground ring-1 ring-border/80"
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="px-1.5 text-[0.65rem] text-muted-foreground">
                      {timeFmt.format(new Date(m.created_at))}
                    </span>
                  </div>
                );
              })}
              {seen && (
                <div className="px-1.5 text-end text-[0.65rem] text-muted-foreground">
                  {t("seen")}
                </div>
              )}
            </div>

            <form
              onSubmit={onSend}
              className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-card/90 px-3 py-2.5 backdrop-blur-md"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("messagePlaceholder")}
                className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                maxLength={2000}
              />
              <Button
                type="submit"
                size="icon"
                className="size-11 shrink-0 rounded-full"
                disabled={sending || !text.trim()}
                aria-label={t("send")}
              >
                {sending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" />
                )}
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
