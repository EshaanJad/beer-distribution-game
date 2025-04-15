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
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`API error: ${response.status}`);
        }
      }

      const data = await response.json();
      return data;
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

/**
 * Generate mock responses for testing when backend is unavailable
 */
function getMockResponse(endpoint: string, options: RequestInit) {
  // Extract method and path from the request
  const method = options.method || 'GET';
  const path = endpoint.split('?')[0]; // Remove query parameters
  
  // Mock responses for authentication endpoints
  if (path === '/auth/register' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    return {
      success: true,
      data: {
        id: 'mock_user_' + Date.now(),
        username: body.username,
        email: body.email,
        token: 'mock_token_' + Date.now()
      }
    };
  }
  
  if (path === '/auth/login' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    if (body.email && body.password) {
      return {
        success: true,
        data: {
          id: 'mock_user_' + Date.now(),
          username: body.email.split('@')[0],
          email: body.email,
          token: 'mock_token_' + Date.now()
        }
      };
    } else {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
  }
  
  if (path === '/auth/me' && method === 'GET') {
    return {
      success: true,
      data: {
        id: 'mock_user_123',
        username: 'mockuser',
        email: 'mock@example.com',
        isAdmin: false
      }
    };
  }
  
  // Mock responses for games endpoints
  if (path === '/games/create' && method === 'POST') {
    return {
      success: true,
      data: {
        gameId: 'mock_game_' + Date.now()
      }
    };
  }
  
  if (path === '/games/join' && method === 'POST') {
    const body = JSON.parse(options.body as string);
    return {
      success: true,
      data: {
        gameId: body.gameId,
        userId: 'mock_user_' + Date.now(),
        role: body.role
      }
    };
  }
  
  // Default mock response
  return {
    success: false,
    error: 'Mock response not implemented for this endpoint'
  };
}

/**
 * Authentication functions
 */
export const auth = {
  // Login with email and password
  login: async (email: string, password: string) => {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    return data;
  },
  
  // Register a new user
  register: async (username: string, email: string, password: string) => {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  },
  
  // Login with wallet
  walletLogin: async (address: string, signature: string) => {
    const data = await fetchApi('/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({ address, signature })
    });
    
    if (data.success && data.data && data.data.token) {
      localStorage.setItem('bdg_token', data.data.token);
    }
    
    return data;
  },
  
  // Get current user information
  getCurrentUser: () => fetchApi('/auth/me'),
  
  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bdg_token');
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return typeof window !== 'undefined' && !!localStorage.getItem('bdg_token');
  }
};

/**
 * Game management functions
 */
export const games = {
  // Create a new game
  create: async (config: {
    demandPattern: DemandPattern;
    initialInventory: number;
    orderDelayPeriod: number;
    shippingDelayPeriod: number;
    blockchainEnabled: boolean;
    agents?: {
      enabled: boolean;
      algorithmConfig?: {
        forecastHorizon: number;
        safetyFactor: number;
        visibilityMode: 'traditional' | 'blockchain';
      };
    };
  }) => {
    return fetchApi('/games/create', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },
  
  // Join an existing game
  join: async (gameId: string, role: Role) => {
    return fetchApi('/games/join', {
      method: 'POST',
      body: JSON.stringify({ gameId, role })
    });
  },
  
  // Start the game
  start: async (gameId: string) => {
    return fetchApi(`/games/${gameId}/start`, {
      method: 'POST'
    });
  },
  
  // Advance to the next week
  advanceWeek: async (gameId: string) => {
    return fetchApi(`/games/${gameId}/advance`, {
      method: 'POST'
    });
  },
  
  // Get all games for the current user
  getAll: () => fetchApi('/games'),
  
  // Get a specific game by ID
  getById: (gameId: string) => fetchApi(`/games/${gameId}`),
  
  // Get game state for a specific week
  getStateForWeek: (gameId: string, week: number) => fetchApi(`/games/${gameId}/state/${week}`),
  
  // Enable autoplay mode
  enableAutoplay: async (gameId: string, interval: number = 5000) => {
    return fetchApi(`/games/${gameId}/autoplay`, {
      method: 'POST',
      body: JSON.stringify({ enabled: true, interval })
    });
  },
  
  // Disable autoplay mode
  disableAutoplay: async (gameId: string) => {
    return fetchApi(`/games/${gameId}/autoplay`, {
      method: 'POST',
      body: JSON.stringify({ enabled: false })
    });
  }
};

/**
 * Order management functions
 */
export const orders = {
  // Place an order
  place: async (gameId: string, senderRole: Role, recipientRole: Role, quantity: number) => {
    return fetchApi('/orders/place', {
      method: 'POST',
      body: JSON.stringify({ gameId, senderRole, recipientRole, quantity })
    });
  },
  
  // Get all orders for a game
  getForGame: (gameId: string) => fetchApi(`/orders/game/${gameId}`),
  
  // Get orders for a specific week
  getForWeek: (gameId: string, week: number) => fetchApi(`/orders/game/${gameId}/week/${week}`),
  
  // Get orders for a specific role
  getForRole: (gameId: string, role: Role) => fetchApi(`/orders/game/${gameId}/role/${role}`)
};

/**
 * Inventory management functions
 */
export const inventory = {
  // Get inventory for a specific role
  getForRole: (gameId: string, role: Role) => fetchApi(`/inventory/${gameId}/${role}`),
  
  // Get inventory history for a role
  getHistoryForRole: (gameId: string, role: Role) => fetchApi(`/inventory/${gameId}/${role}/history`),
  
  // Get inventory for all roles
  getForAllRoles: (gameId: string) => fetchApi(`/inventory/${gameId}`)
};

/**
 * Analytics functions
 */
export const analytics = {
  // Get historical data for a game
  getGameHistory: (gameId: string) => fetchApi(`/analytics/gameHistory/${gameId}`),
  
  // Get performance metrics for a game
  getPerformance: (gameId: string) => fetchApi(`/analytics/performance/${gameId}`)
};

/**
 * Blockchain functions
 */
export const blockchain = {
  // Submit a transaction to the blockchain
  submitTransaction: async (gameId: string, functionName: string, params: any) => {
    return fetchApi(`/blockchain/transaction`, {
      method: 'POST',
      body: JSON.stringify({ gameId, functionName, params })
    });
  },
  
  // Verify a transaction on the blockchain
  verifyTransaction: (transactionId: string) => fetchApi(`/blockchain/transaction/${transactionId}/verify`),
  
  // Get transaction history from the blockchain
  getTransactionHistory: (gameId: string) => fetchApi(`/blockchain/transactions/${gameId}`)
}; 