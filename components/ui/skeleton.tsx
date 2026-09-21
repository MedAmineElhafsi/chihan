import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A block standing in for content on its way.
 *
 * Always decorative: the region around it says "loading" to assistive tech
 * once, rather than every block announcing itself.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton rounded-sm", className)}
      {...props}
    />
  );
}
