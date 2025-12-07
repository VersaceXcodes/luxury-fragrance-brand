/**
 * Reusable Motion Components for the Nocturne Atelier Design System
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { 
  scrollRevealVariants, 
  magneticButtonVariants, 
  rippleVariants,
  MOTION_CONFIG,
  productCardVariants,
  productImageVariants,
  productGlowVariants,
  cartItemVariants,
  checkmarkVariants,
} from '@/lib/motion-config';

// SCROLL REVEAL - "Ethereal Rise"
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={scrollRevealVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// MAGNETIC BUTTON
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  className = '', 
  onClick,
  disabled = false,
  type = 'button',
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  
  // Magnetic effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 20, stiffness: 150 });
  const springY = useSpring(y, { damping: 20, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || disabled) return;
    
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
      ref={buttonRef}
      type={type}
      className={`relative overflow-hidden ${className}`}
      style={{ x: springX, y: springY }}
      variants={magneticButtonVariants}
      initial="rest"
      whileHover={!disabled ? "hover" : "rest"}
      whileTap={!disabled ? "tap" : "rest"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      
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
              backgroundColor: MOTION_CONFIG.colors.gold,
              transform: 'translate(-50%, -50%)',
            }}
            variants={rippleVariants}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
};

// PRODUCT CARD - "Museum" Hover
interface MuseumProductCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MuseumProductCard: React.FC<MuseumProductCardProps> = ({ 
  children, 
  className = '',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`relative ${className}`}
      variants={productCardVariants}
      initial="initial"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        variants={productGlowVariants}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
      />
      
      {children}
    </motion.div>
  );
};

// PRODUCT IMAGE with zoom effect
interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, alt, className = '' }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        variants={productImageVariants}
        initial="initial"
        whileHover="hover"
      />
    </div>
  );
};

// CART ITEM with slide-in animation
interface CartItemAnimationProps {
  children: React.ReactNode;
  delay?: number;
}

export const CartItemAnimation: React.FC<CartItemAnimationProps> = ({ children, delay = 0 }) => {
  return (
    <motion.div
      variants={cartItemVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

// CHECKMARK ICON for success states
interface CheckmarkIconProps {
  className?: string;
  size?: number;
}

export const CheckmarkIcon: React.FC<CheckmarkIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkmarkVariants}
        initial="hidden"
        animate="visible"
      />
    </svg>
  );
};

// PAGE CURTAIN for page transitions
interface PageCurtainProps {
  isOpen: boolean;
}

export const PageCurtain: React.FC<PageCurtainProps> = ({ isOpen }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 origin-top"
          style={{ backgroundColor: MOTION_CONFIG.colors.deepCharcoal }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          transition={{ 
            duration: MOTION_CONFIG.duration.slow, 
            ease: MOTION_CONFIG.easing.luxury,
          }}
        />
      )}
    </AnimatePresence>
  );
};

// PARALLAX SECTION
interface ParallaxSectionProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const ParallaxSection: React.FC<ParallaxSectionProps> = ({ 
  children, 
  speed = 0.5, 
  className = '' 
}) => {
  const [scrollY, setScrollY] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.scrollY - rect.top;
        setScrollY(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div
        style={{
          y: useTransform(() => scrollY * speed),
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// STAGGERED CONTAINER - For orchestrated reveals
interface StaggeredContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggeredContainer: React.FC<StaggeredContainerProps> = ({ 
  children, 
  className = '',
  staggerDelay = MOTION_CONFIG.stagger.children,
}) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggeredItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggeredItem: React.FC<StaggeredItemProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: MOTION_CONFIG.duration.normal,
            ease: MOTION_CONFIG.easing.easeOutCubic,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};
