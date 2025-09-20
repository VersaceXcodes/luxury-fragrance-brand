import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getApiUrl } from './api';

// Create axios instance with default configuration
const httpClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
httpClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or store
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden
      console.error('Access denied');
    } else if (error.response?.status && error.response.status >= 500) {
      // Server errors
      console.error('Server error:', (error.response?.data as any)?.message || 'Internal server error');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      console.error('Request timeout');
    } else if (error.code === 'ERR_NETWORK') {
      // Network error
      console.error('Network error - please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const retryRequest = async (
  requestFn: () => Promise<AxiosResponse>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<AxiosResponse> => {
  let lastError: AxiosError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as AxiosError;
      
      // Don't retry on client errors (4xx)
      if (lastError.response?.status && lastError.response.status < 500) {
        throw lastError;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
};

// HTTP methods with retry logic
export const http = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return retryRequest(() => httpClient.get<T>(url, config));
  },
  
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return retryRequest(() => httpClient.post<T>(url, data, config));
  },
  
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return retryRequest(() => httpClient.put<T>(url, data, config));
  },
  
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return retryRequest(() => httpClient.delete<T>(url, config));
  },
  
  // Direct axios instance for cases where retry is not needed
  client: httpClient,
};

export default http;