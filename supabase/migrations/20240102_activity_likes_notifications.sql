-- Activity Likes and Notifications SQL Migration
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. ACTIVITY LIKES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS activity_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(activity_id, user_id)
);

-- Add like_count to activities if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'activities' AND column_name = 'like_count') THEN
    ALTER TABLE activities ADD COLUMN like_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- 2. NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'book_finished',      -- Someone you follow finished a book
    'activity_liked',     -- Someone liked your activity
    'new_follower',       -- Someone followed you
    'challenge_joined',   -- Someone joined your challenge
    'challenge_completed',-- Someone completed your challenge
    'club_activity',      -- Activity in a club you're in
    'recommendation'      -- Someone recommended a book to you
  )),
  title TEXT NOT NULL,
  body TEXT,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  book_title TEXT,
  book_cover_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- 4. ENABLE RLS
-- =============================================

ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS POLICIES - ACTIVITY LIKES
-- =============================================

-- Anyone can see likes on public activities
CREATE POLICY "View activity likes" ON activity_likes
  FOR SELECT USING (true);

-- Users can like activities
CREATE POLICY "Like activities" ON activity_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike (remove their own likes)
CREATE POLICY "Unlike activities" ON activity_likes
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. RLS POLICIES - NOTIFICATIONS
-- =============================================

-- Users can only see their own notifications
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "Create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. FUNCTION TO UPDATE LIKE COUNT
-- =============================================

CREATE OR REPLACE FUNCTION update_activity_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE activities SET like_count = like_count + 1 WHERE id = NEW.activity_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE activities SET like_count = like_count - 1 WHERE id = OLD.activity_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like count updates
DROP TRIGGER IF EXISTS activity_like_count_trigger ON activity_likes;
CREATE TRIGGER activity_like_count_trigger
AFTER INSERT OR DELETE ON activity_likes
FOR EACH ROW EXECUTE FUNCTION update_activity_like_count();

-- =============================================
-- 8. FUNCTION TO CREATE NOTIFICATIONS ON BOOK COMPLETION
-- =============================================

CREATE OR REPLACE FUNCTION notify_followers_on_book_finish()
RETURNS TRIGGER AS $$
DECLARE
  follower_record RECORD;
  actor_name TEXT;
BEGIN
  -- Only trigger for 'finished_reading' activities
  IF NEW.activity_type = 'finished_reading' THEN
    -- Get the actor's display name
    SELECT COALESCE(display_name, username, 'Someone') INTO actor_name
    FROM profiles WHERE id = NEW.user_id;
    
    -- Create notification for each follower
    FOR follower_record IN 
      SELECT follower_id FROM follows WHERE following_id = NEW.user_id
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        actor_id,
        activity_id,
        book_title,
        book_cover_url
      ) VALUES (
        follower_record.follower_id,
        'book_finished',
        actor_name || ' finished a book',
        'finished reading "' || COALESCE(NEW.book_title, 'a book') || '"',
        NEW.user_id,
        NEW.id,
        NEW.book_title,
        NEW.book_cover_url
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for book finish notifications
DROP TRIGGER IF EXISTS notify_on_book_finish_trigger ON activities;
CREATE TRIGGER notify_on_book_finish_trigger
AFTER INSERT ON activities
FOR EACH ROW EXECUTE FUNCTION notify_followers_on_book_finish();

-- =============================================
-- 9. FUNCTION TO CREATE NOTIFICATION ON ACTIVITY LIKE
-- =============================================

CREATE OR REPLACE FUNCTION notify_on_activity_like()
RETURNS TRIGGER AS $$
DECLARE
  activity_owner_id UUID;
  liker_name TEXT;
  activity_book_title TEXT;
BEGIN
  -- Get the activity owner and book title
  SELECT user_id, book_title INTO activity_owner_id, activity_book_title
  FROM activities WHERE id = NEW.activity_id;
  
  -- Don't notify if user liked their own activity
  IF activity_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the liker's name
  SELECT COALESCE(display_name, username, 'Someone') INTO liker_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    actor_id,
    activity_id,
    book_title
  ) VALUES (
    activity_owner_id,
    'activity_liked',
    liker_name || ' liked your activity',
    CASE 
      WHEN activity_book_title IS NOT NULL THEN 'liked your update about "' || activity_book_title || '"'
      ELSE 'liked your recent activity'
    END,
    NEW.user_id,
    NEW.activity_id,
    activity_book_title
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like notifications
DROP TRIGGER IF EXISTS notify_on_like_trigger ON activity_likes;
CREATE TRIGGER notify_on_like_trigger
AFTER INSERT ON activity_likes
FOR EACH ROW EXECUTE FUNCTION notify_on_activity_like();

-- =============================================
-- 10. GRANT ACCESS
-- =============================================

GRANT ALL ON activity_likes TO authenticated;
GRANT ALL ON notifications TO authenticated;
