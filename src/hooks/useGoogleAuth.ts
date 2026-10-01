import { useState, useEffect, useCallback } from 'react';
import { 
  loginAppWithGoogle, 
  registerAppWithEmailPassword,
  loginAppWithEmailPassword,
  logoutApp, 
  connectGoogleDrive, 
  disconnectGoogleDrive, 
  getStoredAppUser, 
  getStoredDriveAccount,
  saveStoredAppUser,
  saveStoredDriveAccount,
  verifyUserPassword,
  changeAppUserPassword,
  resetUserPassword,
  hasUserSetPassword,
  setInitialPassword
} from '../services/googleAuth';
import { supabase } from '../services/supabaseClient';
import { formatSupabaseUser } from '../services/supabaseAuth';
import { findDriveBackup, uploadBackupToDrive, restoreFromDrive, DriveBackupMeta } from '../services/googleDrive';
import { saveAppDataToSupabase, loadAppDataFromSupabase, getCachedCloudBackupMeta } from '../services/supabaseData';
import { AppData, AppUser, DriveAccount } from '../types';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useGoogleAuth() {
  // 1. App User Authentication State (Independent of Drive)
  const [appUser, setAppUser] = useState<AppUser | null>(() => getStoredAppUser());
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [appAuthError, setAppAuthError] = useState<string | null>(null);

  // 2. Google Drive Backup Account State (Independent of App Login)
  const [driveAccount, setDriveAccount] = useState<DriveAccount | null>(() => getStoredDriveAccount());
  const [driveMeta, setDriveMeta] = useState<DriveBackupMeta | null>(() => {
    try {
      const cached = localStorage.getItem('hishab_drive_meta');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Check Drive & Cloud backup metadata
  const refreshDriveBackupMeta = useCallback(async (token?: string) => {
    const accessToken = token || driveAccount?.accessToken;
    const currentUid = appUser?.uid;

    setIsCheckingDrive(true);
    try {
      // 1. If Google OAuth access token is available, check Google Drive
      if (accessToken && accessToken.startsWith('ya29.')) {
        try {
          const meta = await findDriveBackup(accessToken);
          if (meta.exists) {
            setDriveMeta(meta);
            setDriveError(null);
            localStorage.setItem('hishab_drive_meta', JSON.stringify(meta));
            return meta;
          }
        } catch (gErr) {
          console.warn('Google Drive check fallback to cloud:', gErr);
        }
      }

      // 2. Check Supabase Cloud backup
      if (currentUid) {
        const cloudRes = await loadAppDataFromSupabase(currentUid, appUser?.email || undefined);
        if (cloudRes.meta && cloudRes.meta.exists) {
          setDriveMeta(cloudRes.meta);
          setDriveError(null);
          localStorage.setItem('hishab_drive_meta', JSON.stringify(cloudRes.meta));
          return cloudRes.meta;
        }
      }

      // 3. Fallback to cached metadata
      const cached = currentUid ? getCachedCloudBackupMeta(currentUid) : null;
      if (cached) {
        setDriveMeta(cached);
        return cached;
      }

      setDriveMeta(null);
      return null;
    } catch (err: any) {
      console.warn('Failed to check backup meta:', err);
      return null;
    } finally {
      setIsCheckingDrive(false);
    }
  }, [driveAccount?.accessToken, appUser?.uid, appUser?.email]);

  // Initial check and Supabase session listener
  useEffect(() => {
    // If sync was enabled in localStorage, ensure driveAccount is set
    const isSyncOn = localStorage.getItem('hishab_sync_enabled') === 'true';
    if (appUser && isSyncOn && !driveAccount) {
      const dAcc: DriveAccount = {
        email: appUser.email || 'user',
        accessToken: 'cloud_sync_token',
        connectedAt: new Date().toISOString(),
      };
      setDriveAccount(dAcc);
      saveStoredDriveAccount(dAcc);
    }

    if (appUser) {
      refreshDriveBackupMeta();
    }

    // Listen to Supabase auth events (e.g. after Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = formatSupabaseUser(session.user);
        setAppUser(u);
        saveStoredAppUser(u);

        // If Google provider token is returned, connect Drive with appUser's email
        const providerToken = (session as any)?.provider_token;
        if (providerToken) {
          const dAcc: DriveAccount = {
            email: u.email || session.user.email || 'unknown',
            accessToken: providerToken,
            connectedAt: new Date().toISOString(),
          };
          setDriveAccount(dAcc);
          saveStoredDriveAccount(dAcc);
          refreshDriveBackupMeta(providerToken);
        }
      } else if (event === 'SIGNED_OUT') {
        setAppUser(null);
        saveStoredAppUser(null);
        setDriveAccount(null);
        saveStoredDriveAccount(null);
        setDriveMeta(null);
        localStorage.removeItem('hishab_sync_enabled');
      }
    });

    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = formatSupabaseUser(session.user);
        setAppUser(u);
        saveStoredAppUser(u);

        const providerToken = (session as any)?.provider_token;
        if (providerToken) {
          const dAcc: DriveAccount = {
            email: u.email || session.user.email || 'unknown',
            accessToken: providerToken,
            connectedAt: new Date().toISOString(),
          };
          setDriveAccount(dAcc);
          saveStoredDriveAccount(dAcc);
          refreshDriveBackupMeta(providerToken);
        }
      }
    });

    // Listen to deep links on native Android (e.g. com.amarhisab.app://google-auth#access_token=...)
    let appUrlListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appUrlListener = CapacitorApp.addListener('appUrlOpen', async (data) => {
        if (data?.url && (data.url.includes('access_token') || data.url.includes('code='))) {
          try {
            // Let supabase handle URL hash or query params
            const urlObj = new URL(data.url);
            const hash = urlObj.hash ? urlObj.hash.substring(1) : '';
            const params = new URLSearchParams(hash || urlObj.search);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { data: sessionData, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error && sessionData?.user) {
                const u = formatSupabaseUser(sessionData.user);
                setAppUser(u);
                saveStoredAppUser(u);

                const providerToken = (sessionData.session as any)?.provider_token;
                if (providerToken) {
                  const dAcc: DriveAccount = {
                    email: sessionData.user.email || 'unknown',
                    accessToken: providerToken,
                    connectedAt: new Date().toISOString(),
                  };
                  setDriveAccount(dAcc);
                  saveStoredDriveAccount(dAcc);
                  refreshDriveBackupMeta(providerToken);
                }
              }
            }
          } catch (e) {
            console.warn('Failed parsing deep link auth URL:', e);
          }
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener && typeof appUrlListener.remove === 'function') {
        appUrlListener.remove();
      }
    };
  }, []);

  // 3. App Login Handlers
  const handleAppSignIn = async (isRegistering: boolean = false): Promise<AppUser | null> => {
    setIsLoadingAuth(true);
    setAppAuthError(null);
    try {
      const user = await loginAppWithGoogle(isRegistering);
      if (user) {
        setAppUser(user);
      }
      return user;
    } catch (err: any) {
      const msg = err?.message || 'লগইন করতে সমস্যা হয়েছে';
      setAppAuthError(msg);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleRegisterWithEmail = async (name: string, email: string, pass: string): Promise<AppUser | null> => {
    setIsLoadingAuth(true);
    setAppAuthError(null);
    try {
      const user = await registerAppWithEmailPassword(name, email, pass);
      if (user) {
        setAppUser(user);
      }
      return user;
    } catch (err: any) {
      const msg = err?.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে';
      setAppAuthError(msg);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLoginWithEmail = async (email: string, pass: string): Promise<AppUser | null> => {
    setIsLoadingAuth(true);
    setAppAuthError(null);
    try {
      const user = await loginAppWithEmailPassword(email, pass);
      if (user) {
        setAppUser(user);
      }
      return user;
    } catch (err: any) {
      const msg = err?.message || 'লগইন করতে সমস্যা হয়েছে';
      setAppAuthError(msg);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleAppSignOut = async () => {
    await logoutApp();
    setAppUser(null);
    setDriveAccount(null);
    setDriveMeta(null);
  };

  // 4. Drive & Cloud Connect Handlers
  const handleConnectDrive = async (currentAppData?: AppData): Promise<DriveAccount | null> => {
    setIsLoadingAuth(true);
    setDriveError(null);
    try {
      const email = appUser?.email || undefined;
      const acc = await connectGoogleDrive(email);
      if (acc) {
        if (email) acc.email = email;
        setDriveAccount(acc);
        if (currentAppData) {
          await performDriveBackup(currentAppData);
        } else {
          await refreshDriveBackupMeta(acc.accessToken);
        }
      }
      return acc;
    } catch (err: any) {
      const msg = err?.message || 'সিঙ্ক চালু করতে সমস্যা হয়েছে';
      setDriveError(msg);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await disconnectGoogleDrive();
    setDriveAccount(null);
  };

  // 5. Upload backup to Google Drive & Cloud
  const performDriveBackup = async (appData: AppData): Promise<DriveBackupMeta> => {
    setIsBackingUp(true);
    setDriveError(null);
    try {
      const email = driveAccount?.email || appUser?.email || undefined;
      const uid = appUser?.uid || 'user';

      // 1. Always save to Cloud / Supabase
      const cloudRes = await saveAppDataToSupabase(uid, appData, email);
      let finalMeta: DriveBackupMeta = {
        exists: true,
        fileId: 'cloud_' + uid,
        name: 'amar_hisab_backup.json',
        size: cloudRes.size || new Blob([JSON.stringify(appData)]).size,
        modifiedTime: cloudRes.updatedAt || new Date().toISOString(),
        userEmail: email,
        transactionCount: appData.transactions?.length || 0,
      };

      // 2. If real Google Drive access token exists, also upload to Google Drive
      const accessToken = driveAccount?.accessToken;
      if (accessToken && accessToken.startsWith('ya29.')) {
        try {
          const driveMetaRes = await uploadBackupToDrive(
            accessToken,
            appData,
            email,
            driveMeta?.fileId
          );
          if (driveMetaRes) {
            finalMeta = driveMetaRes;
          }
        } catch (driveErr) {
          console.warn('Google Drive backup upload warning:', driveErr);
        }
      }

      setDriveMeta(finalMeta);
      localStorage.setItem('hishab_drive_meta', JSON.stringify(finalMeta));
      return finalMeta;
    } catch (err: any) {
      const msg = err?.message || 'ব্যাকআপ নিতে সমস্যা হয়েছে';
      setDriveError(msg);
      throw err;
    } finally {
      setIsBackingUp(false);
    }
  };

  // 6. Restore backup from Google Drive & Cloud
  const performDriveRestore = async (): Promise<AppData> => {
    setIsRestoring(true);
    setDriveError(null);
    try {
      const accessToken = driveAccount?.accessToken;
      // 1. If real Google Drive token exists, try Google Drive first
      if (accessToken && accessToken.startsWith('ya29.')) {
        try {
          const meta = await refreshDriveBackupMeta(accessToken);
          const fileId = meta?.fileId || driveMeta?.fileId;
          if (fileId && !fileId.startsWith('cloud_')) {
            const result = await restoreFromDrive(accessToken, fileId);
            return result.data;
          }
        } catch (gErr) {
          console.warn('Google Drive restore fallback to cloud:', gErr);
        }
      }

      // 2. Restore from Supabase Cloud
      const uid = appUser?.uid;
      if (uid) {
        const cloudRes = await loadAppDataFromSupabase(uid, appUser?.email || undefined);
        if (cloudRes.data && cloudRes.data.transactions) {
          return cloudRes.data;
        }
      }

      throw new Error('গুগল ড্রাইভ বা ক্লাউডে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি');
    } catch (err: any) {
      throw err;
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    // App User Auth
    appUser,
    isAppLoggedIn: Boolean(appUser),
    loginApp: handleAppSignIn,
    loginWithEmailPassword: handleLoginWithEmail,
    registerWithEmailPassword: handleRegisterWithEmail,
    logoutApp: handleAppSignOut,
    appAuthError,

    // Google Drive Backup Account (Can be different from App User!)
    driveAccount,
    isDriveConnected: Boolean(driveAccount),
    connectDrive: handleConnectDrive,
    disconnectDrive: handleDisconnectDrive,
    driveMeta,
    driveError,

    // Backward-compatibility aliases for existing components
    user: appUser,
    token: driveAccount?.accessToken || null,
    isLoadingAuth,
    isCheckingDrive,
    isBackingUp,
    isRestoring,
    authError: driveError || appAuthError,
    signIn: handleAppSignIn,
    signOut: handleAppSignOut,

    // Methods
    refreshDriveBackupMeta,
    performDriveBackup,
    performDriveRestore,

    // Password & Recovery Methods
    hasPassword: Boolean(hasUserSetPassword(appUser?.email)),
    setPassword: (newPass: string) => {
      const email = appUser?.email;
      if (!email) throw new Error('লগইন করা ব্যবহারকারী পাওয়া যায়নি');
      return setInitialPassword(email, newPass);
    },
    verifyPassword: (password: string) => {
      const email = appUser?.email;
      if (!email) return Promise.resolve(false);
      return verifyUserPassword(email, password);
    },
    changePassword: (oldPass: string, newPass: string) => {
      const email = appUser?.email;
      if (!email) throw new Error('লগইন করা ব্যবহারকারী পাওয়া যায়নি');
      return changeAppUserPassword(email, oldPass, newPass);
    },
    resetPassword: (email: string, newPass: string) => {
      return resetUserPassword(email, newPass);
    },
  };
}
