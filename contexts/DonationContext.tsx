"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface DonationContextType {
  isDonationEnabled: boolean;
  toggleDonationEnabled: () => Promise<void>;
}

const DonationContext = createContext<DonationContextType | undefined>(undefined);

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const [isDonationEnabled, setIsDonationEnabled] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const setupSystemSettings = async () => {
      try {
        await supabase.rpc('ensure_system_settings', {
          donation_default: 'false'
        });
        setIsInitialized(true);
      } catch {}
    };
    setupSystemSettings();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const fetchDonationStatus = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'donation_popup_enabled')
        .single();
      if (!error) {
        setIsDonationEnabled(data?.value === 'true');
      }
    };
    fetchDonationStatus();
  }, [isInitialized]);

  const toggleDonationEnabled = async () => {
    const newStatus = !isDonationEnabled;
    const { data: existingData, error: fetchError } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', 'donation_popup_enabled')
      .single();
    let updateError;
    if (existingData?.id) {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: newStatus.toString() })
        .eq('id', existingData.id);
      updateError = error;
    } else {
      const { error } = await supabase
        .from('system_settings')
        .insert({ key: 'donation_popup_enabled', value: newStatus.toString() });
      updateError = error;
    }
    if (!updateError) {
      setIsDonationEnabled(newStatus);
    }
  };

  return (
    <DonationContext.Provider value={{ isDonationEnabled, toggleDonationEnabled }}>
      {children}
    </DonationContext.Provider>
  );
}

export function useDonationEnabled() {
  const context = useContext(DonationContext);
  if (context === undefined) {
    throw new Error('useDonationEnabled must be used within a DonationProvider');
  }
  return context;
} 