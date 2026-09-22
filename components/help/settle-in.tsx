import { getTranslations } from "next-intl/server";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";

export type SettleInItem = {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

/**
 * The other ways Cîhan helps someone settle, next to the board where they
 * came to ask: a guide may already answer the question, a buddy can walk
 * them through it, the jobs and housing board may hold what they need.
 * Only what is switched on appears.
 */
export async function SettleIn({ items }: { items: SettleInItem[] }) {
  const t = await getTranslations("Help");
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="settle-in" className="mt-8 flex flex-col gap-3">
      <h2 id="settle-in" className="label-mono">
        {t("hubTitle")}
      </h2>
      <div
        className={
          items.length === 1
            ? "bg-border grid gap-px"
            : "bg-border grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-depth-1 hover:bg-depth-2 flex items-start gap-3 p-4 transition-colors"
          >
            <span className="bg-cyan/10 text-cyan flex size-9 shrink-0 items-center justify-center rounded-md">
              <item.icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-air flex items-center gap-1 font-medium">
                {item.title}
                <ArrowUpRight
                  className="text-muted-foreground group-hover:text-cyan size-3.5 transition-colors rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </span>
              <span className="text-muted-foreground text-sm">{item.body}</span>
            </span>
          </Link>
        ))}
        {/* Empty cells would otherwise show the hairline colour as a block;
            these fill the rest of the last row with the cards' own. */}
        {items.length % 2 === 1 && (
          <div
            className="bg-depth-1 hidden sm:block lg:hidden"
            aria-hidden="true"
          />
        )}
        {Array.from({ length: (3 - (items.length % 3)) % 3 }).map((_, i) => (
          <div
            key={`gap-${i}`}
            className="bg-depth-1 hidden lg:block"
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
