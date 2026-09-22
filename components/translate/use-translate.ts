"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import {
  translateContent,
  type TranslateKind,
  type TranslateResult,
} from "@/lib/translate-actions";

export type TranslateState = {
  status: "original" | "loading" | "translated";
  /** The translated fields while showing them, otherwise null. */
  fields: Record<string, string> | null;
  detected: string | null;
  error: Extract<TranslateResult, { ok: false }>["error"] | null;
  translate: () => void;
  showOriginal: () => void;
};

/**
 * One text's switch between the original and the reader's language. A
 * translation is fetched once and kept, so switching back and forth is free.
 */
export function useTranslate(kind: TranslateKind, id: string): TranslateState {
  const locale = useLocale();
  const [status, setStatus] = useState<TranslateState["status"]>("original");
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [error, setError] = useState<TranslateState["error"]>(null);

  function translate() {
    setError(null);
    if (fields) {
      setStatus("translated");
      return;
    }
    setStatus("loading");
    void translateContent(kind, id, locale).then((res) => {
      if (res.ok) {
        setFields(res.fields);
        setDetected(res.detected);
        setStatus("translated");
      } else {
        setError(res.error);
        setStatus("original");
      }
    });
  }

  return {
    status,
    fields: status === "translated" ? fields : null,
    detected,
    error,
    translate,
    showOriginal: () => setStatus("original"),
  };
}
