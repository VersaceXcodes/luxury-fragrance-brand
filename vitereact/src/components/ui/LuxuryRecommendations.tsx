import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductSize {
  size_id: string;
  size_ml: number;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
}

interface RecommendedProduct {
  product_id: string;
  product_name: string;
  brand_name?: string;
  fragrance_families?: string;
  base_price: number;
  sale_price?: number | null;
  images?: Array<{
    image_url: string;
    alt_text?: string;
    is_primary?: boolean;
  }>;
  sizes?: ProductSize[];
  top_notes?: string;
  middle_notes?: string;
  base_notes?: string;
}

interface LuxuryRecommendationsProps {
  products: RecommendedProduct[];
  title?: string;
  onQuickAdd?: (productId: string, sizeId: string) => void;
  className?: string;
}

const LuxuryRecommendations: React.FC<LuxuryRecommendationsProps> = ({
  products,
  title = "Complete Your Olfactory Ritual",
  onQuickAdd,
  className
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Format scent notes for display
  const getScentNotes = (product: RecommendedProduct): string => {
    const notes: string[] = [];
    
    if (product.top_notes) {
      const topNote = product.top_notes.split(',')[0].trim();
      if (topNote) notes.push(topNote);
    }
    
    if (product.middle_notes && notes.length < 2) {
      const middleNote = product.middle_notes.split(',')[0].trim();
      if (middleNote) notes.push(middleNote);
    }
    
    if (product.base_notes && notes.length < 2) {
      const baseNote = product.base_notes.split(',')[0].trim();
      if (baseNote) notes.push(baseNote);
    }
    
    return notes.join(' • ');
  };

  // Get primary image or fallback
  const getProductImage = (product: RecommendedProduct): string => {
    const primaryImage = product.images?.find(img => img.is_primary);
    return primaryImage?.image_url || product.images?.[0]?.image_url || '/api/placeholder/400/400';
  };

  // Get default size (prefer 50ml)
  const getDefaultSize = (product: RecommendedProduct): ProductSize | null => {
    if (!product.sizes || product.sizes.length === 0) return null;
    
    const defaultSize = product.sizes.find(s => s.size_ml === 50 && s.stock_quantity > 0) || 
                       product.sizes.find(s => s.stock_quantity > 0) || 
                       product.sizes[0];
    
    return defaultSize;
  };

  // Get display price
  const getPrice = (product: RecommendedProduct): number => {
    const defaultSize = getDefaultSize(product);
    if (defaultSize) {
      return defaultSize.sale_price || defaultSize.price;
    }
    return product.sale_price || product.base_price;
  };

  // Scroll handlers
  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    const newScrollLeft = direction === 'left' 
      ? scrollContainerRef.current.scrollLeft - scrollAmount
      : scrollContainerRef.current.scrollLeft + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
    
    setTimeout(checkScrollButtons, 300);
  };

  // Handle quick add
  const handleQuickAdd = (e: React.MouseEvent, product: RecommendedProduct) => {
    e.preventDefault();
    e.stopPropagation();
    
    const defaultSize = getDefaultSize(product);
    if (defaultSize && onQuickAdd) {
      onQuickAdd(product.product_id, defaultSize.size_id);
    }
  };

  React.useEffect(() => {
    checkScrollButtons();
    
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      
      return () => {
        scrollContainer.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [products]);

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section 
      className={cn(
        "w-full py-16 md:py-20 lg:py-24",
        "bg-[var(--nocturne-onyx)]", // Deep Charcoal #1A1A1A
        className
      )}
    >
      <div className="nocturne-container">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 
            className={cn(
              "text-h2",
              "text-[var(--nocturne-porcelain)]", // Off-White #F5F5F0
              "mb-4"
            )}
          >
            {title}
          </h2>
          <div 
            className="w-24 h-px bg-[var(--nocturne-champagne)] mx-auto"
            style={{ opacity: 0.6 }}
          />
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                "w-10 h-10 flex items-center justify-center",
                "bg-[var(--nocturne-onyx)]/80 backdrop-blur-sm",
                "border border-[var(--nocturne-champagne)]",
                "rounded-full",
                "transition-all duration-[var(--duration-normal)]",
                "hover:bg-[var(--nocturne-champagne)] hover:border-[var(--nocturne-champagne)]",
                "group",
                "-ml-5"
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft 
                className="w-5 h-5 text-[var(--nocturne-champagne)] group-hover:text-[var(--nocturne-onyx)] transition-colors" 
              />
            </button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                "w-10 h-10 flex items-center justify-center",
                "bg-[var(--nocturne-onyx)]/80 backdrop-blur-sm",
                "border border-[var(--nocturne-champagne)]",
                "rounded-full",
                "transition-all duration-[var(--duration-normal)]",
                "hover:bg-[var(--nocturne-champagne)] hover:border-[var(--nocturne-champagne)]",
                "group",
                "-mr-5"
              )}
              aria-label="Scroll right"
            >
              <ChevronRight 
                className="w-5 h-5 text-[var(--nocturne-champagne)] group-hover:text-[var(--nocturne-onyx)] transition-colors" 
              />
            </button>
          )}

          {/* Product Cards Scroll Container */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex gap-6 overflow-x-auto",
              "scrollbar-hide", // Hide scrollbar for sleek look
              "pb-4 -mb-4" // Compensate for card shadow
            )}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {products.map((product) => {
              const defaultSize = getDefaultSize(product);
              const price = getPrice(product);
              const scentNotes = getScentNotes(product);
              
              return (
                <Link
                  key={product.product_id}
                  to={`/products/${product.product_id}`}
                  className="flex-shrink-0 w-[280px] md:w-[300px] group"
                >
                  {/* Product Card */}
                  <div
                    className={cn(
                      "relative",
                      "bg-[var(--nocturne-slate)]", // Soft Slate #2D2D2D
                      "rounded-lg overflow-hidden",
                      "transition-all duration-[var(--duration-normal)]",
                      "hover:-translate-y-2",
                      "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                      "hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                    )}
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square overflow-hidden bg-[var(--nocturne-slate)]">
                      <img
                        src={getProductImage(product)}
                        alt={product.product_name}
                        className={cn(
                          "w-full h-full object-cover",
                          "transition-transform duration-[var(--duration-slow)]",
                          "group-hover:scale-105"
                        )}
                      />
                      
                      {/* Quick Add Button - Appears on Hover */}
                      <div
                        className={cn(
                          "absolute inset-x-0 bottom-0 p-4",
                          "transition-all duration-[var(--duration-normal)]",
                          "opacity-0 translate-y-2",
                          "group-hover:opacity-100 group-hover:translate-y-0"
                        )}
                      >
                        {defaultSize && defaultSize.stock_quantity > 0 && onQuickAdd && (
                          <button
                            onClick={(e) => handleQuickAdd(e, product)}
                            className={cn(
                              "w-full py-2.5 px-4",
                              "bg-transparent",
                              "border border-[var(--nocturne-champagne)]",
                              "text-[var(--nocturne-champagne)]",
                              "font-[var(--font-body)]",
                              "text-sm font-medium",
                              "rounded-md",
                              "transition-all duration-[var(--duration-fast)]",
                              "hover:bg-[var(--nocturne-champagne)]",
                              "hover:text-[var(--nocturne-onyx)]",
                              "flex items-center justify-center gap-2"
                            )}
                          >
                            <Plus className="w-4 h-4" />
                            Quick Add
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      {/* Brand Name (if available) */}
                      {product.brand_name && (
                        <p className="text-caption text-[var(--color-fg-muted)] uppercase mb-2">
                          {product.brand_name}
                        </p>
                      )}

                      {/* Product Name */}
                      <h3 
                        className={cn(
                          "font-[var(--font-heading)]",
                          "text-lg",
                          "text-[var(--nocturne-porcelain)]", // Off-White
                          "mb-2",
                          "line-clamp-2",
                          "min-h-[3.5rem]"
                        )}
                      >
                        {product.product_name}
                      </h3>

                      {/* Scent Notes */}
                      {scentNotes && (
                        <p 
                          className={cn(
                            "text-caption",
                            "text-[var(--color-fg-muted)]",
                            "mb-3",
                            "line-clamp-1"
                          )}
                        >
                          {scentNotes}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <p 
                          className={cn(
                            "font-[var(--font-body)]",
                            "text-base font-medium",
                            "text-[var(--nocturne-champagne)]" // Champagne Gold #D4AF37
                          )}
                        >
                          €{price.toFixed(2)}
                        </p>
                        
                        {defaultSize && (
                          <p className="text-caption text-[var(--color-fg-muted)]">
                            {defaultSize.size_ml}ml
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default LuxuryRecommendations;
