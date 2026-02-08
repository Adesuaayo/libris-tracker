import { useState, useEffect, memo, useRef } from 'react';
import { 
  Trophy, 
  Plus, 
  Users, 
  Calendar, 
  Target,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Clock,
  Check,
  Loader2,
  Medal,
  Crown,
  Sparkles,
  MessageCircle,
  Send,
  Trash2
} from 'lucide-react';
import { communityApi, Challenge, ChallengeProgress, ChallengeComment, CheerEmoji } from '../services/community';
import { useToastActions } from './Toast';

interface ChallengesProps {
  currentUserId: string;
}

type ChallengeFilter = 'all' | 'joined' | 'created';
type ChallengeType = 'books_count' | 'pages_count' | 'genre' | 'author' | 'custom';

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  books_count: 'Read Books',
  pages_count: 'Read Pages',
  genre: 'Genre Challenge',
  author: 'Author Challenge',
  custom: 'Custom Goal'
};

const CHALLENGE_TYPE_ICONS: Record<ChallengeType, React.ReactNode> = {
  books_count: <BookOpen className="w-4 h-4" />,
  pages_count: <Target className="w-4 h-4" />,
  genre: <Sparkles className="w-4 h-4" />,
  author: <Users className="w-4 h-4" />,
  custom: <Trophy className="w-4 h-4" />
};

const CHEER_EMOJIS: CheerEmoji[] = ['🔥', '🎉', '👏', '📚', '💪', '⭐'];

const formatCommentTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const Challenges = memo<ChallengesProps>(({ currentUserId }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeProgress[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [comments, setComments] = useState<ChallengeComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [cheers, setCheers] = useState<Record<string, { count: number; userCheered: boolean }>>({});
  const [cheerAnimating, setCheerAnimating] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const toast = useToastActions();

  useEffect(() => {
    loadChallenges();
  }, [filter]);

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const data = await communityApi.challenges.getChallenges(filter);
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const success = await communityApi.challenges.joinChallenge(challengeId);
      if (success) {
        toast.success('Joined challenge!');
        loadChallenges();
      } else {
        toast.error('Failed to join challenge');
      }
    } catch (error) {
      toast.error('Failed to join challenge');
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    try {
      const success = await communityApi.challenges.leaveChallenge(challengeId);
      if (success) {
        toast.success('Left challenge');
        loadChallenges();
        if (selectedChallenge?.id === challengeId) {
          setSelectedChallenge(null);
        }
      } else {
        toast.error('Failed to leave challenge');
      }
    } catch (error) {
      toast.error('Failed to leave challenge');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    
    try {
      const success = await communityApi.challenges.deleteChallenge(challengeId);
      if (success) {
        toast.success('Challenge deleted');
        loadChallenges();
        setSelectedChallenge(null);
      } else {
        toast.error('Failed to delete challenge');
      }
    } catch (error) {
      toast.error('Failed to delete challenge');
    }
  };

  const loadLeaderboard = async (challengeId: string) => {
    setLoadingLeaderboard(true);
    try {
      const data = await communityApi.challenges.getLeaderboard(challengeId);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleSelectChallenge = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    loadLeaderboard(challenge.id);
    loadComments(challenge.id);
    loadCheers(challenge.id);
  };

  const loadComments = async (challengeId: string) => {
    setLoadingComments(true);
    try {
      const data = await communityApi.challenges.getComments(challengeId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadCheers = async (challengeId: string) => {
    try {
      const data = await communityApi.challenges.getCheers(challengeId);
      setCheers(data);
    } catch (error) {
      console.error('Error loading cheers:', error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedChallenge) return;
    setSendingComment(true);
    try {
      const comment = await communityApi.challenges.addComment(selectedChallenge.id, newComment.trim());
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
        // Scroll to bottom after short delay
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        toast.error('Failed to send comment');
      }
    } catch (error) {
      toast.error('Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const success = await communityApi.challenges.deleteComment(commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleToggleCheer = async (emoji: string) => {
    if (!selectedChallenge) return;
    
    // Optimistic update
    setCheers(prev => {
      const current = prev[emoji] || { count: 0, userCheered: false };
      return {
        ...prev,
        [emoji]: {
          count: current.userCheered ? current.count - 1 : current.count + 1,
          userCheered: !current.userCheered
        }
      };
    });
    setCheerAnimating(emoji);
    setTimeout(() => setCheerAnimating(null), 600);

    try {
      const result = await communityApi.challenges.toggleCheer(selectedChallenge.id, emoji);
      if (!result) {
        // Revert on failure
        loadCheers(selectedChallenge.id);
      }
    } catch (error) {
      loadCheers(selectedChallenge.id);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const isActive = (challenge: Challenge) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    return now >= start && now <= end;
  };

  // Challenge Detail View
  if (selectedChallenge) {
    const progress = selectedChallenge.my_progress;
    const percentage = progress ? getProgressPercentage(progress.current_value, selectedChallenge.target_value) : 0;
    const daysLeft = getDaysRemaining(selectedChallenge.end_date);
    const active = isActive(selectedChallenge);

    return (
      <div className="min-h-screen bg-surface-base pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-sm border-b border-surface-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setSelectedChallenge(null)}
              className="p-2 -ml-2 hover:bg-surface-card rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <h1 className="text-lg font-bold text-text-primary">Challenge Details</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Challenge Info Card */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                {CHALLENGE_TYPE_ICONS[selectedChallenge.challenge_type]}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text-primary">{selectedChallenge.title}</h2>
                <p className="text-sm text-text-muted">
                  by {selectedChallenge.creator?.display_name || selectedChallenge.creator?.username || 'Unknown'}
                </p>
              </div>
            </div>

            {selectedChallenge.description && (
              <p className="text-sm text-text-secondary mb-4">{selectedChallenge.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{selectedChallenge.participant_count} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
              </div>
            </div>

            {/* Goal */}
            <div className="bg-surface-base rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-muted">Goal</span>
                <span className="text-sm font-medium text-accent">
                  {selectedChallenge.target_value} {selectedChallenge.challenge_type === 'pages_count' ? 'pages' : 'books'}
                </span>
              </div>
              {selectedChallenge.target_genre && (
                <p className="text-xs text-text-muted">Genre: {selectedChallenge.target_genre}</p>
              )}
              {selectedChallenge.target_author && (
                <p className="text-xs text-text-muted">Author: {selectedChallenge.target_author}</p>
              )}
            </div>

            {/* User's Progress */}
            {selectedChallenge.is_joined && progress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Your Progress</span>
                  <span className="text-sm text-accent font-medium">{percentage}%</span>
                </div>
                <div className="h-3 bg-surface-base rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                  <span>{progress.current_value} / {selectedChallenge.target_value}</span>
                  {progress.completed && (
                    <span className="flex items-center gap-1 text-green-500">
                      <Check className="w-3 h-3" /> Completed!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!selectedChallenge.is_joined && active ? (
                <button
                  onClick={() => handleJoinChallenge(selectedChallenge.id)}
                  className="flex-1 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors"
                >
                  Join Challenge
                </button>
              ) : selectedChallenge.is_joined && selectedChallenge.creator_id !== currentUserId ? (
                <button
                  onClick={() => handleLeaveChallenge(selectedChallenge.id)}
                  className="flex-1 py-2 bg-surface-base text-text-secondary font-medium rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  Leave Challenge
                </button>
              ) : null}
              
              {selectedChallenge.creator_id === currentUserId && (
                <button
                  onClick={() => handleDeleteChallenge(selectedChallenge.id)}
                  className="px-4 py-2 bg-red-500/10 text-red-500 font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500" />
                Leaderboard
              </h3>
            </div>

            {loadingLeaderboard ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No participants yet</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={`flex items-center gap-3 p-4 ${entry.user_id === currentUserId ? 'bg-accent/5' : ''}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      {index === 0 ? (
                        <Crown className="w-5 h-5 text-amber-500" />
                      ) : index === 1 ? (
                        <Medal className="w-5 h-5 text-slate-400" />
                      ) : index === 2 ? (
                        <Medal className="w-5 h-5 text-amber-700" />
                      ) : (
                        <span className="text-sm font-medium text-text-muted">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                      {entry.user?.avatar_url ? (
                        <img src={entry.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-accent">
                          {(entry.user?.display_name || entry.user?.username || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {entry.user?.display_name || entry.user?.username || 'User'}
                        {entry.user_id === currentUserId && <span className="text-accent ml-1">(You)</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-base rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${getProgressPercentage(entry.current_value, selectedChallenge.target_value)}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          {entry.current_value} / {selectedChallenge.target_value}
                        </span>
                      </div>
                    </div>

                    {entry.completed && (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cheers / Emoji Reactions */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4">
            <h3 className="font-semibold text-text-primary text-sm mb-3">Cheer this challenge!</h3>
            <div className="flex flex-wrap gap-2">
              {CHEER_EMOJIS.map((emoji) => {
                const cheerData = cheers[emoji];
                const count = cheerData?.count || 0;
                const userCheered = cheerData?.userCheered || false;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleToggleCheer(emoji)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      userCheered
                        ? 'bg-accent/15 border-accent/40 scale-105'
                        : 'bg-surface-base border-surface-border hover:border-accent/30'
                    } ${cheerAnimating === emoji ? 'animate-bounce' : ''}`}
                  >
                    <span className="text-base">{emoji}</span>
                    {count > 0 && (
                      <span className={`text-xs font-medium ${userCheered ? 'text-accent' : 'text-text-muted'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-accent" />
                Discussion
                {comments.length > 0 && (
                  <span className="text-xs text-text-muted font-normal">({comments.length})</span>
                )}
              </h3>
            </div>

            {/* Comments List */}
            <div className="max-h-80 overflow-y-auto">
              {loadingComments ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="p-6 text-center text-text-muted">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs mt-1">Be the first to say something!</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 group">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0 mt-0.5">
                          {comment.user?.avatar_url ? (
                            <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-accent">
                              {(comment.user?.display_name || comment.user?.username || '?')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text-primary">
                              {comment.user?.display_name || comment.user?.username || 'User'}
                            </span>
                            <span className="text-xs text-text-muted">
                              {formatCommentTime(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5 break-words">{comment.content}</p>
                        </div>
                        {comment.user_id === currentUserId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 opacity-0 group-hover:opacity-60 sm:group-hover:opacity-100 hover:text-red-500 transition-all flex-shrink-0"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="p-3 border-t border-surface-border bg-surface-base/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                  maxLength={500}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || sendingComment}
                  className="p-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create Challenge Form
  if (showCreateForm) {
    return (
      <CreateChallengeForm
        onBack={() => setShowCreateForm(false)}
        onCreate={() => {
          setShowCreateForm(false);
          loadChallenges();
        }}
      />
    );
  }

  // Main Challenges List
  return (
    <div className="min-h-screen bg-surface-base pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-sm border-b border-surface-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Challenges
            </h1>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'joined', 'created'] as ChallengeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-accent text-white'
                    : 'bg-surface-card text-text-secondary hover:bg-surface-border'
                }`}
              >
                {f === 'all' ? 'All' : f === 'joined' ? 'Joined' : 'My Challenges'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No challenges yet</h3>
            <p className="text-sm text-text-muted mb-4">
              {filter === 'created' 
                ? "You haven't created any challenges yet" 
                : filter === 'joined'
                ? "You haven't joined any challenges yet"
                : "Be the first to create a reading challenge!"}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors"
            >
              Create Challenge
            </button>
          </div>
        ) : (
          challenges.map((challenge) => {
            const progress = challenge.my_progress;
            const percentage = progress ? getProgressPercentage(progress.current_value, challenge.target_value) : 0;
            const daysLeft = getDaysRemaining(challenge.end_date);
            const active = isActive(challenge);

            return (
              <button
                key={challenge.id}
                onClick={() => handleSelectChallenge(challenge)}
                className="w-full bg-surface-card border border-surface-border rounded-xl p-4 text-left hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                    {CHALLENGE_TYPE_ICONS[challenge.challenge_type]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary truncate">{challenge.title}</h3>
                      {challenge.is_joined && (
                        <span className="px-1.5 py-0.5 bg-accent/20 text-accent text-xs rounded">Joined</span>
                      )}
                      {!active && (
                        <span className="px-1.5 py-0.5 bg-surface-base text-text-muted text-xs rounded">Ended</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-text-muted mb-2">
                      {CHALLENGE_TYPE_LABELS[challenge.challenge_type]} • {challenge.target_value} {challenge.challenge_type === 'pages_count' ? 'pages' : 'books'}
                    </p>

                    {/* Progress bar for joined challenges */}
                    {challenge.is_joined && progress && (
                      <div className="mb-2">
                        <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              progress.completed 
                                ? 'bg-green-500' 
                                : 'bg-gradient-to-r from-accent to-accent-light'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {challenge.participant_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}
                      </span>
                      {progress && (
                        <span className="flex items-center gap-1 text-accent">
                          <Target className="w-3 h-3" />
                          {progress.current_value}/{challenge.target_value}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

// Create Challenge Form Component
interface CreateChallengeFormProps {
  onBack: () => void;
  onCreate: () => void;
}

const CreateChallengeForm = ({ onBack, onCreate }: CreateChallengeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: 'books_count' as ChallengeType,
    target_value: 10,
    target_genre: '',
    target_author: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_public: true
  });

  const toast = useToastActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (formData.target_value <= 0) {
      toast.error('Target must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const challenge = await communityApi.challenges.createChallenge({
        ...formData,
        target_genre: formData.challenge_type === 'genre' ? formData.target_genre : undefined,
        target_author: formData.challenge_type === 'author' ? formData.target_author : undefined
      });

      if (challenge) {
        toast.success('Challenge created!');
        onCreate();
      } else {
        toast.error('Failed to create challenge');
      }
    } catch (error) {
      toast.error('Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-sm border-b border-surface-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-surface-card rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Create Challenge</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Challenge Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Summer Reading Sprint"
            className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What's this challenge about?"
            rows={3}
            className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          />
        </div>

        {/* Challenge Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Challenge Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CHALLENGE_TYPE_LABELS) as ChallengeType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, challenge_type: type }))}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  formData.challenge_type === type
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-surface-card border-surface-border text-text-secondary hover:border-accent/30'
                }`}
              >
                {CHALLENGE_TYPE_ICONS[type]}
                <span className="text-sm font-medium">{CHALLENGE_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Value */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Target {formData.challenge_type === 'pages_count' ? 'Pages' : 'Books'}
          </label>
          <input
            type="number"
            min={1}
            value={formData.target_value}
            onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {/* Genre (for genre challenges) */}
        {formData.challenge_type === 'genre' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Target Genre
            </label>
            <input
              type="text"
              value={formData.target_genre}
              onChange={(e) => setFormData(prev => ({ ...prev, target_genre: e.target.value }))}
              placeholder="e.g., Fantasy, Mystery, Romance"
              className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        )}

        {/* Author (for author challenges) */}
        {formData.challenge_type === 'author' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Target Author
            </label>
            <input
              type="text"
              value={formData.target_author}
              onChange={(e) => setFormData(prev => ({ ...prev, target_author: e.target.value }))}
              placeholder="e.g., Stephen King"
              className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface-card border border-surface-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between p-3 bg-surface-card border border-surface-border rounded-lg">
          <div>
            <p className="text-sm font-medium text-text-primary">Public Challenge</p>
            <p className="text-xs text-text-muted">Anyone can join and see this challenge</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
            className={`w-11 h-6 rounded-full transition-colors ${
              formData.is_public ? 'bg-accent' : 'bg-surface-border'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-surface-card shadow transform transition-transform ${
              formData.is_public ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Trophy className="w-5 h-5" />
              Create Challenge
            </>
          )}
        </button>
      </form>
    </div>
  );
};

Challenges.displayName = 'Challenges';
