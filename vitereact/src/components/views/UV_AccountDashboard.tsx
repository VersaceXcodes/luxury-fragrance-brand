import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas and API responses
interface DashboardUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  loyalty_tier: string | null;
  created_at: string;
  notification_preferences: string;
  fragrance_profile: string | null;
}

interface RecentOrder {
  order_id: string;
  order_number: string;
  order_status: string;
  total_amount: number;
  created_at: string;
  item_count: number;
}

interface OrderSummaryStats {
  total_orders: number;
  total_spent: number;
  favorite_brands: string[];
  seasonal_patterns: Array<{ season: string; order_count: number }>;
}

interface WishlistPreviewItem {
  wishlist_item_id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  current_price: number;
  image_url: string;
}

interface PersonalizedRecommendation {
  product_id: string;
  product_name: string;
  brand_name: string;
  base_price: number;
  recommendation_reason: string;
  match_score: number;
}

interface LoyaltyStatus {
  tier: string | null;
  points: number;
  next_tier_points: number;
  tier_benefits: string[];
}

const UV_AccountDashboard: React.FC = () => {
  // Zustand store selectors - individual selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const showNotification = useAppStore(state => state.show_notification);
  
  const queryClient = useQueryClient();

  // Helper function to get API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Helper function to get auth headers
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  });

  // User Profile Query
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async (): Promise<DashboardUser> => {
      const response = await axios.get(`${getApiUrl()}/api/users/profile`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Recent Orders Query
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recentOrders'],
    queryFn: async (): Promise<RecentOrder[]> => {
      const response = await axios.get(`${getApiUrl()}/api/orders`, {
        headers: getAuthHeaders(),
        params: {
          page: 1,
          per_page: 5,
          sort_by: 'created_at',
          sort_order: 'desc'
        }
      });
      return response.data.data.map((order: any) => ({
        order_id: order.order_id,
        order_number: order.order_number,
        order_status: order.order_status,
        total_amount: Number(order.total_amount || 0),
        created_at: order.created_at,
        item_count: order.items ? order.items.length : 0
      }));
    },
    enabled: !!authToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
  });

  // Order Summary Stats Query
  const { data: orderStats } = useQuery({
    queryKey: ['orderSummaryStats'],
    queryFn: async (): Promise<OrderSummaryStats> => {
      const response = await axios.get(`${getApiUrl()}/api/orders`, {
        headers: getAuthHeaders(),
        params: {
          per_page: 100,
          sort_by: 'created_at'
        }
      });
      
      const orders = response.data.data;
      const totalSpent = orders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
      
      return {
        total_orders: orders.length,
        total_spent: totalSpent,
        favorite_brands: [], // Could be calculated from order items if available
        seasonal_patterns: []
      };
    },
    enabled: !!authToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  // Wishlist Preview Query
  const { data: wishlistPreview, isLoading: wishlistLoading } = useQuery({
    queryKey: ['wishlistPreview'],
    queryFn: async (): Promise<WishlistPreviewItem[]> => {
      const wishlistsResponse = await axios.get(`${getApiUrl()}/api/wishlists`, {
        headers: getAuthHeaders()
      });
      
      const defaultWishlist = wishlistsResponse.data.find((list: any) => list.is_default);
      if (!defaultWishlist) return [];

      const itemsResponse = await axios.get(`${getApiUrl()}/api/wishlists/${defaultWishlist.wishlist_id}`, {
        headers: getAuthHeaders()
      });
      
      return (itemsResponse.data.items || []).slice(0, 6).map((item: any) => ({
        wishlist_item_id: item.wishlist_item_id,
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown Product',
        brand_name: item.brand_name || 'Unknown Brand',
        current_price: Number(item.current_price || 0),
        image_url: item.image_url || ''
      }));
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Personalized Recommendations Query
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['personalizedRecommendations'],
    queryFn: async (): Promise<PersonalizedRecommendation[]> => {
      const response = await axios.get(`${getApiUrl()}/api/products/recommendations`, {
        headers: getAuthHeaders(),
        params: {
          based_on: 'purchase_history',
          limit: 8
        }
      });
      
      return response.data.map((product: any) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: product.brand_name,
        base_price: Number(product.base_price || 0),
        recommendation_reason: product.match_reason || "Based on your preferences",
        match_score: product.match_score || 85
      }));
    },
    enabled: !!authToken,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });

  // Quick Reorder Mutation
  const quickReorderMutation = useMutation({
    mutationFn: async (orderData: { product_id: string; size_ml: number; unit_price: number }) => {
      const response = await axios.post(`${getApiUrl()}/api/cart/items`, {
        product_id: orderData.product_id,
        size_ml: orderData.size_ml,
        quantity: 1,
        unit_price: orderData.unit_price
      }, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Item added to cart successfully',
        auto_dismiss: true,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to add item to cart',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Helper function to calculate loyalty status
  const calculateLoyaltyStatus = (): LoyaltyStatus => {
    const tier = userProfile?.loyalty_tier || currentUser?.loyalty_tier || null;
    return {
      tier,
      points: 0, // Would come from API if available
      next_tier_points: 0,
      tier_benefits: tier ? [`${tier} tier benefits`] : []
    };
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get order status badge
  const getOrderStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      shipped: { color: 'bg-purple-100 text-purple-800', text: 'Shipped' },
      delivered: { color: 'bg-green-100 text-green-800', text: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
      refunded: { color: 'bg-gray-100 text-gray-800', text: 'Refunded' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const loyaltyStatus = calculateLoyaltyStatus();
  const displayName = userProfile?.first_name || currentUser?.first_name || 'User';

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {displayName}!
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your account and discover new fragrances
                </p>
              </div>
              {loyaltyStatus.tier && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg">
                  <div className="text-sm font-medium">{loyaltyStatus.tier.toUpperCase()} MEMBER</div>
                  <div className="text-xs opacity-90">{loyaltyStatus.points} points</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Action Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <Link
              to="/account/orders"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-blue-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                View Orders
              </div>
            </Link>

            <Link
              to="/track-order"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-green-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-green-600">
                Track Package
              </div>
            </Link>

            <Link
              to="/account/profile"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-purple-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                Update Profile
              </div>
            </Link>

            <Link
              to="/wishlist"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-red-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-red-600">
                Wishlist
              </div>
            </Link>

            <Link
              to="/support"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-yellow-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-yellow-600">
                Customer Service
              </div>
            </Link>

            <Link
              to="/fragrance-finder"
              className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-center group"
            >
              <div className="w-8 h-8 mx-auto mb-2 text-indigo-600">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                Find Fragrance
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                    <Link 
                      to="/account/orders" 
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  {ordersLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentOrders && recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <div key={order.order_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Link 
                                  to={`/orders/${order.order_id}`}
                                  className="font-medium text-gray-900 hover:text-blue-600"
                                >
                                  #{order.order_number}
                                </Link>
                                {getOrderStatusBadge(order.order_status)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(order.created_at)} • {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(order.total_amount)}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Link
                                  to={`/orders/${order.order_id}`}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Track
                                </Link>
                                <button
                                  onClick={() => quickReorderMutation.mutate({
                                    product_id: order.order_id,
                                    size_ml: 50,
                                    unit_price: order.total_amount
                                  })}
                                  disabled={quickReorderMutation.isPending}
                                  className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                                >
                                  Reorder
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                      <p className="text-gray-600 mb-4">Start shopping to see your orders here</p>
                      <Link
                        to="/products"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Insights Sidebar */}
            <div className="space-y-6">
              {/* Account Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-semibold text-gray-900">
                      {orderStats?.total_orders || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Spent</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(orderStats?.total_spent || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-semibold text-gray-900">
                      {userProfile?.created_at ? formatDate(userProfile.created_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wishlist Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Wishlist</h3>
                  <Link 
                    to="/wishlist" 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </Link>
                </div>
                {wishlistLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : wishlistPreview && wishlistPreview.length > 0 ? (
                  <div className="space-y-3">
                    {wishlistPreview.slice(0, 3).map((item) => (
                      <div key={item.wishlist_item_id} className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${item.product_id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-gray-600">{item.brand_name}</p>
                          <p className="text-xs font-semibold text-gray-900">
                            {formatCurrency(item.current_price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">No saved items yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personalized Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
                  <p className="text-sm text-gray-600">Based on your purchase history and preferences</p>
                </div>
                <div className="p-6">
                  {recommendationsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {recommendations.slice(0, 4).map((product) => (
                        <div key={product.product_id} className="group">
                          <Link to={`/products/${product.product_id}`}>
                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {product.product_name}
                            </h3>
                            <p className="text-sm text-gray-600">{product.brand_name}</p>
                            <p className="font-semibold text-gray-900 mt-1">
                              {formatCurrency(product.base_price)}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {product.recommendation_reason}
                            </p>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AccountDashboard;