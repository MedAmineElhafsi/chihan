"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Link2, Share2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { cn } from "@/lib/utils";

/**
 * Share a page into the conversations it belongs in.
 *
 * Most of this community's information travels through WhatsApp groups, so
 * WhatsApp is the first item, not something to find in a system sheet. The
 * link keeps the sharer's language, since the people they share with are
 * usually reading the same one; what the link shows is set per page
 * (lib/og.ts).
 *
 * `bare` renders the trigger as a plain button that takes its look from
 * `className`, so it can sit in a post's footer beside Like and Comment.
 */
export function ShareButton({
  path,
  title,
  variant = "outline",
  size = "sm",
  className,
}: {
  /** Path without the locale, e.g. `/directory/<id>`. */
  path: string;
  /** What the message says above the link. */
  title: string;
  variant?: "outline" | "bare";
  /** Match the buttons it sits beside. */
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  // The menu's items only render once it is opened, which is always in the
  // browser, so this is never evaluated against a server render.
  const canShareNatively =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const url = () => `${window.location.origin}/${locale}${path}`;

  function whatsapp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url()}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
    } catch {
      // Clipboard can be refused (insecure context, permissions); the other
      // two ways to share still work.
    }
  }

  async function native() {
    try {
      await navigator.share({ title, url: url() });
    } catch {
      // Cancelled by the person, which is not an error worth showing.
    }
  }

  const label = (
    <>
      <Share2
        className={variant === "bare" ? "size-5" : "size-4"}
        aria-hidden="true"
      />
      {t("share")}
    </>
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === "bare" ? (
          <button type="button" className={className}>
            {label}
          </button>
        ) : (
          <Button
            variant="outline"
            size={size}
            className={cn("gap-1.5", className)}
          >
            {label}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem onSelect={whatsapp} className="gap-2.5">
          <WhatsAppGlyph className="size-4 text-[#25d366]" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            // Stay open long enough to see that it worked.
            e.preventDefault();
            void copy();
          }}
          className="gap-2.5"
        >
          {copied ? (
            <Check className="text-cyan size-4" aria-hidden="true" />
          ) : (
            <Link2 className="size-4" aria-hidden="true" />
          )}
          <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </DropdownMenuItem>
        {canShareNatively && (
          <DropdownMenuItem onSelect={() => void native()} className="gap-2.5">
            <Upload className="size-4" aria-hidden="true" />
            {t("more")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
