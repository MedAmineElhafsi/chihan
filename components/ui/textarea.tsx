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
        "focus-visible:border-cyan focus-visible:bg-depth-0 focus-visible:outline-none focus-visible:shadow-glow",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
