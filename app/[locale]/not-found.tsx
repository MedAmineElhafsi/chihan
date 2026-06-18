import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/app-shell/brand";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <BrandMark className="size-14 animate-float-slow opacity-90" />
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Button asChild>
        <Link href="/">{t("back")}</Link>
      </Button>
    </div>
  );
}
