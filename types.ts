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