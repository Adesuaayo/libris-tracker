import { useState, useEffect, memo } from 'react';
import { 
  TrendingUp, 
  Star, 
  BookOpen, 
  Search,
  Heart,
  MessageCircle,
  Eye
} from 'lucide-react';
import { communityApi, BookReview, TrendingBook as TrendingBookApi } from '../services/community';

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
  const [activeSection, setActiveSection] = useState<'trending' | 'reading' | 'reviews'>('trending');
  const [trendingBooks, setTrendingBooks] = useState<TrendingBook[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<CurrentlyReadingItem[]>([]);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeSection === 'trending') {
        const data = await communityApi.discovery.getTrendingBooks(10);
        // Map API response to local TrendingBook interface
        setTrendingBooks(data.map((book: TrendingBookApi) => ({
          title: book.book_title || 'Unknown',
          author: '', // API doesn't provide author in trending view
          cover_url: book.book_cover_url || undefined,
          review_count: book.activity_count || 0,
          average_rating: 0 // Would need separate query to calculate
        })));
      } else if (activeSection === 'reading') {
        const data = await communityApi.discovery.getCurrentlyReading();
        setCurrentlyReading(data);
      } else if (activeSection === 'reviews') {
        const data = await communityApi.reviews.getLatestReviews(20);
        setReviews(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [
    { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
    { id: 'reading' as const, label: 'Reading Now', icon: BookOpen },
    { id: 'reviews' as const, label: 'Reviews', icon: Star },
  ];

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search books, authors, or readers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? 'bg-violet-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Trending Books */}
          {activeSection === 'trending' && (
            <TrendingBooksSection books={trendingBooks} />
          )}

          {/* Currently Reading */}
          {activeSection === 'reading' && (
            <CurrentlyReadingSection items={currentlyReading} />
          )}

          {/* Reviews */}
          {activeSection === 'reviews' && (
            <ReviewsSection reviews={reviews} onViewProfile={onViewProfile} />
          )}
        </>
      )}
    </div>
  );
});

DiscoverBooks.displayName = 'DiscoverBooks';

// =============================================
// TRENDING BOOKS SECTION
// =============================================

function TrendingBooksSection({ books }: { books: TrendingBook[] }) {
  if (books.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No trending books yet</h3>
        <p className="text-sm text-slate-500">Be the first to review a book!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        Trending This Week
      </h2>

      <div className="grid gap-3">
        {books.map((book, index) => (
          <div 
            key={`${book.title}-${book.author}`}
            className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              index === 0 ? 'bg-yellow-400 text-yellow-900' :
              index === 1 ? 'bg-slate-300 text-slate-700' :
              index === 2 ? 'bg-amber-600 text-white' :
              'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {index + 1}
            </div>

            {/* Book Cover */}
            {book.cover_url ? (
              <img 
                src={book.cover_url} 
                alt={book.title}
                className="w-12 h-18 object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-12 h-18 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-slate-400" />
              </div>
            )}

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {book.title}
              </h3>
              <p className="text-sm text-slate-500 truncate">{book.author}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-2">
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {book.average_rating.toFixed(1)}
                  </span>
                </div>

                {/* Review Count */}
                <div className="flex items-center gap-1 text-slate-500">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{book.review_count} reviews</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================
// CURRENTLY READING SECTION
// =============================================

function CurrentlyReadingSection({ items }: { items: CurrentlyReadingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No books being read</h3>
        <p className="text-sm text-slate-500">Start reading to show up here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <Eye className="w-5 h-5 text-blue-500" />
        See What Others Are Reading
      </h2>

      <div className="grid gap-3">
        {items.map((item) => (
          <div 
            key={`${item.book_title}-${item.book_author}`}
            className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm"
          >
            {/* Book Cover */}
            {item.book_cover ? (
              <img 
                src={item.book_cover} 
                alt={item.book_title}
                className="w-14 h-20 object-cover rounded-lg shadow"
              />
            ) : (
              <div className="w-14 h-20 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
            )}

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {item.book_title}
              </h3>
              <p className="text-sm text-slate-500 truncate">{item.book_author}</p>

              {/* Reader Count */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, item.reader_count))].map((_, i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded-full bg-violet-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs"
                    >
                      ?
                    </div>
                  ))}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {item.reader_count} {item.reader_count === 1 ? 'reader' : 'readers'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================
// REVIEWS SECTION
// =============================================

interface ReviewsSectionProps {
  reviews: BookReview[];
  onViewProfile: (userId: string) => void;
}

function ReviewsSection({ reviews, onViewProfile }: ReviewsSectionProps) {
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());

  const handleLike = async (reviewId: string) => {
    if (likedReviews.has(reviewId)) {
      await communityApi.reviews.unlikeReview(reviewId);
      setLikedReviews(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    } else {
      await communityApi.reviews.likeReview(reviewId);
      setLikedReviews(prev => new Set(prev).add(reviewId));
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No reviews yet</h3>
        <p className="text-sm text-slate-500">Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" />
        Latest Reviews
      </h2>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div 
            key={review.id}
            className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm"
          >
            {/* User Info */}
            <button 
              onClick={() => onViewProfile(review.user_id)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {review.user?.avatar_url ? (
                <img 
                  src={review.user.avatar_url} 
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-medium">
                  {review.user?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white">
                  {review.user?.display_name || 'Anonymous'}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>

            {/* Book Info */}
            <div className="mt-3 flex gap-3">
              {review.book_cover_url ? (
                <img 
                  src={review.book_cover_url} 
                  alt=""
                  className="w-12 h-18 object-cover rounded-lg shadow"
                />
              ) : (
                <div className="w-12 h-18 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                  {review.book_title}
                </h3>
                <p className="text-sm text-slate-500 truncate">{review.book_author}</p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex gap-0.5 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Review Content */}
            {review.content && (
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 line-clamp-4">
                {review.content}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => handleLike(review.id)}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  likedReviews.has(review.id)
                    ? 'text-red-500'
                    : 'text-slate-500 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${likedReviews.has(review.id) ? 'fill-current' : ''}`} />
                <span>{(review.likes_count || 0) + (likedReviews.has(review.id) ? 1 : 0)}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
