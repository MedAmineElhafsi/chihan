"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, ShieldCheck } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { saveBuddyProfile } from "@/lib/buddy-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BUDDY_AREAS, type BuddyProfile } from "@/types/buddy";

/**
 * Joining, either way. A buddy cannot join without a checked document, and
 * neither side joins without accepting the promise — which is recorded, so
 * "I didn't know" is never an answer.
 */
export function BuddyForm({
  role,
  entry,
  verified,
  onDone,
}: {
  role: "newcomer" | "mentor";
  entry?: BuddyProfile | null;
  verified: boolean;
  onDone?: () => void;
}) {
  const t = useTranslations("Buddies");
  const router = useRouter();
  const [areas, setAreas] = useState<string[]>(entry?.areas ?? []);
  const [about, setAbout] = useState(entry?.about ?? "");
  const [capacity, setCapacity] = useState(entry?.capacity ?? 1);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsVerification = role === "mentor" && !verified;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveBuddyProfile({
      role,
      areas,
      about,
      capacity,
      agreed,
    });
    setSaving(false);
    if (!res.ok) {
      setError(t(`error_${res.error}` as never));
      return;
    }
    onDone?.();
    router.refresh();
  }

  if (needsVerification) {
    return (
      <div className="panel flex flex-col gap-3 rounded-md p-5">
        <p className="text-air flex items-center gap-2 font-medium">
          <ShieldCheck className="text-cyan size-5" aria-hidden="true" />
          {t("verifyTitle")}
        </p>
        <p className="text-muted-foreground text-sm">{t("verifyBody")}</p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/profile">{t("verifyCta")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="panel flex flex-col gap-5 rounded-md p-5"
    >
      <div>
        <h2 className="font-display text-air text-xl font-semibold">
          {t(role === "mentor" ? "joinMentorTitle" : "joinNewcomerTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t(role === "mentor" ? "joinMentorBody" : "joinNewcomerBody")}
        </p>
      </div>

      <fieldset className="flex flex-col">
        <legend className="label-mono mb-2.5">
          {t(role === "mentor" ? "areasMentor" : "areasNewcomer")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {BUDDY_AREAS.map((a) => {
            const on = areas.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setAreas(on ? areas.filter((x) => x !== a) : [...areas, a])
                }
                className={cn(
                  "rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
                  on
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                )}
              >
                {t(`area_${a}` as never)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="label-mono">{t("aboutLabel")}</span>
        <Textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={t(
            role === "mentor" ? "aboutMentorHint" : "aboutNewcomerHint"
          )}
          maxLength={500}
          dir="auto"
        />
      </label>

      {role === "mentor" && (
        <fieldset className="flex flex-col">
          <legend className="label-mono mb-2.5">{t("capacityLabel")}</legend>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={capacity === n}
                onClick={() => setCapacity(n)}
                className={cn(
                  "flex-1 rounded-sm border px-3 py-2 text-sm transition-colors",
                  capacity === n
                    ? "border-cyan bg-cyan/15 text-cyan"
                    : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
                )}
              >
                {t("capacityN", { n })}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground mt-2 text-xs">
            {t("capacityHint")}
          </span>
        </fieldset>
      )}

      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        aria-pressed={agreed}
        className={cn(
          "flex items-start gap-3 rounded-md border p-4 text-start transition-colors",
          agreed ? "border-cyan/50 bg-cyan/10" : "border-border bg-depth-0/30"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            agreed
              ? "border-cyan bg-cyan text-primary-foreground"
              : "border-input"
          )}
        >
          {agreed && <Check className="size-3.5" aria-hidden="true" />}
        </span>
        <span className="text-sm">
          <span className="text-air block font-medium">
            {t("promiseTitle")}
          </span>
          <span className="text-muted-foreground mt-1 block">
            {t("promiseBody")}
          </span>
        </span>
      </button>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={saving || !agreed}
        className="gap-2 self-start"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {t(entry ? "saveEntry" : "join")}
      </Button>
    </form>
  );
}
