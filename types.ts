export enum ReadingStatus {
  TO_READ = 'To Read',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export enum BookFormat {
  PHYSICAL = 'Physical',
  EBOOK = 'E-Book',
  AUDIOBOOK = 'Audiobook',
}

// User reading preferences for AI recommendations
export interface ReadingPreferences {
  favoriteGenres: string[];
  readingPace: 'casual' | 'moderate' | 'avid';
  preferredMoods: string[];
  bookLengthPreference: 'short' | 'medium' | 'long' | 'any';
  favoriteAuthors?: string[];
  avoidGenres?: string[];
  hasCompletedOnboarding: boolean;
}

export const DEFAULT_PREFERENCES: ReadingPreferences = {
  favoriteGenres: [],
  readingPace: 'moderate',
  preferredMoods: [],
  bookLengthPreference: 'any',
  favoriteAuthors: [],
  avoidGenres: [],
  hasCompletedOnboarding: false,
};

// Reading session for timer feature
export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
  date: string;
}

// Book quote/note
export interface BookNote {
  id: string;
  bookId: string;
  type: 'quote' | 'note';
  content: string;
  page?: number;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  coverUrl?: string;
  status: ReadingStatus;
  format: BookFormat;
  rating?: number; // 1-5
  dateStarted?: string;
  dateFinished?: string;
  notes?: string;
  addedAt: number;
  // New fields for enhanced features
  totalReadingMinutes?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface Stats {
  totalBooks: number;
  pagesRead: number; // Estimated or manual
  completedThisYear: number;
  genreDistribution: { name: string; value: number }[];
  monthlyProgress: { name: string; count: number }[];
}

// Reading Goals
export interface ReadingGoal {
  id: string;
  type: 'yearly' | 'monthly';
  target: number;
  year: number;
  month?: number; // 0-11, only for monthly goals
  progress: number;
  createdAt: number;
}

// Reading Streak
export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string; // ISO date string YYYY-MM-DD
  streakHistory: string[]; // Array of dates read
}

// Achievement definitions
export type AchievementId = 
  | 'first_book' 
  | 'bookworm_5' 
  | 'bibliophile_25' 
  | 'century_reader_100'
  | 'streak_7' 
  | 'streak_30' 
  | 'streak_100'
  | 'genre_explorer_5'
  | 'genre_master_10'
  | 'speed_reader'
  | 'night_owl'
  | 'early_bird'
  | 'marathon_reader'
  | 'goal_crusher'
  | 'note_taker_10'
  | 'quote_collector_25';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress?: number;
  target?: number;
}

export const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // Book count achievements
  { id: 'first_book', name: 'First Steps', description: 'Complete your first book', icon: '📖', target: 1 },
  { id: 'bookworm_5', name: 'Bookworm', description: 'Complete 5 books', icon: '🐛', target: 5 },
  { id: 'bibliophile_25', name: 'Bibliophile', description: 'Complete 25 books', icon: '📚', target: 25 },
  { id: 'century_reader_100', name: 'Century Reader', description: 'Complete 100 books', icon: '🏆', target: 100 },
  
  // Streak achievements
  { id: 'streak_7', name: 'Week Warrior', description: 'Read 7 days in a row', icon: '🔥', target: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Read 30 days in a row', icon: '💪', target: 30 },
  { id: 'streak_100', name: 'Unstoppable', description: 'Read 100 days in a row', icon: '⭐', target: 100 },
  
  // Genre achievements
  { id: 'genre_explorer_5', name: 'Genre Explorer', description: 'Read books from 5 different genres', icon: '🗺️', target: 5 },
  { id: 'genre_master_10', name: 'Genre Master', description: 'Read books from 10 different genres', icon: '🎭', target: 10 },
  
  // Reading time achievements
  { id: 'speed_reader', name: 'Speed Reader', description: 'Read for 2+ hours in a single session', icon: '⚡', target: 120 },
  { id: 'marathon_reader', name: 'Marathon Reader', description: 'Accumulate 50 hours of reading time', icon: '🏃', target: 3000 },
  
  // Time-based achievements
  { id: 'night_owl', name: 'Night Owl', description: 'Log a reading session after midnight', icon: '🦉' },
  { id: 'early_bird', name: 'Early Bird', description: 'Log a reading session before 6 AM', icon: '🐦' },
  
  // Goal achievements
  { id: 'goal_crusher', name: 'Goal Crusher', description: 'Complete a yearly reading goal', icon: '🎯' },
  
  // Note achievements
  { id: 'note_taker_10', name: 'Note Taker', description: 'Save 10 notes or quotes', icon: '📝', target: 10 },
  { id: 'quote_collector_25', name: 'Quote Collector', description: 'Save 25 quotes', icon: '💬', target: 25 },
];

export const DEFAULT_STREAK: ReadingStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: '',
  streakHistory: [],
};

// Reading Analytics & Insights
export interface ReadingAnalytics {
  // Overview stats
  totalBooksRead: number;
  totalPagesRead: number;
  totalReadingMinutes: number;
  averageRating: number;
  
  // Time-based analysis
  booksThisYear: number;
  booksThisMonth: number;
  averageCompletionDays: number;
  
  // Pace analysis
  averagePagesPerDay: number;
  averageMinutesPerSession: number;
  longestSession: number;
  
  // Reading patterns
  preferredReadingTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
  mostProductiveDay: string;
  
  // Genre insights
  topGenres: { genre: string; count: number; percentage: number }[];
  genreDiversity: number; // 0-100 score
  
  // Monthly trends
  monthlyBooks: { month: string; count: number; year: number }[];
  monthlyMinutes: { month: string; minutes: number; year: number }[];
}

export type ViewMode = 'library' | 'analytics' | 'add' | 'details';

export type Theme = 'light' | 'dark' | 'system';