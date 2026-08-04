"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Loader2, Mail, Trash2 } from "lucide-react";

import {
  createAppInvite,
  revokeInvite,
  type AppInviteRow,
} from "@/lib/invite-actions";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm({ initial }: { initial: AppInviteRow[] }) {
  const t = useTranslations("Invite");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLink(null);
    setEmailed(false);
    setLoading(true);
    try {
      const res = await createAppInvite(email);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setLink(res.link);
      setEmailed(res.emailed);
      setEmail("");
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function onRevoke(id: string) {
    setRevoking(id);
    await revokeInvite(id);
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onCreate} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-email">{t("emailLabel")}</Label>
          <Input
            id="invite-email"
            type="email"
            required
            dir="ltr"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="gap-2 self-start" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          {t("send")}
        </Button>
      </form>

      {link && (
        <div className="glass rounded-xl border border-gold/30 p-4 ring-1 ring-gold/15">
          <p className="text-sm font-medium text-gold">
            {emailed ? t("createdEmailed") : t("createdLinkOnly")}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              dir="ltr"
              className="min-w-0 flex-1 truncate rounded-md bg-secondary/60 px-3 py-2 text-xs"
            >
              {link}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onCopy}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium">{t("listTitle")}</h3>
        {initial.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
            {initial.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium" dir="ltr">
                  {inv.email}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {t(`status.${inv.status}` as "status.pending")}
                </span>
                {inv.status === "pending" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={revoking === inv.id}
                    onClick={() => onRevoke(inv.id)}
                  >
                    {revoking === inv.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    {t("revoke")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
