import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[104px] w-full rounded-sm border border-input bg-depth-0/60 px-3.5 py-3 text-sm text-air transition-all duration-200",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-cyan focus-visible:bg-depth-0 focus-visible:outline-none focus-visible:shadow-[0_0_18px_-6px_rgba(80,232,244,0.8)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
