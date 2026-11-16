import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('shramsetu_user') || localStorage.getItem('workforce_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('shramsetu_token') || localStorage.getItem('workforce_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await apiClient.get('/auth/me');
        setUser(profile);
        localStorage.setItem('shramsetu_user', JSON.stringify(profile));
        localStorage.setItem('workforce_user', JSON.stringify(profile));
      } catch (err) {
        console.error('Session validation failed:', err);
        setUser(null);
        localStorage.removeItem('shramsetu_token');
        localStorage.removeItem('shramsetu_user');
        localStorage.removeItem('workforce_token');
        localStorage.removeItem('workforce_user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('shramsetu_token', res.accessToken);
    localStorage.setItem('shramsetu_user', JSON.stringify(res.user));
    localStorage.setItem('workforce_token', res.accessToken);
    localStorage.setItem('workforce_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Continue client logout
    }
    localStorage.removeItem('shramsetu_token');
    localStorage.removeItem('shramsetu_user');
    localStorage.removeItem('workforce_token');
    localStorage.removeItem('workforce_user');
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isSupervisor: user?.role === 'SUPERVISOR',
    assignedSites: user?.assignedSites || [],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
