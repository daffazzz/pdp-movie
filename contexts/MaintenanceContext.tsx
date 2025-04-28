'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  toggleMaintenanceMode: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Setup system_settings table if it doesn't exist
  useEffect(() => {
    const setupSystemSettings = async () => {
      try {
        console.log('Setting up system_settings table and initial values...');
        
        // Use RPC to ensure the table exists with maintenance_mode setting
        const { error } = await supabase.rpc('ensure_system_settings', {
          maintenance_default: 'false'
        });
        
        if (error) {
          console.error('Error setting up system_settings:', error);
        } else {
          console.log('System settings table setup complete');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error in table setup:', error);
      }
    };
    
    setupSystemSettings();
  }, []);
  
  // Fetch initial maintenance status
  useEffect(() => {
    // Only fetch status after table is initialized
    if (!isInitialized) return;
    
    const fetchMaintenanceStatus = async () => {
      try {
        console.log('Fetching maintenance mode status...');
        
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();
        
        if (error) {
          console.error('Error fetching maintenance status:', error);
          return;
        }
        
        const isActive = data?.value === 'true';
        console.log(`Maintenance mode is currently ${isActive ? 'active' : 'inactive'}`);
        setIsMaintenanceMode(isActive);
      } catch (error) {
        console.error('Error in maintenance status fetch:', error);
      }
    };
    
    fetchMaintenanceStatus();
  }, [isInitialized]);
  
  // Toggle maintenance mode
  const toggleMaintenanceMode = async () => {
    try {
      const newStatus = !isMaintenanceMode;
      console.log(`Attempting to ${newStatus ? 'enable' : 'disable'} maintenance mode...`);
      
      // Check if record exists first
      const { data: existingData, error: fetchError } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
        console.error('Error checking maintenance setting:', fetchError);
        return;
      }
      
      let updateError;
      
      if (existingData?.id) {
        // Update existing record
        const { error } = await supabase
          .from('system_settings')
          .update({ value: newStatus.toString() })
          .eq('id', existingData.id);
        updateError = error;
        
        if (!error) {
          console.log(`Updated existing record (ID: ${existingData.id})`);
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'maintenance_mode', value: newStatus.toString() });
        updateError = error;
        
        if (!error) {
          console.log('Created new maintenance_mode record');
        }
      }
      
      if (updateError) {
        console.error('Error updating maintenance status:', updateError);
        return;
      }
      
      // Update local state
      setIsMaintenanceMode(newStatus);
      console.log(`Maintenance mode ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
    }
  };
  
  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, toggleMaintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenanceMode() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenanceMode must be used within a MaintenanceProvider');
  }
  return context;
} 