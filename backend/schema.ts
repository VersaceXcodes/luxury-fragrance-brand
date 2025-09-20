import { z } from 'zod';

// ============================================================================
// USERS SCHEMAS
// ============================================================================

export const userSchema = z.object({
  user_id: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone_number: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  loyalty_tier: z.string().nullable(),
  email_verified: z.boolean(),
  notification_preferences: z.string(),
  fragrance_profile: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createUserInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  phone_number: z.string().max(20).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  loyalty_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).nullable().optional(),
  email_verified: z.boolean().default(false),
  notification_preferences: z.string().default('{"email_marketing": false, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}'),
  fragrance_profile: z.string().nullable().optional()
});

export const updateUserInputSchema = z.object({
  user_id: z.string(),
  email: z.string().email().max(255).optional(),
  first_name: z.string().min(1).max(255).optional(),
  last_name: z.string().min(1).max(255).optional(),
  phone_number: z.string().max(20).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  loyalty_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).nullable().optional(),
  email_verified: z.boolean().optional(),
  notification_preferences: z.string().optional(),
  fragrance_profile: z.string().nullable().optional()
});

export const searchUsersInputSchema = z.object({
  query: z.string().optional(),
  email: z.string().optional(),
  loyalty_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  email_verified: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'email', 'last_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// BRANDS SCHEMAS
// ============================================================================

export const brandSchema = z.object({
  brand_id: z.string(),
  brand_name: z.string(),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
  heritage_story: z.string().nullable(),
  country_origin: z.string().nullable(),
  is_niche_brand: z.boolean(),
  display_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export const createBrandInputSchema = z.object({
  brand_name: z.string().min(1).max(255),
  description: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  heritage_story: z.string().nullable(),
  country_origin: z.string().max(100).nullable(),
  is_niche_brand: z.boolean().default(false),
  display_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true)
});

export const updateBrandInputSchema = z.object({
  brand_id: z.string(),
  brand_name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  heritage_story: z.string().nullable().optional(),
  country_origin: z.string().max(100).nullable().optional(),
  is_niche_brand: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export const searchBrandsInputSchema = z.object({
  query: z.string().optional(),
  is_niche_brand: z.boolean().optional(),
  is_active: z.boolean().optional(),
  country_origin: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['brand_name', 'display_order', 'created_at']).default('display_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// CATEGORIES SCHEMAS
// ============================================================================

export const categorySchema = z.object({
  category_id: z.string(),
  category_name: z.string(),
  parent_category_id: z.string().nullable(),
  description: z.string().nullable(),
  display_order: z.number().int(),
  is_active: z.boolean()
});

export const createCategoryInputSchema = z.object({
  category_name: z.string().min(1).max(255),
  parent_category_id: z.string().nullable(),
  description: z.string().nullable(),
  display_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true)
});

export const updateCategoryInputSchema = z.object({
  category_id: z.string(),
  category_name: z.string().min(1).max(255).optional(),
  parent_category_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  display_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export const searchCategoriesInputSchema = z.object({
  query: z.string().optional(),
  parent_category_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['category_name', 'display_order']).default('display_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// PRODUCTS SCHEMAS
// ============================================================================

export const productSchema = z.object({
  product_id: z.string(),
  brand_id: z.string(),
  category_id: z.string(),
  product_name: z.string(),
  description: z.string().nullable(),
  short_description: z.string().nullable(),
  fragrance_families: z.string(),
  concentration: z.string(),
  gender_category: z.string(),
  top_notes: z.string().nullable(),
  middle_notes: z.string().nullable(),
  base_notes: z.string().nullable(),
  complete_notes_list: z.string().nullable(),
  occasion_tags: z.string().nullable(),
  season_suitability: z.string().nullable(),
  longevity_hours: z.number().int().nullable(),
  sillage_rating: z.number().int().nullable(),
  intensity_level: z.string().nullable(),
  ingredients_list: z.string().nullable(),
  care_instructions: z.string().nullable(),
  base_price: z.number(),
  sale_price: z.number().nullable(),
  availability_status: z.string(),
  is_featured: z.boolean(),
  is_new_arrival: z.boolean(),
  is_limited_edition: z.boolean(),
  sku_prefix: z.string(),
  weight_grams: z.number().int().nullable(),
  launch_date: z.string().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createProductInputSchema = z.object({
  brand_id: z.string(),
  category_id: z.string(),
  product_name: z.string().min(1).max(255),
  description: z.string().nullable(),
  short_description: z.string().max(500).nullable(),
  fragrance_families: z.string(),
  concentration: z.enum(['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Parfum', 'Extrait de Parfum']),
  gender_category: z.enum(['Men', 'Women', 'Unisex']),
  top_notes: z.string().nullable(),
  middle_notes: z.string().nullable(),
  base_notes: z.string().nullable(),
  complete_notes_list: z.string().nullable(),
  occasion_tags: z.string().nullable(),
  season_suitability: z.string().nullable(),
  longevity_hours: z.number().int().min(1).max(24).nullable(),
  sillage_rating: z.number().int().min(1).max(10).nullable(),
  intensity_level: z.enum(['Very Light', 'Light', 'Moderate', 'Strong', 'Very Strong']).nullable(),
  ingredients_list: z.string().nullable(),
  care_instructions: z.string().nullable(),
  base_price: z.number().positive(),
  sale_price: z.number().positive().nullable(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'discontinued', 'preorder']).default('in_stock'),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_limited_edition: z.boolean().default(false),
  sku_prefix: z.string().min(1).max(10),
  weight_grams: z.number().int().positive().nullable(),
  launch_date: z.string().nullable(),
  meta_title: z.string().max(150).nullable(),
  meta_description: z.string().max(300).nullable(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateProductInputSchema = z.object({
  product_id: z.string(),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
  product_name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  fragrance_families: z.string().optional(),
  concentration: z.enum(['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Parfum', 'Extrait de Parfum']).optional(),
  gender_category: z.enum(['Men', 'Women', 'Unisex']).optional(),
  top_notes: z.string().nullable().optional(),
  middle_notes: z.string().nullable().optional(),
  base_notes: z.string().nullable().optional(),
  complete_notes_list: z.string().nullable().optional(),
  occasion_tags: z.string().nullable().optional(),
  season_suitability: z.string().nullable().optional(),
  longevity_hours: z.number().int().min(1).max(24).nullable().optional(),
  sillage_rating: z.number().int().min(1).max(10).nullable().optional(),
  intensity_level: z.enum(['Very Light', 'Light', 'Moderate', 'Strong', 'Very Strong']).nullable().optional(),
  ingredients_list: z.string().nullable().optional(),
  care_instructions: z.string().nullable().optional(),
  base_price: z.number().positive().optional(),
  sale_price: z.number().positive().nullable().optional(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'discontinued', 'preorder']).optional(),
  is_featured: z.boolean().optional(),
  is_new_arrival: z.boolean().optional(),
  is_limited_edition: z.boolean().optional(),
  sku_prefix: z.string().min(1).max(10).optional(),
  weight_grams: z.number().int().positive().nullable().optional(),
  launch_date: z.string().nullable().optional(),
  meta_title: z.string().max(150).nullable().optional(),
  meta_description: z.string().max(300).nullable().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchProductsInputSchema = z.object({
  query: z.string().optional(),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
  gender_category: z.enum(['Men', 'Women', 'Unisex']).optional(),
  concentration: z.enum(['Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Parfum', 'Extrait de Parfum']).optional(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'discontinued', 'preorder']).optional(),
  is_featured: z.boolean().optional(),
  is_new_arrival: z.boolean().optional(),
  is_limited_edition: z.boolean().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['product_name', 'base_price', 'created_at', 'sort_order']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// PRODUCT_SIZES SCHEMAS
// ============================================================================

export const productSizeSchema = z.object({
  size_id: z.string(),
  product_id: z.string(),
  size_ml: z.number().int(),
  price: z.number(),
  sale_price: z.number().nullable(),
  stock_quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  low_stock_threshold: z.number().int(),
  sku: z.string(),
  is_sample_available: z.boolean(),
  sample_price: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export const createProductSizeInputSchema = z.object({
  product_id: z.string(),
  size_ml: z.number().int().positive(),
  price: z.number().positive(),
  sale_price: z.number().positive().nullable(),
  stock_quantity: z.number().int().nonnegative().default(0),
  reserved_quantity: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().nonnegative().default(5),
  sku: z.string().min(1).max(50),
  is_sample_available: z.boolean().default(false),
  sample_price: z.number().positive().nullable(),
  is_active: z.boolean().default(true)
});

export const updateProductSizeInputSchema = z.object({
  size_id: z.string(),
  price: z.number().positive().optional(),
  sale_price: z.number().positive().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  reserved_quantity: z.number().int().nonnegative().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
  is_sample_available: z.boolean().optional(),
  sample_price: z.number().positive().nullable().optional(),
  is_active: z.boolean().optional()
});

export const searchProductSizesInputSchema = z.object({
  product_id: z.string().optional(),
  size_ml: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  low_stock: z.boolean().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['size_ml', 'price', 'stock_quantity']).default('size_ml'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// ORDERS SCHEMAS
// ============================================================================

export const orderSchema = z.object({
  order_id: z.string(),
  user_id: z.string().nullable(),
  order_number: z.string(),
  order_status: z.string(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  shipping_cost: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  currency: z.string(),
  shipping_address_id: z.string(),
  billing_address_id: z.string(),
  shipping_method_id: z.string(),
  payment_method_id: z.string().nullable(),
  tracking_number: z.string().nullable(),
  shipped_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  gift_message: z.string().nullable(),
  special_instructions: z.string().nullable(),
  customer_email: z.string(),
  customer_phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createOrderInputSchema = z.object({
  user_id: z.string().nullable(),
  order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).default('pending'),
  fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled']).default('unfulfilled'),
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative().default(0),
  shipping_cost: z.number().nonnegative().default(0),
  discount_amount: z.number().nonnegative().default(0),
  total_amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  shipping_address_id: z.string(),
  billing_address_id: z.string(),
  shipping_method_id: z.string(),
  payment_method_id: z.string().nullable(),
  gift_message: z.string().max(500).nullable(),
  special_instructions: z.string().max(500).nullable(),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable()
});

export const updateOrderInputSchema = z.object({
  order_id: z.string(),
  order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
  fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled']).optional(),
  tracking_number: z.string().nullable().optional(),
  shipped_at: z.string().nullable().optional(),
  delivered_at: z.string().nullable().optional(),
  special_instructions: z.string().max(500).nullable().optional()
});

export const searchOrdersInputSchema = z.object({
  user_id: z.string().optional(),
  order_number: z.string().optional(),
  order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
  fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled']).optional(),
  customer_email: z.string().email().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'total_amount', 'order_number']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// CARTS SCHEMAS
// ============================================================================

export const cartSchema = z.object({
  cart_id: z.string(),
  user_id: z.string().nullable(),
  session_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createCartInputSchema = z.object({
  user_id: z.string().nullable(),
  session_id: z.string().nullable()
});

export const updateCartInputSchema = z.object({
  cart_id: z.string(),
  user_id: z.string().nullable().optional(),
  session_id: z.string().nullable().optional()
});

export const searchCartsInputSchema = z.object({
  user_id: z.string().optional(),
  session_id: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'updated_at']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// CART_ITEMS SCHEMAS
// ============================================================================

export const cartItemSchema = z.object({
  cart_item_id: z.string(),
  cart_id: z.string(),
  product_id: z.string(),
  size_ml: z.number().int(),
  quantity: z.number().int(),
  unit_price: z.number(),
  gift_wrap: z.boolean(),
  sample_included: z.boolean(),
  added_at: z.coerce.date()
});

export const createCartItemInputSchema = z.object({
  cart_id: z.string(),
  product_id: z.string(),
  size_ml: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  unit_price: z.number().positive(),
  gift_wrap: z.boolean().default(false),
  sample_included: z.boolean().default(false)
});

export const updateCartItemInputSchema = z.object({
  cart_item_id: z.string(),
  quantity: z.number().int().positive().optional(),
  gift_wrap: z.boolean().optional(),
  sample_included: z.boolean().optional()
});

export const searchCartItemsInputSchema = z.object({
  cart_id: z.string().optional(),
  product_id: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['added_at', 'unit_price']).default('added_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// ADDRESSES SCHEMAS
// ============================================================================

export const addressSchema = z.object({
  address_id: z.string(),
  user_id: z.string(),
  address_type: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  company: z.string().nullable(),
  address_line_1: z.string(),
  address_line_2: z.string().nullable(),
  city: z.string(),
  state_province: z.string(),
  postal_code: z.string(),
  country: z.string(),
  phone_number: z.string().nullable(),
  is_default: z.boolean(),
  created_at: z.coerce.date()
});

export const createAddressInputSchema = z.object({
  user_id: z.string(),
  address_type: z.enum(['shipping', 'billing', 'both']),
  first_name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  company: z.string().max(255).nullable(),
  address_line_1: z.string().min(1).max(255),
  address_line_2: z.string().max(255).nullable(),
  city: z.string().min(1).max(255),
  state_province: z.string().min(1).max(255),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(2).max(100),
  phone_number: z.string().max(20).nullable(),
  is_default: z.boolean().default(false)
});

export const updateAddressInputSchema = z.object({
  address_id: z.string(),
  address_type: z.enum(['shipping', 'billing', 'both']).optional(),
  first_name: z.string().min(1).max(255).optional(),
  last_name: z.string().min(1).max(255).optional(),
  company: z.string().max(255).nullable().optional(),
  address_line_1: z.string().min(1).max(255).optional(),
  address_line_2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(255).optional(),
  state_province: z.string().min(1).max(255).optional(),
  postal_code: z.string().min(1).max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  phone_number: z.string().max(20).nullable().optional(),
  is_default: z.boolean().optional()
});

export const searchAddressesInputSchema = z.object({
  user_id: z.string().optional(),
  address_type: z.enum(['shipping', 'billing', 'both']).optional(),
  country: z.string().optional(),
  is_default: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'last_name', 'city']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// REVIEWS SCHEMAS
// ============================================================================

export const reviewSchema = z.object({
  review_id: z.string(),
  product_id: z.string(),
  user_id: z.string(),
  order_id: z.string().nullable(),
  rating: z.number().int(),
  title: z.string().nullable(),
  review_text: z.string().nullable(),
  longevity_rating: z.number().int().nullable(),
  sillage_rating: z.number().int().nullable(),
  occasion_tags: z.string().nullable(),
  season_tags: z.string().nullable(),
  is_verified_purchase: z.boolean(),
  helpful_votes: z.number().int(),
  total_votes: z.number().int(),
  is_featured: z.boolean(),
  moderation_status: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createReviewInputSchema = z.object({
  product_id: z.string(),
  user_id: z.string(),
  order_id: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).nullable(),
  review_text: z.string().max(2000).nullable(),
  longevity_rating: z.number().int().min(1).max(10).nullable(),
  sillage_rating: z.number().int().min(1).max(10).nullable(),
  occasion_tags: z.string().nullable(),
  season_tags: z.string().nullable(),
  is_verified_purchase: z.boolean().default(false),
  helpful_votes: z.number().int().nonnegative().default(0),
  total_votes: z.number().int().nonnegative().default(0),
  is_featured: z.boolean().default(false),
  moderation_status: z.enum(['pending', 'approved', 'rejected']).default('pending')
});

export const updateReviewInputSchema = z.object({
  review_id: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).nullable().optional(),
  review_text: z.string().max(2000).nullable().optional(),
  longevity_rating: z.number().int().min(1).max(10).nullable().optional(),
  sillage_rating: z.number().int().min(1).max(10).nullable().optional(),
  occasion_tags: z.string().nullable().optional(),
  season_tags: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  moderation_status: z.enum(['pending', 'approved', 'rejected']).optional()
});

export const searchReviewsInputSchema = z.object({
  product_id: z.string().optional(),
  user_id: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  moderation_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  is_verified_purchase: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'rating', 'helpful_votes']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// WISHLISTS SCHEMAS
// ============================================================================

export const wishlistSchema = z.object({
  wishlist_id: z.string(),
  user_id: z.string(),
  wishlist_name: z.string(),
  is_public: z.boolean(),
  is_default: z.boolean(),
  share_token: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createWishlistInputSchema = z.object({
  user_id: z.string(),
  wishlist_name: z.string().min(1).max(255).default('My Wishlist'),
  is_public: z.boolean().default(false),
  is_default: z.boolean().default(true)
});

export const updateWishlistInputSchema = z.object({
  wishlist_id: z.string(),
  wishlist_name: z.string().min(1).max(255).optional(),
  is_public: z.boolean().optional(),
  is_default: z.boolean().optional()
});

export const searchWishlistsInputSchema = z.object({
  user_id: z.string().optional(),
  is_public: z.boolean().optional(),
  is_default: z.boolean().optional(),
  share_token: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'wishlist_name']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// WISHLIST_ITEMS SCHEMAS
// ============================================================================

export const wishlistItemSchema = z.object({
  wishlist_item_id: z.string(),
  wishlist_id: z.string(),
  product_id: z.string(),
  size_ml: z.number().int().nullable(),
  notes: z.string().nullable(),
  added_at: z.coerce.date()
});

export const createWishlistItemInputSchema = z.object({
  wishlist_id: z.string(),
  product_id: z.string(),
  size_ml: z.number().int().positive().nullable(),
  notes: z.string().max(500).nullable()
});

export const updateWishlistItemInputSchema = z.object({
  wishlist_item_id: z.string(),
  size_ml: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).nullable().optional()
});

export const searchWishlistItemsInputSchema = z.object({
  wishlist_id: z.string().optional(),
  product_id: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['added_at', 'product_name']).default('added_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// ============================================================================
// SHIPPING_METHODS SCHEMAS
// ============================================================================

export const shippingMethodSchema = z.object({
  shipping_method_id: z.string(),
  method_name: z.string(),
  description: z.string().nullable(),
  cost: z.number(),
  free_threshold: z.number().nullable(),
  estimated_days_min: z.number().int(),
  estimated_days_max: z.number().int(),
  is_express: z.boolean(),
  requires_signature: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int()
});

export const createShippingMethodInputSchema = z.object({
  method_name: z.string().min(1).max(255),
  description: z.string().nullable(),
  cost: z.number().nonnegative(),
  free_threshold: z.number().positive().nullable(),
  estimated_days_min: z.number().int().positive(),
  estimated_days_max: z.number().int().positive(),
  is_express: z.boolean().default(false),
  requires_signature: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateShippingMethodInputSchema = z.object({
  shipping_method_id: z.string(),
  method_name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  cost: z.number().nonnegative().optional(),
  free_threshold: z.number().positive().nullable().optional(),
  estimated_days_min: z.number().int().positive().optional(),
  estimated_days_max: z.number().int().positive().optional(),
  is_express: z.boolean().optional(),
  requires_signature: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchShippingMethodsInputSchema = z.object({
  is_active: z.boolean().optional(),
  is_express: z.boolean().optional(),
  requires_signature: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['sort_order', 'cost', 'method_name']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

export type Brand = z.infer<typeof brandSchema>;
export type CreateBrandInput = z.infer<typeof createBrandInputSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandInputSchema>;
export type SearchBrandsInput = z.infer<typeof searchBrandsInputSchema>;

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;
export type SearchCategoriesInput = z.infer<typeof searchCategoriesInputSchema>;

export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;

export type ProductSize = z.infer<typeof productSizeSchema>;
export type CreateProductSizeInput = z.infer<typeof createProductSizeInputSchema>;
export type UpdateProductSizeInput = z.infer<typeof updateProductSizeInputSchema>;
export type SearchProductSizesInput = z.infer<typeof searchProductSizesInputSchema>;

export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;

export type Cart = z.infer<typeof cartSchema>;
export type CreateCartInput = z.infer<typeof createCartInputSchema>;
export type UpdateCartInput = z.infer<typeof updateCartInputSchema>;
export type SearchCartsInput = z.infer<typeof searchCartsInputSchema>;

export type CartItem = z.infer<typeof cartItemSchema>;
export type CreateCartItemInput = z.infer<typeof createCartItemInputSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;
export type SearchCartItemsInput = z.infer<typeof searchCartItemsInputSchema>;

export type Address = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressInputSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressInputSchema>;
export type SearchAddressesInput = z.infer<typeof searchAddressesInputSchema>;

export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type SearchReviewsInput = z.infer<typeof searchReviewsInputSchema>;

export type Wishlist = z.infer<typeof wishlistSchema>;
export type CreateWishlistInput = z.infer<typeof createWishlistInputSchema>;
export type UpdateWishlistInput = z.infer<typeof updateWishlistInputSchema>;
export type SearchWishlistsInput = z.infer<typeof searchWishlistsInputSchema>;

export type WishlistItem = z.infer<typeof wishlistItemSchema>;
export type CreateWishlistItemInput = z.infer<typeof createWishlistItemInputSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemInputSchema>;
export type SearchWishlistItemsInput = z.infer<typeof searchWishlistItemsInputSchema>;

export type ShippingMethod = z.infer<typeof shippingMethodSchema>;
export type CreateShippingMethodInput = z.infer<typeof createShippingMethodInputSchema>;
export type UpdateShippingMethodInput = z.infer<typeof updateShippingMethodInputSchema>;
export type SearchShippingMethodsInput = z.infer<typeof searchShippingMethodsInputSchema>;