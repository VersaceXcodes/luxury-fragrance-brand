import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// API Response Interfaces
interface OrderResponse {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
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
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemResponse[];
}

interface OrderItemResponse {
  order_item_id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  gift_wrap: boolean;
}

interface AddressResponse {
  address_id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number: string | null;
}

interface AccountCreationFormData {
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
  newsletter_consent: boolean;
  terms_accepted: boolean;
}

const UV_OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  // Individual Zustand selectors to prevent infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const registerUser = useAppStore(state => state.register_user);
  const clearCart = useAppStore(state => state.clear_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state for account creation
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountCreationFormData>({
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    newsletter_consent: false,
    terms_accepted: false,
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch order details
  const { data: orderData, isLoading: isOrderLoading, error: orderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async (): Promise<OrderResponse> => {
      if (!orderId) throw new Error('Order ID is required');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/orders/${orderId}`
      );
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 60000,
    retry: 1,
  });

  // Fetch shipping address
  const { data: shippingAddress, isLoading: isAddressLoading } = useQuery({
    queryKey: ['address', orderData?.shipping_address_id],
    queryFn: async (): Promise<AddressResponse> => {
      if (!orderData?.shipping_address_id) throw new Error('Shipping address ID is required');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/addresses/${orderData.shipping_address_id}`
      );
      return response.data;
    },
    enabled: !!orderData?.shipping_address_id,
    staleTime: 60000,
    retry: 1,
  });

  // Clear cart on successful order confirmation display
  useEffect(() => {
    if (orderData && !isOrderLoading) {
      clearCart();
    }
  }, [orderData, isOrderLoading, clearCart]);

  // Pre-fill account creation form with order data
  useEffect(() => {
    if (orderData && shippingAddress && !isAuthenticated) {
      setAccountForm(prev => ({
        ...prev,
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
      }));
      setShowAccountCreation(!isAuthenticated);
    }
  }, [orderData, shippingAddress, isAuthenticated]);

  // Handle account creation form submission
  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate form
    const errors: Record<string, string> = {};
    if (!accountForm.first_name.trim()) errors.first_name = 'First name is required';
    if (!accountForm.last_name.trim()) errors.last_name = 'Last name is required';
    if (accountForm.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (accountForm.password !== accountForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    if (!accountForm.terms_accepted) errors.terms_accepted = 'You must accept the terms and conditions';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsCreatingAccount(true);
    try {
      await registerUser({
        email: orderData!.customer_email,
        password: accountForm.password,
        first_name: accountForm.first_name,
        last_name: accountForm.last_name,
        phone_number: orderData!.customer_phone || undefined,
      });

      showNotification({
        type: 'success',
        title: 'Account Created!',
        message: 'Your account has been created and your order has been associated with it.',
        auto_dismiss: true,
        duration: 5000,
      });

      setShowAccountCreation(false);
    } catch (error: any) {
      setFormErrors({ general: error.message || 'Failed to create account' });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Calculate estimated delivery date
  const getEstimatedDelivery = (): string => {
    if (!orderData?.created_at) return '';
    const orderDate = new Date(orderData.created_at);
    const estimatedDate = new Date(orderDate.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 days
    return estimatedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format currency
  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: orderData?.currency || 'USD',
    }).format(amount);
  };

  // Loading state
  if (isOrderLoading || isAddressLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your order confirmation...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (orderError || !orderData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">
              We couldn't find the order you're looking for. Please check your order number and try again.
            </p>
            <Link 
              to="/account/orders"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Header */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8 text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-lg text-gray-600 mb-4">
              Thank you for your order. We've received your purchase and will begin processing it shortly.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-2xl font-bold text-purple-600">{orderData.order_number}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Order Details */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Order Date</p>
                    <p className="font-medium">
                      {new Date(orderData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estimated Delivery</p>
                    <p className="font-medium">{getEstimatedDelivery()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Order Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {orderData.order_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {orderData.payment_status}
                    </span>
                  </div>
                </div>

                {orderData.tracking_number && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Tracking Information</p>
                    <p className="text-sm text-blue-600">Tracking Number: {orderData.tracking_number}</p>
                    <Link 
                      to={`/track-order?order_number=${orderData.order_number}&email=${orderData.customer_email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      Track Your Order →
                    </Link>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Items Ordered</h2>
                <div className="space-y-4">
                  {orderData.items?.map((item) => (
                    <div key={item.order_item_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">IMG</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                          <p className="text-sm text-gray-500">{item.brand_name}</p>
                          <p className="text-sm text-gray-500">{item.size_ml}ml</p>
                          {item.gift_wrap && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 mt-1">
                              Gift Wrapped
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatPrice(item.unit_price)}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {shippingAddress && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
                  <div className="text-gray-700">
                    <p className="font-medium">{shippingAddress.first_name} {shippingAddress.last_name}</p>
                    {shippingAddress.company && <p>{shippingAddress.company}</p>}
                    <p>{shippingAddress.address_line_1}</p>
                    {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state_province} {shippingAddress.postal_code}</p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.phone_number && <p>Phone: {shippingAddress.phone_number}</p>}
                  </div>
                </div>
              )}

              {/* Gift Message */}
              {orderData.gift_message && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Gift Message</h2>
                  <div className="p-4 bg-pink-50 rounded-lg">
                    <p className="text-gray-700 italic">"{orderData.gift_message}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatPrice(orderData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {orderData.shipping_cost > 0 ? formatPrice(orderData.shipping_cost) : 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatPrice(orderData.tax_amount)}</span>
                  </div>
                  {orderData.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(orderData.discount_amount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(orderData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Creation for Guests */}
              {!isAuthenticated && showAccountCreation && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Your Account</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Create an account to easily track this order and future purchases.
                  </p>
                  
                  <form onSubmit={handleAccountCreation} className="space-y-4">
                    {formErrors.general && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                        {formErrors.general}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={accountForm.first_name}
                          onChange={(e) => {
                            setAccountForm(prev => ({ ...prev, first_name: e.target.value }));
                            if (formErrors.first_name) setFormErrors(prev => ({ ...prev, first_name: '' }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            formErrors.first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.first_name && (
                          <p className="text-red-600 text-xs mt-1">{formErrors.first_name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={accountForm.last_name}
                          onChange={(e) => {
                            setAccountForm(prev => ({ ...prev, last_name: e.target.value }));
                            if (formErrors.last_name) setFormErrors(prev => ({ ...prev, last_name: '' }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            formErrors.last_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.last_name && (
                          <p className="text-red-600 text-xs mt-1">{formErrors.last_name}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={orderData.customer_email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={accountForm.password}
                        onChange={(e) => {
                          setAccountForm(prev => ({ ...prev, password: e.target.value }));
                          if (formErrors.password) setFormErrors(prev => ({ ...prev, password: '' }));
                        }}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Minimum 8 characters"
                      />
                      {formErrors.password && (
                        <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={accountForm.confirm_password}
                        onChange={(e) => {
                          setAccountForm(prev => ({ ...prev, confirm_password: e.target.value }));
                          if (formErrors.confirm_password) setFormErrors(prev => ({ ...prev, confirm_password: '' }));
                        }}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          formErrors.confirm_password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.confirm_password && (
                        <p className="text-red-600 text-xs mt-1">{formErrors.confirm_password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          checked={accountForm.newsletter_consent}
                          onChange={(e) => setAccountForm(prev => ({ ...prev, newsletter_consent: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-600">
                          Subscribe to our newsletter for exclusive offers and new arrivals
                        </span>
                      </label>

                      <label className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          checked={accountForm.terms_accepted}
                          onChange={(e) => {
                            setAccountForm(prev => ({ ...prev, terms_accepted: e.target.checked }));
                            if (formErrors.terms_accepted) setFormErrors(prev => ({ ...prev, terms_accepted: '' }));
                          }}
                          className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-600">
                          I agree to the <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
                        </span>
                      </label>
                      {formErrors.terms_accepted && (
                        <p className="text-red-600 text-xs">{formErrors.terms_accepted}</p>
                      )}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isCreatingAccount}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingAccount ? 'Creating...' : 'Create Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAccountCreation(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Skip
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Next?</h2>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-xs">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order Processing</p>
                      <p className="text-gray-600">We'll prepare your order within 1-2 business days.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-xs">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Shipping</p>
                      <p className="text-gray-600">Your order will be shipped with tracking information.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-xs">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Enjoy</p>
                      <p className="text-gray-600">Store in a cool, dry place away from direct sunlight.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Instructions */}
              <div className="bg-amber-50 rounded-lg p-6">
                <h3 className="font-semibold text-amber-900 mb-3">Fragrance Care Tips</h3>
                <ul className="text-sm text-amber-800 space-y-2">
                  <li>• Store in a cool, dry place away from heat and sunlight</li>
                  <li>• Keep bottles upright to prevent leakage</li>
                  <li>• Avoid extreme temperature changes</li>
                  <li>• Use within 3-5 years for best quality</li>
                </ul>
              </div>

              {/* Customer Service */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Customer Service</p>
                    <p className="text-gray-600">Mon-Fri: 9AM-6PM EST</p>
                    <p className="text-purple-600">1-800-LUXE-SCENT</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <p className="text-purple-600">support@luxescent.com</p>
                  </div>
                  <Link 
                    to="/support"
                    className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Visit Help Center →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Continue Shopping
              </Link>
              <Link
                to={`/track-order?order_number=${orderData.order_number}&email=${orderData.customer_email}`}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Track Your Order
              </Link>
              {isAuthenticated && (
                <Link
                  to="/account/orders"
                  className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  View All Orders
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_OrderConfirmation;