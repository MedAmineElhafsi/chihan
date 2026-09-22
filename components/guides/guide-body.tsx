"use client";

import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";

import { useCanTranslate } from "@/components/translate/translate-provider";
import { useTranslate } from "@/components/translate/use-translate";
import { TranslateToggle } from "@/components/translate/translate-toggle";
import type { Guide } from "@/types/guide";

/**
 * A guide's words: title, summary and the steps, numbered. When the guide
 * is not written in the reader's language yet, it says so, and offers to
 * translate it rather than leave them with a language they cannot read.
 */
export function GuideBody({
  guide,
  readerLocale,
}: {
  guide: Guide;
  readerLocale: string;
}) {
  const t = useTranslations("Guides");
  const canTranslate = useCanTranslate();
  const translation = useTranslate("guide", guide.id);
  const f = translation.fields;
  const foreign = guide.locale !== readerLocale;

  const title = f?.title ?? guide.title;
  const summary = f?.summary ?? guide.summary;
  const steps = guide.steps.map((s, i) => ({
    title: f?.[`step_${i}_title`] ?? s.title,
    body: f?.[`step_${i}_body`] ?? s.body,
  }));

  return (
    <>
      <h1
        dir="auto"
        className="font-display text-air text-[clamp(1.9rem,4.5vw,3rem)] leading-[1.05] font-semibold tracking-tight"
      >
        {title}
      </h1>
      {summary && (
        <p
          dir="auto"
          className="text-foreground/90 max-w-2xl text-lg leading-relaxed"
        >
          {summary}
        </p>
      )}

      {foreign && (
        <div className="panel flex flex-col gap-2 rounded-md p-4 text-sm">
          <p className="text-foreground/90 flex items-start gap-2">
            <Languages
              className="text-cyan mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {t("writtenIn", { language: t(`lang_${guide.locale}` as never) })}
          </p>
          {canTranslate && (
            <TranslateToggle state={translation} className="ps-6" />
          )}
        </div>
      )}

      <ol className="mt-2 flex flex-col">
        {steps.map((s, i) => (
          <li
            key={i}
            className="relative grid grid-cols-[2.75rem_1fr] gap-x-3 pb-7 last:pb-0"
          >
            {/* The line that joins one step to the next. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-border absolute start-[1.1rem] top-10 bottom-1 w-px"
              />
            )}
            <span className="border-cyan/40 text-cyan bg-depth-1 flex size-9 items-center justify-center rounded-full border font-mono text-sm font-medium tabular-nums">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1.5 pt-1">
              {s.title && (
                <h2
                  dir="auto"
                  className="font-display text-air text-lg leading-snug font-semibold"
                >
                  {s.title}
                </h2>
              )}
              {s.body && (
                <p
                  dir="auto"
                  className="text-foreground/90 leading-relaxed whitespace-pre-wrap"
                >
                  {s.body}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
