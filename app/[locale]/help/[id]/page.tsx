import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getHelpOffers, getHelpRequest } from "@/lib/help";
import { getSuggestedListings } from "@/lib/help-directory";
import { ListingCard } from "@/components/directory/listing-card";
import { HELP_CATEGORY_STYLE } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageButton } from "@/components/chat/message-button";
import { ReportButton } from "@/components/moderation/report-button";
import { OfferForm } from "@/components/help/offer-form";
import { ResolveButton } from "@/components/help/resolve-button";

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

  const [offers, t, tDir, suggested] = await Promise.all([
    getHelpOffers(id),
    getTranslations("Help"),
    getTranslations("Directory"),
    getSuggestedListings(request.category, request.city),
  ]);

  const style =
    HELP_CATEGORY_STYLE[request.category] ?? HELP_CATEGORY_STYLE.other;
  const isAuthor = user.id === request.author_id;
  const name = request.author.displayName ?? t("member");
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/help"
        className="label-mono transition-colors hover:text-cyan"
      >
        ← {t("backToBoard")}
      </Link>

      <article className="mt-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em]"
            style={{ backgroundColor: `${style.color}1f`, color: style.color }}
          >
            <span aria-hidden="true">{style.icon}</span>
            {t(`cat_${request.category}` as never)}
          </span>
          {request.urgency === "urgent" && (
            <span className="rounded-sm bg-destructive/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-destructive">
              {t("urgent")}
            </span>
          )}
          {isAuthor && (
            <ResolveButton requestId={request.id} status={request.status} />
          )}
        </div>

        <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-tight text-air">
          {request.title}
        </h1>

        {request.body && (
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
            {request.body}
          </p>
        )}

        {/* Asker */}
        <div className="flex flex-wrap items-center justify-between gap-3 rule-t rule-b py-4">
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
              <div className="text-sm font-medium text-air">
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {request.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-cyan" />
                    {request.city}
                  </span>
                )}
                <span>{dateFmt.format(new Date(request.created_at))}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAuthor && <MessageButton targetUserId={request.author_id} reason="help" />}
            {!isAuthor && (
              <ReportButton targetType="post" targetId={request.id} />
            )}
          </div>
        </div>
      </article>

      {/* Resolved: turn the answer into something permanent */}
      {isAuthor && request.status === "resolved" && (
        <section className="mt-8 panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold text-air">
            {t("memoryTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("memoryBody")}
          </p>
          <Link
            href="/directory/new"
            className="mt-4 inline-flex items-center gap-2 rounded-sm border border-cyan/40 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-cyan transition-colors hover:bg-cyan/10"
          >
            {t("memoryCta")}
          </Link>
        </section>
      )}

      {/* Places in the directory that might already answer this */}
      {suggested.length > 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-air">
              {t("suggestedTitle")}
            </h2>
            <Link
              href="/directory"
              className="label-mono transition-colors hover:text-cyan"
            >
              {t("suggestedAll")}
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">{t("suggestedBody")}</p>
          <div className="grid gap-px bg-border sm:grid-cols-3">
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
        <h2 className="font-display text-xl font-semibold text-air">
          {t("offersTitle", { count: offers.length })}
        </h2>

        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOffers")}</p>
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
                        <AvatarFallback className="bg-depth-4 text-[0.65rem] text-air">
                          {oInitial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-air">
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
                      <MessageButton targetUserId={o.author_id} reason="help" size="sm" variant="outline" />
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {o.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {!isAuthor && request.status === "open" && (
          <OfferForm requestId={request.id} isAuthenticated />
        )}
      </section>
    </div>
  );
}
