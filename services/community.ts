/**
 * Community API Service
 * 
 * Handles all community-related operations:
 * - User profiles
 * - Follows/Friends
 * - Book clubs
 * - Reviews
 * - Discussions
 * - Activity feed
 * - Recommendations
 */

import { supabase } from './supabase';

// =============================================
// TYPES
// =============================================

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  favorite_genres: string[];
  is_public: boolean;
  show_currently_reading: boolean;
  show_reading_stats: boolean;
  show_book_reviews: boolean;
  created_at: string;
  follower_count?: number;
  following_count?: number;
  followers_count?: number;
  book_count?: number;
  books_read?: number;
  is_following?: boolean;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  profile?: UserProfile;
}

export interface BookClub {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  current_book_isbn: string | null;
  current_book_title: string | null;
  current_book?: string | null; // Alias for current_book_title
  member_count: number;
  created_at: string;
  owner?: UserProfile;
  is_member?: boolean;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: UserProfile;
  profile?: UserProfile;
}

export interface BookReview {
  id: string;
  user_id: string;
  book_id: string | null;
  book_isbn: string | null;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
  rating: number;
  content: string | null; // Alias for review_text
  review_text: string | null;
  is_spoiler: boolean;
  likes_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile; // Alias for author
  author?: UserProfile;
  is_liked?: boolean;
}

export interface Discussion {
  id: string;
  title: string;
  content: string | null;
  author_id: string;
  book_id: string | null;
  book_isbn: string | null;
  book_title: string | null;
  club_id: string | null;
  is_pinned: boolean;
  reply_count: number;
  created_at: string;
  author?: UserProfile;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  content: string;
  parent_reply_id: string | null;
  created_at: string;
  author?: UserProfile;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover: string | null;
  book_cover_url: string | null;
  content: string | null;
  target_user_id: string | null;
  club_id: string | null;
  review_id: string | null;
  discussion_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: UserProfile;
  target_user?: UserProfile;
}

export interface Recommendation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  book_id: string | null;
  book_isbn: string | null;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: UserProfile;
}

export interface TrendingBook {
  book_key: string;
  book_title: string;
  book_cover_url: string | null;
  activity_count: number;
  unique_users: number;
}

// =============================================
// PROFILES API
// =============================================

export const profilesApi = {
  async getMyProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Get follower/following counts
    const [followers, following, books] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
      supabase.from('books').select('id', { count: 'exact' }).eq('user_id', userId)
    ]);

    // Check if current user is following
    let isFollowing = false;
    if (user && user.id !== userId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();
      isFollowing = !!followData;
    }

    return {
      ...data,
      follower_count: followers.count || 0,
      following_count: following.count || 0,
      book_count: books.count || 0,
      is_following: isFollowing
    };
  },

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) return null;
    return this.getProfile(data.id);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  },

  async searchProfiles(query: string, limit = 20): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_public', true)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching profiles:', error);
      return [];
    }

    return data || [];
  }
};

// =============================================
// FOLLOWS API
// =============================================

export const followsApi = {
  async follow(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId });

    if (error) {
      console.error('Error following user:', error);
      return false;
    }

    // Create activity
    await activitiesApi.create('followed_user', { target_user_id: userId });

    return true;
  },

  async unfollow(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }

    return true;
  },

  async getFollowers(userId: string, limit = 50): Promise<UserProfile[]> {
    try {
      // Get all follows where this user is being followed
      const { data: follows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
        .limit(limit);

      if (error) {
        console.error('Error fetching followers:', error);
        return [];
      }

      if (!follows || follows.length === 0) {
        console.log('[getFollowers] No followers found for user:', userId);
        return [];
      }

      // Get profiles for all followers
      const followerIds = follows.map(f => f.follower_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followerIds);

      if (profileError) {
        console.error('Error fetching follower profiles:', profileError);
      }

      return profiles || [];
    } catch (err) {
      console.error('Error in getFollowers:', err);
      return [];
    }
  },

  async getFollowing(userId: string, limit = 50): Promise<UserProfile[]> {
    try {
      // Get all follows where this user is following others
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .limit(limit);

      if (error) {
        console.error('Error fetching following:', error);
        return [];
      }

      if (!follows || follows.length === 0) {
        console.log('[getFollowing] No following found for user:', userId);
        return [];
      }

      // Get profiles for all following
      const followingIds = follows.map(f => f.following_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIds);

      if (profileError) {
        console.error('Error fetching following profiles:', profileError);
      }

      return profiles || [];
    } catch (err) {
      console.error('Error in getFollowing:', err);
      return [];
    }
  },

  async isFollowing(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    return !!data;
  },

  async getCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    return {
      followers: followers.count || 0,
      following: following.count || 0
    };
  }
};

