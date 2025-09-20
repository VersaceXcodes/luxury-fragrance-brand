import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const NocturneInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[var(--input-height)] w-full rounded-[var(--input-border-radius)] border border-[var(--color-border-primary)] bg-[var(--color-surface-primary)] px-[var(--input-padding-x)] py-[var(--input-padding-y)] text-body text-[var(--color-fg-primary)] placeholder:text-[var(--color-fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-[var(--duration-normal)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
NocturneInput.displayName = "NocturneInput";

export { NocturneInput };