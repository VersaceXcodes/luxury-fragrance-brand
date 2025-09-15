import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Types for API responses
interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  display_order: number;
}

interface Brand {
  brand_id: string;
  brand_name: string;
  logo_url: string | null;
  is_niche_brand: boolean;
}



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
  const logoutUser = useAppStore(state => state.logout_user);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Categories query
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/categories?is_active=true&sort_by=display_order&sort_order=asc`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Brands query
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/brands?is_active=true&limit=20&sort_by=display_order`);
      if (!response.ok) throw new Error('Failed to fetch brands');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

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
      <div className="bg-purple-600 text-white text-center py-2 text-sm">
        <span className="font-medium">Free shipping on orders over ${freeShippingThreshold}</span>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-purple-600">LuxeScent</span>
              </Link>
            </div>

            {/* Center: Desktop Navigation Menu */}
            <div className="hidden lg:flex lg:items-center lg:space-x-8">
              
              {/* Men's Fragrances */}
              <div className="relative">
                <button
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'men' ? null : 'men');
                  }}
                >
                  Men's Fragrances
                  <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'men' && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white shadow-lg rounded-md border border-gray-200 py-4 z-50">
                    <div className="grid grid-cols-2 gap-4 px-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">By Notes</h3>
                        <Link to="/products?gender_category=Men&fragrance_families=fresh,citrus" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Fresh & Citrus</Link>
                        <Link to="/products?gender_category=Men&fragrance_families=woody,spicy" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Woody & Spicy</Link>
                        <Link to="/products?gender_category=Men&fragrance_families=oriental,amber" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Oriental & Amber</Link>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">By Brand Type</h3>
                        <Link to="/products?gender_category=Men" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Designer Brands</Link>
                        <Link to="/products?gender_category=Men" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Niche Brands</Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Women's Fragrances */}
              <div className="relative">
                <button
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'women' ? null : 'women');
                  }}
                >
                  Women's Fragrances
                  <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'women' && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white shadow-lg rounded-md border border-gray-200 py-4 z-50">
                    <div className="grid grid-cols-2 gap-4 px-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">By Notes</h3>
                        <Link to="/products?gender_category=Women&fragrance_families=floral" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Floral & Romantic</Link>
                        <Link to="/products?gender_category=Women&fragrance_families=fresh,clean" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Fresh & Clean</Link>
                        <Link to="/products?gender_category=Women&fragrance_families=oriental" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Oriental & Exotic</Link>
                        <Link to="/products?gender_category=Women&fragrance_families=fruity,sweet" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Fruity & Sweet</Link>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">By Brand Type</h3>
                        <Link to="/products?gender_category=Women" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Designer Brands</Link>
                        <Link to="/products?gender_category=Women" className="block text-sm text-gray-600 hover:text-purple-600 py-1">Niche Brands</Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Unisex */}
              <Link to="/products?gender_category=Unisex" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors">
                Unisex
              </Link>

              {/* Collections */}
              <Link to="/products?is_featured=true" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors">
                Collections
              </Link>

              {/* New Arrivals */}
              <Link to="/products?is_new_arrival=true" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium transition-colors relative">
                New Arrivals
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">!</span>
              </Link>

              {/* Sale */}
              <Link to="/products?sale_price=true" className="text-red-600 hover:text-red-700 px-3 py-2 text-sm font-bold transition-colors">
                Sale
              </Link>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-lg mx-8 hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search fragrances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button type="submit" className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center space-x-4">
              
              {/* Customer Service */}
              <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>(555) 123-4567</span>
              </div>

              {/* Wishlist */}
              {isAuthenticated && (
                <Link to="/wishlist" className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Shopping Cart */}
              <button
                onClick={toggleCartDropdown}
                className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 11-4 0v-5m4 0V8a2 2 0 00-2-2H9a2 2 0 00-2 2v5" />
                </svg>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>

              {/* Account Menu */}
              <div className="relative">
                <button
                  onClick={toggleAccountDropdown}
                  className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
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
                className="lg:hidden p-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search fragrances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button type="submit" className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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