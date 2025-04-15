import { Role, DemandPattern, GameState } from "@/components/game-provider";

// Base URL for API requests - use a default value for local development
const API_BASE_URL = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:5001/api';

// Debug flag to enable mock API responses when backend is unavailable
const USE_MOCK_DATA = false;

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  try {
    // Get the auth token from localStorage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('bdg_token') : null;
    
    // Add auth header if token exists
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    // Try to connect to the backend server
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      // If running in development mode and backend is unavailable, use mock data
      if (USE_MOCK_DATA && (error instanceof TypeError || (error.message && error.message.includes('Failed to fetch')))) {
        console.warn('Backend server unavailable, using mock data for:', endpoint);
        return getMockResponse(endpoint, options);
      }
      throw error;
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
} 