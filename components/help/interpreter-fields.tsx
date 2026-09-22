"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";

import {
  INTERPRET_MEETINGS,
  INTERPRET_SETTINGS,
  SPOKEN_LANGUAGES,
} from "@/lib/constants";
import { languageLabel } from "@/lib/language-label";
import { cn } from "@/lib/utils";

export type InterpreterDraft = {
  from: string;
  to: string;
  setting: string | null;
  meeting: string;
  /** A datetime-local value, in the asker's own time. */
  neededAt: string;
};

const KURDISH = ["Kurmancî", "Soranî", "Zazakî", "Hewramî", "Southern Kurdish"];

/**
 * Sensible first guesses: the asker's own Kurdish, into the language of the
 * country they live in — which for the launch city is German.
 */
export function defaultInterpreterDraft(
  spoken: string[] = []
): InterpreterDraft {
  const from = spoken.find((l) => KURDISH.includes(l)) ?? "Kurmancî";
  const local = ["German", "Swedish", "Dutch", "French", "English"];
  const to =
    local.find((l) => spoken.includes(l) && l !== "English") ?? "German";
  return { from, to, setting: null, meeting: "in_person", neededAt: "" };
}

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-card/40 px-3 text-sm shadow-elev-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

const chip = (active: boolean) =>
  cn(
    "rounded-sm border px-2.5 py-1.5 text-sm transition-colors",
    active
      ? "border-cyan bg-cyan/15 text-cyan"
      : "border-border bg-depth-0/40 text-muted-foreground hover:text-air"
  );

/** Which two languages, where, how and when: the four facts a volunteer needs. */
export function InterpreterFields({
  value,
  onChange,
}: {
  value: InterpreterDraft;
  onChange: (next: InterpreterDraft) => void;
}) {
  const t = useTranslations("Help");
  const locale = useLocale();
  const set = (patch: Partial<InterpreterDraft>) =>
    onChange({ ...value, ...patch });

  // The earliest time the picker offers: now, on the asker's own clock.
  // Taken once, when the form opens.
  const [minWhen] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  return (
    <div className="border-border/70 flex flex-col gap-5 rounded-md border p-4">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="label-mono mb-2.5">{t("interpLanguages")}</legend>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select
            aria-label={t("interpFrom")}
            value={value.from}
            onChange={(e) => set({ from: e.target.value })}
            className={fieldClass}
          >
            {SPOKEN_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {languageLabel(l, locale)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => set({ from: value.to, to: value.from })}
            aria-label={t("interpSwap")}
            className="text-muted-foreground hover:text-air flex size-9 items-center justify-center rounded-full transition-colors"
          >
            <ArrowLeftRight className="size-4" aria-hidden="true" />
          </button>
          <select
            aria-label={t("interpTo")}
            value={value.to}
            onChange={(e) => set({ to: e.target.value })}
            className={fieldClass}
          >
            {SPOKEN_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {languageLabel(l, locale)}
              </option>
            ))}
          </select>
        </div>
        {value.from === value.to && (
          <p className="text-destructive text-sm">{t("interpSame")}</p>
        )}
      </fieldset>

      <fieldset className="flex flex-col">
        <legend className="label-mono mb-2.5">{t("interpWhere")}</legend>
        <div className="flex flex-wrap gap-2">
          {INTERPRET_SETTINGS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={value.setting === s}
              onClick={() => set({ setting: value.setting === s ? null : s })}
              className={chip(value.setting === s)}
            >
              {t(`setting_${s}` as never)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset className="flex flex-col">
          <legend className="label-mono mb-2.5">{t("interpHow")}</legend>
          <div className="flex gap-2">
            {INTERPRET_MEETINGS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={value.meeting === m}
                onClick={() => set({ meeting: m })}
                className={cn(chip(value.meeting === m), "flex-1 px-2")}
              >
                {t(`meeting_${m}` as never)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2.5">
          <span className="label-mono">{t("interpWhen")}</span>
          <input
            type="datetime-local"
            value={value.neededAt}
            min={minWhen}
            onChange={(e) => set({ neededAt: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}
