import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingForm } from "@/components/directory/listing-form";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("Directory");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Card className="glass animate-fade-up">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {t("formNewTitle")}
          </CardTitle>
          <CardDescription>{t("formNewSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm initial={null} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
