import { post, get } from './api';
import type { User, AuthTokens } from '@/types';

// ===== Auth API Endpoints =====

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: User;
  tokens: AuthTokens;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type RegisterResponse = {
  user: User;
  tokens: AuthTokens;
};

/**
 * Login user
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  return await post<LoginResponse>('/auth/login', credentials);
};

/**
 * Register new user
 */
export const register = async (userData: RegisterRequest): Promise<RegisterResponse> => {
  return await post<RegisterResponse>('/auth/register', userData);
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  return await post<void>('/auth/logout');
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  return await get<User>('/auth/me');
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
  return await post<AuthTokens>('/auth/refresh', { refreshToken });
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  return await post<void>('/auth/forgot-password', { email });
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  return await post<void>('/auth/reset-password', { token, newPassword });
};

// Export as default
export default {
  login,
  register,
  logout,
  getCurrentUser,
  refreshToken,
  requestPasswordReset,
  resetPassword,
};

