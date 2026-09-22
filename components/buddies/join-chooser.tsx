"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HeartHandshake, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { BuddyForm } from "./buddy-form";

/**
 * The two ways in. Which one someone picks says what they need, so it is
 * the first and only question.
 */
export function JoinChooser({ verified }: { verified: boolean }) {
  const t = useTranslations("Buddies");
  const [role, setRole] = useState<"newcomer" | "mentor" | null>(null);

  if (role) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setRole(null)}
          className="label-mono hover:text-cyan self-start transition-colors"
        >
          ← {t("backToChoice")}
        </button>
        <BuddyForm role={role} verified={verified} />
      </div>
    );
  }

  const card =
    "group bg-depth-1 hover:bg-depth-2 flex flex-col gap-2 p-5 text-start transition-colors";

  return (
    <div className="bg-border grid gap-px sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setRole("newcomer")}
        className={card}
      >
        <span className="bg-cyan/10 text-cyan flex size-10 items-center justify-center rounded-md">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-air text-lg font-semibold">
          {t("chooseNewcomer")}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("chooseNewcomerBody")}
        </span>
      </button>
      <button type="button" onClick={() => setRole("mentor")} className={card}>
        <span className="bg-cyan/10 text-cyan flex size-10 items-center justify-center rounded-md">
          <HeartHandshake className="size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-air text-lg font-semibold">
          {t("chooseMentor")}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("chooseMentorBody")}
        </span>
        <span
          className={cn(
            "mt-1 text-xs",
            verified ? "text-success" : "text-muted-foreground"
          )}
        >
          {verified ? t("verifiedYes") : t("verifiedNeeded")}
        </span>
      </button>
    </div>
  );
}
