import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { NocturneProductCard } from '@/components/ui/nocturne-product-card';
import { NocturneButton } from '@/components/ui/nocturne-button';
import { NocturneBadge } from '@/components/ui/nocturne-badge';
import { useAppStore } from '@/store/main';
import SmartImage from '@/components/ui/SmartImage';

// Type definitions
interface Brand {
  brand_id: string;
  brand_name: string;
  description: string | null;
  logo_url: string | null;
  heritage_story: string | null;
  country_origin: string | null;
  is_niche_brand: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface Product {
  product_id: string;
  brand_id: string;
  category_id: string;
  product_name: string;
  description: string | null;
  short_description: string | null;
  fragrance_families: string;
  concentration: string;
  gender_category: string;
  base_price: number;
  sale_price: number | null;
  availability_status: string;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_limited_edition: boolean;
  images?: Array<{ image_url: string; alt_text: string | null }>;
  brand_name?: string;
  brand_logo?: string;
}

const UV_BrandDetail: React.FC = () => {
  const { brand_id } = useParams<{ brand_id: string }>();
  const [sortBy, setSortBy] = useState('best_selling');
  const showNotification = useAppStore(state => state.show_notification);

  // API Base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  // Fetch brand details
  const { data: brand, isLoading: brandLoading, error: brandError } = useQuery({
    queryKey: ['brand', brand_id],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/brands/${brand_id}`);
      return response.data as Brand;
    },
    enabled: !!brand_id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Fetch products for this brand
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['brandProducts', brand_id, sortBy],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/products`, {
        params: {
          brand_ids: brand_id,
          sort_by: sortBy,
          page: 1,
          per_page: 50
        }
      });
      return response.data;
    },
    enabled: !!brand_id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const products = productsData?.data || [];
  const totalProducts = productsData?.pagination?.total || 0;

  if (!brand_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brand Not Found</h1>
          <Link to="/products" className="text-purple-600 hover:text-purple-500">
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  if (brandLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (brandError || !brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brand Not Found</h1>
          <p className="text-gray-600 mb-4">The brand you're looking for doesn't exist.</p>
          <Link to="/products" className="text-purple-600 hover:text-purple-500">
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Breadcrumb */}
      <nav className="nocturne-container py-4">
        <div className="flex items-center space-x-2 text-sm text-[var(--color-fg-secondary)]">
          <Link to="/" className="hover:text-[var(--color-interactive-primary)]">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-[var(--color-interactive-primary)]">Brands</Link>
          <span>/</span>
          <span className="text-[var(--color-fg-primary)]">{brand.brand_name}</span>
        </div>
      </nav>

      {/* Brand Header */}
      <section className="bg-gradient-to-br from-[var(--nocturne-onyx)] via-[var(--nocturne-warm-taupe)] to-[var(--nocturne-onyx)] text-[var(--nocturne-porcelain)] py-16">
        <div className="nocturne-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Brand Logo */}
            {brand.logo_url && (
              <div className="flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-12">
                <SmartImage
                  src={brand.logo_url}
                  alt={`${brand.brand_name} logo`}
                  productName={brand.brand_name}
                  aspectRatio="auto"
                  objectFit="contain"
                  className="w-full h-auto max-w-[400px]"
                />
              </div>
            )}

            {/* Brand Info */}
            <div className={brand.logo_url ? '' : 'md:col-span-2 text-center max-w-4xl mx-auto'}>
              <div className="flex items-center gap-4 mb-6 justify-center md:justify-start">
                <h1 className="text-h1 font-[var(--font-heading)] font-[var(--text-h1-weight)] tracking-[var(--text-h1-spacing)]">
                  {brand.brand_name}
                </h1>
                {brand.is_niche_brand && (
                  <NocturneBadge variant="success" className="text-sm">
                    Niche Brand
                  </NocturneBadge>
                )}
              </div>

              {brand.country_origin && (
                <div className="flex items-center gap-2 mb-6 text-[var(--nocturne-champagne)] justify-center md:justify-start">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-subtitle">{brand.country_origin}</span>
                </div>
              )}

              {brand.description && (
                <p className="text-subtitle text-[var(--nocturne-champagne)] mb-6 leading-relaxed">
                  {brand.description}
                </p>
              )}

              <div className="flex items-center gap-6 text-body text-[var(--nocturne-porcelain)]/80 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>{totalProducts} {totalProducts === 1 ? 'Product' : 'Products'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Story */}
      {brand.heritage_story && (
        <section className="py-16 bg-[var(--color-bg-secondary)]">
          <div className="nocturne-container max-w-4xl">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-8 text-center tracking-[var(--text-h2-spacing)]">
              Our Heritage
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-body text-[var(--color-fg-secondary)] leading-relaxed">
                {brand.heritage_story}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="py-16 bg-[var(--color-bg-primary)]">
        <div className="nocturne-container">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] tracking-[var(--text-h2-spacing)]">
              Our Collection
            </h2>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-4">
              <label htmlFor="sort" className="text-body text-[var(--color-fg-secondary)]">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-[var(--color-border-primary)] rounded-[var(--radius-md)] px-4 py-2 text-body focus:ring-2 focus:ring-[var(--color-interactive-primary)] focus:border-[var(--color-interactive-primary)]"
              >
                <option value="best_selling">Best Selling</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="name_asc">Name: A-Z</option>
              </select>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-body text-[var(--color-fg-secondary)]">
                No products available for this brand at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product: Product, index: number) => {
                const primaryImage = product.images?.find(img => img)?.image_url || '/images/fallback-perfume-bottle.png';
                const badges: Array<'new' | 'bestseller' | 'limited'> = [];
                if (product.is_new_arrival) badges.push('new');
                if (product.is_featured) badges.push('bestseller');
                if (product.is_limited_edition) badges.push('limited');

                // Calculate price range from base_price
                const basePrice = Number(product.base_price || 0);
                const priceObj = {
                  '10ml': Math.round(basePrice * 0.3),
                  '50ml': basePrice,
                  '100ml': Math.round(basePrice * 1.8)
                };

                return (
                  <div
                    key={product.product_id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <NocturneProductCard
                      id={product.product_id}
                      name={product.product_name}
                      family={product.fragrance_families || 'Fragrance'}
                      price={priceObj}
                      image={primaryImage}
                      rating={4.5}
                      reviewCount={0}
                      badges={badges}
                      brandName={brand.brand_name}
                      brandLogo={brand.logo_url || undefined}
                      onQuickAdd={(id, size) => {
                        console.log(`Quick add ${id} in ${size}`);
                        showNotification({
                          type: 'success',
                          message: `Added ${product.product_name} (${size}) to cart!`,
                          title: 'Added to Cart',
                          auto_dismiss: true,
                          duration: 3000
                        });
                      }}
                      onClick={(id) => {
                        window.location.href = `/products/${id}`;
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[var(--nocturne-onyx)] text-[var(--nocturne-porcelain)]">
        <div className="nocturne-container text-center">
          <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] mb-6 tracking-[var(--text-h2-spacing)]">
            Discover More Brands
          </h2>
          <p className="text-subtitle text-[var(--nocturne-champagne)] mb-8 max-w-2xl mx-auto">
            Explore our curated selection of luxury fragrance houses from around the world
          </p>
          <NocturneButton size="lg" variant="outline" asChild>
            <Link to="/products">
              Browse All Fragrances
            </Link>
          </NocturneButton>
        </div>
      </section>
    </div>
  );
};

export default UV_BrandDetail;
