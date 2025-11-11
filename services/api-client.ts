import Constants from 'expo-constants';
import { authService } from './auth-service';
import { router } from 'expo-router';

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
        console.log('[API] No ID token found - redirecting to login');
        router.replace('/login');
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

        // Handle 401 Unauthorized - session expired or invalid
        if (response.status === 401) {
          console.log('[API] Unauthorized - redirecting to login');
          authService.signOut();
          router.replace('/login');
          return {
            success: false,
            error: 'Session expired. Please login again.',
            message: 'Unauthorized',
          };
        }

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
  // Appointments Management Endpoints
  // ========================================

  /**
   * Get list of appointments
   */
  async getAppointments(status?: string): Promise<APIResponse<{
    appointments: any[];
    count: number;
  }>> {
    const queryParams = status ? `?status=${status}` : '';
    return this.authenticatedRequest(`/admin/appointments${queryParams}`, {
      method: 'GET',
    });
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string): Promise<APIResponse<{
    message: string;
    appointment: any;
  }>> {
    return this.authenticatedRequest(`/admin/appointments/${appointmentId}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        notes,
      }),
    });
  }

  // ========================================
  // Lab Test Management Endpoints
  // ========================================

  /**
   * Get list of lab orders
   */
  async getLabOrders(status?: string): Promise<APIResponse<{
    labOrders: any[];
    count: number;
  }>> {
    const queryParams = status ? `?status=${status}` : '';
    return this.authenticatedRequest(`/admin/lab-orders${queryParams}`, {
      method: 'GET',
    });
  }

  /**
   * Update lab order status
   */
  async updateLabOrderStatus(orderId: string, status: string, notes?: string): Promise<APIResponse<{
    message: string;
    order: any;
  }>> {
    return this.authenticatedRequest(`/admin/lab-orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        notes,
      }),
    });
  }

  // ========================================
  // Dashboard & Analytics Endpoints
  // ========================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<APIResponse<{
    stats: {
      newSignups: number;
      pendingProviders: number;
      labBookings: number;
      revenueToday: number;
    };
    timestamp: string;
  }>> {
    return this.authenticatedRequest('/admin/dashboard/stats', {
      method: 'GET',
    });
  }
}

export const adminAPI = new AdminAPIClient();
