import { ReadingStreak } from '../types';
import { Flame, Calendar, Trophy } from 'lucide-react';

interface StreakTrackerProps {
  streak: ReadingStreak;
}

export function StreakTracker({ streak }: StreakTrackerProps) {
  const today = new Date().toISOString().split('T')[0];
  const hasReadToday = streak.lastReadDate === today;
  
  // Get last 7 days for the mini calendar
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });
  
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const getStreakMessage = () => {
    if (streak.currentStreak === 0) {
      return "Start reading today to begin your streak!";
    }
    if (streak.currentStreak === 1) {
      return "Great start! Keep going tomorrow!";
    }
    if (streak.currentStreak < 7) {
      return `${7 - streak.currentStreak} days until your first week streak!`;
    }
    if (streak.currentStreak < 30) {
      return `${30 - streak.currentStreak} days until monthly master!`;
    }
    return "You're on fire! Keep it up!";
  };

  const getFlameColor = () => {
    if (streak.currentStreak >= 30) return 'text-orange-500';
    if (streak.currentStreak >= 7) return 'text-amber-500';
    if (streak.currentStreak >= 3) return 'text-yellow-500';
    return 'text-slate-400';
  };

  const getFlameSize = () => {
    if (streak.currentStreak >= 30) return 'w-10 h-10';
    if (streak.currentStreak >= 7) return 'w-8 h-8';
    return 'w-6 h-6';
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-5 border border-orange-100 dark:border-orange-800/30">
      {/* Header with streak count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center ${streak.currentStreak > 0 ? 'animate-pulse' : ''}`}>
            <Flame className={`${getFlameSize()} ${getFlameColor()} transition-all`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Reading Streak</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {getStreakMessage()}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-3xl font-bold ${streak.currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
            {streak.currentStreak}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {streak.currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Mini Calendar - Last 7 days */}
      <div className="flex gap-2 justify-between mb-4">
        {last7Days.map((date) => {
          const didRead = streak.streakHistory.includes(date);
          const isToday = date === today;
          const dayIndex = new Date(date).getDay();
          
          return (
            <div key={date} className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted mb-1">
                {dayLabels[dayIndex]}
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  didRead
                    ? 'bg-orange-500 text-white shadow-sm'
                    : isToday
                    ? 'bg-surface-card border-2 border-dashed border-orange-300 dark:border-orange-700 text-text-secondary'
                    : 'bg-surface-base text-text-muted'
                }`}
              >
                {new Date(date).getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 pt-3 border-t border-orange-200/50 dark:border-orange-800/30">
        <div className="flex items-center gap-2 flex-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {streak.longestStreak}
            </div>
            <div className="text-xs text-text-muted">Best Streak</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-brand-500" />
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {streak.streakHistory.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Days Read</div>
          </div>
        </div>
        
        {!hasReadToday && streak.currentStreak > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <Flame className="w-3 h-3" />
            Read today to keep streak!
          </div>
        )}
      </div>
    </div>
  );
}

export default StreakTracker;
