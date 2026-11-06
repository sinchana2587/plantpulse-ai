import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { User, AuthResponse, SignupResponse } from '../types';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResponse>;
  signup: (data: {
    email: string;
    password: string;
    confirm_password?: string;
    full_name?: string;
    preferred_language?: string;
    terms_accepted?: boolean;
  }) => Promise<SignupResponse>;
  verifyEmail: (email: string, otp_code: string) => Promise<{ message: string; verified: boolean }>;
  resendOtp: (email: string) => Promise<{ message: string; email: string }>;
  googleLogin: (idTokenOrCode: { id_token?: string; code?: string }) => Promise<AuthResponse>;
  logout: () => void;
  updateProfile: (data: { full_name?: string; preferred_language?: string; voice_assistant_enabled?: boolean }) => Promise<User>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<{ message: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { setLanguage } = useLanguage();

  const refreshUser = async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await api.getMe();
      setUser(me);
      if (me.preferred_language) {
        setLanguage(me.preferred_language);
      }
    } catch (err) {
      console.warn('Failed to validate session token:', err);
      api.setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true): Promise<AuthResponse> => {
    const res = await api.login({ email, password });
    api.setToken(res.access_token, rememberMe);
    setUser(res.user);
    if (res.user.preferred_language) {
      setLanguage(res.user.preferred_language);
    }
    return res;
  };

  const signup = async (data: {
    email: string;
    password: string;
    confirm_password?: string;
    full_name?: string;
    preferred_language?: string;
    terms_accepted?: boolean;
  }): Promise<SignupResponse> => {
    return api.signup(data);
  };

  const verifyEmail = async (email: string, otp_code: string): Promise<{ message: string; verified: boolean }> => {
    return api.verifyEmail({ email, otp_code });
  };

  const resendOtp = async (email: string): Promise<{ message: string; email: string }> => {
    return api.resendOtp(email);
  };

  const googleLogin = async (idTokenOrCode: { id_token?: string; code?: string }): Promise<AuthResponse> => {
    const res = await api.googleLogin(idTokenOrCode);
    api.setToken(res.access_token, true);
    setUser(res.user);
    if (res.user.preferred_language) {
      setLanguage(res.user.preferred_language);
    }
    return res;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { full_name?: string; preferred_language?: string; voice_assistant_enabled?: boolean }): Promise<User> => {
    const updated = await api.updateProfile(data);
    setUser(updated);
    if (updated.preferred_language) {
      setLanguage(updated.preferred_language);
    }
    return updated;
  };

  const changePassword = async (data: { current_password: string; new_password: string }): Promise<{ message: string }> => {
    return api.changePassword(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        verifyEmail,
        resendOtp,
        googleLogin,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
