import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, MapPin, Ticket as TicketIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getMyTickets,
  getPayoutAccount,
  getSellingEvents,
  money,
  ticketsAvailable,
} from "@/lib/tickets";
import { TICKET_FEE_PERCENT } from "@/lib/stripe";
import { navTitle } from "@/lib/page-title";
import { Button } from "@/components/ui/button";
import { PayoutConnect } from "@/components/tickets/payout-connect";
import { CheckInBox } from "@/components/tickets/check-in-box";

export const generateMetadata = navTitle("tickets");

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await ticketsAvailable())) notFound();

  const t = await getTranslations("Tickets");
  const user = await getCurrentUser();

  const header = (
    <div className="flex flex-col gap-3">
      <span className="label-mono">{t("eyebrow")}</span>
      <h1 className="font-display text-air text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
    </div>
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {header}
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md p-5">
          <p className="text-muted-foreground text-sm">{t("signIn")}</p>
          <Button asChild className="gap-2">
            <Link href="/login">
              <TicketIcon className="size-4" aria-hidden="true" />
              {t("signInCta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const [mine, selling, payout] = await Promise.all([
    getMyTickets(user.id),
    getSellingEvents(user.id),
    getPayoutAccount(user.id),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  // Counts in the reader's own numerals, so a page never mixes two sets.
  const num = new Intl.NumberFormat(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {header}

      {/* What this member has bought. */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{t("mine")}</h2>
        {mine.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">{t("noneYet")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {mine.map((ticket) => (
              <li key={ticket.id} className="panel rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div dir="auto" className="font-medium">
                      {ticket.event_title ?? t("anEvent")}
                    </div>
                    {ticket.event_at && (
                      <div className="text-cyan mt-1 flex items-center gap-1.5 text-sm">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {dateFmt.format(new Date(ticket.event_at))}
                      </div>
                    )}
                    {ticket.event_location && (
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
                        <MapPin className="size-3.5 shrink-0" />
                        <span dir="auto" className="min-w-0 truncate">
                          {ticket.event_location}
                        </span>
                      </div>
                    )}
                    <div className="text-muted-foreground mt-1 text-sm">
                      {t("quantityAndPrice", {
                        count: ticket.quantity,
                        amount: money(
                          ticket.amount_cents,
                          ticket.currency,
                          locale
                        ),
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      dir="ltr"
                      className="border-cyan/30 bg-cyan/10 text-cyan rounded-md border px-3 py-1.5 font-mono text-base tracking-wider"
                    >
                      {ticket.code}
                    </span>
                    {ticket.checked_in_at ? (
                      <span className="text-muted-foreground text-xs">
                        {t("used")}
                      </span>
                    ) : ticket.status !== "paid" ? (
                      <span className="text-muted-foreground text-xs">
                        {t(`status_${ticket.status}` as never)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {t("showAtDoor")}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Selling: only for someone who has priced an event. */}
      {selling.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">{t("selling")}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("feeNote", { percent: TICKET_FEE_PERCENT })}
          </p>

          <div className="panel mt-4 rounded-lg p-4">
            <PayoutConnect
              started={Boolean(payout?.stripe_account_id)}
              ready={Boolean(payout?.charges_enabled)}
            />
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {selling.map((ev) => (
              <li key={ev.id} className="panel rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div dir="auto" className="font-medium">
                      {ev.title ?? t("anEvent")}
                    </div>
                    {ev.event_at && (
                      <div className="text-muted-foreground mt-1 text-sm">
                        {dateFmt.format(new Date(ev.event_at))}
                      </div>
                    )}
                  </div>
                  <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("sold")}
                      </dt>
                      <dd className="font-mono text-base">
                        {num.format(ev.sold)}/{num.format(ev.capacity)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("checkedIn")}
                      </dt>
                      <dd className="font-mono text-base">
                        {num.format(ev.checked_in)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        {t("takings")}
                      </dt>
                      <dd className="font-mono text-base">
                        {money(ev.gross_cents, ev.currency, locale)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>

          <div className="panel mt-4 rounded-lg p-4">
            <h3 className="font-medium">{t("atTheDoor")}</h3>
            <p className="text-muted-foreground mt-1 mb-3 text-sm">
              {t("atTheDoorHint")}
            </p>
            <CheckInBox />
          </div>
        </section>
      )}
    </div>
  );
}
