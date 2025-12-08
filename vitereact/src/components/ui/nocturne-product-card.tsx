import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { NocturneCard, NocturneCardContent } from './nocturne-card';
import { NocturneBadge } from './nocturne-badge';
import { NocturneButton } from './nocturne-button';
import { Heart, Plus, Star } from 'lucide-react';
import SmartImage from './SmartImage';

interface ProductSize {
  size_id: string;
  size_ml: number;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  sku: string;
  is_active: boolean;
}

interface ProductCardProps {
  id: string;
  name: string;
  family: string;
  price: {
    [key: string]: number; // e.g., '10ml': 45, '50ml': 85
  };
  sizes?: ProductSize[]; // Optional: actual size objects from API
  image: string;
  rating?: number;
  reviewCount?: number;
  badges?: Array<'new' | 'bestseller' | 'limited'>;
  isWishlisted?: boolean;
  brandName?: string;
  brandLogo?: string;
  onWishlistToggle?: (id: string) => void;
  onQuickAdd?: (id: string, size: string, sizeObj?: ProductSize) => void;
  onClick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const NocturneProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  family,
  price,
  sizes,
  image,
  rating = 0,
  reviewCount = 0,
  badges = [],
  isWishlisted = false,
  brandName,
  brandLogo,
  onWishlistToggle,
  onQuickAdd,
  onClick,
  className,
  style
}) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedSizeObj, setSelectedSizeObj] = useState<ProductSize | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Set default selected size when component mounts or sizes change
  React.useEffect(() => {
    if (sizes && sizes.length > 0 && !selectedSize) {
      // Prefer 50ml if available, otherwise use first available size
      const defaultSize = sizes.find(s => s.size_ml === 50 && s.stock_quantity > 0) || 
                         sizes.find(s => s.stock_quantity > 0) || 
                         sizes[0];
      if (defaultSize) {
        setSelectedSize(`${defaultSize.size_ml}ml`);
        setSelectedSizeObj(defaultSize);
      }
    } else if (!sizes && !selectedSize) {
      // Fallback for products without size data - default to 50ml
      setSelectedSize('50ml');
    }
  }, [sizes, selectedSize]);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate size selection
    if (!selectedSize) {
      setSizeError('Please select a size first.');
      return;
    }

    // Check stock if size object is available
    if (selectedSizeObj && selectedSizeObj.stock_quantity <= 0) {
      setSizeError('This size is out of stock.');
      return;
    }

    setSizeError(null);
    onQuickAdd?.(id, selectedSize, selectedSizeObj || undefined);
  };

  const handleCardClick = () => {
    onClick?.(id);
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'new': return 'success';
      case 'bestseller': return 'warning';
      case 'limited': return 'error';
      default: return 'default';
    }
  };

  return (
    <NocturneCard
      className={cn(
        "group cursor-pointer relative overflow-hidden",
        className
      )}
      style={{
        ...style,
        transition: 'all 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(212, 175, 55, 0.15), 0 0 30px rgba(212, 175, 55, 0.1)' 
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 rounded-[var(--card-border-radius)] pointer-events-none"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: isHovered ? '0 0 30px rgba(212, 175, 55, 0.4)' : '0 0 0px rgba(212, 175, 55, 0)',
          transition: 'all 2s ease-in-out',
          animation: isHovered ? 'pulse-glow 2s infinite' : 'none',
        }}
      />
      
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-t-[var(--card-border-radius)]">
        <div
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          <SmartImage
            src={image}
            alt={name}
            productName={name}
            category={family}
            aspectRatio="3:4"
            objectFit="cover"
            className="rounded-t-[var(--card-border-radius)]"
          />
        </div>
        
        {/* Badges */}
        {badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {badges.map((badge) => (
              <NocturneBadge
                key={badge}
                variant={getBadgeVariant(badge)}
                className="text-xs capitalize"
              >
                {badge}
              </NocturneBadge>
            ))}
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            "absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-[var(--duration-normal)] hover:bg-white hover:scale-110",
            isWishlisted && "text-red-500"
          )}
        >
          <Heart
            size={16}
            className={cn(
              "transition-all duration-[var(--duration-normal)]",
              isWishlisted && "fill-current"
            )}
          />
        </button>

        {/* Quick Add Overlay */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 transition-all duration-[var(--duration-normal)]",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          )}
        >
          {/* Size Error Message */}
          {sizeError && (
            <div className="mb-2 px-2 py-1 bg-red-500/90 text-white text-xs rounded">
              {sizeError}
            </div>
          )}
          
          <div className="flex items-center gap-2 mb-2">
            {sizes ? (
              // Use actual size objects if available
              sizes.map((sizeObj) => {
                const sizeKey = `${sizeObj.size_ml}ml`;
                const isOutOfStock = sizeObj.stock_quantity <= 0;
                return (
                  <button
                    key={sizeObj.size_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSize(sizeKey);
                      setSelectedSizeObj(sizeObj);
                      setSizeError(null);
                    }}
                    disabled={isOutOfStock}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium transition-all duration-[var(--duration-fast)]",
                      selectedSize === sizeKey
                        ? "bg-white text-black"
                        : isOutOfStock
                        ? "bg-white/10 text-white/50 cursor-not-allowed line-through"
                        : "bg-white/20 text-white hover:bg-white/30"
                    )}
                    title={isOutOfStock ? 'Out of stock' : ''}
                  >
                    {sizeKey}
                  </button>
                );
              })
            ) : (
              // Fallback to price keys if no size objects
              Object.entries(price).map(([size]) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSize(size);
                    setSelectedSizeObj(null);
                    setSizeError(null);
                  }}
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium transition-all duration-[var(--duration-fast)]",
                    selectedSize === size
                      ? "bg-white text-black"
                      : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {size}
                </button>
              ))
            )}
          </div>
          <NocturneButton
            size="sm"
            onClick={handleQuickAdd}
            className="w-full bg-white text-black hover:bg-gray-100"
            disabled={!selectedSize || (selectedSizeObj?.stock_quantity ?? 1) <= 0}
          >
            <Plus size={14} className="mr-1" />
            {selectedSize && price[selectedSize] 
              ? `Add €${price[selectedSize]}` 
              : 'Select Size'}
          </NocturneButton>
        </div>
      </div>

      <NocturneCardContent className="p-4">
        {/* Brand Info */}
        {(brandName || brandLogo) && (
          <div className="flex items-center gap-2 mb-2">
            {brandLogo && (
              <SmartImage
                src={brandLogo}
                alt={brandName || 'Brand logo'}
                productName={brandName}
                aspectRatio="auto"
                objectFit="contain"
                className="h-6 w-auto"
              />
            )}
            {brandName && !brandLogo && (
              <span className="text-caption text-[var(--color-fg-muted)] font-[var(--font-weight-medium)]">
                {brandName}
              </span>
            )}
          </div>
        )}

        {/* Family Tag */}
        <NocturneBadge variant="family" className="mb-2 w-fit">
          {typeof family === 'string' 
            ? family.split(',').map(f => f.trim()).slice(0, 2).join(', ')
            : Array.isArray(family) 
            ? family.slice(0, 2).join(', ')
            : family}
        </NocturneBadge>

        {/* Product Name */}
        <h3 
          className="text-subtitle font-[var(--font-weight-semibold)] mb-1 line-clamp-2"
          style={{
            color: isHovered ? '#D4AF37' : 'var(--color-fg-primary)',
            transition: 'color 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          {name}
        </h3>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  className={cn(
                    "transition-colors duration-[var(--duration-fast)]",
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-caption text-[var(--color-fg-muted)]">
              ({reviewCount})
            </span>
          </div>
        )}

        {/* Price Range */}
        <div className="flex items-center justify-between">
          <div className="text-body font-[var(--font-weight-medium)] text-[var(--color-fg-primary)]">
            €{Math.min(...Object.values(price))} - €{Math.max(...Object.values(price))}
          </div>
          <div className="text-caption text-[var(--color-fg-muted)]">
            from 10ml
          </div>
        </div>
      </NocturneCardContent>
    </NocturneCard>
  );
};

export { NocturneProductCard };