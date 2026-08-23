import * as React from "react";

import { cn } from "@/lib/utils";

/** Underline-first field — reads like an instrument input, not a chunky box. */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-sm border border-input bg-depth-0/60 px-3.5 text-sm text-air transition-all duration-200",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-cyan focus-visible:bg-depth-0 focus-visible:outline-none focus-visible:shadow-[0_0_18px_-6px_rgba(80,232,244,0.8)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
