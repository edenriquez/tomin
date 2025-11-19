'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, apiClient } from '@/lib/api-client';

export interface User {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/auth/me');
        return response.data;
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else {
      setUser(null);
    }
    setIsLoading(isUserLoading);
  }, [userData, isUserLoading]);

  const login = async () => {
    console.log('Login function called');
    try {
      const url = `${API_BASE_URL}/auth/google`;
      console.log('Redirecting to:', url);
      // Use window.location.assign instead of href to prevent potential issues
      window.location.assign(url);
      // Alternative: Use Next.js router for client-side navigation
      // router.push(url);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  const logout = async () => {
    try {
      const url = `${API_BASE_URL}/auth/logout`;
      await apiClient.get(url);
      setUser(null);
      queryClient.clear();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
