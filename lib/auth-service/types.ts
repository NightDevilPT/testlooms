// ==========================================
// Auth Service TypeScript Interfaces & Data Models
// ==========================================

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

export interface AuthSessionResult {
  user: UserProfileResponse;
  accessToken: string;
}
