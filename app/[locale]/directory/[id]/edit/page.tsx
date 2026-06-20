import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/auth";
import { getListingById } from "@/lib/listings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingForm } from "@/components/directory/listing-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const listing = await getListingById(id);
  if (!listing) notFound();
  if (listing.owner_user_id !== user.id) redirect(`/${locale}/directory/${id}`);

  const t = await getTranslations("Directory");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Card className="glass animate-fade-up">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {t("formEditTitle")}
          </CardTitle>
          <CardDescription>{t("formEditSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm initial={listing} userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
