import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Import all views
import GV_TopNavigation from '@/components/views/GV_TopNavigation.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';
import GV_MobileNavigation from '@/components/views/GV_MobileNavigation.tsx';
import GV_SearchOverlay from '@/components/views/GV_SearchOverlay.tsx';
import GV_CartDropdown from '@/components/views/GV_CartDropdown.tsx';
import GV_AccountDropdown from '@/components/views/GV_AccountDropdown.tsx';
import UV_Homepage from '@/components/views/UV_Homepage.tsx';
import UV_ProductListing from '@/components/views/UV_ProductListing.tsx';
import UV_ProductDetail from '@/components/views/UV_ProductDetail.tsx';
import UV_ShoppingCart from '@/components/views/UV_ShoppingCart.tsx';
import UV_Checkout from '@/components/views/UV_Checkout.tsx';
import UV_AccountDashboard from '@/components/views/UV_AccountDashboard.tsx';
import UV_LoginRegistration from '@/components/views/UV_LoginRegistration.tsx';
import UV_Wishlist from '@/components/views/UV_Wishlist.tsx';
import UV_FragranceFinder from '@/components/views/UV_FragranceFinder.tsx';
import UV_SampleProgram from '@/components/views/UV_SampleProgram.tsx';
import UV_GiftServices from '@/components/views/UV_GiftServices.tsx';
import UV_CustomerService from '@/components/views/UV_CustomerService.tsx';
import UV_OrderTracking from '@/components/views/UV_OrderTracking.tsx';
import UV_SearchResults from '@/components/views/UV_SearchResults.tsx';
import UV_OrderConfirmation from '@/components/views/UV_OrderConfirmation.tsx';
import UV_ProfileSettings from '@/components/views/UV_ProfileSettings.tsx';
import UV_OrderHistory from '@/components/views/UV_OrderHistory.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Loading component for authentication states
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Individual selectors to avoid infinite loops with Zustand
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  // Individual Zustand selectors to prevent infinite re-renders
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const initializeAuth = useAppStore(state => state.initialize_auth);
  const searchOverlayOpen = useAppStore(state => state.ui_state.search_overlay_open);
  const cartDropdownOpen = useAppStore(state => state.ui_state.cart_dropdown_open);
  const accountDropdownOpen = useAppStore(state => state.ui_state.account_dropdown_open);
  const mobileMenuOpen = useAppStore(state => state.ui_state.mobile_menu_open);
  const currentBreakpoint = useAppStore(state => state.ui_state.current_breakpoint);
  
  useEffect(() => {
    // Initialize authentication state when app loads
    initializeAuth();
  }, [initializeAuth]);
  
  // Show loading spinner during initial auth check
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="App min-h-screen flex flex-col relative bg-white">
          {/* Fixed Top Navigation */}
          <GV_TopNavigation />
          
          {/* Mobile Navigation - Show on mobile and when menu is open */}
          {(currentBreakpoint === 'mobile' || mobileMenuOpen) && <GV_MobileNavigation />}
          
          {/* Global Overlays and Dropdowns - Conditional rendering */}
          {searchOverlayOpen && (
            <div className="fixed inset-0 z-50">
              <GV_SearchOverlay />
            </div>
          )}
          {cartDropdownOpen && (
            <div className="fixed top-[var(--nav-height)] right-4 z-40">
              <GV_CartDropdown />
            </div>
          )}
          {accountDropdownOpen && (
            <div className="fixed top-[var(--nav-height)] right-4 z-40">
              <GV_AccountDropdown />
            </div>
          )}
          
          {/* Main Content Area */}
          <main className="flex-1" style={{ paddingTop: 'var(--nav-height)' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<UV_Homepage />} />
              <Route path="/products" element={<UV_ProductListing />} />
              <Route path="/products/:product_id" element={<UV_ProductDetail />} />
              <Route path="/search" element={<UV_SearchResults />} />
              <Route path="/cart" element={<UV_ShoppingCart />} />
              <Route path="/checkout" element={<UV_Checkout />} />
              <Route path="/login" element={<UV_LoginRegistration />} />
              <Route path="/fragrance-finder" element={<UV_FragranceFinder />} />
              <Route path="/samples" element={<UV_SampleProgram />} />
              <Route path="/gifts" element={<UV_GiftServices />} />
              <Route path="/support" element={<UV_CustomerService />} />
              <Route path="/track-order" element={<UV_OrderTracking />} />
              
              {/* Protected Routes */}
              <Route 
                path="/account" 
                element={
                  <ProtectedRoute>
                    <UV_AccountDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/wishlist" 
                element={
                  <ProtectedRoute>
                    <UV_Wishlist />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/orders/:order_id" 
                element={
                  <ProtectedRoute>
                    <UV_OrderTracking />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/profile" 
                element={
                  <ProtectedRoute>
                    <UV_ProfileSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/orders" 
                element={
                  <ProtectedRoute>
                    <UV_OrderHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/order-confirmation" 
                element={
                  <ProtectedRoute>
                    <UV_OrderConfirmation />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route - redirect to homepage */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Footer - Fixed at bottom */}
          <GV_Footer />
        </div>
      </QueryClientProvider>
    </Router>
  );
};

export default App;