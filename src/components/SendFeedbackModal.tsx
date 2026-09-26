import React, { useState } from 'react';
import { X, Star, Send, CheckCircle2 } from 'lucide-react';
import { FeedbackData } from '../types';
import { generateId } from '../utils/storage';

interface SendFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const SendFeedbackModal: React.FC<SendFeedbackModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
  userName = '',
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleInAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const feedbackItem: FeedbackData = {
      id: generateId('fb'),
      rating,
      category: 'suggestion',
      message: message.trim(),
      contact: userEmail.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Save to local feedback storage
    try {
      const existing = JSON.parse(localStorage.getItem('hishab_feedbacks') || '[]');
      existing.unshift(feedbackItem);
      localStorage.setItem('hishab_feedbacks', JSON.stringify(existing));
    } catch {
      // Ignore
    }

    setIsSubmitted(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">আপনার মতামত দিন</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">আপনার যেকোনো মতামত আমাদের অ্যাপটিকে আরও সুন্দর করবে</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isSubmitted ? (
          <form onSubmit={handleInAppSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5">
            {/* Star Rating */}
            <div className="flex flex-col items-center justify-center py-2 space-y-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                অ্যাপটি আপনার কেমন লাগছে?
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          filled
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-amber-500 font-bold">
                {rating === 5 && 'অসাধারণ! ৫ স্টার'}
                {rating === 4 && 'অনেক ভালো! ৪ স্টার'}
                {rating === 3 && 'মোটামুটি! ৩ স্টার'}
                {rating === 2 && 'উন্নতি প্রয়োজন! ২ স্টার'}
                {rating === 1 && 'খুবই কম! ১ স্টার'}
              </span>
            </div>

            {/* Message Box */}
            <div>
              <textarea
                required
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="অ্যাপ সম্পর্কে আপনার মতামত লিখুন..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>

            {/* Submit Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>মতামত পাঠান</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="py-10 px-4 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ধন্যবাদ আপনার মূল্যবান মতামতের জন্য!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                আপনার ফিডব্যাক সফলভাবে গৃহীত হয়েছে। আপনার প্রতিটি পরামর্শই আমাদের এই অ্যাপটিকে আরও উন্নত করতে সাহায্য করে।
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setMessage('');
                  onClose();
                }}
                className="py-2.5 px-6 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
