"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TranslateState } from "./use-translate";

const ERROR_KEY = {
  unavailable: "errorUnavailable",
  signin: "errorSignin",
  notfound: "errorFailed",
  limit: "errorLimit",
  failed: "errorFailed",
} as const;

/** "Kurdish (Sorani)" rather than the "Central Kurdish" an engine says. */
function useLanguageName() {
  const t = useTranslations("Translate");
  const locale = useLocale();
  return (code: string | null) => {
    if (!code) return null;
    if (code === "ku" || code === "kmr") return t("lang_ku");
    if (code === "ckb") return t("lang_ckb");
    try {
      return (
        new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code
      );
    } catch {
      return code;
    }
  };
}

/**
 * The quiet link under a text. Tapped, it swaps the words in place and says
 * where they came from — and that Google did the translating, because the
 * text was sent there to be translated and a reader should know that.
 */
export function TranslateToggle({
  state,
  className,
}: {
  state: TranslateState;
  className?: string;
}) {
  const t = useTranslations("Translate");
  const locale = useLocale();
  const languageName = useLanguageName();

  if (state.status === "translated") {
    const from = languageName(state.detected);
    const same = state.detected === locale;
    return (
      <p
        className={cn(
          "text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed",
          className
        )}
      >
        <Languages className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {same
            ? t("already")
            : from
              ? t("from", { language: from })
              : t("translated")}
          {" · "}
          {t("byGoogle")}
          {/* Nothing changed when it was already in this language, so
              there is no original to go back to. */}
          {!same && (
            <button
              type="button"
              onClick={state.showOriginal}
              className="text-cyan ms-2 font-medium underline-offset-2 hover:underline"
            >
              {t("original")}
            </button>
          )}
        </span>
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}
    >
      <button
        type="button"
        onClick={state.translate}
        disabled={state.status === "loading"}
        className="text-cyan inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline disabled:opacity-70"
      >
        {state.status === "loading" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Languages className="size-3.5" aria-hidden="true" />
        )}
        {state.status === "loading" ? t("translating") : t("translate")}
      </button>
      {state.error && (
        <span role="alert" className="text-destructive text-xs">
          {t(ERROR_KEY[state.error])}
        </span>
      )}
    </div>
  );
}
