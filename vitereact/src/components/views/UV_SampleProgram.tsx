import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas and API responses
interface SampleProduct {
  product_id: string;
  product_name: string;
  brand_name: string;
  fragrance_families: string[];
  concentration: string;
  sample_sizes: Array<{ size_ml: number; price: number }>;
  is_available: boolean;
  product_image_url: string;
  notes_preview: string;
}


interface SampleCartItem {
  type: 'individual' | 'set';
  product_id: string | null;
  set_id: string | null;
  sample_size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  brand_name?: string;
}

interface SampleCart {
  items: SampleCartItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
}


interface CustomSampleSet {
  selected_samples: Array<{
    product_id: string;
    product_name: string;
    brand_name: string;
    sample_size_ml: number;
    price: number;
    image_url: string;
  }>;
  set_size_limit: number;
  total_price: number;
  discount_percentage: number;
  set_name: string;
}


const UV_SampleProgram: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // URL parameters
  const setType = searchParams.get('set_type');
  const fragranceFamily = searchParams.get('fragrance_family');
  
  // Global state (individual selectors to avoid infinite loops)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const fragranceProfile = useAppStore(state => state.user_preferences.fragrance_profile);
  const quizResults = useAppStore(state => state.user_preferences.quiz_results);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state
  const [sampleCart, setSampleCart] = useState<SampleCart>({
    items: [],
    subtotal: 0,
    shipping_cost: 0,
    total: 0
  });
  
  const [customSampleSet, setCustomSampleSet] = useState<CustomSampleSet>({
    selected_samples: [],
    set_size_limit: 12,
    total_price: 0,
    discount_percentage: 0,
    set_name: ''
  });
  
  const [activeTab, setActiveTab] = useState<'individual' | 'sets' | 'custom' | 'education'>('individual');
  const [selectedFilters, setSelectedFilters] = useState({
    brand_id: '',
    fragrance_family: fragranceFamily || '',
    price_range: ''
  });

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Sample cart calculations
  const calculateSampleShipping = (items: SampleCartItem[]): number => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    if (itemCount === 0) return 0;
    if (itemCount <= 3) return 5;
    if (itemCount <= 6) return 8;
    return 12;
  };

  const calculateBulkDiscount = (sampleCount: number): number => {
    if (sampleCount >= 10) return 15;
    if (sampleCount >= 8) return 10;
    if (sampleCount >= 5) return 5;
    return 0;
  };

  // Fetch discovery sets
  const { data: discoverySets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['sample-sets', setType, fragranceFamily],
    queryFn: async () => {
      const params: any = {};
      if (setType) params.set_type = setType;
      if (fragranceFamily) params.fragrance_family = fragranceFamily;
      
      const response = await axios.get(`${getApiUrl()}/api/samples`, { params });
      
      return response.data.map((set: any) => ({
        set_id: set.set_id,
        set_name: set.set_name,
        description: set.description,
        set_type: set.set_type,
        sample_count: set.sample_count,
        price: set.price,
        savings_amount: set.savings_amount || 0,
        products: set.products?.map((p: any) => ({
          product_id: p.product_id,
          product_name: p.product_name,
          brand_name: p.brand_name,
          sample_size_ml: p.sample_size_ml || 2
        })) || [],
        image_url: set.image_url || 'https://picsum.photos/400/300'
      }));
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch individual samples
  const { data: sampleProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['individual-samples', selectedFilters.brand_id],
    queryFn: async () => {
      const params: any = { per_page: 20, page: 1 };
      if (selectedFilters.brand_id) params.brand_id = selectedFilters.brand_id;
      
      const response = await axios.get(`${getApiUrl()}/api/samples/individual`, { params });
      
      return response.data.data?.map((item: any) => ({
        product_id: item.product.product_id,
        product_name: item.product.product_name,
        brand_name: item.product.brand_name,
        fragrance_families: item.product.fragrance_families ? item.product.fragrance_families.split(',') : [],
        concentration: item.product.concentration,
        sample_sizes: [
          { size_ml: item.sample_size_ml, price: item.sample_price }
        ],
        is_available: item.is_available,
        product_image_url: item.product.image_url || 'https://picsum.photos/300/300',
        notes_preview: `${item.product.top_notes || ''}, ${item.product.middle_notes || ''}`.substring(0, 100)
      })) || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch sample order history (authenticated users only)
  const { data: sampleOrderHistory = [] } = useQuery({
    queryKey: ['sample-order-history'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/sample-orders`, {
        params: { page: 1, per_page: 10 },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      return response.data.data?.map((order: any) => ({
        sample_order_id: order.sample_order_id,
        sample_order_number: order.sample_order_number,
        order_status: order.order_status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        items_count: order.items ? order.items.length : 0,
        tracking_number: order.tracking_number
      })) || [];
    },
    enabled: isAuthenticated && !!authToken,
    staleTime: 5 * 60 * 1000
  });

  // Fetch personalized recommendations
  const { data: recommendedSamples = [] } = useQuery({
    queryKey: ['sample-recommendations', currentUser?.user_id],
    queryFn: async () => {
      const params: any = { sample_only: true, limit: 6 };
      if (fragranceProfile || quizResults) {
        params.based_on = 'user_profile';
      }
      
      const headers: any = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      
      const response = await axios.get(`${getApiUrl()}/api/products/recommendations`, {
        params,
        headers
      });
      
      return response.data?.map((product: any) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: product.brand_name,
        match_reason: product.recommendation_reason || 'Recommended for you',
        sample_price: product.sample_price || 5,
        match_score: product.match_score || 80
      })) || [];
    },
    enabled: isAuthenticated && (!!fragranceProfile || !!quizResults),
    staleTime: 10 * 60 * 1000
  });

  // Create sample order mutation
  const createSampleOrderMutation = useMutation({
    mutationFn: async (orderData: { items: SampleCartItem[]; customer_email: string; shipping_address_id: string; }) => {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      
      const response = await axios.post(`${getApiUrl()}/api/sample-orders`, orderData, { headers });
      return response.data;
    },
    onSuccess: () => {
      setSampleCart({ items: [], subtotal: 0, shipping_cost: 0, total: 0 });
      setCustomSampleSet({
        selected_samples: [],
        set_size_limit: 12,
        total_price: 0,
        discount_percentage: 0,
        set_name: ''
      });
      
      showNotification({
        type: 'success',
        message: "Sample order placed successfully! You'll receive tracking information via email.",
        auto_dismiss: true,
        duration: 5000
      });
      
      // Refetch order history
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['sample-order-history'] });
      }
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to place sample order',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Sample cart management
  const addSampleToCart = (item: {
    type: 'individual' | 'set';
    product_id?: string;
    set_id?: string;
    product_name?: string;
    brand_name?: string;
    sample_size_ml: number;
    unit_price: number;
  }) => {
    const newItem: SampleCartItem = {
      type: item.type,
      product_id: item.product_id || null,
      set_id: item.set_id || null,
      product_name: item.product_name,
      brand_name: item.brand_name,
      sample_size_ml: item.sample_size_ml,
      quantity: 1,
      unit_price: item.unit_price,
      total_price: item.unit_price
    };

    setSampleCart(prev => {
      const updatedItems = [...prev.items, newItem];
      const subtotal = updatedItems.reduce((sum, cartItem) => sum + cartItem.total_price, 0);
      const shipping_cost = calculateSampleShipping(updatedItems);
      
      return {
        items: updatedItems,
        subtotal,
        shipping_cost,
        total: subtotal + shipping_cost
      };
    });

    showNotification({
      type: 'success',
      message: `Sample added to cart`,
      auto_dismiss: true,
      duration: 3000
    });
  };

  const removeSampleFromCart = (index: number) => {
    setSampleCart(prev => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const subtotal = updatedItems.reduce((sum, cartItem) => sum + cartItem.total_price, 0);
      const shipping_cost = calculateSampleShipping(updatedItems);
      
      return {
        items: updatedItems,
        subtotal,
        shipping_cost,
        total: subtotal + shipping_cost
      };
    });
  };

  // Custom set management
  const addToCustomSet = (sample: SampleProduct) => {
    if (customSampleSet.selected_samples.length >= customSampleSet.set_size_limit) {
      showNotification({
        type: 'warning',
        message: `Custom set limit of ${customSampleSet.set_size_limit} samples reached`,
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }

    const newSample = {
      product_id: sample.product_id,
      product_name: sample.product_name,
      brand_name: sample.brand_name,
      sample_size_ml: sample.sample_sizes[0].size_ml,
      price: sample.sample_sizes[0].price,
      image_url: sample.product_image_url
    };

    setCustomSampleSet(prev => {
      const updatedSamples = [...prev.selected_samples, newSample];
      const total_price = updatedSamples.reduce((sum, s) => sum + s.price, 0);
      const discount_percentage = calculateBulkDiscount(updatedSamples.length);
      
      return {
        ...prev,
        selected_samples: updatedSamples,
        total_price: total_price * (1 - discount_percentage / 100),
        discount_percentage,
        set_name: prev.set_name || 'My Custom Discovery Set'
      };
    });
  };

  const removeFromCustomSet = (productId: string) => {
    setCustomSampleSet(prev => {
      const updatedSamples = prev.selected_samples.filter(s => s.product_id !== productId);
      const total_price = updatedSamples.reduce((sum, s) => sum + s.price, 0);
      const discount_percentage = calculateBulkDiscount(updatedSamples.length);
      
      return {
        ...prev,
        selected_samples: updatedSamples,
        total_price: total_price * (1 - discount_percentage / 100),
        discount_percentage
      };
    });
  };

  const addCustomSetToCart = () => {
    if (customSampleSet.selected_samples.length === 0) {
      showNotification({
        type: 'warning',
        message: 'Please add samples to your custom set first',
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }

    addSampleToCart({
      type: 'set',
      set_id: 'custom_' + Date.now(),
      product_name: customSampleSet.set_name,
      brand_name: 'Custom Set',
      sample_size_ml: 2,
      unit_price: customSampleSet.total_price
    });

    setCustomSampleSet({
      selected_samples: [],
      set_size_limit: 12,
      total_price: 0,
      discount_percentage: 0,
      set_name: ''
    });
  };

  // Educational content
  const educationalContent = {
    testing_guide: {
      steps: [
        "Apply sample to clean skin (wrist or inner elbow)",
        "Wait 15 minutes for top notes to develop",
        "Check scent after 1 hour for heart notes",
        "Evaluate after 4-6 hours for base notes",
        "Test at different times of day",
        "Try on different weather conditions"
      ],
      tips: [
        "Don't test more than 3 fragrances per day",
        "Avoid wearing other scented products",
        "Test on skin, not paper strips",
        "Give each fragrance time to develop",
        "Keep notes on your reactions"
      ]
    },
    fragrance_families: [
      {
        family: "Fresh",
        description: "Clean, light, and energizing scents",
        example_notes: ["Citrus", "Marine", "Green"]
      },
      {
        family: "Floral",
        description: "Romantic and feminine flower-based scents",
        example_notes: ["Rose", "Jasmine", "Peony"]
      },
      {
        family: "Oriental",
        description: "Warm, exotic, and sensual scents",
        example_notes: ["Vanilla", "Amber", "Spices"]
      },
      {
        family: "Woody",
        description: "Warm, dry, and sophisticated scents",
        example_notes: ["Sandalwood", "Cedar", "Vetiver"]
      }
    ]
  };

  // Handle checkout
  const handleCheckout = () => {
    if (sampleCart.items.length === 0) {
      showNotification({
        type: 'warning',
        message: 'Your sample cart is empty',
        auto_dismiss: true,
        duration: 3000
      });
      return;
    }

    // For demo purposes - in real app, this would open checkout modal or navigate to checkout
    const customerEmail = currentUser?.email || 'guest@example.com';
    const shippingAddressId = 'default_address'; // Would be selected by user
    
    createSampleOrderMutation.mutate({
      items: sampleCart.items,
      customer_email: customerEmail,
      shipping_address_id: shippingAddressId
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Discover Before You Commit</h1>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
                Try luxury fragrances risk-free with our comprehensive sample program. 
                From individual 2ml vials to curated discovery sets, find your perfect scent without the commitment.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-200">2ml</div>
                  <div className="text-sm">Sample Size</div>
                  <div className="text-xs text-purple-300">~30 applications</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-200">$3-5</div>
                  <div className="text-sm">Sample Price</div>
                  <div className="text-xs text-purple-300">Credit toward full size</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-200">15%</div>
                  <div className="text-sm">Bulk Discount</div>
                  <div className="text-xs text-purple-300">On 10+ samples</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'individual', label: 'Individual Samples', count: sampleProducts.length },
                { id: 'sets', label: 'Discovery Sets', count: discoverySets.length },
                { id: 'custom', label: 'Custom Set Builder', count: customSampleSet.selected_samples.length },
                { id: 'education', label: 'Testing Guide', count: null }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Personalized Recommendations */}
              {recommendedSamples.length > 0 && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recommended for You
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedSamples.slice(0, 3).map((sample) => (
                      <div key={sample.product_id} className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900">{sample.product_name}</h4>
                        <p className="text-sm text-gray-600">{sample.brand_name}</p>
                        <p className="text-xs text-purple-600 mt-1">{sample.match_reason}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-medium text-gray-900">${sample.sample_price}</span>
                          <button
                            onClick={() => addSampleToCart({
                              type: 'individual',
                              product_id: sample.product_id,
                              product_name: sample.product_name,
                              brand_name: sample.brand_name,
                              sample_size_ml: 2,
                              unit_price: sample.sample_price
                            })}
                            className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                          >
                            Add Sample
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Samples Tab */}
              {activeTab === 'individual' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Individual Samples</h2>
                    <div className="flex space-x-4">
                      <select
                        value={selectedFilters.brand_id}
                        onChange={(e) => setSelectedFilters(prev => ({ ...prev, brand_id: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">All Brands</option>
                        <option value="brand_001">Chanel</option>
                        <option value="brand_002">Dior</option>
                        <option value="brand_003">Tom Ford</option>
                      </select>
                      <select
                        value={selectedFilters.fragrance_family}
                        onChange={(e) => setSelectedFilters(prev => ({ ...prev, fragrance_family: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">All Families</option>
                        <option value="fresh">Fresh</option>
                        <option value="floral">Floral</option>
                        <option value="oriental">Oriental</option>
                        <option value="woody">Woody</option>
                      </select>
                    </div>
                  </div>

                  {productsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sampleProducts.map((product) => (
                        <div key={product.product_id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-gray-100 relative">
                            <img
                              src={product.product_image_url}
                              alt={product.product_name}
                              className="w-full h-full object-cover"
                            />
                            {!product.is_available && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <span className="text-white font-medium">Out of Stock</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900">{product.product_name}</h3>
                            <p className="text-sm text-gray-600">{product.brand_name}</p>
                            <p className="text-xs text-gray-500 mt-1">{product.concentration}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.fragrance_families.slice(0, 2).map((family) => (
                                <span key={family} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  {family}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{product.notes_preview}</p>
                            <div className="flex items-center justify-between mt-4">
                              <div>
                                <span className="text-lg font-bold text-gray-900">
                                  ${product.sample_sizes[0].price}
                                </span>
                                <span className="text-xs text-gray-500 ml-1">
                                  ({product.sample_sizes[0].size_ml}ml)
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => addToCustomSet(product)}
                                  disabled={!product.is_available || customSampleSet.selected_samples.length >= customSampleSet.set_size_limit}
                                  className="text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                                >
                                  + Custom Set
                                </button>
                                <button
                                  onClick={() => addSampleToCart({
                                    type: 'individual',
                                    product_id: product.product_id,
                                    product_name: product.product_name,
                                    brand_name: product.brand_name,
                                    sample_size_ml: product.sample_sizes[0].size_ml,
                                    unit_price: product.sample_sizes[0].price
                                  })}
                                  disabled={!product.is_available}
                                  className="bg-purple-600 text-white text-xs px-3 py-1 rounded hover:bg-purple-700 disabled:bg-gray-300"
                                >
                                  Add Sample
                                </button>
                              </div>
                            </div>
                            <Link
                              to={`/products/${product.product_id}`}
                              className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                            >
                              View Full Size →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Discovery Sets Tab */}
              {activeTab === 'sets' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Discovery Sets</h2>
                    <div className="flex space-x-4">
                      <Link
                        to="/samples?set_type=discovery"
                        className={`px-3 py-1 rounded text-sm ${setType === 'discovery' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Discovery
                      </Link>
                      <Link
                        to="/samples?set_type=brand"
                        className={`px-3 py-1 rounded text-sm ${setType === 'brand' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        By Brand
                      </Link>
                      <Link
                        to="/samples?set_type=seasonal"
                        className={`px-3 py-1 rounded text-sm ${setType === 'seasonal' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Seasonal
                      </Link>
                    </div>
                  </div>

                  {setsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-white rounded-lg p-6">
                          <div className="h-32 bg-gray-200 rounded mb-4"></div>
                          <div className="h-6 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {discoverySets.map((set) => (
                        <div key={set.set_id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          <div className="h-48 bg-gray-100 relative">
                            <img
                              src={set.image_url}
                              alt={set.set_name}
                              className="w-full h-full object-cover"
                            />
                            {set.savings_amount > 0 && (
                              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                                Save ${set.savings_amount}
                              </div>
                            )}
                          </div>
                          <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900">{set.set_name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{set.description}</p>
                            <div className="mt-3">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {set.sample_count} samples
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">
                                {set.set_type}
                              </span>
                            </div>
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Includes:</h4>
                              <div className="space-y-1">
                                {set.products.slice(0, 3).map((product) => (
                                  <div key={product.product_id} className="text-xs text-gray-600">
                                    {product.brand_name} - {product.product_name}
                                  </div>
                                ))}
                                {set.products.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{set.products.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-6">
                              <div>
                                <span className="text-2xl font-bold text-gray-900">${set.price}</span>
                                {set.savings_amount > 0 && (
                                  <span className="text-sm text-green-600 ml-2">
                                    (Save ${set.savings_amount})
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => addSampleToCart({
                                  type: 'set',
                                  set_id: set.set_id,
                                  product_name: set.set_name,
                                  brand_name: 'Discovery Set',
                                  sample_size_ml: 2,
                                  unit_price: set.price
                                })}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                              >
                                Add Set
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Set Builder Tab */}
              {activeTab === 'custom' && (
                <div>
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Custom Set Builder</h2>
                    <p className="text-gray-600 mb-6">
                      Create your own personalized discovery set. Select up to {customSampleSet.set_size_limit} samples 
                      and enjoy bulk discounts on larger sets.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {customSampleSet.selected_samples.length}/{customSampleSet.set_size_limit}
                        </div>
                        <div className="text-sm text-gray-600">Samples Selected</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {customSampleSet.discount_percentage}%
                        </div>
                        <div className="text-sm text-gray-600">Bulk Discount</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          ${customSampleSet.total_price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Total Price</div>
                      </div>
                    </div>

                    {customSampleSet.selected_samples.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Samples</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {customSampleSet.selected_samples.map((sample) => (
                            <div key={sample.product_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={sample.image_url}
                                  alt={sample.product_name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{sample.product_name}</div>
                                  <div className="text-xs text-gray-600">{sample.brand_name}</div>
                                  <div className="text-xs text-gray-500">${sample.price}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => removeFromCustomSet(sample.product_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 flex items-center space-x-4">
                          <input
                            type="text"
                            value={customSampleSet.set_name}
                            onChange={(e) => setCustomSampleSet(prev => ({ ...prev, set_name: e.target.value }))}
                            placeholder="Name your custom set"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                          <button
                            onClick={addCustomSetToCart}
                            className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
                          >
                            Add Custom Set to Cart
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-4 text-center text-xs text-gray-600 mb-6">
                      <div>5+ samples: 5% off</div>
                      <div>8+ samples: 10% off</div>
                      <div>10+ samples: 15% off</div>
                      <div>Free shipping on 6+</div>
                      <div>Custom gift packaging</div>
                    </div>
                  </div>

                  {/* Available samples for custom set */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Samples to Your Set</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {sampleProducts.slice(0, 8).map((product) => {
                        const isSelected = customSampleSet.selected_samples.some(s => s.product_id === product.product_id);
                        const isLimitReached = customSampleSet.selected_samples.length >= customSampleSet.set_size_limit;
                        
                        return (
                          <div key={product.product_id} className={`border rounded-lg p-3 ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                            <div className="aspect-square bg-gray-100 rounded mb-2 relative">
                              <img
                                src={product.product_image_url}
                                alt={product.product_name}
                                className="w-full h-full object-cover rounded"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{product.product_name}</h4>
                            <p className="text-xs text-gray-600">{product.brand_name}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">${product.sample_sizes[0].price}</p>
                            <button
                              onClick={() => isSelected ? removeFromCustomSet(product.product_id) : addToCustomSet(product)}
                              disabled={!isSelected && isLimitReached}
                              className={`w-full text-xs py-1 px-2 rounded mt-2 ${
                                isSelected 
                                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                  : isLimitReached
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {isSelected ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className="space-y-8">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Fragrance Testing Guide</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Testing Steps</h3>
                        <ol className="space-y-3">
                          {educationalContent.testing_guide.steps.map((step, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white text-sm rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-gray-700">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pro Tips</h3>
                        <ul className="space-y-3">
                          {educationalContent.testing_guide.tips.map((tip, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                              <span className="text-gray-700">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Fragrance Families</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {educationalContent.fragrance_families.map((family) => (
                        <div key={family.family} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{family.family}</h4>
                          <p className="text-sm text-gray-600 mb-3">{family.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {family.example_notes.map((note) => (
                              <span key={note} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {note}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Start Testing?</h3>
                    <p className="text-gray-600 mb-4">
                      Take our fragrance quiz to get personalized sample recommendations based on your preferences.
                    </p>
                    <Link
                      to="/fragrance-finder"
                      className="inline-block bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
                    >
                      Take Fragrance Quiz
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Sample Cart Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Sample Cart ({sampleCart.items.length})
                  </h3>
                  
                  {sampleCart.items.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your sample cart is empty</p>
                  ) : (
                    <div className="space-y-4">
                      {sampleCart.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{item.product_name}</h4>
                            <p className="text-xs text-gray-600">{item.brand_name}</p>
                            <p className="text-xs text-gray-500">{item.sample_size_ml}ml</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">${item.total_price}</span>
                            <button
                              onClick={() => removeSampleFromCart(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>${sampleCart.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Shipping:</span>
                          <span>${sampleCart.shipping_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total:</span>
                          <span>${sampleCart.total.toFixed(2)}</span>
                        </div>
                        
                        {sampleCart.shipping_cost === 0 && sampleCart.items.length > 0 && (
                          <p className="text-xs text-green-600">Free shipping applied!</p>
                        )}
                      </div>
                      
                      <button
                        onClick={handleCheckout}
                        disabled={createSampleOrderMutation.isPending}
                        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-300"
                      >
                        {createSampleOrderMutation.isPending ? 'Processing...' : 'Checkout'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sample Order History */}
                {isAuthenticated && sampleOrderHistory.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sample Orders</h3>
                    <div className="space-y-3">
                      {sampleOrderHistory.slice(0, 3).map((order) => (
                        <div key={order.sample_order_id} className="border border-gray-100 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900">#{order.sample_order_number}</p>
                              <p className="text-xs text-gray-600">{order.items_count} samples</p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">${order.total_amount}</p>
                              <span className={`text-xs px-2 py-1 rounded ${
                                order.order_status === 'delivered' ? 'bg-green-100 text-green-700' :
                                order.order_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.order_status}
                              </span>
                            </div>
                          </div>
                          {order.tracking_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Tracking: {order.tracking_number}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/account/orders"
                      className="text-sm text-purple-600 hover:text-purple-700 mt-3 inline-block"
                    >
                      View all orders →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SampleProgram;