import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/main';
import { PageTransition } from '@/components/ui/page-transition';

// Import all views
import GV_TopNavigation from '@/components/views/GV_TopNavigation.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';
import GV_MobileNavigation from '@/components/views/GV_MobileNavigation.tsx';
import GV_SearchOverlay from '@/components/views/GV_SearchOverlay.tsx';
import GV_CartDropdown from '@/components/views/GV_CartDropdown.tsx';
import GV_AccountDropdown from '@/components/views/GV_AccountDropdown.tsx';
import GV_NotificationToast from '@/components/views/GV_NotificationToast.tsx';
import UV_Homepage from '@/components/views/UV_Homepage.tsx';
import UV_ProductListing from '@/components/views/UV_ProductListing.tsx';
import UV_ProductDetail from '@/components/views/UV_ProductDetail.tsx';
import UV_ShoppingCart from '@/components/views/UV_ShoppingCart.tsx';
import UV_Checkout from '@/components/views/UV_Checkout.tsx';
import UV_DashboardRouter from '@/components/views/UV_DashboardRouter.tsx';
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
import UV_About from '@/components/views/UV_About.tsx';
import UV_Journal from '@/components/views/UV_Journal.tsx';
import UV_FAQ from '@/components/views/UV_FAQ.tsx';
import UV_Contact from '@/components/views/UV_Contact.tsx';
import UV_BrandDetail from '@/components/views/UV_BrandDetail.tsx';
import UV_NotFound from '@/components/views/UV_NotFound.tsx';

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

// Inner component to access useLocation
const AppRoutes: React.FC = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              {/* Public Routes */}
              <Route path="/" element={<PageTransition><UV_Homepage /></PageTransition>} />
              <Route path="/products" element={<PageTransition><UV_ProductListing /></PageTransition>} />
              <Route path="/products/:product_id" element={<PageTransition><UV_ProductDetail /></PageTransition>} />
              <Route path="/brands/:brand_id" element={<PageTransition><UV_BrandDetail /></PageTransition>} />
              <Route path="/search" element={<PageTransition><UV_SearchResults /></PageTransition>} />
              <Route path="/cart" element={<PageTransition><UV_ShoppingCart /></PageTransition>} />
              <Route path="/checkout" element={<PageTransition><UV_Checkout /></PageTransition>} />
              <Route path="/login" element={<PageTransition><UV_LoginRegistration /></PageTransition>} />
              <Route path="/sign-in" element={<PageTransition><UV_LoginRegistration /></PageTransition>} />
              <Route path="/fragrance-finder" element={<PageTransition><UV_FragranceFinder /></PageTransition>} />
              <Route path="/samples" element={<PageTransition><UV_SampleProgram /></PageTransition>} />
              <Route path="/gifts" element={<PageTransition><UV_GiftServices /></PageTransition>} />
              <Route path="/support" element={<PageTransition><UV_CustomerService /></PageTransition>} />
              <Route path="/track-order" element={<PageTransition><UV_OrderTracking /></PageTransition>} />
              <Route path="/about" element={<PageTransition><UV_About /></PageTransition>} />
              <Route path="/journal" element={<PageTransition><UV_Journal /></PageTransition>} />
              <Route path="/journal/:article_id" element={<PageTransition><UV_Journal /></PageTransition>} />
              <Route path="/faq" element={<PageTransition><UV_FAQ /></PageTransition>} />
              <Route path="/contact" element={<PageTransition><UV_Contact /></PageTransition>} />
              
              {/* Protected Routes */}
              <Route 
                path="/account" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_DashboardRouter />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              <Route 
                path="/wishlist" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_Wishlist />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              <Route 
                path="/orders/:order_id" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_OrderTracking />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              <Route 
                path="/account/profile" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_ProfileSettings />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              <Route 
                path="/account/orders" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_OrderHistory />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              <Route 
                path="/order-confirmation" 
                element={
                  <PageTransition>
                    <ProtectedRoute>
                      <UV_OrderConfirmation />
                    </ProtectedRoute>
                  </PageTransition>
                } 
              />
              
              {/* Catch all route - 404 Not Found */}
              <Route path="*" element={<PageTransition><UV_NotFound /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        );
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
          
          {/* Global Notification Toasts */}
          <GV_NotificationToast />
          
          {/* Main Content Area with Page Transitions */}
          <main className="flex-1" style={{ paddingTop: 'var(--nav-height)' }}>
            <AppRoutes />
          </main>
          
          {/* Footer - Fixed at bottom */}
          <GV_Footer />
        </div>
      </QueryClientProvider>
    </Router>
  );
};

export default App;