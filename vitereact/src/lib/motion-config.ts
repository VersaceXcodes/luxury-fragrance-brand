/**
 * Motion Design System Configuration
 * "Digital Weight" - Smooth, heavy, and expensive animations
 * Theme: Midnight Luxury (#1A1A1A Background, #D4AF37 Gold Accents)
 */

// IMPORTANT CONSTANTS
export const MOTION_CONFIG = {
  // Standard animation duration (0.6s to 0.8s - slower than typical 0.3s)
  duration: {
    fast: 0.4,
    normal: 0.6,
    slow: 0.8,
    verySlow: 1.2,
  },
  
  // Luxury bezier curve for silky, expensive feel
  easing: {
    luxury: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
    easeOutCubic: [0.33, 1, 0.68, 1] as [number, number, number, number],
    easeInOutQuart: [0.76, 0, 0.24, 1] as [number, number, number, number],
  },
  
  // Spring physics for "heavy" feel
  spring: {
    heavy: {
      type: "spring" as const,
      damping: 30,
      stiffness: 80,
      mass: 1.5,
    },
    medium: {
      type: "spring" as const,
      damping: 25,
      stiffness: 120,
      mass: 1,
    },
    light: {
      type: "spring" as const,
      damping: 20,
      stiffness: 150,
      mass: 0.8,
    },
  },
  
  // Stagger delays for orchestrated reveals
  stagger: {
    children: 0.1,
    slow: 0.15,
    fast: 0.05,
  },
  
  // Theme colors
  colors: {
    deepCharcoal: '#1A1A1A',
    gold: '#D4AF37',
    white: '#FFFFFF',
  },
};

// PAGE TRANSITIONS - "Nocturne Veil"
export const pageTransitions = {
  exit: {
    scale: 0.98,
    opacity: 0,
    backgroundColor: MOTION_CONFIG.colors.deepCharcoal,
    transition: {
      duration: MOTION_CONFIG.duration.fast,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
  enter: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: MOTION_CONFIG.duration.normal,
      ease: MOTION_CONFIG.easing.luxury,
      staggerChildren: MOTION_CONFIG.stagger.children,
    },
  },
};

// CURTAIN EFFECT
export const curtainVariants = {
  initial: {
    scaleY: 1,
  },
  animate: {
    scaleY: 0,
    transition: {
      duration: MOTION_CONFIG.duration.slow,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
  exit: {
    scaleY: 1,
    transition: {
      duration: MOTION_CONFIG.duration.fast,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

// STAGGERED CONTENT - For orchestrated reveals
export const staggeredContentVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_CONFIG.stagger.children,
      delayChildren: 0.2,
    },
  },
};

export const staggeredItemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_CONFIG.duration.normal,
      ease: MOTION_CONFIG.easing.easeOutCubic,
    },
  },
};

// SCROLL REVEAL - "Ethereal Rise"
export const scrollRevealVariants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_CONFIG.duration.normal,
      ease: MOTION_CONFIG.easing.easeOutCubic,
    },
  },
};

// PRODUCT CARD - "Museum" Hover
export const productCardVariants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: MOTION_CONFIG.duration.normal,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

export const productImageVariants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: MOTION_CONFIG.duration.slow,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

export const productGlowVariants = {
  initial: {
    opacity: 0,
    boxShadow: `0 0 0px ${MOTION_CONFIG.colors.gold}`,
  },
  hover: {
    opacity: 1,
    boxShadow: [
      `0 0 20px ${MOTION_CONFIG.colors.gold}40`,
      `0 0 30px ${MOTION_CONFIG.colors.gold}30`,
      `0 0 20px ${MOTION_CONFIG.colors.gold}40`,
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// MAGNETIC BUTTON
export const magneticButtonVariants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: MOTION_CONFIG.duration.fast,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

// CART DRAWER - "Ritual" Add
export const cartDrawerVariants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: MOTION_CONFIG.spring.heavy,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: MOTION_CONFIG.duration.fast,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

export const cartItemVariants = {
  hidden: {
    x: 50,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: MOTION_CONFIG.duration.normal,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

// CHECKMARK ANIMATION
export const checkmarkVariants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: MOTION_CONFIG.easing.luxury,
    },
  },
};

// RIPPLE EFFECT
export const rippleVariants = {
  initial: {
    scale: 0,
    opacity: 0.8,
  },
  animate: {
    scale: 4,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// PARALLAX SCROLL
export const parallaxVariants = {
  initial: {
    y: 0,
  },
  scrolled: (scrollY: number) => ({
    y: scrollY * 0.5, // Text scrolls faster than background
  }),
};
