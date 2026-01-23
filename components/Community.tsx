import { useState, useEffect, memo } from 'react';
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  BookOpen, 
  Bell,
  Globe
} from 'lucide-react';
import { communityApi, UserProfile } from '../services/community';
import { UserProfileView } from './UserProfile';
import { ActivityFeed } from './ActivityFeed';
import { DiscoverBooks } from './DiscoverBooks';
import { BookClubsList } from './BookClubs';
import { useToastActions } from './Toast';

type CommunityTab = 'feed' | 'discover' | 'clubs' | 'notifications';

interface CommunityProps {
  currentUserId: string;
}

export const Community = memo<CommunityProps>(({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useToastActions(); // Available for child components

  useEffect(() => {
    loadMyProfile();
    loadUnreadCount();
  }, []);

  const loadMyProfile = async () => {
    try {
      const profile = await communityApi.profiles.getMyProfile();
      setMyProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUnreadCount = async () => {
    const count = await communityApi.recommendations.getUnreadCount();
    setUnreadCount(count);
  };

  const handleViewProfile = async (userId: string) => {
    const profile = await communityApi.profiles.getProfile(userId);
    if (profile) {
      setViewingProfile(profile);
    }
  };

  const tabs = [
    { id: 'feed' as CommunityTab, label: 'Feed', icon: Users },
    { id: 'discover' as CommunityTab, label: 'Discover', icon: TrendingUp },
    { id: 'clubs' as CommunityTab, label: 'Clubs', icon: MessageCircle },
    { id: 'notifications' as CommunityTab, label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  // Show profile view if viewing someone's profile
  if (viewingProfile) {
    return (
      <UserProfileView 
        profile={viewingProfile}
        isOwnProfile={viewingProfile.id === currentUserId}
        onBack={() => setViewingProfile(null)}
        onViewProfile={handleViewProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-violet-500" />
              Community
            </h1>
            
            <div className="flex items-center gap-2">
              {/* My Profile Button */}
              <button
                onClick={() => myProfile && setViewingProfile(myProfile)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {myProfile?.avatar_url ? (
                  <img 
                    src={myProfile.avatar_url} 
                    alt="" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-medium">
                    {myProfile?.display_name?.[0] || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                  My Profile
                </span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'feed' && (
          <ActivityFeed 
            onViewProfile={handleViewProfile}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverBooks 
            onViewProfile={handleViewProfile}
          />
        )}

        {activeTab === 'clubs' && (
          <BookClubsList 
            onViewProfile={handleViewProfile}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView 
            onViewProfile={handleViewProfile}
            onRefreshCount={loadUnreadCount}
          />
        )}
      </div>
    </div>
  );
});

// =============================================
// NOTIFICATIONS VIEW
// =============================================

interface NotificationsViewProps {
  onViewProfile: (userId: string) => void;
  onRefreshCount: () => void;
}

function NotificationsView({ onViewProfile, onRefreshCount }: NotificationsViewProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const data = await communityApi.recommendations.getReceived();
      setRecommendations(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await communityApi.recommendations.markAsRead(id);
    setRecommendations(prev => prev.map(r => 
      r.id === id ? { ...r, is_read: true } : r
    ));
    onRefreshCount();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No notifications yet</h3>
        <p className="text-sm text-slate-500">Book recommendations from friends will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Book Recommendations</h2>
      
      {recommendations.map((rec) => (
        <div 
          key={rec.id}
          className={`bg-white dark:bg-slate-800 rounded-xl p-4 border transition-colors ${
            rec.is_read 
              ? 'border-slate-200 dark:border-slate-700' 
              : 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20'
          }`}
        >
          <div className="flex gap-4">
            {/* Book Cover */}
            {rec.book_cover_url ? (
              <img 
                src={rec.book_cover_url} 
                alt={rec.book_title}
                className="w-16 h-24 object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-16 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {/* From User */}
              <button 
                onClick={() => onViewProfile(rec.from_user_id)}
                className="flex items-center gap-2 mb-2 hover:opacity-80"
              >
                {rec.from_user?.avatar_url ? (
                  <img 
                    src={rec.from_user.avatar_url} 
                    alt="" 
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs">
                    {rec.from_user?.display_name?.[0] || '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {rec.from_user?.display_name || 'Someone'}
                </span>
                <span className="text-xs text-slate-500">recommended</span>
              </button>

              {/* Book Info */}
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {rec.book_title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {rec.book_author}
              </p>

              {/* Message */}
              {rec.message && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">
                  "{rec.message}"
                </p>
              )}

              {/* Actions */}
              {!rec.is_read && (
                <button
                  onClick={() => handleMarkAsRead(rec.id)}
                  className="mt-3 text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

Community.displayName = 'Community';