// =============================================
// BOOK CLUBS API
// =============================================

export const bookClubsApi = {
  async create(club: Partial<BookClub>): Promise<BookClub | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('book_clubs')
      .insert({ ...club, owner_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating club:', error);
      throw error;
    }

    // Add owner as member
    await supabase.from('club_members').insert({
      club_id: data.id,
      user_id: user.id,
      role: 'owner'
    });

    return data;
  },

  async getClub(clubId: string): Promise<BookClub | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('book_clubs')
      .select('*, profiles!book_clubs_owner_id_fkey(*)')
      .eq('id', clubId)
      .single();

    if (error) {
      console.error('Error fetching club:', error);
      return null;
    }

    // Check if current user is a member
    let isMember = false;
    if (user) {
      const { data: memberData } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .single();
      isMember = !!memberData;
    }

    return {
      ...data,
      owner: data.profiles,
      is_member: isMember
    };
  },

  async getMyClubs(): Promise<BookClub[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('club_members')
      .select('club_id, book_clubs(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching my clubs:', error);
      return [];
    }

    return data?.map(m => m.book_clubs as any as BookClub) || [];
  },

  async getPublicClubs(limit = 20): Promise<BookClub[]> {
    const { data, error } = await supabase
      .from('book_clubs')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching public clubs:', error);
      return [];
    }

    return data || [];
  },

  async join(clubId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: clubId, user_id: user.id, role: 'member' });

    if (error) {
      console.error('Error joining club:', error);
      return false;
    }

    // Update member count
    await supabase.rpc('increment_club_members', { club_id: clubId });

    // Create activity
    await activitiesApi.create('joined_club', { club_id: clubId });

    return true;
  },

  async leave(clubId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error leaving club:', error);
      return false;
    }

    // Update member count
    await supabase.rpc('decrement_club_members', { club_id: clubId });

    return true;
  },

  async getMembers(clubId: string): Promise<ClubMember[]> {
    try {
      // Get club members with minimal data first
      const { data: members, error } = await supabase
        .from('club_members')
        .select('id, club_id, user_id, role, joined_at')
        .eq('club_id', clubId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching club members:', error);
        return [];
      }

      if (!members || members.length === 0) {
        console.log('[getMembers] No members found for club:', clubId);
        return [];
      }

      // Get profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', userIds);

      if (profileError) {
        console.error('Error fetching member profiles:', profileError);
      }

      // Map profiles to members
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return members.map(m => ({
        ...m,
        user: profileMap.get(m.user_id) || { id: m.user_id },
        profile: profileMap.get(m.user_id) || { id: m.user_id }
      }));
    } catch (err) {
      console.error('Error in getMembers:', err);
      return [];
    }
  },

  // Alias for create
  async createClub(club: Partial<BookClub>): Promise<BookClub | null> {
    return this.create(club);
  },

  // Alias for join
  async joinClub(clubId: string): Promise<boolean> {
    return this.join(clubId);
  },

  // Alias for leave
  async leaveClub(clubId: string): Promise<boolean> {
    return this.leave(clubId);
  },

  async isMember(clubId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .single();

    return !!data;
  },

  async deleteClub(clubId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is the creator (admin) of the club
    const { data: membership } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      console.error('Only club creator can delete the club');
      return false;
    }

    // Delete club (this will cascade to members and discussions)
    const { error } = await supabase
      .from('book_clubs')
      .delete()
      .eq('id', clubId);

    if (error) {
      console.error('Error deleting club:', error);
      return false;
    }

    return true;
  }
};

