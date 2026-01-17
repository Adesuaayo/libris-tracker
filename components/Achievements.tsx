import { useState } from 'react';
import { Achievement, ACHIEVEMENTS } from '../types';
import { Trophy, Lock, ChevronRight, X } from 'lucide-react';

interface AchievementsProps {
  unlockedAchievements: Achievement[];
  totalBooks: number;
  currentStreak: number;
  totalReadingMinutes: number;
  totalNotes: number;
  totalQuotes: number;
  uniqueGenres: number;
}

// Enriched achievement type with computed progress
type EnrichedAchievement = Achievement & {
  unlocked: boolean;
  current: number;
  percentage: number;
};

export function Achievements({
  unlockedAchievements,
  totalBooks,
  currentStreak,
  totalReadingMinutes,
  totalNotes,
  totalQuotes,
  uniqueGenres
}: AchievementsProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<EnrichedAchievement | null>(null);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.id));
  
  // Calculate progress for each achievement
  const getProgress = (achievement: typeof ACHIEVEMENTS[0]): { current: number; target: number; percentage: number } => {
    let current = 0;
    const target = achievement.target || 1;
    
    switch (achievement.id) {
      case 'first_book':
      case 'bookworm_5':
      case 'bibliophile_25':
      case 'century_reader_100':
        current = totalBooks;
        break;
      case 'streak_7':
      case 'streak_30':
      case 'streak_100':
        current = currentStreak;
        break;
      case 'genre_explorer_5':
      case 'genre_master_10':
        current = uniqueGenres;
        break;
      case 'marathon_reader':
        current = totalReadingMinutes;
        break;
      case 'note_taker_10':
        current = totalNotes + totalQuotes;
        break;
      case 'quote_collector_25':
        current = totalQuotes;
        break;
      default:
        current = 0;
    }
    
    return {
      current,
      target,
      percentage: Math.min(100, Math.round((current / target) * 100))
    };
  };

  const achievementsWithProgress = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
    unlockedAt: unlockedAchievements.find(ua => ua.id === a.id)?.unlockedAt,
    ...getProgress(a)
  }));

  const unlockedCount = achievementsWithProgress.filter(a => a.unlocked).length;
  const displayAchievements = showAll 
    ? achievementsWithProgress 
    : achievementsWithProgress.filter(a => a.unlocked || a.percentage > 0).slice(0, 6);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Achievements</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unlockedCount} of {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          {showAll ? 'Show less' : 'View all'}
          <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-3 gap-3">
        {displayAchievements.map(achievement => (
          <button
            key={achievement.id}
            onClick={() => setSelectedAchievement(achievement)}
            className={`relative p-3 rounded-xl border-2 transition-all ${
              achievement.unlocked
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800/50'
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="text-2xl mb-1">{achievement.icon}</div>
            <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
              {achievement.name}
            </div>
            
            {!achievement.unlocked && achievement.target && (
              <div className="mt-1.5">
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-400 rounded-full"
                    style={{ width: `${achievement.percentage}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {achievement.current}/{achievement.target}
                </div>
              </div>
            )}
            
            {!achievement.unlocked && !achievement.target && (
              <Lock className="absolute top-2 right-2 w-3 h-3 text-slate-400" />
            )}
            
            {achievement.unlocked && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAchievement(null)}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedAchievement(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            
            <div className="text-center">
              <div className={`text-6xl mb-4 ${selectedAchievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                {selectedAchievement.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {selectedAchievement.name}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {selectedAchievement.description}
              </p>
              
              {selectedAchievement.unlocked ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                  <Trophy className="w-4 h-4" />
                  Unlocked {selectedAchievement.unlockedAt 
                    ? new Date(selectedAchievement.unlockedAt).toLocaleDateString() 
                    : ''}
                </div>
              ) : selectedAchievement.target ? (
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full"
                      style={{ width: `${selectedAchievement.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    {selectedAchievement.current} / {selectedAchievement.target} ({selectedAchievement.percentage}%)
                  </p>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-sm">
                  <Lock className="w-4 h-4" />
                  Locked
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Achievements;
