import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  productName?: string;
  category?: string;
  className?: string;
  aspectRatio?: '3:4' | 'square' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * SmartImage Component
 * 
 * A robust image component that handles broken links and generates 
 * tailored fallbacks based on product context.
 * 
 * Features:
 * - Primary source loading with error handling
 * - Context-aware Unsplash fallbacks based on product category
 * - Shimmer loading animation
 * - Enforced aspect ratios for uniformity
 * - Luxury aesthetic background colors
 */
const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  productName = '',
  category = '',
  className,
  aspectRatio = '3:4',
  objectFit = 'cover',
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(src || null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // Generate tailored fallback URL based on product context
  const generateFallbackUrl = (): string => {
    const normalizedCategory = category.toLowerCase();
    const normalizedName = productName.toLowerCase();
    
    let keywords: string[] = [];
    
    // Category-based keyword mapping
    if (normalizedCategory.includes('woody') || 
        normalizedCategory.includes('oud') ||
        normalizedName.includes('oud') ||
        normalizedName.includes('wood')) {
      keywords = ['dark-wood-texture', 'smoke', 'whiskey-glass', 'mahogany'];
    } else if (normalizedCategory.includes('floral') ||
               normalizedName.includes('rose') ||
               normalizedName.includes('jasmine') ||
               normalizedName.includes('flower')) {
      keywords = ['dried-flowers', 'pink-petals', 'silk-texture', 'botanical'];
    } else if (normalizedCategory.includes('fresh') ||
               normalizedCategory.includes('citrus') ||
               normalizedName.includes('citrus') ||
               normalizedName.includes('fresh')) {
      keywords = ['water-droplets', 'glass', 'morning-light', 'crystal'];
    } else if (normalizedCategory.includes('oriental') ||
               normalizedCategory.includes('amber') ||
               normalizedName.includes('amber')) {
      keywords = ['gold-dust', 'amber', 'warm-light', 'bronze'];
    } else if (normalizedCategory.includes('aromatic') ||
               normalizedCategory.includes('green')) {
      keywords = ['green-leaves', 'herbs', 'nature', 'moss'];
    } else {
      // Default luxury fallback
      keywords = ['abstract-black-marble', 'gold-dust', 'luxury-texture', 'dark-elegance'];
    }
    
    // Randomly select a keyword for variety
    const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    
    // Use Unsplash Source API with specific dimensions (3:4 ratio)
    // 600x800 for high quality at 3:4 aspect ratio
    const width = 600;
    const height = 800;
    
    return `https://source.unsplash.com/${width}x${height}/?${selectedKeyword},luxury,perfume&fit=crop`;
  };

  // Handle image load success
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  // Handle image load error
  const handleImageError = () => {
    if (!usedFallback) {
      // First error: try fallback
      const fallbackUrl = generateFallbackUrl();
      setImageSrc(fallbackUrl);
      setUsedFallback(true);
      setIsLoading(true); // Keep loading while trying fallback
    } else {
      // Fallback also failed: show error state
      setIsLoading(false);
      setHasError(true);
      onError?.();
    }
  };

  // Reset state when src changes
  useEffect(() => {
    if (src) {
      setImageSrc(src);
      setIsLoading(true);
      setHasError(false);
      setUsedFallback(false);
    } else {
      // No src provided: immediately use fallback
      const fallbackUrl = generateFallbackUrl();
      setImageSrc(fallbackUrl);
      setUsedFallback(true);
      setIsLoading(true);
    }
  }, [src, productName, category]);

  // Aspect ratio classes
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '3:4':
        return 'aspect-[3/4]';
      case 'square':
        return 'aspect-square';
      default:
        return '';
    }
  };

  // Object fit classes
  const getObjectFitClass = () => {
    switch (objectFit) {
      case 'cover':
        return 'object-cover';
      case 'contain':
        return 'object-contain';
      case 'fill':
        return 'object-fill';
      default:
        return 'object-cover';
    }
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-[#2D2D2D]', // Soft Slate background
        getAspectRatioClass(),
        className
      )}
    >
      {/* Shimmer Loading Animation */}
      {isLoading && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, #333 0%, #444 50%, #333 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        >
          {/* Add shimmer keyframes to global CSS if not present */}
          <style>
            {`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}
          </style>
        </div>
      )}

      {/* Main Image */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            getObjectFitClass(),
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}

      {/* Error State - Elegant Fallback UI */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2D2D2D] to-[#1a1a1a] text-[#D4AF37]">
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs font-light tracking-wider">
              {productName || 'Product'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartImage;
