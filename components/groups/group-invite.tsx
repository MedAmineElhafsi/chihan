"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Link2, Loader2, UserPlus } from "lucide-react";

import { inviteToGroup } from "@/lib/group-invite-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { InviteCandidate } from "@/types/group";

export type { InviteCandidate };

export function GroupInvite({
  groupId,
  groupName,
  memberIds,
  candidates,
  canInvite,
}: {
  groupId: string;
  groupName: string;
  memberIds: string[];
  candidates: InviteCandidate[];
  canInvite: boolean;
}) {
  const t = useTranslations("Groups");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [pending, startT] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter((c) => !memberSet.has(c.user_id) && !sent.has(c.user_id))
      .filter((c) => {
        if (!q) return true;
        const hay =
          `${c.display_name ?? ""} ${c.city ?? ""} ${c.country ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [candidates, memberSet, query, sent]);

  async function copyLink() {
    try {
      const url = window.location.href.split("?")[0].split("#")[0];
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("inviteCopyFail"));
    }
  }

  function onInvite(userId: string) {
    setError(null);
    startT(async () => {
      const res = await inviteToGroup(groupId, userId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent((prev) => new Set(prev).add(userId));
    });
  }

  if (!canInvite) return null;

  return (
    <section className="glass mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-gold" />
          <h2 className="font-display text-lg font-semibold">{t("inviteTitle")}</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void copyLink()}
        >
          {copied ? (
            <Check className="size-4 text-kurd-green" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? t("inviteCopied") : t("inviteCopyLink")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("inviteSubtitle", { name: groupName })}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link2 className="size-3.5" />
        {t("inviteOrPeople")}
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("inviteSearch")}
        className="mt-2"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <ul className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <li className="py-4 text-center text-sm text-muted-foreground">
            {t("inviteEmpty")}
          </li>
        ) : (
          filtered.map((c) => {
            const name = c.display_name || t("member");
            const initial = name.trim().charAt(0).toUpperCase() || "?";
            const place = [c.city, c.country].filter(Boolean).join(", ");
            return (
              <li
                key={c.user_id}
                className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2"
              >
                <Avatar className="size-9">
                  {c.avatar_url && (
                    <AvatarImage src={c.avatar_url} alt={name} />
                  )}
                  <AvatarFallback className="bg-secondary text-xs">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  {place && (
                    <div className="truncate text-xs text-muted-foreground">
                      {place}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => onInvite(c.user_id)}
                  className="gap-1.5"
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="size-3.5" />
                  )}
                  {t("inviteSend")}
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
