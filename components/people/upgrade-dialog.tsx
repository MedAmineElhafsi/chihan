"use client";

import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("Upgrade");
  const benefits = ["b1", "b2", "b3", "b4"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 inline-flex size-11 items-center justify-center rounded-xl bg-cyan/15 text-cyan ring-1 ring-cyan/30">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <ul className="mt-3 flex flex-col gap-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm">
              <Check className="size-4 shrink-0 text-cyan" />
              {t(b)}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            {t("later")}
          </Button>
          <Button asChild className="glow">
            <Link href="/pricing">{t("seePlans")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
