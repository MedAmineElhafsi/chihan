"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { AuthorStories } from "@/types/story";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StoryViewer } from "@/components/stories/story-viewer";
import { StoryComposer } from "@/components/stories/story-composer";
import { cn } from "@/lib/utils";

export function StoriesRail({
  groups,
  userId,
}: {
  groups: AuthorStories[];
  userId?: string | null;
}) {
  const t = useTranslations("Stories");
  const [active, setActive] = useState<AuthorStories | null>(null);

  if (!userId && groups.length === 0) return null;

  return (
    <>
      <div className="social-surface px-3 py-3 sm:px-4">
        <div className="-mx-0.5 flex gap-3.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-thin">
          {userId && <StoryComposer userId={userId} />}

          {groups.map((g) => {
            const name = g.author.displayName?.trim() || t("member");
            const initial = name.charAt(0).toUpperCase() || "?";
            return (
              <button
                key={g.author.userId}
                type="button"
                onClick={() => setActive(g)}
                className="group flex w-[5rem] shrink-0 flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className={cn(
                    "rounded-full bg-gradient-to-br from-cyan via-air to-destructive p-[2.5px]",
                    "transition-shadow group-hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cyan)_25%,transparent)]"
                  )}
                >
                  <Avatar className="size-16 border-[3px] border-card">
                    {g.author.avatarUrl && (
                      <AvatarImage src={g.author.avatarUrl} alt={name} />
                    )}
                    <AvatarFallback className="bg-secondary text-sm">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </span>
                <span className="w-full truncate text-center text-xs font-medium leading-tight">
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <StoryViewer
        group={active}
        open={!!active}
        onClose={() => setActive(null)}
      />
    </>
  );
}
