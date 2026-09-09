"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { CirclePlus, HandHeart, MapPinPlus, Plus, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { FEATURES } from "@/lib/features";
import { project, springSheet } from "@/lib/motion";

/**
 * One button for everything a person can make, as a sheet you can throw away.
 *
 * Radix owns focus trapping, scroll locking and Escape; Motion owns the
 * physics. The sheet tracks the finger 1:1, resists past the top edge instead
 * of stopping dead, and on release decides by where the flick was *going*
 * rather than where the finger happened to be.
 */
export function ComposeSheet() {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);

  const options = [
    { href: "/feed", key: "createPost", Icon: CirclePlus, on: FEATURES.feed },
    { href: "/reels", key: "createReel", Icon: Video, on: FEATURES.reels },
    { href: "/help", key: "createHelp", Icon: HandHeart, on: FEATURES.help },
    {
      href: "/directory/new",
      key: "createPlace",
      Icon: MapPinPlus,
      on: FEATURES.directory,
    },
  ].filter((o) => o.on);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={t("create")}
        className="flex size-11 items-center justify-center rounded-xl bg-cyan text-depth-0 shadow-[0_0_22px_-4px] shadow-cyan transition-transform duration-[var(--press-duration)] active:scale-95 data-[state=open]:rotate-45 motion-reduce:active:scale-100 motion-reduce:data-[state=open]:rotate-0"
      >
        <Plus className="size-5" strokeWidth={2.2} />
      </DialogPrimitive.Trigger>

      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <Sheet
              onClose={() => setOpen(false)}
              title={t("create")}
              options={options}
              label={(k: string) => t(k)}
            />
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

type Option = {
  href: string;
  key: string;
  Icon: typeof CirclePlus;
};

function Sheet({
  onClose,
  title,
  options,
  label,
}: {
  onClose: () => void;
  title: string;
  options: Option[];
  label: (key: string) => string;
}) {
  const y = useMotionValue(0);
  // Reduced motion is not no feedback — the sheet still arrives, it just
  // cross-fades in place instead of travelling up the screen.
  const reduced = useReducedMotion();

  // The scrim fades with the drag, so the sheet never floats over a dimming
  // that no longer matches where it is.
  const scrim = useTransform(y, [0, 320], [1, 0]);

  return (
    <>
      <DialogPrimitive.Overlay asChild forceMount>
        <motion.div
          className="fixed inset-0 z-50 bg-depth-0/70 backdrop-blur-sm"
          style={{ opacity: scrim }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      </DialogPrimitive.Overlay>

      <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
        <motion.div
          role="dialog"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg touch-none rounded-t-3xl border-t border-cyan/25 bg-depth-2/85 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          style={{ y }}
          // Enters and leaves along the same path — up from the bottom edge,
          // back down to it.
          initial={reduced ? { opacity: 0 } : { y: "100%" }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: "100%" }}
          transition={reduced ? { duration: 0.15 } : springSheet}
          drag={reduced ? false : "y"}
          // Only the top is bounded. Leaving the bottom unconstrained is what
          // keeps the downward drag — the actual dismissal gesture — glued 1:1
          // to the finger; constraining both axes would have made it lag at 90%.
          // Upward meets heavy resistance instead of a wall.
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0.05 }}
          onDragEnd={(_, info) => {
            // Decide by where the throw was heading, not where the finger
            // stopped. A short fast flick should dismiss; a long slow drag
            // that was already returning should not.
            const projected = info.offset.y + project(info.velocity.y);
            if (projected > 140) onClose();
          }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <span
              aria-hidden="true"
              className="h-1 w-10 rounded-full bg-air/25"
            />
          </div>

          <DialogPrimitive.Title className="px-6 pt-2 pb-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </DialogPrimitive.Title>

          <div className="flex flex-col px-3 pb-2">
            {options.map(({ href, key, Icon }) => (
              <DialogPrimitive.Close asChild key={key}>
                <Link
                  href={href}
                  className="flex items-center gap-4 rounded-2xl px-3 py-3.5 text-air transition-colors duration-[var(--press-duration)] active:bg-cyan/15"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan/12 text-cyan ring-1 ring-cyan/25">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[0.95rem] font-medium">
                    {label(key)}
                  </span>
                </Link>
              </DialogPrimitive.Close>
            ))}
          </div>
        </motion.div>
      </DialogPrimitive.Content>
    </>
  );
}
