import { getTranslations } from "next-intl/server";
import { Play } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { REEL_MAX_SECONDS } from "@/lib/constants";

/**
 * What the Reels tab shows before anyone has posted.
 *
 * It used to be one grey sentence — "press the button above" — over a void,
 * and for a signed-out visitor there was no button above, so the only
 * instruction on the page pointed at nothing.
 *
 * It shows the shape of what will be here instead: a vertical frame, the
 * proportion every reel will have, so the tab reads as waiting rather than
 * broken. The action sits inside it and matches who is looking — a visitor
 * is asked to join, a member is pointed at the button that really is above.
 */
export async function ReelsEmpty({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations("Reels");

  return (
    <section
      aria-labelledby="reels-empty-title"
      className="flex flex-col items-center gap-6 py-6 text-center"
    >
      {/* The frame a reel will fill: 9:16, the one thing every reel shares. */}
      <div
        aria-hidden="true"
        className="relative flex aspect-[9/16] w-40 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--border-strong)] bg-[radial-gradient(120%_80%_at_50%_0%,rgba(80,232,244,0.14),transparent_70%)]"
      >
        <span className="bg-depth-0/60 ring-cyan/30 flex size-12 items-center justify-center rounded-full ring-1 backdrop-blur">
          <Play className="text-cyan size-5 translate-x-0.5" />
        </span>
        <span className="text-muted-foreground absolute bottom-3 font-mono text-[0.625rem] tracking-[0.14em] uppercase">
          {t("emptySeconds", { seconds: REEL_MAX_SECONDS })}
        </span>
      </div>

      <div className="flex max-w-xs flex-col gap-2">
        <h2
          id="reels-empty-title"
          className="font-display text-air text-xl font-semibold text-balance"
        >
          {t("emptyTitle")}
        </h2>
        <p className="text-muted-foreground text-sm text-balance">
          {t("emptyBody", { seconds: REEL_MAX_SECONDS })}
        </p>
      </div>

      {signedIn ? (
        // The composer button genuinely is above for a member, so say so
        // plainly rather than duplicating it.
        <p className="text-muted-foreground text-xs">{t("emptyMember")}</p>
      ) : (
        <Button asChild className="gap-2">
          <Link href="/signup">{t("emptyJoin")}</Link>
        </Button>
      )}
    </section>
  );
}
