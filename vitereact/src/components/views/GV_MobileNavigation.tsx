import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// API Response Interfaces
interface CategoryResponse {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

// Component Interfaces
interface NavigationCategory {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  children?: NavigationCategory[];
}

const GV_MobileNavigation: React.FC = () => {
  // Local state
  const [currentCategoryExpanded, setCurrentCategoryExpanded] = useState<string | null>(null);

  // Global state selectors (individual to avoid infinite loops)
  const mobileMenuOpen = useAppStore(state => state.ui_state.mobile_menu_open);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const cartItemCount = useAppStore(state => state.cart_state.item_count);
  
  // Global actions
  const toggleMobileMenu = useAppStore(state => state.toggle_mobile_menu);
  const toggleSearchOverlay = useAppStore(state => state.toggle_search_overlay);
  const logoutUser = useAppStore(state => state.logout_user);

  // API query for categories
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['mobile-navigation-categories'],
    queryFn: async (): Promise<CategoryResponse[]> => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/categories`,
        {
          params: {
            is_active: true,
            sort_by: 'display_order'
          }
        }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Transform categories into hierarchy
  const buildCategoryHierarchy = (categories: CategoryResponse[]): NavigationCategory[] => {
    const categoryMap = new Map<string, NavigationCategory>();
    const rootCategories: NavigationCategory[] = [];

    // First pass: create all category objects
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, {
        category_id: cat.category_id,
        category_name: cat.category_name,
        parent_category_id: cat.parent_category_id,
        children: []
      });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      const category = categoryMap.get(cat.category_id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  const navigationCategories = categoriesData ? buildCategoryHierarchy(categoriesData) : [];

  // Event handlers
  const handleCategoryExpand = (categoryId: string) => {
    setCurrentCategoryExpanded(
      currentCategoryExpanded === categoryId ? null : categoryId
    );
  };

  const handleSearchClick = () => {
    toggleSearchOverlay();
    if (mobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  const handleLogout = () => {
    logoutUser();
    if (mobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  const closeMobileMenu = () => {
    if (mobileMenuOpen) {
      toggleMobileMenu();
    }
  };

  // Render category item with children
  const renderCategoryItem = (category: NavigationCategory) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = currentCategoryExpanded === category.category_id;

    return (
      <div key={category.category_id} className="border-b border-gray-100">
        <div
          className="flex items-center justify-between p-4 min-h-[44px] cursor-pointer hover:bg-gray-50 active:bg-gray-100"
          onClick={() => hasChildren ? handleCategoryExpand(category.category_id) : closeMobileMenu()}
        >
          {hasChildren ? (
            <span className="text-gray-900 font-medium">{category.category_name}</span>
          ) : (
            <Link
              to={`/products?category=${category.category_id}`}
              className="text-gray-900 font-medium flex-1"
              onClick={closeMobileMenu}
            >
              {category.category_name}
            </Link>
          )}
          {hasChildren && (
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="bg-gray-50 pl-4">
            {category.children!.map(child => (
              <Link
                key={child.category_id}
                to={`/products?category=${child.category_id}`}
                className="block p-3 text-gray-700 hover:text-purple-600 hover:bg-white min-h-[44px] flex items-center"
                onClick={closeMobileMenu}
              >
                {child.category_name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Hamburger Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-md hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={handleSearchClick}
                  className="w-full bg-gray-100 rounded-lg p-3 text-left text-gray-500 hover:bg-gray-200 min-h-[44px] flex items-center"
                >
                  <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search fragrances...
                </button>
              </div>

              {/* Navigation Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Quick Links */}
                <div className="border-b border-gray-200">
                  <Link
                    to="/"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </Link>
                  <Link
                    to="/products?is_new_arrival=true"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    New Arrivals
                  </Link>
                  <Link
                    to="/products?is_featured=true"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Best Sellers
                  </Link>
                </div>

                {/* Categories */}
                <div className="border-b border-gray-200">
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Categories</h3>
                  </div>
                  {categoriesLoading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading categories...</p>
                    </div>
                  ) : categoriesError ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-red-600">Failed to load categories</p>
                    </div>
                  ) : (
                    <div>
                      {navigationCategories.map(renderCategoryItem)}
                    </div>
                  )}
                </div>

                {/* Special Sections */}
                <div className="border-b border-gray-200">
                  <Link
                    to="/fragrance-finder"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Fragrance Finder
                  </Link>
                  <Link
                    to="/samples"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Sample Program
                  </Link>
                  <Link
                    to="/gifts"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Gift Services
                  </Link>
                </div>

                {/* Account Section */}
                <div>
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h3>
                        <p className="text-xs text-gray-500 mt-1">Welcome back, {currentUser?.first_name}</p>
                      </div>
                      <Link
                        to="/account"
                        className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                        onClick={closeMobileMenu}
                      >
                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Account
                      </Link>
                      <Link
                        to="/account/orders"
                        className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                        onClick={closeMobileMenu}
                      >
                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Order History
                      </Link>
                      <Link
                        to="/wishlist"
                        className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                        onClick={closeMobileMenu}
                      >
                        <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Wishlist
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full p-4 text-left text-red-600 hover:bg-red-50 min-h-[44px] flex items-center"
                      >
                        <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account</h3>
                      </div>
                      <Link
                        to="/login"
                        className="block p-4 text-purple-600 hover:bg-purple-50 min-h-[44px] flex items-center font-medium"
                        onClick={closeMobileMenu}
                      >
                        <svg className="w-5 h-5 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In / Register
                      </Link>
                    </>
                  )}
                </div>

                {/* Customer Service */}
                <div className="border-t border-gray-200">
                  <Link
                    to="/support"
                    className="block p-4 text-gray-900 hover:bg-gray-50 min-h-[44px] flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Customer Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Only visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
        <div className="grid grid-cols-5 h-16">
          {/* Home */}
          <Link
            to="/"
            className="flex flex-col items-center justify-center min-h-[44px] text-gray-600 hover:text-purple-600 active:bg-gray-100"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>

          {/* Search */}
          <button
            onClick={handleSearchClick}
            className="flex flex-col items-center justify-center min-h-[44px] text-gray-600 hover:text-purple-600 active:bg-gray-100"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs">Search</span>
          </button>

          {/* Account */}
          <Link
            to={isAuthenticated ? "/account" : "/login"}
            className="flex flex-col items-center justify-center min-h-[44px] text-gray-600 hover:text-purple-600 active:bg-gray-100"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">{isAuthenticated ? 'Account' : 'Login'}</span>
          </Link>

          {/* Wishlist */}
          <Link
            to={isAuthenticated ? "/wishlist" : "/login"}
            className="flex flex-col items-center justify-center min-h-[44px] text-gray-600 hover:text-purple-600 active:bg-gray-100 relative"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">Wishlist</span>
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            className="flex flex-col items-center justify-center min-h-[44px] text-gray-600 hover:text-purple-600 active:bg-gray-100 relative"
          >
            <div className="relative">
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H19M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
              </svg>
              {cartItemCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </div>
              )}
            </div>
            <span className="text-xs">Cart</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default GV_MobileNavigation;