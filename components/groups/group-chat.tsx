"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/env";
import { sendGroupMessage } from "@/lib/group-chat-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GroupMessage } from "@/types/group-message";
import { voiceFromRow } from "@/types/voice";
import { useVoiceRecorder } from "@/components/voice/use-voice-recorder";
import {
  RecordingStrip,
  VoiceProblem,
} from "@/components/voice/voice-recorder-ui";
import { VoicePlayer } from "@/components/voice/voice-player";

export function GroupChat({
  groupId,
  currentUserId,
  initialMessages,
  canChat,
  voiceEnabled = false,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: GroupMessage[];
  canChat: boolean;
  /** Recording is offered once migration 0028 has run. */
  voiceEnabled?: boolean;
}) {
  const t = useTranslations("Groups");
  const tVoice = useTranslations("Voice");
  const recorder = useVoiceRecorder();
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
          const row = payload.new as Record<string, unknown>;
          const id = String(row.id);
          setMessages((prev) => {
            if (prev.some((m) => m.id === id)) return prev;
            return [
              ...prev,
              {
                id,
                group_id: String(row.group_id),
                sender_id: String(row.sender_id),
                body: String(row.body ?? ""),
                created_at: String(row.created_at),
                sender_name: null,
                sender_avatar: null,
                voice: voiceFromRow(row),
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

  async function onSendVoice() {
    if (!canChat || !recorder.result) return;
    const voice = await recorder.upload(currentUserId);
    if (!voice) return;
    setSending(true);
    const res = await sendGroupMessage(groupId, "", voice);
    setSending(false);
    if (res.ok) {
      recorder.reset();
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id)
          ? prev
          : [...prev, res.message]
      );
    }
  }

  return (
    <section className="panel mt-10 flex flex-col overflow-hidden rounded-lg">
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
                        "rounded-lg px-3 py-2 text-sm",
                        mine
                          ? "bg-cyan/20 text-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-xs font-medium text-cyan">
                          {name}
                        </div>
                      )}
                      {m.voice && (
                        <VoicePlayer note={m.voice} className="my-0.5" />
                      )}
                      {m.body && (
                        <p
                          dir="auto"
                          className="whitespace-pre-wrap break-words"
                        >
                          {m.body}
                        </p>
                      )}
                      <div className="mt-1 text-[0.625rem] text-muted-foreground">
                        {timeFmt.format(new Date(m.created_at))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border/60">
            <VoiceProblem problem={recorder.problem} className="px-3 pt-2" />
            {recorder.status === "recording" ? (
              <div className="flex items-center gap-2 p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={recorder.discard}
                  aria-label={tVoice("cancel")}
                  className="shrink-0 text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
                <RecordingStrip recorder={recorder} />
                <Button
                  type="button"
                  size="icon"
                  onClick={recorder.stop}
                  aria-label={tVoice("stop")}
                  className="shrink-0"
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              </div>
            ) : recorder.result &&
              (recorder.status === "recorded" ||
                recorder.status === "uploading") ? (
              <div className="flex items-center gap-2 p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={recorder.discard}
                  disabled={recorder.status === "uploading" || sending}
                  aria-label={tVoice("discard")}
                  className="shrink-0 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </Button>
                <VoicePlayer
                  note={{
                    path: "",
                    ms: recorder.result.ms,
                    peaks: recorder.result.peaks,
                    url: recorder.result.url,
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void onSendVoice()}
                  disabled={recorder.status === "uploading" || sending}
                  aria-label={tVoice("send")}
                  className="shrink-0"
                >
                  {recorder.status === "uploading" || sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={onSend} className="flex items-center gap-2 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("chatPlaceholder")}
                  aria-label={t("chatPlaceholder")}
                  maxLength={2000}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
                {voiceEnabled && !text.trim() ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => void recorder.start()}
                    disabled={recorder.status === "requesting"}
                    aria-label={tVoice("record")}
                  >
                    {recorder.status === "requesting" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mic className="size-4" />
                    )}
                  </Button>
                ) : (
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
                )}
              </form>
            )}
          </div>
        </>
      )}
    </section>
  );
}
