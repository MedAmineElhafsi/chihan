import { CalendarDays, Gift, MapPin, MessageSquare, Mic } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { HELP_CATEGORY_STYLE } from "@/lib/constants";
import { languageLabel } from "@/lib/language-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HelpRequest } from "@/types/help";
import { formatVoiceTime } from "@/types/voice";
import { cn } from "@/lib/utils";
import { HelpCategoryIcon } from "./category-icon";

export async function RequestCard({ request }: { request: HelpRequest }) {
  const t = await getTranslations("Help");
  const locale = await getLocale();
  const style =
    HELP_CATEGORY_STYLE[request.category] ?? HELP_CATEGORY_STYLE.other;
  const name = request.author.displayName ?? t("member");
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const urgent = request.urgency === "urgent";
  const giving = request.kind === "give";
  const cover = request.photo_urls[0];
  const when = request.needed_at
    ? new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(request.needed_at))
    : null;

  return (
    <Link
      href={`/help/${request.id}`}
      className="group bg-depth-1 hover:bg-depth-2 relative flex flex-col gap-3 p-5 transition-colors duration-300"
    >
      <span className="bg-cyan absolute inset-x-0 top-0 h-px scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />

      {cover && (
        // What is on offer, before a word of the description.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="-mx-5 -mt-5 mb-1 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none object-cover"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase"
            style={{ backgroundColor: `${style.color}1f`, color: style.color }}
          >
            <HelpCategoryIcon category={request.category} />
            {t(`cat_${request.category}` as never)}
          </span>
          {giving && (
            <span className="bg-success/15 text-success inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
              <Gift className="size-3" aria-hidden="true" />
              {t("free")}
            </span>
          )}
        </span>

        {urgent && (
          <span className="animate-flicker bg-destructive/20 text-destructive rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            {t("urgent")}
          </span>
        )}
      </div>

      <h3
        dir="auto"
        className="font-display text-air text-lg leading-snug font-semibold tracking-tight"
      >
        {request.title}
      </h3>

      {request.interpret_from && request.interpret_to && (
        <p className="text-foreground/90 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>
            <bdi>{languageLabel(request.interpret_from, locale)}</bdi>
            {" ⇄ "}
            <bdi>{languageLabel(request.interpret_to, locale)}</bdi>
          </span>
          {when && (
            <span className="text-muted-foreground flex items-center gap-1">
              <CalendarDays className="text-cyan size-3.5" aria-hidden="true" />
              {when}
            </span>
          )}
        </p>
      )}

      {request.body && (
        <p
          dir="auto"
          className="text-muted-foreground line-clamp-2 text-sm leading-relaxed"
        >
          {request.body}
        </p>
      )}

      {request.voice && (
        <span className="text-cyan flex items-center gap-1.5 text-xs">
          <Mic className="size-3.5" aria-hidden="true" />
          {t("hasVoice", { time: formatVoiceTime(request.voice.ms) })}
        </span>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            {request.author.avatarUrl && (
              <AvatarImage src={request.author.avatarUrl} alt={name} />
            )}
            <AvatarFallback className="bg-depth-4 text-air text-[0.625rem]">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground truncate text-xs">{name}</span>
          {request.city && (
            <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
              <MapPin className="text-cyan size-3" />
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
