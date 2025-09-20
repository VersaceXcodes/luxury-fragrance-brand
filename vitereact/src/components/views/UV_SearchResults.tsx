import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas
interface Product {
  product_id: string;
  brand_id: string;
  category_id: string;
  product_name: string;
  description: string | null;
  short_description: string | null;
  fragrance_families: string;
  concentration: string;
  gender_category: string;
  base_price: number;
  sale_price: number | null;
  availability_status: string;
  is_featured: boolean;
  is_new_arrival: boolean;
  sku_prefix: string;
  created_at: string;
  updated_at: string;
}

interface Brand {
  brand_id: string;
  brand_name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
}

interface SearchResponse {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  search_time?: number;
}

interface SearchSuggestionsResponse {
  products: Array<{
    product_id: string;
    product_name: string;
    brand_name: string;
  }>;
  brands: Array<{
    brand_id: string;
    brand_name: string;
  }>;
  categories: Array<{
    category_id: string;
    category_name: string;
  }>;
  popular_searches: string[];
}

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Individual Zustand selectors to avoid infinite loops
  const globalSearchQuery = useAppStore(state => state.search_state.current_query);
  const addToCart = useAppStore(state => state.add_to_cart);
  const updateSearchQuery = useAppStore(state => state.update_search_query);
  const updateSearchFilters = useAppStore(state => state.update_search_filters);

  // Parse URL parameters
  const searchQuery = searchParams.get('query') || '';
  const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null;
  const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null;
  const brandIds = useMemo(() => searchParams.get('brand_ids')?.split(',').filter(Boolean) || [], [searchParams]);
  const fragranceFamilies = useMemo(() => searchParams.get('fragrance_families')?.split(',').filter(Boolean) || [], [searchParams]);
  const sortBy = searchParams.get('sort_by') || 'best_selling';
  const currentPage = Number(searchParams.get('page')) || 1;

  // Local state for UI interactions
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState({ min: priceMin, max: priceMax });
  const [selectedBrands, setSelectedBrands] = useState<string[]>(brandIds);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>(fragranceFamilies);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Main search query
  const searchProductsQuery = useQuery({
    queryKey: ['searchProducts', searchQuery, priceMin, priceMax, brandIds, fragranceFamilies, sortBy, currentPage],
    queryFn: async (): Promise<SearchResponse> => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (priceMin) params.append('price_min', priceMin.toString());
      if (priceMax) params.append('price_max', priceMax.toString());
      if (brandIds.length > 0) params.append('brand_ids', brandIds.join(','));
      if (fragranceFamilies.length > 0) params.append('fragrance_families', fragranceFamilies.join(','));
      params.append('sort_by', sortBy);
      params.append('page', currentPage.toString());
      params.append('per_page', '20');

      const response = await axios.get(`${getApiUrl()}/api/products?${params.toString()}`);
      return response.data;
    },
    enabled: !!searchQuery,
    staleTime: 30000,
    retry: 1,
  });

  // Search suggestions query
  const searchSuggestionsQuery = useQuery({
    queryKey: ['searchSuggestions', searchQuery],
    queryFn: async (): Promise<SearchSuggestionsResponse> => {
      const response = await axios.get(`${getApiUrl()}/api/search/suggestions`, {
        params: { query: searchQuery, limit: 10 }
      });
      return response.data;
    },
    enabled: !!searchQuery && searchQuery.length > 2,
    staleTime: 60000,
    retry: 1,
  });

  // Brands query for filter options
  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<Brand[]> => {
      const response = await axios.get(`${getApiUrl()}/api/brands`, {
        params: { is_active: true, sort_by: 'brand_name' }
      });
      return response.data;
    },
    staleTime: 300000,
    retry: 1,
  });

  // Sync with global state
  useEffect(() => {
    if (searchQuery !== globalSearchQuery) {
      updateSearchQuery(searchQuery);
    }
  }, [searchQuery, globalSearchQuery, updateSearchQuery]);

  useEffect(() => {
    const filters = {
      price_min: priceMin,
      price_max: priceMax,
      brand_ids: brandIds,
      fragrance_families: fragranceFamilies,
      size_options: [],
      occasion_tags: [],
      season_suitability: [],
      availability_status: [],
    };
    updateSearchFilters(filters);
  }, [priceMin, priceMax, brandIds, fragranceFamilies, updateSearchFilters]);

  // Update URL parameters
  const updateUrlParams = useCallback((newParams: Record<string, string | null>) => {
    const currentParams = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    
    setSearchParams(currentParams);
  }, [searchParams, setSearchParams]);

  // Handle filter changes
  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    setPriceRange({ min, max });
    updateUrlParams({
      price_min: min?.toString() || null,
      price_max: max?.toString() || null,
      page: '1' // Reset to first page
    });
  };

  const handleBrandToggle = (brandId: string) => {
    const newSelectedBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter(id => id !== brandId)
      : [...selectedBrands, brandId];
    
    setSelectedBrands(newSelectedBrands);
    updateUrlParams({
      brand_ids: newSelectedBrands.length > 0 ? newSelectedBrands.join(',') : null,
      page: '1'
    });
  };

  const handleFamilyToggle = (family: string) => {
    const newSelectedFamilies = selectedFamilies.includes(family)
      ? selectedFamilies.filter(f => f !== family)
      : [...selectedFamilies, family];
    
    setSelectedFamilies(newSelectedFamilies);
    updateUrlParams({
      fragrance_families: newSelectedFamilies.length > 0 ? newSelectedFamilies.join(',') : null,
      page: '1'
    });
  };

  const handleSortChange = (newSort: string) => {
    updateUrlParams({ sort_by: newSort, page: '1' });
  };

  const handlePageChange = (page: number) => {
    updateUrlParams({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setPriceRange({ min: null, max: null });
    setSelectedBrands([]);
    setSelectedFamilies([]);
    updateUrlParams({
      price_min: null,
      price_max: null,
      brand_ids: null,
      fragrance_families: null,
      page: '1'
    });
  };

  // Handle add to cart
  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: 'Brand Name', // Would need to fetch brand name
        size_ml: 50, // Default size
        quantity: 1,
        unit_price: product.sale_price || product.base_price,
        gift_wrap: false,
        sample_included: false,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  // Fragrance family options
  const fragranceFamilyOptions = [
    'Floral', 'Fresh', 'Oriental', 'Woody', 'Citrus', 'Fruity', 'Gourmand', 'Marine', 'Green', 'Spicy'
  ];

  const searchResults = searchProductsQuery.data?.data || [];
  const pagination = searchProductsQuery.data?.pagination;
  const searchTime = searchProductsQuery.data?.search_time || 0;
  const suggestions = searchSuggestionsQuery.data;
  const brands = brandsQuery.data || [];

  const isLoading = searchProductsQuery.isLoading;
  const hasError = searchProductsQuery.isError;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Search Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                  Search Results
                  {searchQuery && (
                    <span className="text-purple-600"> for "{searchQuery}"</span>
                  )}
                </h1>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {viewMode === 'grid' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Results summary */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  {pagination && (
                    <span>
                      {pagination.total} products found
                      {searchTime > 0 && ` in ${searchTime}ms`}
                    </span>
                  )}
                  {(selectedBrands.length > 0 || selectedFamilies.length > 0 || priceRange.min || priceRange.max) && (
                    <button
                      onClick={clearAllFilters}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <label htmlFor="sort" className="text-gray-700">Sort by:</label>
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="best_selling">Best Selling</option>
                    <option value="product_name">Name A-Z</option>
                    <option value="base_price">Price: Low to High</option>
                    <option value="created_at">Newest</option>
                  </select>
                </div>
              </div>

              {/* Active filters */}
              {(selectedBrands.length > 0 || selectedFamilies.length > 0 || priceRange.min || priceRange.max) && (
                <div className="flex flex-wrap gap-2">
                  {priceRange.min && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Min: ${priceRange.min}
                      <button
                        onClick={() => handlePriceRangeChange(null, priceRange.max)}
                        className="ml-2 text-purple-600 hover:text-purple-700"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {priceRange.max && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Max: ${priceRange.max}
                      <button
                        onClick={() => handlePriceRangeChange(priceRange.min, null)}
                        className="ml-2 text-purple-600 hover:text-purple-700"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedBrands.map(brandId => {
                    const brand = brands.find(b => b.brand_id === brandId);
                    return brand ? (
                      <span key={brandId} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {brand.brand_name}
                        <button
                          onClick={() => handleBrandToggle(brandId)}
                          className="ml-2 text-blue-600 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                  {selectedFamilies.map(family => (
                    <span key={family} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {family}
                      <button
                        onClick={() => handleFamilyToggle(family)}
                        className="ml-2 text-green-600 hover:text-green-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <span className="font-medium text-gray-700">Filters</span>
                  <svg className={`w-5 h-5 transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <div className={`space-y-6 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
                {/* Price Range Filter */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min || ''}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value ? Number(e.target.value) : null }))}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max || ''}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value ? Number(e.target.value) : null }))}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      onClick={() => handlePriceRangeChange(priceRange.min, priceRange.max)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Apply Price Filter
                    </button>
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Brands</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {brands.map(brand => (
                      <label key={brand.brand_id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.brand_id)}
                          onChange={() => handleBrandToggle(brand.brand_id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{brand.brand_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fragrance Family Filter */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Fragrance Families</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {fragranceFamilyOptions.map(family => (
                      <label key={family} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedFamilies.includes(family)}
                          onChange={() => handleFamilyToggle(family)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{family}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="lg:w-3/4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Searching...</span>
                </div>
              ) : hasError ? (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
                  <p className="text-gray-600 mb-4">Sorry, we encountered an error while searching. Please try again.</p>
                  <button
                    onClick={() => searchProductsQuery.refetch()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find any products matching "{searchQuery}". Try adjusting your search or filters.
                  </p>
                  {suggestions?.popular_searches && suggestions.popular_searches.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Popular searches:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestions.popular_searches.slice(0, 5).map(term => (
                          <Link
                            key={term}
                            to={`/search?query=${encodeURIComponent(term)}`}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                          >
                            {term}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6">
                    <Link
                      to="/fragrance-finder"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Try our Fragrance Finder
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Products Grid */}
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                    : "space-y-4"
                  }>
                    {searchResults.map(product => (
                      <div key={product.product_id} className={`bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}>
                        <div className={viewMode === 'list' ? 'w-32 flex-shrink-0' : 'aspect-w-1 aspect-h-1'}>
                          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="p-4 flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm">
                                <Link 
                                  to={`/products/${product.product_id}`}
                                  className="hover:text-purple-600"
                                  dangerouslySetInnerHTML={{
                                    __html: product.product_name.replace(
                                      new RegExp(`(${searchQuery})`, 'gi'),
                                      '<mark class="bg-yellow-200">$1</mark>'
                                    )
                                  }}
                                />
                              </h3>
                              <p className="text-xs text-gray-600 mb-1">{product.concentration}</p>
                              <p className="text-xs text-gray-500">{product.fragrance_families}</p>
                            </div>
                            {product.is_new_arrival && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                New
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-2">
                              {product.sale_price ? (
                                <>
                                  <span className="text-lg font-bold text-purple-600">
                                    ${product.sale_price.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    ${product.base_price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">
                                  ${product.base_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={product.availability_status !== 'in_stock'}
                              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {product.availability_status === 'in_stock' ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="mt-8 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} results
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={!pagination.has_prev}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                          const pageNum = Math.max(1, pagination.page - 2) + i;
                          if (pageNum > pagination.total_pages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 border text-sm font-medium rounded-md ${
                                pageNum === pagination.page
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={!pagination.has_next}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SearchResults;