import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, CalendarDays, MapPin, Ruler } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { money, type Classified } from "@/types/classified";

/** One room or one job on the board: what it is, where, and for how much. */
export async function ClassifiedCard({ item }: { item: Classified }) {
  const t = await getTranslations("Board");
  const locale = await getLocale();
  const href = `${item.kind === "housing" ? "/housing" : "/jobs"}/${item.id}`;
  const rent = money(item.rent_cents, locale);
  const pay = money(item.pay_cents, locale);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <Link
      href={href}
      className="group bg-depth-1 hover:bg-depth-2 relative flex flex-col gap-3 p-5 transition-colors duration-300"
    >
      <span className="bg-cyan absolute inset-x-0 top-0 h-px scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />

      {item.photo_urls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo_urls[0]}
          alt=""
          className="-mx-5 -mt-5 mb-1 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {item.housing_type && (
          <span className="bg-cyan/10 text-cyan rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            {t(`housing_${item.housing_type}` as never)}
          </span>
        )}
        {item.job_type && (
          <span className="bg-cyan/10 text-cyan rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            {t(`job_${item.job_type}` as never)}
          </span>
        )}
        {item.status === "held" && (
          <span className="bg-secondary text-muted-foreground rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            {t("statusHeld")}
          </span>
        )}
        {item.status === "filled" && (
          <span className="bg-success/15 text-success rounded-sm px-2 py-1 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
            {t("statusFilled")}
          </span>
        )}
      </div>

      <h3
        dir="auto"
        className="font-display text-air text-lg leading-snug font-semibold tracking-tight"
      >
        {item.title}
      </h3>

      <p className="text-foreground/90 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {rent && (
          <span className="text-air font-medium">
            {t("rentPer", {
              amount: rent,
              kind: item.rent_kind ? t(`rent_${item.rent_kind}` as never) : "",
            })}
          </span>
        )}
        {pay && (
          <span className="text-air font-medium">
            {t(item.pay_unit === "hour" ? "payHour" : "payMonth", {
              amount: pay,
            })}
          </span>
        )}
        {item.size_m2 && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Ruler className="text-cyan size-3.5" aria-hidden="true" />
            {t("squareMetres", { n: item.size_m2 })}
          </span>
        )}
        {item.employer && (
          <span dir="auto" className="text-muted-foreground">
            {item.employer}
          </span>
        )}
        {item.available_from && (
          <span className="text-muted-foreground flex items-center gap-1">
            <CalendarDays className="text-cyan size-3.5" aria-hidden="true" />
            {dateFmt.format(new Date(`${item.available_from}T12:00:00Z`))}
          </span>
        )}
      </p>

      <p
        dir="auto"
        className="text-muted-foreground line-clamp-2 text-sm leading-relaxed"
      >
        {item.description}
      </p>

      <div className="text-muted-foreground mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
        <span className="flex items-center gap-1">
          <MapPin className="text-cyan size-3" aria-hidden="true" />
          {[item.district, item.city].filter(Boolean).join(", ") ||
            t("anywhere")}
        </span>
        {item.author?.verified && (
          <span className="text-cyan flex items-center gap-1">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {t("verifiedPoster")}
          </span>
        )}
      </div>
    </Link>
  );
}
