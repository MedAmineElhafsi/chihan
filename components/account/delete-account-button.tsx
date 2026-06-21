"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { deleteAccount } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteAccountButton() {
  const t = useTranslations("Settings");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startT] = useTransition();

  function confirm() {
    setError(null);
    startT(async () => {
      const res = await deleteAccount();
      if (res.ok) {
        window.location.assign("/");
      } else {
        setError(res.error ?? t("deleteError"));
      }
    });
  }

  return (
    <>
      <Button variant="destructive" className="gap-2" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        {t("deleteCta")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirmBody")}</DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
