import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/main';
import { cartDrawerVariants, cartItemVariants, MOTION_CONFIG } from '@/lib/motion-config';
import { CartItemAnimation } from '@/components/ui/motion-components';
import SmartImage from '@/components/ui/SmartImage';

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
    <AnimatePresence>
      {cartDropdownOpen && (
        <>
          {/* Backdrop with fade */}
          <motion.div 
            className="fixed inset-0 bg-black z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_CONFIG.duration.fast }}
            onClick={toggleCartDropdown}
          />
          
          {/* Cart Slide-Out Drawer with Spring Physics */}
          <motion.div 
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#1A1A1A] shadow-2xl border-l border-[#C5A059] z-[60] flex flex-col"
            variants={cartDrawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Cart Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#C5A059]/30">
          <h3 className="text-xl font-semibold text-[#F5F5F0]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Shopping Cart ({itemCount})
          </h3>
          <button
            onClick={toggleCartDropdown}
            className="text-[#F5F5F0] hover:text-[#D4AF37] transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        {subtotal < freeShippingThreshold && cartItems.length > 0 && (
          <div className="p-4 border-b border-[#C5A059]/30">
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#D4AF37] font-medium">Free Shipping Progress</span>
                <span className="text-xs text-[#D4AF37] font-medium">
                  ${(freeShippingThreshold - subtotal).toFixed(2)} away
                </span>
              </div>
              <div className="w-full bg-[#2D2D2D] rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#D4AF37] to-[#C5A059] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[#F5F5F0]/70">
              You are <span className="text-[#D4AF37] font-semibold">${(freeShippingThreshold - subtotal).toFixed(2)}</span> away from Free Shipping
            </p>
          </div>
        )}

        {/* Cart Content */}
        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-[#2D2D2D] rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-[#F5F5F0] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Your cart is empty</h4>
            <p className="text-[#F5F5F0]/70 text-sm mb-6">Discover our exquisite fragrance collection</p>
            <Link
              to="/products"
              onClick={toggleCartDropdown}
              className="bg-[#D4AF37] text-black px-6 py-3 rounded-md text-sm font-semibold hover:bg-[#C5A059] transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence mode="popLayout">
                {cartItems.map((item, index) => (
                  <CartItemAnimation key={item.cart_item_id} delay={index * 0.05}>
                    <div className="flex items-start space-x-4 pb-4 border-b border-[#C5A059]/20">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <SmartImage
                      src={item.product_image_url}
                      alt={item.product_name || 'Product'}
                      productName={item.product_name}
                      category={item.fragrance_family}
                      aspectRatio="square"
                      objectFit="cover"
                      className="w-20 h-20 rounded-md"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-[#F5F5F0] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {item.product_name || 'Product'}
                    </h4>
                    <p className="text-xs text-[#F5F5F0]/60 mb-2">
                      {item.brand_name || 'Brand'} • {item.size_ml}ml
                    </p>
                    <p className="text-sm font-semibold text-[#D4AF37]">
                      ${item.unit_price.toFixed(2)}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-3 mt-3">
                      <button
                        onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                        className="w-7 h-7 rounded border border-[#F5F5F0]/30 flex items-center justify-center text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-[#F5F5F0] min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                        disabled={updateQuantityMutation.isPending}
                        className="w-7 h-7 rounded border border-[#F5F5F0]/30 flex items-center justify-center text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.cart_item_id)}
                    disabled={removeItemMutation.isPending}
                    className="text-[#8B4545] hover:text-[#A85858] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                    </div>
                  </CartItemAnimation>
                ))}
              </AnimatePresence>
            </div>

            {/* Cart Summary */}
            <div className="border-t border-[#C5A059]/30 p-6 space-y-3 bg-[#1A1A1A]">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-[#F5F5F0]/70">Subtotal</span>
                <span className="font-medium text-[#F5F5F0]">${subtotal.toFixed(2)}</span>
              </div>

              {/* Applied Promotions */}
              {appliedPromotions.map((promo, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-[#D4AF37]">{promo.promotion_code}</span>
                  <span className="text-[#D4AF37] font-medium">
                    -${promo.discount_amount.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Shipping */}
              <div className="flex justify-between text-sm">
                <span className="text-[#F5F5F0]/70">Shipping</span>
                {subtotal >= freeShippingThreshold ? (
                  <span className="text-[#D4AF37] font-medium">Free</span>
                ) : (
                  <span className="font-medium text-[#F5F5F0]">${shippingCost.toFixed(2)}</span>
                )}
              </div>

              {/* Promotional Code Entry */}
              <div className="flex space-x-2 pt-2">
                <input
                  type="text"
                  value={promotionalCode}
                  onChange={(e) => setPromotionalCode(e.target.value)}
                  placeholder="Promo code"
                  className="flex-1 px-3 py-2 bg-[#333333] border border-[#C5A059]/30 rounded-md text-sm text-[#F5F5F0] placeholder-[#F5F5F0]/40 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
                <button
                  onClick={handleApplyPromoCode}
                  disabled={!promotionalCode.trim() || isApplyingPromo}
                  className="px-4 py-2 bg-[#2D2D2D] text-[#D4AF37] border border-[#D4AF37]/50 rounded-md text-sm font-medium hover:bg-[#D4AF37] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </button>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between text-lg font-semibold border-t border-[#C5A059]/30 pt-4 mt-2">
                <span className="text-[#F5F5F0]" style={{ fontFamily: 'Playfair Display, serif' }}>Total</span>
                <span className="text-[#D4AF37]">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-[#C5A059]/30 p-6 space-y-3 bg-[#1A1A1A]">
              <Link
                to="/checkout"
                onClick={toggleCartDropdown}
                className="w-full bg-[#D4AF37] text-black py-3 px-6 rounded-md text-sm font-bold hover:bg-[#C5A059] transition-colors text-center block"
              >
                Checkout
              </Link>
              <Link
                to="/cart"
                onClick={toggleCartDropdown}
                className="w-full bg-transparent border border-[#F5F5F0] text-[#F5F5F0] py-3 px-6 rounded-md text-sm font-medium hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors text-center block"
              >
                View Cart
              </Link>
            </div>
          </>
        )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GV_CartDropdown;