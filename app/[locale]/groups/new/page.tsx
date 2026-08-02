import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { GroupForm } from "@/components/groups/group-form";

export default async function NewGroupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Groups");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t("createTitle")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("createSubtitle")}</p>
      <div className="mt-8">
        <GroupForm />
      </div>
    </div>
  );
}
