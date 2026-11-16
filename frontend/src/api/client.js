import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shramsetu_token') || localStorage.getItem('workforce_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Discard invalid token and redirect if on protected route
      localStorage.removeItem('shramsetu_token');
      localStorage.removeItem('shramsetu_user');
      localStorage.removeItem('workforce_token');
      localStorage.removeItem('workforce_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    const formattedMessage = Array.isArray(message) ? message.join(', ') : message;
    return Promise.reject(new Error(formattedMessage));
  },
);

export default apiClient;
