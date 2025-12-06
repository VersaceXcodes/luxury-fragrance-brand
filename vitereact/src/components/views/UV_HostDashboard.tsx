import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types for host-specific data
interface HostProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  user_role: string;
  created_at: string;
}

interface Villa {
  villa_id: string;
  name: string;
  location: string;
  status: string;
  nightly_rate: number;
  total_bookings: number;
}

interface Reservation {
  reservation_id: string;
  villa_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
}

interface RevenueSummary {
  total_revenue: number;
  current_month_revenue: number;
  pending_payouts: number;
  completed_bookings: number;
  active_villas: number;
}

const UV_HostDashboard: React.FC = () => {
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'https://123luxury-fragrance-brand.launchpulse.ai';

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  });

  // Host Profile Query
  const { data: hostProfile } = useQuery({
    queryKey: ['hostProfile'],
    queryFn: async (): Promise<HostProfile> => {
      const response = await axios.get(`${getApiUrl()}/api/users/profile`, {
        headers: getAuthHeaders()
      });
      return response.data;
    },
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000
  });

  // Mock data for villas (since backend doesn't have villa tables yet)
  const mockVillas: Villa[] = [
    {
      villa_id: 'villa_001',
      name: 'Sunset Villa',
      location: 'Malibu, CA',
      status: 'active',
      nightly_rate: 850,
      total_bookings: 12
    },
    {
      villa_id: 'villa_002',
      name: 'Ocean View Estate',
      location: 'Miami, FL',
      status: 'active',
      nightly_rate: 1200,
      total_bookings: 8
    }
  ];

  // Mock data for reservations
  const mockReservations: Reservation[] = [
    {
      reservation_id: 'res_001',
      villa_name: 'Sunset Villa',
      guest_name: 'John Doe',
      check_in: '2025-12-15',
      check_out: '2025-12-20',
      status: 'confirmed',
      total_amount: 4250
    },
    {
      reservation_id: 'res_002',
      villa_name: 'Ocean View Estate',
      guest_name: 'Jane Smith',
      check_in: '2025-12-18',
      check_out: '2025-12-25',
      status: 'pending',
      total_amount: 8400
    }
  ];

  // Mock revenue summary
  const mockRevenueSummary: RevenueSummary = {
    total_revenue: 45600,
    current_month_revenue: 12650,
    pending_payouts: 8400,
    completed_bookings: 20,
    active_villas: 2
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      confirmed: { color: 'bg-blue-100 text-blue-800', text: 'Confirmed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const displayName = hostProfile?.first_name || currentUser?.first_name || 'Host';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Host Dashboard - Welcome, {displayName}!
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your villas, reservations, and revenue
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg">
              <div className="text-sm font-medium">HOST ACCOUNT</div>
              <div className="text-xs opacity-90">Premium Member</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockRevenueSummary.total_revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockRevenueSummary.current_month_revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Villas</p>
                <p className="text-2xl font-bold text-gray-900">{mockRevenueSummary.active_villas}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{mockRevenueSummary.completed_bookings}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Villas Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Your Villas</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Add New Villa
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {mockVillas.map((villa) => (
                    <div key={villa.villa_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{villa.name}</h3>
                            {getStatusBadge(villa.status)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {villa.location} • {villa.total_bookings} bookings
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(villa.nightly_rate)}/night
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                              Edit
                            </button>
                            <button className="text-xs text-gray-600 hover:text-gray-700 font-medium">
                              View Stats
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Reservations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Reservations</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {mockReservations.map((reservation) => (
                    <div key={reservation.reservation_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">{reservation.villa_name}</span>
                            {getStatusBadge(reservation.status)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Guest: {reservation.guest_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(reservation.total_amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-sm font-medium text-gray-900">Add New Villa</div>
                  <div className="text-xs text-gray-600">List a new property</div>
                </button>
                <button className="w-full text-left px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-sm font-medium text-gray-900">View Calendar</div>
                  <div className="text-xs text-gray-600">Check availability</div>
                </button>
                <Link 
                  to="/account/profile"
                  className="block w-full text-left px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">Update Profile</div>
                  <div className="text-xs text-gray-600">Edit your information</div>
                </Link>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Occupancy Rate</span>
                  <span className="font-semibold text-gray-900">78%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg. Rating</span>
                  <span className="font-semibold text-gray-900">4.8 ⭐</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-gray-900">2.5 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_HostDashboard;
