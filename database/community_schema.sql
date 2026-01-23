-- =============================================
-- LIBRIS COMMUNITY FEATURES - DATABASE SCHEMA
-- =============================================
-- Run this in Supabase SQL Editor to set up community tables

-- =============================================
-- STEP 1: CREATE ALL TABLES FIRST
-- =============================================

-- 1. USER PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  favorite_genres TEXT[],
  is_public BOOLEAN DEFAULT true,
  show_currently_reading BOOLEAN DEFAULT true,
  show_reading_stats BOOLEAN DEFAULT true,
  show_book_reviews BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FOLLOWS (Friend/Follow System)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 3. BOOK CLUBS/GROUPS
CREATE TABLE IF NOT EXISTS public.book_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  current_book_isbn TEXT,
  current_book_title TEXT,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLUB MEMBERS
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- 5. BOOK REVIEWS (Public)
CREATE TABLE IF NOT EXISTS public.book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  book_isbn TEXT,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_cover_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_spoiler BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REVIEW LIKES
CREATE TABLE IF NOT EXISTS public.review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.book_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- 7. DISCUSSIONS (Per Book or Club)
CREATE TABLE IF NOT EXISTS public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  book_isbn TEXT,
  book_title TEXT,
  club_id UUID REFERENCES public.book_clubs(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DISCUSSION REPLIES
CREATE TABLE IF NOT EXISTS public.discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVITY FEED
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'started_reading', 'finished_reading', 'added_book', 'review_posted',
    'joined_club', 'discussion_created', 'followed_user', 'goal_achieved',
    'book_recommended', 'started_book', 'finished_book', 'review', 'achievement'
  )),
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  book_title TEXT,
  book_author TEXT,
  book_cover_url TEXT,
  content TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  club_id UUID REFERENCES public.book_clubs(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.book_reviews(id) ON DELETE SET NULL,
  discussion_id UUID REFERENCES public.discussions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BOOK RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  book_isbn TEXT,
  book_title TEXT NOT NULL,
  book_author TEXT,
  book_cover_url TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 2: ADD CONSTRAINTS
-- =============================================

-- Prevent self-follows
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_self_follow') THEN
    ALTER TABLE public.follows ADD CONSTRAINT no_self_follow CHECK (follower_id != following_id);
  END IF;
END $$;

-- =============================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: CREATE POLICIES (after all tables exist)
-- =============================================

-- Drop existing policies first (to allow re-running)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'follows', 'book_clubs', 'club_members', 
                      'book_reviews', 'review_likes', 'discussions', 
                      'discussion_replies', 'activities', 'recommendations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- PROFILES POLICIES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (is_public = true OR id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- FOLLOWS POLICIES
CREATE POLICY "follows_select" ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "follows_insert" ON public.follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete" ON public.follows FOR DELETE
  USING (follower_id = auth.uid());

-- BOOK CLUBS POLICIES
CREATE POLICY "clubs_select" ON public.book_clubs FOR SELECT
  USING (is_public = true OR owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = id AND user_id = auth.uid()));

CREATE POLICY "clubs_insert" ON public.book_clubs FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clubs_update" ON public.book_clubs FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "clubs_delete" ON public.book_clubs FOR DELETE
  USING (owner_id = auth.uid());

-- CLUB MEMBERS POLICIES
CREATE POLICY "members_select" ON public.club_members FOR SELECT
  USING (true);

CREATE POLICY "members_insert" ON public.club_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_delete" ON public.club_members FOR DELETE
  USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.book_clubs WHERE id = club_id AND owner_id = auth.uid()));

-- BOOK REVIEWS POLICIES
CREATE POLICY "reviews_select" ON public.book_reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert" ON public.book_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update" ON public.book_reviews FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "reviews_delete" ON public.book_reviews FOR DELETE
  USING (user_id = auth.uid());

