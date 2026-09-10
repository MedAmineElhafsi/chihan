import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/**
 * Messages live in the header rather than the tab bar — the same place every
 * app of this shape puts them, and it leaves the bottom bar symmetrical
 * around the create button.
 */
export async function ChatIcon({ unread }: { unread: number }) {
  const t = await getTranslations("Nav");

  return (
    <Link
      href="/messages"
      aria-label={
        unread > 0 ? `${t("chat")} (${unread})` : t("chat")
      }
      className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-cyan"
    >
      <MessageCircle className="size-5" />
      {unread > 0 && (
        <span className="absolute end-1.5 top-1.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-cyan px-1 text-[0.625rem] font-semibold leading-4 text-depth-0">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
