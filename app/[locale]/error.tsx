"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Error");
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleAlert className="size-10 text-gold" />
      <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
