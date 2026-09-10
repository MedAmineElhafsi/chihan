"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness, Loader2 } from "lucide-react";

import { setOffersService } from "@/lib/professional-actions";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * The switch that makes a member reviewable. Nobody gets a star rating they
 * did not ask for — turning this on is the only way to acquire one.
 */
export function OffersServiceSwitch({
  initialOn,
  hasProfession,
}: {
  initialOn: boolean;
  hasProfession: boolean;
}) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setSaving(true);
    setError(null);
    const res = await setOffersService(next);
    setSaving(false);
    if (!res.ok) {
      setError(res.error === "needs_name" ? t("needsName") : t("serviceFailed"));
      return;
    }
    setOn(next);
    router.refresh();
  }

  return (
    <div className="panel flex flex-col gap-3 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-cyan ring-1 ring-border">
          <BriefcaseBusiness className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-base font-semibold text-air">
            {t("serviceTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {on ? t("serviceOnBody") : t("serviceOffBody")}
          </p>
        </div>
      </div>

      {!hasProfession && !on && (
        <p className="text-xs text-muted-foreground">{t("serviceNoProfession")}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        onClick={toggle}
        disabled={saving}
        variant={on ? "outline" : "default"}
        size="sm"
        className="self-start gap-2"
      >
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        {on ? t("serviceTurnOff") : t("serviceTurnOn")}
      </Button>
    </div>
  );
}
