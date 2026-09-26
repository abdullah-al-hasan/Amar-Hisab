import React, { useState, useRef } from 'react';
import { X, Camera, Check, User, Mail, Phone, Lock, Eye, EyeOff, Sparkles, LogOut, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  googleUser?: {
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
  } | null;
  isLoggedIn?: boolean;
  isDriveConnected?: boolean;
  onLogout?: () => Promise<void> | void;
}

const MALE_AVATARS: string[] = [
  '👨‍🎓', '👮‍♂️', '👨‍⚕️', '👨‍🏫', '👨‍💼', '👨‍💻',
  '👨‍🍳', '👨‍🌾', '👨‍⚖️', '👨‍✈️', '👨‍🔬', '👨‍🎨',
  '👨‍🚒', '👨‍🔧', '👳‍♂️', '👨', '🧑‍💼', '🧔'
];

const FEMALE_AVATARS: string[] = [
  '👩‍🎓', '👮‍♀️', '👩‍⚕️', '👩‍🏫', '👩‍💼', '👩‍💻',
  '👩‍🍳', '👩‍🌾', '👩‍⚖️', '👩‍✈️', '👩‍🔬', '👩‍🎨',
  '👩‍🚒', '👩‍🔧', '🧕', '👩', '🧑‍💼', '👱‍♀️'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
  googleUser,
  isLoggedIn,
  isDriveConnected = false,
  onLogout,
}) => {
  const [name, setName] = useState(currentProfile.name || '');
  const [phone, setPhone] = useState(currentProfile.phone || '');
  const [email, setEmail] = useState(currentProfile.email || (googleUser?.email || ''));
  const [password, setPassword] = useState(currentProfile.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarIcon, setAvatarIcon] = useState(currentProfile.avatarIcon || '👨‍🎓');
  const [photoURL, setPhotoURL] = useState<string | undefined>(currentProfile.photoURL);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [genderTab, setGenderTab] = useState<'male' | 'female'>(() => {
    return FEMALE_AVATARS.includes(currentProfile.avatarIcon || '') ? 'female' : 'male';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoutClick = async () => {
    if (!onLogout || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
      onClose();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCustomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ছবির আকার সর্বোচ্চ ২ মেগাবাইট হতে হবে');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoURL(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseGooglePhoto = () => {
    if (googleUser?.photoURL) {
      setPhotoURL(googleUser.photoURL);
    }
    if (googleUser?.displayName && !name) {
      setName(googleUser.displayName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: password.trim(),
      avatarIcon,
      photoURL,
      tagline: currentProfile.tagline,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">প্রোফাইল এডিট করুন</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* Avatar / Photo Selector */}
          <div className="flex flex-col items-center justify-center py-1 space-y-3">
            <div className="relative group">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl shadow-md">
                  {avatarIcon}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="ছবি আপলোড করুন"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomPhoto}
                className="hidden"
              />
            </div>

            {/* Quick action buttons for photo */}
            <div className="flex items-center gap-2">
              {googleUser?.photoURL && photoURL !== googleUser.photoURL && (
                <button
                  type="button"
                  onClick={handleUseGooglePhoto}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  গুগল ফটো ব্যবহার করুন
                </button>
              )}

              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL(undefined)}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  ছবি রিমুভ করুন
                </button>
              )}
            </div>

            {/* Professional Avatar Selection (Gender Separated) */}
            <div className="w-full space-y-2 pt-1">
              {/* Gender Filter Tabs */}
              <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl max-w-[120px] mx-auto gap-1">
                <button
                  type="button"
                  onClick={() => setGenderTab('male')}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    genderTab === 'male'
                      ? 'bg-white dark:bg-slate-700 shadow-xs scale-105'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                  aria-label="পুরুষ"
                >
                  <span>👨</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenderTab('female')}
                  className={`flex-1 py-1 px-2.5 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    genderTab === 'female'
                      ? 'bg-white dark:bg-slate-700 shadow-xs scale-105'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                  aria-label="নারী"
                >
                  <span>👩</span>
                </button>
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-6 gap-2">
                {(genderTab === 'male' ? MALE_AVATARS : FEMALE_AVATARS).map((icon) => {
                  const isSelected = !photoURL && avatarIcon === icon;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setAvatarIcon(icon);
                        setPhotoURL(undefined);
                      }}
                      className={`flex items-center justify-center h-11 rounded-xl border text-2xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 shadow-sm scale-105 ring-2 ring-emerald-500/70'
                          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60'
                      }`}
                    >
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>আপনার নাম *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="যেমন: আব্দুল্লাহ আল হাসান"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Mobile Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>মোবাইল নম্বর</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>ইমেইল</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Password Option */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>পাসওয়ার্ড</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="আপনার পাসওয়ার্ড লিখুন"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>

          {/* Logout Button inside Edit Profile Modal (Requirement 2) */}
          {onLogout && (googleUser || isLoggedIn) && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
                    <span>
                      {isDriveConnected ? 'ডাটা গুগলে ক্লাউডে আপলোড হচ্ছে...' : 'ডাটা ডাউনলোড ও লগআউট হচ্ছে...'}
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>লগআউট করুন</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-normal">
                {isDriveConnected
                  ? '* লগআউট করার সময় ডাটা স্বয়ংক্রিয়ভাবে গুগল ড্রাইভে ক্লাউড ব্যাকআপ হবে।'
                  : '* লগআউট করার সময় আপনার ডাটার একটি ব্যাকআপ কপি স্বয়ংক্রিয়ভাবে ডাউনলোড হবে।'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
