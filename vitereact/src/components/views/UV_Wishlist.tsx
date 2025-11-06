import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on backend schemas
interface Wishlist {
  wishlist_id: string;
  wishlist_name: string;
  is_public: boolean;
  is_default: boolean;
  share_token: string | null;
  created_at: string;
  item_count?: number;
}

interface WishlistItem {
  wishlist_item_id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  current_price: number;
  original_price: number | null;
  size_ml: number | null;
  stock_status: string;
  price_change: number | null;
  added_at: string;
  notes: string | null;
  product_image_url: string;
}

interface WishlistWithItems extends Wishlist {
  items: Array<{
    wishlist_item_id: string;
    product_id: string;
    size_ml: number | null;
    notes: string | null;
    added_at: string;
    product_name?: string;
    brand_name?: string;
    base_price?: string;
    sale_price?: string | null;
    availability_status?: string;
    product_image?: string;
    product?: {
      product_id: string;
      product_name: string;
      brand_id: string;
      brand_name: string;
      base_price: number;
      sale_price: number | null;
      availability_status: string;
      image_url?: string;
    };
  }>;
}

interface ShareOptions {
  public_url: string | null;
  share_token: string | null;
  is_sharing_enabled: boolean;
  privacy_level: 'private' | 'public' | 'link_only';
}

