import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/moderation";
import { bazarReady } from "@/lib/schema-ready";
import { shopSellingConfigured } from "@/lib/stripe";
import { ProductForm } from "@/components/bazar/product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) notFound();
  if (!(await bazarReady())) notFound();

  const t = await getTranslations("Bazar");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/admin/bazar"
        className="label-mono hover:text-cyan transition-colors"
      >
        ← {t("adminTitle")}
      </Link>
      <h1 className="font-display text-air mt-4 text-2xl font-semibold tracking-tight">
        {t("adminAdd")}
      </h1>
      <ProductForm userId={user.id} selling={shopSellingConfigured()} />
    </div>
  );
}
