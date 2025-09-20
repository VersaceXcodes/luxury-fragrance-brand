import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-interactive-primary)] text-[var(--color-fg-inverse)] hover:bg-[var(--color-interactive-primary-hover)] focus-visible:ring-[var(--color-border-focus)]",
        secondary: "bg-[var(--color-interactive-secondary)] text-[var(--color-fg-primary)] hover:bg-[var(--color-interactive-secondary-hover)] focus-visible:ring-[var(--color-border-focus)]",
        outline: "border border-[var(--color-border-primary)] bg-transparent text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-muted)] focus-visible:ring-[var(--color-border-focus)]",
        ghost: "bg-transparent text-[var(--color-fg-primary)] hover:bg-[var(--color-bg-muted)] focus-visible:ring-[var(--color-border-focus)]",
        link: "text-[var(--color-fg-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-border-focus)]"
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[var(--radius-md)]",
        md: "h-11 px-4 text-base rounded-[var(--radius-md)]",
        lg: "h-13 px-6 text-lg rounded-[var(--radius-lg)]",
        icon: "h-11 w-11 rounded-[var(--radius-md)]"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const NocturneButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

NocturneButton.displayName = "NocturneButton";

export { NocturneButton, buttonVariants };