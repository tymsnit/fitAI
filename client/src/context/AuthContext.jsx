import { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('fitai_token');

    if (!token) {
      setUser(null);
      setIsAuthLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('fitai_token');
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const register = async (email, password) => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
    });

    localStorage.setItem('fitai_token', response.data.token);
    setUser(response.data.user);

    return response.data;
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('fitai_token', response.data.token);
    setUser(response.data.user);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('fitai_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        register,
        login,
        logout,
        loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};