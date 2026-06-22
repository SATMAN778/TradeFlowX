export type UserRole = 'admin' | 'manager' | 'reviewer_customs' | 'reviewer_freight_forwarder' | 'reviewer_shipper';

export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: string;
  userEmail?: string;
  userName?: string;
  role?: UserRole;
}

export interface LoginUrlResponse {
  url: string;
  state: string;
}
