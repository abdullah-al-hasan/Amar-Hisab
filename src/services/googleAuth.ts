import { supabase, getAuthRedirectUrl } from './supabaseClient';
import { AppUser, DriveAccount } from '../types';
import { 
  registerWithSupabase, 
  loginWithSupabase, 
  logoutFromSupabase,
  formatSupabaseUser
} from './supabaseAuth';

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

// Track registered user emails
export const getRegisteredUsers = (): string[] => {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const localAccounts = getStoredLocalAccounts();
    const all = new Set<string>(list.map(e => e.toLowerCase().trim()));
    localAccounts.forEach(a => {
      if (a.email) all.add(a.email.toLowerCase().trim());
    });
    return Array.from(all);
  } catch {
    return [];
  }
};

export const registerUserEmail = (email: string) => {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  const current = getRegisteredUsers();
  if (!current.includes(normalized)) {
    current.push(normalized);
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(current));
    } catch {
      // Ignore
    }
  }
};

export const isUserEmailRegistered = (email: string): boolean => {
  const normalized = email.toLowerCase().trim();
  const list = getRegisteredUsers();
  if (list.includes(normalized)) return true;
  const localAccounts = getStoredLocalAccounts();
  return localAccounts.some(a => a.email.toLowerCase().trim() === normalized);
};

// Storage Helpers
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

/**
 * 1. App Login with Google via Supabase OAuth
 */
export const loginAppWithGoogle = async (isRegistering: boolean = false): Promise<AppUser | null> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        scopes: 'openid email profile https://www.googleapis.com/auth/userinfo.profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      const errMsg = error.message || '';
      if (
        errMsg.toLowerCase().includes('unsupported provider') ||
        errMsg.toLowerCase().includes('provider is not enabled') ||
        errMsg.toLowerCase().includes('validation_failed')
      ) {
        throw new Error('গুগল লগইন বর্তমানে উপলব্ধ নেই। দয়া করে ইমেইল ও পাসওয়ার্ড ব্যবহার করে লগইন অথবা একাউন্ট করুন।');
      }
      throw new Error(error.message || 'গুগল সাইন-ইন শুরু করতে সমস্যা হয়েছে');
    }

    return null;
  } catch (error: any) {
    console.error('Supabase Google OAuth error:', error);
    const msg = error?.message || '';
    if (
      msg.toLowerCase().includes('unsupported provider') ||
      msg.toLowerCase().includes('provider is not enabled') ||
      msg.toLowerCase().includes('validation_failed')
    ) {
      throw new Error('গুগল লগইন বর্তমানে উপলব্ধ নেই। দয়া করে ইমেইল ও পাসওয়ার্ড ব্যবহার করে লগইন অথবা একাউন্ট করুন।');
    }
    throw error;
  }
};

/**
 * 2. Register App with Email & Password via Supabase
 */
export const registerAppWithEmailPassword = async (
  name: string,
  email: string,
  pass: string
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  try {
    const supabaseUser = await registerWithSupabase(trimmedName, normalizedEmail, pass);
    registerUserEmail(normalizedEmail);

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

    if (
      supabaseError?.message?.includes('ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে') ||
      supabaseError?.message?.includes('already registered')
    ) {
      throw supabaseError;
    }

    // Local account fallback
    const accounts = getStoredLocalAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('এই ইমেইল দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে। দয়া করে লগইন করুন।');
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
};

/**
 * 3. Login App with Email & Password via Supabase
 */
export const loginAppWithEmailPassword = async (
  email: string,
  pass: string
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const supabaseUser = await loginWithSupabase(normalizedEmail, pass);
    registerUserEmail(normalizedEmail);

    const accounts = getStoredLocalAccounts();
    const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
    const newAcc: StoredLocalAccount = {
      uid: supabaseUser.uid,
      name: supabaseUser.displayName || 'ইউজার',
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
    console.warn('Supabase login attempt error:', supabaseError);

    // Check local accounts fallback
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

    if (!isUserEmailRegistered(normalizedEmail)) {
      throw new Error('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে প্রথমে "একাউন্ট করুন" অপশন থেকে একাউন্ট তৈরি করুন।');
    }

    throw new Error(supabaseError?.message || 'লগইন করতে সমস্যা হয়েছে।');
  }
};

/**
 * 4. Logout App via Supabase
 */
export const logoutApp = async () => {
  try {
    await logoutFromSupabase();
  } catch {
    // Ignore
  }
  saveStoredAppUser(null);
};

/**
 * 5. Google Drive Connect Functions
 */
export const connectGoogleDrive = async (): Promise<DriveAccount | null> => {
  try {
    // 1. First check if the user is signed in with Google and Supabase already has a provider_token
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = (session as any)?.provider_token;
    
    if (providerToken) {
      const email = session?.user?.email || 'unknown';
      const driveAcc: DriveAccount = {
        email,
        accessToken: providerToken,
        connectedAt: new Date().toISOString(),
      };
      saveStoredDriveAccount(driveAcc);
      return driveAcc;
    }

    // 2. If no provider token yet, initiate OAuth with Google Drive scope
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        scopes: 'https://www.googleapis.com/auth/drive.appdata',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      const errMsg = error.message || '';
      if (
        errMsg.toLowerCase().includes('unsupported provider') ||
        errMsg.toLowerCase().includes('provider is not enabled') ||
        errMsg.toLowerCase().includes('validation_failed')
      ) {
        throw new Error('গুগল ড্রাইভ সংযোগ বর্তমানে সমর্থিত নয়। দয়া করে নিচের অফলাইন ব্যাকআপ ডাউনলোড অপশন ব্যবহার করুন।');
      }
      throw new Error(error.message || 'গুগল ড্রাইভ সাইন-ইন শুরু করতে সমস্যা হয়েছে');
    }

    return null;
  } catch (err: any) {
    console.error('connectGoogleDrive error:', err);
    throw err;
  }
};

export const disconnectGoogleDrive = async () => {
  saveStoredDriveAccount(null);
};

export const getDriveAccessToken = (): string | null => {
  const acc = getStoredDriveAccount();
  return acc ? acc.accessToken : null;
};

/**
 * 6. Password Management Functions via Supabase
 */
export const verifyUserPassword = async (email: string, pass: string): Promise<boolean> => {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Check local account first
  const accounts = getStoredLocalAccounts();
  const localAcc = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
  if (localAcc && localAcc.password === pass) {
    return true;
  }

  // Try Supabase auth verification
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: pass,
    });
    if (!error && data?.user) {
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
};

export const hasUserSetPassword = (email?: string | null): boolean => {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getStoredLocalAccounts();
  const localAcc = accounts.find(a => a.email.toLowerCase() === normalizedEmail);
  return Boolean(localAcc && localAcc.password && localAcc.password.length >= 6);
};

export const setInitialPassword = async (
  email: string,
  newPass: string
): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (newPass.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }

  // Save/Update in local accounts
  const accounts = getStoredLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
  if (idx >= 0) {
    accounts[idx].password = newPass;
    saveStoredLocalAccounts(accounts);
  } else {
    accounts.push({
      uid: 'usr_' + Date.now().toString(36),
      name: 'ইউজার',
      email: normalizedEmail,
      password: newPass,
    });
    saveStoredLocalAccounts(accounts);
  }

  // Update in Supabase
  try {
    await supabase.auth.updateUser({ password: newPass });
  } catch (err) {
    console.warn('Supabase set initial password notice:', err);
  }
};

export const changeAppUserPassword = async (
  email: string,
  oldPass: string,
  newPass: string
): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  
  const isValid = await verifyUserPassword(normalizedEmail, oldPass);
  if (!isValid) {
    throw new Error('বর্তমান পাসওয়ার্ড ভুল দেওয়া হয়েছে');
  }

  // Update in local accounts
  const accounts = getStoredLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
  if (idx >= 0) {
    accounts[idx].password = newPass;
    saveStoredLocalAccounts(accounts);
  }

  // Update in Supabase
  try {
    await supabase.auth.updateUser({ password: newPass });
  } catch (err) {
    console.warn('Supabase password update notice:', err);
  }
};

export const resetUserPassword = async (
  email: string,
  newPass: string
): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!isUserEmailRegistered(normalizedEmail)) {
    throw new Error('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি');
  }

  const accounts = getStoredLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === normalizedEmail);
  if (idx >= 0) {
    accounts[idx].password = newPass;
    saveStoredLocalAccounts(accounts);
  } else {
    accounts.push({
      uid: 'usr_' + Date.now().toString(36),
      name: 'ইউজার',
      email: normalizedEmail,
      password: newPass,
    });
    saveStoredLocalAccounts(accounts);
  }

  // Try Supabase password reset request
  try {
    await supabase.auth.resetPasswordForEmail(normalizedEmail);
  } catch {
    // Ignore
  }
};
