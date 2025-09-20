import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Type definitions based on backend schemas
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
  top_notes: string | null;
  middle_notes: string | null;
  base_notes: string | null;
  complete_notes_list: string | null;
  occasion_tags: string | null;
  season_suitability: string | null;
  longevity_hours: number | null;
  sillage_rating: number | null;
  intensity_level: string | null;
  ingredients_list: string | null;
  care_instructions: string | null;
  base_price: number;
  sale_price: number | null;
  availability_status: string;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_limited_edition: boolean;
  sku_prefix: string;
  weight_grams: number | null;
  launch_date: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductSize {
  size_id: string;
  product_id: string;
  size_ml: number;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  sku: string;
  is_sample_available: boolean;
  sample_price: number | null;
  is_active: boolean;
  created_at: string;
}

interface ProductImage {
  image_id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  image_type: string;
}

interface Review {
  review_id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  longevity_rating: number | null;
  sillage_rating: number | null;
  occasion_tags: string | null;
  season_tags: string | null;
  is_verified_purchase: boolean;
  helpful_votes: number;
  total_votes: number;
  is_featured: boolean;
  moderation_status: string;
  created_at: string;
  updated_at: string;
}

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

const UV_ProductDetail: React.FC = () => {
  const { product_id } = useParams<{ product_id: string }>();
  const queryClient = useQueryClient();
  
  // Component state
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGiftOptions, setShowGiftOptions] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [sampleIncluded, setSampleIncluded] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    review_text: '',
    longevity_rating: 5,
    sillage_rating: 5,
  });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Zustand selectors (individual to avoid infinite loops)
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const addToCart = useAppStore(state => state.add_to_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // API functions
  const fetchProduct = async (productId: string): Promise<Product> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}`);
    return response.data;
  };

  const fetchProductSizes = async (productId: string): Promise<ProductSize[]> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}/sizes`);
    return response.data;
  };

  const fetchProductImages = async (productId: string): Promise<ProductImage[]> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}/images`);
    return response.data || [];
  };

  const fetchProductReviews = async (productId: string): Promise<Review[]> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`, {
      params: { product_id: productId, moderation_status: 'approved', per_page: 20 }
    });
    return response.data?.data || [];
  };

  const fetchProductRecommendations = async (productId: string): Promise<Product[]> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}/recommendations`, {
      params: { type: 'similar', limit: 8 }
    });
    return response.data || [];
  };

  const fetchBrand = async (brandId: string): Promise<Brand> => {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/brands/${brandId}`);
    return response.data;
  };

  // Queries
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', product_id],
    queryFn: () => fetchProduct(product_id!),
    enabled: !!product_id,
    select: (data) => ({
      ...data,
      base_price: Number(data.base_price || 0),
      sale_price: data.sale_price ? Number(data.sale_price) : null,
      longevity_hours: data.longevity_hours ? Number(data.longevity_hours) : null,
      sillage_rating: data.sillage_rating ? Number(data.sillage_rating) : null,
    }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: brand } = useQuery({
    queryKey: ['brand', product?.brand_id],
    queryFn: () => fetchBrand(product!.brand_id),
    enabled: !!product?.brand_id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: sizes = [], isLoading: sizesLoading } = useQuery({
    queryKey: ['productSizes', product_id],
    queryFn: () => fetchProductSizes(product_id!),
    enabled: !!product_id,
    select: (data) => data.map(size => ({
      ...size,
      price: Number(size.price || 0),
      sale_price: size.sale_price ? Number(size.sale_price) : null,
      sample_price: size.sample_price ? Number(size.sample_price) : null,
    })),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['productImages', product_id],
    queryFn: () => fetchProductImages(product_id!),
    enabled: !!product_id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['productReviews', product_id],
    queryFn: () => fetchProductReviews(product_id!),
    enabled: !!product_id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['productRecommendations', product_id],
    queryFn: () => fetchProductRecommendations(product_id!),
    enabled: !!product_id,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!product || !selectedSize) throw new Error('Product or size not selected');
      
      await addToCart({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: brand?.brand_name || 'Unknown Brand',
        size_ml: selectedSize.size_ml,
        quantity,
        unit_price: selectedSize.sale_price || selectedSize.price,
        gift_wrap: giftWrap,
        sample_included: sampleIncluded,
      });
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Added to cart successfully!',
        auto_dismiss: true,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.message || 'Failed to add to cart',
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated || !product) throw new Error('Authentication required');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/wishlists/${currentUser?.user_id}/items`,
        {
          product_id: product.product_id,
          size_ml: selectedSize?.size_ml || null,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Added to wishlist!',
        auto_dismiss: true,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to add to wishlist',
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated || !product) throw new Error('Authentication required');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`,
        {
          product_id: product.product_id,
          rating: reviewForm.rating,
          title: reviewForm.title || null,
          review_text: reviewForm.review_text || null,
          longevity_rating: reviewForm.longevity_rating,
          sillage_rating: reviewForm.sillage_rating,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Review submitted successfully!',
        auto_dismiss: true,
        duration: 3000,
      });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', review_text: '', longevity_rating: 5, sillage_rating: 5 });
      queryClient.invalidateQueries({ queryKey: ['productReviews', product_id] });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit review',
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  // Set default selected size when sizes load
  React.useEffect(() => {
    if (sizes.length > 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes, selectedSize]);

  // Computed values
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  }, [reviews]);

  const currentPrice = selectedSize ? (selectedSize.sale_price || selectedSize.price) : 0;
  const originalPrice = selectedSize?.sale_price ? selectedSize.price : null;
  const isOnSale = !!originalPrice && originalPrice > currentPrice;

  // Helper functions
  const handleAddToCart = () => {
    if (!selectedSize) {
      showNotification({
        type: 'error',
        message: 'Please select a size',
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }
    addToCartMutation.mutate();
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      showNotification({
        type: 'info',
        message: 'Please sign in to add to wishlist',
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }
    addToWishlistMutation.mutate();
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showNotification({
        type: 'info',
        message: 'Please sign in to submit a review',
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }
    submitReviewMutation.mutate();
  };

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (!product_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Link to="/products" className="text-purple-600 hover:text-purple-500">
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
          <Link to="/products" className="text-purple-600 hover:text-purple-500">
            Browse All Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-purple-600">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-purple-600">Products</Link>
            <span>/</span>
            <span className="text-gray-900">{product.product_name}</span>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Image Gallery */}
            <div className="flex flex-col-reverse">
              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                  <div className="grid grid-cols-4 gap-6">
                    {images.map((image, index) => (
                      <button
                        key={image.image_id}
                        className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-purple-500 ${
                          index === selectedImageIndex ? 'ring-2 ring-purple-500' : ''
                        }`}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <span className="sr-only">{image.alt_text}</span>
                        <span className="absolute inset-0 rounded-md overflow-hidden">
                          <img
                            src={image.image_url}
                            alt={image.alt_text || ''}
                            className="w-full h-full object-center object-cover"
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Image */}
              <div className="w-full aspect-w-1 aspect-h-1">
                <img
                  src={images[selectedImageIndex]?.image_url || '/api/placeholder/600/600'}
                  alt={images[selectedImageIndex]?.alt_text || product.product_name}
                  className="w-full h-full object-center object-cover sm:rounded-lg"
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              {/* Brand & Title */}
              <div className="mb-6">
                {brand && (
                  <h1 className="text-lg font-medium text-gray-600 mb-2">{brand.brand_name}</h1>
                )}
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {product.product_name}
                </h2>
                {product.short_description && (
                  <p className="mt-4 text-lg text-gray-600">{product.short_description}</p>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center mb-6">
                {renderStars(Math.round(averageRating), 'w-5 h-5')}
                <span className="ml-2 text-sm text-gray-600">
                  {averageRating.toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <p className="text-3xl font-bold text-gray-900">
                    ${currentPrice.toFixed(2)}
                  </p>
                  {isOnSale && originalPrice && (
                    <p className="text-xl text-gray-500 line-through">
                      ${originalPrice.toFixed(2)}
                    </p>
                  )}
                  {isOnSale && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Sale
                    </span>
                  )}
                </div>
                {selectedSize && (
                  <p className="mt-1 text-sm text-gray-600">
                    ${(currentPrice / selectedSize.size_ml).toFixed(2)} per ml
                  </p>
                )}
              </div>

              {/* Size Selection */}
              {!sizesLoading && sizes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Size</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {sizes.map((size) => (
                      <button
                        key={size.size_id}
                        onClick={() => setSelectedSize(size)}
                        className={`relative border rounded-lg px-4 py-3 flex flex-col items-center text-sm font-medium uppercase hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          selectedSize?.size_id === size.size_id
                            ? 'border-purple-500 ring-2 ring-purple-500'
                            : 'border-gray-300'
                        }`}
                      >
                        <span className="text-lg font-bold">{size.size_ml}ml</span>
                        <span className="text-gray-600">
                          ${(size.sale_price || size.price).toFixed(2)}
                        </span>
                        {size.stock_quantity <= size.low_stock_threshold && (
                          <span className="text-xs text-red-600 mt-1">Low Stock</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-900 mb-2">
                  Quantity
                </label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="block w-20 border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gift Options */}
              <div className="mb-6">
                <button
                  onClick={() => setShowGiftOptions(!showGiftOptions)}
                  className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Gift Options
                </button>
                {showGiftOptions && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center">
                      <input
                        id="gift-wrap"
                        type="checkbox"
                        checked={giftWrap}
                        onChange={(e) => setGiftWrap(e.target.checked)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="gift-wrap" className="ml-2 text-sm text-gray-700">
                        Gift wrap (+$5.00)
                      </label>
                    </div>
                    {selectedSize?.is_sample_available && (
                      <div className="flex items-center">
                        <input
                          id="sample-included"
                          type="checkbox"
                          checked={sampleIncluded}
                          onChange={(e) => setSampleIncluded(e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="sample-included" className="ml-2 text-sm text-gray-700">
                          Include sample (+${selectedSize.sample_price?.toFixed(2) || '0.00'})
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add to Cart & Wishlist */}
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || !selectedSize}
                  className="flex-1 bg-purple-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addToCartMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Add to Cart
                </button>
                <button
                  onClick={handleAddToWishlist}
                  disabled={addToWishlistMutation.isPending}
                  className="flex-shrink-0 bg-white border border-gray-300 rounded-md py-3 px-4 flex items-center justify-center text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Availability & Delivery */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    product.availability_status === 'in_stock' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">
                    {product.availability_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Free shipping on orders over $75. Ships within 1-2 business days.
                </p>
              </div>
            </div>
          </div>

          {/* Fragrance Profile */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Fragrance Profile</h3>
            
            {/* Notes Pyramid */}
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {product.top_notes && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TOP</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Top Notes</h4>
                  <p className="text-sm text-gray-600">{product.top_notes}</p>
                  <p className="text-xs text-gray-500 mt-1">0-15 minutes</p>
                </div>
              )}
              
              {product.middle_notes && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-b from-pink-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">MID</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Middle Notes</h4>
                  <p className="text-sm text-gray-600">{product.middle_notes}</p>
                  <p className="text-xs text-gray-500 mt-1">15 minutes - 3 hours</p>
                </div>
              )}
              
              {product.base_notes && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-b from-purple-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">BASE</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Base Notes</h4>
                  <p className="text-sm text-gray-600">{product.base_notes}</p>
                  <p className="text-xs text-gray-500 mt-1">3+ hours</p>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid md:grid-cols-3 gap-8">
              {product.longevity_hours && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Longevity</h4>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(product.longevity_hours / 24) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{product.longevity_hours}h</span>
                  </div>
                </div>
              )}
              
              {product.sillage_rating && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Sillage</h4>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${(product.sillage_rating / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{product.sillage_rating}/10</span>
                  </div>
                </div>
              )}
              
              {product.intensity_level && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Intensity</h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {product.intensity_level}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-16">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'description', label: 'Description' },
                  { id: 'ingredients', label: 'Ingredients' },
                  { id: 'care', label: 'Care & Storage' },
                  { id: 'shipping', label: 'Shipping & Returns' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="py-8">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  {product.description ? (
                    <p className="text-gray-600 leading-relaxed">{product.description}</p>
                  ) : (
                    <p className="text-gray-600">No description available.</p>
                  )}
                  
                  {product.fragrance_families && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Fragrance Family</h4>
                      <div className="flex flex-wrap gap-2">
                        {product.fragrance_families.split(',').map((family, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                          >
                            {family.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(product.occasion_tags || product.season_suitability) && (
                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                      {product.occasion_tags && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Perfect For</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.occasion_tags.split(',').map((occasion, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {occasion.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {product.season_suitability && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Best Seasons</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.season_suitability.split(',').map((season, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {season.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div>
                  {product.ingredients_list ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Complete Ingredients List</h4>
                      <p className="text-gray-600 leading-relaxed">{product.ingredients_list}</p>
                    </div>
                  ) : (
                    <p className="text-gray-600">Ingredients information not available.</p>
                  )}
                  
                  {product.complete_notes_list && (
                    <div className="mt-8">
                      <h4 className="font-semibold text-gray-900 mb-4">Complete Notes</h4>
                      <p className="text-gray-600 leading-relaxed">{product.complete_notes_list}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'care' && (
                <div>
                  {product.care_instructions ? (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">Care Instructions</h4>
                      <p className="text-gray-600 leading-relaxed">{product.care_instructions}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">General Care Guidelines</h4>
                      <ul className="text-gray-600 space-y-2">
                        <li>• Store in a cool, dry place away from direct sunlight</li>
                        <li>• Keep bottle upright and tightly closed when not in use</li>
                        <li>• Avoid extreme temperature changes</li>
                        <li>• Apply to pulse points for best projection</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Shipping Information</h4>
                  <ul className="text-gray-600 space-y-2 mb-6">
                    <li>• Free shipping on orders over $75</li>
                    <li>• Standard shipping: 3-5 business days</li>
                    <li>• Express shipping: 1-2 business days (additional cost)</li>
                    <li>• Same-day delivery available in select cities</li>
                  </ul>
                  
                  <h4 className="font-semibold text-gray-900 mb-4">Returns Policy</h4>
                  <ul className="text-gray-600 space-y-2">
                    <li>• 30-day return policy for unopened items</li>
                    <li>• 100% authenticity guarantee</li>
                    <li>• Free returns with prepaid label</li>
                    <li>• Refund processed within 5-7 business days</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Customer Reviews */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Customer Reviews</h3>
              {isAuthenticated && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Write a Review
                </button>
              )}
            </div>

            {/* Review Summary */}
            {reviews.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-4xl font-bold text-gray-900 mr-4">
                      {averageRating.toFixed(1)}
                    </div>
                    <div>
                      {renderStars(Math.round(averageRating), 'w-6 h-6')}
                      <p className="text-sm text-gray-600 mt-1">
                        Based on {reviews.length} reviews
                      </p>
                    </div>
                  </div>
                  
                  {/* Rating Distribution */}
                  <div className="hidden md:block">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      
                      return (
                        <div key={rating} className="flex items-center text-sm">
                          <span className="w-8">{rating}★</span>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mx-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="w-8 text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && isAuthenticated && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Write Your Review</h4>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Rating
                    </label>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                          className={`w-8 h-8 ${
                            star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longevity (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={reviewForm.longevity_rating}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, longevity_rating: Number(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{reviewForm.longevity_rating}/10</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sillage (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={reviewForm.sillage_rating}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, sillage_rating: Number(e.target.value) }))}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-600">{reviewForm.sillage_rating}/10</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
                      Review Title (Optional)
                    </label>
                    <input
                      type="text"
                      id="review-title"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Summarize your experience"
                    />
                  </div>

                  <div>
                    <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Review (Optional)
                    </label>
                    <textarea
                      id="review-text"
                      rows={4}
                      value={reviewForm.review_text}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, review_text: e.target.value }))}
                      className="w-full border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Share your thoughts about this fragrance"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={submitReviewMutation.isPending}
                      className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.review_id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center mb-2">
                          {renderStars(review.rating)}
                          {review.is_verified_purchase && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        {review.title && (
                          <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                        )}
                        {review.review_text && (
                          <p className="text-gray-600 mb-3">{review.review_text}</p>
                        )}
                        
                        {(review.longevity_rating || review.sillage_rating) && (
                          <div className="flex space-x-6 text-sm text-gray-600 mb-3">
                            {review.longevity_rating && (
                              <span>Longevity: {review.longevity_rating}/10</span>
                            )}
                            {review.sillage_rating && (
                              <span>Sillage: {review.sillage_rating}/10</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(review.created_at).toLocaleDateString()}</p>
                        {review.helpful_votes > 0 && (
                          <p className="mt-1">{review.helpful_votes} found helpful</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">You Might Also Like</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {recommendations.slice(0, 4).map((rec) => (
                  <Link
                    key={rec.product_id}
                    to={`/products/${rec.product_id}`}
                    className="group"
                  >
                    <div className="w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden group-hover:opacity-75 transition-opacity">
                      <img
                        src="/api/placeholder/300/300"
                        alt={rec.product_name}
                        className="w-full h-full object-center object-cover"
                      />
                    </div>
                    <h3 className="mt-4 text-sm text-gray-700 group-hover:text-purple-600">
                      {rec.product_name}
                    </h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      ${(rec.sale_price || rec.base_price).toFixed(2)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProductDetail;