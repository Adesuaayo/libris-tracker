import { memo, useMemo } from 'react';
import { BookOpen, Flame, Clock, ChevronRight, Sparkles, Coffee } from 'lucide-react';
import { Book, ReadingStatus, ReadingStreak } from '../types';

interface DailyReadingPromptProps {
  books: Book[];
  readingStreak: ReadingStreak;
  onSelectBook: (book: Book) => void;
  onNavigateToLibrary: () => void;
}

export const DailyReadingPrompt = memo<DailyReadingPromptProps>(({
  books,
  readingStreak,
  onSelectBook,
  onNavigateToLibrary
}) => {
  const today = new Date().toISOString().split('T')[0];
  const hasReadToday = readingStreak.streakHistory?.includes(today) || false;

  // Get currently reading books sorted by most recently started
  const currentlyReading = useMemo(() =>
    books
      .filter(b => b.status === ReadingStatus.IN_PROGRESS)
      .sort((a, b) => {
        const aDate = a.dateStarted ? new Date(a.dateStarted).getTime() : a.addedAt;
        const bDate = b.dateStarted ? new Date(b.dateStarted).getTime() : b.addedAt;
        return bDate - aDate;
      }),
    [books]
  );

  const continueBook = currentlyReading[0];

  // Build contextual prompt message
  const prompt = useMemo(() => {
    // If already read today, show encouragement
    if (hasReadToday) {
      if (continueBook) {
        const progress = continueBook.currentPage && continueBook.totalPages
          ? Math.round((continueBook.currentPage / continueBook.totalPages) * 100)
          : 0;
        const pagesLeft = continueBook.totalPages
          ? continueBook.totalPages - (continueBook.currentPage || 0)
          : null;

        if (pagesLeft !== null && pagesLeft <= 50 && pagesLeft > 0) {
          return {
            icon: <Sparkles className="w-4 h-4 text-amber-400" />,
            text: `Only ${pagesLeft} pages left in ${continueBook.title}—finish it today!`,
            subtext: `${progress}% complete`,
            type: 'finish' as const,
          };
        }
        return {
          icon: <Coffee className="w-4 h-4 text-emerald-400" />,
          text: `Great job reading today! Keep the momentum going.`,
          subtext: `${readingStreak.currentStreak} day streak 🔥`,
          type: 'done' as const,
        };
      }
      return {
        icon: <Coffee className="w-4 h-4 text-emerald-400" />,
        text: `You've read today—well done!`,
        subtext: `${readingStreak.currentStreak} day streak`,
        type: 'done' as const,
      };
    }

    // Haven't read today — urgency varies by streak status
    if (readingStreak.currentStreak > 0) {
      // Streak at risk
      if (continueBook) {
        const pagesLeft = continueBook.totalPages
          ? continueBook.totalPages - (continueBook.currentPage || 0)
          : null;
        if (pagesLeft !== null && pagesLeft <= 30 && pagesLeft > 0) {
          return {
            icon: <Sparkles className="w-4 h-4 text-amber-400" />,
            text: `Just ${pagesLeft} pages to finish ${continueBook.title}—and keep your streak!`,
            subtext: `${readingStreak.currentStreak} day streak at risk`,
            type: 'urgent' as const,
          };
        }
        return {
          icon: <Flame className="w-4 h-4 text-orange-400" />,
          text: `Read 10 pages of ${continueBook.title} to keep your streak.`,
          subtext: `${readingStreak.currentStreak} day streak—don't break it!`,
          type: 'streak' as const,
        };
      }
      return {
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        text: `Read a few pages today to keep your ${readingStreak.currentStreak}-day streak alive.`,
        subtext: 'Pick up any book to continue',
        type: 'streak' as const,
      };
    }

    // No streak — gentle nudge
    if (continueBook) {
      const progress = continueBook.currentPage && continueBook.totalPages
        ? Math.round((continueBook.currentPage / continueBook.totalPages) * 100)
        : 0;
      return {
        icon: <BookOpen className="w-4 h-4 text-accent" />,
        text: `Continue ${continueBook.title}?`,
        subtext: progress > 0 ? `You're ${progress}% through` : 'Pick up where you left off',
        type: 'continue' as const,
      };
    }

    return {
      icon: <Clock className="w-4 h-4 text-accent" />,
      text: `Start a book today and begin your reading streak!`,
      subtext: 'Even 10 minutes counts',
      type: 'start' as const,
    };
  }, [hasReadToday, continueBook, readingStreak.currentStreak, readingStreak.streakHistory]);

  // Style the pill border based on urgency
  const borderStyle = useMemo(() => {
    switch (prompt.type) {
      case 'urgent':
        return 'border-amber-400/40 bg-amber-500/5';
      case 'streak':
        return 'border-orange-400/30 bg-orange-500/5';
      case 'finish':
        return 'border-amber-400/30 bg-amber-500/5';
      case 'done':
        return 'border-emerald-400/25 bg-emerald-500/5';
      default:
        return 'border-accent/20 bg-accent/5';
    }
  }, [prompt.type]);

  const handlePress = () => {
    if (continueBook) {
      onSelectBook(continueBook);
    } else {
      onNavigateToLibrary();
    }
  };

  return (
    <section className="mb-5">
      <button
        onClick={handlePress}
        className={`w-full rounded-2xl border px-4 py-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-left ${borderStyle}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {prompt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary leading-snug">
              {prompt.text}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {prompt.subtext}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
        </div>
      </button>
    </section>
  );
});

DailyReadingPrompt.displayName = 'DailyReadingPrompt';
