import { sdk } from '../lib/sdk';
import type { AuthStatus, LoginUrlResponse } from '../types/auth';

/**
 * Returns a login redirection endpoint. Since the SDK manages OAuth redirections 
 * natively on initialization, we provide a placeholder callback for fallback handling.
 */
export async function getLoginUrl(): Promise<LoginUrlResponse> {
  return { url: '/callback?sdk=true', state: '' };
}

/**
 * Processes OIDC authorization codes via SDK.
 */
export async function sendCallback(_code: string, _state: string): Promise<AuthStatus> {
  try {
    const success = await sdk.completeOAuth();
    if (success) {
      return {
        authenticated: true,
        userEmail: 'operator@tradeflow.ai',
        userName: 'Operator Portal',
      };
    }
  } catch (error) {
    console.error('OIDC token exchange failed via SDK:', error);
  }

  return { authenticated: false, userEmail: undefined, userName: undefined };
}

/**
 * Resolves current authentication status via SDK.
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const authenticated = sdk.isAuthenticated();
  return {
    authenticated,
    userEmail: authenticated ? 'operator@tradeflow.ai' : undefined,
    userName: authenticated ? 'Operator Portal' : undefined,
  };
}

/**
 * Terminate user authentication session.
 */
export async function logout(): Promise<void> {
  sdk.logout();
}

