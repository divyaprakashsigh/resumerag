import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authStorage } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasRole: (role: 'USER' | 'RECRUITER' | 'ADMIN') => boolean;
  canViewPII: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const storedUser = authStorage.getUser();
    const token = authStorage.getToken();

    if (storedUser && token) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    authStorage.saveAuth({ user: userData, token });
    setUser(userData);
  };

  const logout = () => {
    authStorage.logout();
    setUser(null);
  };

  const hasRole = (role: 'USER' | 'RECRUITER' | 'ADMIN'): boolean => {
    return user?.role === role || user?.role === 'ADMIN';
  };

  const canViewPII = (): boolean => {
    return user?.role === 'RECRUITER' || user?.role === 'ADMIN';
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
    canViewPII,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
