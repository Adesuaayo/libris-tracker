import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Book, ReadingStatus, ViewMode, Theme, ReadingPreferences, DEFAULT_PREFERENCES, BookNote, ReadingGoal, ReadingStreak, DEFAULT_STREAK, Achievement, ACHIEVEMENTS, AchievementId, ReadingSession, BookCollection, DEFAULT_COLLECTIONS, AccessibilitySettings, DEFAULT_ACCESSIBILITY, FONT_SIZE_MAP, LINE_HEIGHT_MAP, FONT_FAMILY_MAP, FontSize, LineSpacing, FontFamily, PremiumState, DEFAULT_PREMIUM } from './types';
import { Button } from './components/Button';
import { Auth } from './components/Auth';
import { LibrarySearch } from './components/LibrarySearch';
import { OnboardingQuiz } from './components/OnboardingQuiz';
import { ReadingReminders } from './components/ReadingReminders';
import { BookDetailModal } from './components/BookDetailModal';
import { ReadingGoals } from './components/ReadingGoals';
import { Achievements } from './components/Achievements';
import { StreakTracker } from './components/StreakTracker';
import { ReadingInsights } from './components/ReadingInsights';
import { BookCollections } from './components/BookCollections';
import { CollectionView } from './components/CollectionView';
import { Community } from './components/Community';
import { Challenges } from './components/Challenges';
import { HomeDashboard } from './components/HomeDashboard';
import { ReadingSessionSummary } from './components/ReadingSessionSummary';
import { PremiumPaywall } from './components/PremiumPaywall';

// Lazy load heavy components for better initial load time
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const BookForm = lazy(() => import('./components/BookForm').then(m => ({ default: m.BookForm as React.ComponentType<any> })));
import { supabase, bookApi } from './services/supabase';
import { ebookStorage } from './services/ebookStorage';
import { BookOpen, BarChart2, Plus, Trash2, Edit2, Download, BrainCircuit, X, Trophy, ArrowUpDown, Moon, Sun, Laptop, LogOut, Loader2, Star, User, Camera, MessageSquare, Shield, ChevronRight, Home, ArrowLeft, FileText, Globe, Check, Flame, Target, Lightbulb, Library, Bell, Eye, Crown, Sparkles } from 'lucide-react';
import { getBookRecommendations, analyzeReadingHabits, getBookSummary } from './services/gemini';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToastActions } from './components/Toast';

const APP_VERSION = '1.0.0';

type SortOption = 'dateAdded' | 'rating' | 'title' | 'dateFinished';
type TabView = 'home' | 'profile' | 'community' | 'challenges' | 'privacy' | 'terms';

