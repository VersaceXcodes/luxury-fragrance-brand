import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-caption font-[var(--font-weight-medium)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-interactive-primary)] text-[var(--color-fg-inverse)]",
        secondary: "bg-[var(--color-interactive-secondary)] text-[var(--color-fg-primary)]",
        success: "bg-[var(--color-success)] text-white",
        warning: "bg-[var(--color-warning)] text-white",
        error: "bg-[var(--color-error)] text-white",
        outline: "border border-[var(--color-border-primary)] text-[var(--color-fg-primary)]",
        family: "bg-[var(--color-bg-muted)] text-[var(--color-fg-secondary)] border border-[var(--color-border-muted)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function NocturneBadge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { NocturneBadge, badgeVariants };