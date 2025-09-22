import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// Core Types based on backend schemas
interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  date_of_birth: string | null;
  loyalty_tier: string | null;
  email_verified: boolean;
  notification_preferences: string;
  fragrance_profile: string | null;
  created_at: string;
  updated_at: string;
}

interface CartItem {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  gift_wrap: boolean;
  sample_included: boolean;
  added_at: string;
}

interface Promotion {
  promotion_code: string;
  discount_amount: number;
  discount_type: string;
  description: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  auto_dismiss: boolean;
  duration?: number;
  created_at: string;
}

interface FragranceProfile {
  preferred_families: string[];
  intensity_preference: string;
  occasion_preferences: string[];
  season_preferences: string[];
}

interface QuizResults {
  personality_type: string;
  recommended_families: string[];
  completed_at: string;
}

interface NotificationPreferences {
  email_marketing: boolean;
  sms_updates: boolean;
  restock_alerts: boolean;
  price_drop_alerts: boolean;
}

interface SearchFilters {
  price_min: number | null;
  price_max: number | null;
  brand_ids: string[];
  fragrance_families: string[];
  size_options: number[];
  occasion_tags: string[];
  season_suitability: string[];
  availability_status: string[];
}

// Global State Interfaces
interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

interface CartState {
  items: CartItem[];
  item_count: number;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  applied_promotions: Promotion[];
  free_shipping_threshold: number;
  is_loading: boolean;
  session_id: string | null;
}

interface SearchState {
  current_query: string;
  active_filters: SearchFilters;
  sort_by: string;
  results_count: number;
  is_loading: boolean;
}

interface UIState {
  mobile_menu_open: boolean;
  search_overlay_open: boolean;
  cart_dropdown_open: boolean;
  account_dropdown_open: boolean;
  current_breakpoint: string;
  notifications: Notification[];
}

interface UserPreferences {
  fragrance_profile: FragranceProfile | null;
  quiz_results: QuizResults | null;
  notification_preferences: NotificationPreferences;
}

// Main App State Interface
interface AppState {
  // State
  authentication_state: AuthenticationState;
  cart_state: CartState;
  search_state: SearchState;
  ui_state: UIState;
  user_preferences: UserPreferences;

  // Authentication Actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => void;
  register_user: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    date_of_birth?: string;
  }) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (userData: Partial<User>) => void;

  // Cart Actions
  add_to_cart: (item: {
    product_id: string;
    product_name: string;
    brand_name: string;
    size_ml: number;
    quantity: number;
    unit_price: number;
    gift_wrap?: boolean;
    sample_included?: boolean;
  }) => Promise<void>;
  update_cart_item: (cart_item_id: string, updates: { quantity?: number; gift_wrap?: boolean; sample_included?: boolean; }) => Promise<void>;
  remove_from_cart: (cart_item_id: string) => Promise<void>;
  apply_promotion: (promotion_code: string) => Promise<void>;
  clear_cart: () => void;
  load_cart: () => Promise<void>;

  // Search Actions
  update_search_query: (query: string) => void;
  update_search_filters: (filters: Partial<SearchFilters>) => void;
  update_sort_option: (sort_by: string) => void;
  clear_search_filters: () => void;

  // UI Actions
  toggle_mobile_menu: () => void;
  toggle_search_overlay: () => void;
  toggle_cart_dropdown: () => void;
  toggle_account_dropdown: () => void;
  set_current_breakpoint: (breakpoint: string) => void;
  show_notification: (notification: Omit<Notification, 'id' | 'created_at'>) => void;
  dismiss_notification: (id: string) => void;
  clear_all_notifications: () => void;

  // User Preferences Actions
  update_fragrance_profile: (profile: FragranceProfile) => void;
  update_quiz_results: (results: QuizResults) => void;
  update_notification_preferences: (preferences: NotificationPreferences) => void;
}

