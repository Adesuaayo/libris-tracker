import { useState } from 'react';
import { ReadingPreferences, DEFAULT_PREFERENCES } from '../types';
import { Button } from './Button';
import { BookOpen, ChevronRight, ChevronLeft, Sparkles, Clock, Heart, BookMarked, Check } from 'lucide-react';

interface OnboardingQuizProps {
  onComplete: (preferences: ReadingPreferences) => void;
  onSkip: () => void;
}

const GENRES = [
  'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 
  'Science Fiction', 'Fantasy', 'Biography', 'Self-Help', 'Business',
  'History', 'Philosophy', 'Psychology', 'Health', 'Travel',
  'Poetry', 'Horror', 'Comedy', 'Drama', 'Adventure'
];

const MOODS = [
  { id: 'light', label: 'Light & Fun', emoji: '😊' },
  { id: 'serious', label: 'Serious & Deep', emoji: '🤔' },
  { id: 'inspirational', label: 'Inspirational', emoji: '✨' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
  { id: 'escapist', label: 'Escapist', emoji: '🌟' },
  { id: 'emotional', label: 'Emotional', emoji: '💕' },
  { id: 'thrilling', label: 'Thrilling', emoji: '😱' },
  { id: 'relaxing', label: 'Relaxing', emoji: '😌' },
];

const READING_PACES = [
  { id: 'casual', label: 'Casual Reader', description: '1-5 books per year', icon: '📖' },
  { id: 'moderate', label: 'Regular Reader', description: '6-20 books per year', icon: '📚' },
  { id: 'avid', label: 'Avid Reader', description: '20+ books per year', icon: '🏆' },
];

const BOOK_LENGTHS = [
  { id: 'short', label: 'Short', description: 'Under 200 pages' },
  { id: 'medium', label: 'Medium', description: '200-400 pages' },
  { id: 'long', label: 'Long', description: '400+ pages' },
  { id: 'any', label: 'Any Length', description: "Doesn't matter" },
];

export function OnboardingQuiz({ onComplete, onSkip }: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<ReadingPreferences>(DEFAULT_PREFERENCES);

  const handleGenreToggle = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre]
    }));
  };

  const handleMoodToggle = (mood: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredMoods: prev.preferredMoods.includes(mood)
        ? prev.preferredMoods.filter(m => m !== mood)
        : [...prev.preferredMoods, mood]
    }));
  };

  const handleComplete = () => {
    onComplete({
      ...preferences,
      hasCompletedOnboarding: true
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to Libris! 📚
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Let's personalize your reading experience. Answer a few quick questions to get better book recommendations.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button onClick={() => setStep(1)} className="w-full py-3">
                <Sparkles className="w-5 h-5 mr-2" />
                Let's Get Started
              </Button>
              <button
                onClick={onSkip}
                className="text-slate-500 dark:text-slate-400 text-sm hover:underline"
              >
                Skip for now
              </button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heart className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                What genres do you love?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Select all that interest you (at least 2)
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    preferences.favoriteGenres.includes(genre)
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {preferences.favoriteGenres.includes(genre) && (
                    <Check className="w-4 h-4 inline mr-1" />
                  )}
                  {genre}
                </button>
              ))}
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              Selected: {preferences.favoriteGenres.length} genres
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Clock className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                How often do you read?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                This helps us tailor recommendations to your pace
              </p>
            </div>
            
            <div className="space-y-3">
              {READING_PACES.map(pace => (
                <button
                  key={pace.id}
                  onClick={() => setPreferences(prev => ({ ...prev, readingPace: pace.id as any }))}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    preferences.readingPace === pace.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pace.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{pace.label}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{pace.description}</div>
                    </div>
                    {preferences.readingPace === pace.id && (
                      <Check className="w-5 h-5 text-brand-500 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Sparkles className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                What mood are you looking for?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Select the vibes you enjoy in books
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {MOODS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodToggle(mood.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    preferences.preferredMoods.includes(mood.id)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl block mb-1">{mood.emoji}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BookMarked className="w-10 h-10 text-brand-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Preferred book length?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                We'll prioritize recommendations accordingly
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {BOOK_LENGTHS.map(length => (
                <button
                  key={length.id}
                  onClick={() => setPreferences(prev => ({ ...prev, bookLengthPreference: length.id as any }))}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    preferences.bookLengthPreference === length.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-white">{length.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{length.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col">
      {/* Progress bar */}
      {step > 0 && (
        <div className="p-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderStep()}
      </div>

      {/* Navigation */}
      {step > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep(s => s - 1)}
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          
          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && preferences.favoriteGenres.length < 2}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="flex-1">
              <Sparkles className="w-5 h-5 mr-1" />
              Start Reading!
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardingQuiz;
