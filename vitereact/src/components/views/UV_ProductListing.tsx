import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/main';
import { ScrollReveal, MuseumProductCard } from '@/components/ui/motion-components';
import { productImageVariants } from '@/lib/motion-config';

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

  // Parse URL parameters and sync with store (ONLY on mount and URL changes)
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
  }, [searchParams]); // Only depend on searchParams to avoid circular updates

  // Update URL when store state changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (currentQuery) newParams.set('query', currentQuery);
    if (sortBy !== 'best_selling') newParams.set('sort_by', sortBy);
    if (currentPage > 1) newParams.set('page', currentPage.toString());
    
    // Add filters to URL
    if (activeFilters.price_min !== null) newParams.set('price_min', activeFilters.price_min.toString());
    if (activeFilters.price_max !== null) newParams.set('price_max', activeFilters.price_max.toString());
    if (activeFilters.brand_ids.length > 0) newParams.set('brand_ids', activeFilters.brand_ids.join(','));
    if (activeFilters.fragrance_families.length > 0) newParams.set('fragrance_families', activeFilters.fragrance_families.join(','));
    if (activeFilters.size_options.length > 0) newParams.set('size_options', activeFilters.size_options.join(','));
    if (activeFilters.occasion_tags.length > 0) newParams.set('occasion_tags', activeFilters.occasion_tags.join(','));
    if (activeFilters.season_suitability.length > 0) newParams.set('season_suitability', activeFilters.season_suitability.join(','));
    if (activeFilters.availability_status.length > 0) newParams.set('availability_status', activeFilters.availability_status.join(','));

    const currentSearch = searchParams.toString();
    const newSearch = newParams.toString();
    
    // Only update if URL actually changed to prevent unnecessary re-renders
    if (currentSearch !== newSearch) {
      setSearchParams(newParams, { replace: true });
    }
  }, [currentQuery, activeFilters, sortBy, currentPage]);

  // Serialize active filters for query key to ensure proper cache invalidation
  const serializedFilters = useMemo(() => JSON.stringify(activeFilters), [activeFilters]);

  // API queries
  const productsQuery = useQuery({
    queryKey: ['products', currentQuery, serializedFilters, sortBy, currentPage],
    queryFn: async (): Promise<ProductsResponse> => {
      const params: any = {
        page: currentPage,
        per_page: 24,
        sort_by: sortBy,
      };

      if (currentQuery) params.query = currentQuery;
      if (activeFilters.price_min !== null) params.price_min = activeFilters.price_min;
      if (activeFilters.price_max !== null) params.price_max = activeFilters.price_max;
      if (activeFilters.brand_ids.length > 0) params.brand_ids = activeFilters.brand_ids.join(',');
      if (activeFilters.fragrance_families.length > 0) params.fragrance_families = activeFilters.fragrance_families.join(',');
      if (activeFilters.size_options.length > 0) params.size_options = activeFilters.size_options.join(',');
      if (activeFilters.occasion_tags.length > 0) params.occasion_tags = activeFilters.occasion_tags.join(',');
      if (activeFilters.season_suitability.length > 0) params.season_suitability = activeFilters.season_suitability.join(',');
      if (activeFilters.availability_status.length > 0) params.availability_status = activeFilters.availability_status.join(',');

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/products`, { params });
      return response.data;
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<Brand[]> => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai'}/api/brands`, {
        params: { is_active: true, sort_by: 'brand_name' }
      });
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });



  // Filter options - Using minimalist dark theme colors
  const fragranceFamilies = [
    { value: 'fresh', label: 'Fresh & Citrus', color: 'bg-transparent text-[#F5F5F0]/60' },
    { value: 'floral', label: 'Floral', color: 'bg-transparent text-[#F5F5F0]/60' },
    { value: 'oriental', label: 'Oriental & Spicy', color: 'bg-transparent text-[#F5F5F0]/60' },
    { value: 'woody', label: 'Woody', color: 'bg-transparent text-[#F5F5F0]/60' },
    { value: 'aquatic', label: 'Aquatic', color: 'bg-transparent text-[#F5F5F0]/60' },
    { value: 'gourmand', label: 'Gourmand', color: 'bg-transparent text-[#F5F5F0]/60' },
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

  // Removed handleAddToCart - users should view product details to select size before adding to cart

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
      <div className="bg-[#1A1A1A] min-h-screen">
        {/* Page Header */}
        <div className="bg-[#1A1A1A] border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-serif text-[#F5F5F0]" style={{fontFamily: 'Playfair Display, serif'}}>Luxury Fragrances</h1>
                <p className="mt-2 text-sm text-[#F5F5F0]/70">
                  Discover our curated collection of premium fragrances
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-4">
                {/* Results count */}
                <span className="text-sm text-[#F5F5F0]/60">
                  {productsQuery.isLoading ? (
                    'Loading...'
                  ) : pagination ? (
                    `${pagination.total} product${pagination.total !== 1 ? 's' : ''}`
                  ) : (
                    '0 products'
                  )}
                </span>
                
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-[#2D2D2D] border border-gray-700 rounded-md px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-[#2D2D2D]">
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="md:hidden inline-flex items-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-[#F5F5F0] bg-[#2D2D2D] hover:bg-[#3D3D3D] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-[#D4AF37] text-[#1A1A1A] text-xs rounded-full px-2 py-1 font-semibold">
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
                  <span className="text-sm font-medium text-[#F5F5F0]">Active filters:</span>
                  
                  {/* Price range filter */}
                  {(activeFilters.price_min || activeFilters.price_max) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm border border-[#D4AF37] bg-transparent text-[#D4AF37]">
                      ${activeFilters.price_min || 0} - ${activeFilters.price_max || '500+'}
                      <button
                        onClick={() => {
                          removeFilter('price_min');
                          removeFilter('price_max');
                        }}
                        className="ml-2 text-[#D4AF37] hover:text-[#E5C158]"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Brand filters */}
                  {activeFilters.brand_ids.map(brandId => {
                    const brand = brands.find(b => b.brand_id === brandId);
                    return brand ? (
                      <span key={brandId} className="inline-flex items-center px-3 py-1 rounded-full text-sm border border-gray-600 bg-transparent text-[#F5F5F0]">
                        {brand.brand_name}
                        <button
                          onClick={() => removeFilter('brand_ids', brandId)}
                          className="ml-2 text-[#F5F5F0] hover:text-[#D4AF37]"
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
                      <span key={family} className="inline-flex items-center px-3 py-1 rounded-full text-sm border border-gray-600 bg-transparent text-[#F5F5F0]/70">
                        {familyOption.label}
                        <button
                          onClick={() => removeFilter('fragrance_families', family)}
                          className="ml-2 hover:text-[#D4AF37]"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}

                  {/* Clear all button */}
                  <button
                    onClick={handleClearAllFilters}
                    className="text-sm text-[#D4AF37] hover:text-[#E5C158] font-medium"
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
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6 sticky top-8">
                <h3 className="text-lg font-serif text-[#F5F5F0] mb-4" style={{fontFamily: 'Playfair Display, serif'}}>Filters</h3>
                
                {/* Price Range */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Price Range</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={activeFilters.price_min || ''}
                      onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                      className="bg-[#2D2D2D] border border-gray-700 rounded-md px-3 py-2 text-sm text-[#F5F5F0] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={activeFilters.price_max || ''}
                      onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                      className="bg-[#2D2D2D] border border-gray-700 rounded-md px-3 py-2 text-sm text-[#F5F5F0] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Brands */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Brands</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {brands.map(brand => (
                      <label key={brand.brand_id} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={activeFilters.brand_ids.includes(brand.brand_id)}
                          onChange={() => handleFilterChange('brand_ids', brand.brand_id)}
                          className="h-4 w-4 bg-[#2D2D2D] border-gray-700 rounded text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-[#1A1A1A]"
                          style={{accentColor: '#D4AF37'}}
                        />
                        <span className="ml-2 text-sm text-[#F5F5F0]/80 group-hover:text-[#F5F5F0]">{brand.brand_name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fragrance Families */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Fragrance Families</h4>
                  <div className="space-y-2">
                    {fragranceFamilies.map(family => (
                      <label key={family.value} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={activeFilters.fragrance_families.includes(family.value)}
                          onChange={() => handleFilterChange('fragrance_families', family.value)}
                          className="h-4 w-4 bg-[#2D2D2D] border-gray-700 rounded text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-[#1A1A1A]"
                          style={{accentColor: '#D4AF37'}}
                        />
                        <span className="ml-2 text-xs text-[#F5F5F0]/60 uppercase tracking-wider group-hover:text-[#F5F5F0]/80">
                          {family.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Size Options */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Size (ml)</h4>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map(size => (
                      <button
                        key={size}
                        onClick={() => handleFilterChange('size_options', size)}
                        className={`px-3 py-1 rounded-md text-sm border transition-all ${
                          activeFilters.size_options.includes(size)
                            ? 'bg-[#D4AF37] text-[#1A1A1A] border-[#D4AF37] font-semibold'
                            : 'bg-transparent text-[#F5F5F0]/70 border-gray-700 hover:border-[#D4AF37] hover:text-[#F5F5F0]'
                        }`}
                      >
                        {size}ml
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasions */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Occasions</h4>
                  <div className="space-y-2">
                    {occasionTags.map(occasion => (
                      <label key={occasion} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={activeFilters.occasion_tags.includes(occasion)}
                          onChange={() => handleFilterChange('occasion_tags', occasion)}
                          className="h-4 w-4 bg-[#2D2D2D] border-gray-700 rounded text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-[#1A1A1A]"
                          style={{accentColor: '#D4AF37'}}
                        />
                        <span className="ml-2 text-sm text-[#F5F5F0]/80 group-hover:text-[#F5F5F0]">{occasion}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Seasons */}
                <div className="mb-6">
                  <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Seasons</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {seasonOptions.map(season => (
                      <button
                        key={season.value}
                        onClick={() => handleFilterChange('season_suitability', season.value)}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm border transition-all ${
                          activeFilters.season_suitability.includes(season.value)
                            ? 'bg-[#D4AF37] text-[#1A1A1A] border-[#D4AF37] font-semibold'
                            : 'bg-transparent text-[#F5F5F0]/70 border-gray-700 hover:border-[#D4AF37] hover:text-[#F5F5F0]'
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
                <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setShowMobileFilters(false)} />
                <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] rounded-t-lg p-6 max-h-[80vh] overflow-y-auto border-t border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-serif text-[#F5F5F0]" style={{fontFamily: 'Playfair Display, serif'}}>Filters</h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="text-[#F5F5F0]/60 hover:text-[#F5F5F0]"
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
                      <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Price Range</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Min"
                          value={activeFilters.price_min || ''}
                          onChange={(e) => handleFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                          className="bg-[#2D2D2D] border border-gray-700 rounded-md px-3 py-2 text-sm text-[#F5F5F0] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={activeFilters.price_max || ''}
                          onChange={(e) => handleFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                          className="bg-[#2D2D2D] border border-gray-700 rounded-md px-3 py-2 text-sm text-[#F5F5F0] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                        />
                      </div>
                    </div>

                    {/* Fragrance Families */}
                    <div>
                      <h4 className="text-sm font-serif font-medium text-[#F5F5F0] mb-3" style={{fontFamily: 'Playfair Display, serif'}}>Fragrance Families</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {fragranceFamilies.map(family => (
                          <button
                            key={family.value}
                            onClick={() => handleFilterChange('fragrance_families', family.value)}
                            className={`px-3 py-2 rounded-md text-sm border transition-all ${
                              activeFilters.fragrance_families.includes(family.value)
                                ? 'bg-[#D4AF37] text-[#1A1A1A] border-[#D4AF37] font-semibold'
                                : 'bg-transparent text-[#F5F5F0]/70 border-gray-700'
                            }`}
                          >
                            {family.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Apply/Clear buttons */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-800">
                      <button
                        onClick={handleClearAllFilters}
                        className="flex-1 px-4 py-2 border border-gray-700 rounded-md text-sm font-medium text-[#F5F5F0] bg-transparent hover:bg-[#2D2D2D]"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setShowMobileFilters(false)}
                        className="flex-1 px-4 py-2 bg-[#D4AF37] border border-transparent rounded-md text-sm font-medium text-[#1A1A1A] hover:bg-[#E5C158]"
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
                  <span className="ml-3 text-[#F5F5F0]/70">Loading products...</span>
                </div>
              ) : productsQuery.error ? (
                <div className="text-center py-12">
                  <p className="text-[#F5F5F0]/60">Error loading products. Please try again.</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#F5F5F0]/60">No products found matching your criteria.</p>
                  <button
                    onClick={handleClearAllFilters}
                    className="mt-4 text-[#D4AF37] hover:text-[#E5C158] font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Product grid with Museum hover effects */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product, index) => (
                      <ScrollReveal key={product.product_id} delay={index * 0.05}>
                        <MuseumProductCard className="bg-[#2D2D2D] rounded-lg border border-gray-800 overflow-hidden h-full">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-[#1A1A1A]">
                          {product.primary_image ? (
                            <motion.img 
                              src={product.primary_image} 
                              alt={product.product_name}
                              className="w-full h-64 object-cover"
                              variants={productImageVariants}
                              initial="initial"
                              whileHover="hover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-64 bg-[#1A1A1A] flex items-center justify-center ${product.primary_image ? 'hidden' : ''}`}>
                            <div className="text-center text-[#F5F5F0]/20">
                              <svg className="w-16 h-16 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <span className="text-xs">{product.product_name}</span>
                            </div>
                          </div>
                          
                          {/* Badges - Minimalist Gold/Red Bordered Pills */}
                          <div className="absolute top-3 left-3 flex flex-col gap-2">
                            {product.is_new_arrival && (
                              <span className="bg-transparent border border-[#D4AF37] text-[#D4AF37] text-xs px-3 py-1 rounded-full font-medium uppercase tracking-wide">New</span>
                            )}
                            {product.sale_price && (
                              <span className="bg-transparent border border-red-400 text-red-400 text-xs px-3 py-1 rounded-full font-medium uppercase tracking-wide">
                                Sale
                              </span>
                            )}
                            {product.is_limited_edition && (
                              <span className="bg-transparent border border-[#D4AF37] text-[#D4AF37] text-xs px-3 py-1 rounded-full font-medium uppercase tracking-wide">Limited</span>
                            )}
                          </div>

                          {/* Quick Add Button - Appears on Hover */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Link
                              to={`/products/${product.product_id}`}
                              className="bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] px-6 py-2 rounded-md font-medium hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-all duration-200 uppercase tracking-wider text-sm"
                            >
                              Quick View
                            </Link>
                          </div>

                          {/* Wishlist Icon */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                showNotification({
                                  type: 'success',
                                  message: 'Added to wishlist',
                                  auto_dismiss: true,
                                  duration: 3000,
                                });
                              }}
                              className="p-2 bg-[#2D2D2D]/90 backdrop-blur-sm rounded-full hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-all duration-200"
                              aria-label="Add to wishlist"
                            >
                              <svg className="h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <Link to={`/products/${product.product_id}`} className="block p-5 group/link">
                          <div className="mb-3">
                            <motion.h3 
                              className="text-base font-serif text-[#F5F5F0] mb-1" 
                              style={{fontFamily: 'Playfair Display, serif'}}
                              whileHover={{ color: '#D4AF37' }}
                              transition={{ duration: 0.3 }}
                            >
                              {product.product_name}
                            </motion.h3>
                            <p className="text-xs text-[#F5F5F0]/50 uppercase tracking-wider">
                              {product.concentration} • {product.gender_category}
                            </p>
                          </div>
                          
                          {/* Price in Champagne Gold */}
                          <div className="mb-3">
                            {product.sale_price ? (
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-medium text-[#D4AF37]">
                                  ${Number(product.sale_price).toFixed(2)}
                                </span>
                                <span className="text-sm text-[#F5F5F0]/40 line-through">
                                  ${Number(product.base_price).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-medium text-[#D4AF37]">
                                ${Number(product.base_price).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Fragrance families - Minimalist Small Caps */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {product.fragrance_families.split(',').slice(0, 2).map((family, index) => {
                              const familyOption = fragranceFamilies.find(f => f.value === family.trim());
                              return familyOption ? (
                                <span key={family} className="text-xs text-[#F5F5F0]/50 uppercase tracking-widest">
                                  {familyOption.label.toUpperCase()}{index < Math.min(product.fragrance_families.split(',').length - 1, 1) ? ' •' : ''}
                                </span>
                              ) : null;
                            })}
                          </div>

                          {/* Rating and availability */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                            <div className="flex items-center">
                              <div className="flex text-[#D4AF37]">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg key={star} className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="ml-1 text-xs text-[#F5F5F0]/40">(24)</span>
                            </div>
                            
                            <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wide font-medium ${
                              product.availability_status === 'in_stock' 
                                ? 'bg-transparent border border-green-500/50 text-green-400' 
                                : 'bg-transparent border border-red-500/50 text-red-400'
                            }`}>
                              {product.availability_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </Link>
                        </MuseumProductCard>
                      </ScrollReveal>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.total_pages > 1 && (
                    <div className="mt-12 flex items-center justify-between">
                      <div className="text-sm text-[#F5F5F0]/60">
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
                          className="px-4 py-2 text-sm font-medium text-[#F5F5F0] bg-[#2D2D2D] border border-gray-700 rounded-md hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                currentPage === pageNum
                                  ? 'bg-[#D4AF37] text-[#1A1A1A] border border-[#D4AF37]'
                                  : 'text-[#F5F5F0] bg-[#2D2D2D] border border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37]'
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
                          className="px-4 py-2 text-sm font-medium text-[#F5F5F0] bg-[#2D2D2D] border border-gray-700 rounded-md hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                        className="px-8 py-3 bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] rounded-md hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-all duration-200 font-medium uppercase tracking-wider"
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