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
  resetUserPassword
} from '../services/googleAuth';
import { findDriveBackup, uploadBackupToDrive, restoreFromDrive, DriveBackupMeta } from '../services/googleDrive';
import { AppData, AppUser, DriveAccount } from '../types';

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

  // Check Drive backup metadata if Drive is connected
  const refreshDriveBackupMeta = useCallback(async (token?: string) => {
    const accessToken = token || driveAccount?.accessToken;
    if (!accessToken) {
      setDriveMeta(null);
      return null;
    }

    try {
      setIsCheckingDrive(true);
      const meta = await findDriveBackup(accessToken);
      setDriveMeta(meta);
      setDriveError(null);
      localStorage.setItem('hishab_drive_meta', JSON.stringify(meta));
      return meta;
    } catch (err: any) {
      console.warn('Failed to check drive backup:', err);
      if (
        err.message?.includes('insufficient') ||
        err.message?.includes('Insufficient') ||
        err.message?.includes('403') ||
        err.message?.includes('invalid_grant')
      ) {
        setDriveError('ড্রাইভ একাউন্টের অনুমতির মেয়াদ শেষ হয়েছে। দয়া করে ড্রাইভ পুনরায় সংযুক্ত করুন।');
      }
      return null;
    } finally {
      setIsCheckingDrive(false);
    }
  }, [driveAccount?.accessToken]);

  // Initial check when component mounts
  useEffect(() => {
    if (driveAccount?.accessToken) {
      refreshDriveBackupMeta(driveAccount.accessToken);
    }
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
  };

  // 4. Drive Connect Handlers
  const handleConnectDrive = async (): Promise<DriveAccount | null> => {
    setIsLoadingAuth(true);
    setDriveError(null);
    try {
      const acc = await connectGoogleDrive();
      if (acc) {
        setDriveAccount(acc);
        await refreshDriveBackupMeta(acc.accessToken);
      }
      return acc;
    } catch (err: any) {
      const msg = err?.message || 'গুগল ড্রাইভ সংযুক্ত করতে সমস্যা হয়েছে';
      setDriveError(msg);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await disconnectGoogleDrive();
    setDriveAccount(null);
    setDriveMeta(null);
  };

  // 5. Upload backup to Google Drive
  const performDriveBackup = async (appData: AppData): Promise<DriveBackupMeta> => {
    const accessToken = driveAccount?.accessToken;
    if (!accessToken || !driveAccount) {
      throw new Error('গুগল ড্রাইভে ব্যাকআপ নিতে প্রথমে ড্রাইভ সংযুক্ত করুন');
    }

    setIsBackingUp(true);
    try {
      const meta = await uploadBackupToDrive(
        accessToken,
        appData,
        driveAccount.email || undefined,
        driveMeta?.fileId
      );
      setDriveMeta(meta);
      localStorage.setItem('hishab_drive_meta', JSON.stringify(meta));
      return meta;
    } catch (err: any) {
      throw err;
    } finally {
      setIsBackingUp(false);
    }
  };

  // 6. Restore backup from Google Drive
  const performDriveRestore = async (): Promise<AppData> => {
    const accessToken = driveAccount?.accessToken;
    if (!accessToken || !driveAccount) {
      throw new Error('গুগল ড্রাইভ থেকে রিস্টোর করতে প্রথমে ড্রাইভ সংযুক্ত করুন');
    }

    const meta = await refreshDriveBackupMeta(accessToken);
    const fileId = meta?.fileId || driveMeta?.fileId;

    if (!fileId) {
      throw new Error('গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি');
    }

    setIsRestoring(true);
    try {
      const result = await restoreFromDrive(accessToken, fileId);
      return result.data;
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
