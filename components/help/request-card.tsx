import { MapPin, MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { HELP_CATEGORY_STYLE } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HelpRequest } from "@/types/help";
import { cn } from "@/lib/utils";

export async function RequestCard({ request }: { request: HelpRequest }) {
  const t = await getTranslations("Help");
  const style =
    HELP_CATEGORY_STYLE[request.category] ?? HELP_CATEGORY_STYLE.other;
  const name = request.author.displayName ?? t("member");
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const urgent = request.urgency === "urgent";

  return (
    <Link
      href={`/help/${request.id}`}
      className="group relative flex flex-col gap-3 bg-depth-1 p-5 transition-colors duration-300 hover:bg-depth-2"
    >
      <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-cyan transition-transform duration-500 group-hover:scale-x-100" />

      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em]"
          style={{ backgroundColor: `${style.color}1f`, color: style.color }}
        >
          <span aria-hidden="true">{style.icon}</span>
          {t(`cat_${request.category}` as never)}
        </span>

        {urgent && (
          <span className="animate-flicker rounded-sm bg-destructive/20 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-destructive">
            {t("urgent")}
          </span>
        )}
      </div>

      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-air">
        {request.title}
      </h3>

      {request.body && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {request.body}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            {request.author.avatarUrl && (
              <AvatarImage src={request.author.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-depth-4 text-[0.6rem] text-air">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{name}</span>
          {request.city && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 text-cyan" />
              {request.city}
            </span>
          )}
        </span>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 font-mono text-xs",
            request.offer_count > 0 ? "text-cyan" : "text-muted-foreground"
          )}
        >
          <MessageSquare className="size-3.5" />
          {request.offer_count}
        </span>
      </div>
    </Link>
  );
}
