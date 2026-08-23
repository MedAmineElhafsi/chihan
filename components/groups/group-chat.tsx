"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageSquare, Send } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { sendGroupMessage } from "@/lib/group-chat-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroupMessage } from "@/types/group-message";

export function GroupChat({
  groupId,
  currentUserId,
  initialMessages,
  canChat,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: GroupMessage[];
  canChat: boolean;
}) {
  const t = useTranslations("Groups");
  const locale = useLocale();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale]
  );

  // Re-sync when the server sends genuinely new messages. Adjusting state
  // during render is React's supported pattern for this; doing it in an effect
  // triggers a cascading re-render. Comparing a content signature (not array
  // identity) avoids clobbering messages that arrived live over Realtime.
  const serverSignature = initialMessages.map((m) => m.id).join(",");
  const [syncedSignature, setSyncedSignature] = useState(serverSignature);
  if (serverSignature !== syncedSignature) {
    setSyncedSignature(serverSignature);
    setMessages(initialMessages);
  }

  useEffect(() => {
    if (!canChat || !supabaseConfigured) return;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      for (const existing of supabase.getChannels()) {
        if (existing.topic.includes(`group-chat:${groupId}`)) {
          await supabase.removeChannel(existing);
        }
      }
      if (cancelled) return;

      const next = supabase.channel(
        `group-chat:${groupId}:${crypto.randomUUID()}`
      );
      next.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            group_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                ...row,
                sender_name: null,
                sender_avatar: null,
              },
            ];
          });
        }
      );
      next.subscribe();
      if (cancelled) {
        await supabase.removeChannel(next);
        return;
      }
      channel = next;
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [groupId, canChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !canChat) return;
    setSending(true);
    const res = await sendGroupMessage(groupId, body);
    setSending(false);
    if (res.ok) {
      setText("");
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id)
          ? prev
          : [...prev, res.message]
      );
    }
  }

  return (
    <section className="panel mt-10 flex flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <MessageSquare className="size-4 text-cyan" />
        <h2 className="font-display text-lg font-semibold">{t("chatTitle")}</h2>
      </div>

      {!canChat ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {t("chatJoinHint")}
        </p>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 ? (
              <p className="my-auto text-center text-sm text-muted-foreground">
                {t("chatEmpty")}
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === currentUserId;
                const name = m.sender_name || t("member");
                const initial = name.trim().charAt(0).toUpperCase() || "?";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex max-w-[85%] gap-2",
                      mine ? "ms-auto flex-row-reverse" : "me-auto"
                    )}
                  >
                    {!mine && (
                      <Avatar className="size-8 shrink-0">
                        {m.sender_avatar && (
                          <AvatarImage src={m.sender_avatar} alt={name} />
                        )}
                        <AvatarFallback className="bg-secondary text-xs">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        mine
                          ? "bg-cyan/20 text-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-[0.7rem] font-medium text-cyan">
                          {name}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <div className="mt-1 text-[0.65rem] text-muted-foreground">
                        {timeFmt.format(new Date(m.created_at))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={onSend}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chatPlaceholder")}
              maxLength={2000}
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !text.trim()}
              aria-label={t("chatSend")}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
