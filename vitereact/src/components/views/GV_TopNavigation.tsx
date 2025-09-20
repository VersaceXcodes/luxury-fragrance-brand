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



  // const freeShippingThreshold = 75; // Currently unused but kept for future implementation

  return (
    <>
      {/* Free Shipping Banner */}
      <div className="bg-[var(--nocturne-onyx)] text-[var(--nocturne-porcelain)] text-center py-3 text-caption relative overflow-hidden">
        <div className="nocturne-container flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
            <path d="M3 4a1 1 0 00-1 1v1a1 1 0 001 1h1l1.68 5.39A3 3 0 008.62 15h5.76a3 3 0 002.94-2.61L18 7H6.41l-.77-3H3z"/>
          </svg>
          <span className="font-[var(--font-weight-medium)]">Free EU shipping on orders over €120 • 30-day returns on unopened items</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-[var(--color-surface-primary)]/95 backdrop-blur-md shadow-[var(--shadow-subtle)] border-b border-[var(--color-border-primary)] sticky top-0 z-[var(--z-sticky)]">
        <div className="nocturne-container">
          <div className="flex items-center justify-between h-[var(--nav-height)]">
            
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-[var(--nocturne-onyx)] rounded-full flex items-center justify-center group-hover:bg-[var(--nocturne-warm-taupe)] transition-all duration-[var(--duration-normal)]">
                  <svg className="w-4 h-4 text-[var(--nocturne-porcelain)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-h3 font-[var(--font-heading)] font-[var(--font-weight-bold)] text-[var(--color-fg-primary)] leading-none tracking-[var(--text-h3-spacing)]">Nocturne</span>
                  <span className="text-caption text-[var(--color-fg-secondary)] font-[var(--font-weight-light)] tracking-widest uppercase">Atelier</span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Menu */}
            <div className="hidden lg:flex lg:items-center lg:space-x-8">
              
              {/* Shop */}
              <div className="relative">
                <button
                  className="text-[var(--color-fg-primary)] hover:text-[var(--color-fg-secondary)] px-4 py-3 text-body font-[var(--font-weight-medium)] transition-all duration-[var(--duration-normal)] flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'shop' ? null : 'shop');
                  }}
                >
                  <span>Shop</span>
                  <svg className={`w-4 h-4 transition-transform duration-[var(--duration-normal)] ${activeDropdown === 'shop' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {activeDropdown === 'shop' && (
                  <div className="absolute top-full left-0 mt-2 w-96 bg-[var(--color-surface-primary)]/95 backdrop-blur-md shadow-[var(--shadow-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] py-6 z-[var(--z-dropdown)]">
                    <div className="grid grid-cols-2 gap-6 px-6">
                      <div>
                        <h3 className="text-caption font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-3 uppercase tracking-wider">
                          By Family
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?family=citrus" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Citrus</Link>
                          <Link to="/products?family=floral" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Floral</Link>
                          <Link to="/products?family=amber" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Amber</Link>
                          <Link to="/products?family=woody" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Woody</Link>
                          <Link to="/products?family=green" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Green</Link>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-caption font-[var(--font-weight-semibold)] text-[var(--color-fg-primary)] mb-3 uppercase tracking-wider">
                          Collections
                        </h3>
                        <div className="space-y-2">
                          <Link to="/products?collection=bestsellers" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Bestsellers</Link>
                          <Link to="/products?collection=new" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">New Arrivals</Link>
                          <Link to="/products?collection=limited" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Limited Edition</Link>
                          <Link to="/samples" className="block text-body text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)] py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-muted)] transition-all duration-[var(--duration-normal)]">Sample Sets</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* About */}
              <Link to="/about" className="text-[var(--color-fg-primary)] hover:text-[var(--color-fg-secondary)] px-4 py-3 text-body font-[var(--font-weight-medium)] transition-all duration-[var(--duration-normal)]">
                About
              </Link>

              {/* Journal */}
              <Link to="/journal" className="text-[var(--color-fg-primary)] hover:text-[var(--color-fg-secondary)] px-4 py-3 text-body font-[var(--font-weight-medium)] transition-all duration-[var(--duration-normal)]">
                Journal
              </Link>

              {/* FAQ */}
              <Link to="/faq" className="text-[var(--color-fg-primary)] hover:text-[var(--color-fg-secondary)] px-4 py-3 text-body font-[var(--font-weight-medium)] transition-all duration-[var(--duration-normal)]">
                FAQ
              </Link>

              {/* Contact */}
              <Link to="/contact" className="text-[var(--color-fg-primary)] hover:text-[var(--color-fg-secondary)] px-4 py-3 text-body font-[var(--font-weight-medium)] transition-all duration-[var(--duration-normal)]">
                Contact
              </Link>
            </div>

            {/* Right: Search Bar */}
            <div className="flex-1 max-w-sm ml-8 hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <input
                  type="text"
                  placeholder="Search notes, fragrances..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-muted)] border border-[var(--color-border-primary)] rounded-[var(--radius-full)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-[var(--color-border-focus)] focus:bg-[var(--color-surface-primary)] transition-all duration-[var(--duration-normal)] placeholder:text-[var(--color-fg-muted)] text-body"
                />
                <button type="submit" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-primary)] transition-colors duration-[var(--duration-normal)]">
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