// =============================================
// REVIEWS API
// =============================================

export const reviewsApi = {
  async create(review: Partial<BookReview>): Promise<BookReview | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('book_reviews')
      .insert({ ...review, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }

    // Create activity
    await activitiesApi.create('review_posted', {
      review_id: data.id,
      book_title: review.book_title,
      book_cover_url: review.book_cover_url
    });

    return data;
  },

  async getReviewsForBook(bookIsbn: string, limit = 20): Promise<BookReview[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('book_reviews')
      .select('*, profiles(*)')
      .eq('book_isbn', bookIsbn)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Check which reviews current user has liked
    const reviews = data?.map(r => ({ ...r, author: r.profiles })) || [];
    
    if (user && reviews.length > 0) {
      const { data: likes } = await supabase
        .from('review_likes')
        .select('review_id')
        .eq('user_id', user.id)
        .in('review_id', reviews.map(r => r.id));

      const likedIds = new Set(likes?.map(l => l.review_id) || []);
      reviews.forEach(r => { r.is_liked = likedIds.has(r.id); });
    }

    return reviews;
  },

  async getReviewsByBookTitle(bookTitle: string, limit = 20): Promise<BookReview[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('book_reviews')
      .select('*, profiles(*)')
      .ilike('book_title', bookTitle)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reviews by title:', error);
      return [];
    }

    const reviews = data?.map(r => ({ 
      ...r, 
      user: r.profiles,
      author: r.profiles 
    })) || [];
    
    if (user && reviews.length > 0) {
      const { data: likes } = await supabase
        .from('review_likes')
        .select('review_id')
        .eq('user_id', user.id)
        .in('review_id', reviews.map(r => r.id));

      const likedIds = new Set(likes?.map(l => l.review_id) || []);
      reviews.forEach(r => { r.is_liked = likedIds.has(r.id); });
    }

    return reviews;
  },

  async getReviewsByUser(userId: string, limit = 20): Promise<BookReview[]> {
    const { data, error } = await supabase
      .from('book_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user reviews:', error);
      return [];
    }

    return data || [];
  },

  async getRecentReviews(limit = 20): Promise<BookReview[]> {
    const { data, error } = await supabase
      .from('book_reviews')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent reviews:', error);
      return [];
    }

    return data?.map(r => ({ 
      ...r, 
      author: r.profiles,
      user: r.profiles,
      content: r.review_text,
      likes_count: r.like_count
    })) || [];
  },

  // Alias for getRecentReviews
  async getLatestReviews(limit = 20): Promise<BookReview[]> {
    return this.getRecentReviews(limit);
  },

  async likeReview(reviewId: string): Promise<boolean> {
    return this.like(reviewId);
  },

  async unlikeReview(reviewId: string): Promise<boolean> {
    return this.unlike(reviewId);
  },

  async like(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('review_likes')
      .insert({ review_id: reviewId, user_id: user.id });

    if (error) {
      console.error('Error liking review:', error);
      return false;
    }

    return true;
  },

  async unlike(reviewId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking review:', error);
      return false;
    }

    return true;
  }
};

// =============================================
// DISCUSSIONS API
// =============================================

