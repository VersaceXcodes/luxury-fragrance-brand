import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Types for API responses




interface WishlistResponse {
  wishlist_id: string;
  items: Array<{
    wishlist_item_id: string;
  }>;
}

const GV_TopNavigation: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);


  // Individual Zustand selectors to prevent infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartItemCount = useAppStore(state => state.cart_state.item_count);
  const toggleCartDropdown = useAppStore(state => state.toggle_cart_dropdown);
  const toggleAccountDropdown = useAppStore(state => state.toggle_account_dropdown);
  const toggleMobileMenu = useAppStore(state => state.toggle_mobile_menu);
  const updateSearchQuery = useAppStore(state => state.update_search_query);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Wishlist count query (only for authenticated users)
  const { data: wishlistCount = 0 } = useQuery<number>({
    queryKey: ['wishlist-count'],
    queryFn: async () => {
      if (!authToken) return 0;
      const response = await fetch(`${getApiUrl()}/api/wishlists`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!response.ok) return 0;
      const wishlists: WishlistResponse[] = await response.json();
      return wishlists.reduce((count, wishlist) => count + (wishlist.items?.length || 0), 0);
    },
    enabled: isAuthenticated && !!authToken,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Search submission handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      updateSearchQuery(searchQuery.trim());
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);



  const freeShippingThreshold = 75;

  return (
    <>
      {/* Free Shipping Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-center py-3 text-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
            <path d="M3 4a1 1 0 00-1 1v1a1 1 0 001 1h1l1.68 5.39A3 3 0 008.62 15h5.76a3 3 0 002.94-2.61L18 7H6.41l-.77-3H3z"/>
          </svg>
          <span className="font-semibold">Free shipping on orders over ${freeShippingThreshold} • Free returns within 30 days</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-soft border-b border-neutral-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-medium group-hover:shadow-large transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">LuxeScent</span>
              </Link>
            </div>

            {/* Center: Desktop Navigation Menu */}
            <div className="hidden lg:flex lg:items-center lg:space-x-1">
              
              {/* Men's Fragrances */}
              <div className="relative">
                <button
                  className="text-neutral-700 hover:text-primary-600 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl hover:bg-neutral-50 flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'men' ? null : 'men');
                  }}
                >
                  <span>Men's Fragrances</span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'men' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'men' && (
                  <div className="absolute top-full left-0 mt-2 w-88 bg-white/95 backdrop-blur-md shadow-large rounded-2xl border border-neutral-200/50 py-6 z-50 animate-scale-in">
                    <div className="grid grid-cols-2 gap-6 px-6">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
                          By Notes
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?gender_category=Men&fragrance_families=fresh,citrus" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Fresh & Citrus</Link>
                          <Link to="/products?gender_category=Men&fragrance_families=woody,spicy" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Woody & Spicy</Link>
                          <Link to="/products?gender_category=Men&fragrance_families=oriental,amber" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Oriental & Amber</Link>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-secondary-500 rounded-full mr-2"></div>
                          By Brand Type
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?gender_category=Men" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Designer Brands</Link>
                          <Link to="/products?gender_category=Men" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Niche Brands</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Women's Fragrances */}
              <div className="relative">
                <button
                  className="text-neutral-700 hover:text-primary-600 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl hover:bg-neutral-50 flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'women' ? null : 'women');
                  }}
                >
                  <span>Women's Fragrances</span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'women' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'women' && (
                  <div className="absolute top-full left-0 mt-2 w-88 bg-white/95 backdrop-blur-md shadow-large rounded-2xl border border-neutral-200/50 py-6 z-50 animate-scale-in">
                    <div className="grid grid-cols-2 gap-6 px-6">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
                          By Notes
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?gender_category=Women&fragrance_families=floral" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Floral & Romantic</Link>
                          <Link to="/products?gender_category=Women&fragrance_families=fresh,clean" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Fresh & Clean</Link>
                          <Link to="/products?gender_category=Women&fragrance_families=oriental" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Oriental & Exotic</Link>
                          <Link to="/products?gender_category=Women&fragrance_families=fruity,sweet" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Fruity & Sweet</Link>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-secondary-500 rounded-full mr-2"></div>
                          By Brand Type
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?gender_category=Women" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Designer Brands</Link>
                          <Link to="/products?gender_category=Women" className="block text-sm text-neutral-600 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-all duration-200">Niche Brands</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Unisex */}
              <Link to="/products?gender_category=Unisex" className="text-neutral-700 hover:text-primary-600 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl hover:bg-neutral-50">
                Unisex
              </Link>

              {/* Collections */}
              <Link to="/products?is_featured=true" className="text-neutral-700 hover:text-primary-600 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl hover:bg-neutral-50">
                Collections
              </Link>

              {/* New Arrivals */}
              <Link to="/products?is_new_arrival=true" className="text-neutral-700 hover:text-primary-600 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl hover:bg-neutral-50 relative">
                New Arrivals
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-medium animate-pulse">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </span>
              </Link>

              {/* Sale */}
              <Link to="/products?sale_price=true" className="text-accent-600 hover:text-accent-700 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-xl hover:bg-accent-50 relative">
                Sale
                <span className="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-accent-600/10 rounded-xl animate-pulse"></span>
              </Link>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-lg mx-8 hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <input
                  type="text"
                  placeholder="Search luxury fragrances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all duration-200 placeholder-neutral-400"
                />
                <button type="submit" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 group-hover:text-primary-500 transition-colors duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center space-x-2">
              
              {/* Customer Service */}
              <div className="hidden xl:flex items-center space-x-2 text-sm text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-medium">(555) 123-4567</span>
              </div>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link to="/wishlist" className="relative p-3 text-neutral-600 hover:text-primary-600 transition-all duration-200 rounded-xl hover:bg-neutral-50 group">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-medium animate-pulse">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Shopping Cart */}
              <button
                onClick={toggleCartDropdown}
                className="relative p-3 text-neutral-600 hover:text-primary-600 transition-all duration-200 rounded-xl hover:bg-neutral-50 group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 11-4 0v-5m4 0V8a2 2 0 00-2-2H9a2 2 0 00-2 2v5" />
                </svg>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-medium animate-pulse">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>

              {/* Account Menu */}
              <div className="relative">
                <button
                  onClick={toggleAccountDropdown}
                  className="flex items-center space-x-2 text-neutral-700 hover:text-primary-600 transition-all duration-200 p-3 rounded-xl hover:bg-neutral-50 group"
                >
                  {isAuthenticated && currentUser ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-medium">
                      {currentUser.first_name?.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {isAuthenticated && currentUser && (
                    <span className="hidden md:block text-sm font-medium">
                      {currentUser.first_name}
                    </span>
                  )}
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-3 text-neutral-600 hover:text-primary-600 transition-all duration-200 rounded-xl hover:bg-neutral-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <input
                type="text"
                placeholder="Search luxury fragrances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all duration-200 placeholder-neutral-400"
              />
              <button type="submit" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 group-hover:text-primary-500 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </nav>
    </>
  );
};

export default GV_TopNavigation;