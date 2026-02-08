-- Challenge Comments table
CREATE TABLE IF NOT EXISTS challenge_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenge Cheers (emoji reactions) table
CREATE TABLE IF NOT EXISTS challenge_cheers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- One emoji reaction per user per challenge
  UNIQUE(challenge_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_comments_challenge_id ON challenge_comments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_comments_created_at ON challenge_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_challenge_cheers_challenge_id ON challenge_cheers(challenge_id);

-- Foreign key references to profiles for JOINs
-- Drop first in case a prior run left stale constraints
ALTER TABLE challenge_comments DROP CONSTRAINT IF EXISTS challenge_comments_user_id_fkey;
ALTER TABLE challenge_comments
  ADD CONSTRAINT challenge_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE challenge_cheers DROP CONSTRAINT IF EXISTS challenge_cheers_user_id_fkey;
ALTER TABLE challenge_cheers
  ADD CONSTRAINT challenge_cheers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- RLS Policies
ALTER TABLE challenge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_cheers ENABLE ROW LEVEL SECURITY;

-- Comments: anyone authenticated can read, users can insert/delete their own
CREATE POLICY "Anyone can read challenge comments"
  ON challenge_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON challenge_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON challenge_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Cheers: anyone authenticated can read, users can insert/delete their own
CREATE POLICY "Anyone can read challenge cheers"
  ON challenge_cheers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add cheers"
  ON challenge_cheers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own cheers"
  ON challenge_cheers FOR DELETE
  USING (auth.uid() = user_id);
