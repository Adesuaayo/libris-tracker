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

export type ViewMode = 'library' | 'analytics' | 'add' | 'details';

export type Theme = 'light' | 'dark' | 'system';