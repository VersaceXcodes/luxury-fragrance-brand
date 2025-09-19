import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { NocturneProductCard } from '@/components/ui/nocturne-product-card';
import { NocturneButton } from '@/components/ui/nocturne-button';
import { NocturneBadge } from '@/components/ui/nocturne-badge';

// API Response Types
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
  sku_prefix: string;
  created_at: string;
  updated_at: string;
}

// Currently unused but kept for future implementation
// interface Review {
//   review_id: string;
//   product_id: string;
//   user_id: string;
//   rating: number;
//   title: string | null;
//   review_text: string | null;
//   is_verified_purchase: boolean;
//   is_featured: boolean;
//   created_at: string;
// }

interface NewsletterSubscriptionRequest {
  email: string;
  first_name?: string;
  subscription_source: string;
  preferences: string;
}

const UV_Homepage: React.FC = () => {
  // Zustand store selectors (individual to avoid infinite loops)
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  // const addToCart = useAppStore(state => state.add_to_cart); // Currently unused but kept for future implementation
  const showNotification = useAppStore(state => state.show_notification);

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);

  // Hero carousel state (currently unused but kept for future implementation)
  // const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // API Base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Sample products data for Nocturne Atelier
  const sampleProducts = [
    {
      product_id: '1',
      product_name: 'Aurora No. 1',
      family: 'Citrus/Floral',
      price: { '10ml': 45, '50ml': 85, '100ml': 120 },
      image: '/api/placeholder/400/400',
      rating: 4.8,
      reviewCount: 127,
      badges: ['bestseller'],
      notes: { top: ['Bergamot', 'Pink Grapefruit'], heart: ['Rose Petals', 'Jasmine'], base: ['White Musk', 'Cedar'] }
    },
    {
      product_id: '2',
      product_name: 'Midnight Saffron',
      family: 'Amber/Spice',
      price: { '10ml': 50, '50ml': 90, '100ml': 130 },
      image: '/api/placeholder/400/400',
      rating: 4.9,
      reviewCount: 89,
      badges: ['new'],
      notes: { top: ['Saffron', 'Black Pepper'], heart: ['Rose', 'Oud'], base: ['Amber', 'Sandalwood'] }
    },
    {
      product_id: '3',
      product_name: 'Coastal Fig',
      family: 'Green/Woody',
      price: { '10ml': 48, '50ml': 88, '100ml': 125 },
      image: '/api/placeholder/400/400',
      rating: 4.7,
      reviewCount: 156,
      badges: [],
      notes: { top: ['Fig Leaves', 'Sea Salt'], heart: ['Green Fig', 'Violet'], base: ['Driftwood', 'Ambergris'] }
    },
    {
      product_id: '4',
      product_name: 'Cinder Oud',
      family: 'Woody/Smoky',
      price: { '10ml': 55, '50ml': 95, '100ml': 140 },
      image: '/api/placeholder/400/400',
      rating: 4.6,
      reviewCount: 73,
      badges: ['limited'],
      notes: { top: ['Smoke', 'Pink Pepper'], heart: ['Oud', 'Rose'], base: ['Leather', 'Patchouli'] }
    },
    {
      product_id: '5',
      product_name: 'Citrus Atlas',
      family: 'Citrus/Aromatic',
      price: { '10ml': 42, '50ml': 82, '100ml': 115 },
      image: '/api/placeholder/400/400',
      rating: 4.5,
      reviewCount: 201,
      badges: [],
      notes: { top: ['Lemon', 'Mint'], heart: ['Lavender', 'Geranium'], base: ['Vetiver', 'Tonka Bean'] }
    }
  ];

  // API Queries
  useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/products/featured?limit=12`);
      return response.data as Product[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Currently unused queries but kept for future implementation
  // const { data: newArrivals = [] } = useQuery({
  //   queryKey: ['new-arrivals'],
  //   queryFn: async () => {
  //     const response = await axios.get(`${getApiUrl()}/api/products/new-arrivals?limit=12`);
  //     return response.data as Product[];
  //   },
  //   staleTime: 5 * 60 * 1000,
  //   retry: 1
  // });

  // const { data: bestSellers = [] } = useQuery({
  //   queryKey: ['best-sellers'],
  //   queryFn: async () => {
  //     const response = await axios.get(`${getApiUrl()}/api/products/best-sellers?limit=8`);
  //     return response.data as Product[];
  //   },
  //   staleTime: 5 * 60 * 1000,
  //   retry: 1
  // });

  // const { data: testimonials = [] } = useQuery({
  //   queryKey: ['testimonials'],
  //   queryFn: async () => {
  //     const response = await axios.get(`${getApiUrl()}/api/reviews?is_featured=true&moderation_status=approved&limit=6`);
  //     return response.data.data as Review[];
  //   },
  //   staleTime: 10 * 60 * 1000,
  //   retry: 1
  // });

  // Newsletter subscription mutation
  const newsletterMutation = useMutation({
    mutationFn: async (data: NewsletterSubscriptionRequest) => {
      const response = await axios.post(`${getApiUrl()}/api/newsletter/subscribe`, data);
      return response.data;
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Welcome! Check your email for your 10% off code.',
        title: 'Newsletter Subscription Successful',
        auto_dismiss: true,
        duration: 5000
      });
      setNewsletterEmail('');
      setNewsletterConsent(false);
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to subscribe. Please try again.',
        title: 'Subscription Failed',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Handlers (currently unused but kept for future implementation)
  // const handleAddToCart = async (product: Product) => {
  //   try {
  //     await addToCart({
  //       product_id: product.product_id,
  //       product_name: product.product_name,
  //       brand_name: 'Luxury Brand', // Would come from joined data in real implementation
  //       size_ml: 50, // Default size
  //       quantity: 1,
  //       unit_price: product.sale_price || product.base_price,
  //       gift_wrap: false,
  //       sample_included: false
  //     });
  //   } catch (error) {
  //     console.error('Failed to add to cart:', error);
  //   }
  // };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    
    newsletterMutation.mutate({
      email: newsletterEmail.trim(),
      first_name: currentUser?.first_name || undefined,
      subscription_source: 'homepage_signup',
      preferences: JSON.stringify({
        new_arrivals: true,
        sales: true,
        exclusive_offers: true
      })
    });
  };

  // Hero carousel functions (currently unused but kept for future implementation)
  // const nextHeroSlide = () => {
  //   setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
  // };

  // const prevHeroSlide = () => {
  //   setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  // };

  // Utility functions (currently unused but kept for future implementation)
  // const formatPrice = (price: number) => {
  //   return new Intl.NumberFormat('en-EU', {
  //     style: 'currency',
  //     currency: 'EUR'
  //   }).format(price);
  // };

  // const renderStars = (rating: number) => {
  //   return Array.from({ length: 5 }, (_, i) => (
  //     <svg
  //       key={i}
  //       className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
  //       fill="currentColor"
  //       viewBox="0 0 20 20"
  //     >
  //       <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  //     </svg>
  //   ));
  // };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg-primary)]">
        {/* Background Image */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--nocturne-onyx)] via-[var(--nocturne-warm-taupe)] to-[var(--nocturne-onyx)]" />
        <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--nocturne-onyx)]/80 via-transparent to-[var(--nocturne-onyx)]/40" />
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[var(--nocturne-champagne)]/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-32 right-16 w-24 h-24 bg-[var(--nocturne-porcelain)]/5 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-[var(--nocturne-champagne)]/10 rounded-full blur-lg animate-pulse delay-500"></div>
        </div>
        
        <div className="relative z-10 text-center text-[var(--nocturne-porcelain)] nocturne-container py-32">
          <h1 className="text-h1 font-[var(--font-heading)] font-[var(--text-h1-weight)] mb-6 tracking-[var(--text-h1-spacing)] leading-[var(--text-h1-line)]">
            Scent After Dark
          </h1>
          <p className="text-subtitle mb-4 font-[var(--font-weight-light)] text-[var(--nocturne-champagne)]">
            Artisanal fragrances, crafted in small batches
          </p>
          <p className="text-body mb-12 max-w-2xl mx-auto text-[var(--nocturne-porcelain)]/80 leading-relaxed">
            Discover our collection of sophisticated, sensual fragrances designed for those who appreciate the art of scent
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/products"
              className="inline-flex items-center bg-[var(--color-interactive-primary)] text-[var(--color-fg-inverse)] px-8 py-4 rounded-[var(--radius-full)] font-[var(--font-weight-semibold)] text-body hover:bg-[var(--color-interactive-primary-hover)] transition-all duration-[var(--duration-normal)] transform hover:scale-105 active:scale-95 group"
            >
              <span>Explore Collection</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-[var(--duration-normal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            
            <Link
              to="/samples"
              className="inline-flex items-center bg-transparent border border-[var(--nocturne-champagne)] text-[var(--nocturne-champagne)] px-8 py-4 rounded-[var(--radius-full)] font-[var(--font-weight-semibold)] text-body hover:bg-[var(--nocturne-champagne)] hover:text-[var(--nocturne-onyx)] transition-all duration-[var(--duration-normal)] transform hover:scale-105 active:scale-95"
            >
              Try 10ml First
            </Link>
          </div>
          
          {isAuthenticated && currentUser && (
            <div className="mt-8">
              <div className="inline-flex items-center bg-[var(--nocturne-porcelain)]/10 backdrop-blur-sm px-6 py-3 rounded-[var(--radius-full)] border border-[var(--nocturne-porcelain)]/20">
                <div className="w-8 h-8 bg-[var(--nocturne-champagne)] rounded-full flex items-center justify-center text-[var(--nocturne-onyx)] font-[var(--font-weight-semibold)] text-caption mr-3">
                  {currentUser.first_name?.charAt(0).toUpperCase()}
                </div>
                <p className="text-body text-[var(--nocturne-porcelain)]/90">Welcome back, {currentUser.first_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-[var(--nocturne-champagne)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Bestsellers Section */}
      <section className="py-24 bg-[var(--color-bg-primary)]">
        <div className="nocturne-container">
          <div className="text-center mb-16">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-6 tracking-[var(--text-h2-spacing)]">
              Bestsellers
            </h2>
            <p className="text-subtitle text-[var(--color-fg-secondary)] max-w-2xl mx-auto leading-relaxed">
              Our most coveted fragrances, chosen by connoisseurs worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sampleProducts.map((product) => (
              <NocturneProductCard
                key={product.product_id}
                id={product.product_id}
                name={product.product_name}
                family={product.family}
                price={product.price}
                image={product.image}
                rating={product.rating}
                reviewCount={product.reviewCount}
                badges={product.badges as Array<'new' | 'bestseller' | 'limited'>}
                onQuickAdd={(id, size) => {
                  console.log(`Quick add ${id} in ${size}`);
                  // Handle quick add to cart
                }}
                onClick={(id) => {
                  console.log(`Navigate to product ${id}`);
                  // Handle navigation to PDP
                }}
                className="animate-fade-in"
              />
            ))}
          </div>

          <div className="text-center mt-16">
            <NocturneButton size="lg" asChild>
              <Link to="/products">
                View All Fragrances
              </Link>
            </NocturneButton>
          </div>
        </div>
      </section>

      {/* Notes Explorer Section */}
      <section className="py-24 bg-[var(--color-bg-secondary)]">
        <div className="nocturne-container">
          <div className="text-center mb-16">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-6 tracking-[var(--text-h2-spacing)]">
              Explore by Notes
            </h2>
            <p className="text-subtitle text-[var(--color-fg-secondary)] max-w-2xl mx-auto leading-relaxed">
              Discover fragrances through their olfactory families and signature notes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { family: 'Citrus', description: 'Fresh, energizing, bright', icon: '🍋', color: 'from-yellow-400 to-orange-400' },
              { family: 'Floral', description: 'Romantic, elegant, feminine', icon: '🌸', color: 'from-pink-400 to-rose-400' },
              { family: 'Amber', description: 'Warm, sensual, mysterious', icon: '🔥', color: 'from-amber-400 to-orange-600' },
              { family: 'Woody', description: 'Sophisticated, grounding, rich', icon: '🌳', color: 'from-amber-600 to-brown-600' },
              { family: 'Green', description: 'Natural, crisp, refreshing', icon: '🌿', color: 'from-green-400 to-emerald-500' }
            ].map((note) => (
              <Link
                key={note.family}
                to={`/products?family=${note.family.toLowerCase()}`}
                className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] hover:shadow-[var(--shadow-elevated)] transition-all duration-[var(--duration-normal)] transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${note.color} opacity-10 group-hover:opacity-20 transition-opacity duration-[var(--duration-normal)]`} />
                <div className="relative p-8 text-center">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-[var(--duration-normal)]">
                    {note.icon}
                  </div>
                  <h3 className="text-h3 font-[var(--font-heading)] font-[var(--text-h3-weight)] text-[var(--color-fg-primary)] mb-2">
                    {note.family}
                  </h3>
                  <p className="text-caption text-[var(--color-fg-secondary)] leading-relaxed">
                    {note.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* Brand Story Section */}
      <section className="py-24 bg-[var(--color-bg-primary)]">
        <div className="nocturne-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-8 tracking-[var(--text-h2-spacing)]">
                Crafted in Darkness, Born in Light
              </h2>
              <p className="text-body text-[var(--color-fg-secondary)] mb-6 leading-relaxed">
                At Nocturne Atelier, we believe fragrance is an intimate art form—a whispered secret between 
                skin and soul. Each creation in our collection is meticulously crafted in small batches, 
                using only the finest raw materials sourced from the world's most prestigious suppliers.
              </p>
              <p className="text-body text-[var(--color-fg-secondary)] mb-8 leading-relaxed">
                Our master perfumers work under the cover of night, when the senses are most acute and 
                creativity flows freely. Every bottle tells a story of passion, precision, and the 
                relentless pursuit of olfactory perfection.
              </p>
              <NocturneButton variant="outline" size="lg" asChild>
                <Link to="/about">
                  Discover Our Story
                </Link>
              </NocturneButton>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] p-6 text-center hover:shadow-[var(--shadow-subtle)] transition-shadow duration-[var(--duration-normal)]">
                <div className="text-3xl mb-4">🌙</div>
                <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Nocturnal Craft</h3>
                <p className="text-caption text-[var(--color-fg-secondary)]">Created when senses are most acute</p>
              </div>
              <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] p-6 text-center hover:shadow-[var(--shadow-subtle)] transition-shadow duration-[var(--duration-normal)]">
                <div className="text-3xl mb-4">🧪</div>
                <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Small Batches</h3>
                <p className="text-caption text-[var(--color-fg-secondary)]">Artisanal quality in every bottle</p>
              </div>
              <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] p-6 text-center hover:shadow-[var(--shadow-subtle)] transition-shadow duration-[var(--duration-normal)]">
                <div className="text-3xl mb-4">🌿</div>
                <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Pure Ingredients</h3>
                <p className="text-caption text-[var(--color-fg-secondary)]">Ethically sourced, naturally derived</p>
              </div>
              <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] p-6 text-center hover:shadow-[var(--shadow-subtle)] transition-shadow duration-[var(--duration-normal)]">
                <div className="text-3xl mb-4">♻️</div>
                <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Sustainable</h3>
                <p className="text-caption text-[var(--color-fg-secondary)]">Recyclable packaging, cruelty-free</p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Newsletter Section */}
      <section className="py-24 bg-[var(--nocturne-onyx)] text-[var(--nocturne-porcelain)]">
        <div className="nocturne-container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--nocturne-porcelain)] mb-6 tracking-[var(--text-h2-spacing)]">
              Join the Atelier
            </h2>
            <p className="text-subtitle text-[var(--nocturne-champagne)] mb-12 leading-relaxed">
              Be the first to discover new creations, receive exclusive offers, and unlock the secrets of fragrance artistry. 
              Plus, enjoy 10% off your first order.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="flex-1 px-6 py-4 rounded-[var(--radius-full)] bg-[var(--nocturne-porcelain)] text-[var(--nocturne-onyx)] placeholder:text-[var(--nocturne-warm-taupe)] focus:outline-none focus:ring-2 focus:ring-[var(--nocturne-champagne)] text-body"
                />
                <NocturneButton
                  type="submit"
                  disabled={newsletterMutation.isPending || !newsletterConsent}
                  size="lg"
                  className="bg-[var(--nocturne-champagne)] text-[var(--nocturne-onyx)] hover:bg-[var(--nocturne-porcelain)] disabled:opacity-50 disabled:cursor-not-allowed px-8"
                >
                  {newsletterMutation.isPending ? 'Joining...' : 'Join Atelier'}
                </NocturneButton>
              </div>
              
              <div className="flex items-start space-x-3 text-left">
                <input
                  type="checkbox"
                  id="newsletter-consent"
                  checked={newsletterConsent}
                  onChange={(e) => setNewsletterConsent(e.target.checked)}
                  className="mt-1 rounded border-[var(--nocturne-champagne)] text-[var(--nocturne-champagne)] focus:ring-[var(--nocturne-champagne)] bg-transparent"
                  required
                />
                <label htmlFor="newsletter-consent" className="text-caption text-[var(--nocturne-champagne)] leading-relaxed">
                  I agree to receive artisanal updates from Nocturne Atelier. Unsubscribe anytime. 
                  By subscribing, I agree to the{' '}
                  <Link to="/privacy" className="text-[var(--nocturne-porcelain)] hover:text-[var(--nocturne-champagne)] underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" className="text-[var(--nocturne-porcelain)] hover:text-[var(--nocturne-champagne)] underline">
                    Terms of Service
                  </Link>.
                </label>
              </div>
            </form>
            
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-caption text-[var(--nocturne-champagne)]">
              <div className="flex items-center">
                <span className="text-[var(--nocturne-porcelain)] mr-2">✓</span>
                First access to new releases
              </div>
              <div className="flex items-center">
                <span className="text-[var(--nocturne-porcelain)] mr-2">✓</span>
                Exclusive member pricing
              </div>
              <div className="flex items-center">
                <span className="text-[var(--nocturne-porcelain)] mr-2">✓</span>
                Fragrance mastery insights
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)]">
        <div className="nocturne-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <NocturneBadge variant="secondary" className="mb-4 text-lg px-4 py-2">
                🐰
              </NocturneBadge>
              <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Cruelty-Free</h3>
              <p className="text-caption text-[var(--color-fg-secondary)]">Never tested on animals, always ethical</p>
            </div>
            <div className="flex flex-col items-center">
              <NocturneBadge variant="secondary" className="mb-4 text-lg px-4 py-2">
                🚚
              </NocturneBadge>
              <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Free EU Shipping</h3>
              <p className="text-caption text-[var(--color-fg-secondary)]">Complimentary shipping on orders over €120</p>
            </div>
            <div className="flex flex-col items-center">
              <NocturneBadge variant="secondary" className="mb-4 text-lg px-4 py-2">
                ♻️
              </NocturneBadge>
              <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">Recyclable Packaging</h3>
              <p className="text-caption text-[var(--color-fg-secondary)]">Sustainable materials, minimal waste</p>
            </div>
            <div className="flex flex-col items-center">
              <NocturneBadge variant="secondary" className="mb-4 text-lg px-4 py-2">
                ✓
              </NocturneBadge>
              <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">IFRA Compliant</h3>
              <p className="text-caption text-[var(--color-fg-secondary)]">International safety standards certified</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_Homepage;