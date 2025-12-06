import React, { useState, useEffect } from 'react';
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
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  // Interactive elements state
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showQuickView, setShowQuickView] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // API Base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  // Hero slides data
  const heroSlides = [
    {
      title: "Scent After Dark",
      subtitle: "Artisanal fragrances, crafted in small batches",
      description: "Discover our collection of sophisticated, sensual fragrances designed for those who appreciate the art of scent",
      cta: "Explore Collection",
      ctaLink: "/products",
      background: "from-[var(--nocturne-onyx)] via-[var(--nocturne-warm-taupe)] to-[var(--nocturne-onyx)]"
    },
    {
      title: "New Arrival: Midnight Saffron",
      subtitle: "Limited Edition Release",
      description: "An intoxicating blend of precious saffron and dark rose, crafted for the most discerning collectors",
      cta: "Discover Now",
      ctaLink: "/products/midnight-saffron",
      background: "from-[var(--nocturne-onyx)] via-purple-900 to-[var(--nocturne-onyx)]"
    },
    {
      title: "Sample Discovery Set",
      subtitle: "Try before you commit",
      description: "Explore our entire collection with 10ml samples. Perfect for discovering your signature scent",
      cta: "Shop Samples",
      ctaLink: "/samples",
      background: "from-[var(--nocturne-onyx)] via-amber-900 to-[var(--nocturne-onyx)]"
    }
  ];

  // Customer testimonials
  const testimonials = [
    {
      text: "Nocturne Atelier creates the most sophisticated fragrances I've ever encountered. Each scent tells a story.",
      author: "Sophie M.",
      location: "Paris, France",
      rating: 5
    },
    {
      text: "The quality is unmatched. These aren't just perfumes, they're works of art that you wear.",
      author: "Marcus L.",
      location: "Berlin, Germany", 
      rating: 5
    },
    {
      text: "I've been searching for unique fragrances for years. Nocturne Atelier exceeded all my expectations.",
      author: "Elena R.",
      location: "Milan, Italy",
      rating: 5
    }
  ];

  // Interactive effects
  useEffect(() => {
    // Simulate visitor counter
    const count = Math.floor(Math.random() * 50) + 150;
    setVisitorCount(count);

    // Auto-rotate hero slides
    const heroInterval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    // Auto-rotate testimonials
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(heroInterval);
      clearInterval(testimonialInterval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [heroSlides.length, testimonials.length]);

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
      setNewsletterError(null);
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
      const errorMsg = error.response?.data?.message || 'Failed to subscribe. Please try again.';
      setNewsletterError(errorMsg);
      showNotification({
        type: 'error',
        message: errorMsg,
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
    setNewsletterError(null);
    
    // Validate email is not empty
    if (!newsletterEmail.trim()) {
      const errorMsg = 'Please enter your email address';
      setNewsletterError(errorMsg);
      showNotification({
        type: 'warning',
        message: errorMsg,
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail.trim())) {
      const errorMsg = 'Please enter a valid email address';
      setNewsletterError(errorMsg);
      showNotification({
        type: 'error',
        message: errorMsg,
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }
    
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

  // Hero carousel functions
  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentHeroSlide(index);
  };

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
      {/* Interactive Hero Section with Carousel */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg-primary)]">
        {/* Dynamic Background based on current slide */}
        <div className={`absolute inset-0 bg-gradient-to-br ${heroSlides[currentHeroSlide].background} transition-all duration-1000`} />
        <div className="absolute inset-0 bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--nocturne-onyx)]/80 via-transparent to-[var(--nocturne-onyx)]/40" />
        
        {/* Interactive floating elements that follow mouse */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-32 h-32 bg-[var(--nocturne-champagne)]/10 rounded-full blur-xl animate-pulse transition-all duration-1000"
            style={{
              left: `${10 + (mousePosition.x / window.innerWidth) * 5}%`,
              top: `${20 + (mousePosition.y / window.innerHeight) * 10}%`
            }}
          ></div>
          <div 
            className="absolute w-24 h-24 bg-[var(--nocturne-porcelain)]/5 rounded-full blur-2xl animate-pulse delay-1000 transition-all duration-1000"
            style={{
              right: `${16 + (mousePosition.x / window.innerWidth) * 8}%`,
              bottom: `${32 + (mousePosition.y / window.innerHeight) * 5}%`
            }}
          ></div>
          <div 
            className="absolute w-16 h-16 bg-[var(--nocturne-champagne)]/10 rounded-full blur-lg animate-pulse delay-500 transition-all duration-1000"
            style={{
              right: `${25 + (mousePosition.x / window.innerWidth) * 3}%`,
              top: `${33 + (mousePosition.y / window.innerHeight) * 7}%`
            }}
          ></div>
        </div>

        {/* Hero Navigation */}
        <button
          onClick={prevHeroSlide}
          className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20 bg-[var(--nocturne-porcelain)]/10 backdrop-blur-sm border border-[var(--nocturne-porcelain)]/20 rounded-full p-3 text-[var(--nocturne-porcelain)] hover:bg-[var(--nocturne-porcelain)]/20 transition-all duration-300 group"
        >
          <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={nextHeroSlide}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20 bg-[var(--nocturne-porcelain)]/10 backdrop-blur-sm border border-[var(--nocturne-porcelain)]/20 rounded-full p-3 text-[var(--nocturne-porcelain)] hover:bg-[var(--nocturne-porcelain)]/20 transition-all duration-300 group"
        >
          <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-[var(--nocturne-porcelain)] nocturne-container py-32">
          <div className="animate-fade-in" key={currentHeroSlide}>
            <h1 className="text-h1 font-[var(--font-heading)] font-[var(--text-h1-weight)] mb-6 tracking-[var(--text-h1-spacing)] leading-[var(--text-h1-line)] animate-slide-up">
              {heroSlides[currentHeroSlide].title}
            </h1>
            <p className="text-subtitle mb-4 font-[var(--font-weight-light)] text-[var(--nocturne-champagne)] animate-slide-up delay-100">
              {heroSlides[currentHeroSlide].subtitle}
            </p>
            <p className="text-body mb-12 max-w-2xl mx-auto text-[var(--nocturne-porcelain)]/80 leading-relaxed animate-slide-up delay-200">
              {heroSlides[currentHeroSlide].description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up delay-300">
              <Link
                to={heroSlides[currentHeroSlide].ctaLink}
                className="inline-flex items-center bg-[var(--color-interactive-primary)] text-[var(--color-fg-inverse)] px-8 py-4 rounded-[var(--radius-full)] font-[var(--font-weight-semibold)] text-body hover:bg-[var(--color-interactive-primary-hover)] transition-all duration-[var(--duration-normal)] transform hover:scale-105 active:scale-95 group"
              >
                <span>{heroSlides[currentHeroSlide].cta}</span>
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
          </div>
          
          {isAuthenticated && currentUser && (
            <div className="mt-8 animate-slide-up delay-400">
              <div className="inline-flex items-center bg-[var(--nocturne-porcelain)]/10 backdrop-blur-sm px-6 py-3 rounded-[var(--radius-full)] border border-[var(--nocturne-porcelain)]/20">
                <div className="w-8 h-8 bg-[var(--nocturne-champagne)] rounded-full flex items-center justify-center text-[var(--nocturne-onyx)] font-[var(--font-weight-semibold)] text-caption mr-3">
                  {currentUser.first_name?.charAt(0).toUpperCase()}
                </div>
                <p className="text-body text-[var(--nocturne-porcelain)]/90">Welcome back, {currentUser.first_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Hero Slide Indicators */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentHeroSlide 
                  ? 'bg-[var(--nocturne-champagne)] scale-125' 
                  : 'bg-[var(--nocturne-porcelain)]/30 hover:bg-[var(--nocturne-porcelain)]/50'
              }`}
            />
          ))}
        </div>

        {/* Live visitor counter */}
        <div className="absolute top-8 right-8 bg-[var(--nocturne-porcelain)]/10 backdrop-blur-sm px-4 py-2 rounded-[var(--radius-full)] border border-[var(--nocturne-porcelain)]/20 text-[var(--nocturne-porcelain)] text-caption">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{visitorCount} exploring now</span>
          </div>
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
              Featured Collections
            </h2>
            <p className="text-subtitle text-[var(--color-fg-secondary)] max-w-2xl mx-auto leading-relaxed">
              Our most coveted fragrances, chosen by connoisseurs worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sampleProducts.map((product, index) => (
              <div
                key={product.product_id}
                className="group relative"
                onMouseEnter={() => setShowQuickView(product.product_id)}
                onMouseLeave={() => setShowQuickView(null)}
              >
                <NocturneProductCard
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
                    showNotification({
                      type: 'success',
                      message: `Added ${product.product_name} (${size}) to cart!`,
                      title: 'Added to Cart',
                      auto_dismiss: true,
                      duration: 3000
                    });
                  }}
                  onClick={(id) => {
                    console.log(`Navigate to product ${id}`);
                  }}
                  className={`animate-fade-in transition-all duration-500 hover:scale-105 ${
                    showQuickView === product.product_id ? 'shadow-2xl' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                />
                
                {/* Quick view overlay */}
                {showQuickView === product.product_id && (
                  <div className="absolute inset-0 bg-[var(--nocturne-onyx)]/90 backdrop-blur-sm rounded-[var(--radius-lg)] flex items-center justify-center z-10 animate-fade-in">
                    <div className="text-center text-[var(--nocturne-porcelain)] p-6">
                      <h4 className="text-subtitle font-[var(--font-weight-semibold)] mb-2">{product.product_name}</h4>
                      <p className="text-caption mb-4">
                        Top: {product.notes.top.join(', ')}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <NocturneButton size="sm" variant="outline">
                          Quick View
                        </NocturneButton>
                        <NocturneButton size="sm">
                          Add to Cart
                        </NocturneButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      {/* Featured Brands Section */}
      <section className="py-24 bg-[var(--color-bg-primary)]">
        <div className="nocturne-container">
          <div className="text-center mb-16">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-6 tracking-[var(--text-h2-spacing)]">
              Featured Brands
            </h2>
            <p className="text-subtitle text-[var(--color-fg-secondary)] max-w-2xl mx-auto leading-relaxed">
              Discover luxury perfume houses with rich heritage and exquisite craftsmanship
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[
              { 
                brand_id: 'brand_001',
                name: 'Chanel', 
                description: 'Iconic French luxury brand known for timeless elegance',
                logo: 'https://picsum.photos/300/200?random=1',
                country: 'France',
                founded: '1910',
                productCount: 1
              },
              { 
                brand_id: 'brand_002',
                name: 'Tom Ford', 
                description: 'Modern luxury creating bold, sensual fragrances',
                logo: 'https://picsum.photos/300/200?random=2',
                country: 'USA',
                founded: '2006',
                productCount: 1
              },
              { 
                brand_id: 'brand_003',
                name: 'Dior', 
                description: 'French luxury with rich heritage in perfumery',
                logo: 'https://picsum.photos/300/200?random=3',
                country: 'France',
                founded: '1946',
                productCount: 1
              },
              { 
                brand_id: 'brand_004',
                name: 'Creed', 
                description: 'Historic fragrance house creating bespoke scents',
                logo: 'https://picsum.photos/300/200?random=4',
                country: 'UK',
                founded: '1760',
                productCount: 1
              },
              { 
                brand_id: 'brand_005',
                name: 'Maison Margiela', 
                description: 'Avant-garde fashion house with innovative fragrances',
                logo: 'https://picsum.photos/300/200?random=5',
                country: 'France',
                founded: '1988',
                productCount: 1
              },
              { 
                brand_id: 'brand_006',
                name: 'Byredo', 
                description: 'Contemporary Swedish perfume house',
                logo: 'https://picsum.photos/300/200?random=6',
                country: 'Sweden',
                founded: '2006',
                productCount: 1
              }
            ].map((brand, index) => (
              <Link
                key={brand.brand_id}
                to={`/brands/${brand.brand_id}`}
                className="group bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] overflow-hidden hover:shadow-[var(--shadow-elevated)] transition-all duration-[var(--duration-normal)] transform hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="aspect-[3/2] overflow-hidden bg-[var(--color-bg-muted)]">
                  <img
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[var(--duration-slow)]"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] group-hover:text-[var(--color-interactive-primary)] transition-colors duration-[var(--duration-normal)]">
                      {brand.name}
                    </h3>
                    <span className="text-caption text-[var(--color-fg-muted)]">{brand.country}</span>
                  </div>
                  <p className="text-body text-[var(--color-fg-secondary)] mb-4 line-clamp-2">
                    {brand.description}
                  </p>
                  <div className="flex items-center justify-between text-caption text-[var(--color-fg-muted)]">
                    <span>Est. {brand.founded}</span>
                    <span>{brand.productCount} {brand.productCount === 1 ? 'product' : 'products'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <NocturneButton size="lg" variant="outline" asChild>
              <Link to="/products">
                Explore All Brands
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
              { family: 'Citrus', description: 'Fresh, energizing, bright', icon: '🍋', color: 'from-yellow-400 to-orange-400', products: 12 },
              { family: 'Floral', description: 'Romantic, elegant, feminine', icon: '🌸', color: 'from-pink-400 to-rose-400', products: 8 },
              { family: 'Amber', description: 'Warm, sensual, mysterious', icon: '🔥', color: 'from-amber-400 to-orange-600', products: 6 },
              { family: 'Woody', description: 'Sophisticated, grounding, rich', icon: '🌳', color: 'from-amber-600 to-brown-600', products: 10 },
              { family: 'Green', description: 'Natural, crisp, refreshing', icon: '🌿', color: 'from-green-400 to-emerald-500', products: 5 }
            ].map((note, index) => (
              <Link
                key={note.family}
                to={`/products?family=${note.family.toLowerCase()}`}
                className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] hover:shadow-[var(--shadow-elevated)] transition-all duration-[var(--duration-normal)] transform hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredNote(note.family)}
                onMouseLeave={() => setHoveredNote(null)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${note.color} opacity-10 group-hover:opacity-20 transition-opacity duration-[var(--duration-normal)]`} />
                <div className="relative p-8 text-center">
                  <div className={`text-4xl mb-4 transition-all duration-[var(--duration-normal)] ${
                    hoveredNote === note.family ? 'scale-125 rotate-12' : 'group-hover:scale-110'
                  }`}>
                    {note.icon}
                  </div>
                  <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-2">
                    {note.family}
                  </h3>
                  <p className="text-caption text-[var(--color-fg-secondary)] leading-relaxed mb-2">
                    {note.description}
                  </p>
                  <div className="text-xs text-[var(--color-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {note.products} fragrances
                  </div>
                  
                  {/* Interactive pulse effect */}
                  {hoveredNote === note.family && (
                    <div className="absolute inset-0 rounded-[var(--radius-lg)] border-2 border-[var(--color-interactive-primary)] animate-pulse" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* Customer Testimonials Section */}
      <section className="py-24 bg-[var(--color-bg-secondary)]">
        <div className="nocturne-container">
          <div className="text-center mb-16">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-6 tracking-[var(--text-h2-spacing)]">
              What Our Connoisseurs Say
            </h2>
            <p className="text-subtitle text-[var(--color-fg-secondary)] max-w-2xl mx-auto leading-relaxed">
              Join thousands of fragrance enthusiasts who have discovered their signature scent
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] shadow-[var(--shadow-subtle)]">
              <div className="p-12 text-center">
                <div className="mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <svg key={i} className="w-6 h-6 text-yellow-400 inline-block mx-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                
                <blockquote className="text-subtitle font-[var(--font-weight-light)] text-[var(--color-fg-primary)] mb-8 leading-relaxed italic">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>
                
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 bg-[var(--color-interactive-primary)] rounded-full flex items-center justify-center text-[var(--color-fg-inverse)] font-[var(--font-weight-semibold)]">
                    {testimonials[currentTestimonial].author.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)]">
                      {testimonials[currentTestimonial].author}
                    </p>
                    <p className="text-caption text-[var(--color-fg-secondary)]">
                      {testimonials[currentTestimonial].location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-[var(--color-interactive-primary)] scale-125' 
                      : 'bg-[var(--color-border-primary)] hover:bg-[var(--color-interactive-primary)]/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-24 bg-[var(--color-bg-primary)]">
        <div className="nocturne-container">
          <div className="text-center mb-16">
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-6 tracking-[var(--text-h2-spacing)]">
              Our Story
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-subtitle font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-8">
                Crafted in Darkness, Born in Light
              </h3>
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



      {/* Interactive Newsletter Section */}
      <section className="py-24 bg-[var(--nocturne-onyx)] text-[var(--nocturne-porcelain)] relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-[var(--nocturne-champagne)] rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-[var(--nocturne-porcelain)] rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-[var(--nocturne-champagne)] rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="nocturne-container relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center bg-[var(--nocturne-champagne)]/10 backdrop-blur-sm px-4 py-2 rounded-[var(--radius-full)] border border-[var(--nocturne-champagne)]/20 mb-6">
                <span className="text-[var(--nocturne-champagne)] text-caption font-[var(--font-weight-semibold)]">
                  🎁 10% OFF YOUR FIRST ORDER
                </span>
              </div>
            </div>
            
            <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--nocturne-porcelain)] mb-6 tracking-[var(--text-h2-spacing)]">
              Join the Atelier
            </h2>
            <p className="text-subtitle text-[var(--nocturne-champagne)] mb-12 leading-relaxed">
              Be the first to discover new creations, receive exclusive offers, and unlock the secrets of fragrance artistry.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-6">
              {newsletterError && (
                <div className="bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded-md shadow-sm" role="alert">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{newsletterError}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      setNewsletterError(null);
                    }}
                    placeholder="Your email address"
                    required
                    className={`w-full px-6 py-4 rounded-[var(--radius-full)] bg-[var(--nocturne-porcelain)] text-[var(--nocturne-onyx)] placeholder:text-[var(--nocturne-warm-taupe)] focus:outline-none focus:ring-2 ${newsletterError ? 'focus:ring-red-400 border border-red-400' : 'focus:ring-[var(--nocturne-champagne)]'} text-body transition-all duration-300 group-hover:shadow-lg`}
                  />
                  <div className="absolute inset-0 rounded-[var(--radius-full)] bg-gradient-to-r from-[var(--nocturne-champagne)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
                <NocturneButton
                  type="submit"
                  disabled={newsletterMutation.isPending || !newsletterConsent}
                  size="lg"
                  className="bg-[var(--nocturne-champagne)] text-[var(--nocturne-onyx)] hover:bg-[var(--nocturne-porcelain)] disabled:opacity-50 disabled:cursor-not-allowed px-8 transform hover:scale-105 transition-all duration-300"
                >
                  {newsletterMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-[var(--nocturne-onyx)]/30 border-t-[var(--nocturne-onyx)] rounded-full animate-spin mr-2"></div>
                      Joining...
                    </div>
                  ) : (
                    'Join Atelier'
                  )}
                </NocturneButton>
              </div>
              
              <div className="flex items-start space-x-3 text-left">
                <input
                  type="checkbox"
                  id="newsletter-consent"
                  checked={newsletterConsent}
                  onChange={(e) => setNewsletterConsent(e.target.checked)}
                  className="mt-1 rounded border-[var(--nocturne-champagne)] text-[var(--nocturne-champagne)] focus:ring-[var(--nocturne-champagne)] bg-transparent transition-all duration-300"
                  required
                />
                <label htmlFor="newsletter-consent" className="text-caption text-[var(--nocturne-champagne)] leading-relaxed">
                  I agree to receive artisanal updates from Nocturne Atelier. Unsubscribe anytime. 
                  By subscribing, I agree to the{' '}
                  <Link to="/privacy" className="text-[var(--nocturne-porcelain)] hover:text-[var(--nocturne-champagne)] underline transition-colors duration-300">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" className="text-[var(--nocturne-porcelain)] hover:text-[var(--nocturne-champagne)] underline transition-colors duration-300">
                    Terms of Service
                  </Link>.
                </label>
              </div>
            </form>
            
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-caption text-[var(--nocturne-champagne)]">
              <div className="flex flex-col items-center p-4 bg-[var(--nocturne-porcelain)]/5 rounded-[var(--radius-lg)] backdrop-blur-sm border border-[var(--nocturne-porcelain)]/10 hover:bg-[var(--nocturne-porcelain)]/10 transition-all duration-300 group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">🚀</div>
                <span className="text-[var(--nocturne-porcelain)] font-[var(--font-weight-semibold)]">First Access</span>
                <span className="text-xs mt-1">New releases</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-[var(--nocturne-porcelain)]/5 rounded-[var(--radius-lg)] backdrop-blur-sm border border-[var(--nocturne-porcelain)]/10 hover:bg-[var(--nocturne-porcelain)]/10 transition-all duration-300 group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">💎</div>
                <span className="text-[var(--nocturne-porcelain)] font-[var(--font-weight-semibold)]">Exclusive Pricing</span>
                <span className="text-xs mt-1">Member discounts</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-[var(--nocturne-porcelain)]/5 rounded-[var(--radius-lg)] backdrop-blur-sm border border-[var(--nocturne-porcelain)]/10 hover:bg-[var(--nocturne-porcelain)]/10 transition-all duration-300 group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">🧪</div>
                <span className="text-[var(--nocturne-porcelain)] font-[var(--font-weight-semibold)]">Fragrance Insights</span>
                <span className="text-xs mt-1">Mastery tips</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="mt-8 text-center">
              <p className="text-caption text-[var(--nocturne-champagne)]/70">
                Join 12,000+ fragrance enthusiasts worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)]">
        <div className="nocturne-container">
          <h2 className="text-h2 font-[var(--font-heading)] font-[var(--text-h2-weight)] text-[var(--color-fg-primary)] mb-12 text-center tracking-[var(--text-h2-spacing)]">
            Our Commitments
          </h2>
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