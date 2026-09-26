import { supabase } from './supabaseClient';
import { AppData } from '../types';

export interface SupabaseSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: string;
}

/**
 * Save / Upsert user's complete AppData into Supabase
 */
export async function saveAppDataToSupabase(
  userId: string,
  appData: AppData
): Promise<SupabaseSyncResult> {
  if (!userId) {
    return { success: false, error: 'ইউজার আইডি পাওয়া যায়নি' };
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('user_app_data')
      .upsert(
        {
          user_id: userId,
          app_data: appData,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      // If table doesn't exist yet in Supabase
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.warn('Supabase table user_app_data not created yet. Please execute supabase-schema.sql');
        return {
          success: false,
          error: 'Supabase-এ user_app_data টেবিলটি পাওয়া যায়নি। দয়া করে SQL Editor-এ স্কিমা রান করুন।',
        };
      }
      console.error('Supabase save error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'সুপারবেসে ডাটা সফলভাবে সংরক্ষিত হয়েছে',
      updatedAt: now,
    };
  } catch (err: any) {
    console.error('Failed to sync data to Supabase:', err);
    return { success: false, error: err?.message || 'সুপারবেসে সিঙ্ক করতে সমস্যা হয়েছে' };
  }
}

/**
 * Load user's AppData from Supabase
 */
export async function loadAppDataFromSupabase(
  userId: string
): Promise<{ data: AppData | null; updatedAt?: string; error?: string }> {
  if (!userId) {
    return { data: null, error: 'ইউজার আইডি পাওয়া যায়নি' };
  }

  try {
    const { data, error } = await supabase
      .from('user_app_data')
      .select('app_data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return { data: null, error: 'টেবিল এখনও তৈরি করা হয়নি' };
      }
      return { data: null, error: error.message };
    }

    if (data?.app_data) {
      return {
        data: data.app_data as AppData,
        updatedAt: data.updated_at,
      };
    }

    return { data: null };
  } catch (err: any) {
    return { data: null, error: err?.message };
  }
}
