import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Small verified pip shown next to a member's name when Premium. */
export function VerifiedBadge({
  verified,
  label,
  className,
}: {
  verified?: boolean | null;
  label: string;
  className?: string;
}) {
  if (!verified) return null;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold",
        className
      )}
    >
      <BadgeCheck className="size-3.5" />
    </span>
  );
}
