"use client";

import { useCanTranslate } from "@/components/translate/translate-provider";
import { useTranslate } from "@/components/translate/use-translate";
import { TranslateToggle } from "@/components/translate/translate-toggle";

/**
 * A request's own words, and the switch into the reader's language. A
 * Sorani request read by a Kurmanji speaker, or by the German neighbour who
 * could help, is only useful once it can be understood.
 */
export function RequestText({
  id,
  title,
  body,
  children,
}: {
  id: string;
  title: string;
  body: string | null;
  /** Rendered between the title and the body: the voice note, the facts. */
  children?: React.ReactNode;
}) {
  const canTranslate = useCanTranslate();
  const translation = useTranslate("help_request", id);
  const shownTitle = translation.fields?.title ?? title;
  const shownBody = translation.fields?.body ?? body;

  return (
    <>
      <h1
        dir="auto"
        className="font-display text-air text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight"
      >
        {shownTitle}
      </h1>

      {children}

      {shownBody && (
        <p
          dir="auto"
          className="text-foreground/90 leading-relaxed whitespace-pre-wrap"
        >
          {shownBody}
        </p>
      )}

      {canTranslate && <TranslateToggle state={translation} />}
    </>
  );
}

/** A reply's words, translatable the same way. */
export function OfferText({ id, body }: { id: string; body: string }) {
  const canTranslate = useCanTranslate();
  const translation = useTranslate("help_offer", id);
  if (!body) return null;
  return (
    <>
      <p
        dir="auto"
        className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap"
      >
        {translation.fields?.body ?? body}
      </p>
      {canTranslate && <TranslateToggle state={translation} />}
    </>
  );
}
