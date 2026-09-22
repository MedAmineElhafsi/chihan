import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Gift, Languages, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHelpOffers, getHelpRequest } from "@/lib/help";
import { getSuggestedListings } from "@/lib/help-directory";
import { ListingCard } from "@/components/directory/listing-card";
import { HELP_CATEGORY_STYLE } from "@/lib/constants";
import { languageLabel } from "@/lib/language-label";
import { voiceEnabled } from "@/lib/voice";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageButton } from "@/components/chat/message-button";
import { ReportButton } from "@/components/moderation/report-button";
import { OfferForm } from "@/components/help/offer-form";
import { ResolveButton } from "@/components/help/resolve-button";
import { HelpCategoryIcon } from "@/components/help/category-icon";
import { OfferText, RequestText } from "@/components/help/request-text";
import { VoicePlayer } from "@/components/voice/voice-player";
import { ShareButton } from "@/components/share/share-button";
import { preview } from "@/lib/og";

/**
 * Requests are members-only, and a link preview is drawn by an anonymous
 * crawler, so the preview never names the request — it says that someone
 * needs help and how to see it. Only the member's own browser tab shows the
 * request's title.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Help" });
  const request = await getHelpRequest(id);
  return {
    title: request?.title ?? t("shareTitle"),
    ...preview({ title: t("shareTitle"), description: t("shareBody"), locale }),
  };
}

export default async function HelpRequestPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  // Requests are members-only: they reveal that someone needs help.
  if (!user) redirect(`/${locale}/login`);

  const request = await getHelpRequest(id);
  if (!request) notFound();

  const [offers, t, tDir, suggested, canRecord] = await Promise.all([
    getHelpOffers(id),
    getTranslations("Help"),
    getTranslations("Directory"),
    getSuggestedListings(request.category, request.city),
    voiceEnabled(),
  ]);

  const style =
    HELP_CATEGORY_STYLE[request.category] ?? HELP_CATEGORY_STYLE.other;
  const isAuthor = user.id === request.author_id;
  const giving = request.kind === "give";
  const name = request.author.displayName ?? t("member");
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const whenFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const interpreting = request.interpret_from && request.interpret_to;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/help"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("backToBoard")}
      </Link>

      <article className="mt-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase"
            style={{ backgroundColor: `${style.color}1f`, color: style.color }}
          >
            <HelpCategoryIcon category={request.category} />
            {t(`cat_${request.category}` as never)}
          </span>
          {giving && (
            <span className="bg-success/15 text-success inline-flex items-center gap-1 rounded-sm px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
              <Gift className="size-3" aria-hidden="true" />
              {t("free")}
            </span>
          )}
          {request.urgency === "urgent" && (
            <span className="bg-destructive/20 text-destructive rounded-sm px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
              {t("urgent")}
            </span>
          )}
          {isAuthor && (
            <ResolveButton
              requestId={request.id}
              status={request.status}
              giving={giving}
            />
          )}
          {/* The asker may say what they need; anyone else sharing it says
              only that someone needs help — the details stay for members. */}
          <ShareButton
            path={`/help/${request.id}`}
            title={isAuthor ? request.title : t("shareTitle")}
            className="ms-auto"
          />
        </div>

        {request.photo_urls.length > 0 && (
          <div
            className={
              request.photo_urls.length === 1
                ? "overflow-hidden rounded-md"
                : "grid grid-cols-2 gap-1.5 overflow-hidden rounded-md"
            }
          >
            {request.photo_urls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={t("photoOpen", { n: i + 1 })}
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={
                    request.photo_urls.length === 1
                      ? "max-h-[28rem] w-full object-cover"
                      : "aspect-square w-full object-cover"
                  }
                />
              </a>
            ))}
          </div>
        )}

        <RequestText id={request.id} title={request.title} body={request.body}>
          {interpreting && (
            <dl className="panel grid gap-x-6 gap-y-3 rounded-md p-4 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="label-mono">{t("interpLanguages")}</dt>
                <dd className="text-air flex items-center gap-2">
                  <Languages className="text-cyan size-4" aria-hidden="true" />
                  <span>
                    <bdi>{languageLabel(request.interpret_from!, locale)}</bdi>
                    {" ⇄ "}
                    <bdi>{languageLabel(request.interpret_to!, locale)}</bdi>
                  </span>
                </dd>
              </div>
              {request.needed_at && (
                <div className="flex flex-col gap-1">
                  <dt className="label-mono">{t("interpWhen")}</dt>
                  <dd className="text-air flex items-center gap-2">
                    <CalendarDays
                      className="text-cyan size-4"
                      aria-hidden="true"
                    />
                    {whenFmt.format(new Date(request.needed_at))}
                  </dd>
                </div>
              )}
              {request.setting && (
                <div className="flex flex-col gap-1">
                  <dt className="label-mono">{t("interpWhere")}</dt>
                  <dd className="text-air">
                    {t(`setting_${request.setting}` as never)}
                  </dd>
                </div>
              )}
              {request.meeting && (
                <div className="flex flex-col gap-1">
                  <dt className="label-mono">{t("interpHow")}</dt>
                  <dd className="text-air">
                    {t(`meeting_${request.meeting}` as never)}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {request.voice && (
            <div className="panel rounded-md p-3">
              <VoicePlayer note={request.voice} />
            </div>
          )}
        </RequestText>

        {/* Asker */}
        <div className="rule-t rule-b flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              {request.author.avatarUrl && (
                <AvatarImage src={request.author.avatarUrl} alt={name} />
              )}
              <AvatarFallback className="bg-depth-4 text-air">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-air text-sm font-medium">
                {request.author.profileId ? (
                  <Link
                    href={`/u/${request.author.profileId}`}
                    className="hover:text-cyan"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {request.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="text-cyan size-3" />
                    {request.city}
                  </span>
                )}
                <span>{dateFmt.format(new Date(request.created_at))}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthor && (
              <MessageButton targetUserId={request.author_id} reason="help" />
            )}
            {!isAuthor && (
              <ReportButton targetType="post" targetId={request.id} />
            )}
          </div>
        </div>
      </article>

      {/* Resolved: turn the answer into something permanent. A thing given
          away has no place in the directory. */}
      {isAuthor &&
        request.status === "resolved" &&
        request.category !== "items" && (
          <section className="panel mt-8 rounded-lg p-5">
            <h2 className="font-display text-air text-lg font-semibold">
              {t("memoryTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t("memoryBody")}
            </p>
            <Link
              href="/directory/new"
              className="border-cyan/40 text-cyan hover:bg-cyan/10 mt-4 inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors"
            >
              {t("memoryCta")}
            </Link>
          </section>
        )}

      {/* Places in the directory that might already answer this */}
      {suggested.length > 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-air text-xl font-semibold">
              {t("suggestedTitle")}
            </h2>
            <Link
              href="/directory"
              className="label-mono hover:text-cyan transition-colors"
            >
              {t("suggestedAll")}
            </Link>
          </div>
          <p className="text-muted-foreground text-sm">{t("suggestedBody")}</p>
          <div className="bg-border grid gap-px sm:grid-cols-3">
            {suggested.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                categoryLabel={tDir(`cat_${l.category}` as never)}
                reviewsLabel={tDir("reviewsShort")}
                professionalLabel={tDir("professional")}
              />
            ))}
          </div>
        </section>
      )}

      {/* Offers */}
      <section className="mt-8 flex flex-col gap-4">
        <h2 className="font-display text-air text-xl font-semibold">
          {giving
            ? t("claimsTitle", { count: offers.length })
            : t("offersTitle", { count: offers.length })}
        </h2>

        {offers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {giving ? t("noClaims") : t("noOffers")}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {offers.map((o) => {
              const oName = o.author.displayName ?? t("member");
              const oInitial = oName.trim().charAt(0).toUpperCase() || "?";
              return (
                <li
                  key={o.id}
                  className="panel flex flex-col gap-2.5 rounded-md p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        {o.author.avatarUrl && (
                          <AvatarImage src={o.author.avatarUrl} alt={oName} />
                        )}
                        <AvatarFallback className="bg-depth-4 text-air text-[0.625rem]">
                          {oInitial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-air text-sm font-medium">
                        {o.author.profileId ? (
                          <Link
                            href={`/u/${o.author.profileId}`}
                            className="hover:text-cyan"
                          >
                            {oName}
                          </Link>
                        ) : (
                          oName
                        )}
                      </span>
                    </span>
                    {o.author_id !== user.id && (
                      <MessageButton
                        targetUserId={o.author_id}
                        reason="help"
                        size="sm"
                        variant="outline"
                      />
                    )}
                  </div>
                  {o.voice && <VoicePlayer note={o.voice} />}
                  <OfferText id={o.id} body={o.body} />
                </li>
              );
            })}
          </ul>
        )}

        {!isAuthor && request.status === "open" && (
          <OfferForm
            requestId={request.id}
            isAuthenticated
            userId={user.id}
            voiceEnabled={canRecord}
            giving={giving}
          />
        )}
      </section>
    </div>
  );
}
