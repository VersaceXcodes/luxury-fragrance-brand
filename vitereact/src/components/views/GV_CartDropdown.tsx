import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas

const GV_CartDropdown: React.FC = () => {
  const [promotionalCode, setPromotionalCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Individual Zustand selectors to prevent infinite loops
  const cartDropdownOpen = useAppStore(state => state.ui_state.cart_dropdown_open);
  const cartItems = useAppStore(state => state.cart_state.items);
  const freeShippingThreshold = useAppStore(state => state.cart_state.free_shipping_threshold);
  const appliedPromotions = useAppStore(state => state.cart_state.applied_promotions);
  
  // Store actions
  const toggleCartDropdown = useAppStore(state => state.toggle_cart_dropdown);
  const updateCartItem = useAppStore(state => state.update_cart_item);
  const removeFromCart = useAppStore(state => state.remove_from_cart);
  const loadCart = useAppStore(state => state.load_cart);
  const applyPromotion = useAppStore(state => state.apply_promotion);
  const showNotification = useAppStore(state => state.show_notification);

  const queryClient = useQueryClient();

  // Load cart contents when dropdown opens
  useEffect(() => {
    if (cartDropdownOpen) {
      loadCart();
    }
  }, [cartDropdownOpen, loadCart]);

  // Update cart item quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      await updateCartItem(cartItemId, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      showNotification({
        type: 'error',
        message: 'Failed to update quantity',
        auto_dismiss: true,
        duration: 3000,
      });
    },
  });

  // Remove cart item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      await removeFromCart(cartItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => {
      showNotification({
        type: 'error',
        message: 'Failed to remove item',
        auto_dismiss: true,
        duration: 3000,
      });
    },
  });

  // Apply promotional code
  const handleApplyPromoCode = async () => {
    if (!promotionalCode.trim()) return;
    
    setIsApplyingPromo(true);
    try {
      await applyPromotion(promotionalCode);
      setPromotionalCode('');
    } catch {
      // Error handling is done in the store action
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ cartItemId, quantity: newQuantity });
  };

  // Handle remove item
  const handleRemoveItem = (cartItemId: string) => {
    removeItemMutation.mutate(cartItemId);
  };

  // Calculate totals
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalDiscount = appliedPromotions.reduce((sum, promo) => sum + promo.discount_amount, 0);
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 9.99; // Standard shipping
  const grandTotal = subtotal - totalDiscount + shippingCost;

  // Don't render if dropdown is not open
  if (!cartDropdownOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-30"
        onClick={toggleCartDropdown}
      />
      
      {/* Cart Dropdown */}
      <div className="absolute top-full right-0 mt-2 w-96 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-40 max-h-96 flex flex-col">
        {/* Cart Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Shopping Cart ({itemCount})
          </h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-900">
              ${grandTotal.toFixed(2)}
            </span>
            <button
              onClick={toggleCartDropdown}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cart Content */}
        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h4>
            <p className="text-gray-500 text-sm mb-4">Discover our exquisite fragrance collection</p>
            <Link
              to="/products"
              onClick={toggleCartDropdown}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
              {cartItems.map((item) => (
                <div key={item.cart_item_id} className="flex items-center space-x-3">
                  {/* Product Image Placeholder */}
                  <div className="w-15 h-15 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.product_name || 'Product'}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {item.brand_name || 'Brand'} • {item.size_ml}ml
                    </p>
                    <p className="text-sm font-medium text-purple-600">
                      ${item.unit_price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-900 w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                      disabled={updateQuantityMutation.isPending}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.cart_item_id)}
                    disabled={removeItemMutation.isPending}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Applied Promotions */}
              {appliedPromotions.map((promo, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-green-600">{promo.promotion_code}</span>
                  <span className="text-green-600 font-medium">
                    -${promo.discount_amount.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                {subtotal >= freeShippingThreshold ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                )}
              </div>

              {/* Free Shipping Progress */}
              {subtotal < freeShippingThreshold && (
                <div className="text-xs text-gray-500">
                  Add ${(freeShippingThreshold - subtotal).toFixed(2)} more for free shipping
                </div>
              )}

              {/* Promotional Code Entry */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={promotionalCode}
                  onChange={(e) => setPromotionalCode(e.target.value)}
                  placeholder="Promo code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleApplyPromoCode}
                  disabled={!promotionalCode.trim() || isApplyingPromo}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </button>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-3">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              <Link
                to="/checkout"
                onClick={toggleCartDropdown}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors text-center block"
              >
                Checkout
              </Link>
              <div className="flex space-x-3">
                <Link
                  to="/cart"
                  onClick={toggleCartDropdown}
                  className="flex-1 bg-gray-100 text-gray-900 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                >
                  View Cart
                </Link>
                <button
                  onClick={toggleCartDropdown}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default GV_CartDropdown;