export const discussionsApi = {
  async create(discussion: Partial<Discussion>): Promise<Discussion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('discussions')
      .insert({ ...discussion, author_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating discussion:', error);
      throw error;
    }

    // Create activity
    await activitiesApi.create('discussion_created', {
      discussion_id: data.id,
      book_title: discussion.book_title
    });

    return data;
  },

  async getDiscussion(discussionId: string): Promise<Discussion | null> {
    try {
      const { data: discussion, error } = await supabase
        .from('discussions')
        .select('id, title, content, author_id, book_id, book_isbn, book_title, club_id, is_pinned, reply_count, created_at, updated_at')
        .eq('id', discussionId)
        .single();

      if (error) {
        console.error('Error fetching discussion:', error);
        return null;
      }

      // Get author profile
      const { data: author } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .eq('id', discussion.author_id)
        .single();

      return { ...discussion, author: author || { id: discussion.author_id } };
    } catch (err) {
      console.error('Error in getDiscussion:', err);
      return null;
    }
  },

  async deleteDiscussion(discussionId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Not authenticated');
        return false;
      }

      // Check if user is the author
      const { data: discussion, error: fetchError } = await supabase
        .from('discussions')
        .select('author_id')
        .eq('id', discussionId)
        .single();

      if (fetchError || !discussion) {
        console.error('Error fetching discussion:', fetchError);
        return false;
      }

      if (discussion.author_id !== user.id) {
        console.error('Not authorized to delete this discussion');
        return false;
      }

      // Delete all replies first (due to FK constraint)
      const { error: deleteRepliesError } = await supabase
        .from('discussion_replies')
        .delete()
        .eq('discussion_id', discussionId);

      if (deleteRepliesError) {
        console.error('Error deleting replies:', deleteRepliesError);
        return false;
      }

      // Delete discussion
      const { error: deleteError } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussionId);

      if (deleteError) {
        console.error('Error deleting discussion:', deleteError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteDiscussion:', err);
      return false;
    }
  },

  async getDiscussionsForBook(bookIsbn: string, limit = 20): Promise<Discussion[]> {
    try {
      // Get discussions first
      const { data: discussions, error } = await supabase
        .from('discussions')
        .select('id, title, content, author_id, book_id, book_isbn, book_title, club_id, is_pinned, reply_count, created_at, updated_at')
        .eq('book_isbn', bookIsbn)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching book discussions:', error);
        return [];
      }

      if (!discussions || discussions.length === 0) {
        return [];
      }

      // Get authors for all discussions
      const authorIds = Array.from(new Set(discussions.map(d => d.author_id)));
      const { data: authors, error: authorError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', authorIds);

      if (authorError) {
        console.error('Error fetching discussion authors:', authorError);
      }

      // Map authors to discussions
      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);

      return discussions.map(d => ({
        ...d,
        author: authorMap.get(d.author_id) || { id: d.author_id }
      }));
    } catch (err) {
      console.error('Error in getDiscussionsForBook:', err);
      return [];
    }
  },

  async getDiscussionsForClub(clubId: string, limit = 20): Promise<Discussion[]> {
    try {
      // Get discussions first
      const { data: discussions, error } = await supabase
        .from('discussions')
        .select('id, title, content, author_id, book_id, book_isbn, book_title, club_id, is_pinned, reply_count, created_at, updated_at')
        .eq('club_id', clubId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching club discussions:', error);
        return [];
      }

      if (!discussions || discussions.length === 0) {
        console.log('[getDiscussionsForClub] No discussions found for club:', clubId);
        return [];
      }

      // Get authors for all discussions
      const authorIds = Array.from(new Set(discussions.map(d => d.author_id)));
      const { data: authors, error: authorError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', authorIds);

      if (authorError) {
        console.error('Error fetching discussion authors:', authorError);
      }

      // Map authors to discussions
      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);

      return discussions.map(d => ({
        ...d,
        author: authorMap.get(d.author_id) || { id: d.author_id }
      }));
    } catch (err) {
      console.error('Error in getDiscussionsForClub:', err);
      return [];
    }
  },

  async addReply(discussionId: string, content: string, parentReplyId?: string): Promise<DiscussionReply | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('discussion_replies')
      .insert({
        discussion_id: discussionId,
        author_id: user.id,
        content,
        parent_reply_id: parentReplyId
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reply:', error);
      throw error;
    }

    // Fetch author profile immediately
    const { data: author } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio')
      .eq('id', user.id)
      .single();

    return {
      ...data,
      author: author || undefined
    };
  },

  async getReplies(discussionId: string): Promise<DiscussionReply[]> {
    try {
      const { data: replies, error } = await supabase
        .from('discussion_replies')
        .select('id, discussion_id, author_id, content, parent_reply_id, created_at, updated_at')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching replies:', error);
        return [];
      }

      if (!replies || replies.length === 0) {
        return [];
      }

      // Get authors for all replies
      const authorIds = Array.from(new Set(replies.map(r => r.author_id)));
      const { data: authors, error: authorError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', authorIds);

      if (authorError) {
        console.error('Error fetching reply authors:', authorError);
      }

      // Map authors to replies
      const authorMap = new Map(authors?.map(a => [a.id, a]) || []);

      return replies.map(r => ({
        ...r,
        author: authorMap.get(r.author_id) || { id: r.author_id }
      }));
    } catch (err) {
      console.error('Error in getReplies:', err);
      return [];
    }
  },

  // Alias for getDiscussionsForClub
  async getByClub(clubId: string, limit = 20): Promise<Discussion[]> {
    return this.getDiscussionsForClub(clubId, limit);
  }
};

