import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import Constants from 'expo-constants';

const userPoolId = Constants.expoConfig?.extra?.COGNITO_USER_POOL_ID || process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
const clientId = Constants.expoConfig?.extra?.COGNITO_CLIENT_ID || process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;

if (!userPoolId || !clientId) {
  console.error('[Auth] Missing Cognito configuration');
}

const poolData = {
  UserPoolId: userPoolId || '',
  ClientId: clientId || '',
};

const userPool = new CognitoUserPool(poolData);

export interface AdminUser {
  email: string;
  name: string;
  sub: string;
}

class AuthService {
  /**
   * Sign in admin user with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: AdminUser; tokens: CognitoUserSession }> {
    return new Promise((resolve, reject) => {
      const authenticationData = {
        Username: email,
        Password: password,
      };

      const authenticationDetails = new AuthenticationDetails(authenticationData);

      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          console.log('[Auth] Sign in successful');

          const idToken = session.getIdToken();
          const payload = idToken.payload;

          const user: AdminUser = {
            email: payload.email || email,
            name: payload.name || 'Admin',
            sub: payload.sub,
          };

          resolve({ user, tokens: session });
        },
        onFailure: (err) => {
          console.error('[Auth] Sign in failed:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes) => {
          console.log('[Auth] New password required');
          reject(new Error('NEW_PASSWORD_REQUIRED'));
        },
        mfaRequired: (challengeName, challengeParameters) => {
          console.log('[Auth] MFA required');
          reject(new Error('MFA_REQUIRED'));
        },
      });
    });
  }

  /**
   * Change password (for first-time login)
   */
  async changePassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool,
      };

      const cognitoUser = new CognitoUser(userData);

      const authenticationData = {
        Username: email,
        Password: oldPassword,
      };

      const authenticationDetails = new AuthenticationDetails(authenticationData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: () => {
          reject(new Error('Password change not needed'));
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: () => {
          cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
            onSuccess: () => {
              console.log('[Auth] Password changed successfully');
              resolve();
            },
            onFailure: (err) => {
              console.error('[Auth] Password change failed:', err);
              reject(err);
            },
          });
        },
      });
    });
  }

  /**
   * Get current authenticated user session
   */
  async getCurrentSession(): Promise<CognitoUserSession | null> {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      return null;
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          console.error('[Auth] Get session error:', err);
          reject(err);
          return;
        }

        if (!session || !session.isValid()) {
          resolve(null);
          return;
        }

        resolve(session);
      });
    });
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const session = await this.getCurrentSession();

      if (!session) {
        return null;
      }

      const idToken = session.getIdToken();
      const payload = idToken.payload;

      return {
        email: payload.email,
        name: payload.name || 'Admin',
        sub: payload.sub,
      };
    } catch (error) {
      console.error('[Auth] Get current user error:', error);
      return null;
    }
  }

  /**
   * Get ID token for API requests
   */
  async getIdToken(): Promise<string | null> {
    try {
      const session = await this.getCurrentSession();

      if (!session) {
        return null;
      }

      return session.getIdToken().getJwtToken();
    } catch (error) {
      console.error('[Auth] Get ID token error:', error);
      return null;
    }
  }

  /**
   * Sign out current user
   */
  signOut(): void {
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
      cognitoUser.signOut();
      console.log('[Auth] User signed out');
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<CognitoUserSession | null> {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      return null;
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err || new Error('No session'));
          return;
        }

        const refreshToken = session.getRefreshToken();

        cognitoUser.refreshSession(refreshToken, (err, newSession) => {
          if (err) {
            console.error('[Auth] Refresh session error:', err);
            reject(err);
            return;
          }

          console.log('[Auth] Session refreshed');
          resolve(newSession);
        });
      });
    });
  }
}

export const authService = new AuthService();
