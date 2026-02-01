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
  Moon
} from 'lucide-react';
import { Book, ReadingStatus, ReadingStreak, Achievement } from '../types';

interface HomeDashboardProps {
  books: Book[];
  readingStreak: ReadingStreak;
  unlockedAchievements: Achievement[];
  readingGoal: number;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToAnalytics: () => void;
  onNavigateToGoals: () => void;
  onAddBook: () => void;
  onSelectBook: (book: Book) => void;
}

export const HomeDashboard = memo<HomeDashboardProps>(({
  books,
  readingStreak,
  unlockedAchievements,
  readingGoal,
  theme,
  onToggleTheme,
  onNavigateToLibrary,
  onNavigateToAnalytics,
  onNavigateToGoals,
  onAddBook,
  onSelectBook
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

  return (
    <div className="min-h-screen bg-warm-cream dark:bg-charcoal pb-24">
      <div className="max-w-2xl mx-auto p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        
        {/* Header with Streak */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-coral to-coral-dark rounded-2xl flex items-center justify-center shadow-lg shadow-coral/30">
                <BookOpen className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal dark:text-warm-cream">Libris</h1>
                <p className="text-sm text-charcoal/60 dark:text-warm-cream/60">Your reading companion</p>
              </div>
            </div>
            <button 
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl bg-white dark:bg-charcoal-light hover:bg-warm-cream-dark dark:hover:bg-charcoal-lighter transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-coral" />
              ) : (
                <Moon className="w-5 h-5 text-charcoal/70" />
              )}
            </button>
          </div>
          
          {/* Streak Banner */}
          <div className="bg-gradient-to-r from-coral to-coral-dark rounded-2xl p-4 text-white shadow-lg shadow-coral/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Flame className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Current Streak</p>
                  <p className="text-3xl font-bold">{readingStreak.currentStreak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">Best: {readingStreak.longestStreak} days</p>
                <p className="text-white/90 text-sm mt-1">
                  {readingStreak.currentStreak > 0 ? "You're on fire! 🔥" : "Start reading today!"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Continue Reading Card */}
        {continueBook && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-charcoal dark:text-warm-cream flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-coral" />
                Continue Reading
              </h2>
            </div>
            <button
              onClick={() => onSelectBook(continueBook)}
              className="w-full bg-white dark:bg-charcoal-light rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <div className="flex gap-4">
                {continueBook.coverUrl ? (
                  <img 
                    src={continueBook.coverUrl} 
                    alt={continueBook.title}
                    className="w-20 h-28 object-cover rounded-xl shadow-md"
                  />
                ) : (
                  <div className="w-20 h-28 bg-coral/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-coral/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-charcoal dark:text-warm-cream text-lg truncate group-hover:text-coral transition-colors">
                    {continueBook.title}
                  </h3>
                  <p className="text-charcoal/60 dark:text-warm-cream/60 text-sm truncate">{continueBook.author}</p>
                  
                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-charcoal/60 dark:text-warm-cream/60 mb-1.5">
                      <span>{continueBook.currentPage || 0} of {continueBook.totalPages || '?'} pages</span>
                      <span className="font-medium text-coral">{getReadingProgress(continueBook)}%</span>
                    </div>
                    <div className="h-2 bg-charcoal/10 dark:bg-warm-cream/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-coral to-coral-dark rounded-full transition-all"
                        style={{ width: `${getReadingProgress(continueBook)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center text-coral font-medium text-sm">
                    Continue Reading
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* No book currently reading */}
        {!continueBook && (
          <section className="mb-6">
            <button
              onClick={onAddBook}
              className="w-full bg-white dark:bg-charcoal-light rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-dashed border-coral/30 hover:border-coral/50"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-coral/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-8 h-8 text-coral" />
                </div>
                <h3 className="font-semibold text-charcoal dark:text-warm-cream mb-1">Start Your Next Book</h3>
                <p className="text-sm text-charcoal/60 dark:text-warm-cream/60">Add a book to begin your reading journey</p>
              </div>
            </button>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-charcoal dark:text-warm-cream mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={onAddBook}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-charcoal-light rounded-xl hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-coral/10 rounded-xl flex items-center justify-center group-hover:bg-coral/20 transition-colors">
                <Plus className="w-5 h-5 text-coral" />
              </div>
              <span className="text-xs font-medium text-charcoal/70 dark:text-warm-cream/70">Add Book</span>
            </button>
            <button
              onClick={onNavigateToLibrary}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-charcoal-light rounded-xl hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Library className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-charcoal/70 dark:text-warm-cream/70">Library</span>
            </button>
            <button
              onClick={onNavigateToGoals}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-charcoal-light rounded-xl hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium text-charcoal/70 dark:text-warm-cream/70">Goals</span>
            </button>
            <button
              onClick={onNavigateToAnalytics}
              className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-charcoal-light rounded-xl hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium text-charcoal/70 dark:text-warm-cream/70">Stats</span>
            </button>
          </div>
        </section>

        {/* This Week Activity */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-charcoal dark:text-warm-cream">This Week</h2>
            <span className="text-sm text-charcoal/60 dark:text-warm-cream/60">{daysReadThisWeek}/7 days</span>
          </div>
          <div className="bg-white dark:bg-charcoal-light rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-end">
              {weekActivity.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-8 h-16 rounded-lg flex items-end justify-center pb-1 transition-colors ${
                      day.hasRead 
                        ? 'bg-gradient-to-t from-coral to-coral-light' 
                        : day.isToday 
                          ? 'bg-charcoal/10 dark:bg-warm-cream/10 border-2 border-dashed border-coral/50' 
                          : 'bg-charcoal/5 dark:bg-warm-cream/5'
                    }`}
                  >
                    {day.hasRead && <Flame className="w-4 h-4 text-white" />}
                  </div>
                  <span className={`text-xs font-medium ${
                    day.isToday 
                      ? 'text-coral' 
                      : 'text-charcoal/50 dark:text-warm-cream/50'
                  }`}>
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reading Progress */}
        <section className="mb-6">
          <div className="bg-white dark:bg-charcoal-light rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-charcoal/60 dark:text-warm-cream/60">Yearly Goal Progress</p>
                <p className="text-2xl font-bold text-charcoal dark:text-warm-cream">
                  {booksThisYear} <span className="text-base font-normal text-charcoal/50 dark:text-warm-cream/50">/ {readingGoal} books</span>
                </p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-charcoal/10 dark:text-warm-cream/10"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(booksThisYear / readingGoal) * 176} 176`}
                    strokeLinecap="round"
                    className="text-coral"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-coral">{Math.round((booksThisYear / readingGoal) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Achievement */}
        {recentAchievement && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-charcoal dark:text-warm-cream mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Latest Achievement
            </h2>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-700/30">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{recentAchievement.icon}</div>
                <div>
                  <h3 className="font-semibold text-charcoal dark:text-warm-cream">{recentAchievement.name}</h3>
                  <p className="text-sm text-charcoal/60 dark:text-warm-cream/60">{recentAchievement.description}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Stats Summary */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-charcoal-light rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-charcoal dark:text-warm-cream">{books.length}</p>
              <p className="text-xs text-charcoal/60 dark:text-warm-cream/60">Total Books</p>
            </div>
            <div className="bg-white dark:bg-charcoal-light rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-coral">{booksThisYear}</p>
              <p className="text-xs text-charcoal/60 dark:text-warm-cream/60">This Year</p>
            </div>
            <div className="bg-white dark:bg-charcoal-light rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-charcoal dark:text-warm-cream">{currentlyReading.length}</p>
              <p className="text-xs text-charcoal/60 dark:text-warm-cream/60">Reading</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

HomeDashboard.displayName = 'HomeDashboard';
