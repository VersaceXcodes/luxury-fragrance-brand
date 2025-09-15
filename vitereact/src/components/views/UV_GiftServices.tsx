import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on backend schemas and OpenAPI specs
interface Product {
  product_id: string;
  brand_id: string;
  category_id: string;
  product_name: string;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  availability_status: string;
  is_featured: boolean;
  is_new_arrival: boolean;
  concentration: string;
  gender_category: string;
  created_at: string;
  updated_at: string;
}

interface GiftGuide {
  guide_id: string;
  title: string;
  description: string;
  products: Product[];
}

interface GiftSet {
  gift_set_id: string;
  set_name: string;
  description: string;
  price: number;
  savings_amount: number;
  products: Product[];
}

interface GiftCardForm {
  initial_amount: number;
  recipient_email: string;
  recipient_name: string;
  gift_message: string;
  delivery_date: string;
}

interface CreateGiftCardRequest {
  initial_amount: number;
  purchaser_email: string;
  recipient_email?: string;
  recipient_name?: string;
  gift_message?: string;
  delivery_date?: string;
}

const UV_GiftServices: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract URL params
  const urlRecipient = searchParams.get('recipient');
  const urlOccasion = searchParams.get('occasion');
  const urlPriceRange = searchParams.get('price_range');

  // Local state for filters and forms
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(urlRecipient);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(urlOccasion);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(urlPriceRange);
  const [giftCardForm, setGiftCardForm] = useState<GiftCardForm>({
    initial_amount: 0,
    recipient_email: '',
    recipient_name: '',
    gift_message: '',
    delivery_date: ''
  });

  // Zustand store access - individual selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const addToCart = useAppStore(state => state.add_to_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // React Query for gift guides
  const {
    data: giftGuides = [],
    isLoading: guidesLoading,
    error: guidesError
  } = useQuery({
    queryKey: ['gift-guides', selectedRecipient, selectedOccasion, selectedPriceRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRecipient) params.append('recipient', selectedRecipient);
      if (selectedOccasion) params.append('occasion', selectedOccasion);
      if (selectedPriceRange) params.append('price_range', selectedPriceRange);

      const response = await axios.get(`${getApiUrl()}/api/gifts/guides?${params.toString()}`);
      return response.data as GiftGuide[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // React Query for gift sets
  const {
    data: giftSets = [],
    isLoading: setsLoading,
    error: setsError
  } = useQuery({
    queryKey: ['gift-sets', selectedOccasion, selectedPriceRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedOccasion) params.append('occasion', selectedOccasion);
      
      // Convert price range to min/max values
      if (selectedPriceRange) {
        switch (selectedPriceRange) {
          case 'under_50':
            params.append('price_max', '50');
            break;
          case '50_100':
            params.append('price_min', '50');
            params.append('price_max', '100');
            break;
          case '100_200':
            params.append('price_min', '100');
            params.append('price_max', '200');
            break;
          case 'luxury':
            params.append('price_min', '200');
            break;
        }
      }

      const response = await axios.get(`${getApiUrl()}/api/gifts/sets?${params.toString()}`);
      return response.data as GiftSet[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Gift card creation mutation
  const giftCardMutation = useMutation({
    mutationFn: async (data: CreateGiftCardRequest) => {
      const response = await axios.post(`${getApiUrl()}/api/gift-cards`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Gift card created successfully!',
        auto_dismiss: true,
        duration: 5000
      });
      setGiftCardForm({
        initial_amount: 0,
        recipient_email: '',
        recipient_name: '',
        gift_message: '',
        delivery_date: ''
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create gift card';
      showNotification({
        type: 'error',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRecipient) params.set('recipient', selectedRecipient);
    if (selectedOccasion) params.set('occasion', selectedOccasion);
    if (selectedPriceRange) params.set('price_range', selectedPriceRange);
    
    setSearchParams(params, { replace: true });
  }, [selectedRecipient, selectedOccasion, selectedPriceRange, setSearchParams]);

  // Handle filter changes
  const updateFilters = (type: 'recipient' | 'occasion' | 'price_range', value: string | null) => {
    switch (type) {
      case 'recipient':
        setSelectedRecipient(value);
        break;
      case 'occasion':
        setSelectedOccasion(value);
        break;
      case 'price_range':
        setSelectedPriceRange(value);
        break;
    }
  };

  // Handle gift card form submission
  const handleGiftCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.email) {
      showNotification({
        type: 'error',
        message: 'Please sign in to purchase gift cards',
        auto_dismiss: true,
        duration: 5000
      });
      return;
    }

    if (giftCardForm.initial_amount <= 0) {
      showNotification({
        type: 'error',
        message: 'Please enter a valid amount',
        auto_dismiss: true,
        duration: 5000
      });
      return;
    }

    const requestData: CreateGiftCardRequest = {
      initial_amount: giftCardForm.initial_amount,
      purchaser_email: currentUser.email,
      recipient_email: giftCardForm.recipient_email || undefined,
      recipient_name: giftCardForm.recipient_name || undefined,
      gift_message: giftCardForm.gift_message || undefined,
      delivery_date: giftCardForm.delivery_date || undefined
    };

    giftCardMutation.mutate(requestData);
  };

  // Handle add to cart
  const handleAddToCart = async (product: Product, ) => {
    try {
      await addToCart({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: 'Unknown Brand', // Would need brand lookup
        size_ml: 50, // Default size
        quantity: 1,
        unit_price: product.sale_price || product.base_price,
        gift_wrap: true, // Default gift wrap for gift items
        sample_included: false
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const isLoading = guidesLoading || setsLoading;
  const hasError = guidesError || setsError;

  return (
    <>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Art of Luxury Gifting
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
              Discover the perfect fragrance gift with our expert curation and personalized service. 
              Every gift tells a story, wrapped in elegance and delivered with care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-900 px-8 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors">
                Expert Consultation
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-900 transition-colors">
                Gift Cards
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recipient Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gift For
              </label>
              <select
                value={selectedRecipient || ''}
                onChange={(e) => updateFilters('recipient', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Recipients</option>
                <option value="her">For Her</option>
                <option value="him">For Him</option>
                <option value="anyone">For Anyone</option>
              </select>
            </div>

            {/* Occasion Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occasion
              </label>
              <select
                value={selectedOccasion || ''}
                onChange={(e) => updateFilters('occasion', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Occasions</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="holiday">Holiday</option>
                <option value="wedding">Wedding</option>
                <option value="graduation">Graduation</option>
                <option value="christmas">Christmas</option>
                <option value="valentines">Valentine's Day</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <select
                value={selectedPriceRange || ''}
                onChange={(e) => updateFilters('price_range', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Prices</option>
                <option value="under_50">Thoughtful Under $50</option>
                <option value="50_100">Mid-range $50-$100</option>
                <option value="100_200">Premium $100-$200</option>
                <option value="luxury">Luxury $200+</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading gift recommendations...</p>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">Failed to load gift recommendations. Please try again.</p>
          </div>
        )}

        {/* Gift Guides Section */}
        {!isLoading && !hasError && giftGuides.length > 0 && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Curated Gift Guides</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our fragrance experts have carefully selected these collections to match every personality and occasion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {giftGuides.map((guide) => (
                <div key={guide.guide_id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{guide.title}</h3>
                    <p className="text-gray-600 mb-6">{guide.description}</p>
                    
                    <div className="space-y-3 mb-6">
                      {guide.products.slice(0, 3).map((product) => (
                        <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{product.product_name}</p>
                            <p className="text-sm text-gray-600">{product.concentration}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              ${product.sale_price || product.base_price}
                            </p>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {guide.products.length > 3 && (
                      <p className="text-sm text-gray-500 mb-4">
                        +{guide.products.length - 3} more items in this guide
                      </p>
                    )}

                    <Link
                      to={`/products?guide=${guide.guide_id}`}
                      className="block w-full bg-purple-600 text-white text-center py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      View Complete Guide
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gift Sets Section */}
        {!isLoading && !hasError && giftSets.length > 0 && (
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Exclusive Gift Sets</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Pre-curated collections that make gifting effortless, beautifully packaged with exclusive savings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {giftSets.map((set) => (
                <div key={set.gift_set_id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-2">{set.set_name}</h3>
                        <p className="text-gray-600">{set.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Save ${set.savings_amount}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {set.products.map((product) => (
                        <div key={product.product_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{product.product_name}</p>
                            <p className="text-sm text-gray-600">{product.concentration}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            ${product.sale_price || product.base_price}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">${set.price}</p>
                        <p className="text-sm text-gray-600">
                          Value: ${set.products.reduce((sum, p) => sum + (p.sale_price || p.base_price), 0)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Add all products in set to cart
                          set.products.forEach(product => handleAddToCart(product));
                        }}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Add Set to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gift Card Section */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Digital Gift Cards</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The perfect gift when you want them to choose their own perfect fragrance. 
              Delivered instantly or scheduled for the perfect moment.
            </p>
          </div>

          <form onSubmit={handleGiftCardSubmit} className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gift Card Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-600">$</span>
                  <input
                    type="number"
                    min="25"
                    max="1000"
                    step="5"
                    value={giftCardForm.initial_amount || ''}
                    onChange={(e) => setGiftCardForm(prev => ({
                      ...prev,
                      initial_amount: Number(e.target.value)
                    }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="100"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 100, 200, 500].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setGiftCardForm(prev => ({ ...prev, initial_amount: amount }))}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={giftCardForm.recipient_email}
                  onChange={(e) => setGiftCardForm(prev => ({
                    ...prev,
                    recipient_email: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="recipient@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to email to yourself</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={giftCardForm.recipient_name}
                  onChange={(e) => setGiftCardForm(prev => ({
                    ...prev,
                    recipient_name: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Recipient's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={giftCardForm.delivery_date}
                  onChange={(e) => setGiftCardForm(prev => ({
                    ...prev,
                    delivery_date: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for immediate delivery</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message
              </label>
              <textarea
                value={giftCardForm.gift_message}
                onChange={(e) => setGiftCardForm(prev => ({
                  ...prev,
                  gift_message: e.target.value
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add a personal message to your gift..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {giftCardForm.gift_message.length}/500 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={giftCardMutation.isPending || !currentUser}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {giftCardMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Gift Card...
                </span>
              ) : !currentUser ? (
                'Sign In to Purchase Gift Card'
              ) : (
                `Purchase Gift Card ($${giftCardForm.initial_amount || 0})`
              )}
            </button>

            {!currentUser && (
              <p className="text-center text-sm text-gray-600 mt-3">
                <Link to="/login" className="text-purple-600 hover:text-purple-800 font-medium">
                  Sign in
                </Link>
                {' '}to purchase gift cards
              </p>
            )}
          </form>
        </section>

        {/* Expert Services Section */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Expert Gift Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2V10a2 2 0 012-2h2V6a2 2 0 012-2h6a2 2 0 012 2v2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Consultation</h3>
              <p className="text-gray-600 mb-4">
                One-on-one guidance from our fragrance experts to find the perfect gift based on personality and preferences.
              </p>
              <button className="text-purple-600 hover:text-purple-800 font-medium">
                Book Consultation
              </button>
            </div>

            <div className="p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Custom Gift Sets</h3>
              <p className="text-gray-600 mb-4">
                Create bespoke gift collections tailored to the recipient's taste with our expert curation service.
              </p>
              <button className="text-purple-600 hover:text-purple-800 font-medium">
                Create Custom Set
              </button>
            </div>

            <div className="p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">White Glove Delivery</h3>
              <p className="text-gray-600 mb-4">
                Premium delivery service with hand-written notes, luxury packaging, and precise timing coordination.
              </p>
              <button className="text-purple-600 hover:text-purple-800 font-medium">
                Learn More
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default UV_GiftServices;