const UV_Wishlist: React.FC = () => {
  // Zustand store selectors (individual selectors to avoid infinite loops)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const addToCart = useAppStore(state => state.add_to_cart);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state
  const [currentWishlistId, setCurrentWishlistId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [sharingOptions, setSharingOptions] = useState<ShareOptions>({
    public_url: null,
    share_token: null,
    is_sharing_enabled: false,
    privacy_level: 'private'
  });

  const queryClient = useQueryClient();

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  // Headers for authenticated requests
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });

  // Fetch user wishlists
  const { data: wishlists = [], isLoading: wishlistsLoading, error: wishlistsError } = useQuery({
    queryKey: ['wishlists', currentUser?.user_id],
    queryFn: async (): Promise<Wishlist[]> => {
      const response = await axios.get(`${getApiUrl()}/api/wishlists`, {
        headers: getAuthHeaders()
      });
      return response.data.map((wishlist: any) => ({
        ...wishlist,
        item_count: wishlist.items ? wishlist.items.length : 0
      }));
    },
    enabled: !!currentUser && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Set default wishlist when wishlists are loaded
  useEffect(() => {
    if (wishlists.length > 0 && !currentWishlistId) {
      const defaultWishlist = wishlists.find(w => w.is_default) || wishlists[0];
      setCurrentWishlistId(defaultWishlist.wishlist_id);
    }
  }, [wishlists, currentWishlistId]);

  // Fetch current wishlist items
  const { data: currentWishlist, isLoading: wishlistItemsLoading } = useQuery({
    queryKey: ['wishlist', currentWishlistId],
    queryFn: async (): Promise<WishlistWithItems> => {
      if (!currentWishlistId) throw new Error('No wishlist selected');
      const response = await axios.get(`${getApiUrl()}/api/wishlists/${currentWishlistId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!currentWishlistId && !!authToken,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Transform wishlist items for display
  const wishlistItems: WishlistItem[] = currentWishlist?.items?.map(item => {
    const productData = item.product || item;
    return {
      wishlist_item_id: item.wishlist_item_id,
      product_id: item.product_id,
      product_name: productData.product_name,
      brand_name: productData.brand_name,
      current_price: Number(productData.base_price || 0),
      original_price: productData.sale_price ? Number(productData.sale_price) : null,
      size_ml: item.size_ml,
      stock_status: productData.availability_status || 'in_stock',
      price_change: null,
      added_at: item.added_at,
      notes: item.notes,
      product_image_url: productData.image_url || productData.product_image || 'https://picsum.photos/300/300'
    };
  }) || [];

  // Remove item from wishlist mutation
  const removeItemMutation = useMutation({
    mutationFn: async (wishlistItemId: string) => {
      await axios.delete(
        `${getApiUrl()}/api/wishlists/${currentWishlistId}/items/${wishlistItemId}`,
        { headers: getAuthHeaders() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', currentWishlistId] });
      queryClient.invalidateQueries({ queryKey: ['wishlists', currentUser?.user_id] });
      showNotification({
        type: 'success',
        message: 'Item removed from wishlist',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to remove item',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Add item to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (item: WishlistItem) => {
      await addToCart({
        product_id: item.product_id,
        product_name: item.product_name,
        brand_name: item.brand_name,
        size_ml: item.size_ml || 50,
        quantity: 1,
        unit_price: item.current_price,
        gift_wrap: false,
        sample_included: false
      });
    },
    onSuccess: () => {
      showNotification({
        type: 'success',
        message: 'Item added to cart',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: () => {
      showNotification({
        type: 'error',
        message: 'Failed to add item to cart',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Create new wishlist mutation
  const createWishlistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await axios.post(
        `${getApiUrl()}/api/wishlists`,
        {
          wishlist_name: name,
          is_public: false,
          is_default: false
        },
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (newWishlist) => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', currentUser?.user_id] });
      setShowCreateModal(false);
      setNewWishlistName('');
      setCurrentWishlistId(newWishlist.wishlist_id);
      showNotification({
        type: 'success',
        message: 'New wishlist created successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create wishlist',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Generate share link mutation
  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${getApiUrl()}/api/wishlists/${currentWishlistId}/share`,
        {},
        { headers: getAuthHeaders() }
      );
      return response.data;
    },
    onSuccess: (shareData) => {
      setSharingOptions({
        public_url: shareData.public_url,
        share_token: shareData.share_token,
        is_sharing_enabled: true,
        privacy_level: 'link_only'
      });
      setShowShareModal(true);
      showNotification({
        type: 'success',
        message: 'Share link generated successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to generate share link',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Handle item selection for bulk actions
  const handleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle bulk remove
  const handleBulkRemove = async () => {
    for (const itemId of selectedItems) {
      await removeItemMutation.mutateAsync(itemId);
    }
    setSelectedItems([]);
    setBulkActionMode(false);
  };

  // Copy share link to clipboard
  const copyShareLink = async () => {
    if (sharingOptions.public_url) {
      try {
        await navigator.clipboard.writeText(sharingOptions.public_url);
        showNotification({
          type: 'success',
          message: 'Share link copied to clipboard',
          auto_dismiss: true,
          duration: 3000
        });
      } catch {
        showNotification({
          type: 'error',
          message: 'Failed to copy link',
          auto_dismiss: true,
          duration: 3000
        });
      }
    }
  };

  // Loading state
  if (wishlistsLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading your wishlists...</span>
        </div>
      </>
    );
  }

  // Error state
  if (wishlistsError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Wishlists</h2>
            <p className="text-gray-600 mb-4">Please try refreshing the page</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Wishlists</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} in current list
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
                {wishlistItems.length > 0 && (
                  <>
                    <button
                      onClick={() => setBulkActionMode(!bulkActionMode)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {bulkActionMode ? 'Cancel Selection' : 'Select Items'}
                    </button>
                    
                    <button
                      onClick={() => generateShareLinkMutation.mutate()}
                      disabled={generateShareLinkMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {generateShareLinkMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          Share Wishlist
                        </>
                      )}
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Wishlist
                </button>
              </div>
            </div>

            {/* Wishlist Tabs */}
            {wishlists.length > 1 && (
              <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {wishlists.map((wishlist) => (
                    <button
                      key={wishlist.wishlist_id}
                      onClick={() => setCurrentWishlistId(wishlist.wishlist_id)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentWishlistId === wishlist.wishlist_id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {wishlist.wishlist_name}
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                        {wishlist.item_count || 0}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {bulkActionMode && selectedItems.length > 0 && (
              <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-900">
                  {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
                </span>
                <button
                  onClick={handleBulkRemove}
                  disabled={removeItemMutation.isPending}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {removeItemMutation.isPending ? 'Removing...' : 'Remove Selected'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {wishlistItemsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading wishlist items...</p>
            </div>
          ) : wishlistItems.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16">
              <div className="text-6xl mb-6">💝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Start adding your favorite fragrances to keep track of scents you love and want to try.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/products?is_new_arrival=true"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  Browse New Arrivals
                </Link>
                
                <Link
                  to="/fragrance-finder"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Take Fragrance Quiz
                </Link>
                
                <Link
                  to="/products?is_featured=true"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Featured Products
                </Link>
              </div>
            </div>
          ) : (
            /* Wishlist Items Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.map((item) => (
                <div key={item.wishlist_item_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                  {/* Selection Checkbox */}
                  {bulkActionMode && (
                    <div className="p-3 border-b border-gray-100">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.wishlist_item_id)}
                          onChange={() => handleItemSelection(item.wishlist_item_id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Select</span>
                      </label>
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/300/300';
                      }}
                    />
                    
                    {/* Stock Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.stock_status === 'in_stock'
                          ? 'bg-green-100 text-green-800'
                          : item.stock_status === 'out_of_stock'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.stock_status === 'in_stock' ? 'In Stock' : 
                         item.stock_status === 'out_of_stock' ? 'Out of Stock' : 
                         'Limited'}
                      </span>
                    </div>

                    {/* Price Change Indicator */}
                    {item.original_price && item.original_price !== item.current_price && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Sale
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                        <Link
                          to={`/products/${item.product_id}`}
                          className="hover:text-purple-600 transition-colors"
                        >
                          {item.product_name}
                        </Link>
                      </h3>
                      <p className="text-sm text-gray-500">{item.brand_name}</p>
                    </div>

                    {/* Pricing */}
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-gray-900">
                          ${item.current_price.toFixed(2)}
                        </span>
                        {item.original_price && item.original_price !== item.current_price && (
                          <span className="text-sm text-gray-500 line-through">
                            ${item.original_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {item.size_ml && (
                        <p className="text-xs text-gray-500">{item.size_ml}ml</p>
                      )}
                    </div>

                    {/* Added Date */}
                    <p className="text-xs text-gray-400 mb-3">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addToCartMutation.mutate(item)}
                        disabled={addToCartMutation.isPending || item.stock_status === 'out_of_stock'}
                        className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
                      </button>
                      
                      <button
                        onClick={() => removeItemMutation.mutate(item.wishlist_item_id)}
                        disabled={removeItemMutation.isPending}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        title="Remove from wishlist"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Share Wishlist</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={sharingOptions.public_url || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Anyone with this link can view your wishlist. They won't be able to edit it.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Wishlist Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Wishlist</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewWishlistName('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newWishlistName.trim()) {
                  createWishlistMutation.mutate(newWishlistName.trim());
                }
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wishlist Name
                  </label>
                  <input
                    type="text"
                    value={newWishlistName}
                    onChange={(e) => setNewWishlistName(e.target.value)}
                    placeholder="e.g., Holiday Gifts, Date Night Scents"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    maxLength={255}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewWishlistName('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createWishlistMutation.isPending || !newWishlistName.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {createWishlistMutation.isPending ? 'Creating...' : 'Create Wishlist'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Wishlist;