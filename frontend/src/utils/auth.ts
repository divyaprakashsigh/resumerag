import { User, AuthResponse } from '../types';

export const authStorage = {
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  removeToken: (): void => {
    localStorage.removeItem('token');
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  setUser: (user: User): void => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem('user');
  },

  isAuthenticated: (): boolean => {
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    return !!(token && user);
  },

  hasRole: (role: 'USER' | 'RECRUITER' | 'ADMIN'): boolean => {
    const user = authStorage.getUser();
    return user?.role === role || user?.role === 'ADMIN';
  },

  canViewPII: (): boolean => {
    const user = authStorage.getUser();
    return user?.role === 'RECRUITER' || user?.role === 'ADMIN';
  },

  logout: (): void => {
    authStorage.removeToken();
    authStorage.removeUser();
  },

  saveAuth: (authResponse: AuthResponse): void => {
    authStorage.setToken(authResponse.token);
    authStorage.setUser(authResponse.user);
  }
};
