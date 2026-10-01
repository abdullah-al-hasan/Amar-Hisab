import React, { useState, useRef } from 'react';
import { 
  X, Camera, Check, User, Mail, Phone, Lock, Eye, EyeOff, 
  Sparkles, LogOut, Loader2, KeyRound, AlertCircle, CheckCircle2 
} from 'lucide-react';
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
  hasPassword?: boolean;
  onLogout?: () => Promise<void> | void;
  onSetPassword?: (newPass: string) => Promise<void>;
  onChangePassword?: (oldPass: string, newPass: string) => Promise<void>;
  onForgotPassword?: (email: string, newPass: string) => Promise<void>;
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
  hasPassword = false,
  onLogout,
  onSetPassword,
  onChangePassword,
  onForgotPassword,
}) => {
  const [name, setName] = useState(currentProfile.name || '');
  const [phone, setPhone] = useState(currentProfile.phone || '');
  const [email, setEmail] = useState(currentProfile.email || (googleUser?.email || ''));
  const [avatarIcon, setAvatarIcon] = useState(currentProfile.avatarIcon || '👨‍🎓');
  const [photoURL, setPhotoURL] = useState<string | undefined>(currentProfile.photoURL);
  const [imgError, setImgError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sync state when modal opens or currentProfile / googleUser changes
  React.useEffect(() => {
    if (isOpen) {
      setName(currentProfile.name || googleUser?.displayName || '');
      setPhone(currentProfile.phone || '');
      setEmail(currentProfile.email || googleUser?.email || '');
      setAvatarIcon(currentProfile.avatarIcon || '👨‍🎓');
      setPhotoURL(currentProfile.photoURL || googleUser?.photoURL || undefined);
      setImgError(false);
      setShowPasswordSection(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassError('');
      setPassSuccess('');
    }
  }, [isOpen, currentProfile, googleUser]);

  // Password Change & Forgot Password states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Forgot Password modal / view
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(currentProfile.email || (googleUser?.email || ''));
  const [resetNewPass, setResetNewPass] = useState('');
  const [confirmResetPass, setConfirmResetPass] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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
        setImgError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseGooglePhoto = () => {
    if (googleUser?.photoURL) {
      setPhotoURL(googleUser.photoURL);
      setImgError(false);
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
      avatarIcon,
      photoURL,
      tagline: currentProfile.tagline,
    });

    onClose();
  };

  // Handle Password Save (Set initial password or Change existing password)
  const handleSavePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    // If user already has a password, verify old password
    if (hasPassword) {
      if (!oldPassword) {
        setPassError('বর্তমান পাসওয়ার্ড লিখুন');
        return;
      }
    }

    if (newPassword.length < 6) {
      setPassError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassError('নতুন পাসওয়ার্ড দুটি মেলেনি');
      return;
    }

    setIsChangingPass(true);
    try {
      if (hasPassword && onChangePassword) {
        await onChangePassword(oldPassword, newPassword);
        setPassSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      } else if (onSetPassword) {
        await onSetPassword(newPassword);
        setPassSuccess('পাসওয়ার্ড সফলভাবে সেট করা হয়েছে!');
      }
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setPassSuccess('');
        setShowPasswordSection(false);
      }, 2500);
    } catch (err: any) {
      setPassError(err.message || 'পাসওয়ার্ড সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handle Password Change (backward compatibility alias)
  const handleChangePasswordSubmit = handleSavePasswordSubmit;

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const targetEmail = forgotEmail.trim();
    if (!targetEmail) {
      setResetError('অ্যাকাউন্টের ইমেইল লিখুন');
      return;
    }
    if (resetNewPass.length < 6) {
      setResetError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (resetNewPass !== confirmResetPass) {
      setResetError('নতুন পাসওয়ার্ড দুটি মেলেনি');
      return;
    }

    if (onForgotPassword) {
      setIsResetting(true);
      try {
        await onForgotPassword(targetEmail, resetNewPass);
        setResetSuccess('পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!');
        setTimeout(() => {
          setShowForgotModal(false);
          setResetSuccess('');
          setResetNewPass('');
          setConfirmResetPass('');
        }, 2500);
      } catch (err: any) {
        setResetError(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">প্রোফাইল এডিট করুন</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
          {/* Avatar / Photo Selector */}
          <div className="flex flex-col items-center justify-center py-1 space-y-3">
            <div className="relative group">
              {photoURL && !imgError ? (
                <img
                  src={photoURL}
                  alt={name}
                  onError={() => setImgError(true)}
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                />
              ) : avatarIcon ? (
                <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-800 border-4 border-slate-200 flex items-center justify-center text-3xl shadow-md">
                  {avatarIcon}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-600 text-white border-4 border-emerald-500 flex items-center justify-center text-2xl font-bold shadow-md">
                  {name ? name.slice(0, 1).toUpperCase() : 'আ'}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
                  className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  গুগল ফটো ব্যবহার করুন
                </button>
              )}

              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL(undefined)}
                  className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  ছবি সরান
                </button>
              )}
            </div>

            {/* Gender Toggle for Avatar Picker */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setGenderTab('male')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  genderTab === 'male'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                পুরুষ অবতার
              </button>
              <button
                type="button"
                onClick={() => setGenderTab('female')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  genderTab === 'female'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                নারী অবতার
              </button>
            </div>

            {/* Preset Emoji Avatars Grid */}
            <div className="w-full bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/60">
              <div className="grid grid-cols-6 gap-2">
                {(genderTab === 'male' ? MALE_AVATARS : FEMALE_AVATARS).map((emoji, idx) => {
                  const isSelected = !photoURL && avatarIcon === emoji;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarIcon(emoji);
                        setPhotoURL(undefined);
                      }}
                      className={`h-10 text-xl flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-white scale-110 shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>আপনার নাম *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="যেমন: আব্দুল্লাহ আল হাসান"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
            />
          </div>

          {/* Mobile Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>মোবাইল নম্বর</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>ইমেইল</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-semibold outline-none focus:border-slate-500 focus:bg-white"
            />
          </div>

          {/* Password Management Option: If hasPassword is false -> পাসওয়ার্ড সেট করুন; if true -> পাসওয়ার্ড পরিবর্তন */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>{hasPassword ? 'পাসওয়ার্ড পরিবর্তন' : 'পাসওয়ার্ড সেট করুন'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(!showPasswordSection);
                  setPassError('');
                  setPassSuccess('');
                }}
                className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                {showPasswordSection ? 'বন্ধ করুন' : (hasPassword ? 'পরিবর্তন করুন' : 'সেট করুন')}
              </button>
            </div>

            {showPasswordSection && (
              <div className="pt-2 border-t border-slate-200/60 space-y-3 animate-in fade-in">
                {/* Only ask for current password if user already set one */}
                {hasPassword && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      বর্তমান পাসওয়ার্ড
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPass ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                        className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    {hasPassword ? 'নতুন পাসওয়ার্ড' : 'পাসওয়ার্ড দিন'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                      className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    {hasPassword ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'পাসওয়ার্ডটি পুনরায় নিশ্চিত করুন'}
                  </label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>

                {passError && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passError}</span>
                  </p>
                )}

                {passSuccess && (
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{passSuccess}</span>
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  {hasPassword ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setResetError('');
                        setResetSuccess('');
                      }}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    disabled={isChangingPass}
                    onClick={handleSavePasswordSubmit}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isChangingPass ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <span>{hasPassword ? 'পাসওয়ার্ড আপডেট করুন' : 'পাসওয়ার্ড সেট করুন'}</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!showPasswordSection && hasPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="text-xs text-slate-500 hover:text-emerald-600 font-semibold cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>প্রোফাইল সংরক্ষণ করুন</span>
            </button>
          </div>

          {/* Logout Button inside Edit Profile Modal */}
          {onLogout && (googleUser || isLoggedIn) && (
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
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
              <p className="text-[10px] text-center text-slate-400 leading-normal">
                {isDriveConnected
                  ? '* লগআউট করার সময় ডাটা স্বয়ংক্রিয়ভাবে গুগল ড্রাইভে ক্লাউড ব্যাকআপ হবে।'
                  : '* লগআউট করার সময় আপনার ডাটার একটি ব্যাকআপ কপি স্বয়ংক্রিয়ভাবে ডাউনলোড হবে।'}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Forgot Password Dedicated Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>পাসওয়ার্ড ভুলে গেছেন?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              আপনার অ্যাকাউন্টের ইমেইল ঠিকানা দিয়ে নতুন পাসওয়ার্ড সেট করুন।
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  অ্যাকাউন্টের ইমেইল
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  নতুন পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={e => setResetNewPass(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  required
                  value={confirmResetPass}
                  onChange={e => setConfirmResetPass(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              {resetError && (
                <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetError}</span>
                </p>
              )}

              {resetSuccess && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetSuccess}</span>
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>রিসেট হচ্ছে...</span>
                    </>
                  ) : (
                    <span>নতুন পাসওয়ার্ড সেট করুন</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
