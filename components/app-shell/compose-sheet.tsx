"use client";

import { CirclePlus, HandHeart, MapPinPlus, Plus, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { FEATURES } from "@/lib/features";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * One button for everything a person can make, so nobody has to work out
 * which section a thing belongs in before they can write it.
 */
export function ComposeSheet() {
  const t = useTranslations("Nav");

  const options = [
    { href: "/feed", key: "createPost", Icon: CirclePlus, on: FEATURES.feed },
    { href: "/feed", key: "createReel", Icon: Video, on: FEATURES.reels },
    { href: "/help", key: "createHelp", Icon: HandHeart, on: FEATURES.help },
    {
      href: "/directory/new",
      key: "createPlace",
      Icon: MapPinPlus,
      on: FEATURES.directory,
    },
  ].filter((o) => o.on);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("create")}
        className="flex size-11 items-center justify-center rounded-xl bg-cyan text-depth-0 shadow-[0_0_22px_-4px] shadow-cyan transition-transform active:scale-95 data-[state=open]:rotate-45"
      >
        <Plus className="size-5" strokeWidth={2.2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-56">
        <DropdownMenuLabel>{t("create")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(({ href, key, Icon }) => (
          <DropdownMenuItem key={key} asChild>
            <Link href={href}>
              <Icon />
              {t(key)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
