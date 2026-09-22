import { getLocale, getTranslations } from "next-intl/server";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Languages as LanguagesIcon,
  MapPin,
  Ruler,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { languageLabel } from "@/lib/language-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageButton } from "@/components/chat/message-button";
import { ReportButton } from "@/components/moderation/report-button";
import { money, rentFarBelow, type Classified } from "@/types/classified";
import { AuthorControls } from "./author-controls";
import { FlagWarnings, SafetyNotes } from "./safety-notes";

/** One room or one job, with everything a reader needs to be careful. */
export async function ClassifiedDetail({
  item,
  viewerId,
}: {
  item: Classified;
  viewerId: string;
}) {
  const t = await getTranslations("Board");
  const locale = await getLocale();
  const isAuthor = item.author_id === viewerId;
  const base = item.kind === "housing" ? "/housing" : "/jobs";
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });

  const facts: Array<{ label: string; value: string }> = [];
  const rent = money(item.rent_cents, locale);
  if (rent) {
    facts.push({
      label: t("rentLabel"),
      value: `${rent}${item.rent_kind ? ` · ${t(`rent_${item.rent_kind}` as never)}` : ""}`,
    });
  }
  const deposit = money(item.deposit_cents, locale);
  if (deposit) facts.push({ label: t("depositLabel"), value: deposit });
  if (item.size_m2) {
    facts.push({
      label: t("sizeLabel"),
      value: t("squareMetres", { n: item.size_m2 }),
    });
  }
  if (item.rooms) {
    facts.push({ label: t("roomsLabel"), value: String(item.rooms) });
  }
  if (item.available_from) {
    facts.push({
      label: t("fromLabel"),
      value: dateFmt.format(new Date(`${item.available_from}T12:00:00Z`)),
    });
  }
  const pay = money(item.pay_cents, locale);
  if (pay) {
    facts.push({
      label: t("payLabel"),
      value: t(item.pay_unit === "hour" ? "payHour" : "payMonth", {
        amount: pay,
      }),
    });
  }
  if (item.job_type) {
    facts.push({
      label: t("typeLabel"),
      value: t(`job_${item.job_type}` as never),
    });
  }
  if (item.housing_type) {
    facts.push({
      label: t("typeLabel"),
      value: t(`housing_${item.housing_type}` as never),
    });
  }

  // The post's own words raised these; the rent is checked here.
  const warnings = [
    ...item.flags,
    ...(rentFarBelow(item) ? ["rent_far_below"] : []),
  ];
  const name = item.author?.displayName ?? t("member");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={base}
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t(item.kind === "housing" ? "housingTab" : "jobsTab")}
      </Link>

      <article className="mt-5 flex flex-col gap-5">
        {item.status === "held" && (
          <p className="border-border bg-secondary/40 text-foreground/90 rounded-md border p-4 text-sm">
            {isAuthor ? t("heldAuthor") : t("heldOther")}
          </p>
        )}
        {item.status === "filled" && (
          <p className="bg-success/10 text-foreground/90 rounded-md p-4 text-sm">
            {t(item.kind === "housing" ? "takenNotice" : "filledNotice")}
          </p>
        )}

        {item.photo_urls.length > 0 && (
          <div
            className={
              item.photo_urls.length === 1
                ? "overflow-hidden rounded-md"
                : "grid grid-cols-2 gap-1.5 overflow-hidden rounded-md"
            }
          >
            {item.photo_urls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={t("photoOpen", { n: i + 1 })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={
                    item.photo_urls.length === 1
                      ? "max-h-[28rem] w-full object-cover"
                      : "aspect-square w-full object-cover"
                  }
                />
              </a>
            ))}
          </div>
        )}

        <h1
          dir="auto"
          className="font-display text-air text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight"
        >
          {item.title}
        </h1>

        <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5">
            <MapPin className="text-cyan size-4" aria-hidden="true" />
            {[item.district, item.city].filter(Boolean).join(", ") ||
              t("anywhere")}
          </span>
          {item.employer && <span dir="auto">{item.employer}</span>}
          <span className="flex items-center gap-1.5">
            <Clock className="text-cyan size-4" aria-hidden="true" />
            {t("posted", { date: dateFmt.format(new Date(item.created_at)) })}
          </span>
        </p>

        {facts.length > 0 && (
          <dl className="panel grid gap-x-6 gap-y-3 rounded-md p-4 text-sm sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label + f.value} className="flex flex-col gap-1">
                <dt className="label-mono">{f.label}</dt>
                <dd className="text-air flex items-center gap-2">
                  {f.label === t("sizeLabel") && (
                    <Ruler className="text-cyan size-4" aria-hidden="true" />
                  )}
                  {f.label === t("fromLabel") && (
                    <CalendarDays
                      className="text-cyan size-4"
                      aria-hidden="true"
                    />
                  )}
                  {f.value}
                </dd>
              </div>
            ))}
            {item.languages.length > 0 && (
              <div className="flex flex-col gap-1">
                <dt className="label-mono">{t("languagesLabel")}</dt>
                <dd className="text-air flex items-center gap-2">
                  <LanguagesIcon
                    className="text-cyan size-4"
                    aria-hidden="true"
                  />
                  {item.languages
                    .map((l) => languageLabel(l, locale))
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        )}

        <p
          dir="auto"
          className="text-foreground/90 leading-relaxed whitespace-pre-wrap"
        >
          {item.description}
        </p>

        <FlagWarnings flags={warnings} />
        <SafetyNotes kind={item.kind} />

        <div className="rule-t rule-b flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10">
              {item.author?.avatarUrl && (
                <AvatarImage src={item.author.avatarUrl} alt={name} />
              )}
              <AvatarFallback className="bg-depth-4 text-air">
                {name.trim().charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="text-air flex items-center gap-1.5 font-medium">
                {item.author?.profileId ? (
                  <Link
                    href={`/u/${item.author.profileId}`}
                    className="hover:text-cyan"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
                {item.author?.verified && (
                  <BadgeCheck className="text-cyan size-4" aria-hidden="true" />
                )}
              </span>
              {item.author?.memberSince && (
                <span className="text-muted-foreground text-xs">
                  {t("memberSince", {
                    date: monthFmt.format(new Date(item.author.memberSince)),
                  })}
                </span>
              )}
            </span>
          </span>

          <span className="flex items-center gap-2">
            {!isAuthor && item.author && (
              <MessageButton targetUserId={item.author.userId} reason="help" />
            )}
            {!isAuthor && (
              <ReportButton targetType="classified" targetId={item.id} />
            )}
          </span>
        </div>

        {isAuthor && (
          <AuthorControls id={item.id} kind={item.kind} status={item.status} />
        )}
      </article>
    </div>
  );
}
