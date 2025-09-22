// Centralized API configuration
export const getApiUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';
};

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  
  // Users
  PROFILE: '/api/users/profile',
  
  // Products
  PRODUCTS: '/api/products',
  PRODUCT_DETAIL: (id: string) => `/api/products/${id}`,
  PRODUCT_SIZES: (id: string) => `/api/products/${id}/sizes`,
  PRODUCT_RECOMMENDATIONS: (id: string) => `/api/products/${id}/recommendations`,
  FEATURED_PRODUCTS: '/api/products/featured',
  NEW_ARRIVALS: '/api/products/new-arrivals',
  BEST_SELLERS: '/api/products/best-sellers',
  
  // Brands
  BRANDS: '/api/brands',
  BRAND_DETAIL: (id: string) => `/api/brands/${id}`,
  BRAND_PRODUCTS: (id: string) => `/api/brands/${id}/products`,
  
  // Categories
  CATEGORIES: '/api/categories',
  CATEGORY_DETAIL: (id: string) => `/api/categories/${id}`,
  CATEGORY_PRODUCTS: (id: string) => `/api/categories/${id}/products`,
  
  // Cart
  CART: '/api/cart',
  CART_ITEMS: '/api/cart/items',
  CART_ITEM: (id: string) => `/api/cart/items/${id}`,
  CART_CLEAR: '/api/cart/clear',
  
  // Addresses
  ADDRESSES: '/api/addresses',
  ADDRESS: (id: string) => `/api/addresses/${id}`,
  
  // Orders
  ORDERS: '/api/orders',
  ORDER_DETAIL: (id: string) => `/api/orders/${id}`,
  ORDER_TRACKING: '/api/orders/track',
  
  // Shipping
  SHIPPING_METHODS: '/api/shipping-methods',
  SHIPPING_METHOD: (id: string) => `/api/shipping-methods/${id}`,
  
  // Wishlists
  WISHLISTS: '/api/wishlists',
  WISHLIST_DETAIL: (id: string) => `/api/wishlists/${id}`,
  WISHLIST_ITEMS: (id: string) => `/api/wishlists/${id}/items`,
  WISHLIST_ITEM: (wishlistId: string, itemId: string) => `/api/wishlists/${wishlistId}/items/${itemId}`,
  
  // Reviews
  REVIEWS: '/api/reviews',
  
  // Health check
  HEALTH: '/api/health',
  
  // Config
  FRONTEND_CONFIG: '/api/config/frontend',
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${getApiUrl()}${endpoint}`;
};