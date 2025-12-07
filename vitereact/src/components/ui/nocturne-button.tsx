import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

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
  magnetic?: boolean; // Enable magnetic effect
}

const NocturneButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, magnetic = true, onClick, disabled, ...props }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
    
    // Magnetic effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { damping: 20, stiffness: 150 });
    const springY = useSpring(y, { damping: 20, stiffness: 150 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current || disabled || !magnetic) return;
      
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      
      // Magnetic pull within 100px radius
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
      if (distance < 100) {
        x.set(distanceX * 0.3);
        y.set(distanceY * 0.3);
      }
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      // Create ripple effect
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const rippleX = e.clientX - rect.left;
        const rippleY = e.clientY - rect.top;
        const id = Date.now();
        setRipples([...ripples, { x: rippleX, y: rippleY, id }]);
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };

    return (
      <motion.button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
        style={magnetic ? { x: springX, y: springY } : undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        transition={{
          duration: 0.4,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
        {...props}
      >
        {props.children}
        
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 20,
                height: 20,
                backgroundColor: '#D4AF37',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </motion.button>
    );
  }
);

NocturneButton.displayName = "NocturneButton";

export { NocturneButton, buttonVariants };