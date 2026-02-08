import { useMemo } from 'react';
import { Book, ReadingStatus, ReadingStreak } from '../types';
import { 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Target, 
  Flame,
  Calendar,
  BarChart3
} from 'lucide-react';

interface AnalyticsProps {
  books: Book[];
  readingStreak?: ReadingStreak;
}

export function Analytics({ books, readingStreak }: AnalyticsProps): React.ReactElement {
  const stats = useMemo(() => {
    const total = books.length;
    const completed = books.filter(b => b.status === ReadingStatus.COMPLETED).length;
    const inProgress = books.filter(b => b.status === ReadingStatus.IN_PROGRESS).length;
    const toRead = books.filter(b => b.status === ReadingStatus.TO_READ).length;

    // This year stats
    const currentYear = new Date().getFullYear();
    const completedThisYear = books.filter(b => {
      if (b.status !== ReadingStatus.COMPLETED || !b.dateFinished) return false;
      return new Date(b.dateFinished).getFullYear() === currentYear;
    }).length;

    // This month stats
    const currentMonth = new Date().getMonth();
    const completedThisMonth = books.filter(b => {
      if (b.status !== ReadingStatus.COMPLETED || !b.dateFinished) return false;
      const date = new Date(b.dateFinished);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;

    // Total reading time
    const totalMinutes = books.reduce((acc, b) => acc + (b.totalReadingMinutes || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);

    // Genre Distribution
    const genres: Record<string, number> = {};
    books.forEach(b => {
      const g = b.genre || 'Uncategorized';
      genres[g] = (genres[g] || 0) + 1;
    });
    const genreData = Object.entries(genres)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Monthly Progress for current year
    const monthlyData: { month: string; count: number; shortMonth: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const count = books.filter(b => {
        if (b.status !== ReadingStatus.COMPLETED || !b.dateFinished) return false;
        const date = new Date(b.dateFinished);
        return date.getFullYear() === currentYear && date.getMonth() === m;
      }).length;
      const date = new Date(currentYear, m, 1);
      monthlyData.push({
        month: date.toLocaleString('default', { month: 'long' }),
        shortMonth: date.toLocaleString('default', { month: 'short' }),
        count
      });
    }

    return { 
      total, 
      completed, 
      inProgress, 
      toRead, 
      completedThisYear,
      completedThisMonth,
      totalHours,
      genreData, 
      monthlyData 
    };
  }, [books]);

  // Generate reading heatmap data (last 12 weeks / ~84 days)
  const heatmapData = useMemo(() => {
    const weeks: { date: Date; hasRead: boolean; level: number }[][] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start from 12 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (12 * 7) - startDate.getDay());
    
    let currentDate = new Date(startDate);
    let currentWeek: { date: Date; hasRead: boolean; level: number }[] = [];
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasRead = readingStreak?.streakHistory?.includes(dateStr) || false;
      
      // Simulate reading intensity (in a real app, this would be based on actual reading time)
      const level = hasRead ? Math.floor(Math.random() * 3) + 1 : 0;
      
      currentWeek.push({
        date: new Date(currentDate),
        hasRead,
        level
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Push remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [readingStreak]);

  // Get the max count for scaling the monthly chart
  const maxMonthlyCount = Math.max(...stats.monthlyData.map(m => m.count), 1);

  // Get heatmap level color
  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-surface-elevated';
      case 1: return 'bg-accent/30';
      case 2: return 'bg-accent/60';
      case 3: return 'bg-accent';
      default: return 'bg-surface-elevated';
    }
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-5 pb-8">
      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-muted">Total Books</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.completed}</p>
              <p className="text-xs text-text-muted">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.totalHours}</p>
              <p className="text-xs text-text-muted">Hours Read</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{readingStreak?.currentStreak || 0}</p>
              <p className="text-xs text-text-muted">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reading Heatmap - GitHub Style */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Reading Activity
          </h3>
          <span className="text-xs text-text-muted">Last 12 weeks</span>
        </div>
        
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1.5 pt-5">
            {weekDays.map((day, i) => (
              <div key={i} className="h-3 text-[9px] text-text-muted flex items-center justify-end pr-1">
                {i % 2 === 1 ? day : ''}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-[3px]">
              {heatmapData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {weekIdx === 0 && (
                    <div className="h-4 text-[9px] text-text-muted text-center">
                      {week[0]?.date.toLocaleString('default', { month: 'short' })}
                    </div>
                  )}
                  {weekIdx !== 0 && week[0]?.date.getDate() <= 7 && (
                    <div className="h-4 text-[9px] text-text-muted text-center">
                      {week[0]?.date.toLocaleString('default', { month: 'short' })}
                    </div>
                  )}
                  {weekIdx !== 0 && week[0]?.date.getDate() > 7 && (
                    <div className="h-4"></div>
                  )}
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.level)} transition-colors`}
                      title={`${day.date.toLocaleDateString()} - ${day.hasRead ? 'Read' : 'No activity'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[10px] text-text-muted mr-1">Less</span>
          <div className="w-3 h-3 rounded-sm bg-surface-elevated" />
          <div className="w-3 h-3 rounded-sm bg-accent/30" />
          <div className="w-3 h-3 rounded-sm bg-accent/60" />
          <div className="w-3 h-3 rounded-sm bg-accent" />
          <span className="text-[10px] text-text-muted ml-1">More</span>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            {new Date().getFullYear()} Progress
          </h3>
          <span className="text-xs text-text-muted">{stats.completedThisYear} books</span>
        </div>
        
        <div className="space-y-2.5">
          {stats.monthlyData.map((month, i) => {
            const isCurrent = i === new Date().getMonth();
            const percentage = maxMonthlyCount > 0 ? (month.count / maxMonthlyCount) * 100 : 0;
            
            return (
              <div key={month.month} className="flex items-center gap-3">
                <span className={`text-xs w-8 ${isCurrent ? 'text-accent font-medium' : 'text-text-muted'}`}>
                  {month.shortMonth}
                </span>
                <div className="flex-1 h-5 bg-surface-elevated rounded-md overflow-hidden">
                  <div 
                    className="h-full rounded-md transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      background: isCurrent 
                        ? 'linear-gradient(90deg, #7C5CFC 0%, #9B8AFB 100%)'
                        : month.count > 0 
                          ? 'rgba(124, 92, 252, 0.4)'
                          : 'transparent'
                    }}
                  />
                </div>
                <span className={`text-xs w-4 text-right ${isCurrent ? 'text-accent font-medium' : 'text-text-muted'}`}>
                  {month.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* This Period Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted">This Month</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.completedThisMonth}</p>
          <p className="text-xs text-text-muted mt-1">books completed</p>
        </div>
        
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted">This Year</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.completedThisYear}</p>
          <p className="text-xs text-text-muted mt-1">books completed</p>
        </div>
      </div>

      {/* Genre Breakdown */}
      {stats.genreData.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            Top Genres
          </h3>
          <div className="space-y-3">
            {stats.genreData.map((genre, i) => {
              const percentage = (genre.value / stats.total) * 100;
              const colors = [
                'from-accent to-accent-light',
                'from-emerald-500 to-emerald-400',
                'from-amber-500 to-amber-400',
                'from-rose-500 to-rose-400',
                'from-blue-500 to-blue-400'
              ];
              
              return (
                <div key={genre.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-text-primary">{genre.name}</span>
                    <span className="text-xs text-text-muted">{genre.value} books</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reading Status Breakdown */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <h3 className="text-base font-semibold text-text-primary mb-4">Library Status</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex h-3 rounded-full overflow-hidden bg-surface-elevated">
              {stats.completed > 0 && (
                <div 
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              )}
              {stats.inProgress > 0 && (
                <div 
                  className="bg-amber-500 h-full"
                  style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                />
              )}
              {stats.toRead > 0 && (
                <div 
                  className="bg-accent h-full"
                  style={{ width: `${(stats.toRead / stats.total) * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-text-muted">Completed ({stats.completed})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-text-muted">Reading ({stats.inProgress})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="text-text-muted">To Read ({stats.toRead})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
