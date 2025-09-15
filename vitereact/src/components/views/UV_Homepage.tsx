import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

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

interface Review {
  review_id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  created_at: string;
}

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
  const addToCart = useAppStore(state => state.add_to_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // Newsletter form state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);

  // Hero carousel state
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  // API Base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Hero carousel data
  const heroSlides = [
    {
      id: 1,
      title: "Discover Your Signature Scent",
      subtitle: "New Luxury Collection",
      description: "Indulge in our curated selection of premium fragrances from renowned houses worldwide",
      cta: "Explore Collection",
      link: "/products?is_featured=true",
      backgroundImage: "bg-gradient-to-r from-purple-900 via-purple-700 to-pink-600"
    },
    {
      id: 2,
      title: "Winter Elegance",
      subtitle: "Seasonal Favorites",
      description: "Warm, sophisticated scents perfect for the season's most memorable moments",
      cta: "Shop Winter Collection",
      link: "/products?season_suitability=winter",
      backgroundImage: "bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-600"
    },
    {
      id: 3,
      title: "Find Your Perfect Match",
      subtitle: "Personalized Fragrance Quiz",
      description: "Answer a few questions and discover fragrances tailored to your unique preferences",
      cta: "Take the Quiz",
      link: "/fragrance-finder",
      backgroundImage: "bg-gradient-to-r from-rose-900 via-rose-700 to-pink-600"
    }
  ];

  // API Queries
  const { } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/products/featured?limit=12`);
      return response.data as Product[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: newArrivals = [], isLoading: newArrivalsLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/products/new-arrivals?limit=12`);
      return response.data as Product[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: bestSellers = [], isLoading: bestSellersLoading } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/products/best-sellers?limit=8`);
      return response.data as Product[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: testimonials = [], isLoading: testimonialsLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/reviews?is_featured=true&moderation_status=approved&limit=6`);
      return response.data.data as Review[];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

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

  // Handlers
  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: 'Luxury Brand', // Would come from joined data in real implementation
        size_ml: 50, // Default size
        quantity: 1,
        unit_price: product.sale_price || product.base_price,
        gift_wrap: false,
        sample_included: false
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

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

  const nextHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevHeroSlide = () => {
    setCurrentHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0 ${heroSlides[currentHeroSlide].backgroundImage}`} />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
            {heroSlides[currentHeroSlide].title}
          </h1>
          <p className="text-xl md:text-2xl mb-2 font-light">
            {heroSlides[currentHeroSlide].subtitle}
          </p>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            {heroSlides[currentHeroSlide].description}
          </p>
          <Link
            to={heroSlides[currentHeroSlide].link}
            className="inline-block bg-white text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg"
          >
            {heroSlides[currentHeroSlide].cta}
          </Link>
          
          {isAuthenticated && currentUser && (
            <div className="mt-6">
              <p className="text-lg opacity-80">Welcome back, {currentUser.first_name}!</p>
            </div>
          )}
        </div>

        {/* Hero Navigation */}
        <button
          onClick={prevHeroSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20"
          aria-label="Previous slide"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          onClick={nextHeroSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20"
          aria-label="Next slide"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Hero Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentHeroSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentHeroSlide ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">New Arrivals</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the latest additions to our luxury fragrance collection
            </p>
          </div>

          {newArrivalsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md animate-pulse">
                  <div className="aspect-square bg-gray-300 rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-300 rounded" />
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-6 bg-gray-300 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.slice(0, 8).map((product) => (
                <div key={product.product_id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow group">
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <div className="text-4xl">🌸</div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      NEW
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                      {product.product_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{product.concentration}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.sale_price ? (
                          <>
                            <span className="text-lg font-bold text-red-600">
                              {formatPrice(product.sale_price)}
                            </span>
                            <span className="text-sm text-gray-500 line-through">
                              {formatPrice(product.base_price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(product.base_price)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                    <Link
                      to={`/products/${product.product_id}`}
                      className="block mt-3 text-center text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/products?is_new_arrival=true"
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              View All New Arrivals
            </Link>
          </div>
        </div>
      </section>

      {/* Best Sellers Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Best Sellers</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our most loved fragrances, chosen by our community
            </p>
          </div>

          {bestSellersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg shadow-md animate-pulse">
                  <div className="aspect-square bg-gray-300 rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-300 rounded" />
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-6 bg-gray-300 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product, index) => (
                <div key={product.product_id} className="bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow group">
                  <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    <div className="text-4xl">🏆</div>
                    <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                      {product.product_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{product.concentration}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {product.sale_price ? (
                          <>
                            <span className="text-lg font-bold text-red-600">
                              {formatPrice(product.sale_price)}
                            </span>
                            <span className="text-sm text-gray-500 line-through">
                              {formatPrice(product.base_price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(product.base_price)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-amber-600 transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                    <Link
                      to={`/products/${product.product_id}`}
                      className="block mt-3 text-center text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/products?sort_by=best_selling"
              className="inline-block bg-amber-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
            >
              View All Best Sellers
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Collections Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Collections</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Curated selections for every occasion and preference
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">🌹</div>
              <h3 className="text-2xl font-bold mb-3">Romantic Collection</h3>
              <p className="text-purple-100 mb-6">
                Enchanting floral and oriental fragrances for your most memorable moments
              </p>
              <Link
                to="/products?fragrance_families=floral,oriental"
                className="inline-block bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Explore Romantic
              </Link>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">🌿</div>
              <h3 className="text-2xl font-bold mb-3">Fresh & Clean</h3>
              <p className="text-blue-100 mb-6">
                Crisp, energizing scents perfect for everyday wear and active lifestyles
              </p>
              <Link
                to="/products?fragrance_families=fresh,citrus"
                className="inline-block bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Explore Fresh
              </Link>
            </div>

            <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">🔥</div>
              <h3 className="text-2xl font-bold mb-3">Bold & Mysterious</h3>
              <p className="text-amber-100 mb-6">
                Rich, complex fragrances that make a statement and leave an impression
              </p>
              <Link
                to="/products?fragrance_families=woody,spicy"
                className="inline-block bg-white text-amber-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Explore Bold
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                The Art of Fragrance
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                At LuxeScent, we believe that fragrance is more than just a scent—it's a personal signature, 
                a memory maker, and an invisible accessory that completes your style. Our journey began with 
                a simple mission: to make luxury fragrances accessible to everyone who appreciates the finer things in life.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Every fragrance in our collection is carefully selected for its exceptional quality, unique character, 
                and the story it tells. From the prestigious houses of France to innovative niche creators around the world, 
                we curate only the finest offerings for our discerning customers.
              </p>
              <Link
                to="/about"
                className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Learn Our Story
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">🧪</div>
                <h3 className="font-semibold text-gray-900 mb-2">Master Crafted</h3>
                <p className="text-sm text-gray-600">Expert perfumers with decades of experience</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">🌍</div>
                <h3 className="font-semibold text-gray-900 mb-2">Global Selection</h3>
                <p className="text-sm text-gray-600">Fragrances from renowned houses worldwide</p>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="font-semibold text-gray-900 mb-2">Premium Quality</h3>
                <p className="text-sm text-gray-600">Only authentic, high-quality ingredients</p>
              </div>
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">💎</div>
                <h3 className="font-semibold text-gray-900 mb-2">Luxury Experience</h3>
                <p className="text-sm text-gray-600">White-glove service from order to delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real reviews from verified purchases
            </p>
          </div>

          {testimonialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                  <div className="flex space-x-1 mb-4">
                    {Array.from({ length: 5 }, (_, j) => (
                      <div key={j} className="w-4 h-4 bg-gray-300 rounded" />
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded" />
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-4 bg-gray-300 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((review) => (
                <div key={review.review_id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex space-x-1 mr-2">
                      {renderStars(review.rating)}
                    </div>
                    {review.is_verified_purchase && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                  )}
                  <p className="text-gray-600 mb-4">{review.review_text}</p>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-semibold text-sm">
                        {review.user_id.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Verified Customer</p>
                      <p className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>No testimonials available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Fragrance Discovery Tools Section */}
      <section className="py-16 bg-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-6">🔍</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Find Your Perfect Fragrance
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Not sure which scent is right for you? Take our personalized fragrance quiz and 
              discover your signature scent based on your preferences, lifestyle, and personality.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-semibold mb-1">Quick Quiz</h3>
                <p className="text-purple-100 text-sm">Answer a few simple questions</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold mb-1">Personalized Results</h3>
                <p className="text-purple-100 text-sm">Get tailored recommendations</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">💝</div>
                <h3 className="font-semibold mb-1">Sample First</h3>
                <p className="text-purple-100 text-sm">Try before you buy</p>
              </div>
            </div>
            <Link
              to="/fragrance-finder"
              className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Start Your Fragrance Journey
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay in the Know</h2>
            <p className="text-xl text-gray-300 mb-8">
              Get exclusive access to new arrivals, special offers, and fragrance tips. 
              Plus, enjoy 10% off your first order when you subscribe!
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={newsletterMutation.isPending || !newsletterConsent}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newsletterMutation.isPending ? 'Subscribing...' : 'Get 10% Off'}
                </button>
              </div>
              
              <div className="flex items-start space-x-3 text-left">
                <input
                  type="checkbox"
                  id="newsletter-consent"
                  checked={newsletterConsent}
                  onChange={(e) => setNewsletterConsent(e.target.checked)}
                  className="mt-1 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  required
                />
                <label htmlFor="newsletter-consent" className="text-sm text-gray-300 leading-5">
                  I agree to receive marketing emails from LuxeScent. I can unsubscribe at any time. 
                  By subscribing, I agree to the{' '}
                  <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" className="text-purple-400 hover:text-purple-300 underline">
                    Terms of Service
                  </Link>.
                </label>
              </div>
            </form>
            
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Exclusive early access
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Members-only discounts
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Fragrance tips & guides
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-2">🛡️</div>
              <h3 className="font-semibold text-gray-900 mb-1">100% Authentic</h3>
              <p className="text-sm text-gray-600">Guaranteed genuine products from authorized distributors</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-2">🚚</div>
              <h3 className="font-semibold text-gray-900 mb-1">Free Shipping</h3>
              <p className="text-sm text-gray-600">Complimentary shipping on orders over $75</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold text-gray-900 mb-1">Easy Returns</h3>
              <p className="text-sm text-gray-600">30-day return policy with full satisfaction guarantee</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold text-gray-900 mb-1">Expert Support</h3>
              <p className="text-sm text-gray-600">Fragrance consultants available 7 days a week</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default UV_Homepage;