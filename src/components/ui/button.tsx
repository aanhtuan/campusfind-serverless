import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all duration-100 cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(30,27,75,0.25)] hover:bg-[#4338ca] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-purple-100 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.15)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        accent:
          "bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-[2px_2px_0px_0px_rgba(180,83,9,0.25)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        outline:
          "border-2 border-border bg-card text-foreground hover:bg-muted/70 hover:border-slate-400 shadow-[2px_2px_0px_0px_rgba(17,24,39,0.08)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        ghost: "text-foreground hover:bg-muted/70 hover:text-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-rose-700 shadow-[2px_2px_0px_0px_rgba(159,18,57,0.25)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 px-3 text-xs rounded-xl",
        lg: "min-h-12 px-6 text-base rounded-2xl",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
