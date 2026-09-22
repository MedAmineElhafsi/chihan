"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Lightbulb, Loader2 } from "lucide-react";

import { suggestGuide } from "@/lib/guide-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "This should be a guide." From the guides list, or from a request that
 * was answered — then it carries the request along, so whoever writes the
 * guide can read how it was solved.
 */
export function SuggestGuideButton({
  defaultTitle = "",
  defaultCity = "",
  requestId,
  alreadySuggested = false,
  variant = "outline",
}: {
  defaultTitle?: string;
  defaultCity?: string;
  requestId?: string;
  alreadySuggested?: boolean;
  variant?: "outline" | "panel";
}) {
  const t = useTranslations("Guides");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(alreadySuggested);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await suggestGuide({
      title,
      note,
      city: defaultCity,
      requestId,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  if (done && variant === "panel") {
    return (
      <p className="text-success inline-flex items-center gap-1.5 text-sm">
        <Check className="size-4" aria-hidden="true" />
        {t("suggested")}
      </p>
    );
  }

  return (
    <>
      {variant === "panel" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-cyan/40 text-cyan hover:bg-cyan/10 inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors"
        >
          <Lightbulb className="size-4" aria-hidden="true" />
          {t("suggestFromRequest")}
        </button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <Lightbulb className="size-4" aria-hidden="true" />
          {t("suggest")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suggestTitle")}</DialogTitle>
            <DialogDescription>
              {done ? t("suggestedBody") : t("suggestBody")}
            </DialogDescription>
          </DialogHeader>
          {!done && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="label-mono">{t("suggestWhat")}</span>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("suggestPlaceholder")}
                  maxLength={140}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label-mono">{t("suggestNote")}</span>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
              </label>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          )}
          <DialogFooter>
            {done ? (
              <Button onClick={() => setOpen(false)}>{t("close")}</Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={loading || title.trim().length < 3}
                className="gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {t("suggestSend")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
