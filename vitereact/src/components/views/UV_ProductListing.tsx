import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on backend schemas
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
  is_limited_edition: boolean;
  created_at: string;
}

interface Brand {
  brand_id: string;
  brand_name: string;
  logo_url: string | null;
  is_active: boolean;
}



interface ProductsResponse {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

const UV_ProductListing: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Zustand store selectors - individual to prevent infinite loops
  const currentQuery = useAppStore(state => state.search_state.current_query);
  const activeFilters = useAppStore(state => state.search_state.active_filters);
  const sortBy = useAppStore(state => state.search_state.sort_by);

  // Store actions
  const updateSearchQuery = useAppStore(state => state.update_search_query);
  const updateSearchFilters = useAppStore(state => state.update_search_filters);
  const updateSortOption = useAppStore(state => state.update_sort_option);
  const clearSearchFilters = useAppStore(state => state.clear_search_filters);
  const addToCart = useAppStore(state => state.add_to_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // Parse URL parameters and sync with store
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    
    // Update search state from URL params
    if (params.query && params.query !== currentQuery) {
      updateSearchQuery(params.query);
    }
    
    if (params.sort_by && params.sort_by !== sortBy) {
      updateSortOption(params.sort_by);
    }

    // Parse and update filters
    const urlFilters = {
      price_min: params.price_min ? Number(params.price_min) : null,
      price_max: params.price_max ? Number(params.price_max) : null,
      brand_ids: params.brand_ids ? params.brand_ids.split(',') : [],
      fragrance_families: params.fragrance_families ? params.fragrance_families.split(',') : [],
      size_options: params.size_options ? params.size_options.split(',').map(Number) : [],
      occasion_tags: params.occasion_tags ? params.occasion_tags.split(',') : [],
      season_suitability: params.season_suitability ? params.season_suitability.split(',') : [],
      availability_status: params.availability_status ? params.availability_status.split(',') : [],
    };

    // Only update if filters have changed (deep comparison)
    const filtersChanged = (
      urlFilters.price_min !== activeFilters.price_min ||
      urlFilters.price_max !== activeFilters.price_max ||
      JSON.stringify(urlFilters.brand_ids.sort()) !== JSON.stringify(activeFilters.brand_ids.sort()) ||
      JSON.stringify(urlFilters.fragrance_families.sort()) !== JSON.stringify(activeFilters.fragrance_families.sort()) ||
      JSON.stringify(urlFilters.size_options.sort()) !== JSON.stringify(activeFilters.size_options.sort()) ||
      JSON.stringify(urlFilters.occasion_tags.sort()) !== JSON.stringify(activeFilters.occasion_tags.sort()) ||
      JSON.stringify(urlFilters.season_suitability.sort()) !== JSON.stringify(activeFilters.season_suitability.sort()) ||
      JSON.stringify(urlFilters.availability_status.sort()) !== JSON.stringify(activeFilters.availability_status.sort())
    );
    if (filtersChanged) {
      updateSearchFilters(urlFilters);
    }

    // Update current page
    const page = params.page ? Number(params.page) : 1;
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [searchParams, currentPage, currentQuery, activeFilters, sortBy, updateSearchQuery, updateSearchFilters, updateSortOption]);

  // Update URL when store state changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (currentQuery) newParams.set('query', currentQuery);
    if (sortBy !== 'best_selling') newParams.set('sort_by', sortBy);
    if (currentPage > 1) newParams.set('page', currentPage.toString());
    
    // Add filters to URL
    if (activeFilters.price_min) newParams.set('price_min', activeFilters.price_min.toString());
    if (activeFilters.price_max) newParams.set('price_max', activeFilters.price_max.toString());
    if (activeFilters.brand_ids.length > 0) newParams.set('brand_ids', activeFilters.brand_ids.join(','));
    if (activeFilters.fragrance_families.length > 0) newParams.set('fragrance_families', activeFilters.fragrance_families.join(','));
    if (activeFilters.size_options.length > 0) newParams.set('size_options', activeFilters.size_options.join(','));
    if (activeFilters.occasion_tags.length > 0) newParams.set('occasion_tags', activeFilters.occasion_tags.join(','));
    if (activeFilters.season_suitability.length > 0) newParams.set('season_suitability', activeFilters.season_suitability.join(','));
    if (activeFilters.availability_status.length > 0) newParams.set('availability_status', activeFilters.availability_status.join(','));

