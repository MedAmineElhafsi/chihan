"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HandHeart, Loader2 } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { offerHelp } from "@/lib/help-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function OfferForm({
  requestId,
  isAuthenticated,
}: {
  requestId: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("Help");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-md p-4 text-sm text-muted-foreground">
        {t("signInToHelp")}
        <Button asChild size="sm">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    setLoading(true);
    const res = await offerHelp(requestId, body);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? t("errorGeneric"));
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-3 rounded-md p-4">
      <span className="label-mono">{t("offerLabel")}</span>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("offerPlaceholder")}
        maxLength={1200}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="label-mono">{t("freeNote")}</p>
        <Button type="submit" disabled={loading || !body.trim()} className="gap-2">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <HandHeart className="size-4" />
          )}
          {t("offerCta")}
        </Button>
      </div>
    </form>
  );
}
