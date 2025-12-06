import React from 'react';
import { useAppStore } from '@/store/main';
import UV_AccountDashboard from '@/components/views/UV_AccountDashboard';
import UV_HostDashboard from '@/components/views/UV_HostDashboard';

/**
 * Dashboard Router Component
 * Routes users to the appropriate dashboard based on their role
 */
const UV_DashboardRouter: React.FC = () => {
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Determine dashboard based on user role
  const userRole = currentUser?.user_role || currentUser?.role || 'customer';
  
  // Route to host dashboard if user is a host
  if (userRole === 'host') {
    return <UV_HostDashboard />;
  }
  
  // Default to customer dashboard for all other roles
  return <UV_AccountDashboard />;
};

export default UV_DashboardRouter;
