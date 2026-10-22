"use client";

import { useTranslations } from "next-intl";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", icon: Sun, key: "themeLight" },
  { value: "dark", icon: Moon, key: "themeDark" },
  { value: "system", icon: Monitor, key: "themeSystem" },
] as const satisfies readonly {
  value: ThemePreference;
  icon: typeof Sun;
  key: string;
}[];

/**
 * The three choices as menu items, for any dropdown that wants them — the
 * header's own switcher below and the phone menu.
 */
export function ThemeMenuItems() {
  const t = useTranslations("Common");
  const pref = useThemePreference();

  return (
    <>
      <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
      {OPTIONS.map(({ value, icon: Icon, key }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setThemePreference(value)}
        >
          <Icon />
          <span className="flex-1">{t(key)}</span>
          {pref === value && <Check className="size-4 text-brand" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}

/** Header button: shows the theme on screen now, opens the three choices. */
export function ThemeSwitcher() {
  const t = useTranslations("Common");
  const shown = useColorScheme();
  const Icon = shown === "dark" ? Moon : Sun;
  // Subscribing here, in the header that is always mounted, is what makes
  // "Automatic" follow a device switch while the page is open; the menu
  // items only exist while the menu does.
  useThemePreference();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")}>
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
