import { memo, useEffect, useState } from 'react';
import { Clock, Flame, BookOpen, Trophy, Sparkles, X } from 'lucide-react';
import { Button } from './Button';

interface ReadingSessionSummaryProps {
  durationMinutes: number;
  bookTitle: string;
  totalBookMinutes: number;
  currentStreak: number;
  streakIncremented: boolean;
  onClose: () => void;
}

const MOTIVATIONAL_MESSAGES = [
  { min: 60, lines: ['Marathon session!', 'Your dedication is unmatched. 🏅'] },
  { min: 30, lines: ['Incredible focus!', 'Half an hour well spent. 📖'] },
  { min: 15, lines: ['Solid session!', 'Every page brings you closer.'] },
  { min: 5, lines: ['Nice reading break!', 'Small sessions add up fast.'] },
  { min: 0, lines: ['Every minute counts!', 'You showed up — that matters.'] },
];

export const ReadingSessionSummary = memo<ReadingSessionSummaryProps>(({
  durationMinutes,
  bookTitle,
  totalBookMinutes,
  currentStreak,
  streakIncremented,
  onClose
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return { value: mins, unit: 'min' };
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { value: h, unit: m > 0 ? `hr ${m}m` : 'hr' };
  };

  const formatTotalTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const duration = formatDuration(durationMinutes);
  const motivation = MOTIVATIONAL_MESSAGES.find(m => durationMinutes >= m.min) || MOTIVATIONAL_MESSAGES[MOTIVATIONAL_MESSAGES.length - 1];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${visible ? 'bg-black/60' : 'bg-black/0'}`}>
      <div className={`bg-surface-card rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>

        {/* Accent header strip */}
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.12) 0%, rgba(155, 138, 251, 0.06) 100%)',
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-card/80 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Big duration */}
          <div className="mb-1">
            <span className="text-5xl font-bold text-accent">{duration.value}</span>
            <span className="text-lg text-text-secondary ml-1.5">{duration.unit}</span>
          </div>
          <p className="text-sm text-text-muted">reading session</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Book pill */}
          <div className="flex items-center gap-2.5 bg-surface-elevated rounded-xl px-3.5 py-2.5">
            <BookOpen className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{bookTitle}</p>
              <p className="text-xs text-text-muted">Total: {formatTotalTime(totalBookMinutes)}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Streak */}
            <div className="bg-surface-elevated rounded-xl px-3.5 py-3 text-center">
              <Flame className={`w-5 h-5 mx-auto mb-1 ${currentStreak > 0 ? 'text-orange-400' : 'text-text-muted'}`} />
              <p className="text-lg font-bold text-text-primary">{currentStreak}</p>
              <p className="text-[10px] text-text-muted">Day Streak</p>
              {streakIncremented && (
                <p className="text-[10px] text-emerald-500 font-medium mt-0.5 flex items-center justify-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> +1 today
                </p>
              )}
            </div>

            {/* Session time */}
            <div className="bg-surface-elevated rounded-xl px-3.5 py-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-accent" />
              <p className="text-lg font-bold text-text-primary">{formatTotalTime(totalBookMinutes)}</p>
              <p className="text-[10px] text-text-muted">Total on book</p>
            </div>
          </div>

          {/* Motivational message */}
          <div className="text-center pt-1">
            <p className="text-sm font-semibold text-text-primary">{motivation.lines[0]}</p>
            <p className="text-xs text-text-muted">{motivation.lines[1]}</p>
          </div>

          {/* Done button */}
          <Button onClick={handleClose} className="w-full mt-2">
            <Trophy className="w-4 h-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
});

ReadingSessionSummary.displayName = 'ReadingSessionSummary';
