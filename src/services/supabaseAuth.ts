import { supabase } from './supabaseClient';
import { AppUser } from '../types';

const APP_USER_KEY = 'hishab_app_user';

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

export function formatSupabaseUser(user: any): AppUser {
  return {
    uid: user.id,
    email: user.email || null,
    displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'ইউজার'),
    photoURL: user.user_metadata?.avatar_url || null,
  };
}

/**
 * Register a new user in Supabase with Email & Password
 */
export async function registerWithSupabase(
  name: string,
  email: string,
  pass: string
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: pass,
    options: {
      data: {
        display_name: trimmedName,
        full_name: trimmedName,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('User already exists')) {
      throw new Error('এই ইমেইল দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে। দয়া করে লগইন করুন।');
    }
    if (error.message.includes('Password should be at least')) {
      throw new Error('পাসওয়ার্ডটি দুর্বল। কমপক্ষে ৬টি অক্ষর বা সংখ্যা দিন।');
    }
    throw new Error(error.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে');
  }

  if (!data.user) {
    throw new Error('অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে');
  }

  const appUser = formatSupabaseUser(data.user);
  saveStoredAppUser(appUser);
  return appUser;
}

/**
 * Login user in Supabase with Email & Password
 */
export async function loginWithSupabase(
  email: string,
  pass: string
): Promise<AppUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: pass,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('ভুল ইমেইল অথবা পাসওয়ার্ড। দয়া করে সঠিক তথ্য দিয়ে চেষ্টা করুন।');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('ইমেইল ভেরিফাই করা হয়নি। দয়া করে আপনার ইমেইল চেক করুন অথবা Supabase ড্যাশবোর্ডে Email Confirmation বন্ধ করুন।');
    }
    throw new Error(error.message || 'লগইন করতে সমস্যা হয়েছে');
  }

  if (!data.user) {
    throw new Error('লগইন ব্যর্থ হয়েছে');
  }

  const appUser = formatSupabaseUser(data.user);
  saveStoredAppUser(appUser);
  return appUser;
}

/**
 * Google Sign-in with Supabase
 */
export async function loginWithSupabaseGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message || 'গুগল সাইন-ইন শুরু করতে সমস্যা হয়েছে');
  }
}

/**
 * Logout from Supabase
 */
export async function logoutFromSupabase(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase logout error:', err);
  }
  saveStoredAppUser(null);
}

/**
 * Get current session from Supabase
 */
export async function getCurrentSupabaseUser(): Promise<AppUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const appUser = formatSupabaseUser(session.user);
      saveStoredAppUser(appUser);
      return appUser;
    }
  } catch (err) {
    console.warn('Failed to get Supabase session:', err);
  }
  return getStoredAppUser();
}
