/**
 * Page Transition Wrapper - "Nocturne Veil"
 * Creates seamless flow between routes with exit/entry animations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { MOTION_CONFIG } from '@/lib/motion-config';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{
          scale: 0.98,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        exit={{
          scale: 0.98,
          opacity: 0,
        }}
        transition={{
          duration: MOTION_CONFIG.duration.normal,
          ease: MOTION_CONFIG.easing.luxury,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Curtain overlay for dramatic page transitions
export const CurtainTransition: React.FC<{ isTransitioning: boolean }> = ({ isTransitioning }) => {
  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          className="fixed inset-0 z-[9999] origin-top"
          style={{ backgroundColor: MOTION_CONFIG.colors.deepCharcoal }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          transition={{
            duration: MOTION_CONFIG.duration.normal,
            ease: MOTION_CONFIG.easing.luxury,
          }}
        />
      )}
    </AnimatePresence>
  );
};
