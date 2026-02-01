-- Challenges Feature SQL Migration
-- Run this in your Supabase SQL Editor

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('books_count', 'pages_count', 'genre', 'author', 'custom')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  target_genre TEXT,
  target_author TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create challenge_progress table
CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(challenge_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_public ON challenges(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(user_id);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

-- Challenges policies
-- Anyone can view public challenges
CREATE POLICY "View public challenges" ON challenges
  FOR SELECT USING (is_public = true);

-- Creators can view their own challenges
CREATE POLICY "Creators view own challenges" ON challenges
  FOR SELECT USING (auth.uid() = creator_id);

-- Authenticated users can create challenges
CREATE POLICY "Create challenges" ON challenges
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own challenges
CREATE POLICY "Update own challenges" ON challenges
  FOR UPDATE USING (auth.uid() = creator_id);

-- Creators can delete their own challenges
CREATE POLICY "Delete own challenges" ON challenges
  FOR DELETE USING (auth.uid() = creator_id);

-- Challenge Progress policies
-- Users can view progress on public challenges or their own progress
CREATE POLICY "View challenge progress" ON challenge_progress
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM challenges WHERE id = challenge_id AND is_public = true)
  );

-- Users can join challenges (insert their progress)
CREATE POLICY "Join challenges" ON challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Update own progress" ON challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can leave challenges (delete their progress)
CREATE POLICY "Leave challenges" ON challenge_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Grant access
GRANT ALL ON challenges TO authenticated;
GRANT ALL ON challenge_progress TO authenticated;
