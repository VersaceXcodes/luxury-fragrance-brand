import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types for API responses
interface TrackingEvent {
  event_type: string;
  description: string;
  location: string;
  timestamp: string;
}

interface OrderDetails {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  gift_message: string | null;
  special_instructions: string | null;
  customer_email: string;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface TrackingResponse {
  order: OrderDetails;
  tracking_events: TrackingEvent[];
}

interface TrackingForm {
  order_number: string;
  email: string;
}

const UV_OrderTracking: React.FC = () => {
  // Router params and search params
  const { order_id } = useParams<{ order_id: string }>();
  const [searchParams] = useSearchParams();
  
  // Local state for guest tracking form
  const [trackingForm, setTrackingForm] = useState<TrackingForm>({
    order_number: searchParams.get('order_number') || '',
    email: searchParams.get('email') || ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Zustand store selectors - individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // API function for authenticated order tracking
  const fetchOrderDetails = async (orderId: string): Promise<OrderDetails> => {
    const response = await axios.get(
      `${getApiUrl()}/api/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  };

  // API function for guest order tracking
  const trackGuestOrder = async (orderNumber: string, email: string): Promise<TrackingResponse> => {
    const response = await axios.get(
      `${getApiUrl()}/api/orders/track`,
      {
        params: { order_number: orderNumber, email },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  };

  // React Query for authenticated order tracking
  const authenticatedOrderQuery = useQuery({
    queryKey: ['order', order_id],
    queryFn: () => fetchOrderDetails(order_id!),
    enabled: !!order_id && !!authToken,
    staleTime: 30000, // 30 seconds
    retry: 1
  });

  // React Query for guest order tracking
  const [guestTrackingEnabled, setGuestTrackingEnabled] = useState(false);
  const guestOrderQuery = useQuery({
    queryKey: ['guestOrder', trackingForm.order_number, trackingForm.email],
    queryFn: () => trackGuestOrder(trackingForm.order_number, trackingForm.email),
    enabled: guestTrackingEnabled && !order_id && trackingForm.order_number.length > 0 && trackingForm.email.length > 0,
    staleTime: 30000,
    retry: 1
  });

  // Handle guest tracking form submission
  const handleGuestTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!trackingForm.order_number.trim()) {
      setFormError('Please enter your order number');
      return;
    }
    
    if (!trackingForm.email.trim()) {
      setFormError('Please enter your email address');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(trackingForm.email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    setGuestTrackingEnabled(true);
  };

  // Determine current order data and loading state
  const orderData = order_id ? authenticatedOrderQuery.data : guestOrderQuery.data?.order;
  const trackingEvents = order_id ? [] : (guestOrderQuery.data?.tracking_events || []);
  const isLoading = order_id ? authenticatedOrderQuery.isLoading : guestOrderQuery.isLoading;
  const error = order_id ? authenticatedOrderQuery.error : guestOrderQuery.error;

  // Order status steps for visual progress
  const orderSteps = [
    { key: 'pending', label: 'Order Placed', status: 'completed' },
    { key: 'processing', label: 'Processing', status: orderData?.order_status === 'pending' ? 'pending' : 'completed' },
    { key: 'shipped', label: 'Shipped', status: ['shipped', 'delivered'].includes(orderData?.order_status || '') ? 'completed' : 'pending' },
    { key: 'delivered', label: 'Delivered', status: orderData?.order_status === 'delivered' ? 'completed' : 'pending' }
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Reset guest tracking when switching modes
  useEffect(() => {
    if (order_id && guestTrackingEnabled) {
      setGuestTrackingEnabled(false);
    }
  }, [order_id, guestTrackingEnabled]);

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order Tracking
              </h1>
              <p className="text-gray-600">
                Track your order status and delivery progress
              </p>
              
              {/* Guest Tracking Form */}
              {!order_id && (
                <div className="mt-8">
                  <form onSubmit={handleGuestTrackingSubmit} className="max-w-md">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="order_number" className="block text-sm font-medium text-gray-700 mb-1">
                          Order Number
                        </label>
                        <input
                          type="text"
                          id="order_number"
                          value={trackingForm.order_number}
                          onChange={(e) => {
                            setFormError(null);
                            setTrackingForm(prev => ({ ...prev, order_number: e.target.value }));
                          }}
                          placeholder="Enter your order number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          aria-describedby="order-number-help"
                        />
                        <p id="order-number-help" className="mt-1 text-xs text-gray-500">
                          Your order number starts with "LS" followed by numbers
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={trackingForm.email}
                          onChange={(e) => {
                            setFormError(null);
                            setTrackingForm(prev => ({ ...prev, email: e.target.value }));
                          }}
                          placeholder="Enter your email address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      
                      {formError && (
                        <div className="text-red-600 text-sm" role="alert">
                          {formError}
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Tracking Order...
                          </span>
                        ) : (
                          'Track Order'
                        )}
                      </button>
                    </div>
                  </form>
                  
                  {isAuthenticated && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-700 text-sm">
                        <strong>Logged in users:</strong> Visit your{' '}
                        <Link to="/account/orders" className="underline hover:no-underline">
                          order history
                        </Link>{' '}
                        to track all your orders.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">
                  {error instanceof Error 
                    ? error.message 
                    : 'Unable to find order. Please check your order number and email address.'}
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600">Loading order details...</span>
              </div>
            </div>
          )}

          {/* Order Details */}
          {orderData && !isLoading && (
            <>
              {/* Order Information Panel */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Number</p>
                      <p className="text-lg font-semibold text-gray-900">{orderData.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Date</p>
                      <p className="text-lg text-gray-900">{formatDate(orderData.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(orderData.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        orderData.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : orderData.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {orderData.payment_status.charAt(0).toUpperCase() + orderData.payment_status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  {orderData.tracking_number && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700">Tracking Number</p>
                      <p className="text-lg font-mono text-gray-900">{orderData.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Progress Tracking */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Progress</h2>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      {orderSteps.map((step, index) => (
                        <div key={step.key} className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.status === 'completed' 
                              ? 'bg-green-500 text-white' 
                              : orderData.order_status === step.key
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}>
                            {step.status === 'completed' ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-sm font-medium">{index + 1}</span>
                            )}
                          </div>
                          <p className={`mt-2 text-sm font-medium ${
                            step.status === 'completed' || orderData.order_status === step.key
                              ? 'text-gray-900' 
                              : 'text-gray-400'
                          }`}>
                            {step.label}
                          </p>
                          {step.key === 'shipped' && orderData.shipped_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(orderData.shipped_at)}
                            </p>
                          )}
                          {step.key === 'delivered' && orderData.delivered_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(orderData.delivered_at)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Progress Line */}
                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-10">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ 
                          width: `${(orderSteps.filter(s => s.status === 'completed').length - 1) * (100 / (orderSteps.length - 1))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking Events */}
              {trackingEvents.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
                  <div className="px-6 py-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Tracking History</h2>
                    
                    <div className="space-y-4">
                      {trackingEvents.map((event, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-md">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{event.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {event.location} • {formatDate(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(orderData.subtotal)}</span>
                    </div>
                    
                    {orderData.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount</span>
                        <span className="text-green-600">-{formatCurrency(orderData.discount_amount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-900">
                        {orderData.shipping_cost > 0 ? formatCurrency(orderData.shipping_cost) : 'Free'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">{formatCurrency(orderData.tax_amount)}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-semibold text-gray-900">{formatCurrency(orderData.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {orderData.gift_message && (
                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
                      <p className="text-sm font-medium text-purple-900">Gift Message:</p>
                      <p className="text-sm text-purple-700 mt-1">{orderData.gift_message}</p>
                    </div>
                  )}
                  
                  {orderData.special_instructions && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm font-medium text-gray-900">Special Instructions:</p>
                      <p className="text-sm text-gray-700 mt-1">{orderData.special_instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {isAuthenticated && (
                  <Link
                    to="/account/orders"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    View All Orders
                  </Link>
                )}
                
                <Link
                  to="/support"
                  className="inline-flex items-center justify-center px-6 py-3 border border-purple-300 rounded-md shadow-sm bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.436L3 21l2.436-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                  </svg>
                  Need Help?
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_OrderTracking;