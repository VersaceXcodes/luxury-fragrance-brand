import React from 'react';
import { cn } from '@/lib/utils';

const NocturneCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--card-border-radius)] shadow-[var(--shadow-subtle)] transition-shadow duration-[var(--duration-normal)]",
      className
    )}
    {...props}
  />
));
NocturneCard.displayName = "NocturneCard";

const NocturneCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-[var(--card-padding)]", className)}
    {...props}
  />
));
NocturneCardHeader.displayName = "NocturneCardHeader";

const NocturneCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-h3 font-[var(--font-weight-semibold)] leading-none tracking-tight text-[var(--color-fg-primary)]",
      className
    )}
    {...props}
  />
));
NocturneCardTitle.displayName = "NocturneCardTitle";

const NocturneCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body text-[var(--color-fg-secondary)]", className)}
    {...props}
  />
));
NocturneCardDescription.displayName = "NocturneCardDescription";

const NocturneCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-[var(--card-padding)] pt-0", className)} 
    {...props} 
  />
));
NocturneCardContent.displayName = "NocturneCardContent";

const NocturneCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-[var(--card-padding)] pt-0", className)}
    {...props}
  />
));
NocturneCardFooter.displayName = "NocturneCardFooter";

export {
  NocturneCard,
  NocturneCardHeader,
  NocturneCardFooter,
  NocturneCardTitle,
  NocturneCardDescription,
  NocturneCardContent,
};