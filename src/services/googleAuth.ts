import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  getAdditionalUserInfo,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, DriveAccount } from '../types';
import { 
  registerWithSupabase, 
  loginWithSupabase, 
  logoutFromSupabase 
} from './supabaseAuth';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const APP_USER_KEY = 'hishab_app_user';
const DRIVE_ACCOUNT_KEY = 'hishab_drive_account';
const LOCAL_ACCOUNTS_KEY = 'hishab_email_accounts';
const REGISTERED_USERS_KEY = 'hishab_registered_users';

interface StoredLocalAccount {
  uid: string;
  name: string;
  email: string;
  password: string;
  photoURL?: string;
}

const getStoredLocalAccounts = (): StoredLocalAccount[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredLocalAccounts = (accounts: StoredLocalAccount[]) => {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore
  }
};

// Track registered user emails so logins without accounts are rejected
export const getRegisteredUsers = (): string[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    
    // Seed with existing local accounts or currently stored user
    const local = getStoredLocalAccounts();
    local.forEach(a => {
      const e = a.email.toLowerCase().trim();
      if (e && !list.includes(e)) list.push(e);
    });
    return list;
  } catch {
    return [];
  }
};

export const registerUserEmail = (email: string) => {
  try {
    const list = getRegisteredUsers();
    const normalized = email.toLowerCase().trim();
    if (normalized && !list.includes(normalized)) {
      list.push(normalized);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore
  }
};

export const isUserEmailRegistered = (email: string): boolean => {
  const normalized = email.toLowerCase().trim();
  const list = getRegisteredUsers();
  if (list.includes(normalized)) return true;
  const localAccounts = getStoredLocalAccounts();
  return localAccounts.some(a => a.email.toLowerCase().trim() === normalized);
};

// 1. Providers
// App Login: Only basic identity (profile & email)
const appLoginProvider = new GoogleAuthProvider();
appLoginProvider.setCustomParameters({
  prompt: 'select_account',
});

// Google Drive Backup: Specific drive scopes
const driveBackupProvider = new GoogleAuthProvider();
driveBackupProvider.addScope('https://www.googleapis.com/auth/drive.file');
driveBackupProvider.addScope('https://www.googleapis.com/auth/drive.appdata');
driveBackupProvider.setCustomParameters({
  prompt: 'select_account consent',
});

// 2. Storage Helpers
export const getStoredAppUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(APP_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredAppUser = (user: AppUser | null) => {
  if (user) {
    localStorage.setItem(APP_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(APP_USER_KEY);
  }
};

export const getStoredDriveAccount = (): DriveAccount | null => {
  try {
    const raw = localStorage.getItem(DRIVE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredDriveAccount = (acc: DriveAccount | null) => {
  if (acc) {
    localStorage.setItem(DRIVE_ACCOUNT_KEY, JSON.stringify(acc));
  } else {
    localStorage.removeItem(DRIVE_ACCOUNT_KEY);
    localStorage.removeItem('hishab_drive_meta');
  }
};

// 3. App Login Functions
export const loginAppWithGoogle = async (isRegistering: boolean = false): Promise<AppUser | null> => {
  try {
    const result = await signInWithPopup(auth, appLoginProvider);
    const u = result.user;
    const additionalInfo = getAdditionalUserInfo(result);
    const isNew = additionalInfo?.isNewUser ?? false;
    const email = (u.email || '').toLowerCase().trim();

    // REQUIREMENT 1: একাউন্ট ছাড়া কোনোভাবেই লগইন করা যাবে না।
    if (!isRegistering) {
      const alreadyRegistered = isUserEmailRegistered(email);
      // If the Google user is brand new or not registered in our app:
      if (isNew || !alreadyRegistered) {
        await signOut(auth);
        saveStoredAppUser(null);
        throw new Error('এই গুগল অ্যাকাউন্ট দিয়ে এখনও একাউন্ট তৈরি করা হয়নি। দয়া করে প্রথমে "একাউন্ট করুন" বাটনে ক্লিক করে একাউন্ট তৈরি করুন।');
      }
    }

    // Register user email into registered list
    if (email) {
      registerUserEmail(email);
    }

    const appUser: AppUser = {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || 'ইউজার',
      photoURL: u.photoURL,
    };
    saveStoredAppUser(appUser);
    return appUser;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      return null;
    }
    console.error('App Login error:', error);
    throw error;
  }
};

export const registerAppWithEmailPassword = async (
  name: string,
  email: string,
  pass: string
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  // 1. Try Supabase Auth first
  try {
    const supabaseUser = await registerWithSupabase(trimmedName, normalizedEmail, pass);
    registerUserEmail(normalizedEmail);

    // Also cache to local accounts for offline resilience
    const accounts = getStoredLocalAccounts();
    const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
    const newAcc: StoredLocalAccount = {
      uid: supabaseUser.uid,
      name: trimmedName,
      email: normalizedEmail,
      password: pass,
    };
    if (existingIdx >= 0) {
      accounts[existingIdx] = newAcc;
    } else {
      accounts.push(newAcc);
    }
    saveStoredLocalAccounts(accounts);

    return supabaseUser;
  } catch (supabaseError: any) {
    console.warn('Supabase register attempt error:', supabaseError);

    // If user already exists in Supabase or network issues:
    if (
      supabaseError?.message?.includes('ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে') ||
      supabaseError?.message?.includes('already registered')
    ) {
      throw supabaseError;
    }

    // 2. Try Firebase Auth as fallback
    try {
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
      if (trimmedName) {
        await updateProfile(result.user, { displayName: trimmedName });
      }
      const appUser: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: trimmedName || result.user.displayName || 'ইউজার',
        photoURL: result.user.photoURL,
      };
      saveStoredAppUser(appUser);
      registerUserEmail(normalizedEmail);

      const accounts = getStoredLocalAccounts();
      const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
      const newAcc: StoredLocalAccount = {
        uid: result.user.uid,
        name: trimmedName,
        email: normalizedEmail,
        password: pass,
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = newAcc;
      } else {
        accounts.push(newAcc);
      }
      saveStoredLocalAccounts(accounts);

      return appUser;
    } catch (fbError: any) {
      // 3. Fallback to local offline accounts if both network/providers fail
      const accounts = getStoredLocalAccounts();
      const existing = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
      if (existing) {
        throw new Error('এই ইমেইল দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে। দয়া করে লগইন করুন।');
      }

      if (fbError?.code === 'auth/email-already-in-use') {
        throw new Error('এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে। দয়া করে লগইন করুন।');
      }
      if (fbError?.code === 'auth/weak-password') {
        throw new Error('পাসওয়ার্ডটি দুর্বল। কমপক্ষে ৬টি অক্ষর বা সংখ্যা দিন।');
      }

      const localUid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const newAcc: StoredLocalAccount = {
        uid: localUid,
        name: trimmedName,
        email: normalizedEmail,
        password: pass,
      };
      accounts.push(newAcc);
      saveStoredLocalAccounts(accounts);
      registerUserEmail(normalizedEmail);

      const appUser: AppUser = {
        uid: localUid,
        email: normalizedEmail,
        displayName: trimmedName || 'ইউজার',
        photoURL: null,
      };
      saveStoredAppUser(appUser);
      return appUser;
    }
  }
};

export const loginAppWithEmailPassword = async (
  email: string,
  pass: string
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();
  const isRegistered = isUserEmailRegistered(normalizedEmail);

  // 1. Try Supabase Auth first
  try {
    const supabaseUser = await loginWithSupabase(normalizedEmail, pass);
    registerUserEmail(normalizedEmail);
    return supabaseUser;
  } catch (supabaseError: any) {
    console.warn('Supabase login error, checking alternatives:', supabaseError);

    if (supabaseError?.message?.includes('ভুল ইমেইল অথবা পাসওয়ার্ড')) {
      // Check local accounts first before throwing
      const accounts = getStoredLocalAccounts();
      const localAcc = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
      if (localAcc && localAcc.password === pass) {
        const appUser: AppUser = {
          uid: localAcc.uid,
          email: localAcc.email,
          displayName: localAcc.name || 'ইউজার',
          photoURL: localAcc.photoURL || null,
        };
        saveStoredAppUser(appUser);
        registerUserEmail(normalizedEmail);
        return appUser;
      }
      throw supabaseError;
    }

    // 2. Try Firebase Auth
    try {
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      const u = result.user;
      registerUserEmail(normalizedEmail);
      const appUser: AppUser = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || 'ইউজার',
        photoURL: u.photoURL,
      };
      saveStoredAppUser(appUser);
      return appUser;
    } catch (fbError: any) {
      // 3. Fallback to local accounts
      const accounts = getStoredLocalAccounts();
      const localAcc = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
      if (localAcc) {
        if (localAcc.password === pass) {
          const appUser: AppUser = {
            uid: localAcc.uid,
            email: localAcc.email,
            displayName: localAcc.name || 'ইউজার',
            photoURL: localAcc.photoURL || null,
          };
          saveStoredAppUser(appUser);
          registerUserEmail(normalizedEmail);
          return appUser;
        } else {
          throw new Error('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।');
        }
      }

      if (!isRegistered) {
        throw new Error('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে প্রথমে "একাউন্ট করুন" অপশন থেকে একাউন্ট তৈরি করুন।');
      }

      throw new Error(supabaseError?.message || 'লগইন করতে সমস্যা হয়েছে।');
    }
  }
};

export const logoutApp = async () => {
  try {
    await logoutFromSupabase();
  } catch {
    // Ignore
  }
  try {
    await signOut(auth);
  } catch {
    // Ignore
  }
  saveStoredAppUser(null);
};

// 4. Google Drive Connect Functions
export const connectGoogleDrive = async (): Promise<DriveAccount | null> => {
  try {
    const result = await signInWithPopup(auth, driveBackupProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google ড্রাইভ অ্যাক্সেস টোকেন পাওয়া যায়নি');
    }

    const driveAccount: DriveAccount = {
      email: result.user.email || 'unknown',
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      accessToken: credential.accessToken,
      connectedAt: new Date().toISOString(),
    };
    saveStoredDriveAccount(driveAccount);
    return driveAccount;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      return null;
    }
    console.error('Drive connect error:', error);
    throw error;
  }
};

export const disconnectGoogleDrive = async () => {
  saveStoredDriveAccount(null);
};

export const getDriveAccessToken = (): string | null => {
  const acc = getStoredDriveAccount();
  return acc ? acc.accessToken : null;
};
