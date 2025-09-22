import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Type definitions based on backend schemas
interface Order {
  order_id: string;
  user_id: string | null;
  order_number: string;
  order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address_id: string;
  billing_address_id: string;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  gift_message: string | null;
  customer_email: string;
  created_at: string;
  updated_at: string;
}

interface OrderFilters {
  order_status: string | null;
  payment_status: string | null;
  date_from: string | null;
  date_to: string | null;
  price_min: number | null;
  price_max: number | null;
}

interface PaginationState {
  current_page: number;
  per_page: number;
  total_orders: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

interface TrackingEvent {
  event_type: string;
  description: string;
  location: string;
  timestamp: string;
}

interface TrackingResponse {
  order: Order;
  tracking_events: TrackingEvent[];
}

const UV_OrderHistory: React.FC = () => {
  // Zustand state - individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({
    order_status: null,
    payment_status: null,
    date_from: null,
    date_to: null,
    price_min: null,
    price_max: null,
  });

  const [paginationState, setPaginationState] = useState<PaginationState>({
    current_page: 1,
    per_page: 10,
    total_orders: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingResponse | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);



  // API base URL
  const getApiUrl = () => {
    return import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';
  };

  // Query function for loading orders
  const loadOrders = async (filters: OrderFilters, page: number, perPage: number): Promise<OrdersResponse> => {
    const params: any = {
      page,
      per_page: perPage,
    };

    if (filters.order_status) params.order_status = filters.order_status;
    if (filters.payment_status) params.payment_status = filters.payment_status;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;

    const response = await axios.get(`${getApiUrl()}/api/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params,
    });

    return response.data;
  };

  // Query function for order details
  const loadOrderDetails = async (orderId: string): Promise<Order> => {
    const response = await axios.get(`${getApiUrl()}/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return response.data;
  };

  // Query function for order tracking
  const loadOrderTracking = async (orderNumber: string): Promise<TrackingResponse> => {
    const response = await axios.get(`${getApiUrl()}/api/orders/track`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        order_number: orderNumber,
      },
    });

    return response.data;
  };

  // React Query hooks
  const ordersQuery = useQuery({
    queryKey: ['orders', orderFilters, paginationState.current_page, paginationState.per_page],
    queryFn: () => loadOrders(orderFilters, paginationState.current_page, paginationState.per_page),
    enabled: isAuthenticated && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const orderDetailsQuery = useQuery({
    queryKey: ['order-details', selectedOrder?.order_id],
    queryFn: () => loadOrderDetails(selectedOrder!.order_id),
    enabled: !!selectedOrder && isAuthenticated && !!authToken,
    staleTime: 300000,
  });

  // Mutation for reordering
  const reorderMutation = useMutation({
    mutationFn: async () => {
      // Since the API endpoint for reordering is missing, we'll simulate it
      // by adding items to cart one by one (this would need the order items)
      throw new Error('Reorder functionality is not yet implemented on the server');
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Items added to cart successfully',
        auto_dismiss: true,
        duration: 3000,
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.message || 'Failed to reorder items',
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  // Update pagination when query succeeds
  useEffect(() => {
    if (ordersQuery.data) {
      setPaginationState(prev => ({
        ...prev,
        total_orders: ordersQuery.data.pagination.total,
        total_pages: ordersQuery.data.pagination.total_pages,
        has_next: ordersQuery.data.pagination.has_next,
        has_prev: ordersQuery.data.pagination.has_prev,
      }));
    }
  }, [ordersQuery.data]);

  // Filter handlers
  const handleFilterChange = (filterKey: keyof OrderFilters, value: any) => {
    setOrderFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
    setPaginationState(prev => ({
      ...prev,
      current_page: 1,
    }));
  };

  const clearFilters = () => {
    setOrderFilters({
      order_status: null,
      payment_status: null,
      date_from: null,
      date_to: null,
      price_min: null,
      price_max: null,
    });
    setPaginationState(prev => ({
      ...prev,
      current_page: 1,
    }));
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPaginationState(prev => ({
      ...prev,
      current_page: newPage,
    }));
  };

  // Order action handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleTrackOrder = async (order: Order) => {
    if (!order.tracking_number) {
      showNotification({
        type: 'info',
        message: 'Tracking information is not yet available for this order',
        auto_dismiss: true,
        duration: 3000,
      });
      return;
    }

    try {
      const trackingData = await loadOrderTracking(order.order_number);
      setTrackingInfo(trackingData);
      setShowTrackingModal(true);
    } catch {
      showNotification({
        type: 'error',
        message: 'Failed to load tracking information',
        auto_dismiss: true,
        duration: 5000,
      });
    }
  };

  const handleReorder = () => {
    reorderMutation.mutate();
  };

  // Status badge component
  const getStatusBadge = (status: string, type: 'order' | 'payment' | 'fulfillment') => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    const statusConfig = {
      order: {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800',
      },
      payment: {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800',
        partially_refunded: 'bg-orange-100 text-orange-800',
      },
      fulfillment: {
        unfulfilled: 'bg-gray-100 text-gray-800',
        partial: 'bg-yellow-100 text-yellow-800',
        fulfilled: 'bg-green-100 text-green-800',
      },
    };

    const colorClass = statusConfig[type][status as keyof typeof statusConfig[typeof type]] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`${baseClasses} ${colorClass}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
            <p className="text-gray-600 mb-6">You need to be signed in to view your order history.</p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    View and manage your past orders
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to="/account"
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    ← Back to Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Orders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Order Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Status
                  </label>
                  <select
                    value={orderFilters.order_status || ''}
                    onChange={(e) => handleFilterChange('order_status', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={orderFilters.payment_status || ''}
                    onChange={(e) => handleFilterChange('payment_status', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Payments</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                    <option value="partially_refunded">Partially Refunded</option>
                  </select>
                </div>

                {/* Date From Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={orderFilters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={orderFilters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-lg shadow">
            {ordersQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : ordersQuery.error ? (
              <div className="p-8 text-center">
                <p className="text-red-600 mb-4">Failed to load orders</p>
                <button
                  onClick={() => ordersQuery.refetch()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Try Again
                </button>
              </div>
            ) : !ordersQuery.data?.data?.length ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 mb-4">No orders found</p>
                <Link
                  to="/products"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                {/* Orders Table Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <div>Order</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Payment</div>
                    <div>Total</div>
                    <div>Actions</div>
                  </div>
                </div>

                {/* Orders List */}
                <div className="divide-y divide-gray-200">
                  {ordersQuery.data.data.map((order) => (
                    <div key={order.order_id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        {/* Order Number */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            #{order.order_number}
                          </p>
                          {order.tracking_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Tracking: {order.tracking_number}
                            </p>
                          )}
                        </div>

                        {/* Date */}
                        <div>
                          <p className="text-sm text-gray-900">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        {/* Status */}
                        <div>
                          {getStatusBadge(order.order_status, 'order')}
                        </div>

                        {/* Payment */}
                        <div>
                          {getStatusBadge(order.payment_status, 'payment')}
                        </div>

                        {/* Total */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total_amount, order.currency)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                          >
                            Details
                          </button>
                          {order.tracking_number && (
                            <button
                              onClick={() => handleTrackOrder(order)}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                            >
                              Track
                            </button>
                          )}
                          {order.order_status === 'delivered' && (
                            <button
                              onClick={() => handleReorder()}
                              disabled={reorderMutation.isPending}
                              className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              Reorder
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {paginationState.total_pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing page {paginationState.current_page} of {paginationState.total_pages}
                        ({paginationState.total_orders} total orders)
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(paginationState.current_page - 1)}
                          disabled={!paginationState.has_prev}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(paginationState.current_page + 1)}
                          disabled={!paginationState.has_next}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order Details - #{selectedOrder.order_number}
                  </h3>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {orderDetailsQuery.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading order details...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Order Summary */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Order Date:</span>
                            <span className="ml-2 font-medium">{formatDate(selectedOrder.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Order Status:</span>
                            <span className="ml-2">{getStatusBadge(selectedOrder.order_status, 'order')}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payment Status:</span>
                            <span className="ml-2">{getStatusBadge(selectedOrder.payment_status, 'payment')}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Fulfillment:</span>
                            <span className="ml-2">{getStatusBadge(selectedOrder.fulfillment_status, 'fulfillment')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Totals */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Order Totals</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>{formatCurrency(selectedOrder.subtotal, selectedOrder.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping:</span>
                            <span>{formatCurrency(selectedOrder.shipping_cost, selectedOrder.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax:</span>
                            <span>{formatCurrency(selectedOrder.tax_amount, selectedOrder.currency)}</span>
                          </div>
                          {selectedOrder.discount_amount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount:</span>
                              <span>-{formatCurrency(selectedOrder.discount_amount, selectedOrder.currency)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-base border-t border-gray-200 pt-2">
                            <span>Total:</span>
                            <span>{formatCurrency(selectedOrder.total_amount, selectedOrder.currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gift Message */}
                    {selectedOrder.gift_message && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Gift Message</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700">{selectedOrder.gift_message}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      {selectedOrder.tracking_number && (
                        <button
                          onClick={() => handleTrackOrder(selectedOrder)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Track Order
                        </button>
                      )}
                      {selectedOrder.order_status === 'delivered' && (
                        <button
                          onClick={() => handleReorder()}
                          disabled={reorderMutation.isPending}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50"
                        >
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tracking Modal */}
        {showTrackingModal && trackingInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order Tracking - #{trackingInfo.order.order_number}
                  </h3>
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {trackingInfo.tracking_events && trackingInfo.tracking_events.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Tracking Events</h4>
                      <div className="space-y-4">
                        {trackingInfo.tracking_events.map((event, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-3 h-3 bg-purple-600 rounded-full mt-1"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{event.description}</p>
                              <p className="text-xs text-gray-500">
                                {event.location} • {formatDate(event.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No tracking events available yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_OrderHistory;