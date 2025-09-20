import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// Types for form data
interface AddressFormData {
  address_id?: string;
  address_type: 'shipping' | 'billing' | 'both';
  first_name: string;
  last_name: string;
  company: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number: string;
  is_default: boolean;
}

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface NotificationPreferences {
  email_marketing: boolean;
  sms_updates: boolean;
  restock_alerts: boolean;
  price_drop_alerts: boolean;
}

interface FragranceProfile {
  preferred_families: string[];
  intensity_preference: string;
  occasion_preferences: string[];
  season_preferences: string[];
}

const UV_ProfileSettings: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Global state access with individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateUserProfile = useAppStore(state => state.update_user_profile);
  const showNotification = useAppStore(state => state.show_notification);

  // Local state for form management
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: ''
  });

  const [notificationForm, setNotificationForm] = useState<NotificationPreferences>({
    email_marketing: false,
    sms_updates: false,
    restock_alerts: true,
    price_drop_alerts: true
  });

  const [fragranceForm, setFragranceForm] = useState<FragranceProfile>({
    preferred_families: [],
    intensity_preference: '',
    occasion_preferences: [],
    season_preferences: []
  });

  const [addressForm, setAddressForm] = useState<AddressFormData>({
    address_type: 'shipping',
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    phone_number: '',
    is_default: false
  });

  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // API base URL
  const getApiUrl = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Load user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/users/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken
  });

  // Load user addresses
  const { data: userAddresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['userAddresses'],
    queryFn: async () => {
      const response = await axios.get(`${getApiUrl()}/api/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.put(`${getApiUrl()}/api/users/profile`, data, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      updateUserProfile(data);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      showNotification({
        type: 'success',
        message: 'Profile updated successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update profile',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: Omit<AddressFormData, 'address_id'>) => {
      const response = await axios.post(`${getApiUrl()}/api/addresses`, data, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
      setShowAddressForm(false);
      resetAddressForm();
      showNotification({
        type: 'success',
        message: 'Address added successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to add address',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ addressId, data }: { addressId: string; data: Omit<AddressFormData, 'address_id'> }) => {
      const response = await axios.put(`${getApiUrl()}/api/addresses/${addressId}`, data, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
      setEditingAddress(null);
      resetAddressForm();
      showNotification({
        type: 'success',
        message: 'Address updated successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to update address',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await axios.delete(`${getApiUrl()}/api/addresses/${addressId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
      showNotification({
        type: 'success',
        message: 'Address deleted successfully',
        auto_dismiss: true,
        duration: 3000
      });
    },
    onError: (error: any) => {
      showNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete address',
        auto_dismiss: true,
        duration: 5000
      });
    }
  });

  // Initialize forms when user profile loads
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        email: userProfile.email || '',
        phone_number: userProfile.phone_number || '',
        date_of_birth: userProfile.date_of_birth || ''
      });

      // Parse notification preferences
      try {
        const notifPrefs = JSON.parse(userProfile.notification_preferences || '{}');
        setNotificationForm({
          email_marketing: notifPrefs.email_marketing || false,
          sms_updates: notifPrefs.sms_updates || false,
          restock_alerts: notifPrefs.restock_alerts || true,
          price_drop_alerts: notifPrefs.price_drop_alerts || true
        });
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }

      // Parse fragrance profile
      try {
        const fragranceProf = JSON.parse(userProfile.fragrance_profile || '{}');
        setFragranceForm({
          preferred_families: fragranceProf.preferred_families || [],
          intensity_preference: fragranceProf.intensity_preference || '',
          occasion_preferences: fragranceProf.occasion_preferences || [],
          season_preferences: fragranceProf.season_preferences || []
        });
      } catch (error) {
        console.error('Error parsing fragrance profile:', error);
      }
    }
  }, [userProfile]);

  // Form handlers
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      ...profileForm,
      notification_preferences: JSON.stringify(notificationForm),
      fragrance_profile: JSON.stringify(fragranceForm)
    });
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAddress) {
      updateAddressMutation.mutate({
        addressId: editingAddress,
        data: addressForm
      });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showNotification({
        type: 'error',
        message: 'New passwords do not match',
        auto_dismiss: true,
        duration: 5000
      });
      return;
    }

    // Password change endpoint is missing - show notification
    showNotification({
      type: 'error',
      message: 'Password change feature is not yet implemented',
      auto_dismiss: true,
      duration: 5000
    });
  };

  const resetAddressForm = () => {
    setAddressForm({
      address_type: 'shipping',
      first_name: '',
      last_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      phone_number: '',
      is_default: false
    });
  };

  const startEditAddress = (address: any) => {
    setAddressForm({
      address_id: address.address_id,
      address_type: address.address_type,
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
      phone_number: address.phone_number || '',
      is_default: address.is_default
    });
    setEditingAddress(address.address_id);
    setShowAddressForm(true);
  };

  const fragrance_families = ['Floral', 'Oriental', 'Fresh', 'Woody', 'Citrus', 'Fruity', 'Spicy', 'Marine'];
  const intensity_levels = ['Very Light', 'Light', 'Moderate', 'Strong', 'Very Strong'];
  const occasions = ['Office', 'Evening', 'Date Night', 'Casual', 'Special Events', 'Travel'];
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];

  if (profileLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600 mt-1">Manage your personal information and preferences</p>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6">
              <nav className="flex space-x-8">
                {[
                  { id: 'personal', label: 'Personal Info' },
                  { id: 'addresses', label: 'Address Book' },
                  { id: 'security', label: 'Security' },
                  { id: 'preferences', label: 'Preferences' },
                  { id: 'privacy', label: 'Privacy' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeSection === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Personal Information Section */}
          {activeSection === 'personal' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                <p className="text-gray-600 text-sm">Update your personal details and contact information</p>
              </div>
              
              <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      value={profileForm.phone_number}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="date_of_birth"
                      value={profileForm.date_of_birth}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-purple-600 text-white px-6 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Address Book Section */}
          {activeSection === 'addresses' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Address Book</h2>
                  <p className="text-gray-600 text-sm">Manage your shipping and billing addresses</p>
                </div>
                <button
                  onClick={() => {
                    resetAddressForm();
                    setShowAddressForm(true);
                    setEditingAddress(null);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Add Address
                </button>
              </div>

              <div className="p-6">
                {addressesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : userAddresses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No addresses found. Add your first address to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userAddresses.map((address: any) => (
                      <div key={address.address_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              address.address_type === 'shipping' ? 'bg-blue-100 text-blue-800' :
                              address.address_type === 'billing' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {address.address_type.charAt(0).toUpperCase() + address.address_type.slice(1)}
                            </span>
                            {address.is_default && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditAddress(address)}
                              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteAddressMutation.mutate(address.address_id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                              disabled={deleteAddressMutation.isPending}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-900">
                          <p className="font-medium">{address.first_name} {address.last_name}</p>
                          {address.company && <p>{address.company}</p>}
                          <p>{address.address_line_1}</p>
                          {address.address_line_2 && <p>{address.address_line_2}</p>}
                          <p>{address.city}, {address.state_province} {address.postal_code}</p>
                          <p>{address.country}</p>
                          {address.phone_number && <p>{address.phone_number}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Address Form Modal */}
                {showAddressForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowAddressForm(false);
                            setEditingAddress(null);
                            resetAddressForm();
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <form onSubmit={handleAddressSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address Type</label>
                          <select
                            value={addressForm.address_type}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_type: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          >
                            <option value="shipping">Shipping</option>
                            <option value="billing">Billing</option>
                            <option value="both">Both</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input
                              type="text"
                              value={addressForm.first_name}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, first_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                              type="text"
                              value={addressForm.last_name}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, last_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company (Optional)</label>
                          <input
                            type="text"
                            value={addressForm.company}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, company: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                          <input
                            type="text"
                            value={addressForm.address_line_1}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_1: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2 (Optional)</label>
                          <input
                            type="text"
                            value={addressForm.address_line_2}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_2: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input
                              type="text"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                            <input
                              type="text"
                              value={addressForm.state_province}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, state_province: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                            <input
                              type="text"
                              value={addressForm.postal_code}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                            <input
                              type="text"
                              value={addressForm.country}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (Optional)</label>
                            <input
                              type="tel"
                              value={addressForm.phone_number}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, phone_number: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_default"
                            checked={addressForm.is_default}
                            onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                            Set as default address
                          </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddressForm(false);
                              setEditingAddress(null);
                              resetAddressForm();
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {(createAddressMutation.isPending || updateAddressMutation.isPending) 
                              ? 'Saving...' 
                              : editingAddress ? 'Update Address' : 'Add Address'
                            }
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                <p className="text-gray-600 text-sm">Manage your account security and login credentials</p>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  {!showPasswordForm ? (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Change Password
                    </button>
                  ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="current_password"
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="new_password"
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          minLength={8}
                        />
                      </div>

                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirm_password"
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                          minLength={8}
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                          Update Password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Two-Factor Authentication placeholder */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <p className="text-gray-600 mb-4">Add an extra layer of security to your account</p>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <div className="space-y-8">
              {/* Communication Preferences */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Communication Preferences</h2>
                  <p className="text-gray-600 text-sm">Choose how you'd like to receive updates from us</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email Marketing</h3>
                      <p className="text-sm text-gray-500">Receive promotional emails about new products and sales</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationForm.email_marketing}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, email_marketing: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">SMS Updates</h3>
                      <p className="text-sm text-gray-500">Get order updates and shipping notifications via text</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationForm.sms_updates}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, sms_updates: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Restock Alerts</h3>
                      <p className="text-sm text-gray-500">Notify me when wishlisted items are back in stock</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationForm.restock_alerts}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, restock_alerts: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Price Drop Alerts</h3>
                      <p className="text-sm text-gray-500">Get notified when prices drop on your favorite items</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationForm.price_drop_alerts}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, price_drop_alerts: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleProfileSubmit}
                      disabled={updateProfileMutation.isPending}
                      className="bg-purple-600 text-white px-6 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Fragrance Preferences */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Fragrance Preferences</h2>
                  <p className="text-gray-600 text-sm">Help us recommend fragrances you'll love</p>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Fragrance Families</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {fragrance_families.map((family) => (
                        <label key={family} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={fragranceForm.preferred_families.includes(family)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  preferred_families: [...prev.preferred_families, family]
                                }));
                              } else {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  preferred_families: prev.preferred_families.filter(f => f !== family)
                                }));
                              }
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-sm text-gray-700">{family}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intensity Preference</label>
                    <select
                      value={fragranceForm.intensity_preference}
                      onChange={(e) => setFragranceForm(prev => ({ ...prev, intensity_preference: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select intensity preference</option>
                      {intensity_levels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Occasions</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {occasions.map((occasion) => (
                        <label key={occasion} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={fragranceForm.occasion_preferences.includes(occasion)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  occasion_preferences: [...prev.occasion_preferences, occasion]
                                }));
                              } else {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  occasion_preferences: prev.occasion_preferences.filter(o => o !== occasion)
                                }));
                              }
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-sm text-gray-700">{occasion}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Seasons</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {seasons.map((season) => (
                        <label key={season} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={fragranceForm.season_preferences.includes(season)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  season_preferences: [...prev.season_preferences, season]
                                }));
                              } else {
                                setFragranceForm(prev => ({
                                  ...prev,
                                  season_preferences: prev.season_preferences.filter(s => s !== season)
                                }));
                              }
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-sm text-gray-700">{season}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleProfileSubmit}
                      disabled={updateProfileMutation.isPending}
                      className="bg-purple-600 text-white px-6 py-2 rounded-md font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Privacy Settings</h2>
                <p className="text-gray-600 text-sm">Manage your data privacy and account settings</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Data Export</h3>
                  <p className="text-gray-600 text-sm mb-4">Download a copy of your personal data</p>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md font-medium cursor-not-allowed"
                  >
                    Request Data Export (Coming Soon)
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cookie Preferences</h3>
                  <p className="text-gray-600 text-sm mb-4">Manage your cookie consent preferences</p>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md font-medium cursor-not-allowed"
                  >
                    Manage Cookies (Coming Soon)
                  </button>
                </div>

                <div className="border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-900 mb-2">Delete Account</h3>
                  <p className="text-red-600 text-sm mb-4">Permanently delete your account and all associated data</p>
                  <button
                    disabled
                    className="bg-red-200 text-red-400 px-4 py-2 rounded-md font-medium cursor-not-allowed"
                  >
                    Delete Account (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProfileSettings;