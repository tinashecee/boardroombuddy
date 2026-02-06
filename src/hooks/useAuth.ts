import { useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  role: 'ADMIN' | 'USER';
  isApproved: boolean;
}

const API_URL = '/api/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid or expired, clear it
        localStorage.removeItem('bb_token');
        setUser(null);
      }
    } catch (error) {
      // Silently handle connection errors - server might be down or user might be offline
      // Only log if it's not a connection error (which is expected when server is down)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Connection error - server might be down, silently handle
        localStorage.removeItem('bb_token');
        setUser(null);
      } else {
        console.error('Failed to fetch current user', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('bb_token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('bb_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection failed' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, companyName: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, companyName, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // Don't store token or set user - user must wait for approval
        // The user will need to log in after admin approval
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Connection failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bb_token');
    setUser(null);
    // Refresh page and redirect to login
    window.location.href = '/auth';
  }, []);

  return {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };
}
