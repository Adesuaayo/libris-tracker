import { useState, useEffect, memo } from 'react';
import { 
  Bell, 
  BookOpen, 
  Heart, 
  UserPlus, 
  Trophy,
  Users,
  MessageCircle,
  Trash2,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { communityApi, Notification } from '../services/community';
import { useToastActions } from './Toast';
import { useSwipeBack } from './useSwipeBack';

interface NotificationsProps {
  onBack?: () => void;
  onViewProfile?: (userId: string) => void;
}

export const Notifications = memo<NotificationsProps>(({ onBack, onViewProfile }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedActivities, setLikedActivities] = useState<Record<string, boolean>>({});
  const [likingActivity, setLikingActivity] = useState<string | null>(null);
  const toast = useToastActions();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await communityApi.notifications.getNotifications();
      setNotifications(data);
      
      // Check which activities are already liked
      const activityIds = data
        .filter(n => n.activity_id)
        .map(n => n.activity_id!);
      
      if (activityIds.length > 0) {
        const likedMap = await communityApi.activities.checkIfLiked(activityIds);
        setLikedActivities(likedMap);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (activityId: string) => {
    if (likingActivity) return;
    
    setLikingActivity(activityId);
    try {
      const isCurrentlyLiked = likedActivities[activityId] || false;
      const success = await communityApi.activities.toggleLike(activityId);
      
      if (success) {
        setLikedActivities(prev => ({
          ...prev,
          [activityId]: !isCurrentlyLiked
        }));
        toast.success(isCurrentlyLiked ? 'Removed like' : 'Liked!');
      }
    } finally {
      setLikingActivity(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const success = await communityApi.notifications.markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await communityApi.notifications.markAllAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    const success = await communityApi.notifications.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'book_finished': return BookOpen;
      case 'activity_liked': return Heart;
      case 'new_follower': return UserPlus;
      case 'challenge_joined':
      case 'challenge_completed': return Trophy;
      case 'club_activity': return Users;
      case 'recommendation': return MessageCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'book_finished': return 'bg-green-500/20 text-green-500';
      case 'activity_liked': return 'bg-red-500/20 text-red-500';
      case 'new_follower': return 'bg-blue-500/20 text-blue-500';
      case 'challenge_joined':
      case 'challenge_completed': return 'bg-amber-500/20 text-amber-500';
      case 'club_activity': return 'bg-purple-500/20 text-purple-500';
      case 'recommendation': return 'bg-accent/20 text-accent';
      default: return 'bg-surface-base text-text-muted';
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const swipeBack = useSwipeBack({ 
    onBack: onBack || (() => {}),
    enabled: !!onBack 
  });

  return (
    <div 
      className="min-h-screen bg-surface-base pb-24"
      onTouchStart={swipeBack.onTouchStart}
      onTouchEnd={swipeBack.onTouchEnd}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-sm border-b border-surface-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-surface-card rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
            )}
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-accent font-medium hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No notifications</h3>
            <p className="text-sm text-text-muted">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              
              return (
                <div 
                  key={notification.id}
                  className={`bg-surface-card border border-surface-border rounded-xl p-4 transition-colors ${
                    !notification.is_read ? 'border-accent/30 bg-accent/5' : ''
                  }`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-text-secondary mt-0.5">
                              {notification.body}
                            </p>
                          )}
                        </div>
                        
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      {/* Book cover if available */}
                      {notification.book_cover_url && (
                        <div className="mt-2">
                          <img 
                            src={notification.book_cover_url} 
                            alt={notification.book_title || ''}
                            className="h-16 rounded shadow object-cover"
                          />
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-text-muted">
                          {formatTime(notification.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* Like button for activity-related notifications */}
                          {notification.activity_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(notification.activity_id!);
                              }}
                              disabled={likingActivity === notification.activity_id}
                              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                likedActivities[notification.activity_id]
                                  ? 'text-red-500'
                                  : 'text-text-muted hover:text-red-500'
                              }`}
                            >
                              <Heart 
                                className={`w-4 h-4 ${likedActivities[notification.activity_id] ? 'fill-current' : ''}`} 
                              />
                              {likedActivities[notification.activity_id] ? 'Liked' : 'Like'}
                            </button>
                          )}
                          
                          {notification.actor_id && onViewProfile && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewProfile(notification.actor_id!);
                              }}
                              className="text-xs text-accent font-medium hover:underline"
                            >
                              View profile
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="p-1 text-text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// Notification Bell Button (for use in headers)
interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell = memo<NotificationBellProps>(({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    const count = await communityApi.notifications.getUnreadCount();
    setUnreadCount(count);
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-surface-card rounded-lg transition-colors"
    >
      <Bell className="w-5 h-5 text-text-secondary" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
});

Notifications.displayName = 'Notifications';
NotificationBell.displayName = 'NotificationBell';
