import { useState, useEffect, memo } from 'react';
import { 
  TrendingUp, 
  Star, 
  BookOpen, 
  Search,
  MessageCircle,
  Eye,
  X,
  Users,
  Sparkles,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { communityApi, BookReview, TrendingBook as TrendingBookApi } from '../services/community';
import { BookReviewSection } from './BookReviewSection';

interface DiscoverBooksProps {
  onViewProfile: (userId: string) => void;
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

export const DiscoverBooks = memo<DiscoverBooksProps>(({ onViewProfile }) => {
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<CurrentlyReadingItem[]>([]);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<TrendingBook | null>(null);
  const [bookReviews, setBookReviews] = useState<BookReview[]>([]);
  const [loadingBookReviews, setLoadingBookReviews] = useState(false);
  const [showBookReviews, setShowBookReviews] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [trendingData, readingData, reviewsData] = await Promise.all([
        communityApi.discovery.getTrendingBooks(10),
        communityApi.discovery.getCurrentlyReading(),
        communityApi.reviews.getLatestReviews(10)
      ]);
      
      setTrendingBooks(trendingData.map((book: TrendingBookApi) => ({
        title: book.book_title || 'Unknown',
        author: (book as any).book_author || '',
        cover_url: book.book_cover_url || undefined,
        review_count: book.activity_count || 0,
        average_rating: 0
      })));
      setCurrentlyReading(readingData.slice(0, 5));
      setReviews(reviewsData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  const handleViewBookReviews = async (book: TrendingBook) => {
    setSelectedBook(book);
    setShowBookReviews(true);
    setLoadingBookReviews(true);
    try {
      const reviews = await communityApi.reviews.getReviewsByBookTitle(book.title, 20);
      setBookReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setBookReviews([]);
    } finally {
      setLoadingBookReviews(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Book Reviews Detail View
  if (showBookReviews && selectedBook) {
    return (
      <div className="min-h-screen bg-surface-base pb-24">
        <div className="bg-surface-card border-b border-surface-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => {
                setShowBookReviews(false);
                setSelectedBook(null);
                setBookReviews([]);
              }}
              className="p-2 -ml-2 hover:bg-surface-elevated rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">{selectedBook.title}</h1>
              <p className="text-xs text-text-muted">{selectedBook.review_count} reviews</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
          {/* Book Info Card */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4 flex gap-4">
            {selectedBook.cover_url ? (
              <img 
                src={selectedBook.cover_url} 
                alt={selectedBook.title}
                className="w-20 h-28 object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-20 h-28 bg-surface-elevated rounded-lg flex items-center justify-center border border-surface-border">
                <BookOpen className="w-8 h-8 text-text-muted" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-base font-semibold text-text-primary">{selectedBook.title}</h2>
              {selectedBook.author && (
                <p className="text-sm text-text-muted">by {selectedBook.author}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent font-medium">Trending Now</span>
              </div>
              <button
                onClick={() => setShowReviewModal(true)}
                className="mt-3 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors"
              >
                Write a Review
              </button>
            </div>
          </div>

          {/* Reviews */}
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            Community Reviews
          </h3>
          
          {loadingBookReviews ? (
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
                      onClick={() => review.user_id && onViewProfile(review.user_id)}
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
              <button
                onClick={() => setShowReviewModal(true)}
                className="mt-3 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors"
              >
                Be the first to review!
              </button>
            </div>
          )}
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-surface-card border border-surface-border rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-surface-border sticky top-0 bg-surface-card">
                <h2 className="text-lg font-semibold text-text-primary">
                  Review: {selectedBook.title}
                </h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-1 hover:bg-surface-elevated rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="p-4">
                <BookReviewSection
                  bookIsbn={`trending-${selectedBook.title}`}
                  bookTitle={selectedBook.title}
                  bookAuthor={selectedBook.author}
                  bookCoverUrl={selectedBook.cover_url}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base pb-24">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              Discover
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-text-secondary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search books, authors, or readers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-elevated border border-surface-border text-text-primary placeholder-text-muted focus:ring-2 ring-accent focus:border-transparent"
            />
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
            {/* Trending Books */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Trending This Week
              </h2>
              
              {trendingBooks.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {trendingBooks.map((book, index) => (
                    <button
                      key={book.title}
                      onClick={() => handleViewBookReviews(book)}
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
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <MessageCircle className="w-2.5 h-2.5" />
                          <span>{book.review_count}</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-text-primary mt-2 truncate">{book.title}</p>
                      <p className="text-[10px] text-accent">Tap for reviews</p>
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

            {/* What Others Are Reading */}
            <section>
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" />
                What Others Are Reading
              </h2>
              
              {currentlyReading.length > 0 ? (
                <div className="bg-surface-card border border-surface-border rounded-xl divide-y divide-surface-border">
                  {currentlyReading.map((item) => (
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
                <Star className="w-4 h-4 text-amber-400" />
                Latest Reviews
              </h2>
              
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="bg-surface-card border border-surface-border rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <button
                          onClick={() => review.user_id && onViewProfile(review.user_id)}
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

            {/* Explore More CTA */}
            <section>
              <div 
                className="rounded-xl p-5 text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.15) 0%, rgba(155, 138, 251, 0.08) 100%)',
                  border: '1px solid rgba(124, 92, 252, 0.2)'
                }}
              >
                <BookOpen className="w-8 h-8 text-accent mx-auto mb-2" />
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  Discover Your Next Read
                </h3>
                <p className="text-sm text-text-muted">
                  Explore trending books and see what others are reading
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
});

DiscoverBooks.displayName = 'DiscoverBooks';