-- REVIEW LIKES POLICIES
CREATE POLICY "likes_select" ON public.review_likes FOR SELECT
  USING (true);

CREATE POLICY "likes_insert" ON public.review_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes_delete" ON public.review_likes FOR DELETE
  USING (user_id = auth.uid());

-- DISCUSSIONS POLICIES
CREATE POLICY "discussions_select" ON public.discussions FOR SELECT
  USING (true);

CREATE POLICY "discussions_insert" ON public.discussions FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "discussions_update" ON public.discussions FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "discussions_delete" ON public.discussions FOR DELETE
  USING (author_id = auth.uid());

-- DISCUSSION REPLIES POLICIES
CREATE POLICY "replies_select" ON public.discussion_replies FOR SELECT
  USING (true);

CREATE POLICY "replies_insert" ON public.discussion_replies FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "replies_update" ON public.discussion_replies FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "replies_delete" ON public.discussion_replies FOR DELETE
  USING (author_id = auth.uid());

-- ACTIVITIES POLICIES
CREATE POLICY "activities_select" ON public.activities FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND is_public = true)
    OR user_id = auth.uid()
  );

CREATE POLICY "activities_insert" ON public.activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RECOMMENDATIONS POLICIES
CREATE POLICY "recommendations_select" ON public.recommendations FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "recommendations_insert" ON public.recommendations FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "recommendations_update" ON public.recommendations FOR UPDATE
  USING (to_user_id = auth.uid());

CREATE POLICY "recommendations_delete" ON public.recommendations FOR DELETE
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- =============================================
-- STEP 5: CREATE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book_isbn ON public.book_reviews(book_isbn);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_book ON public.discussions(book_isbn);
CREATE INDEX IF NOT EXISTS idx_discussions_club ON public.discussions(club_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_to ON public.recommendations(to_user_id);

-- =============================================
-- STEP 6: CREATE RPC FUNCTIONS
-- =============================================

-- Increment club member count
CREATE OR REPLACE FUNCTION public.increment_club_members(club_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.book_clubs
  SET member_count = COALESCE(member_count, 0) + 1
  WHERE id = club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement club member count
CREATE OR REPLACE FUNCTION public.decrement_club_members(club_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.book_clubs
  SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0)
  WHERE id = club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 7: AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Reader'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 8: CREATE VIEWS
-- =============================================

-- Trending books view (fixed: use book_id instead of book_isbn)
CREATE OR REPLACE VIEW public.trending_books AS
SELECT 
  COALESCE(CAST(book_id AS TEXT), book_title) as book_key,
  book_title,
  book_author,
  book_cover_url,
  COUNT(*) as activity_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.activities
WHERE 
  book_title IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY COALESCE(CAST(book_id AS TEXT), book_title), book_title, book_author, book_cover_url
ORDER BY activity_count DESC, unique_users DESC
LIMIT 20;

-- Currently reading view
CREATE OR REPLACE VIEW public.currently_reading AS
SELECT 
  b.title as book_title,
  b.author as book_author,
  b.cover_url as book_cover,
  COUNT(*) as reader_count
FROM public.books b
JOIN public.profiles p ON b.user_id = p.id
WHERE 
  b.status = 'In Progress'
  AND p.is_public = true
  AND p.show_currently_reading = true
GROUP BY b.title, b.author, b.cover_url
ORDER BY reader_count DESC
LIMIT 50;

-- =============================================
-- STEP 9: CREATE PROFILE FOR EXISTING USERS
-- =============================================

INSERT INTO public.profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', 'Reader')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SUCCESS!
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Community schema created successfully!';
  RAISE NOTICE 'Tables: profiles, follows, book_clubs, club_members, book_reviews, review_likes, discussions, discussion_replies, activities, recommendations';
  RAISE NOTICE 'RPC Functions: increment_club_members, decrement_club_members';
  RAISE NOTICE 'Views: trending_books, currently_reading';
END $$;
