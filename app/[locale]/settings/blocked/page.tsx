import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listBlockedUsers } from "@/lib/blocks";
import { BlockedList } from "@/components/safety/blocked-list";

export default async function BlockedUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Safety");
  const blocked = await listBlockedUsers(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-12 sm:px-6">
      <div>
        <Link
          href="/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t("backToSettings")}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("blockedTitle")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("blockedBody")}</p>
      </div>

      <div className="panel rounded-2xl p-5">
        <BlockedList initial={blocked} />
      </div>
    </div>
  );
}
