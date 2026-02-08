import { useState, useEffect, memo } from 'react';
import { 
  Clock, 
  BookOpen, 
  Star, 
  Users, 
  MessageCircle,
  Check,
  TrendingUp,
  RefreshCw,
  Heart
} from 'lucide-react';
import { communityApi, Activity } from '../services/community';

interface ActivityFeedProps {
  onViewProfile: (userId: string) => void;
}

export const ActivityFeed = memo<ActivityFeedProps>(({ onViewProfile }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [likedActivities, setLikedActivities] = useState<Record<string, boolean>>({});
  const [likingActivity, setLikingActivity] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [filter]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const data = await communityApi.activities.getFeed(50);
      setActivities(data);
      
      // Check which activities the user has liked
      if (data.length > 0) {
        const likedMap = await communityApi.activities.checkIfLiked(data.map(a => a.id));
        setLikedActivities(likedMap);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivities();
    setIsRefreshing(false);
  };

  const handleToggleLike = async (activityId: string) => {
    if (likingActivity) return; // Prevent double-clicking
    
    setLikingActivity(activityId);
    try {
      const result = await communityApi.activities.toggleLike(activityId);
      if (result) {
        setLikedActivities(prev => ({ ...prev, [activityId]: result.liked }));
        setActivities(prev => prev.map(a => 
          a.id === activityId ? { ...a, like_count: result.newCount } : a
        ));
      }
    } finally {
      setLikingActivity(null);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'started_book': return BookOpen;
      case 'finished_book': return Check;
      case 'review': return Star;
      case 'joined_club': return Users;
      case 'discussion': return MessageCircle;
      case 'achievement': return TrendingUp;
      default: return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'started_book': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'finished_book': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'review': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'joined_club': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'discussion': return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
      case 'achievement': return 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400';
      default: return 'bg-surface-base text-text-secondary';
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.user?.display_name || 'Someone';
    switch (activity.activity_type) {
      case 'started_book':
        return <><strong>{userName}</strong> started reading <strong>"{activity.book_title}"</strong></>;
      case 'finished_book':
        return <><strong>{userName}</strong> finished <strong>"{activity.book_title}"</strong></>;
      case 'review':
        return <><strong>{userName}</strong> reviewed <strong>"{activity.book_title}"</strong></>;
      case 'joined_club':
        return <><strong>{userName}</strong> joined <strong>{activity.metadata?.club_name}</strong></>;
      case 'discussion':
        return <><strong>{userName}</strong> started a discussion about <strong>"{activity.book_title}"</strong></>;
      case 'achievement':
        return <><strong>{userName}</strong> earned the <strong>{activity.metadata?.achievement_name}</strong> badge</>;
      default:
        return <><strong>{userName}</strong> {activity.activity_type}</>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-violet-500 text-white'
                : 'bg-surface-base text-text-secondary'
            }`}
          >
            Everyone
          </button>
          <button
            onClick={() => setFilter('following')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'following'
                ? 'bg-violet-500 text-white'
                : 'bg-surface-base text-text-secondary'
            }`}
          >
            Following
          </button>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full hover:bg-surface-base transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-text-muted ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity Cards */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No activity yet</h3>
          <p className="text-sm text-text-muted">
            {filter === 'following' 
              ? 'Follow other readers to see their activity here'
              : 'Be the first to share your reading journey!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);
            
            return (
              <div 
                key={activity.id}
                className="bg-surface-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  {/* User Avatar */}
                  <button 
                    onClick={() => activity.user?.id && onViewProfile(activity.user.id)}
                    className="flex-shrink-0"
                  >
                    {activity.user?.avatar_url ? (
                      <img 
                        src={activity.user.avatar_url} 
                        alt=""
                        className="w-10 h-10 rounded-full object-cover hover:ring-2 ring-violet-500 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-medium hover:ring-2 ring-violet-300 transition-all">
                        {activity.user?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Activity Text */}
                    <p className="text-sm text-text-secondary">
                      {getActivityText(activity)}
                    </p>

                    {/* Book Author if applicable */}
                    {activity.book_author && (
                      <p className="text-xs text-text-muted mt-0.5">
                        by {activity.book_author}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-text-muted mt-1">
                      {formatTime(activity.created_at)}
                    </p>

                    {/* Review Content Preview */}
                    {activity.activity_type === 'review' && activity.content && (
                      <p className="mt-2 text-sm text-text-secondary line-clamp-2 italic">
                        "{activity.content}"
                      </p>
                    )}

                    {/* Rating Stars */}
                    {activity.activity_type === 'review' && activity.metadata?.rating && (
                      <div className="flex gap-0.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= activity.metadata!.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Like Button */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleToggleLike(activity.id)}
                        disabled={likingActivity === activity.id}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${
                          likedActivities[activity.id]
                            ? 'text-red-500'
                            : 'text-text-muted hover:text-red-500'
                        }`}
                      >
                        <Heart 
                          className={`w-4 h-4 ${likedActivities[activity.id] ? 'fill-current' : ''}`} 
                        />
                        {(activity.like_count || 0) > 0 && (
                          <span className="text-xs font-medium">{activity.like_count}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Activity Type Badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Book Cover if available */}
                {activity.book_cover && (
                  <div className="mt-3 ml-13">
                    <img 
                      src={activity.book_cover} 
                      alt={activity.book_title || ''}
                      className="h-24 rounded-lg shadow object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';
