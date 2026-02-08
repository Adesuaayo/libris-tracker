import { useState, useEffect, memo } from 'react';
import { Star, Send, ThumbsUp, User, ChevronDown, ChevronUp } from 'lucide-react';
import { communityApi, BookReview } from '../services/community';
import { useToastActions } from './Toast';

interface BookReviewSectionProps {
  bookId?: string;
  bookIsbn?: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
}

export const BookReviewSection = memo<BookReviewSectionProps>(({
  bookId,
  bookIsbn,
  bookTitle,
  bookAuthor,
  bookCoverUrl
}) => {
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState<BookReview | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToastActions();

  useEffect(() => {
    loadReviews();
  }, [bookIsbn]);

  const loadReviews = async () => {
    if (!bookIsbn) return;
    
    setIsLoading(true);
    try {
      const data = await communityApi.reviews.getReviewsForBook(bookIsbn);
      setReviews(data);
      
      // Check if user already reviewed
      const myReview = data.find(r => r.is_liked !== undefined); // Simplified check
      if (myReview) {
        setUserReview(myReview);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const review = await communityApi.reviews.create({
        book_id: bookId,
        book_isbn: bookIsbn,
        book_title: bookTitle,
        book_author: bookAuthor,
        book_cover_url: bookCoverUrl,
        rating,
        review_text: reviewText.trim() || null,
        is_spoiler: isSpoiler
      });

      if (review) {
        toast.success('Review posted!');
        setShowReviewForm(false);
        setUserReview(review);
        setReviews(prev => [review, ...prev]);
        setRating(0);
        setReviewText('');
        setIsSpoiler(false);
      }
    } catch (error) {
      toast.error('Failed to post review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    if (review.is_liked) {
      await communityApi.reviews.unlikeReview(reviewId);
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, is_liked: false, like_count: Math.max(0, (r.like_count || 0) - 1) }
          : r
      ));
    } else {
      await communityApi.reviews.likeReview(reviewId);
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { ...r, is_liked: true, like_count: (r.like_count || 0) + 1 }
          : r
      ));
    }
  };

  const displayedReviews = isExpanded ? reviews : reviews.slice(0, 3);
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Community Reviews
          </h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-text-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-text-muted">
                {averageRating.toFixed(1)} • {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {!userReview && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
          >
            Write Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-surface-base rounded-xl p-4 space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Your Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Your Review (optional)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this book..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-card text-text-primary resize-none"
            />
          </div>

          {/* Spoiler Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="w-4 h-4 rounded border-surface-border text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-text-secondary">
              Contains spoilers
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 text-text-secondary text-sm font-medium hover:bg-surface-elevated rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={isSubmitting || rating === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Review
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No reviews yet. Be the first to review this book!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div 
              key={review.id}
              className="bg-surface-card rounded-xl p-4 border border-surface-border"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                {review.user?.avatar_url || review.author?.avatar_url ? (
                  <img 
                    src={review.user?.avatar_url || review.author?.avatar_url || ''}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-medium">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">
                    {review.user?.display_name || review.author?.display_name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-text-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Review Text */}
              {(review.review_text || review.content) && (
                <div className="relative">
                  {review.is_spoiler ? (
                    <details className="group">
                      <summary className="text-sm text-red-500 cursor-pointer hover:text-red-600">
                        ⚠️ Contains spoilers - click to reveal
                      </summary>
                      <p className="mt-2 text-sm text-text-secondary">
                        {review.review_text || review.content}
                      </p>
                    </details>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      {review.review_text || review.content}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-border">
                <button
                  onClick={() => handleLike(review.id)}
                  className={`flex items-center gap-1 text-sm transition-colors ${
                    review.is_liked
                      ? 'text-violet-500'
                      : 'text-text-muted hover:text-violet-500'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${review.is_liked ? 'fill-current' : ''}`} />
                  <span>{review.like_count || review.likes_count || 0}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Show More/Less */}
          {reviews.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {reviews.length - 3} more reviews
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

BookReviewSection.displayName = 'BookReviewSection';
