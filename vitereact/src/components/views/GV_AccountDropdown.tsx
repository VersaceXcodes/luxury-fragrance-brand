import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on backend schemas
interface UserProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  loyalty_tier: string | null;
}

interface RecentOrder {
  order_id: string;
  order_number: string;
  order_status: string;
  total_amount: number | string;
  created_at: string;
}

// API Functions
const getUserProfile = async (authToken: string): Promise<UserProfile> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/users/profile`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const getRecentOrders = async (authToken: string): Promise<RecentOrder[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/orders`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 3,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    }
  );
  return response.data.data || [];
};

const GV_AccountDropdown: React.FC = () => {
  // Individual Zustand selectors to prevent infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const accountDropdownOpen = useAppStore(state => state.ui_state.account_dropdown_open);
  const currentBreakpoint = useAppStore(state => state.ui_state.current_breakpoint);
  const logoutUser = useAppStore(state => state.logout_user);
  const toggleAccountDropdown = useAppStore(state => state.toggle_account_dropdown);
  const showNotification = useAppStore(state => state.show_notification);

  // React Query for user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', authToken],
    queryFn: () => getUserProfile(authToken!),
    enabled: isAuthenticated && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // React Query for recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recentOrders', authToken],
    queryFn: () => getRecentOrders(authToken!),
    enabled: isAuthenticated && !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      // Call logout API (handled in store action)
      logoutUser();
      toggleAccountDropdown(); // Close dropdown
      showNotification({
        type: 'success',
        message: 'Successfully logged out',
        auto_dismiss: true,
        duration: 3000
      });
    } catch {
      showNotification({
        type: 'error',
        message: 'Logout failed, but you have been logged out locally',
        auto_dismiss: true,
        duration: 5000
      });
    }
  };

  // Handle navigation click (close dropdown)
  const handleNavigationClick = () => {
    toggleAccountDropdown();
  };

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (accountDropdownOpen && !target.closest('[data-account-dropdown]')) {
        toggleAccountDropdown();
      }
    };

    if (accountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [accountDropdownOpen, toggleAccountDropdown]);

  // Don't render if dropdown is not open
  if (!accountDropdownOpen) {
    return null;
  }

  // Mobile full-screen overlay
  const isMobile = currentBreakpoint === 'mobile';

  return (
    <>
      {isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleNavigationClick} />
      )}
      
      <div 
        data-account-dropdown
        className={`
          ${isMobile 
            ? 'fixed inset-x-4 top-20 bottom-auto max-h-[80vh] z-50' 
            : 'w-80 relative'
          }
          bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden
        `}
      >
        {/* Authenticated User State */}
        {isAuthenticated ? (
          <div className="p-6">
            {/* Welcome Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {profileLoading ? '...' : (userProfile?.first_name?.charAt(0) || currentUser?.first_name?.charAt(0) || 'U')}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  Welcome back, {profileLoading ? '...' : (userProfile?.first_name || currentUser?.first_name || 'User')}!
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {profileLoading ? 'Loading...' : (userProfile?.email || currentUser?.email)}
                </p>
                {(userProfile?.loyalty_tier || currentUser?.loyalty_tier) && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 mt-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                    {((userProfile?.loyalty_tier || currentUser?.loyalty_tier) || '').charAt(0).toUpperCase() + ((userProfile?.loyalty_tier || currentUser?.loyalty_tier) || '').slice(1)} Member
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 mb-6">
              <Link
                to="/account"
                onClick={handleNavigationClick}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">My Account</span>
              </Link>

              <Link
                to="/account/orders"
                onClick={handleNavigationClick}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">Order History</span>
              </Link>

              <Link
                to="/wishlist"
                onClick={handleNavigationClick}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">My Wishlist</span>
              </Link>

              <Link
                to="/track-order"
                onClick={handleNavigationClick}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900">Track Orders</span>
              </Link>
            </div>

            {/* Recent Orders */}
            {recentOrders.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Orders</h4>
                <div className="space-y-2">
                  {recentOrders.slice(0, 2).map((order) => (
                    <Link
                      key={order.order_id}
                      to={`/orders/${order.order_id}`}
                      onClick={handleNavigationClick}
                      className="block p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-medium text-gray-900">#{order.order_number}</p>
                          <p className="text-xs text-gray-600 capitalize">{order.order_status}</p>
                        </div>
                        <p className="text-xs font-medium text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Service Link */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <Link
                to="/support"
                onClick={handleNavigationClick}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Customer Service</span>
              </Link>
            </div>

            {/* Logout Button */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated User State */
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to LuxeScent</h3>
              <p className="text-sm text-gray-600">Sign in to access your account and enjoy exclusive benefits</p>
            </div>

            {/* Authentication Buttons */}
            <div className="space-y-3 mb-6">
              <Link
                to="/login?action=login"
                onClick={handleNavigationClick}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg block"
              >
                Sign In
              </Link>
              
              <Link
                to="/login?action=register"
                onClick={handleNavigationClick}
                className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg font-medium text-center border border-gray-300 hover:bg-gray-50 transition-colors block"
              >
                Create Account
              </Link>

              <Link
                to="/checkout"
                onClick={handleNavigationClick}
                className="w-full text-purple-600 px-4 py-2 text-center text-sm font-medium hover:text-purple-700 transition-colors block"
              >
                Continue as Guest
              </Link>
            </div>

            {/* Account Benefits */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Account Benefits</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order Tracking</p>
                    <p className="text-xs text-gray-600">Monitor your shipments in real-time</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Save Favorites</p>
                    <p className="text-xs text-gray-600">Create wishlists and save products</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Faster Checkout</p>
                    <p className="text-xs text-gray-600">Save addresses and payment methods</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Exclusive Offers</p>
                    <p className="text-xs text-gray-600">Member-only discounts and early access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GV_AccountDropdown;