import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, Trophy } from 'lucide-react';
import { Button } from './Button';

interface ReadingTimerProps {
  bookTitle: string;
  onSessionComplete: (durationMinutes: number) => void;
  totalReadingMinutes?: number;
}

export function ReadingTimer({ 
  bookTitle, 
  onSessionComplete,
  totalReadingMinutes = 0 
}: ReadingTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const secondsRef = useRef(seconds);
  const onSessionCompleteRef = useRef(onSessionComplete);

  // Keep refs updated
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - seconds * 1000;
      intervalRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Auto-save on unmount if timer has significant time (> 60 seconds)
  useEffect(() => {
    return () => {
      const currentSeconds = secondsRef.current;
      if (currentSeconds >= 60) {
        const minutes = Math.floor(currentSeconds / 60);
        onSessionCompleteRef.current(minutes);
      }
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    if (seconds > 60) {
      setShowConfirm(true);
    } else {
      resetTimer();
    }
  };

  const handleConfirmSave = () => {
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      onSessionComplete(minutes);
    }
    resetTimer();
    setShowConfirm(false);
  };

  const handleDiscardSession = () => {
    resetTimer();
    setShowConfirm(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(0);
    startTimeRef.current = null;
  };

  return (
    <div className="bg-gradient-to-br from-brand-500/10 to-brand-600/10 dark:from-brand-500/20 dark:to-brand-600/20 rounded-2xl p-5 border border-brand-200 dark:border-brand-800">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-brand-500" />
        <span className="font-semibold text-slate-900 dark:text-white">Reading Timer</span>
      </div>

      {/* Book Title */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 truncate">
        📖 {bookTitle}
      </p>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-5xl font-mono font-bold ${isRunning ? 'text-brand-500' : 'text-slate-700 dark:text-slate-300'}`}>
          {formatTime(seconds)}
        </div>
        {isRunning && (
          <p className="text-xs text-brand-500 mt-1 animate-pulse">Reading...</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!isRunning ? (
          <Button onClick={handleStart} className="flex-1">
            <Play className="w-5 h-5 mr-2" />
            {seconds > 0 ? 'Resume' : 'Start Reading'}
          </Button>
        ) : (
          <Button onClick={handlePause} variant="secondary" className="flex-1">
            <Pause className="w-5 h-5 mr-2" />
            Pause
          </Button>
        )}
        
        {seconds > 0 && (
          <Button onClick={handleStop} variant="secondary" className="px-4">
            <Square className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Total Time Stat */}
      {totalReadingMinutes > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>Total time on this book:</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatMinutes(totalReadingMinutes)}
          </span>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Save Reading Session?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You read for <strong>{formatTime(seconds)}</strong>. Save this session?
            </p>
            <div className="flex gap-3">
              <Button onClick={handleDiscardSession} variant="secondary" className="flex-1">
                Discard
              </Button>
              <Button onClick={handleConfirmSave} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingTimer;
