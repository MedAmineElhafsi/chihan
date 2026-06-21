"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, Loader2 } from "lucide-react";

import { createReport } from "@/lib/report-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "listing" | "post" | "comment" | "review" | "profile";
  targetId: string;
}) {
  const t = useTranslations("Report");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    await createReport(targetType, targetId, reason);
    setLoading(false);
    setDone(true);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        onClick={() => {
          setDone(false);
          setReason("");
          setOpen(true);
        }}
        aria-label={t("flag")}
      >
        <Flag className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{done ? t("done") : t("body")}</DialogDescription>
          </DialogHeader>
          {!done ? (
            <>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                maxLength={500}
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={submit} disabled={loading} className="gap-2">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {t("submit")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>{t("close")}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
