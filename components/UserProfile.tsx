import { useState, useEffect, memo } from 'react';
import { 
  ArrowLeft, 
  Edit2, 
  Users, 
  BookOpen, 
  Clock, 
  Star,
  UserPlus,
  Lock,
  Globe,
  Save,
  X,
  Check,
  MessageCircle
} from 'lucide-react';
import { communityApi, UserProfile, Activity } from '../services/community';
import { useToastActions } from './Toast';

interface UserProfileViewProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

export const UserProfileView = memo<UserProfileViewProps>(({ 
  profile: initialProfile, 
  isOwnProfile, 
  onBack,
  onViewProfile 
}) => {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(profile.followers_count || 0);
  const [followingCount, setFollowingCount] = useState(profile.following_count || 0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'books' | 'followers' | 'following'>('activity');
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);

  const toast = useToastActions();

  useEffect(() => {
    if (!isOwnProfile) {
      checkFollowStatus();
    }
    loadUserData();
  }, [profile.id]);

  const checkFollowStatus = async () => {
    const following = await communityApi.follows.isFollowing(profile.id);
    setIsFollowing(following);
  };

  const loadUserData = async () => {
    try {
      // Load activities
      const userActivities = await communityApi.activities.getUserActivities(profile.id);
      setActivities(userActivities);

      // Load followers/following counts
      const counts = await communityApi.follows.getCounts(profile.id);
      setFollowersCount(counts.followers);
      setFollowingCount(counts.following);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleFollow = async () => {
    if (isFollowing) {
      await communityApi.follows.unfollow(profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      toast.success(`Unfollowed ${profile.display_name}`);
    } else {
      await communityApi.follows.follow(profile.id);
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success(`Following ${profile.display_name}`);
    }
  };

  const loadFollowers = async () => {
    const data = await communityApi.follows.getFollowers(profile.id);
    setFollowers(data);
  };

  const loadFollowing = async () => {
    const data = await communityApi.follows.getFollowing(profile.id);
    setFollowing(data);
  };

  useEffect(() => {
    if (activeTab === 'followers') {
      loadFollowers();
    } else if (activeTab === 'following') {
      loadFollowing();
    }
  }, [activeTab]);

  const stats = [
    { label: 'Books', value: profile.books_read || 0, icon: BookOpen },
    { label: 'Followers', value: followersCount, icon: Users, onClick: () => setActiveTab('followers') },
    { label: 'Following', value: followingCount, icon: Users, onClick: () => setActiveTab('following') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={onBack}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-sm font-medium ${
                  isFollowing
                    ? 'bg-white text-violet-600 hover:bg-slate-100'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name || 'Profile'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-4xl font-bold">
                    {profile.display_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
              )}

              {/* Privacy Badge */}
              <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow ${
                profile.is_public ? 'bg-green-500' : 'bg-slate-500'
              }`}>
                {profile.is_public ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{profile.display_name}</h1>
              {profile.username && (
                <p className="text-white/70 truncate">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="mt-1 text-sm text-white/80 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            {stats.map((stat) => (
              <button
                key={stat.label}
                onClick={stat.onClick}
                className="flex flex-col items-center hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                disabled={!stat.onClick}
              >
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-white/70">{stat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-4">
            {(['activity', 'followers', 'following'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'activity' && (
          <ActivityList activities={activities} />
        )}

        {activeTab === 'followers' && (
          <UserList users={followers} onViewProfile={onViewProfile} />
        )}

        {activeTab === 'following' && (
          <UserList users={following} onViewProfile={onViewProfile} />
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onSave={(updated) => {
            setProfile(updated);
            setIsEditing(false);
            toast.success('Profile updated!');
          }}
        />
      )}
    </div>
  );
});

UserProfileView.displayName = 'UserProfileView';

// =============================================
// ACTIVITY LIST
// =============================================

interface ActivityListProps {
  activities: Activity[];
}

function ActivityList({ activities }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500">No recent activity</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'started_book': return BookOpen;
      case 'finished_book': return Check;
      case 'review': return Star;
      case 'joined_club': return Users;
      case 'discussion': return MessageCircle;
      default: return Clock;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'started_book':
        return `Started reading "${activity.book_title}"`;
      case 'finished_book':
        return `Finished "${activity.book_title}"`;
      case 'review':
        return `Reviewed "${activity.book_title}"`;
      case 'joined_club':
        return `Joined ${activity.metadata?.club_name || 'a book club'}`;
      case 'discussion':
        return `Started a discussion about "${activity.book_title}"`;
      default:
        return activity.activity_type;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.activity_type);
        return (
          <div 
            key={activity.id}
            className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 dark:text-white">
                {getActivityText(activity)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(activity.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================
// USER LIST
// =============================================

interface UserListProps {
  users: UserProfile[];
  onViewProfile: (userId: string) => void;
}

function UserList({ users, onViewProfile }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500">No users to show</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onViewProfile(user.id)}
          className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt=""
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center text-white font-medium">
              {user.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {user.display_name}
            </p>
            {user.username && (
              <p className="text-sm text-slate-500 truncate">@{user.username}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================
// EDIT PROFILE MODAL
// =============================================

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [isPublic, setIsPublic] = useState(profile.is_public ?? true);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(profile.favorite_genres || []);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToastActions();

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await communityApi.profiles.updateProfile({
        display_name: displayName.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        is_public: isPublic,
        favorite_genres: favoriteGenres,
      });

      if (updated) {
        onSave(updated);
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help',
    'Horror', 'Poetry', 'Drama', 'Adventure', 'Philosophy'
  ];

  const toggleGenre = (genre: string) => {
    setFavoriteGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <h2 className="font-semibold text-slate-900 dark:text-white">Edit Profile</h2>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 text-violet-600 dark:text-violet-400 font-medium disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Avatar URL
            </label>
            <div className="flex gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                  {displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={30}
                placeholder="username"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Tell others about yourself..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">{bio.length}/200</p>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {isPublic ? 'Public Profile' : 'Private Profile'}
                </p>
                <p className="text-xs text-slate-500">
                  {isPublic ? 'Anyone can see your activity' : 'Only followers can see your activity'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-7 rounded-full transition-colors ${
                isPublic ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Favorite Genres */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Favorite Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    favoriteGenres.includes(genre)
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
