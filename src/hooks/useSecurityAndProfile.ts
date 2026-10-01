import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

const PROFILE_KEY = 'hishab_user_profile';
const PRIVACY_BLUR_KEY = 'hishab_privacy_blur';
const APP_LOCK_ENABLED_KEY = 'hishab_app_lock_enabled';
const APP_PIN_KEY = 'hishab_app_pin';
const APP_IS_LOCKED_KEY = 'hishab_is_locked_session';

const DEFAULT_PROFILE: UserProfile = {
  name: 'ব্যক্তিগত অ্যাকাউন্ট',
  tagline: 'দৈনন্দিন আয়-ব্যয়ের হিসাব',
  avatarIcon: '👤',
  photoURL: undefined,
  phone: '',
  email: '',
  password: '',
};

export function useSecurityAndProfile(googleUser?: { displayName?: string | null; photoURL?: string | null; email?: string | null } | null) {
  // 1. User Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return DEFAULT_PROFILE;
  });

  // Sync Google info into profile if profile is untouched default or user logs in with Google photo
  useEffect(() => {
    if (googleUser) {
      setProfile(prev => {
        const isDefaultName = !prev.name || prev.name === 'ব্যক্তিগত অ্যাকাউন্ট';
        const newName = isDefaultName ? (googleUser.displayName || prev.name) : prev.name;
        const newEmail = prev.email || googleUser.email || '';
        const newPhoto = prev.photoURL || googleUser.photoURL || undefined;

        if (newName !== prev.name || newEmail !== prev.email || newPhoto !== prev.photoURL) {
          const updated = {
            ...prev,
            name: newName,
            email: newEmail,
            photoURL: newPhoto,
          };
          localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [googleUser]);

  const saveProfile = useCallback((updated: UserProfile) => {
    setProfile(updated);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  }, []);

  // 2. Privacy Blur State
  const [privacyBlur, setPrivacyBlurState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVACY_BLUR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.body;
    const doc = document.documentElement;
    if (privacyBlur) {
      root.classList.add('privacy-mode');
      doc.classList.add('privacy-mode');
    } else {
      root.classList.remove('privacy-mode');
      doc.classList.remove('privacy-mode');
    }
    try {
      localStorage.setItem(PRIVACY_BLUR_KEY, String(privacyBlur));
    } catch {
      // Ignore
    }
  }, [privacyBlur]);

  const togglePrivacyBlur = useCallback(() => {
    setPrivacyBlurState(prev => !prev);
  }, []);

  const setPrivacyBlur = useCallback((enabled: boolean) => {
    setPrivacyBlurState(enabled);
  }, []);

  // 3. App Lock & PIN State (Requires logged-in account to work)
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(APP_LOCK_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [hasPin, setHasPin] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(APP_PIN_KEY);
    } catch {
      return false;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      // App lock must only engage if user is logged in
      if (!googleUser) return false;
      const lockEnabled = localStorage.getItem(APP_LOCK_ENABLED_KEY) === 'true';
      const pin = localStorage.getItem(APP_PIN_KEY);
      if (lockEnabled && pin) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // When user logs out or is not logged in, ensure app is never locked
  useEffect(() => {
    if (!googleUser) {
      setIsLocked(false);
    }
  }, [googleUser]);

  const savePin = useCallback((pin: string) => {
    localStorage.setItem(APP_PIN_KEY, pin);
    localStorage.setItem(APP_LOCK_ENABLED_KEY, 'true');
    setHasPin(true);
    setIsLockEnabled(true);
  }, []);

  const disableLock = useCallback(() => {
    localStorage.setItem(APP_LOCK_ENABLED_KEY, 'false');
    setIsLockEnabled(false);
    setIsLocked(false);
  }, []);

  const resetPin = useCallback(() => {
    localStorage.removeItem(APP_PIN_KEY);
    localStorage.setItem(APP_LOCK_ENABLED_KEY, 'false');
    setHasPin(false);
    setIsLockEnabled(false);
    setIsLocked(false);
  }, []);

  const unlockApp = useCallback((enteredPin: string): boolean => {
    const savedPin = localStorage.getItem(APP_PIN_KEY);
    if (savedPin && savedPin === enteredPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const lockNow = useCallback(() => {
    // Only allow locking if logged in
    if (googleUser && isLockEnabled && hasPin) {
      setIsLocked(true);
    }
  }, [googleUser, isLockEnabled, hasPin]);

  return {
    profile,
    saveProfile,
    privacyBlur,
    togglePrivacyBlur,
    setPrivacyBlur,
    isLockEnabled,
    hasPin,
    isLockActive: Boolean(googleUser && isLockEnabled && hasPin),
    isLocked: Boolean(googleUser && isLocked),
    savePin,
    disableLock,
    resetPin,
    unlockApp,
    lockNow,
  };
}
