import { useMemo, useState } from 'react';
import { Book, ReadingSession, ReadingStatus } from '../types';
import { 
  BarChart3, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Zap,
  PieChart,
  Sun,
  Moon,
  Sunrise,
  Sunset
} from 'lucide-react';

interface ReadingInsightsProps {
  books: Book[];
  readingSessions: ReadingSession[];
}

export function ReadingInsights({ books, readingSessions }: ReadingInsightsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'patterns'>('overview');

  // Calculate all analytics
  const analytics = useMemo(() => {
    const completedBooks = books.filter(b => b.status === ReadingStatus.COMPLETED);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Basic stats
    const totalBooksRead = completedBooks.length;
    const totalPagesRead = books.reduce((sum, b) => sum + (b.totalPages || 0), 0);
    const totalReadingMinutes = readingSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    
    // Average rating
    const ratedBooks = completedBooks.filter(b => b.rating);
    const averageRating = ratedBooks.length > 0 
      ? ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length 
      : 0;

    // Time-based stats
    const booksThisYear = completedBooks.filter(b => 
      b.dateFinished && new Date(b.dateFinished).getFullYear() === currentYear
    ).length;
    
    const booksThisMonth = completedBooks.filter(b => {
      if (!b.dateFinished) return false;
      const date = new Date(b.dateFinished);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;

    // Average completion time
    const booksWithDates = completedBooks.filter(b => b.dateStarted && b.dateFinished);
    const avgCompletionDays = booksWithDates.length > 0
      ? booksWithDates.reduce((sum, b) => {
          const start = new Date(b.dateStarted!);
          const end = new Date(b.dateFinished!);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / booksWithDates.length
      : 0;

    // Session stats
    const avgMinutesPerSession = readingSessions.length > 0
      ? totalReadingMinutes / readingSessions.length
      : 0;
    const longestSession = readingSessions.length > 0
      ? Math.max(...readingSessions.map(s => s.durationMinutes))
      : 0;

    // Reading time patterns
    const sessionsByHour: Record<number, number> = {};
    readingSessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
    });

    let preferredTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied' = 'varied';
    if (readingSessions.length > 0) {
      const morning = [5, 6, 7, 8, 9, 10, 11].reduce((sum, h) => sum + (sessionsByHour[h] || 0), 0);
      const afternoon = [12, 13, 14, 15, 16, 17].reduce((sum, h) => sum + (sessionsByHour[h] || 0), 0);
      const evening = [18, 19, 20, 21, 22].reduce((sum, h) => sum + (sessionsByHour[h] || 0), 0);
      const night = [23, 0, 1, 2, 3, 4].reduce((sum, h) => sum + (sessionsByHour[h] || 0), 0);
      
      const max = Math.max(morning, afternoon, evening, night);
      const total = morning + afternoon + evening + night;
      
      if (max / total >= 0.4) {
        if (max === morning) preferredTime = 'morning';
        else if (max === afternoon) preferredTime = 'afternoon';
        else if (max === evening) preferredTime = 'evening';
        else preferredTime = 'night';
      }
    }

    // Most productive day
    const sessionsByDay: Record<number, number> = {};
    readingSessions.forEach(s => {
      const day = new Date(s.startTime).getDay();
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
    });
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostProductiveDay = readingSessions.length > 0
      ? days[Object.entries(sessionsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] as unknown as number] || 'N/A'
      : 'N/A';

    // Genre analysis
    const genreCounts: Record<string, number> = {};
    completedBooks.forEach(b => {
      if (b.genre) {
        genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
      }
    });
    
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / totalBooksRead) * 100) || 0
      }));

    const uniqueGenres = new Set(completedBooks.map(b => b.genre).filter(Boolean)).size;
    const genreDiversity = Math.min(100, uniqueGenres * 10);

    // Monthly trends (last 6 months)
    const monthlyBooks: { month: string; count: number; year: number }[] = [];
    const monthlyMinutes: { month: string; minutes: number; year: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const booksInMonth = completedBooks.filter(b => {
        if (!b.dateFinished) return false;
        const d = new Date(b.dateFinished);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length;
      
      const minutesInMonth = readingSessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum, s) => sum + s.durationMinutes, 0);
      
      monthlyBooks.push({ month: monthNames[month], count: booksInMonth, year });
      monthlyMinutes.push({ month: monthNames[month], minutes: minutesInMonth, year });
    }

    // Average pages per day (based on sessions)
    const uniqueDays = new Set(readingSessions.map(s => s.date)).size;
    const avgPagesPerDay = uniqueDays > 0 ? Math.round(totalPagesRead / uniqueDays) : 0;

    return {
      totalBooksRead,
      totalPagesRead,
      totalReadingMinutes,
      averageRating,
      booksThisYear,
      booksThisMonth,
      averageCompletionDays: Math.round(avgCompletionDays),
      averagePagesPerDay: avgPagesPerDay,
      averageMinutesPerSession: Math.round(avgMinutesPerSession),
      longestSession,
      preferredReadingTime: preferredTime,
      mostProductiveDay,
      topGenres,
      genreDiversity,
      monthlyBooks,
      monthlyMinutes,
    };
  }, [books, readingSessions]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTimeIcon = (time: string) => {
    switch (time) {
      case 'morning': return <Sunrise className="w-5 h-5 text-orange-500" />;
      case 'afternoon': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'evening': return <Sunset className="w-5 h-5 text-purple-500" />;
      case 'night': return <Moon className="w-5 h-5 text-indigo-500" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const maxMonthlyBooks = Math.max(...analytics.monthlyBooks.map(m => m.count), 1);
  const maxMonthlyMinutes = Math.max(...analytics.monthlyMinutes.map(m => m.minutes), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header with tabs */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reading Insights</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your reading analytics</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {(['overview', 'trends', 'patterns'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Books Read</span>
                </div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                  {analytics.totalBooksRead}
                </div>
                <div className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-1">
                  {analytics.booksThisYear} this year
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Reading Time</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatTime(analytics.totalReadingMinutes)}
                </div>
                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                  {formatTime(analytics.averageMinutesPerSession)} avg/session
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Avg Rating</span>
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : '—'}
                </div>
                <div className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                  ⭐ out of 5
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Completion</span>
                </div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {analytics.averageCompletionDays > 0 ? analytics.averageCompletionDays : '—'}
                </div>
                <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                  days avg per book
                </div>
              </div>
            </div>

            {/* Longest Session & Best Day */}
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Longest Session</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatTime(analytics.longestSession)}
                </div>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Best Day</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {analytics.mostProductiveDay}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            {/* Books per Month Chart */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                Books Completed
              </h3>
              <div className="flex items-end gap-2 h-32">
                {analytics.monthlyBooks.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <span className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                        {m.count > 0 ? m.count : ''}
                      </span>
                      <div 
                        className="w-full bg-gradient-to-t from-brand-500 to-brand-400 rounded-t-md transition-all"
                        style={{ height: `${(m.count / maxMonthlyBooks) * 100}%`, minHeight: m.count > 0 ? '4px' : '2px' }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Minutes Chart */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Reading Time
              </h3>
              <div className="flex items-end gap-2 h-32">
                {analytics.monthlyMinutes.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                        {m.minutes > 0 ? formatTime(m.minutes) : ''}
                      </span>
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all"
                        style={{ height: `${(m.minutes / maxMonthlyMinutes) * 100}%`, minHeight: m.minutes > 0 ? '4px' : '2px' }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-5">
            {/* Preferred Reading Time */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    Preferred Reading Time
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                    {getTimeIcon(analytics.preferredReadingTime)}
                    {analytics.preferredReadingTime}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Most Active</div>
                  <div className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                    {analytics.mostProductiveDay}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Genres */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                Top Genres
              </h3>
              {analytics.topGenres.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topGenres.map((g, i) => (
                    <div key={g.genre} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{g.genre}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{g.count} books</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${g.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                  <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Complete some books to see genre insights</p>
                </div>
              )}
            </div>

            {/* Genre Diversity Score */}
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900 dark:text-white">Genre Diversity</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {analytics.genreDiversity}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${analytics.genreDiversity}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Based on the variety of genres you've read
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
