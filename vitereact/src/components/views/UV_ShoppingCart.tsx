import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// API Types
interface ShippingMethod {
  shipping_method_id: string;
  method_name: string;
  description: string | null;
  cost: number;
  free_threshold: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_express: boolean;
  requires_signature: boolean;
}



const UV_ShoppingCart: React.FC = () => {
  // Zustand state selectors (individual to prevent infinite loops)
  const cartItems = useAppStore(state => state.cart_state.items);
  const itemCount = useAppStore(state => state.cart_state.item_count);
  const subtotal = useAppStore(state => state.cart_state.subtotal);
  const shippingCost = useAppStore(state => state.cart_state.shipping_cost);
  const taxAmount = useAppStore(state => state.cart_state.tax_amount);
  const total = useAppStore(state => state.cart_state.total);
  const appliedPromotions = useAppStore(state => state.cart_state.applied_promotions);
  const freeShippingThreshold = useAppStore(state => state.cart_state.free_shipping_threshold);

  
  // Zustand actions
  const updateCartItem = useAppStore(state => state.update_cart_item);
  const removeFromCart = useAppStore(state => state.remove_from_cart);
  const applyPromotion = useAppStore(state => state.apply_promotion);
  const loadCart = useAppStore(state => state.load_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state
  const [zipCode, setZipCode] = useState('');
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');
  const [promotionCode, setPromotionCode] = useState('');
  const [isApplyingPromotion, setIsApplyingPromotion] = useState(false);
  const [removedItems, setRemovedItems] = useState<Array<{item: any, timestamp: number}>>([]);

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Shipping methods query
  const { data: shippingMethods = [] } = useQuery({
    queryKey: ['shipping-methods', zipCode, subtotal],
    queryFn: async () => {
      if (!zipCode) return [];
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/shipping-methods`,
        {
          params: {
            is_active: true,
            destination_postal_code: zipCode,
            order_total: subtotal
          }
        }
      );
      return response.data.map((method: any) => ({
        ...method,
        cost: Number(method.cost || 0)
      }));
    },
    enabled: !!zipCode && subtotal > 0,
    staleTime: 300000, // 5 minutes
    retry: 1
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      await updateCartItem(cartItemId, { quantity });
    },
    onError: () => {
      showNotification({
        type: 'error',
        message: 'Failed to update quantity',
        auto_dismiss: true,
        duration: 3000
      });
    }
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      const item = cartItems.find(item => item.cart_item_id === cartItemId);
      if (item) {
        setRemovedItems(prev => [...prev, { item, timestamp: Date.now() }]);
      }
      await removeFromCart(cartItemId);
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Item removed from cart',
        auto_dismiss: true,
        duration: 3000
      });
    }
  });

  // Apply promotion handler
  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) return;
    
    setIsApplyingPromotion(true);
    try {
      await applyPromotion(promotionCode.trim());
      setPromotionCode('');
    } catch {
      // Error handled in store
    } finally {
      setIsApplyingPromotion(false);
    }
  };

  // Calculate free shipping progress
  const freeShippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const amountToFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  // Handle quantity change
  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ cartItemId, quantity: newQuantity });
  };

  // Handle restore removed item
  const handleRestoreItem = async (removedItem: any) => {
    try {
      await useAppStore.getState().add_to_cart({
        product_id: removedItem.item.product_id,
        product_name: removedItem.item.product_name,
        brand_name: removedItem.item.brand_name,
        size_ml: removedItem.item.size_ml,
        quantity: removedItem.item.quantity,
        unit_price: removedItem.item.unit_price,
        gift_wrap: removedItem.item.gift_wrap,
        sample_included: removedItem.item.sample_included
      });
      
      setRemovedItems(prev => 
        prev.filter(item => item.timestamp !== removedItem.timestamp)
      );
    } catch {
      // Error handled in store
    }
  };

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-light text-gray-900 mb-4">Your cart is empty</h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Discover our curated collection of luxury fragrances and find your perfect scent
              </p>
              
              <div className="space-y-4">
                <Link
                  to="/products"
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  Continue Shopping
                </Link>
                
                <div className="block">
                  <Link
                    to="/fragrance-finder"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Take our fragrance quiz to find your perfect match
                  </Link>
                </div>
              </div>
            </div>

            {/* Recently removed items */}
            {removedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recently Removed</h3>
                <div className="space-y-3">
                  {removedItems.slice(0, 3).map((removedItem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div>
                          <p className="font-medium text-gray-900">{removedItem.item.product_name}</p>
                          <p className="text-sm text-gray-600">{removedItem.item.brand_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreItem(removedItem)}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-2">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Free shipping progress */}
                {subtotal < freeShippingThreshold && (
                  <div className="p-6 border-b border-gray-200">
                    <div className="mb-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Free shipping progress</span>
                        <span className="text-gray-900 font-medium">
                          ${amountToFreeShipping.toFixed(2)} away from free shipping
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${freeShippingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Cart items table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">Product</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">Size</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">Price</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">Quantity</th>
                        <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cartItems.map((item) => (
                        <tr key={item.cart_item_id} className="hover:bg-gray-50">
                          <td className="py-6 px-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                              <div>
                                <Link 
                                  to={`/products/${item.product_id}`}
                                  className="font-medium text-gray-900 hover:text-purple-600"
                                >
                                  {item.product_name}
                                </Link>
                                <p className="text-sm text-gray-600">{item.brand_name}</p>
                                {item.gift_wrap && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                    Gift Wrapped
                                  </span>
                                )}
                                {item.sample_included && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1 ml-2">
                                    Sample Included
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-6 px-6 text-sm text-gray-900">
                            {item.size_ml}ml
                          </td>
                          <td className="py-6 px-6 text-sm text-gray-900">
                            ${Number(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="py-6 px-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                              >
                                -
                              </button>
                              <span className="w-12 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                                disabled={updateQuantityMutation.isPending}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-6 px-6 text-sm font-medium text-gray-900">
                            ${(Number(item.unit_price || 0) * item.quantity).toFixed(2)}
                          </td>
                          <td className="py-6 px-6">
                            <button
                              onClick={() => removeItemMutation.mutate(item.cart_item_id)}
                              disabled={removeItemMutation.isPending}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recently removed items */}
              {removedItems.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recently Removed</h3>
                  <div className="space-y-3">
                    {removedItems.slice(0, 3).map((removedItem, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                          <div>
                            <p className="font-medium text-gray-900">{removedItem.item.product_name}</p>
                            <p className="text-sm text-gray-600">{removedItem.item.brand_name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreItem(removedItem)}
                          className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Order Summary</h2>

                {/* Shipping Estimate */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Estimate
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Enter ZIP code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  
                  {zipCode && shippingMethods.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {shippingMethods.map((method: ShippingMethod) => (
                        <label key={method.shipping_method_id} className="flex items-center">
                          <input
                            type="radio"
                            name="shipping"
                            value={method.shipping_method_id}
                            checked={selectedShippingMethod === method.shipping_method_id}
                            onChange={(e) => setSelectedShippingMethod(e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">{method.method_name}</span>
                              <span className="text-sm">
                                {method.cost === 0 ? 'Free' : `$${method.cost.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {method.estimated_days_min}-{method.estimated_days_max} business days
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Promotion Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promotion Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promotionCode}
                      onChange={(e) => setPromotionCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleApplyPromotion}
                      disabled={!promotionCode.trim() || isApplyingPromotion}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isApplyingPromotion ? '...' : 'Apply'}
                    </button>
                  </div>
                  
                  {appliedPromotions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {appliedPromotions.map((promo, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                          <span className="text-sm text-green-800 font-medium">{promo.promotion_code}</span>
                          <span className="text-sm text-green-800">-${Number(promo.discount_amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Totals */}
                <div className="space-y-3 border-t border-gray-200 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                    <span className="text-gray-900">${Number(subtotal || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">
                      {shippingCost > 0 ? `$${Number(shippingCost || 0).toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">${Number(taxAmount || 0).toFixed(2)}</span>
                  </div>
                  
                  {appliedPromotions.map((promo, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-green-600">{promo.promotion_code}</span>
                      <span className="text-green-600">-${Number(promo.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  
                  <div className="flex justify-between text-lg font-medium border-t border-gray-200 pt-3">
                    <span>Total</span>
                    <span>${Number(total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Express Checkout */}
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button className="w-full py-2 px-3 bg-yellow-400 text-black text-sm font-medium rounded-md hover:bg-yellow-500 transition-colors">
                      PayPal
                    </button>
                    <button className="w-full py-2 px-3 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors">
                      Apple Pay
                    </button>
                    <button className="w-full py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                      Google Pay
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>
                  
                  <Link
                    to="/checkout"
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors text-center block"
                  >
                    Proceed to Checkout
                  </Link>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Secure checkout with SSL encryption
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

export default UV_ShoppingCart;