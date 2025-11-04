import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// API response interfaces based on OpenAPI spec
interface SearchSuggestion {
  product_id: string;
  product_name: string;
  brand_name: string;
}

interface TrendingSearch {
  search_term: string;
  search_count: number;
}



interface SearchSuggestionsResponse {
  products: SearchSuggestion[];
  brands: Array<{ brand_id: string; brand_name: string; }>;
  categories: Array<{ category_id: string; category_name: string; }>;
  popular_searches: string[];
}

const GV_SearchOverlay: React.FC = () => {
  // Zustand store selectors - individual selectors to avoid infinite loops
  const searchQuery = useAppStore(state => state.search_state.current_query);
  const searchOverlayOpen = useAppStore(state => state.ui_state.search_overlay_open);
  const currentBreakpoint = useAppStore(state => state.ui_state.current_breakpoint);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const updateSearchQuery = useAppStore(state => state.update_search_query);
  const toggleSearchOverlay = useAppStore(state => state.toggle_search_overlay);

  // Local state
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  // Debounced search query for API calls
  const [debouncedQuery, setDebouncedQuery] = useState(localQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]);

  // Load recent searches from localStorage for authenticated users
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`recent_searches_${currentUser.user_id}`);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          setRecentSearches([]);
        }
      }
    }
  }, [currentUser]);

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOverlayOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOverlayOpen]);

  // Search suggestions query
  const {
    data: suggestionsData,
    isLoading: suggestionsLoading,
  } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: async (): Promise<SearchSuggestionsResponse> => {
      if (!debouncedQuery.trim()) return { products: [], brands: [], categories: [], popular_searches: [] };
      
      const response = await axios.get(`${getApiUrl()}/api/search/suggestions`, {
        params: { query: debouncedQuery, limit: 10 }
      });
      return response.data;
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Trending searches query
  const {
    data: trendingData,
  } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async (): Promise<TrendingSearch[]> => {
      const response = await axios.get(`${getApiUrl()}/api/search/trending`);
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
  });

  // Quick search results query
  const {
    data: quickResults,
    isLoading: quickResultsLoading,
  } = useQuery({
    queryKey: ['quick-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { data: [] };
      
      const response = await axios.get(`${getApiUrl()}/api/products`, {
        params: { 
          query: debouncedQuery, 
          limit: 5, 
          sort_by: 'best_selling' 
        }
      });
      return response.data;
    },
    enabled: debouncedQuery.length > 2,
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      data: data.data?.map((product: any) => ({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: product.brand_name || 'Unknown Brand',
        base_price: Number(product.base_price || 0)
      })) || []
    })
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  // Handle search submission
  const handleSearch = useCallback((query?: string) => {
    const searchTerm = query || localQuery.trim();
    if (!searchTerm) return;

    // Update global search state
    updateSearchQuery(searchTerm);

    // Save to recent searches for authenticated users
    if (currentUser) {
      const newRecent = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem(`recent_searches_${currentUser.user_id}`, JSON.stringify(newRecent));
    }

    // Navigate to search results
    navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
    
    // Close overlay
    toggleSearchOverlay();
    setShowSuggestions(false);
  }, [localQuery, currentUser, recentSearches, updateSearchQuery, navigate, toggleSearchOverlay]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const suggestions = suggestionsData?.products || [];
    const maxIndex = suggestions.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.min(prev + 1, maxIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          handleSearch(suggestions[selectedSuggestionIndex].product_name);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        toggleSearchOverlay();
      }
    };

    if (searchOverlayOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [searchOverlayOpen, toggleSearchOverlay]);

  // Clear search
  const handleClearSearch = () => {
    setLocalQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  // Popular searches from trending data
  const popularSearches = trendingData?.map(item => item.search_term) || [];

  if (!searchOverlayOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity">
        <div 
          ref={overlayRef}
          className={`${
            currentBreakpoint === 'mobile' 
              ? 'fixed inset-0 bg-white' 
              : 'fixed top-16 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white rounded-b-lg shadow-2xl'
          }`}
        >
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localQuery}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(localQuery.length > 0)}
                  placeholder="Search fragrances, brands, notes..."
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  aria-label="Search for fragrances"
                />
                
                {/* Clear button */}
                {localQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label="Clear search"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Voice Search (Mobile) */}
              {currentBreakpoint === 'mobile' && (
                <button
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-purple-600"
                  aria-label="Voice search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={toggleSearchOverlay}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"
              aria-label="Close search"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Content */}
          <div className={`${currentBreakpoint === 'mobile' ? 'flex-1 overflow-y-auto' : 'max-h-96 overflow-y-auto'}`}>
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestionsData && (
              <div ref={suggestionsRef} className="border-b border-gray-200">
                {suggestionsLoading && (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-sm">Searching...</p>
                  </div>
                )}

                {!suggestionsLoading && suggestionsData.products.length > 0 && (
                  <div className="p-2">
                    <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Products</h3>
                    {suggestionsData.products.map((suggestion, index) => (
                      <button
                        key={suggestion.product_id}
                        onClick={() => handleSearch(suggestion.product_name)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                          index === selectedSuggestionIndex ? 'bg-purple-50 text-purple-700' : ''
                        }`}
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <div>
                          <div className="font-medium">{suggestion.product_name}</div>
                          <div className="text-xs text-gray-500">{suggestion.brand_name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Popular/Recent Searches */}
            {!showSuggestions && (
              <div className="p-4">
                {/* Recent Searches (Authenticated Users) */}
                {currentUser && recentSearches.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                {popularSearches.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Trending Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.slice(0, 8).map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(search)}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Search Categories */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Browse Categories</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/products?gender_category=Women"
                      onClick={toggleSearchOverlay}
                      className="p-3 border border-gray-200 rounded-lg text-center hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">Women's</div>
                      <div className="text-xs text-gray-500">Fragrances</div>
                    </Link>
                    <Link
                      to="/products?gender_category=Men"
                      onClick={toggleSearchOverlay}
                      className="p-3 border border-gray-200 rounded-lg text-center hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">Men's</div>
                      <div className="text-xs text-gray-500">Fragrances</div>
                    </Link>
                    <Link
                      to="/products?is_new_arrival=true"
                      onClick={toggleSearchOverlay}
                      className="p-3 border border-gray-200 rounded-lg text-center hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">New</div>
                      <div className="text-xs text-gray-500">Arrivals</div>
                    </Link>
                    <Link
                      to="/products?availability_status=on_sale"
                      onClick={toggleSearchOverlay}
                      className="p-3 border border-gray-200 rounded-lg text-center hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">Sale</div>
                      <div className="text-xs text-gray-500">Items</div>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Results Preview */}
            {quickResults && quickResults.data.length > 0 && debouncedQuery.length > 2 && (
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Quick Results</h3>
                  <Link
                    to={`/search?query=${encodeURIComponent(debouncedQuery)}`}
                    onClick={toggleSearchOverlay}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    View All Results
                  </Link>
                </div>

                {quickResultsLoading && (
                  <div className="text-center text-gray-500 py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                )}

                <div className="space-y-2">
                  {quickResults.data.slice(0, 5).map((product) => (
                    <Link
                      key={product.product_id}
                      to={`/products/${product.product_id}`}
                      onClick={toggleSearchOverlay}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{product.product_name}</div>
                        <div className="text-sm text-gray-500">{product.brand_name}</div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        ${Number(product.base_price).toFixed(2)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Button (Mobile) */}
          {currentBreakpoint === 'mobile' && localQuery.trim() && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => handleSearch()}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Search for "{localQuery}"
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GV_SearchOverlay;