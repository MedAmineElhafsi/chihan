"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuddyProfile } from "@/types/buddy";
import { BuddyForm } from "./buddy-form";
import { EntryControls } from "./buddy-actions-ui";

/** The member's own entry: what it says, and the two ways to change it. */
export function MyEntry({
  entry,
  verified,
  helped,
}: {
  entry: BuddyProfile;
  verified: boolean;
  helped: number;
}) {
  const t = useTranslations("Buddies");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <BuddyForm
        role={entry.role}
        entry={entry}
        verified={verified}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <section className="panel flex flex-col gap-3 rounded-md p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-air text-lg font-semibold">
            {t(entry.role === "mentor" ? "myEntryMentor" : "myEntryNewcomer")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {entry.active ? t("entryActive") : t("entryPaused")}
            {entry.role === "mentor" && ` · ${t("helped", { count: helped })}`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          className="gap-1.5"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {t("editEntry")}
        </Button>
      </div>

      {entry.areas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.areas.map((a) => (
            <span
              key={a}
              className="bg-secondary text-muted-foreground rounded-sm px-2 py-1 text-xs"
            >
              {t(`area_${a}` as never)}
            </span>
          ))}
        </div>
      )}
      {entry.about && (
        <p
          dir="auto"
          className="text-foreground/90 text-sm whitespace-pre-wrap"
        >
          {entry.about}
        </p>
      )}

      <EntryControls active={entry.active} />
    </section>
  );
}
