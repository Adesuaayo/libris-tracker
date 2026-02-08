import { useState } from 'react';
import { ReadingGoal } from '../types';
import { Button } from './Button';
import { Target, Trophy, Edit2, Check, X, TrendingUp } from 'lucide-react';

interface ReadingGoalsProps {
  goals: ReadingGoal[];
  completedBooks: number;
  completedThisMonth: number;
  onUpdateGoal: (goal: ReadingGoal) => void;
  onCreateGoal: (goal: Omit<ReadingGoal, 'id' | 'createdAt' | 'progress'>) => void;
}

export function ReadingGoals({
  goals,
  completedBooks,
  completedThisMonth,
  onUpdateGoal,
  onCreateGoal
}: ReadingGoalsProps) {
  const [isEditing, setIsEditing] = useState<'yearly' | 'monthly' | null>(null);
  const [editValue, setEditValue] = useState('');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const yearlyGoal = goals.find(g => g.type === 'yearly' && g.year === currentYear);
  const monthlyGoal = goals.find(g => g.type === 'monthly' && g.year === currentYear && g.month === currentMonth);

  const handleStartEdit = (type: 'yearly' | 'monthly') => {
    const goal = type === 'yearly' ? yearlyGoal : monthlyGoal;
    setEditValue(goal ? goal.target.toString() : '');
    setIsEditing(type);
  };

  const handleSave = () => {
    const target = parseInt(editValue);
    if (!target || target < 1) {
      setIsEditing(null);
      return;
    }

    if (isEditing === 'yearly') {
      if (yearlyGoal) {
        onUpdateGoal({ ...yearlyGoal, target });
      } else {
        onCreateGoal({ type: 'yearly', target, year: currentYear });
      }
    } else if (isEditing === 'monthly') {
      if (monthlyGoal) {
        onUpdateGoal({ ...monthlyGoal, target });
      } else {
        onCreateGoal({ type: 'monthly', target, year: currentYear, month: currentMonth });
      }
    }
    setIsEditing(null);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-brand-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-surface-border';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-4">
      {/* Yearly Goal */}
      <div className="bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-brand-100 dark:border-brand-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/50">
              <Target className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{currentYear} Reading Goal</h3>
              <p className="text-sm text-text-muted">
                {yearlyGoal ? `${completedBooks} of ${yearlyGoal.target} books` : 'Set your yearly target'}
              </p>
            </div>
          </div>
          
          {isEditing === 'yearly' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-base text-center text-sm"
                placeholder="12"
                min="1"
                autoFocus
              />
              <button onClick={handleSave} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(null)} className="p-1.5 rounded-lg bg-surface-base text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleStartEdit('yearly')}
              className="p-2 rounded-lg hover:bg-surface-base text-text-muted hover:text-brand-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {yearlyGoal ? (
          <>
            <div className="relative h-4 bg-surface-base rounded-full overflow-hidden mb-2">
              <div 
                className={`absolute inset-y-0 left-0 ${getProgressColor(getProgressPercentage(completedBooks, yearlyGoal.target))} rounded-full transition-all duration-500`}
                style={{ width: `${getProgressPercentage(completedBooks, yearlyGoal.target)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {getProgressPercentage(completedBooks, yearlyGoal.target)}% complete
              </span>
              <span className="text-text-secondary">
                {Math.max(0, yearlyGoal.target - completedBooks)} books to go
              </span>
            </div>
            {completedBooks >= yearlyGoal.target && (
              <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Trophy className="w-4 h-4" />
                Goal achieved! 🎉
              </div>
            )}
          </>
        ) : (
          <Button onClick={() => handleStartEdit('yearly')} variant="secondary" className="w-full">
            <Target className="w-4 h-4 mr-2" />
            Set Yearly Goal
          </Button>
        )}
      </div>

      {/* Monthly Goal */}
      <div className="bg-surface-card rounded-2xl p-5 border border-surface-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{monthNames[currentMonth]} Goal</h3>
              <p className="text-sm text-text-muted">
                {monthlyGoal ? `${completedThisMonth} of ${monthlyGoal.target} books` : 'Set a monthly target'}
              </p>
            </div>
          </div>
          
          {isEditing === 'monthly' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-base text-center text-sm"
                placeholder="2"
                min="1"
                autoFocus
              />
              <button onClick={handleSave} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(null)} className="p-1.5 rounded-lg bg-surface-base text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleStartEdit('monthly')}
              className="p-2 rounded-lg hover:bg-surface-base text-text-muted hover:text-purple-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {monthlyGoal ? (
          <>
            <div className="relative h-3 bg-surface-base rounded-full overflow-hidden mb-2">
              <div 
                className={`absolute inset-y-0 left-0 ${getProgressColor(getProgressPercentage(completedThisMonth, monthlyGoal.target))} rounded-full transition-all duration-500`}
                style={{ width: `${getProgressPercentage(completedThisMonth, monthlyGoal.target)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">
                {getProgressPercentage(completedThisMonth, monthlyGoal.target)}% complete
              </span>
              {completedThisMonth >= monthlyGoal.target ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Done!
                </span>
              ) : (
                <span className="text-text-muted">
                  {monthlyGoal.target - completedThisMonth} more to go
                </span>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => handleStartEdit('monthly')}
            className="w-full py-2.5 border-2 border-dashed border-surface-border rounded-xl text-text-muted hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-sm"
          >
            + Add Monthly Goal
          </button>
        )}
      </div>
    </div>
  );
}

export default ReadingGoals;
