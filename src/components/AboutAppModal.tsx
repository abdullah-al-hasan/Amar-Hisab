import React from 'react';
import { X } from 'lucide-react';

interface AboutAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutAppModal: React.FC<AboutAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111726] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 max-h-[90vh] flex flex-col transition-colors overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              আমার হিসাব সম্পর্কে জানুন
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              অ্যাপের ধারণা, ফিচার, কার্যকারিতা ও ডেভেলপারের তথ্য
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed custom-scrollbar">
          
          {/* Section 1: Concept */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              অ্যাপের ধারণা ও উদ্দেশ্য
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <strong>"আমার হিসাব"</strong> একটি সহজ, আধুনিক ও নির্ভুল আর্থিক হিসাব ব্যবস্থাপনা প্ল্যাটফর্ম। দৈনন্দিন আয়-ব্যয়, ওয়ালেট ব্যালেন্স এবং দেনা-পাওনার হিসাব এক জায়গায় গুছিয়ে রাখার উদ্দেশ্যে এটি নির্মিত হয়েছে, যাতে যেকোনো ব্যক্তি নিজের আর্থিক অবস্থান স্পষ্ট দেখতে পারেন।
            </p>
          </div>

          {/* Section 2: Features */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              মূল ফিচার ও কার্যকারিতা
            </h4>
            
            <div className="space-y-2 text-[11px]">
              <div className="pb-1.5 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  • একাধিক ওয়ালেট ও অ্যাকাউন্ট ব্যবস্থাপনা
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  ক্যাশ, ব্যাংক, বিকাশ, নগদ, রকেটের মতো একাধিক ওয়ালেটের পৃথক ব্যালেন্স ও ওয়ালেট ট্রান্সফার।
                </p>
              </div>

              <div className="pb-1.5 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  • আয় ও ব্যয়ের সুনির্দিষ্ট হিসাব
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  কাস্টম ক্যাটাগরি অনুসারে প্রতিটি খরচের স্বচ্ছ হিসাব ও ফিল্টারিং সুবিধা।
                </p>
              </div>

              <div className="pb-1.5 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  • দেনা-পাওনা ও বাকি ট্র্যাকিং
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  কার কাছে কত টাকা পাওনা বা নিজের কত দেনা রয়েছে তা সহজেই ট্র্যাক ও আংশিক বা পূর্ণ নিষ্পত্তি।
                </p>
              </div>

              <div className="pb-1.5 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  • ৪-সংখ্যার পিন অ্যাপ লক
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  ব্যক্তিগত লেনদেনের নিরাপত্তা রক্ষায় গোপন পিন কোড দিয়ে লক ও আনলক করার ব্যবস্থা।
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  • অটো ক্লাউড ও অফলাইন ব্যাকআপ
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  গুগল ড্রাইভ কানেক্ট করে ক্লাউড ব্যাকআপ এবং ডিভাইসে অফলাইন ফাইল ডাউনলোড/রিস্টোর সুবিধা।
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Developer & AI Collaboration */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              ডেভেলপারের পরিচয় ও নির্মাণ কথা
            </h4>
            
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <p>
                <strong className="text-slate-800 dark:text-slate-200">ডেভেলপার:</strong> আব্দুল্লাহ আল হাসান
              </p>
              <p className="leading-relaxed">
                এই অ্যাপ্লিকেশনটি ডেভেলপার <strong>আব্দুল্লাহ আল হাসান</strong> আধুনিক কৃত্রিম বুদ্ধিমত্তা (AI)-এর সরাসরি ও নিবিড় সহযোগিতায় তৈরি করেছেন। অ্যাপের স্থাপত্য কাঠামো, লজিক এবং ব্যবহারকারী-বান্ধব ইন্টারফেস এআই প্রযুক্তির সহায়তায় নিখুঁতভাবে রূপায়ন করা হয়েছে।
              </p>
            </div>
          </div>

          {/* Section 4: Privacy */}
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            আপনার সকল আর্থিক তথ্য ও হিসাব সম্পূর্ণ আপনার নিয়ন্ত্রণে এবং আপনার ডিভাইসে সুরক্ষিতভাবে সংরক্ষিত থাকে।
          </div>

        </div>

      </div>
    </div>
  );
};