// Utility function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// API base URL
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';
};

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      cart_state: {
        items: [],
        item_count: 0,
        subtotal: 0,
        shipping_cost: 0,
        tax_amount: 0,
        total: 0,
        applied_promotions: [],
        free_shipping_threshold: 75,
        is_loading: false,
        session_id: null,
      },

      search_state: {
        current_query: '',
        active_filters: {
          price_min: null,
          price_max: null,
          brand_ids: [],
          fragrance_families: [],
          size_options: [],
          occasion_tags: [],
          season_suitability: [],
          availability_status: [],
        },
        sort_by: 'best_selling',
        results_count: 0,
        is_loading: false,
      },

      ui_state: {
        mobile_menu_open: false,
        search_overlay_open: false,
        cart_dropdown_open: false,
        account_dropdown_open: false,
        current_breakpoint: 'desktop',
        notifications: [],
      },

      user_preferences: {
        fragrance_profile: null,
        quiz_results: null,
        notification_preferences: {
          email_marketing: false,
          sms_updates: false,
          restock_alerts: true,
          price_drop_alerts: true,
        },
      },

      // Authentication Actions
      login_user: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${getApiUrl()}/api/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Load user preferences and cart after login
          get().load_cart();
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout_user: () => {
        const { auth_token } = get().authentication_state;
        
        // Attempt server logout (don't block on failure)
        if (auth_token) {
          axios.post(
            `${getApiUrl()}/api/auth/logout`,
            {},
            { headers: { Authorization: `Bearer ${auth_token}` } }
          ).catch(() => {
            // Ignore server logout errors - proceed with local logout
          });
        }

        set((state) => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          cart_state: {
            ...state.cart_state,
            items: [],
            item_count: 0,
            subtotal: 0,
            total: 0,
            applied_promotions: [],
          },
          user_preferences: {
            fragrance_profile: null,
            quiz_results: null,
            notification_preferences: {
              email_marketing: false,
              sms_updates: false,
              restock_alerts: true,
              price_drop_alerts: true,
            },
          },
        }));
      },

      register_user: async (userData) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${getApiUrl()}/api/auth/register`,
            {
              ...userData,
              notification_preferences: JSON.stringify(get().user_preferences.notification_preferences),
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, token } = response.data;

          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      initialize_auth: async () => {
        const { authentication_state } = get();
        const token = authentication_state.auth_token;
        
        if (!token) {
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${getApiUrl()}/api/users/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const user = response.data;
          
          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Load cart and preferences for authenticated user
          get().load_cart();
        } catch {
          // Token is invalid, clear auth state
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },

      update_user_profile: (userData) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_user: state.authentication_state.current_user 
              ? { ...state.authentication_state.current_user, ...userData }
              : null,
          },
        }));
      },

      // Cart Actions
      add_to_cart: async (item) => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            is_loading: true,
          },
        }));

        try {
          const { auth_token } = get().authentication_state;
          const { session_id } = get().cart_state;

          const headers: any = { 'Content-Type': 'application/json' };
          if (auth_token) headers.Authorization = `Bearer ${auth_token}`;

          const requestBody = {
            product_id: item.product_id,
            size_ml: item.size_ml,
            quantity: item.quantity,
            unit_price: item.unit_price,
            gift_wrap: item.gift_wrap || false,
            sample_included: item.sample_included || false,
          };

          const params: any = {};
          if (!auth_token && session_id) params.session_id = session_id;

          await axios.post(
            `${getApiUrl()}/api/cart/items`,
            requestBody,
            { 
              headers,
              params,
            }
          );

          // Reload cart to get updated state
          await get().load_cart();
          
          get().show_notification({
            type: 'success',
            message: `${item.product_name} added to cart`,
            auto_dismiss: true,
            duration: 3000,
          });
        } catch (error: any) {
          set((state) => ({
            cart_state: {
              ...state.cart_state,
              is_loading: false,
            },
          }));

          const errorMessage = error.response?.data?.message || 'Failed to add item to cart';
          get().show_notification({
            type: 'error',
            message: errorMessage,
            auto_dismiss: true,
            duration: 5000,
          });
          throw new Error(errorMessage);
        }
      },

      update_cart_item: async (cart_item_id: string, updates) => {
        try {
          const { auth_token } = get().authentication_state;
          const headers: any = { 'Content-Type': 'application/json' };
          if (auth_token) headers.Authorization = `Bearer ${auth_token}`;

          await axios.put(
            `${getApiUrl()}/api/cart/items/${cart_item_id}`,
            updates,
            { headers }
          );

          // Reload cart to get updated state
          await get().load_cart();
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to update cart item';
          get().show_notification({
            type: 'error',
            message: errorMessage,
            auto_dismiss: true,
            duration: 5000,
          });
          throw new Error(errorMessage);
        }
      },

      remove_from_cart: async (cart_item_id: string) => {
        try {
          const { auth_token } = get().authentication_state;
          const headers: any = {};
          if (auth_token) headers.Authorization = `Bearer ${auth_token}`;

          await axios.delete(
            `${getApiUrl()}/api/cart/items/${cart_item_id}`,
            { headers }
          );

          // Reload cart to get updated state
          await get().load_cart();
          
          get().show_notification({
            type: 'success',
            message: 'Item removed from cart',
            auto_dismiss: true,
            duration: 3000,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Failed to remove cart item';
          get().show_notification({
            type: 'error',
            message: errorMessage,
            auto_dismiss: true,
            duration: 5000,
          });
          throw new Error(errorMessage);
        }
      },

      apply_promotion: async (promotion_code: string) => {
        try {
          const { cart_state } = get();
          
          const response = await axios.post(
            `${getApiUrl()}/api/promotions/validate`,
            {
              promotion_code,
              order_total: cart_state.subtotal,
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (response.data.is_valid) {
            const promotion = {
              promotion_code,
              discount_amount: response.data.discount_amount,
              discount_type: response.data.discount_type,
              description: response.data.promotion?.description || 'Discount applied',
            };

            set((state) => ({
              cart_state: {
                ...state.cart_state,
                applied_promotions: [...state.cart_state.applied_promotions, promotion],
                total: state.cart_state.subtotal + state.cart_state.tax_amount + state.cart_state.shipping_cost - response.data.discount_amount,
              },
            }));

            get().show_notification({
              type: 'success',
              message: `Promotion code applied! You saved $${response.data.discount_amount}`,
              auto_dismiss: true,
              duration: 5000,
            });
          } else {
            throw new Error(response.data.error_message || 'Invalid promotion code');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error_message || error.message || 'Failed to apply promotion code';
          get().show_notification({
            type: 'error',
            message: errorMessage,
            auto_dismiss: true,
            duration: 5000,
          });
          throw new Error(errorMessage);
        }
      },

      clear_cart: () => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            items: [],
            item_count: 0,
            subtotal: 0,
            tax_amount: 0,
            shipping_cost: 0,
            total: 0,
            applied_promotions: [],
          },
        }));
      },

      load_cart: async () => {
        try {
          const { auth_token } = get().authentication_state;
          const { session_id } = get().cart_state;

          const headers: any = {};
          if (auth_token) headers.Authorization = `Bearer ${auth_token}`;

          const params: any = {};
          if (!auth_token && session_id) params.session_id = session_id;

          const response = await axios.get(
            `${getApiUrl()}/api/cart`,
            { headers, params }
          );

          const cart = response.data;
          const items = cart.items || [];

          // Calculate totals
          const subtotal = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);
          const item_count = items.reduce((count: number, item: any) => count + item.quantity, 0);

          set((state) => ({
            cart_state: {
              ...state.cart_state,
              items: items.map((item: any) => ({
                cart_item_id: item.cart_item_id,
                product_id: item.product_id,
                product_name: item.product_name || 'Unknown Product',
                brand_name: item.brand_name || 'Unknown Brand',
                size_ml: item.size_ml,
                quantity: item.quantity,
                unit_price: item.unit_price,
                gift_wrap: item.gift_wrap || false,
                sample_included: item.sample_included || false,
                added_at: item.added_at,
              })),
              item_count,
              subtotal,
              total: subtotal + state.cart_state.tax_amount + state.cart_state.shipping_cost,
              is_loading: false,
              session_id: cart.session_id || state.cart_state.session_id,
            },
          }));
        } catch {
          // Don't show error for cart loading - might be empty or not exist yet
          set((state) => ({
            cart_state: {
              ...state.cart_state,
              is_loading: false,
            },
          }));
        }
      },

      // Search Actions
      update_search_query: (query: string) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            current_query: query,
          },
        }));
      },

      update_search_filters: (filters: Partial<SearchFilters>) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            active_filters: {
              ...state.search_state.active_filters,
              ...filters,
            },
          },
        }));
      },

      update_sort_option: (sort_by: string) => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            sort_by,
          },
        }));
      },

      clear_search_filters: () => {
        set((state) => ({
          search_state: {
            ...state.search_state,
            active_filters: {
              price_min: null,
              price_max: null,
              brand_ids: [],
              fragrance_families: [],
              size_options: [],
              occasion_tags: [],
              season_suitability: [],
              availability_status: [],
            },
          },
        }));
      },

      // UI Actions
      toggle_mobile_menu: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            mobile_menu_open: !state.ui_state.mobile_menu_open,
          },
        }));
      },

      toggle_search_overlay: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            search_overlay_open: !state.ui_state.search_overlay_open,
          },
        }));
      },

      toggle_cart_dropdown: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            cart_dropdown_open: !state.ui_state.cart_dropdown_open,
          },
        }));
      },

      toggle_account_dropdown: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            account_dropdown_open: !state.ui_state.account_dropdown_open,
          },
        }));
      },

      set_current_breakpoint: (breakpoint: string) => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            current_breakpoint: breakpoint,
          },
        }));
      },

      show_notification: (notification) => {
        const id = generateId();
        const newNotification: Notification = {
          ...notification,
          id,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          ui_state: {
            ...state.ui_state,
            notifications: [...state.ui_state.notifications, newNotification],
          },
        }));

        // Auto-dismiss if specified
        if (notification.auto_dismiss && notification.duration) {
          setTimeout(() => {
            get().dismiss_notification(id);
          }, notification.duration);
        }
      },

      dismiss_notification: (id: string) => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            notifications: state.ui_state.notifications.filter(n => n.id !== id),
          },
        }));
      },

      clear_all_notifications: () => {
        set((state) => ({
          ui_state: {
            ...state.ui_state,
            notifications: [],
          },
        }));
      },

      // User Preferences Actions
      update_fragrance_profile: (profile: FragranceProfile) => {
        set((state) => ({
          user_preferences: {
            ...state.user_preferences,
            fragrance_profile: profile,
          },
        }));
      },

      update_quiz_results: (results: QuizResults) => {
        set((state) => ({
          user_preferences: {
            ...state.user_preferences,
            quiz_results: results,
          },
        }));
      },

      update_notification_preferences: (preferences: NotificationPreferences) => {
        set((state) => ({
          user_preferences: {
            ...state.user_preferences,
            notification_preferences: preferences,
          },
        }));
      },
    }),
    {
      name: 'luxescent-app-storage',
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        cart_state: {
          items: state.cart_state.items,
          item_count: state.cart_state.item_count,
          subtotal: state.cart_state.subtotal,
          shipping_cost: state.cart_state.shipping_cost,
          tax_amount: state.cart_state.tax_amount,
          total: state.cart_state.total,
          applied_promotions: state.cart_state.applied_promotions,
          free_shipping_threshold: state.cart_state.free_shipping_threshold,
          is_loading: false, // Never persist loading state
          session_id: state.cart_state.session_id,
        },
        search_state: {
          current_query: state.search_state.current_query,
          active_filters: state.search_state.active_filters,
          sort_by: state.search_state.sort_by,
          results_count: 0, // Don't persist results count
          is_loading: false, // Never persist loading state
        },
        ui_state: {
          mobile_menu_open: false, // Don't persist UI states
          search_overlay_open: false,
          cart_dropdown_open: false,
          account_dropdown_open: false,
          current_breakpoint: 'desktop', // Default breakpoint
          notifications: [], // Don't persist notifications
        },
        user_preferences: state.user_preferences,
      }),
    }
  )
);

// Export types for use in components
export type {
  User,
  CartItem,
  Promotion,
  Notification,
  FragranceProfile,
  QuizResults,
  NotificationPreferences,
  SearchFilters,
  AuthenticationState,
  CartState,
  SearchState,
  UIState,
  UserPreferences,
  AppState,
};