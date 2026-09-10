import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium tracking-tight transition-all duration-200 active:scale-[0.97] active:duration-75 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Signal — the one loud element on a page
        default:
          "bg-cyan text-primary-foreground font-semibold shadow-glow hover:shadow-glow hover:brightness-110 active:brightness-95 active:shadow-glow",
        // Hairline outline — the default for most actions
        outline:
          "border border-[color:var(--border-strong)] bg-transparent text-air hover:border-cyan hover:bg-cyan/10 hover:text-cyan active:border-cyan active:bg-cyan/20",
        secondary:
          "bg-depth-3 text-air hover:bg-depth-4 border border-transparent hover:border-[color:var(--border)] active:bg-depth-2",
        ghost: "text-muted-foreground hover:bg-cyan/10 hover:text-cyan active:bg-cyan/20 active:text-cyan",
        link: "text-cyan underline-offset-4 hover:underline active:opacity-70",
        destructive:
          "bg-destructive text-destructive-foreground font-semibold hover:brightness-110 active:brightness-90",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
