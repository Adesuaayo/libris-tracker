import { memo } from 'react';
import { 
  BookOpen, 
  Flame, 
  Plus, 
  Library, 
  Target, 
  BarChart3, 
  Trophy,
  ChevronRight,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { Book, ReadingStatus, ReadingStreak, Achievement } from '../types';
import { PullToRefresh } from './PullToRefresh';
import { DailyReadingPrompt } from './DailyReadingPrompt';

interface HomeDashboardProps {
  books: Book[];
  readingStreak: ReadingStreak;
  unlockedAchievements: Achievement[];
  readingGoal: number;
  theme: 'light' | 'dark' | 'system';
  username?: string;
  onToggleTheme: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToAnalytics: () => void;
  onNavigateToGoals: () => void;
  onAddBook: () => void;
  onSelectBook: (book: Book) => void;
  onRefresh?: () => Promise<void>;
}

export const HomeDashboard = memo<HomeDashboardProps>(({
  books,
  readingStreak,
  unlockedAchievements,
  readingGoal,
  theme,
  username,
  onToggleTheme,
  onNavigateToLibrary,
  onNavigateToAnalytics,
  onNavigateToGoals,
  onAddBook,
  onSelectBook,
  onRefresh
}) => {
  // Get currently reading books
  const currentlyReading = books.filter(b => b.status === ReadingStatus.IN_PROGRESS);
  const continueBook = currentlyReading[0];
  
  // Calculate books completed this year
  const currentYear = new Date().getFullYear();
  const booksThisYear = books.filter(b => {
    if (b.status !== ReadingStatus.COMPLETED || !b.dateFinished) return false;
    return new Date(b.dateFinished).getFullYear() === currentYear;
  }).length;
  
  // Get last 7 days reading activity
  const getLast7DaysActivity = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const hasRead = readingStreak.streakHistory?.includes(dateStr) || false;
      days.push({
        day: date.toLocaleDateString('en', { weekday: 'short' })[0],
        hasRead,
        isToday: i === 0
      });
    }
    return days;
  };
  
  const weekActivity = getLast7DaysActivity();
  const daysReadThisWeek = weekActivity.filter(d => d.hasRead).length;
  
  // Get most recent unlocked achievement
  const recentAchievement = unlockedAchievements[unlockedAchievements.length - 1];
  
  // Calculate reading progress for continue book
  const getReadingProgress = (book: Book) => {
    if (book.currentPage && book.totalPages) {
      return Math.round((book.currentPage / book.totalPages) * 100);
    }
    return 0;
  };

  const goalProgress = Math.min((booksThisYear / readingGoal) * 100, 100);

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const content = (
    <div className="max-w-2xl mx-auto p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center shadow-lg" style={{ boxShadow: '0 8px 24px rgba(124, 92, 252, 0.35)' }}>
              <BookOpen className="text-white h-5 w-5" />
            </div>
            <div>
              {username ? (
                <>
                  <p className="text-sm text-text-muted">Welcome back,</p>
                  <h1 className="text-xl font-bold text-text-primary">{username}</h1>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-text-primary">Libris</h1>
                  <p className="text-xs text-text-muted">Track your reading journey</p>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-surface-card border border-surface-border hover:bg-surface-elevated transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-accent" />
            ) : (
              <Moon className="w-5 h-5 text-text-secondary" />
            )}
          </button>
        </div>
          
        {/* Streak Banner - Premium Glass Effect */}
        <div 
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.15) 0%, rgba(155, 138, 251, 0.08) 100%)',
              border: '1px solid rgba(124, 92, 252, 0.2)'
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center" style={{ boxShadow: '0 4px 20px rgba(124, 92, 252, 0.4)' }}>
                  <Flame className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-text-muted text-sm font-medium">Current Streak</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-text-primary">{readingStreak.currentStreak}</span>
                    <span className="text-text-secondary text-sm">days</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs">Personal Best</p>
                <p className="text-accent font-semibold">{readingStreak.longestStreak} days</p>
                {readingStreak.currentStreak > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-xs">On fire!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Continue Reading Card */}
        {continueBook && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                Continue Reading
              </h2>
            </div>
            <button
              onClick={() => onSelectBook(continueBook)}
              className="w-full bg-surface-card border border-surface-border rounded-2xl p-4 hover:border-accent/30 transition-all text-left group"
            >
              <div className="flex gap-4">
                {continueBook.coverUrl ? (
                  <img 
                    src={continueBook.coverUrl} 
                    alt={continueBook.title}
                    className="w-16 h-24 object-cover rounded-xl shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-24 bg-surface-elevated rounded-xl flex items-center justify-center border border-surface-border">
                    <BookOpen className="w-6 h-6 text-text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                    {continueBook.title}
                  </h3>
                  <p className="text-text-muted text-sm truncate">{continueBook.author}</p>
                  
                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                      <span>{continueBook.currentPage || 0} of {continueBook.totalPages || '?'} pages</span>
                      <span className="font-medium text-accent">{getReadingProgress(continueBook)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${getReadingProgress(continueBook)}%`,
                          background: 'linear-gradient(90deg, #7C5CFC 0%, #9B8AFB 100%)'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2.5 flex items-center text-accent font-medium text-xs">
                    Resume Reading
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* No book currently reading */}
        {!continueBook && (
          <section className="mb-5">
            <button
              onClick={onAddBook}
              className="w-full bg-surface-card rounded-2xl p-5 border border-dashed border-accent/30 hover:border-accent/50 hover:bg-surface-elevated transition-all"
            >
              <div className="text-center">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Start Your Next Book</h3>
                <p className="text-sm text-text-muted">Add a book to begin your reading journey</p>
              </div>
            </button>
          </section>
        )}

        {/* Daily Reading Prompt */}
        <DailyReadingPrompt
          books={books}
          readingStreak={readingStreak}
          onSelectBook={onSelectBook}
          onNavigateToLibrary={onNavigateToLibrary}
        />

        {/* Quick Actions */}
        <section className="mb-5">
          <h2 className="text-base font-semibold text-text-primary mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2.5">
            <button
              onClick={onAddBook}
              className="flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 rounded-xl hover:border-accent/50 hover:from-accent/30 hover:to-accent/20 transition-all group"
            >
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 12px rgba(124, 92, 252, 0.3)' }}>
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-accent">Add Book</span>
            </button>
            <button
              onClick={onNavigateToLibrary}
              className="flex flex-col items-center gap-2 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-blue-500/30 hover:bg-surface-elevated transition-all group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Library className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[11px] font-medium text-text-secondary">Library</span>
            </button>
            <button
              onClick={onNavigateToGoals}
              className="flex flex-col items-center gap-2 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-emerald-500/30 hover:bg-surface-elevated transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[11px] font-medium text-text-secondary">Goals</span>
            </button>
            <button
              onClick={onNavigateToAnalytics}
              className="flex flex-col items-center gap-2 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-accent/30 hover:bg-surface-elevated transition-all group"
            >
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <span className="text-[11px] font-medium text-text-secondary">Stats</span>
            </button>
          </div>
        </section>

        {/* This Week Activity */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text-primary">This Week</h2>
            <span className="text-xs text-text-muted bg-surface-card px-2 py-1 rounded-md">{daysReadThisWeek}/7 days</span>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <div className="flex justify-between items-end gap-1">
              {weekActivity.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div 
                    className={`w-full max-w-[36px] h-14 rounded-lg flex items-end justify-center pb-1.5 transition-all ${
                      day.hasRead 
                        ? '' 
                        : day.isToday 
                          ? 'bg-surface-elevated border border-dashed border-accent/40' 
                          : 'bg-surface-elevated'
                    }`}
                    style={day.hasRead ? {
                      background: 'linear-gradient(180deg, #9B8AFB 0%, #7C5CFC 100%)',
                      boxShadow: '0 4px 12px rgba(124, 92, 252, 0.3)'
                    } : {}}
                  >
                    {day.hasRead && <Flame className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    day.isToday 
                      ? 'text-accent' 
                      : 'text-text-muted'
                  }`}>
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reading Goal Progress */}
        <section className="mb-5">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Yearly Goal</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-text-primary">{booksThisYear}</span>
                  <span className="text-text-muted text-sm">/ {readingGoal} books</span>
                </div>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="none"
                    className="text-surface-elevated"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="url(#progressGradient)"
                    strokeWidth="5"
                    fill="none"
                    strokeDasharray={`${goalProgress * 1.63} 163`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7C5CFC" />
                      <stop offset="100%" stopColor="#9B8AFB" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">{Math.round(goalProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Achievement */}
        {recentAchievement && (
          <section className="mb-5">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Latest Achievement
            </h2>
            <div 
              className="rounded-2xl p-4 border"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
                borderColor: 'rgba(251, 191, 36, 0.15)'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{recentAchievement.icon}</div>
                <div>
                  <h3 className="font-semibold text-text-primary">{recentAchievement.name}</h3>
                  <p className="text-sm text-text-muted">{recentAchievement.description}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Stats Summary */}
        <section>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 text-center">
              <p className="text-2xl font-bold text-text-primary">{books.length}</p>
              <p className="text-[10px] text-text-muted mt-0.5">Total Books</p>
            </div>
            <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 text-center">
              <p className="text-2xl font-bold text-accent">{booksThisYear}</p>
              <p className="text-[10px] text-text-muted mt-0.5">This Year</p>
            </div>
            <div className="bg-surface-card border border-surface-border rounded-xl p-3.5 text-center">
              <p className="text-2xl font-bold text-text-primary">{currentlyReading.length}</p>
              <p className="text-[10px] text-text-muted mt-0.5">Reading</p>
            </div>
          </div>
        </section>
      </div>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-surface-base pb-24">
      {content}
    </PullToRefresh>
  );
});

HomeDashboard.displayName = 'HomeDashboard';
