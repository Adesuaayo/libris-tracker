import { useState, useEffect, memo } from 'react';
import { 
  Users, 
  TrendingUp, 
  MessageCircle, 
  BookOpen, 
  Bell,
  Globe,
  Star,
  ChevronRight,
  ChevronLeft,
  Clock,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { communityApi, UserProfile, Activity, BookReview } from '../services/community';
import { UserProfileView } from './UserProfile';
import { BookClubsList } from './BookClubs';
import { useToastActions } from './Toast';
import { Notifications, NotificationBell } from './Notifications';
import { useSwipeBack } from './useSwipeBack';

interface CommunityProps {
  currentUserId: string;
}

interface TrendingBook {
  title: string;
  author: string;
  cover_url?: string;
  review_count: number;
  average_rating: number;
}

interface CurrentlyReadingItem {
  book_title: string;
  book_author: string;
  book_cover?: string;
  reader_count: number;
}

export const Community = memo<CommunityProps>(({ currentUserId }) => {
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [showClubs, setShowClubs] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTrendingBook, setSelectedTrendingBook] = useState<TrendingBook | null>(null);
  const [bookReviews, setBookReviews] = useState<BookReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // Data states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<CurrentlyReadingItem[]>([]);
  const [latestReviews, setLatestReviews] = useState<BookReview[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Swipe-from-edge back navigation handlers
  const clubsSwipeBack = useSwipeBack({ 
    onBack: () => setShowClubs(false),
    enabled: showClubs
  });
  
  const trendingSwipeBack = useSwipeBack({
    onBack: () => {
      setSelectedTrendingBook(null);
      setBookReviews([]);
    },
    enabled: !!selectedTrendingBook
  });

  useToastActions();

  useEffect(() => {
    loadAllData();
    loadMyProfile();
  }, []);

  const loadMyProfile = async () => {
    try {
      const profile = await communityApi.profiles.getMyProfile();
      setMyProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [activitiesData, trendingData, readingData, reviewsData, recsData, unread] = await Promise.all([
        communityApi.activities.getFeed(10),
        communityApi.discovery.getTrendingBooks(5),
        communityApi.discovery.getCurrentlyReading(),
        communityApi.reviews.getLatestReviews(5),
        communityApi.recommendations.getReceived(),
        communityApi.recommendations.getUnreadCount()
      ]);
      
      setActivities(activitiesData);
      setTrendingBooks(trendingData.map((book: any) => ({
        title: book.book_title || 'Unknown',
        author: '',
        cover_url: book.book_cover_url || undefined,
        review_count: book.activity_count || 0,
        average_rating: 0
      })));
      setCurrentlyReading(readingData.slice(0, 5));
      setLatestReviews(reviewsData);
      setRecommendations(recsData.filter((r: any) => !r.is_read).slice(0, 3));
      setUnreadCount(unread);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  const handleViewTrendingBookReviews = async (book: TrendingBook) => {
    setSelectedTrendingBook(book);
    setLoadingReviews(true);
    try {
      const reviews = await communityApi.reviews.getReviewsByBookTitle(book.title, 20);
      setBookReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setBookReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleViewProfile = async (userId: string) => {
    const profile = await communityApi.profiles.getProfile(userId);
    if (profile) {
      setViewingProfile(profile);
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
      case 'started_book': return 'bg-blue-500/20 text-blue-400';
      case 'finished_book': return 'bg-emerald-500/20 text-emerald-400';
      case 'review': return 'bg-amber-500/20 text-amber-400';
      case 'joined_club': return 'bg-accent/20 text-accent';
      case 'discussion': return 'bg-rose-500/20 text-rose-400';
      case 'achievement': return 'bg-accent/20 text-accent-light';
      default: return 'bg-surface-elevated text-text-muted';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  // Show notifications view
  if (showNotifications) {
    return (
      <Notifications 
        onBack={() => setShowNotifications(false)}
        onViewProfile={handleViewProfile}
      />
    );
  }

  // Show profile view
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

  // Show book clubs full view
  if (showClubs) {
    return (
      <div 
        className="min-h-screen bg-surface-base pb-24"
        onTouchStart={clubsSwipeBack.onTouchStart}
        onTouchEnd={clubsSwipeBack.onTouchEnd}
      >
        <div className="bg-surface-card border-b border-surface-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setShowClubs(false)}
              className="p-2 -ml-2 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-text-primary">Book Clubs</h1>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
          <BookClubsList 
            currentUserId={currentUserId}
            onViewProfile={handleViewProfile}
          />
        </div>
      </div>
    );
  }

  // Show trending book reviews
  if (selectedTrendingBook) {
    return (
      <div 
        className="min-h-screen bg-surface-base pb-24"
        onTouchStart={trendingSwipeBack.onTouchStart}
        onTouchEnd={trendingSwipeBack.onTouchEnd}
      >
        <div className="bg-surface-card border-b border-surface-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedTrendingBook(null);
                setBookReviews([]);
              }}
              className="p-2 -ml-2 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">{selectedTrendingBook.title}</h1>
              <p className="text-xs text-text-muted">{selectedTrendingBook.review_count} reviews</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
          {/* Book Info Card */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4 flex gap-4">
            {selectedTrendingBook.cover_url ? (
              <img 
                src={selectedTrendingBook.cover_url} 
                alt={selectedTrendingBook.title}
                className="w-20 h-28 object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-20 h-28 bg-surface-elevated rounded-lg flex items-center justify-center border border-surface-border">
                <BookOpen className="w-8 h-8 text-text-muted" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-base font-semibold text-text-primary">{selectedTrendingBook.title}</h2>
              {selectedTrendingBook.author && (
                <p className="text-sm text-text-muted">by {selectedTrendingBook.author}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent font-medium">Trending Now</span>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            Community Reviews
          </h3>
          
          {loadingReviews ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
            </div>
          ) : bookReviews.length > 0 ? (
            <div className="space-y-3">
              {bookReviews.map((review) => (
                <div 
                  key={review.id} 
                  className="bg-surface-card border border-surface-border rounded-xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => review.user_id && handleViewProfile(review.user_id)}
                      className="flex-shrink-0"
                    >
                      {review.user?.avatar_url ? (
                        <img 
                          src={review.user.avatar_url} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-sm font-medium">
                          {review.user?.display_name?.[0] || '?'}
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {review.user?.display_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-text-muted">
                          {formatTime(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-xl p-8 text-center">
              <Star className="w-12 h-12 mx-auto text-text-muted mb-3" />
              <p className="text-sm text-text-muted">No reviews yet for this book</p>
              <p className="text-xs text-text-muted mt-1">Be the first to review!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base pb-24">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Globe className="w-6 h-6 text-accent" />
            Community
          </h1>
          
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-text-secondary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Notifications */}
            <NotificationBell onClick={() => setShowNotifications(true)} />
            
            {/* Profile */}
            <button
              onClick={() => myProfile && setViewingProfile(myProfile)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-surface-border hover:border-accent/30 transition-colors"
            >
              {myProfile?.avatar_url ? (
                <img 
                  src={myProfile.avatar_url} 
                  alt="" 
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-medium">
                  {myProfile?.display_name?.[0] || '?'}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Notifications Banner (if any) */}
            {recommendations.length > 0 && (
              <div 
                className="rounded-xl p-4 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.1) 0%, rgba(155, 138, 251, 0.05) 100%)',
                  borderColor: 'rgba(124, 92, 252, 0.2)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {unreadCount} new recommendation{unreadCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-text-muted">
                      {recommendations[0]?.from_user?.display_name || 'Someone'} sent you a book
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Recent Activity
              </h2>
              
              {activities.length > 0 ? (
                <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border">
                  {activities.slice(0, 5).map((activity) => {
                    const Icon = getActivityIcon(activity.activity_type);
                    return (
                      <div key={activity.id} className="p-3 flex items-start gap-3">
                        <button
                          onClick={() => activity.user_id && handleViewProfile(activity.user_id)}
                          className="flex-shrink-0"
                        >
                          {activity.user?.avatar_url ? (
                            <img 
                              src={activity.user.avatar_url} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-medium">
                              {activity.user?.display_name?.[0] || '?'}
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">
                            <span className="font-medium">{activity.user?.display_name || 'Someone'}</span>
                            {' '}
                            <span className="text-text-secondary">
                              {activity.activity_type === 'started_book' && 'started reading'}
                              {activity.activity_type === 'finished_book' && 'finished'}
                              {activity.activity_type === 'review' && 'reviewed'}
                              {activity.activity_type === 'joined_club' && 'joined'}
                              {activity.activity_type === 'discussion' && 'discussed'}
                            </span>
                          </p>
                          {activity.book_title && (
                            <p className="text-sm text-text-primary font-medium truncate">
                              "{activity.book_title}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{formatTime(activity.created_at)}</span>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface-card border border-surface-border rounded-xl p-6 text-center">
                  <Users className="w-10 h-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No recent activity</p>
                </div>
              )}
            </section>

            {/* Trending Books */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Trending Books
              </h2>
              
              {trendingBooks.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {trendingBooks.map((book, index) => (
                    <button
                      key={book.title}
                      onClick={() => handleViewTrendingBookReviews(book)}
                      className="flex-shrink-0 w-28 text-center group"
                    >
                      <div className="relative">
                        {book.cover_url ? (
                          <img 
                            src={book.cover_url} 
                            alt={book.title}
                            className="w-28 h-40 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-28 h-40 bg-surface-elevated rounded-xl flex items-center justify-center border border-surface-border group-hover:border-accent/30 transition-colors">
                            <BookOpen className="w-8 h-8 text-text-muted" />
                          </div>
                        )}
                        {index < 3 && (
                          <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-400 text-amber-900' :
                            index === 1 ? 'bg-slate-300 text-slate-700' :
                            'bg-amber-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                        {/* Tap to view indicator */}
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" />
                          <span>{book.review_count}</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-text-primary mt-2 truncate">{book.title}</p>
                      <p className="text-[10px] text-accent">Tap to see reviews</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-card border border-surface-border rounded-xl p-6 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No trending books yet</p>
                </div>
              )}
            </section>

            {/* Book Clubs Section - Moved up for better visibility */}
            <section>
              <button
                onClick={() => setShowClubs(true)}
                className="w-full bg-gradient-to-r from-accent/10 to-violet-500/10 border border-accent/20 rounded-xl p-4 flex items-center gap-4 hover:border-accent/40 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary">📚 Book Clubs</h3>
                  <p className="text-sm text-text-muted">Join discussions with fellow readers</p>
                </div>
                <ChevronRight className="w-5 h-5 text-accent" />
              </button>
            </section>

            {/* Currently Reading Around You */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                What Others Are Reading
              </h2>
              
              {currentlyReading.length > 0 ? (
                <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border">
                  {currentlyReading.slice(0, 3).map((item) => (
                    <div key={item.book_title} className="p-3 flex items-center gap-3">
                      {item.book_cover ? (
                        <img 
                          src={item.book_cover} 
                          alt={item.book_title}
                          className="w-10 h-14 object-cover rounded-lg shadow"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-surface-elevated rounded-lg flex items-center justify-center border border-surface-border">
                          <BookOpen className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.book_title}</p>
                        <p className="text-xs text-text-muted truncate">{item.book_author}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Users className="w-3.5 h-3.5" />
                        <span>{item.reader_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-card border border-surface-border rounded-xl p-6 text-center">
                  <BookOpen className="w-10 h-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No one reading yet</p>
                </div>
              )}
            </section>

            {/* Latest Reviews */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                Latest Reviews
              </h2>
              
              {latestReviews.length > 0 ? (
                <div className="space-y-3">
                  {latestReviews.slice(0, 3).map((review) => (
                    <div 
                      key={review.id} 
                      className="bg-surface-card border border-surface-border rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <button
                          onClick={() => review.user_id && handleViewProfile(review.user_id)}
                          className="flex-shrink-0"
                        >
                          {review.user?.avatar_url ? (
                            <img 
                              src={review.user.avatar_url} 
                              alt="" 
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-medium">
                              {review.user?.display_name?.[0] || '?'}
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            {review.user?.display_name || 'Someone'}
                          </p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-text-muted'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-text-primary mb-1">
                        "{review.book_title}"
                      </p>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {review.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-card border border-surface-border rounded-xl p-6 text-center">
                  <Star className="w-10 h-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No reviews yet</p>
                </div>
              )}
            </section>

            {/* Join the Community CTA */}
            <section>
              <div 
                className="rounded-xl p-5 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.15) 0%, rgba(155, 138, 251, 0.08) 100%)',
                  border: '1px solid rgba(124, 92, 252, 0.2)'
                }}
              >
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  Share Your Reading Journey
                </h3>
                <p className="text-sm text-text-muted mb-3">
                  Review books, join clubs, and connect with fellow readers
                </p>
                <button
                  onClick={() => myProfile && setViewingProfile(myProfile)}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Complete Your Profile
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
});

Community.displayName = 'Community';
