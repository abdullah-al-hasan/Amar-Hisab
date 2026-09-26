-- ============================================================
-- আমার হিসাব (Amar Hisab) - Supabase Database Schema
-- ============================================================
-- নির্দেশিকা:
-- ১. আপনার Supabase Dashboard (https://supabase.com/dashboard/project/xzppcizmhkfxptwuaced)-এ যান।
-- ২. বাম পাশের মেনু থেকে "SQL Editor"-এ ক্লিক করুন।
-- ৩. "New query" বাটনে ক্লিক করে নিচের সম্পূর্ণ কোডটি পেস্ট করুন।
-- ৪. নিচের ডানপাশের সবুজ "Run" বাটনে ক্লিক করুন।
-- ============================================================

-- ১. ব্যবহারকারীর মূল হিসাব ও ডেটা সংরক্ষণের জন্য টেবিল
CREATE TABLE IF NOT EXISTS public.user_app_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    app_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ২. Row Level Security (RLS) সক্রিয়করণ (যাতে একজন ব্যবহারকারী অন্যের ডেটা না দেখতে পারে)
ALTER TABLE public.user_app_data ENABLE ROW LEVEL SECURITY;

-- ৩. সিকিউরিটি পলিসি: কেবল নিজের ডেটাই পড়তে পারবে
DROP POLICY IF EXISTS "Users can read own app data" ON public.user_app_data;
CREATE POLICY "Users can read own app data"
ON public.user_app_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ৪. সিকিউরিটি পলিসি: নিজের ডেটা ইনসার্ট করতে পারবে
DROP POLICY IF EXISTS "Users can insert own app data" ON public.user_app_data;
CREATE POLICY "Users can insert own app data"
ON public.user_app_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ৫. সিকিউরিটি পলিসি: নিজের ডেটা আপডেট করতে পারবে
DROP POLICY IF EXISTS "Users can update own app data" ON public.user_app_data;
CREATE POLICY "Users can update own app data"
ON public.user_app_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ৬. ক্লাউড ব্যাকআপ হিস্ট্রি টেবিল (ঐচ্ছিক ব্যাকআপ স্ন্যাপশট সংরক্ষণের জন্য)
CREATE TABLE IF NOT EXISTS public.user_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_name TEXT,
    app_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own backups" ON public.user_backups;
CREATE POLICY "Users can manage own backups"
ON public.user_backups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
