"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signUp: async () => ({ data: null, error: null }),
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client is not initialized');
      setError('Authentication service is not available');
      setLoading(false);
      return;
    }

    // Ambil session awal
    (supabase as NonNullable<typeof supabase>).auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setError('Failed to get authentication session');
      setLoading(false);
    });

    // Dengarkan perubahan status auth
    const { data: listener } = (supabase as NonNullable<typeof supabase>).auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      if (listener && listener.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    // Check if Supabase client is available
    if (!supabase) {
      const errorMsg = 'Authentication service is not available';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return { data: null, error: { message: errorMsg } };
    }
    
    const { data, error } = await (supabase as NonNullable<typeof supabase>).auth.signUp({ email, password });
    setError(error?.message ?? null);
    setLoading(false);
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    // Check if Supabase client is available
    if (!supabase) {
      const errorMsg = 'Authentication service is not available';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return { data: null, error: { message: errorMsg } };
    }
    
    const { data, error } = await (supabase as NonNullable<typeof supabase>).auth.signInWithPassword({ email, password });
    setError(error?.message ?? null);
    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    
    // Check if Supabase client is available
    if (!supabase) {
      const errorMsg = 'Authentication service is not available';
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return { error: { message: errorMsg } };
    }
    
    const { error } = await (supabase as NonNullable<typeof supabase>).auth.signOut();
    setError(error?.message ?? null);
    setLoading(false);
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, error, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 