    setSearchParams(newParams, { replace: true });
  }, [currentQuery, activeFilters, sortBy, currentPage, setSearchParams]);

  // API queries
  const productsQuery = useQuery({
    queryKey: ['products', currentQuery, activeFilters, sortBy, currentPage],
    queryFn: async (): Promise<ProductsResponse> => {
      const params: any = {
        page: currentPage,
        per_page: 24,
        sort_by: sortBy,
      };

      if (currentQuery) params.query = currentQuery;
      if (activeFilters.price_min) params.price_min = activeFilters.price_min;
      if (activeFilters.price_max) params.price_max = activeFilters.price_max;
      if (activeFilters.brand_ids.length > 0) params.brand_ids = activeFilters.brand_ids.join(',');
      if (activeFilters.fragrance_families.length > 0) params.fragrance_families = activeFilters.fragrance_families.join(',');
      if (activeFilters.size_options.length > 0) params.size_options = activeFilters.size_options.join(',');
      if (activeFilters.occasion_tags.length > 0) params.occasion_tags = activeFilters.occasion_tags.join(',');
      if (activeFilters.season_suitability.length > 0) params.season_suitability = activeFilters.season_suitability.join(',');
      if (activeFilters.availability_status.length > 0) params.availability_status = activeFilters.availability_status.join(',');

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products`, { params });
      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<Brand[]> => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/brands`, {
        params: { is_active: true, sort_by: 'brand_name' }
      });
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });



  // Filter options
  const fragranceFamilies = [
    { value: 'fresh', label: 'Fresh & Citrus', color: 'bg-green-100 text-green-800' },
    { value: 'floral', label: 'Floral', color: 'bg-pink-100 text-pink-800' },
    { value: 'oriental', label: 'Oriental & Spicy', color: 'bg-orange-100 text-orange-800' },
    { value: 'woody', label: 'Woody', color: 'bg-amber-100 text-amber-800' },
    { value: 'aquatic', label: 'Aquatic', color: 'bg-blue-100 text-blue-800' },
    { value: 'gourmand', label: 'Gourmand', color: 'bg-purple-100 text-purple-800' },
  ];

  const occasionTags = [
    'Day', 'Evening', 'Office', 'Date Night', 'Special Events', 'Casual', 'Formal', 'Sport'
  ];

  const seasonOptions = [
    { value: 'spring', label: 'Spring', icon: '🌸' },
    { value: 'summer', label: 'Summer', icon: '☀️' },
    { value: 'fall', label: 'Fall', icon: '🍂' },
    { value: 'winter', label: 'Winter', icon: '❄️' },
  ];

  const sizeOptions = [30, 50, 75, 100, 125, 200];

  const sortOptions = [
    { value: 'best_selling', label: 'Best Selling' },
    { value: 'product_name', label: 'Name A-Z' },
    { value: 'base_price', label: 'Price: Low to High' },
    { value: 'base_price_desc', label: 'Price: High to Low' },
    { value: 'created_at', label: 'Newest First' },
  ];

  // Filter handlers
  const handleFilterChange = (filterType: string, value: any) => {
    const newFilters = { ...activeFilters };
    
    if (filterType === 'price_min' || filterType === 'price_max') {
      newFilters[filterType] = value || null;
    } else if (Array.isArray(newFilters[filterType])) {
      const currentArray = newFilters[filterType] as any[];
      if (currentArray.includes(value)) {
        newFilters[filterType] = currentArray.filter(item => item !== value);
      } else {
        newFilters[filterType] = [...currentArray, value];
      }
    }
    
    updateSearchFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const removeFilter = (filterType: string, value?: any) => {
    const newFilters = { ...activeFilters };
    
    if (filterType === 'price_min' || filterType === 'price_max') {
      newFilters[filterType] = null;
    } else if (Array.isArray(newFilters[filterType]) && value !== undefined) {
      newFilters[filterType] = (newFilters[filterType] as any[]).filter(item => item !== value);
    }
    
    updateSearchFilters(newFilters);
  };

  const handleClearAllFilters = () => {
    clearSearchFilters();
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: string) => {
    updateSortOption(newSort);
    setCurrentPage(1);
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        product_id: product.product_id,
        product_name: product.product_name,
        brand_name: 'Brand Name', // Would need to join with brand data
        size_ml: 50, // Default size, would need size selection
        quantity: 1,
        unit_price: product.sale_price || product.base_price,
        gift_wrap: false,
        sample_included: false,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.price_min || activeFilters.price_max) count++;
    count += activeFilters.brand_ids.length;
    count += activeFilters.fragrance_families.length;
    count += activeFilters.size_options.length;
    count += activeFilters.occasion_tags.length;
    count += activeFilters.season_suitability.length;
    count += activeFilters.availability_status.length;
    return count;
  }, [activeFilters]);

  const products = productsQuery.data?.data || [];
  const pagination = productsQuery.data?.pagination;
  const brands = brandsQuery.data || [];


  return (
    <>
      <div className="bg-white">
        {/* Page Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Luxury Fragrances</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Discover our curated collection of premium fragrances
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-4">
                {/* Results count */}
                <span className="text-sm text-gray-500">
                  {pagination ? `${pagination.total} products` : ''}
                </span>
                
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="md:hidden inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-2 py-1">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active filters */}
            {activeFilterCount > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  
                  {/* Price range filter */}
                  {(activeFilters.price_min || activeFilters.price_max) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      ${activeFilters.price_min || 0} - ${activeFilters.price_max || '500+'}
                      <button
                        onClick={() => {
                          removeFilter('price_min');
                          removeFilter('price_max');
                        }}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Brand filters */}
                  {activeFilters.brand_ids.map(brandId => {
                    const brand = brands.find(b => b.brand_id === brandId);
                    return brand ? (
                      <span key={brandId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {brand.brand_name}
                        <button
                          onClick={() => removeFilter('brand_ids', brandId)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}

                  {/* Fragrance family filters */}
                  {activeFilters.fragrance_families.map(family => {
                    const familyOption = fragranceFamilies.find(f => f.value === family);
                    return familyOption ? (
                      <span key={family} className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${familyOption.color}`}>
                        {familyOption.label}
                        <button
                          onClick={() => removeFilter('fragrance_families', family)}
                          className="ml-2 hover:opacity-75"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}

                  {/* Clear all button */}
                  <button
                    onClick={handleClearAllFilters}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block">
              <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                
                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.price_min || ''}
                      onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.price_max || ''}
                      onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Brands */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Brands</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {brands.map(brand => (
                      <label key={brand.brand_id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.brand_ids.includes(brand.brand_id)}
                          onChange={() => handleFilterChange('brand_ids', brand.brand_id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{brand.brand_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fragrance Families */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Fragrance Families</h4>
                  <div className="space-y-2">
                    {fragranceFamilies.map(family => (
                      <label key={family.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.fragrance_families.includes(family.value)}
                          onChange={() => handleFilterChange('fragrance_families', family.value)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${family.color}`}>
                          {family.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Size Options */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Size (ml)</h4>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map(size => (
                      <button
                        key={size}
                        onClick={() => handleFilterChange('size_options', size)}
                        className={`px-3 py-1 rounded-md text-sm border ${
                          activeFilters.size_options.includes(size)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {size}ml
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasions */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Occasions</h4>
                  <div className="space-y-2">
                    {occasionTags.map(occasion => (
                      <label key={occasion} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={activeFilters.occasion_tags.includes(occasion)}
                          onChange={() => handleFilterChange('occasion_tags', occasion)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{occasion}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Seasons */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Seasons</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {seasonOptions.map(season => (
                      <button
                        key={season.value}
                        onClick={() => handleFilterChange('season_suitability', season.value)}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm border ${
                          activeFilters.season_suitability.includes(season.value)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="mr-1">{season.icon}</span>
                        {season.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Filter Modal */}
            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowMobileFilters(false)} />
                <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Mobile filter content - same as desktop but in modal */}
                  <div className="space-y-6">
                    {/* Price Range */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Min"
                          value={activeFilters.price_min || ''}
                          onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={activeFilters.price_max || ''}
                          onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Fragrance Families */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Fragrance Families</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {fragranceFamilies.map(family => (
                          <button
                            key={family.value}
                            onClick={() => handleFilterChange('fragrance_families', family.value)}
                            className={`px-3 py-2 rounded-md text-sm border ${
                              activeFilters.fragrance_families.includes(family.value)
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            {family.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Apply/Clear buttons */}
                    <div className="flex space-x-3 pt-4 border-t">
                      <button
                        onClick={handleClearAllFilters}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setShowMobileFilters(false)}
                        className="flex-1 px-4 py-2 bg-purple-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-purple-700"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Grid */}
            <div className="lg:col-span-3">
              {productsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading products...</span>
                </div>
              ) : productsQuery.error ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Error loading products. Please try again.</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No products found matching your criteria.</p>
                  <button
                    onClick={handleClearAllFilters}
                    className="mt-4 text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Product grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <div key={product.product_id} className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
                          <div className="w-full h-64 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <span className="text-gray-400 text-sm">Product Image</span>
                          </div>
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {product.is_new_arrival && (
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">New</span>
                            )}
                            {product.sale_price && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                Sale
                              </span>
                            )}
                            {product.is_limited_edition && (
                              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded">Limited</span>
                            )}
                          </div>

                          {/* Quick actions */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Add to wishlist logic
                                  showNotification({
                                    type: 'success',
                                    message: 'Added to wishlist',
                                    auto_dismiss: true,
                                    duration: 3000,
                                  });
                                }}
                                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                                aria-label="Add to wishlist"
                              >
                                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAddToCart(product);
                                }}
                                disabled={product.availability_status !== 'in_stock'}
                                className="p-2 bg-purple-600 text-white rounded-full shadow-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                aria-label="Add to cart"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5H19M7 13v8a2 2 0 002 2h6a2 2 0 002-2v-8m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4.1" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        <Link to={`/products/${product.product_id}`} className="block p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                              {product.product_name}
                            </h3>
                            <div className="text-right">
                              {product.sale_price ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-red-600">
                                    ${product.sale_price.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500 line-through">
                                    ${product.base_price.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-gray-900">
                                  ${product.base_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-500 mb-2">
                            {product.concentration} • {product.gender_category}
                          </p>
                          
                          {product.short_description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {product.short_description}
                            </p>
                          )}

                          {/* Fragrance families */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {product.fragrance_families.split(',').slice(0, 2).map(family => {
                              const familyOption = fragranceFamilies.find(f => f.value === family.trim());
                              return familyOption ? (
                                <span key={family} className={`text-xs px-2 py-1 rounded ${familyOption.color}`}>
                                  {familyOption.label}
                                </span>
                              ) : null;
                            })}
                          </div>

                          {/* Rating and reviews placeholder */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex text-yellow-400">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg key={star} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="ml-1 text-xs text-gray-500">(24)</span>
                            </div>
                            
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              product.availability_status === 'in_stock' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.availability_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="mt-12 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
                        {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
                        {pagination.total} results
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Previous button */}
                        <button
                          onClick={() => {
                            if (pagination.has_prev) {
                              setCurrentPage(currentPage - 1);
                            }
                          }}
                          disabled={!pagination.has_prev}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-purple-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {/* Next button */}
                        <button
                          onClick={() => {
                            if (pagination.has_next) {
                              setCurrentPage(currentPage + 1);
                            }
                          }}
                          disabled={!pagination.has_next}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Load More button */}
                  {pagination && pagination.has_next && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
                      >
                        Load More Products
                      </button>
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

export default UV_ProductListing;