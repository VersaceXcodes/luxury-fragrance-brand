import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas
interface Address {
  address_id: string;
  user_id: string;
  address_type: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number?: string;
  is_default: boolean;
  created_at: string;
}

interface ShippingMethod {
  shipping_method_id: string;
  method_name: string;
  description?: string;
  cost: number;
  free_threshold?: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_express: boolean;
  requires_signature: boolean;
  is_active: boolean;
  sort_order: number;
}

interface CreateAddressRequest {
  address_type: string;
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number?: string;
  is_default: boolean;
}

interface CreateOrderRequest {
  user_id?: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address_id: string;
  billing_address_id: string;
  shipping_method_id: string;
  payment_method_id?: string;
  gift_message?: string;
  special_instructions?: string;
  customer_email: string;
  customer_phone?: string;
}


const UV_Checkout: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Zustand state - individual selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartItems = useAppStore(state => state.cart_state.items);
  const cartSubtotal = useAppStore(state => state.cart_state.subtotal);
  const cartItemCount = useAppStore(state => state.cart_state.item_count);
  const appliedPromotions = useAppStore(state => state.cart_state.applied_promotions);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state for checkout process
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Shipping form state
  const [shippingForm, setShippingForm] = useState({
    email: currentUser?.email || '',
    phone: currentUser?.phone_number || '',
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    use_as_billing: true
  });

  const [billingForm, setBillingForm] = useState({
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States'
  });

  const [selectedShippingAddress, setSelectedShippingAddress] = useState<string>('');
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<string>('');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');

  // Gift options
  const [giftOptions, setGiftOptions] = useState({
    gift_wrap: false,
    gift_message: '',
    gift_receipt: false,
    special_delivery_date: ''
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
    cardholder_name: '',
    payment_type: 'card' as 'card' | 'paypal' | 'apple_pay' | 'google_pay'
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItemCount === 0) {
      navigate('/cart');
    }
  }, [cartItemCount, navigate]);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  // Fetch user addresses (authenticated users only)
  const { data: userAddresses = [] } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: async (): Promise<Address[]> => {
      if (!isAuthenticated || !authToken) return [];
      
      const response = await axios.get(`${getApiUrl()}/api/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: isAuthenticated && !!authToken,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch shipping methods
  const { data: shippingMethods = [] } = useQuery({
    queryKey: ['shipping-methods', cartSubtotal],
    queryFn: async (): Promise<ShippingMethod[]> => {
      const response = await axios.get(`${getApiUrl()}/api/shipping-methods`, {
        params: {
          is_active: true,
          order_total: cartSubtotal
        }
      });
      // Parse cost fields from string to number (PostgreSQL returns DECIMAL as string)
      return response.data.map((method: any) => ({
        ...method,
        cost: parseFloat(method.calculated_cost || method.cost || 0),
        free_threshold: method.free_threshold ? parseFloat(method.free_threshold) : null
      }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Create new address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (addressData: CreateAddressRequest): Promise<Address> => {
      const response = await axios.post(`${getApiUrl()}/api/addresses`, addressData, {
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      showNotification({
        type: 'success',
        message: 'Address saved successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to save address';
      showNotification({
        type: 'error',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderRequest) => {
      const response = await axios.post(`${getApiUrl()}/api/orders`, orderData, {
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      return response.data;
    },
    onSuccess: (order) => {
      showNotification({
        type: 'success',
        message: 'Order placed successfully!',
        auto_dismiss: true,
        duration: 5000
      });
      navigate('/order-confirmation', { state: { order } });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create order';
      showNotification({
        type: 'error',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000
      });
      setIsProcessingOrder(false);
    }
  });

  // Calculate totals
  const selectedShipping = shippingMethods.find(method => method.shipping_method_id === selectedShippingMethod);
  const shippingCost = selectedShipping?.cost || 0;
  const discountAmount = appliedPromotions.reduce((sum, promo) => sum + promo.discount_amount, 0);
  const taxAmount = Math.round((cartSubtotal - discountAmount) * 0.07 * 100) / 100; // 7% tax
  const totalAmount = cartSubtotal + shippingCost + taxAmount - discountAmount;

  // Form validation
  const validateShippingForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Always validate email
    if (!shippingForm.email) errors.email = 'Email is required';

    // Only validate shipping address fields if not using a saved address
    if (!selectedShippingAddress) {
      if (!shippingForm.first_name) errors.first_name = 'First name is required';
      if (!shippingForm.last_name) errors.last_name = 'Last name is required';
      if (!shippingForm.address_line_1) errors.address_line_1 = 'Address is required';
      if (!shippingForm.city) errors.city = 'City is required';
      if (!shippingForm.state_province) errors.state_province = 'State/Province is required';
      if (!shippingForm.postal_code) errors.postal_code = 'Postal code is required';
      if (!shippingForm.country) errors.country = 'Country is required';
    }

    // Only validate billing address if not using shipping as billing and not using saved billing address
    if (!shippingForm.use_as_billing && !selectedBillingAddress) {
      if (!billingForm.first_name) errors.billing_first_name = 'Billing first name is required';
      if (!billingForm.last_name) errors.billing_last_name = 'Billing last name is required';
      if (!billingForm.address_line_1) errors.billing_address_line_1 = 'Billing address is required';
      if (!billingForm.city) errors.billing_city = 'Billing city is required';
      if (!billingForm.state_province) errors.billing_state_province = 'Billing state is required';
      if (!billingForm.postal_code) errors.billing_postal_code = 'Billing postal code is required';
    }

    if (!selectedShippingMethod) errors.shipping_method = 'Please select a shipping method';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePaymentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (paymentForm.payment_type === 'card') {
      if (!paymentForm.card_number) errors.card_number = 'Card number is required';
      if (!paymentForm.exp_month) errors.exp_month = 'Expiration month is required';
      if (!paymentForm.exp_year) errors.exp_year = 'Expiration year is required';
      if (!paymentForm.cvv) errors.cvv = 'CVV is required';
      if (!paymentForm.cardholder_name) errors.cardholder_name = 'Cardholder name is required';
    }

    if (!termsAccepted) errors.terms = 'You must accept the terms and conditions';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submissions
  const handleShippingSubmit = async () => {
    if (!validateShippingForm()) {
      showNotification({
        type: 'error',
        message: 'Please fill in all required fields',
        auto_dismiss: true,
        duration: 5000
      });
      return;
    }

    // Create addresses if needed
    try {
      let shippingAddressId = selectedShippingAddress;
      let billingAddressId = selectedBillingAddress;

      // Create shipping address if not using a saved one
      if (!shippingAddressId) {
        const shippingAddress = await createAddressMutation.mutateAsync({
          address_type: 'shipping',
          first_name: shippingForm.first_name,
          last_name: shippingForm.last_name,
          company: shippingForm.company || undefined,
          address_line_1: shippingForm.address_line_1,
          address_line_2: shippingForm.address_line_2 || undefined,
          city: shippingForm.city,
          state_province: shippingForm.state_province,
          postal_code: shippingForm.postal_code,
          country: shippingForm.country,
          phone_number: shippingForm.phone || undefined,
          is_default: false
        });
        shippingAddressId = shippingAddress.address_id;
      }

      // Handle billing address
      if (!billingAddressId) {
        if (shippingForm.use_as_billing) {
          billingAddressId = shippingAddressId;
        } else {
          const billingAddress = await createAddressMutation.mutateAsync({
            address_type: 'billing',
            first_name: billingForm.first_name,
            last_name: billingForm.last_name,
            company: billingForm.company || undefined,
            address_line_1: billingForm.address_line_1,
            address_line_2: billingForm.address_line_2 || undefined,
            city: billingForm.city,
            state_province: billingForm.state_province,
            postal_code: billingForm.postal_code,
            country: billingForm.country,
            is_default: false
          });
          billingAddressId = billingAddress.address_id;
        }
      }

      // Update state and move to next step
      setSelectedShippingAddress(shippingAddressId);
      setSelectedBillingAddress(billingAddressId);
      setCurrentStep('payment');
      
      // Clear any form errors
      setFormErrors({});
    } catch (error) {
      // Error handling is done in mutation callbacks
      console.error('Error submitting shipping information:', error);
    }
  };

  const handlePaymentSubmit = () => {
    if (!validatePaymentForm()) return;
    setCurrentStep('review');
  };

  const handleOrderSubmit = async () => {
    setIsProcessingOrder(true);

    const orderData: CreateOrderRequest = {
      user_id: currentUser?.user_id || undefined,
      subtotal: cartSubtotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      currency: 'USD',
      shipping_address_id: selectedShippingAddress,
      billing_address_id: selectedBillingAddress,
      shipping_method_id: selectedShippingMethod,
      payment_method_id: paymentForm.payment_type,
      gift_message: giftOptions.gift_message || undefined,
      special_instructions: giftOptions.special_delivery_date || undefined,
      customer_email: shippingForm.email,
      customer_phone: shippingForm.phone || undefined
    };

    createOrderMutation.mutate(orderData);
  };

  const steps = ['shipping', 'payment', 'review'];
  const stepLabels = {
    shipping: 'Shipping',
    payment: 'Payment',
    review: 'Review'
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center justify-center space-x-5">
                {steps.map((step, index) => {
                  const isCurrentStep = step === currentStep;
                  const isCompletedStep = steps.indexOf(currentStep) > index;
                  
                  return (
                    <li key={step} className="flex items-center">
                      {index > 0 && (
                        <div className={`flex-auto border-t-2 transition-colors duration-200 ${
                          isCompletedStep ? 'border-purple-600' : 'border-gray-300'
                        }`} />
                      )}
                      <button
                        onClick={() => {
                          if (isCompletedStep || (step === 'payment' && currentStep !== 'shipping')) {
                            setCurrentStep(step as any);
                          }
                        }}
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                          isCurrentStep
                            ? 'bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2'
                            : isCompletedStep
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-white border-2 border-gray-300 text-gray-500 hover:border-gray-400'
                        }`}
                        disabled={!isCompletedStep && !isCurrentStep && step !== 'payment'}
                      >
                        {isCompletedStep ? (
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </button>
                      <span className={`ml-2 text-sm font-medium ${
                        isCurrentStep ? 'text-purple-600' : isCompletedStep ? 'text-purple-600' : 'text-gray-500'
                      }`}>
                        {stepLabels[step as keyof typeof stepLabels]}
                      </span>
                      {index < steps.length - 1 && (
                        <div className={`flex-auto border-t-2 transition-colors duration-200 ${
                          isCompletedStep ? 'border-purple-600' : 'border-gray-300'
                        }`} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Checkout Form */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm rounded-lg p-6">
                {/* Guest vs Account Options */}
                {currentStep === 'shipping' && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Account & Contact</h2>
                    
                    {!isAuthenticated && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-purple-900">Already have an account?</h3>
                            <p className="text-sm text-purple-700">Sign in for faster checkout and order tracking</p>
                          </div>
                          <Link
                            to="/login?redirect_to=/checkout"
                            className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                          >
                            Sign In
                          </Link>
                        </div>
                      </div>
                    )}

                    {isAuthenticated && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <h3 className="text-sm font-medium text-green-900">Welcome back, {currentUser?.first_name}!</h3>
                            <p className="text-sm text-green-700">You're signed in to your account</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={shippingForm.email}
                          onChange={(e) => {
                            setShippingForm(prev => ({ ...prev, email: e.target.value }));
                            if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                            formErrors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="your@email.com"
                        />
                        {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={shippingForm.phone}
                          onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Information */}
                {currentStep === 'shipping' && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>

                    {/* Saved Addresses for Authenticated Users */}
                    {isAuthenticated && userAddresses.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Choose from saved addresses</h3>
                        <div className="space-y-2">
                          {userAddresses.filter(addr => addr.address_type !== 'billing').map((address) => (
                            <label key={address.address_id} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="saved_shipping_address"
                                value={address.address_id}
                                checked={selectedShippingAddress === address.address_id}
                                onChange={(e) => setSelectedShippingAddress(e.target.value)}
                                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {address.first_name} {address.last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {address.address_line_1}
                                  {address.address_line_2 && `, ${address.address_line_2}`}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {address.city}, {address.state_province} {address.postal_code}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="saved_shipping_address"
                              value=""
                              checked={selectedShippingAddress === ''}
                              onChange={() => setSelectedShippingAddress('')}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                            />
                            <span className="text-sm font-medium text-gray-700">Use a new address</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Shipping Address Form */}
                    {(!isAuthenticated || selectedShippingAddress === '') && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                              First Name *
                            </label>
                            <input
                              type="text"
                              id="first_name"
                              value={shippingForm.first_name}
                              onChange={(e) => {
                                setShippingForm(prev => ({ ...prev, first_name: e.target.value }));
                                if (formErrors.first_name) setFormErrors(prev => ({ ...prev, first_name: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.first_name && <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>}
                          </div>

                          <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                              Last Name *
                            </label>
                            <input
                              type="text"
                              id="last_name"
                              value={shippingForm.last_name}
                              onChange={(e) => {
                                setShippingForm(prev => ({ ...prev, last_name: e.target.value }));
                                if (formErrors.last_name) setFormErrors(prev => ({ ...prev, last_name: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.last_name && <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                            Company (Optional)
                          </label>
                          <input
                            type="text"
                            id="company"
                            value={shippingForm.company}
                            onChange={(e) => setShippingForm(prev => ({ ...prev, company: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="address_line_1" className="block text-sm font-medium text-gray-700 mb-2">
                            Address *
                          </label>
                          <input
                            type="text"
                            id="address_line_1"
                            value={shippingForm.address_line_1}
                            onChange={(e) => {
                              setShippingForm(prev => ({ ...prev, address_line_1: e.target.value }));
                              if (formErrors.address_line_1) setFormErrors(prev => ({ ...prev, address_line_1: '' }));
                            }}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                              formErrors.address_line_1 ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="123 Main St"
                          />
                          {formErrors.address_line_1 && <p className="mt-1 text-sm text-red-600">{formErrors.address_line_1}</p>}
                        </div>

                        <div>
                          <label htmlFor="address_line_2" className="block text-sm font-medium text-gray-700 mb-2">
                            Apartment, suite, etc. (Optional)
                          </label>
                          <input
                            type="text"
                            id="address_line_2"
                            value={shippingForm.address_line_2}
                            onChange={(e) => setShippingForm(prev => ({ ...prev, address_line_2: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Apt 4B"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                              City *
                            </label>
                            <input
                              type="text"
                              id="city"
                              value={shippingForm.city}
                              onChange={(e) => {
                                setShippingForm(prev => ({ ...prev, city: e.target.value }));
                                if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.city ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.city && <p className="mt-1 text-sm text-red-600">{formErrors.city}</p>}
                          </div>

                          <div>
                            <label htmlFor="state_province" className="block text-sm font-medium text-gray-700 mb-2">
                              State/Province *
                            </label>
                            <input
                              type="text"
                              id="state_province"
                              value={shippingForm.state_province}
                              onChange={(e) => {
                                setShippingForm(prev => ({ ...prev, state_province: e.target.value }));
                                if (formErrors.state_province) setFormErrors(prev => ({ ...prev, state_province: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.state_province ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.state_province && <p className="mt-1 text-sm text-red-600">{formErrors.state_province}</p>}
                          </div>

                          <div>
                            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                              Postal Code *
                            </label>
                            <input
                              type="text"
                              id="postal_code"
                              value={shippingForm.postal_code}
                              onChange={(e) => {
                                setShippingForm(prev => ({ ...prev, postal_code: e.target.value }));
                                if (formErrors.postal_code) setFormErrors(prev => ({ ...prev, postal_code: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.postal_code ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.postal_code && <p className="mt-1 text-sm text-red-600">{formErrors.postal_code}</p>}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                            Country *
                          </label>
                          <select
                            id="country"
                            value={shippingForm.country}
                            onChange={(e) => setShippingForm(prev => ({ ...prev, country: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="France">France</option>
                            <option value="Germany">Germany</option>
                            <option value="Italy">Italy</option>
                            <option value="Spain">Spain</option>
                            <option value="Australia">Australia</option>
                            <option value="Japan">Japan</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Billing Address Options */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                      
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="billing_option"
                            checked={shippingForm.use_as_billing}
                            onChange={() => setShippingForm(prev => ({ ...prev, use_as_billing: true }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Same as shipping address</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="billing_option"
                            checked={!shippingForm.use_as_billing}
                            onChange={() => setShippingForm(prev => ({ ...prev, use_as_billing: false }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Use different billing address</span>
                        </label>
                      </div>

                      {/* Billing Address Form */}
                      {!shippingForm.use_as_billing && (
                        <div className="mt-4 space-y-4 pl-7">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Name *
                              </label>
                              <input
                                type="text"
                                value={billingForm.first_name}
                                onChange={(e) => {
                                  setBillingForm(prev => ({ ...prev, first_name: e.target.value }));
                                  if (formErrors.billing_first_name) setFormErrors(prev => ({ ...prev, billing_first_name: '' }));
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                  formErrors.billing_first_name ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.billing_first_name && <p className="mt-1 text-sm text-red-600">{formErrors.billing_first_name}</p>}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Name *
                              </label>
                              <input
                                type="text"
                                value={billingForm.last_name}
                                onChange={(e) => {
                                  setBillingForm(prev => ({ ...prev, last_name: e.target.value }));
                                  if (formErrors.billing_last_name) setFormErrors(prev => ({ ...prev, billing_last_name: '' }));
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                  formErrors.billing_last_name ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.billing_last_name && <p className="mt-1 text-sm text-red-600">{formErrors.billing_last_name}</p>}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Address *
                            </label>
                            <input
                              type="text"
                              value={billingForm.address_line_1}
                              onChange={(e) => {
                                setBillingForm(prev => ({ ...prev, address_line_1: e.target.value }));
                                if (formErrors.billing_address_line_1) setFormErrors(prev => ({ ...prev, billing_address_line_1: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.billing_address_line_1 ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.billing_address_line_1 && <p className="mt-1 text-sm text-red-600">{formErrors.billing_address_line_1}</p>}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City *
                              </label>
                              <input
                                type="text"
                                value={billingForm.city}
                                onChange={(e) => {
                                  setBillingForm(prev => ({ ...prev, city: e.target.value }));
                                  if (formErrors.billing_city) setFormErrors(prev => ({ ...prev, billing_city: '' }));
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                  formErrors.billing_city ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.billing_city && <p className="mt-1 text-sm text-red-600">{formErrors.billing_city}</p>}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                State/Province *
                              </label>
                              <input
                                type="text"
                                value={billingForm.state_province}
                                onChange={(e) => {
                                  setBillingForm(prev => ({ ...prev, state_province: e.target.value }));
                                  if (formErrors.billing_state_province) setFormErrors(prev => ({ ...prev, billing_state_province: '' }));
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                  formErrors.billing_state_province ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.billing_state_province && <p className="mt-1 text-sm text-red-600">{formErrors.billing_state_province}</p>}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Postal Code *
                              </label>
                              <input
                                type="text"
                                value={billingForm.postal_code}
                                onChange={(e) => {
                                  setBillingForm(prev => ({ ...prev, postal_code: e.target.value }));
                                  if (formErrors.billing_postal_code) setFormErrors(prev => ({ ...prev, billing_postal_code: '' }));
                                }}
                                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                  formErrors.billing_postal_code ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.billing_postal_code && <p className="mt-1 text-sm text-red-600">{formErrors.billing_postal_code}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shipping Methods */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Method</h3>
                      
                      {shippingMethods.length > 0 ? (
                        <div className="space-y-3">
                          {shippingMethods.map((method) => (
                            <label key={method.shipping_method_id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  name="shipping_method"
                                  value={method.shipping_method_id}
                                  checked={selectedShippingMethod === method.shipping_method_id}
                                  onChange={(e) => {
                                    setSelectedShippingMethod(e.target.value);
                                    if (formErrors.shipping_method) setFormErrors(prev => ({ ...prev, shipping_method: '' }));
                                  }}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 flex items-center">
                                    {method.method_name}
                                    {method.is_express && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                        Express
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {method.estimated_days_min === method.estimated_days_max 
                                      ? `${method.estimated_days_min} business day${method.estimated_days_min > 1 ? 's' : ''}`
                                      : `${method.estimated_days_min}-${method.estimated_days_max} business days`
                                    }
                                  </div>
                                  {method.description && (
                                    <div className="text-sm text-gray-500">{method.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {method.cost === 0 ? 'Free' : `$${method.cost.toFixed(2)}`}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Loading shipping methods...</div>
                      )}
                      
                      {formErrors.shipping_method && <p className="mt-2 text-sm text-red-600">{formErrors.shipping_method}</p>}
                    </div>

                    {/* Gift Options */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Gift Options</h3>
                      
                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={giftOptions.gift_wrap}
                            onChange={(e) => setGiftOptions(prev => ({ ...prev, gift_wrap: e.target.checked }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Gift wrapping (+$5.00)</span>
                        </label>

                        <div>
                          <label htmlFor="gift_message" className="block text-sm font-medium text-gray-700 mb-2">
                            Gift Message (Optional)
                          </label>
                          <textarea
                            id="gift_message"
                            rows={3}
                            value={giftOptions.gift_message}
                            onChange={(e) => setGiftOptions(prev => ({ ...prev, gift_message: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Your personal message here..."
                            maxLength={200}
                          />
                          <div className="mt-1 text-sm text-gray-500">
                            {giftOptions.gift_message.length}/200 characters
                          </div>
                        </div>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={giftOptions.gift_receipt}
                            onChange={(e) => setGiftOptions(prev => ({ ...prev, gift_receipt: e.target.checked }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Include gift receipt (hide prices)</span>
                        </label>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleShippingSubmit}
                        disabled={createAddressMutation.isPending}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {createAddressMutation.isPending ? 'Saving...' : 'Continue to Payment'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment Step */}
                {currentStep === 'payment' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Information</h2>

                    {/* Security Badges */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                          <h3 className="text-sm font-medium text-green-900">Secure Checkout</h3>
                          <p className="text-sm text-green-700">Your payment information is encrypted and secure</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-auto">
                          <span className="text-xs text-green-600 font-medium">SSL</span>
                          <span className="text-xs text-green-600 font-medium">PCI Compliant</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-4 mb-6">
                      <h3 className="text-sm font-medium text-gray-700">Choose Payment Method</h3>
                      
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment_type"
                            value="card"
                            checked={paymentForm.payment_type === 'card'}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Credit or Debit Card</span>
                            <div className="flex space-x-1">
                              <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">VISA</div>
                              <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center">MC</div>
                              <div className="w-8 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center">AMEX</div>
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment_type"
                            value="paypal"
                            checked={paymentForm.payment_type === 'paypal'}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">PayPal</span>
                          <div className="w-16 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">PayPal</div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="payment_type"
                            value="apple_pay"
                            checked={paymentForm.payment_type === 'apple_pay'}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_type: e.target.value as any }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Apple Pay</span>
                          <div className="w-16 h-5 bg-black rounded text-white text-xs flex items-center justify-center"> Pay</div>
                        </label>
                      </div>
                    </div>

                    {/* Credit Card Form */}
                    {paymentForm.payment_type === 'card' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="card_number" className="block text-sm font-medium text-gray-700 mb-2">
                            Card Number *
                          </label>
                          <input
                            type="text"
                            id="card_number"
                            value={paymentForm.card_number}
                            onChange={(e) => {
                              setPaymentForm(prev => ({ ...prev, card_number: e.target.value }));
                              if (formErrors.card_number) setFormErrors(prev => ({ ...prev, card_number: '' }));
                            }}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                              formErrors.card_number ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                          />
                          {formErrors.card_number && <p className="mt-1 text-sm text-red-600">{formErrors.card_number}</p>}
                        </div>

                        <div>
                          <label htmlFor="cardholder_name" className="block text-sm font-medium text-gray-700 mb-2">
                            Cardholder Name *
                          </label>
                          <input
                            type="text"
                            id="cardholder_name"
                            value={paymentForm.cardholder_name}
                            onChange={(e) => {
                              setPaymentForm(prev => ({ ...prev, cardholder_name: e.target.value }));
                              if (formErrors.cardholder_name) setFormErrors(prev => ({ ...prev, cardholder_name: '' }));
                            }}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                              formErrors.cardholder_name ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="John Doe"
                          />
                          {formErrors.cardholder_name && <p className="mt-1 text-sm text-red-600">{formErrors.cardholder_name}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="exp_month" className="block text-sm font-medium text-gray-700 mb-2">
                              Month *
                            </label>
                            <select
                              id="exp_month"
                              value={paymentForm.exp_month}
                              onChange={(e) => {
                                setPaymentForm(prev => ({ ...prev, exp_month: e.target.value }));
                                if (formErrors.exp_month) setFormErrors(prev => ({ ...prev, exp_month: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.exp_month ? 'border-red-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">MM</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month.toString().padStart(2, '0')}>
                                  {month.toString().padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                            {formErrors.exp_month && <p className="mt-1 text-sm text-red-600">{formErrors.exp_month}</p>}
                          </div>

                          <div>
                            <label htmlFor="exp_year" className="block text-sm font-medium text-gray-700 mb-2">
                              Year *
                            </label>
                            <select
                              id="exp_year"
                              value={paymentForm.exp_year}
                              onChange={(e) => {
                                setPaymentForm(prev => ({ ...prev, exp_year: e.target.value }));
                                if (formErrors.exp_year) setFormErrors(prev => ({ ...prev, exp_year: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.exp_year ? 'border-red-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">YYYY</option>
                              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                <option key={year} value={year.toString()}>{year}</option>
                              ))}
                            </select>
                            {formErrors.exp_year && <p className="mt-1 text-sm text-red-600">{formErrors.exp_year}</p>}
                          </div>

                          <div>
                            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                              CVV *
                            </label>
                            <input
                              type="text"
                              id="cvv"
                              value={paymentForm.cvv}
                              onChange={(e) => {
                                setPaymentForm(prev => ({ ...prev, cvv: e.target.value }));
                                if (formErrors.cvv) setFormErrors(prev => ({ ...prev, cvv: '' }));
                              }}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                formErrors.cvv ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="123"
                              maxLength={4}
                            />
                            {formErrors.cvv && <p className="mt-1 text-sm text-red-600">{formErrors.cvv}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alternative Payment Methods */}
                    {paymentForm.payment_type === 'paypal' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-700">You will be redirected to PayPal to complete your payment securely.</p>
                      </div>
                    )}

                    {paymentForm.payment_type === 'apple_pay' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">Use Touch ID or Face ID to pay with Apple Pay.</p>
                      </div>
                    )}

                    {/* Terms and Conditions */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="space-y-4">
                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (formErrors.terms) setFormErrors(prev => ({ ...prev, terms: '' }));
                            }}
                            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <div className="text-sm text-gray-600">
                            I accept the{' '}
                            <Link to="/terms" className="text-purple-600 hover:text-purple-500">
                              Terms and Conditions
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-purple-600 hover:text-purple-500">
                              Privacy Policy
                            </Link>
                          </div>
                        </label>
                        {formErrors.terms && <p className="text-sm text-red-600">{formErrors.terms}</p>}

                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={newsletterOptIn}
                            onChange={(e) => setNewsletterOptIn(e.target.checked)}
                            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <div className="text-sm text-gray-600">
                            I would like to receive email updates about new arrivals and exclusive offers
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={handlePaymentSubmit}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                      >
                        Review Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Step */}
                {currentStep === 'review' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Review Your Order</h2>

                    {/* Shipping Address */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
                      <div className="text-sm text-gray-600">
                        <div>{shippingForm.first_name} {shippingForm.last_name}</div>
                        <div>{shippingForm.address_line_1}</div>
                        {shippingForm.address_line_2 && <div>{shippingForm.address_line_2}</div>}
                        <div>{shippingForm.city}, {shippingForm.state_province} {shippingForm.postal_code}</div>
                        <div>{shippingForm.country}</div>
                      </div>
                    </div>

                    {/* Shipping Method */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Method</h3>
                      <div className="text-sm text-gray-600">
                        {selectedShipping?.method_name} - {selectedShipping?.cost === 0 ? 'Free' : `$${selectedShipping?.cost.toFixed(2)}`}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
                      <div className="text-sm text-gray-600">
                        {paymentForm.payment_type === 'card' && `Card ending in ${paymentForm.card_number.slice(-4)}`}
                        {paymentForm.payment_type === 'paypal' && 'PayPal'}
                        {paymentForm.payment_type === 'apple_pay' && 'Apple Pay'}
                        {paymentForm.payment_type === 'google_pay' && 'Google Pay'}
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <div className="mt-8">
                      <button
                        onClick={handleOrderSubmit}
                        disabled={isProcessingOrder || createOrderMutation.isPending}
                        className="w-full bg-purple-600 text-white py-4 px-4 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                      >
                        {isProcessingOrder || createOrderMutation.isPending ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing Order...
                          </div>
                        ) : (
                          `Place Order - $${totalAmount.toFixed(2)}`
                        )}
                      </button>

                      <p className="mt-3 text-xs text-gray-500 text-center">
                        By placing your order, you agree to our terms and conditions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow-sm rounded-lg p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.cart_item_id} className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                        <div className="text-xs text-gray-500 text-center">
                          {item.product_name}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{item.product_name}</h3>
                        <p className="text-sm text-gray-600">{item.brand_name}</p>
                        <p className="text-sm text-gray-500">{item.size_ml}ml • Qty: {item.quantity}</p>
                        {item.gift_wrap && (
                          <p className="text-xs text-purple-600">Gift wrapped</p>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>

                  {appliedPromotions.map((promo) => (
                    <div key={promo.promotion_code} className="flex justify-between text-sm text-green-600">
                      <span>{promo.description}</span>
                      <span>-${promo.discount_amount.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>

                  {giftOptions.gift_wrap && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Gift wrapping</span>
                      <span>$5.00</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold text-gray-900">
                    <span>Total</span>
                    <span>${(totalAmount + (giftOptions.gift_wrap ? 5 : 0)).toFixed(2)}</span>
                  </div>
                </div>

                {/* Security Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>SSL Encrypted</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>PCI Compliant</span>
                    </div>
                  </div>
                </div>

                {/* Age Verification Notice */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">
                    By purchasing, you confirm you are 18+ years old as required for fragrance purchases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Checkout;