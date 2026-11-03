import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border border-border bg-background text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-100 outline-hidden focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/70 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // Thiết bị cảm ứng (`pointer: coarse`) nâng vùng chạm lên ≥40–44px; chuột giữ nguyên mật độ.
      size: {
        default: "h-9 gap-1.5 px-3 pointer-coarse:h-11",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs pointer-coarse:h-9",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-sm pointer-coarse:h-11",
        lg: "h-10 gap-1.5 px-4 pointer-coarse:h-11",
        icon: "size-8 pointer-coarse:size-11",
        "icon-xs": "size-6 pointer-coarse:size-10",
        "icon-sm": "size-7 pointer-coarse:size-10",
        "icon-lg": "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
