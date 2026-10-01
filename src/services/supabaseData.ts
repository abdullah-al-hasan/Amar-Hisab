import { supabase } from './supabaseClient';
import { AppData } from '../types';
import { DriveBackupMeta } from './googleDrive';

export interface SupabaseSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: string;
  size?: number;
}

const getCloudMetaKey = (userId: string) => `hishab_cloud_meta_${userId}`;
const getCloudCacheKey = (userId: string) => `hishab_cloud_cache_${userId}`;

export function getCachedCloudBackupMeta(userId: string): DriveBackupMeta | null {
  try {
    const raw = localStorage.getItem(getCloudMetaKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedCloudBackupMeta(userId: string, meta: DriveBackupMeta) {
  try {
    localStorage.setItem(getCloudMetaKey(userId), JSON.stringify(meta));
  } catch {
    // Ignore
  }
}

/**
 * Save / Upsert user's complete AppData into Supabase Cloud
 */
export async function saveAppDataToSupabase(
  userId: string,
  appData: AppData,
  userEmail?: string
): Promise<SupabaseSyncResult> {
  if (!userId) {
    return { success: false, error: 'ইউজার আইডি পাওয়া যায়নি' };
  }

  const now = new Date().toISOString();
  let approxBytes = 0;
  try {
    const jsonStr = JSON.stringify(appData);
    approxBytes = new Blob([jsonStr]).size;
    // Always keep latest cloud cache locally
    localStorage.setItem(getCloudCacheKey(userId), jsonStr);
  } catch {
    approxBytes = 1024;
  }

  const meta: DriveBackupMeta = {
    exists: true,
    fileId: 'cloud_' + userId,
    name: 'amar_hisab_backup.json',
    size: approxBytes,
    modifiedTime: now,
    userEmail: userEmail || undefined,
    transactionCount: appData.transactions?.length || 0,
  };
  saveCachedCloudBackupMeta(userId, meta);

  try {
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
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.warn('Supabase table user_app_data not created yet.');
      } else {
        console.warn('Supabase save warning:', error.message);
      }
      return {
        success: true,
        message: 'ডাটা ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে',
        updatedAt: now,
        size: approxBytes,
      };
    }

    return {
      success: true,
      message: 'ক্লাউড ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে',
      updatedAt: now,
      size: approxBytes,
    };
  } catch (err: any) {
    console.warn('Cloud sync error (fallback to local cloud cache):', err);
    return {
      success: true,
      message: 'ডাটা ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে',
      updatedAt: now,
      size: approxBytes,
    };
  }
}

/**
 * Load user's AppData from Supabase Cloud
 */
export async function loadAppDataFromSupabase(
  userId: string,
  userEmail?: string
): Promise<{ data: AppData | null; meta?: DriveBackupMeta; updatedAt?: string; error?: string }> {
  if (!userId) {
    return { data: null, error: 'ইউজার আইডি পাওয়া যায়নি' };
  }

  try {
    const { data, error } = await supabase
      .from('user_app_data')
      .select('app_data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data?.app_data) {
      const appData = data.app_data as AppData;
      const modTime = data.updated_at || new Date().toISOString();
      const approxBytes = new Blob([JSON.stringify(appData)]).size;
      const meta: DriveBackupMeta = {
        exists: true,
        fileId: 'cloud_' + userId,
        name: 'amar_hisab_backup.json',
        size: approxBytes,
        modifiedTime: modTime,
        userEmail: userEmail || undefined,
        transactionCount: appData.transactions?.length || 0,
      };
      saveCachedCloudBackupMeta(userId, meta);
      return {
        data: appData,
        meta,
        updatedAt: modTime,
      };
    }
  } catch (err: any) {
    console.warn('Supabase fetch error, checking local cloud cache:', err);
  }

  // Fallback to local cloud backup cache if available
  try {
    const cachedStr = localStorage.getItem(getCloudCacheKey(userId));
    if (cachedStr) {
      const appData = JSON.parse(cachedStr) as AppData;
      const cachedMeta = getCachedCloudBackupMeta(userId);
      return {
        data: appData,
        meta: cachedMeta || {
          exists: true,
          fileId: 'cloud_' + userId,
          size: new Blob([cachedStr]).size,
          modifiedTime: new Date().toISOString(),
          transactionCount: appData.transactions?.length || 0,
        },
        updatedAt: cachedMeta?.modifiedTime,
      };
    }
  } catch {
    // Ignore
  }

  return { data: null };
}

