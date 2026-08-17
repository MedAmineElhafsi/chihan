import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, UserPlus } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listMyInvites } from "@/lib/invite-actions";
import { InviteForm } from "@/components/invites/invite-form";

export default async function InviteSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Invite");
  const invites = await listMyInvites();

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
        <div className="flex items-start gap-3">
          <span className="mt-1 flex size-10 items-center justify-center rounded-full bg-cyan/15 text-cyan">
            <UserPlus className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="panel rounded-2xl p-5">
        <InviteForm initial={invites} />
      </div>
    </div>
  );
}
