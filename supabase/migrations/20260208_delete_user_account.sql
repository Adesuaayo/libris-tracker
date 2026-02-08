-- Server-side function to delete a user's account and all associated data.
-- Runs as SECURITY DEFINER so it has permission to delete from auth.users.
-- Called via supabase.rpc('delete_user_account') from the client.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the calling user's ID from the JWT
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data from all tables (order matters for FK constraints)
  -- Challenge-related
  DELETE FROM challenge_cheers WHERE user_id = current_user_id;
  DELETE FROM challenge_comments WHERE user_id = current_user_id;
  DELETE FROM challenge_progress WHERE user_id = current_user_id;
  DELETE FROM challenges WHERE creator_id = current_user_id;

  -- Community-related
  DELETE FROM activity_likes WHERE user_id = current_user_id;
  DELETE FROM review_likes WHERE user_id = current_user_id;
  DELETE FROM discussion_replies WHERE author_id = current_user_id;
  DELETE FROM discussions WHERE author_id = current_user_id;
  DELETE FROM book_reviews WHERE user_id = current_user_id;
  DELETE FROM club_members WHERE user_id = current_user_id;

  -- Social
  DELETE FROM follows WHERE follower_id = current_user_id OR following_id = current_user_id;

  -- Books
  DELETE FROM books WHERE user_id = current_user_id;

  -- Profile
  DELETE FROM profiles WHERE id = current_user_id;

  -- Finally, delete the auth user
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
