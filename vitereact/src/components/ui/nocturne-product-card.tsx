import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { NocturneCard, NocturneCardContent } from './nocturne-card';
import { NocturneBadge } from './nocturne-badge';
import { NocturneButton } from './nocturne-button';
import { Heart, Plus, Star } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  family: string;
  price: {
    '10ml': number;
    '50ml': number;
    '100ml': number;
  };
  image: string;
  rating?: number;
  reviewCount?: number;
  badges?: Array<'new' | 'bestseller' | 'limited'>;
  isWishlisted?: boolean;
  brandName?: string;
  brandLogo?: string;
  onWishlistToggle?: (id: string) => void;
  onQuickAdd?: (id: string, size: '10ml' | '50ml' | '100ml') => void;
  onClick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const NocturneProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  family,
  price,
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
  const [selectedSize, setSelectedSize] = useState<'10ml' | '50ml' | '100ml'>('50ml');
  const [isHovered, setIsHovered] = useState(false);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd?.(id, selectedSize);
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
        "group cursor-pointer transition-all duration-[var(--duration-normal)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-1",
        className
      )}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-t-[var(--card-border-radius)]">
        <img
          src={image}
          alt={name}
          className={cn(
            "h-full w-full object-cover transition-transform duration-[var(--duration-slow)]",
            isHovered && "scale-105"
          )}
        />
        
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
          <div className="flex items-center gap-2 mb-2">
            {Object.entries(price).map(([size]) => (
              <button
                key={size}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSize(size as '10ml' | '50ml' | '100ml');
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
            ))}
          </div>
          <NocturneButton
            size="sm"
            onClick={handleQuickAdd}
            className="w-full bg-white text-black hover:bg-gray-100"
          >
            <Plus size={14} className="mr-1" />
            Add €{price[selectedSize]}
          </NocturneButton>
        </div>
      </div>

      <NocturneCardContent className="p-4">
        {/* Brand Info */}
        {(brandName || brandLogo) && (
          <div className="flex items-center gap-2 mb-2">
            {brandLogo && (
              <img
                src={brandLogo}
                alt={brandName || 'Brand logo'}
                className="h-6 w-auto object-contain"
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
          {family}
        </NocturneBadge>

        {/* Product Name */}
        <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-1 line-clamp-2">
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