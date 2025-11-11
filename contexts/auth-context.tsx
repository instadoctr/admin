import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AdminUser } from '@/services/auth-service';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        console.log('[Auth] User authenticated:', currentUser.email);
      } else {
        setUser(null);
        console.log('[Auth] No authenticated user');
      }
    } catch (error) {
      console.error('[Auth] Check auth error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const result = await authService.signIn(email, password);

      setUser(result.user);
      console.log('[Auth] Sign in successful:', result.user.email);
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);

      // Handle special cases
      if (error.message === 'NEW_PASSWORD_REQUIRED') {
        throw new Error('You must change your password on first login. Please contact support.');
      } else if (error.message === 'MFA_REQUIRED') {
        throw new Error('MFA is required. Please contact support for assistance.');
      } else if (error.code === 'NotAuthorizedException') {
        throw new Error('Incorrect email or password');
      } else if (error.code === 'UserNotFoundException') {
        throw new Error('User not found');
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    authService.signOut();
    setUser(null);
    console.log('[Auth] User signed out');
  };

  const refreshSession = async () => {
    try {
      await authService.refreshSession();
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      console.log('[Auth] Session refreshed');
    } catch (error) {
      console.error('[Auth] Refresh session error:', error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    signIn,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