export default function App() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // App State
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  
  const [readingGoal, setReadingGoal] = useState<number>(() => {
      const saved = localStorage.getItem('libris-goal');
      return saved ? parseInt(saved) : 12;
  });

  const [theme, setTheme] = useState<Theme>(() => {
      return (localStorage.getItem('libris-theme') as Theme) || 'system';
  });

  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('libris-accessibility');
    return saved ? JSON.parse(saved) : DEFAULT_ACCESSIBILITY;
  });
  const [showAccessibility, setShowAccessibility] = useState(false);

  const [view, setView] = useState<ViewMode>('library');
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [showDashboard, setShowDashboard] = useState(true); // Show new dashboard by default
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('dateAdded');
  // Sidebar removed - using bottom navigation instead
  
  // Pagination State
  const BOOKS_PER_PAGE = 12;
  const [displayCount, setDisplayCount] = useState(BOOKS_PER_PAGE);
  
  // AI State
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'recommend' | 'analyze' | 'summary' | null>(null);

  // Premium / Monetization State
  const [premiumState, setPremiumState] = useState<PremiumState>(() => {
    const saved = localStorage.getItem('libris-premium');
    return saved ? JSON.parse(saved) : DEFAULT_PREMIUM;
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const isPremium = premiumState.tier !== 'free';

  // Profile Picture State
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  // Display Name State
  const [displayName, setDisplayName] = useState<string>('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');

  // Reading Preferences State (for AI recommendations)
  const [readingPreferences, setReadingPreferences] = useState<ReadingPreferences>(() => {
    const saved = localStorage.getItem('libris-reading-preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // eBook Reader open state (for back button handling)
  const [isEBookReaderOpen, setIsEBookReaderOpen] = useState(false);
  const [closeReaderTrigger, setCloseReaderTrigger] = useState(0);

  // Book Notes State
  const [bookNotes, setBookNotes] = useState<BookNote[]>(() => {
    const saved = localStorage.getItem('libris-book-notes');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected book for details view
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Reading Goals State
  const [readingGoals, setReadingGoals] = useState<ReadingGoal[]>(() => {
    const saved = localStorage.getItem('libris-reading-goals');
    return saved ? JSON.parse(saved) : [];
  });

  // Reading Streak State
  const [readingStreak, setReadingStreak] = useState<ReadingStreak>(() => {
    const saved = localStorage.getItem('libris-reading-streak');
    return saved ? JSON.parse(saved) : DEFAULT_STREAK;
  });

  // Achievements State
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('libris-achievements');
    return saved ? JSON.parse(saved) : [];
  });

  // Reading Sessions State (for analytics)
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>(() => {
    const saved = localStorage.getItem('libris-reading-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  // Session Summary overlay state
  const [sessionSummary, setSessionSummary] = useState<{
    durationMinutes: number;
    bookTitle: string;
    totalBookMinutes: number;
    currentStreak: number;
    streakIncremented: boolean;
  } | null>(null);

  // Collections State
  const [collections, setCollections] = useState<BookCollection[]>(() => {
    const saved = localStorage.getItem('libris-collections');
    if (saved) {
      return JSON.parse(saved);
    }
    // Initialize default collections with required fields
    return DEFAULT_COLLECTIONS.map(c => ({
      ...c,
      bookIds: [],
      createdAt: Date.now(),
    }));
  });
  const [selectedCollection, setSelectedCollection] = useState<BookCollection | null>(null);

  // Toast
  const toast = useToastActions();

  // --- Auth & Data Loading Effects ---

  useEffect(() => {
    // Check active session on app mount
    console.log("[App] Checking initial session...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
          console.log("[App] Session found:", session.user.email);
          setSession(session);
          loadBooks();
          // Load user settings (profile picture + reading goal) from metadata
          loadUserSettings(session);
      } else {
          console.log("[App] No active session found.");
      }
      setLoadingInitial(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[App] Auth State Change: ${event}`);
      setSession(session);
      if (session) {
          // Always land on Home after sign-in / sign-up
          setActiveTab('home');
          setShowDashboard(true);
          setView('library');
          loadBooks();
          // Load user settings from metadata on auth change
          loadUserSettings(session);
      } else {
          // Clear all user-specific data on logout
          setBooks([]);
          setProfilePicture(null);
          setReadingGoal(12);
          setDisplayName('');
          setReadingStreak(DEFAULT_STREAK);
          setUnlockedAchievements([]);
          setReadingSessions([]);
          setCollections(DEFAULT_COLLECTIONS.map(c => ({
            ...c,
            bookIds: [],
            createdAt: Date.now(),
          })));
          setReadingGoals([]);
          setBookNotes([]);
          setReadingPreferences(DEFAULT_PREFERENCES);
          setPremiumState(DEFAULT_PREMIUM);
          setAccessibility(DEFAULT_ACCESSIBILITY);
          setShowPaywall(false);
          setSessionSummary(null);
          
          // Clear localStorage for user-specific data
          localStorage.removeItem('libris-reading-streak');
          localStorage.removeItem('libris-achievements');
          localStorage.removeItem('libris-reading-sessions');
          localStorage.removeItem('libris-collections');
          localStorage.removeItem('libris-reading-goals');
          localStorage.removeItem('libris-book-notes');
          localStorage.removeItem('libris-reading-preferences');
          localStorage.removeItem('libris-profile-picture');
          localStorage.removeItem('libris-goal');
          localStorage.removeItem('libris-accessibility');
          localStorage.removeItem('libris-premium');
          localStorage.removeItem('libris-reminders');
          localStorage.removeItem('libris-ebook-settings');
          
          // Clear dynamic ebook/pdf position keys
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('ebook-position-') || key.startsWith('pdf-position-'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load profile picture and reading goal from Supabase user metadata
  const loadUserSettings = (session: any) => {
    const metadata = session?.user?.user_metadata;
    
    // Load display name
    if (metadata?.display_name) {
      setDisplayName(metadata.display_name);
    } else {
      // Fallback to email username
      setDisplayName(session?.user?.email?.split('@')[0] || '');
    }
    
    // Load avatar - prioritize custom_avatar_url over OAuth provider avatar
    if (metadata?.custom_avatar_url) {
      setProfilePicture(metadata.custom_avatar_url);
    } else if (metadata?.avatar_url) {
      setProfilePicture(metadata.avatar_url);
    } else {
      // Fallback to localStorage for existing users (migration)
      const localAvatar = localStorage.getItem('libris-profile-picture');
      if (localAvatar) {
        setProfilePicture(localAvatar);
      }
    }
    
    // Load reading goal from user metadata (synced across devices)
    if (metadata?.reading_goal) {
      setReadingGoal(metadata.reading_goal);
      localStorage.setItem('libris-goal', metadata.reading_goal.toString());
    }

    // Load reading preferences from user metadata
    if (metadata?.reading_preferences) {
      setReadingPreferences(metadata.reading_preferences);
      localStorage.setItem('libris-reading-preferences', JSON.stringify(metadata.reading_preferences));
    } else {
      // Check if onboarding is needed (first time user)
      const localPrefs = localStorage.getItem('libris-reading-preferences');
      if (!localPrefs || !JSON.parse(localPrefs).hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    }

    // Load premium state from user metadata
    if (metadata?.premium_state) {
      setPremiumState(metadata.premium_state);
      localStorage.setItem('libris-premium', JSON.stringify(metadata.premium_state));
    }

    // Load book notes from user metadata
    if (metadata?.book_notes) {
      setBookNotes(metadata.book_notes);
      localStorage.setItem('libris-book-notes', JSON.stringify(metadata.book_notes));
    }
  };

  const loadBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const data = await bookApi.fetchBooks();
      setBooks(data);
    } catch (error) {
      console.error("Failed to load books", error);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  // --- Theme Effect ---
  useEffect(() => {
    localStorage.setItem('libris-theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
    } else {
        root.classList.add(theme);
    }
  }, [theme]);

  // --- Accessibility Effect ---
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--a11y-font-size', FONT_SIZE_MAP[accessibility.fontSize]);
    root.style.setProperty('--a11y-line-height', LINE_HEIGHT_MAP[accessibility.lineSpacing]);
    root.style.setProperty('--a11y-font-family', FONT_FAMILY_MAP[accessibility.fontFamily]);
    localStorage.setItem('libris-accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  // --- Premium State Persist ---
  useEffect(() => {
    localStorage.setItem('libris-premium', JSON.stringify(premiumState));
  }, [premiumState]);

  useEffect(() => {
      localStorage.setItem('libris-goal', readingGoal.toString());
  }, [readingGoal]);

  // Persist collections to localStorage
  useEffect(() => {
    localStorage.setItem('libris-collections', JSON.stringify(collections));
  }, [collections]);

  // --- Mobile Back Button Handling ---
  useEffect(() => {
    const handleBackButton = async () => {
        CapApp.addListener('backButton', () => {
            // Priority: Close modals/readers first, then navigate views
            if (showPaywall) {
                setShowPaywall(false);
            } else if (sessionSummary) {
                setSessionSummary(null);
            } else if (isEBookReaderOpen) {
                // Close eBook reader first - increment trigger to notify component
                setCloseReaderTrigger(prev => prev + 1);
            } else if (selectedBook) {
                // Close BookDetailModal
                setSelectedBook(null);
            } else if (showOnboarding) {
                // Close onboarding modal
                setShowOnboarding(false);
            } else if (aiResponse) {
                // Close AI response modal
                setAiResponse(null);
                setAiMode(null);
            } else if (view === 'collection') {
                setView('library');
                setSelectedCollection(null);
                setActiveTab('profile');
            } else if (view !== 'library') {
                // Go back to library view within home tab
                setView('library');
                setEditingBook(null);
            } else if (!showDashboard && activeTab === 'home') {
                // If we're in library view under home, go back to dashboard
                setShowDashboard(true);
            } else if (activeTab !== 'home') {
                setActiveTab('home');
                setShowDashboard(true);
            } else {
                CapApp.exitApp();
            }
        });
    };
    handleBackButton();

    return () => {
        CapApp.removeAllListeners();
    };
  }, [view, activeTab, selectedBook, showOnboarding, aiResponse, showDashboard, isEBookReaderOpen, showPaywall, sessionSummary]);


  // --- Handlers ---

  const handleAddBook = async (book: Book) => {
    try {
      if (editingBook) {
        // Log activity if status changed
        if (editingBook.status !== book.status) {
          const { communityApi } = await import('./services/community');
          try {
            if (book.status === ReadingStatus.IN_PROGRESS && editingBook.status !== ReadingStatus.IN_PROGRESS) {
              await communityApi.activities.create('started_reading', {
                book_title: book.title,
                book_author: book.author,
                book_cover_url: book.coverUrl
              });
            } else if (book.status === ReadingStatus.COMPLETED && editingBook.status !== ReadingStatus.COMPLETED) {
              await communityApi.activities.create('finished_reading', {
                book_title: book.title,
                book_author: book.author,
                book_cover_url: book.coverUrl
              });
            }
          } catch (err) {
            console.warn('Failed to log activity:', err);
          }
        }

        // Optimistic update
        setBooks(books.map(b => b.id === book.id ? book : b));
        await bookApi.updateBook(book);
      } else {
        // Log activity for new book added
        const { communityApi } = await import('./services/community');
        try {
          await communityApi.activities.create('added_book', {
            book_title: book.title,
            book_author: book.author,
            book_cover_url: book.coverUrl
          });
        } catch (err) {
          console.warn('Failed to log activity:', err);
        }

        // Use the book's ID from BookForm as temp ID
        const tempId = book.id;
        setBooks([book, ...books]);
        
        // Real update - database may return a different ID
        const realBook = await bookApi.addBook(book);
        console.log('[handleAddBook] Book saved. tempId:', tempId, 'realBook.id:', realBook.id);
        const hasTempEbook = await ebookStorage.has(tempId);
        console.log('[handleAddBook] Checking for eBook with tempId. Has:', hasTempEbook);
        
        // If the database assigned a different ID, migrate the eBook file
        if (realBook.id !== tempId && hasTempEbook) {
          console.log('[handleAddBook] Migrating eBook from', tempId, 'to', realBook.id);
          const storedEbook = await ebookStorage.get(tempId);
          if (storedEbook) {
            await ebookStorage.save(realBook.id, storedEbook.fileName, storedEbook.fileType, storedEbook.data);
            await ebookStorage.delete(tempId);
            const hasRealBook = await ebookStorage.has(realBook.id);
            console.log('[handleAddBook] Migration complete. Has realBook.id:', hasRealBook);
          }
        } else if (realBook.id !== tempId) {
          console.log('[handleAddBook] IDs differ but no eBook found with tempId');
        }
        
        setBooks(prev => prev.map(b => b.id === tempId ? realBook : b));
      }
      setView('library');
      setEditingBook(null);
      toast.success(editingBook ? 'Book updated successfully!' : 'Book added to your library!');
    } catch (error: any) {
      console.error("Error saving book:", error);
      toast.error(`Failed to save book: ${error.message || error.details || "Unknown error"}`);
      loadBooks(); // Revert on error
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      // Optimistic delete
      const previousBooks = [...books];
      setBooks(books.filter(b => b.id !== id));
      
      try {
        await bookApi.deleteBook(id);
        toast.success('Book deleted successfully!');
      } catch (error: any) {
        console.error("Error deleting book:", error);
        toast.error(`Failed to delete book: ${error.message || error.details || "Unknown error"}`);
        setBooks(previousBooks);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      toast.info('Signing out...');
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (preferences: ReadingPreferences, yearlyGoalTarget?: number) => {
    setReadingPreferences(preferences);
    setShowOnboarding(false);
    // Ensure user lands on Home after onboarding
    setActiveTab('home');
    setShowDashboard(true);
    localStorage.setItem('libris-reading-preferences', JSON.stringify(preferences));
    
    // Create yearly reading goal if user set one
    if (yearlyGoalTarget && yearlyGoalTarget > 0) {
      const currentYear = new Date().getFullYear();
      // Check if a yearly goal for this year already exists
      const existingYearlyGoal = readingGoals.find(
        g => g.type === 'yearly' && g.year === currentYear
      );
      if (!existingYearlyGoal) {
        const newGoal: ReadingGoal = {
          id: `goal-${Date.now()}`,
          type: 'yearly',
          target: yearlyGoalTarget,
          year: currentYear,
          progress: 0,
          createdAt: Date.now()
        };
        const updated = [...readingGoals, newGoal];
        setReadingGoals(updated);
        localStorage.setItem('libris-reading-goals', JSON.stringify(updated));
      }
    }

    // Sync to Supabase
    try {
      await supabase.auth.updateUser({
        data: { reading_preferences: preferences }
      });
      toast.success('Preferences saved! Your reading journey begins now 📚');
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
  };

  const handleOnboardingSkip = async () => {
    const skippedPrefs = { ...DEFAULT_PREFERENCES, hasCompletedOnboarding: true };
    setReadingPreferences(skippedPrefs);
    setShowOnboarding(false);
    // Ensure user lands on Home after skipping onboarding
    setActiveTab('home');
    setShowDashboard(true);
    localStorage.setItem('libris-reading-preferences', JSON.stringify(skippedPrefs));
  };

  // Handle adding book notes
  const handleAddBookNote = async (note: Omit<BookNote, 'id' | 'createdAt'>) => {
    const newNote: BookNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    
    const updatedNotes = [...bookNotes, newNote];
    setBookNotes(updatedNotes);
    localStorage.setItem('libris-book-notes', JSON.stringify(updatedNotes));
    
    // Sync to Supabase
    try {
      await supabase.auth.updateUser({
        data: { book_notes: updatedNotes }
      });
    } catch (error) {
      console.error('Failed to sync notes:', error);
    }
    
    toast.success('Note saved!');
  };

  const handleDeleteBookNote = async (noteId: string) => {
    const updatedNotes = bookNotes.filter(n => n.id !== noteId);
    setBookNotes(updatedNotes);
    localStorage.setItem('libris-book-notes', JSON.stringify(updatedNotes));
    
    // Sync to Supabase
    try {
      await supabase.auth.updateUser({
        data: { book_notes: updatedNotes }
      });
    } catch (error) {
      console.error('Failed to sync notes:', error);
    }
  };

  // Handle reading progress update from eBook reader
  const handleReadingProgressUpdate = async (bookId: string, currentPage: number, totalPages: number) => {
    // Update local state
    const updatedBooks = books.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          currentPage,
          totalPages
        };
      }
      return book;
    });
    
    setBooks(updatedBooks);
    
    // Update in database
    const book = books.find(b => b.id === bookId);
    if (book) {
      try {
        await bookApi.updateBook({
          ...book,
          currentPage,
          totalPages
        });
      } catch (error) {
        console.error('Failed to update reading progress:', error);
      }
    }
  };

  // Handle reading timer session complete
  const handleReadingSessionComplete = async (bookId: string, durationMinutes: number) => {
    // Create a new reading session record
    const newSession: ReadingSession = {
      id: `session-${Date.now()}`,
      bookId,
      startTime: Date.now() - (durationMinutes * 60 * 1000),
      endTime: Date.now(),
      durationMinutes,
      date: new Date().toISOString().split('T')[0]
    };
    
    // Add to sessions list
    setReadingSessions(prev => {
      const updated = [...prev, newSession].slice(-500); // Keep last 500 sessions
      localStorage.setItem('libris-reading-sessions', JSON.stringify(updated));
      return updated;
    });
    
    // Update the book's total reading time
    const updatedBooks = books.map(book => {
      if (book.id === bookId) {
        return {
          ...book,
          totalReadingMinutes: (book.totalReadingMinutes || 0) + durationMinutes
        };
      }
      return book;
    });
    
    setBooks(updatedBooks);
    
    // Capture pre-update streak to detect if it incremented
    const today = new Date().toISOString().split('T')[0];
    const hadReadToday = readingStreak.streakHistory?.includes(today) || false;
    const preStreak = readingStreak.currentStreak;
    
    // Update reading streak
    updateReadingStreak();
    
    // Check for achievements
    checkAchievements(updatedBooks, durationMinutes);
    
    // Show session summary overlay
    const book = books.find(b => b.id === bookId);
    if (book) {
      const newTotalMinutes = (book.totalReadingMinutes || 0) + durationMinutes;
      const streakIncremented = !hadReadToday;
      const newStreak = streakIncremented ? preStreak + 1 : preStreak;

      setSessionSummary({
        durationMinutes,
        bookTitle: book.title,
        totalBookMinutes: newTotalMinutes,
        currentStreak: newStreak > 0 ? newStreak : 1,
        streakIncremented,
      });

      try {
        await bookApi.updateBook({
          ...book,
          totalReadingMinutes: newTotalMinutes
        });
      } catch (error) {
        console.error('Failed to update reading time:', error);
      }
    }
  };

  // Update reading streak when user reads
  const updateReadingStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    setReadingStreak(prev => {
      // If already read today, no update needed
      if (prev.lastReadDate === today) {
        return prev;
      }
      
      let newStreak = prev.currentStreak;
      
      // If last read was yesterday, continue streak
      if (prev.lastReadDate === yesterday) {
        newStreak = prev.currentStreak + 1;
      } 
      // If last read was before yesterday, reset streak
      else if (prev.lastReadDate !== today) {
        newStreak = 1;
      }
      
      const updatedStreak = {
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastReadDate: today,
        streakHistory: prev.streakHistory.includes(today) 
          ? prev.streakHistory 
          : [...prev.streakHistory, today].slice(-365) // Keep last 365 days
      };
      
      // Save to localStorage
      localStorage.setItem('libris-reading-streak', JSON.stringify(updatedStreak));
      
      return updatedStreak;
    });
  };

  // Check and unlock achievements
  const checkAchievements = (currentBooks: Book[], sessionMinutes?: number) => {
    const completedBooks = currentBooks.filter(b => b.status === ReadingStatus.COMPLETED).length;
    const totalMinutes = currentBooks.reduce((sum, b) => sum + (b.totalReadingMinutes || 0), 0);
    const uniqueGenres = new Set(currentBooks.filter(b => b.status === ReadingStatus.COMPLETED).map(b => b.genre)).size;
    const totalNotesQuotes = bookNotes.length;
    const totalQuotes = bookNotes.filter(n => n.type === 'quote').length;
    
    const newAchievements: Achievement[] = [];
    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));
    
    const checkAndUnlock = (id: AchievementId, condition: boolean) => {
      if (!unlockedIds.has(id) && condition) {
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (achievement) {
          newAchievements.push({ ...achievement, unlockedAt: Date.now() });
        }
      }
    };
    
    // Book count achievements
    checkAndUnlock('first_book', completedBooks >= 1);
    checkAndUnlock('bookworm_5', completedBooks >= 5);
    checkAndUnlock('bibliophile_25', completedBooks >= 25);
    checkAndUnlock('century_reader_100', completedBooks >= 100);
    
    // Streak achievements
    checkAndUnlock('streak_7', readingStreak.currentStreak >= 7);
    checkAndUnlock('streak_30', readingStreak.currentStreak >= 30);
    checkAndUnlock('streak_100', readingStreak.currentStreak >= 100);
    
    // Genre achievements
    checkAndUnlock('genre_explorer_5', uniqueGenres >= 5);
    checkAndUnlock('genre_master_10', uniqueGenres >= 10);
    
    // Reading time achievements
    checkAndUnlock('marathon_reader', totalMinutes >= 3000);
    if (sessionMinutes) {
      checkAndUnlock('speed_reader', sessionMinutes >= 120);
      
      // Time-based achievements
      const hour = new Date().getHours();
      checkAndUnlock('night_owl', hour >= 0 && hour < 5);
      checkAndUnlock('early_bird', hour >= 5 && hour < 6);
    }
    
    // Note achievements
    checkAndUnlock('note_taker_10', totalNotesQuotes >= 10);
    checkAndUnlock('quote_collector_25', totalQuotes >= 25);
    
    // Goal achievement - check if yearly goal is met
    const currentYear = new Date().getFullYear();
    const yearlyGoal = readingGoals.find(g => g.type === 'yearly' && g.year === currentYear);
    const booksThisYear = currentBooks.filter(b => 
      b.status === ReadingStatus.COMPLETED && 
      b.dateFinished && 
      new Date(b.dateFinished).getFullYear() === currentYear
    ).length;
    checkAndUnlock('goal_crusher', yearlyGoal ? booksThisYear >= yearlyGoal.target : false);
    
    if (newAchievements.length > 0) {
      const updated = [...unlockedAchievements, ...newAchievements];
      setUnlockedAchievements(updated);
      localStorage.setItem('libris-achievements', JSON.stringify(updated));
      
      // Show toast for each new achievement
      newAchievements.forEach(achievement => {
        toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`);
      });
    }
  };

  // Handle creating a new reading goal
  const handleCreateGoal = (goalData: Omit<ReadingGoal, 'id' | 'createdAt' | 'progress'>) => {
    const newGoal: ReadingGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
      progress: 0,
      createdAt: Date.now()
    };
    
    const updated = [...readingGoals, newGoal];
    setReadingGoals(updated);
    localStorage.setItem('libris-reading-goals', JSON.stringify(updated));
    toast.success(`${goalData.type === 'yearly' ? 'Yearly' : 'Monthly'} goal set!`);
  };

  // Handle updating a reading goal
  const handleUpdateGoal = (goal: ReadingGoal) => {
    const updated = readingGoals.map(g => g.id === goal.id ? goal : g);
    setReadingGoals(updated);
    localStorage.setItem('libris-reading-goals', JSON.stringify(updated));
  };

  // Collection Handlers
  const handleCreateCollection = (collectionData: Omit<BookCollection, 'id' | 'createdAt' | 'bookIds'>) => {
    const newCollection: BookCollection = {
      ...collectionData,
      id: Date.now().toString(),
      bookIds: [],
      createdAt: Date.now(),
    };
    setCollections(prev => [...prev, newCollection]);
    toast.success(`Collection "${collectionData.name}" created!`);
  };

  const handleUpdateCollection = (collection: BookCollection) => {
    setCollections(prev => prev.map(c => c.id === collection.id ? collection : c));
    if (selectedCollection?.id === collection.id) {
      setSelectedCollection(collection);
    }
  };

  const handleDeleteCollection = (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    setCollections(prev => prev.filter(c => c.id !== collectionId));
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection(null);
    }
    if (collection) {
      toast.success(`Collection "${collection.name}" deleted`);
    }
  };

  const handleAddBooksToCollection = (collectionId: string, bookIds: string[]) => {
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        const existingIds = new Set(c.bookIds || []);
        const newIds = bookIds.filter(id => !existingIds.has(id));
        return { ...c, bookIds: [...(c.bookIds || []), ...newIds] };
      }
      return c;
    }));
    // Update selectedCollection if it's the one being modified
    if (selectedCollection?.id === collectionId) {
      const updatedCollection = collections.find(c => c.id === collectionId);
      if (updatedCollection) {
        const existingIds = new Set(updatedCollection.bookIds || []);
        const newIds = bookIds.filter(id => !existingIds.has(id));
        setSelectedCollection({
          ...updatedCollection,
          bookIds: [...(updatedCollection.bookIds || []), ...newIds]
        });
      }
    }
    toast.success(`Added ${bookIds.length} book${bookIds.length > 1 ? 's' : ''} to collection`);
  };

  const handleRemoveBookFromCollection = (collectionId: string, bookId: string) => {
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return { ...c, bookIds: (c.bookIds || []).filter(id => id !== bookId) };
      }
      return c;
    }));
    // Update selectedCollection if it's the one being modified
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection(prev => prev ? {
        ...prev,
        bookIds: (prev.bookIds || []).filter(id => id !== bookId)
      } : null);
    }
  };

  const handleViewCollection = (collection: BookCollection) => {
    setSelectedCollection(collection);
    setView('collection');
    setActiveTab('home');
    setShowDashboard(false);
  };

  // Calculate books completed this month
  const booksCompletedThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return books.filter(book => 
      book.status === ReadingStatus.COMPLETED &&
      book.dateFinished &&
      new Date(book.dateFinished).getMonth() === currentMonth &&
      new Date(book.dateFinished).getFullYear() === currentYear
    ).length;
  }, [books]);

  // Calculate total reading minutes across all books
  const totalReadingMinutes = useMemo(() => {
    return books.reduce((sum, book) => sum + (book.totalReadingMinutes || 0), 0);
  }, [books]);

  // Calculate unique genres from completed books
  const uniqueGenresCount = useMemo(() => {
    return new Set(books.filter(b => b.status === ReadingStatus.COMPLETED).map(b => b.genre)).size;
  }, [books]);

  const handleRateApp = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.libris.app';
    window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setView('add');
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingProfilePic(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");

      // Create filename: profile-pictures/userId/timestamp.extension
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `profile-pictures/${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('book-covers') // Reusing the same bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('book-covers')
        .getPublicUrl(fileName);

      // Save to Supabase user metadata (persists across sessions)
      // Use custom_avatar_url to avoid being overwritten by OAuth providers
      const { error: updateError } = await supabase.auth.updateUser({
        data: { custom_avatar_url: publicUrl }
      });

      if (updateError) {
        console.error('Failed to update user metadata:', updateError);
        // Still save locally as fallback
      }

      // Also save to localStorage as backup
      localStorage.setItem('libris-profile-picture', publicUrl);
      setProfilePicture(publicUrl);
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Profile picture upload failed:', error);
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!tempDisplayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: tempDisplayName.trim() }
      });

      if (error) throw error;

      setDisplayName(tempDisplayName.trim());
      setEditingDisplayName(false);
      toast.success('Display name updated!');
    } catch (error: any) {
      console.error('Failed to update display name:', error);
      toast.error('Failed to update display name');
    }
  };

  const handleExport = async () => {
    if (books.length === 0) {
      toast.warning("No books to export.");
      return;
    }

    const headers = ['Title', 'Author', 'Genre', 'Status', 'Format', 'Rating', 'Date Started', 'Date Finished', 'Notes', 'Added At', 'ID', 'Cover URL'];
    const keys: (keyof Book)[] = ['title', 'author', 'genre', 'status', 'format', 'rating', 'dateStarted', 'dateFinished', 'notes', 'addedAt', 'id', 'coverUrl'];

    const csvRows = books.map(book => {
      return keys.map(key => {
        let val = book[key];
        if (val === undefined || val === null) val = '';
        let cell = String(val);
        
        // Skip base64 image data for coverUrl - it's too large for CSV
        if (key === 'coverUrl' && cell.startsWith('data:')) {
          cell = '[Local Image]';
        }
        // Truncate very long strings (like notes) to prevent CSV issues
        if (cell.length > 500) {
          cell = cell.substring(0, 500) + '...';
        }
        
        if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `libris_library_${timestamp}.csv`;

    // For Android/iOS, use Capacitor Share API directly
    if (Capacitor.isNativePlatform()) {
      try {
        // Try to write file and share
        try {
          const result = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });

          // Share the file
          await Share.share({
            title: 'Export Library',
            text: `Library export with ${books.length} books`,
            url: result.uri,
            dialogTitle: 'Save your library export'
          });
        } catch (fsError) {
          console.warn('File write failed, using text share instead:', fsError);
          // Fallback: Share as text if file write fails
          await Share.share({
            title: 'Export Library',
            text: csvContent,
            dialogTitle: 'Save your library export'
          });
        }

        toast.success(`Exported ${books.length} books!`);
      } catch (error: any) {
        console.error('Export failed:', error);
        toast.error(`Export failed: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Web browser - use traditional download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${books.length} books to CSV!`);
    }
  };

  // --- Premium Handlers (SOFT-LAUNCH: upgrades blocked) ---
  const handleUpgrade = async (_tier: 'premium' | 'lifetime') => {
    // SOFT-LAUNCH: Do NOT set tier or persist any paid entitlement.
    // Capture interest and show waitlist message instead.
    try {
      await supabase.auth.updateUser({ data: { wants_premium: true, wanted_tier: _tier, wanted_at: new Date().toISOString() } });
    } catch (e) {
      console.error('Failed to capture premium interest:', e);
    }
    setShowPaywall(false);
    toast.info('Premium billing is launching shortly. Join the waitlist! 🚀');
  };

  const getAffiliateLink = (title: string, author: string) => {
    const query = encodeURIComponent(`${title} ${author} book`);
    const base = `https://www.amazon.com/s?k=${query}`;
    // Append affiliate tag from env when available (e.g. VITE_AMAZON_AFFILIATE_TAG)
    const tag = import.meta.env.VITE_AMAZON_AFFILIATE_TAG;
    return tag ? `${base}&tag=${tag}` : base;
  };

  const handleGeminiAction = async (mode: 'recommend' | 'analyze') => {
    // Gate behind premium or trial uses
    if (!isPremium && premiumState.trialAiUsesRemaining <= 0) {
      setShowPaywall(true);
      return;
    }

    setAiLoading(true);
    setAiMode(mode);
    setAiResponse(null);
    setActiveTab('home');
    setShowDashboard(false);
    setView('library');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
        let text = "";
        if (mode === 'recommend') {
            text = await getBookRecommendations(books, readingPreferences);
        } else {
            text = await analyzeReadingHabits(books);
        }
        setAiResponse(text);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        // Decrement trial uses for free users
        if (!isPremium) {
          setPremiumState(prev => ({
            ...prev,
            trialAiUsesRemaining: Math.max(0, prev.trialAiUsesRemaining - 1)
          }));
        }
    } catch (e: any) {
        setAiResponse(`Error: ${e.message || "Failed to connect to AI service. Please try again."}`);
    } finally {
        setAiLoading(false);
    }
  };

  const handleBookSummary = async (book: Book) => {
      // Gate behind premium or trial uses
      if (!isPremium && premiumState.trialAiUsesRemaining <= 0) {
        setShowPaywall(true);
        return;
      }

      toast.info(`Generating summary for "${book.title}"...`);
      try {
        const summary = await getBookSummary(book.title, book.author);
        setAiMode('summary');
        setAiResponse(summary);
        setActiveTab('home');
        setShowDashboard(false);
        setView('library');
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        // Decrement trial uses for free users
        if (!isPremium) {
          setPremiumState(prev => ({
            ...prev,
            trialAiUsesRemaining: Math.max(0, prev.trialAiUsesRemaining - 1)
          }));
        }
      } catch (e: any) {
        toast.error(`Failed to generate summary: ${e.message}`);
      }
  }

  // --- Calculations ---

  const booksReadThisYear = useMemo(() => {
      const currentYear = new Date().getFullYear();
      return books.filter(b => {
          if (b.status !== ReadingStatus.COMPLETED) return false;
          if (!b.dateFinished) return false;
          return new Date(b.dateFinished).getFullYear() === currentYear;
      }).length;
  }, [books]);

  const filteredAndSortedBooks = useMemo(() => {
      let result = books.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.genre.toLowerCase().includes(searchTerm.toLowerCase())
      );

      result.sort((a, b) => {
          switch (sortOption) {
              case 'rating':
                  return (b.rating || 0) - (a.rating || 0);
              case 'dateFinished':
                  if (!a.dateFinished) return 1;
                  if (!b.dateFinished) return -1;
                  return new Date(b.dateFinished).getTime() - new Date(a.dateFinished).getTime();
              case 'title':
                  return a.title.localeCompare(b.title);
              case 'dateAdded':
              default:
                  return b.addedAt - a.addedAt;
          }
      });
      return result;
  }, [books, searchTerm, sortOption]);

  // Paginated books for display
  const paginatedBooks = useMemo(() => {
      return filteredAndSortedBooks.slice(0, displayCount);
  }, [filteredAndSortedBooks, displayCount]);

  const hasMoreBooks = filteredAndSortedBooks.length > displayCount;

  // Reset pagination when search/sort changes
  useEffect(() => {
      setDisplayCount(BOOKS_PER_PAGE);
  }, [searchTerm, sortOption]);

  const loadMoreBooks = () => {
      setDisplayCount(prev => prev + BOOKS_PER_PAGE);
  };

  // Helper function to render text with basic markdown (bold) support
  const renderFormattedText = (text: string) => {
    // Split by **text** pattern and render bold parts
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      // Odd indices are the content that was inside **
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-text-primary">{part}</strong>;
      }
      return part;
    });
  };

  const renderAiContent = () => {
      if (!aiResponse) return null;

      if (aiMode === 'recommend') {
          try {
              const recommendations = JSON.parse(aiResponse);
              if (!Array.isArray(recommendations)) {
                  return <div className="prose prose-sm dark:prose-invert text-text-secondary whitespace-pre-line">{renderFormattedText(aiResponse)}</div>;
              }

              return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {recommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                              <h4 className="font-bold text-text-primary text-sm mb-1">{rec.title}</h4>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2 uppercase tracking-wide">{rec.author}</p>
                              <p className="text-xs text-text-secondary leading-relaxed">{rec.reason}</p>
                          </div>
                      ))}
                  </div>
              );
          } catch (e) {
              return <div className="prose prose-sm dark:prose-invert text-text-secondary whitespace-pre-line">{renderFormattedText(aiResponse)}</div>;
          }
      }
      return (
          <div className="prose prose-sm dark:prose-invert text-text-secondary max-w-none whitespace-pre-line">
              {renderFormattedText(aiResponse)}
          </div>
      );
  };

  // --- Rendering ---

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Profile Screen Component
  const ProfileScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      {/* Profile Header - Compact Identity Section */}
      <div className="bg-gradient-to-br from-accent to-accent-dark pt-[env(safe-area-inset-top)] pb-6 px-4">
        <h1 className="text-xl font-bold text-white text-center mb-4 pt-4">Profile</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{displayName || session.user.email?.split('@')[0]}</h2>
          </div>
          <button 
            onClick={() => setView('manage-profile')}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 -mt-3">
        {/* Stats Card - Summary Only */}
        <div className="bg-surface-card rounded-xl shadow-lg border border-surface-border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-text-primary">{books.length}</p>
              <p className="text-xs text-text-muted">Total Books</p>
            </div>
            <div className="w-px h-10 bg-surface-border"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-text-primary">{booksReadThisYear}</p>
              <p className="text-xs text-text-muted">Read This Year</p>
            </div>
            <div className="w-px h-10 bg-surface-border"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-text-primary">{readingStreak.currentStreak}</p>
              <p className="text-xs text-text-muted">Day Streak</p>
            </div>
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-secondary px-2 mb-3">AI Assistant</h3>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <BrainCircuit className="h-5 w-5" />
                <span>Gemini 2.5 Insights</span>
              </div>
              {isPremium ? (
                <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> PRO
                </span>
              ) : premiumState.trialAiUsesRemaining > 0 ? (
                <span className="text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full">
                  {premiumState.trialAiUsesRemaining} free {premiumState.trialAiUsesRemaining === 1 ? 'use' : 'uses'} left
                </span>
              ) : (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1"
                >
                  🔒 Unlock
                </button>
              )}
            </div>
            <p className="text-indigo-100 text-xs mb-3">Get smart book recommendations and habit analysis</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => handleGeminiAction('recommend')}>
                📚 Recommend
              </Button>
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => handleGeminiAction('analyze')}>
                📊 Analyze
              </Button>
            </div>
            {!isPremium && (
              <button
                onClick={() => setShowPaywall(true)}
                className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/90 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to Premium for unlimited AI
              </button>
            )}
          </div>
        </div>

        {/* Reading Management - Navigation Only */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-secondary px-2 mb-3">Reading Management</h3>
          <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
            <button 
              onClick={() => setView('streak')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Reading Streak</span>
                  <span className="text-xs text-text-muted">{readingStreak.currentStreak} day streak</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setView('goals')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Reading Goals</span>
                  <span className="text-xs text-text-muted">{readingGoals.length} active goal{readingGoals.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setView('insights')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Reading Insights</span>
                  <span className="text-xs text-text-muted">View your reading analytics</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Library - Navigation Only */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-secondary px-2 mb-3">Library</h3>
          <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
            <button 
              onClick={() => setView('collections-list')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Library className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Collections</span>
                  <span className="text-xs text-text-muted">{collections.length} collection{collections.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setView('achievements')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Achievements</span>
                  <span className="text-xs text-text-muted">{unlockedAchievements.length} unlocked</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Settings - Navigation Only */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-secondary px-2 mb-3">Settings</h3>
          <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-text-muted mb-2">Appearance</p>
              <div className="flex items-center justify-between bg-surface-base p-1 rounded-lg">
                {(['light', 'system', 'dark'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-colors ${
                      theme === t 
                        ? 'bg-surface-card shadow-sm text-accent font-medium' 
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                    {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                    {t === 'system' && <Laptop className="h-3.5 w-3.5" />}
                    <span className="text-xs capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setShowOnboarding(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <BrainCircuit className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Reading Preferences</span>
                  <span className="text-xs text-text-muted">
                    {readingPreferences.hasCompletedOnboarding 
                      ? `${readingPreferences.favoriteGenres.length} genres` 
                      : 'Set up preferences'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setView('reminders')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-rose-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Reading Reminders</span>
                  <span className="text-xs text-text-muted">Manage notifications</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setShowAccessibility(!showAccessibility)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-teal-500" />
                </div>
                <div className="text-left">
                  <span className="text-text-primary text-sm block font-medium">Accessibility</span>
                  <span className="text-xs text-text-muted">Font size, spacing & family</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-text-muted transition-transform ${showAccessibility ? 'rotate-90' : ''}`} />
            </button>

            {/* Accessibility Panel (inline expand) */}
            {showAccessibility && (
              <div className="px-4 py-4 bg-surface-base space-y-5 border-t border-surface-border">
                {/* Font Size */}
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">Font Size</p>
                  <div className="flex items-center bg-surface-card p-1 rounded-lg border border-surface-border">
                    {([['small', 'S'], ['default', 'M'], ['large', 'L'], ['xl', 'XL']] as [FontSize, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setAccessibility(prev => ({ ...prev, fontSize: val }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          accessibility.fontSize === val
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Spacing */}
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">Line Spacing</p>
                  <div className="flex items-center bg-surface-card p-1 rounded-lg border border-surface-border">
                    {([['compact', 'Compact'], ['default', 'Default'], ['relaxed', 'Relaxed']] as [LineSpacing, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setAccessibility(prev => ({ ...prev, lineSpacing: val }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          accessibility.lineSpacing === val
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">Font Family</p>
                  <div className="flex items-center bg-surface-card p-1 rounded-lg border border-surface-border">
                    {([['sans', 'Sans'], ['serif', 'Serif'], ['dyslexic', 'Dyslexic']] as [FontFamily, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setAccessibility(prev => ({ ...prev, fontFamily: val }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          accessibility.fontFamily === val
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                        style={{ fontFamily: val === 'sans' ? 'system-ui, sans-serif' : val === 'serif' ? 'Georgia, serif' : '"OpenDyslexic", "Comic Sans MS", sans-serif' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-surface-card rounded-xl p-3 border border-surface-border">
                  <p className="text-xs text-text-muted mb-1">Preview</p>
                  <p className="text-text-primary">The quick brown fox jumps over the lazy dog.</p>
                  <p className="text-text-secondary text-sm">Reading should be comfortable for everyone.</p>
                </div>

                {/* Reset */}
                {(accessibility.fontSize !== 'default' || accessibility.lineSpacing !== 'default' || accessibility.fontFamily !== 'sans') && (
                  <button
                    onClick={() => setAccessibility(DEFAULT_ACCESSIBILITY)}
                    className="text-xs text-accent hover:underline"
                  >
                    Reset to defaults
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data & Support */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-secondary px-2 mb-3">Data & Support</h3>
          <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-text-muted" />
                <span className="text-text-primary text-sm">Export Library</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={handleRateApp}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-text-primary text-sm">Rate App</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => openExternalLink('mailto:support@libris.app?subject=Feedback')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-text-muted" />
                <span className="text-text-primary text-sm">Send Feedback</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setActiveTab('privacy')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <span className="text-text-primary text-sm">Privacy Policy</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
            <div className="border-t border-surface-border"></div>
            <button 
              onClick={() => setActiveTab('terms')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-base transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-text-muted" />
                <span className="text-text-primary text-sm">Terms of Service</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button 
          onClick={handleSignOut}
          className="w-full bg-surface-card rounded-xl shadow-sm border border-surface-border px-4 py-3 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors mb-4"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <div className="text-center text-sm text-text-muted py-4">
          <p>Libris v{APP_VERSION}</p>
          <p className="text-xs mt-1">Made with ❤️ for book lovers</p>
        </div>
      </div>
    </div>
  );

  // Manage Profile Screen - Drill-down for account editing
  const ManageProfileScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Manage Profile</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          {/* Profile Picture */}
          <div className="p-4 flex items-center gap-4 border-b border-surface-border">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-accent">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
                {uploadingProfilePic && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-2 border-surface-card shadow-lg cursor-pointer hover:bg-accent-light transition-colors">
                <Camera className="h-3.5 w-3.5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Profile Photo</p>
              <p className="text-xs text-text-muted">Tap camera icon to change</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="p-4 border-b border-surface-border">
            <label className="text-xs font-medium text-text-muted block mb-2">Display Name</label>
            {editingDisplayName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempDisplayName}
                  onChange={(e) => setTempDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-base text-text-primary border border-surface-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter display name"
                  autoFocus
                />
                <button
                  onClick={handleSaveDisplayName}
                  className="p-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingDisplayName(false)}
                  className="p-2 bg-surface-base text-text-muted rounded-lg hover:bg-surface-border transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setTempDisplayName(displayName); setEditingDisplayName(true); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-base hover:bg-surface-border transition-colors"
              >
                <span className="text-text-primary">{displayName || session.user.email?.split('@')[0]}</span>
                <Edit2 className="h-4 w-4 text-text-muted" />
              </button>
            )}
          </div>

          {/* Email (Read-only) */}
          <div className="p-4">
            <label className="text-xs font-medium text-text-muted block mb-2">Email Address</label>
            <div className="px-3 py-2 rounded-lg bg-surface-base text-text-secondary">
              {session.user.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Streak Screen - Full streak calendar and details
  const StreakScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Reading Streak</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <StreakTracker streak={readingStreak} />
        </div>
      </div>
    </div>
  );

  // Goals Screen - Full reading goals management
  const GoalsScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Reading Goals</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <ReadingGoals
            goals={readingGoals}
            completedBooks={booksReadThisYear}
            completedThisMonth={booksCompletedThisMonth}
            onUpdateGoal={handleUpdateGoal}
            onCreateGoal={handleCreateGoal}
          />
        </div>
      </div>
    </div>
  );

  // Insights Screen - Full reading insights analytics
  const InsightsScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Reading Insights</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <ReadingInsights
            books={books}
            readingSessions={readingSessions}
          />
        </div>
      </div>
    </div>
  );

  // Achievements Screen - Full achievements display
  const AchievementsScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Achievements</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <Achievements
            unlockedAchievements={unlockedAchievements}
            totalBooks={books.filter(b => b.status === ReadingStatus.COMPLETED).length}
            currentStreak={readingStreak.currentStreak}
            totalReadingMinutes={totalReadingMinutes}
            totalNotes={bookNotes.filter(n => n.type === 'note').length}
            totalQuotes={bookNotes.filter(n => n.type === 'quote').length}
            uniqueGenres={uniqueGenresCount}
          />
        </div>
      </div>
    </div>
  );

  // Collections Screen - Full collections management
  const CollectionsScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Collections</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <BookCollections
            collections={collections}
            books={books}
            onCreateCollection={handleCreateCollection}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
            onViewCollection={handleViewCollection}
          />
        </div>
      </div>
    </div>
  );

  // Reminders Screen - Full reminders management
  const RemindersScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Reading Reminders</h1>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden">
          <ReadingReminders />
        </div>
      </div>
    </div>
  );

  // Privacy Policy Screen
  const PrivacyPolicyScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Privacy Policy for Libris</h2>
              <p className="text-sm text-text-muted">Last Updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-text-secondary">
            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Introduction</h3>
            <p className="mb-4">
              Libris ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App").
            </p>
            <p className="mb-4">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the App.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Information We Collect</h3>
            <p className="mb-4">
              <strong>Personal Information:</strong> When you create an account, we collect your email address and any profile information you choose to provide.
            </p>
            <p className="mb-4">
              <strong>Book Data:</strong> We collect information about the books you add to your library, including titles, authors, ratings, reading status, and notes you create.
            </p>
            <p className="mb-4">
              <strong>Usage Data:</strong> We may collect information about how you use the App, including your reading goals and preferences.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">How We Use Your Information</h3>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide, maintain, and improve the App</li>
              <li>Store and sync your book library across devices</li>
              <li>Provide AI-powered book recommendations and reading insights</li>
              <li>Send you updates and notifications (with your consent)</li>
              <li>Respond to your comments and questions</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Data Storage & Security</h3>
            <p className="mb-4">
              Your data is securely stored using Supabase, a trusted cloud infrastructure provider. We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Third-Party Services</h3>
            <p className="mb-4">
              We use Google's Gemini AI to provide book recommendations and reading analysis. When using these features, relevant book data is processed by Google's AI services in accordance with their privacy policies.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Your Rights</h3>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Access and export your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential data collection</li>
              <li>Update or correct your personal information</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Children's Privacy</h3>
            <p className="mb-4">
              The App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Changes to This Policy</h3>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Contact Us</h3>
            <p className="mb-4">
              If you have questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <p className="text-brand-600 dark:text-brand-400 font-medium">support@libris.app</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Terms of Service Screen
  const TermsOfServiceScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className="p-2 -ml-2 text-text-secondary hover:bg-surface-base rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-surface-card rounded-xl shadow-sm border border-surface-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Terms of Service</h2>
              <p className="text-sm text-text-muted">Last Updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-text-secondary">
            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="mb-4">
              Welcome to Libris. By accessing or using our mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
            </p>
            <p className="mb-4">
              These Terms constitute a legally binding agreement between you and Libris ("we," "us," or "our"). By creating an account or using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">2. Description of Service</h3>
            <p className="mb-4">
              Libris is a personal book tracking application that allows users to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Track books they are reading, have read, or want to read</li>
              <li>Set and monitor reading goals</li>
              <li>Rate and review books</li>
              <li>Receive AI-powered book recommendations</li>
              <li>Analyze reading habits and patterns</li>
              <li>Export their book library data</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">3. User Accounts</h3>
            <p className="mb-4">
              To use certain features of the App, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Providing accurate and complete information</li>
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">4. User Content</h3>
            <p className="mb-4">
              You retain ownership of any content you submit to the App, including book notes, reviews, and profile information. By submitting content, you grant us a non-exclusive license to use, store, and display that content as necessary to provide the Service.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">5. Acceptable Use</h3>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Use the App for any illegal purpose</li>
              <li>Violate any intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Upload malicious code or content</li>
              <li>Create multiple accounts for abusive purposes</li>
            </ul>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">6. AI Features</h3>
            <p className="mb-4">
              The App includes AI-powered features for book recommendations and reading analysis. These features are provided "as is" and recommendations are for informational purposes only. We do not guarantee the accuracy or suitability of AI-generated content.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">7. Intellectual Property</h3>
            <p className="mb-4">
              The App and its original content, features, and functionality are owned by Libris and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">8. Termination</h3>
            <p className="mb-4">
              We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">9. Disclaimer of Warranties</h3>
            <p className="mb-4">
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">10. Limitation of Liability</h3>
            <p className="mb-4">
              IN NO EVENT SHALL LIBRIS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">11. Changes to Terms</h3>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by updating the "Last Updated" date. Continued use of the App after changes constitutes acceptance of the modified Terms.
            </p>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">12. Contact Information</h3>
            <p className="mb-4">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-brand-600 dark:text-brand-400 font-medium">support@libris.app</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Home Screen Component
  const HomeScreen = () => (
    <div className="min-h-screen bg-surface-base pb-20">
      <main className="p-4 md:p-6 pt-[calc(1rem+env(safe-area-inset-top))]">
        
        {/* Header with Back button */}
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDashboard(true)}
              className="w-10 h-10 bg-coral rounded-xl flex items-center justify-center shadow-lg shadow-coral/20 hover:bg-coral-dark transition-colors"
            >
              <ArrowLeft className="text-white h-5 w-5" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-text-primary">Libris</h1>
                <p className="text-xs text-text-muted">{view === 'library' ? 'My Library' : view === 'analytics' ? 'Analytics' : view}</p>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => { setView('library'); setEditingBook(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              view === 'library' 
                ? 'bg-coral text-white shadow-md shadow-coral/20' 
                : 'bg-surface-card text-text-secondary border border-surface-border'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Library
          </button>
          <button
            onClick={() => { setView('analytics'); setEditingBook(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              view === 'analytics' 
                ? 'bg-coral text-white shadow-md shadow-coral/20' 
                : 'bg-surface-card text-text-secondary border border-surface-border'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Analytics
          </button>
        </div>

        {/* Search & Sort - Only show in library view */}
        {view === 'library' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <LibrarySearch onSearchChange={setSearchTerm} />
            <div className="relative w-full sm:w-44">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-border bg-surface-card text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent shadow-sm text-sm appearance-none cursor-pointer"
              >
                <option value="dateAdded">Recent</option>
                <option value="rating">Rating</option>
                <option value="dateFinished">Finished</option>
                <option value="title">A-Z</option>
              </select>
            </div>
          </div>
        )}

        {/* AI Response Area */}
        {(aiResponse || aiLoading) && (
            <div className="mb-8 bg-surface-card rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Gemini AI Insights</h3>
                    </div>
                    <button onClick={() => setAiResponse(null)} className="text-text-muted hover:text-text-secondary">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {aiLoading ? (
                    <div className="flex items-center gap-2 text-text-secondary animate-pulse">
                        <div className="h-2 w-2 bg-text-muted rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-text-muted rounded-full animate-bounce delay-75"></div>
                        <div className="h-2 w-2 bg-text-muted rounded-full animate-bounce delay-150"></div>
                        Thinking...
                    </div>
                ) : (
                    renderAiContent()
                )}
            </div>
        )}

        {/* View Content */}
        {view === 'analytics' && (
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
            </div>
          }>
            <Analytics books={books} readingStreak={readingStreak} />
          </Suspense>
        )}
        
        {view === 'add' && (
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
            </div>
          }>
            <BookForm 
              initialData={editingBook || undefined} 
              onSubmit={handleAddBook} 
              onCancel={() => { setView('library'); setEditingBook(null); }} 
            />
          </Suspense>
        )}

        {view === 'collection' && selectedCollection && (
          <CollectionView
            collection={selectedCollection}
            books={books.filter(book => selectedCollection.bookIds.includes(book.id))}
            allBooks={books}
            onBack={() => { setView('library'); setSelectedCollection(null); setActiveTab('profile'); }}
            onAddBooks={(bookIds) => handleAddBooksToCollection(selectedCollection.id, bookIds)}
            onRemoveBook={(bookId) => handleRemoveBookFromCollection(selectedCollection.id, bookId)}
            onViewBook={setSelectedBook}
          />
        )}

        {view === 'goals' && (
          <div className="max-w-2xl mx-auto">
            <ReadingGoals
              goals={readingGoals}
              completedBooks={books.filter(b => b.status === ReadingStatus.COMPLETED && b.dateFinished?.startsWith(new Date().getFullYear().toString())).length}
              completedThisMonth={books.filter(b => {
                if (b.status !== ReadingStatus.COMPLETED || !b.dateFinished) return false;
                const finished = new Date(b.dateFinished);
                const now = new Date();
                return finished.getMonth() === now.getMonth() && finished.getFullYear() === now.getFullYear();
              }).length}
              onUpdateGoal={handleUpdateGoal}
              onCreateGoal={handleCreateGoal}
            />
          </div>
        )}

        {view === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoadingBooks ? (
               <div className="col-span-full flex justify-center py-12">
                   <Loader2 className="h-8 w-8 text-accent animate-spin" />
               </div>
            ) : paginatedBooks.map(book => (
              <div 
                key={book.id} 
                className="bg-surface-card rounded-xl shadow-sm border border-surface-border overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <div className="p-4 flex gap-4">
                  <div className="w-20 h-28 flex-shrink-0 bg-surface-border rounded shadow-sm overflow-hidden relative group">
                    {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs text-center p-1">No Cover</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-text-primary truncate pr-2" title={book.title}>{book.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                            book.status === ReadingStatus.COMPLETED ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            book.status === ReadingStatus.IN_PROGRESS ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-surface-base text-text-secondary'
                        }`}>
                            {book.status}
                        </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate">{book.author}</p>
                    <p className="text-xs text-text-muted mt-1">{book.genre} • {book.format}</p>
                    
                    {book.rating && book.rating > 0 ? (
                        <div className="flex items-center mt-2 text-amber-400 text-sm">
                            {'★'.repeat(Math.floor(book.rating))}
                            <span className="text-text-muted">{'★'.repeat(5 - Math.floor(book.rating))}</span>
                        </div>
                    ) : null}
                  </div>
                </div>
                
                {book.notes && (
                    <div className="px-4 pb-2">
                        <p className="text-xs text-text-muted italic line-clamp-2">"{book.notes}"</p>
                    </div>
                )}

                <div className="mt-auto bg-surface-base px-4 py-2 border-t border-surface-border flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                   <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-0" onClick={() => handleBookSummary(book)}>
                        AI Summary
                     </Button>
                     <a
                       href={getAffiliateLink(book.title, book.author)}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="text-xs h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-0.5"
                       onClick={(e) => e.stopPropagation()}
                     >
                       Buy 🛒
                     </a>
                   </div>
                   <div className="flex gap-1">
                        <button 
                            onClick={() => handleEdit(book)}
                            className="p-1.5 text-text-muted hover:text-accent hover:bg-surface-card rounded-md transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(book.id)}
                            className="p-1.5 text-text-muted hover:text-red-500 hover:bg-surface-card rounded-md transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                   </div>
                </div>
              </div>
            ))}
            
            {!isLoadingBooks && filteredAndSortedBooks.length === 0 && (
                <div className="col-span-full text-center py-12 text-text-muted">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No books found matching your criteria.</p>
                    {books.length === 0 && <p className="text-sm mt-2">Add a book to get started!</p>}
                </div>
            )}

            {/* Load More Button */}
            {!isLoadingBooks && hasMoreBooks && (
                <div className="col-span-full flex flex-col items-center gap-2 py-8">
                    <p className="text-sm text-text-muted">
                        Showing {paginatedBooks.length} of {filteredAndSortedBooks.length} books
                    </p>
                    <Button 
                        onClick={loadMoreBooks}
                        variant="secondary"
                        className="min-w-[200px]"
                    >
                        Load More Books
                    </Button>
                </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Screen Content */}
      {activeTab === 'home' && showDashboard && (
        <HomeDashboard
          books={books}
          readingStreak={readingStreak}
          unlockedAchievements={unlockedAchievements}
          readingGoal={readingGoal}
          theme={theme}
          username={displayName || session?.user?.email?.split('@')[0]}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onNavigateToLibrary={() => { setShowDashboard(false); setView('library'); }}
          onNavigateToAnalytics={() => { setShowDashboard(false); setView('analytics'); }}
          onNavigateToGoals={() => { setShowDashboard(false); setView('goals'); }}
          onAddBook={() => { setShowDashboard(false); setView('add'); }}
          onSelectBook={(book) => setSelectedBook(book)}
          onRefresh={async () => { await loadBooks(); }}
        />
      )}
      {activeTab === 'home' && !showDashboard && <HomeScreen />}
      {activeTab === 'profile' && view === 'library' && <ProfileScreen />}
      {activeTab === 'profile' && view === 'manage-profile' && <ManageProfileScreen />}
      {activeTab === 'profile' && view === 'streak' && <StreakScreen />}
      {activeTab === 'profile' && view === 'goals' && <GoalsScreen />}
      {activeTab === 'profile' && view === 'insights' && <InsightsScreen />}
      {activeTab === 'profile' && view === 'achievements' && <AchievementsScreen />}
      {activeTab === 'profile' && view === 'collections-list' && <CollectionsScreen />}
      {activeTab === 'profile' && view === 'reminders' && <RemindersScreen />}
      {activeTab === 'community' && session?.user && <Community currentUserId={session.user.id} />}
      {activeTab === 'challenges' && session?.user && <Challenges currentUserId={session.user.id} />}
      {activeTab === 'privacy' && <PrivacyPolicyScreen />}
      {activeTab === 'terms' && <TermsOfServiceScreen />}

      {/* Bottom Navigation - Hide on legal pages */}
      {(activeTab === 'home' || activeTab === 'profile' || activeTab === 'community' || activeTab === 'challenges') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-border pb-[env(safe-area-inset-bottom)] z-50">
          <div className="flex items-center justify-around h-16">
            <button
              onClick={() => { setActiveTab('home'); setShowDashboard(true); setView('library'); }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'home' 
                  ? 'text-accent' 
                  : 'text-text-muted'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Home</span>
            </button>
            
            <button
              onClick={() => setActiveTab('community')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'community' 
                  ? 'text-accent' 
                  : 'text-text-muted'
              }`}
            >
              <Globe className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Community</span>
            </button>
            
            <button
              onClick={() => { setView('add'); setShowDashboard(false); setEditingBook(null); setActiveTab('home'); }}
              className="flex items-center justify-center w-14 h-14 -mt-5 bg-gradient-to-br from-accent to-accent-dark rounded-full text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{ boxShadow: '0 8px 24px rgba(124, 92, 252, 0.4)' }}
            >
              <Plus className="h-7 w-7" />
            </button>

            <button
              onClick={() => setActiveTab('challenges')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'challenges' 
                  ? 'text-accent' 
                  : 'text-text-muted'
              }`}
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Challenges</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('profile'); setView('library'); }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'profile' 
                  ? 'text-accent' 
                  : 'text-text-muted'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          notes={bookNotes}
          onClose={() => setSelectedBook(null)}
          onEdit={(book) => {
            setSelectedBook(null);
            handleEdit(book);
          }}
          onSessionComplete={handleReadingSessionComplete}
          onAddNote={handleAddBookNote}
          onDeleteNote={handleDeleteBookNote}
          onProgressUpdate={handleReadingProgressUpdate}
          onReaderStateChange={setIsEBookReaderOpen}
          closeReaderTrigger={closeReaderTrigger}
        />
      )}

      {/* Reading Session Summary Overlay */}
      {sessionSummary && (
        <ReadingSessionSummary
          durationMinutes={sessionSummary.durationMinutes}
          bookTitle={sessionSummary.bookTitle}
          totalBookMinutes={sessionSummary.totalBookMinutes}
          currentStreak={sessionSummary.currentStreak}
          streakIncremented={sessionSummary.streakIncremented}
          onClose={() => setSessionSummary(null)}
        />
      )}

      {/* Premium Paywall Modal */}
      {showPaywall && (
        <PremiumPaywall
          premiumState={premiumState}
          onUpgrade={handleUpgrade}
          onClose={() => setShowPaywall(false)}
        />
      )}

      {/* Onboarding Quiz Modal */}
      {showOnboarding && (
        <OnboardingQuiz 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}