// =============================================
// ACTIVITIES API
// =============================================

export const activitiesApi = {
  async create(activityType: string, data: Partial<Activity>): Promise<Activity | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({ ...data, user_id: user.id, activity_type: activityType })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }

    return activity;
  },

  async getFeed(limit = 50): Promise<Activity[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get IDs of users I follow
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.following_id) || [];
    followingIds.push(user.id); // Include my own activities

    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles(*)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching feed:', error);
      return [];
    }

    return data?.map(a => ({ ...a, user: a.profiles })) || [];
  },

  async getPublicFeed(limit = 50): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*, profiles!inner(*)')
      .eq('profiles.is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching public feed:', error);
      return [];
    }

    return data?.map(a => ({ ...a, user: a.profiles })) || [];
  },

  async getUserActivities(userId: string, limit = 20): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }

    return data || [];
  }
};

// =============================================
// RECOMMENDATIONS API
// =============================================

export const recommendationsApi = {
  async send(toUserId: string, book: Partial<Recommendation>): Promise<Recommendation | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('recommendations')
      .insert({ ...book, from_user_id: user.id, to_user_id: toUserId })
      .select()
      .single();

    if (error) {
      console.error('Error sending recommendation:', error);
      throw error;
    }

    // Create activity
    await activitiesApi.create('book_recommended', {
      target_user_id: toUserId,
      book_title: book.book_title,
      book_cover_url: book.book_cover_url
    });

    return data;
  },

  async getReceived(limit = 20): Promise<Recommendation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recommendations')
      .select('*, profiles!recommendations_from_user_id_fkey(*)')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }

    return data?.map(r => ({ ...r, from_user: r.profiles })) || [];
  },

  async markAsRead(recommendationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('recommendations')
      .update({ is_read: true })
      .eq('id', recommendationId);

    if (error) {
      console.error('Error marking recommendation as read:', error);
      return false;
    }

    return true;
  },

  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('recommendations')
      .select('id', { count: 'exact' })
      .eq('to_user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread recommendations:', error);
      return 0;
    }

    return count || 0;
  }
};

// =============================================
// DISCOVERY API
// =============================================

export const discoveryApi = {
  async getTrendingBooks(limit = 10): Promise<TrendingBook[]> {
    const { data, error } = await supabase
      .from('trending_books')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching trending books:', error);
      return [];
    }

    // Map to expected format
    return (data || []).map(book => ({
      ...book,
      title: book.book_title,
      author: book.book_author,
      cover_url: book.book_cover_url,
      review_count: book.activity_count,
      average_rating: 0 // Would need to calculate this
    }));
  },

  async getCurrentlyReading(limit = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('currently_reading')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching currently reading:', error);
      return [];
    }

    return data || [];
  },

  async searchBooks(query: string): Promise<any[]> {
    // Use Google Books API for discovery
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`
      );
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error searching books:', error);
      return [];
    }
  }
};

// =============================================
// EXPORT ALL
// =============================================

export const communityApi = {
  profiles: profilesApi,
  follows: followsApi,
  clubs: bookClubsApi,
  reviews: reviewsApi,
  discussions: discussionsApi,
  activities: activitiesApi,
  recommendations: recommendationsApi,
  discovery: discoveryApi
};
