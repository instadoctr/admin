import Constants from 'expo-constants';
import { authService } from './auth-service';

const API_URL = Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.error('[API] Missing API URL configuration');
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class AdminAPIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL || '';
  }

  /**
   * Make authenticated request to admin API
   */
  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      // Get ID token from Cognito
      const idToken = await authService.getIdToken();

      if (!idToken) {
        throw new Error('Not authenticated');
      }

      const url = `${this.baseURL}${endpoint}`;

      console.log(`[API] ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[API] Request failed:', response.status, data);
        return {
          success: false,
          error: data.message || data.error || 'Request failed',
          message: data.message,
        };
      }

      console.log('[API] Request successful');

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error: any) {
      console.error('[API] Request error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  // ========================================
  // Provider Verification Endpoints
  // ========================================

  /**
   * Get list of pending providers
   */
  async getPendingProviders(): Promise<APIResponse<{
    providers: any[];
    count: number;
  }>> {
    return this.authenticatedRequest('/admin/providers/pending', {
      method: 'GET',
    });
  }

  /**
   * Get provider details with documents
   */
  async getProviderDetails(providerId: string): Promise<APIResponse<{
    provider: any;
    userProfile: any;
  }>> {
    return this.authenticatedRequest(`/admin/providers/${providerId}`, {
      method: 'GET',
    });
  }

  /**
   * Approve provider application
   */
  async verifyProvider(providerId: string): Promise<APIResponse<{
    message: string;
    provider: any;
  }>> {
    return this.authenticatedRequest(`/admin/providers/${providerId}/verify`, {
      method: 'POST',
    });
  }

  /**
   * Reject provider application
   */
  async rejectProvider(providerId: string, reason: string, details?: string): Promise<APIResponse<{
    message: string;
    provider: any;
  }>> {
    return this.authenticatedRequest(`/admin/providers/${providerId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        details,
      }),
    });
  }

  // ========================================
  // Lab Test Management Endpoints (TODO)
  // ========================================

  // async getLabOrders(): Promise<APIResponse<any>> {
  //   return this.authenticatedRequest('/admin/lab-orders', {
  //     method: 'GET',
  //   });
  // }

  // ========================================
  // Cancellation Management Endpoints (TODO)
  // ========================================

  // async getCancellationRequests(): Promise<APIResponse<any>> {
  //   return this.authenticatedRequest('/admin/cancellations', {
  //     method: 'GET',
  //   });
  // }

  // ========================================
  // Dashboard & Analytics Endpoints (TODO)
  // ========================================

  // async getDashboardStats(): Promise<APIResponse<any>> {
  //   return this.authenticatedRequest('/admin/dashboard/stats', {
  //     method: 'GET',
  //   });
  // }
}

export const adminAPI = new AdminAPIClient();
