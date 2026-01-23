import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef } from 'react';
import { Book, ReadingStatus, ViewMode, Theme, ReadingPreferences, DEFAULT_PREFERENCES, BookNote, ReadingGoal, ReadingStreak, DEFAULT_STREAK, Achievement, ACHIEVEMENTS, AchievementId, ReadingSession, BookCollection, DEFAULT_COLLECTIONS } from './types';
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

// Lazy load heavy components for better initial load time
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const BookForm = lazy(() => import('./components/BookForm').then(m => ({ default: m.BookForm })));
const BookNotes = lazy(() => import('./components/BookNotes').then(m => ({ default: m.BookNotes })));
import { supabase, bookApi } from './services/supabase';
import { ebookStorage } from './services/ebookStorage';
import { BookOpen, BarChart2, Plus, Trash2, Edit2, Download, BrainCircuit, X, Trophy, ArrowUpDown, CheckCircle2, Moon, Sun, Laptop, LogOut, Loader2, ExternalLink, Star, User, Camera, MessageSquare, Shield, ChevronRight, Home, ArrowLeft, FileText, Globe } from 'lucide-react';
import { getBookRecommendations, analyzeReadingHabits, getBookSummary } from './services/gemini';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToastActions } from './components/Toast';

const APP_VERSION = '1.0.0';

type SortOption = 'dateAdded' | 'rating' | 'title' | 'dateFinished';
type TabView = 'home' | 'profile' | 'community' | 'privacy' | 'terms';

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

  const [view, setView] = useState<ViewMode>('library');
  const [activeTab, setActiveTab] = useState<TabView>('home');
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
  const [aiMode, setAiMode] = useState<'recommend' | 'analyze' | null>(null);

  // Profile Picture State
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

  // Reading Preferences State (for AI recommendations)
  const [readingPreferences, setReadingPreferences] = useState<ReadingPreferences>(() => {
    const saved = localStorage.getItem('libris-reading-preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

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
          loadBooks();
          // Load user settings from metadata on auth change
          loadUserSettings(session);
      } else {
          setBooks([]);
          setProfilePicture(null); // Clear profile picture on logout
          setReadingGoal(12); // Reset to default on logout
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load profile picture and reading goal from Supabase user metadata
  const loadUserSettings = (session: any) => {
    const metadata = session?.user?.user_metadata;
    
    // Load avatar
    if (metadata?.avatar_url) {
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
            // Priority: Close modals first, then navigate views
            if (selectedBook) {
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
                setView('library');
                setEditingBook(null);
            } else if (activeTab !== 'home') {
                setActiveTab('home');
            } else {
                CapApp.exitApp();
            }
        });
    };
    handleBackButton();

    return () => {
        CapApp.removeAllListeners();
    };
  }, [view, activeTab, selectedBook, showOnboarding, aiResponse]);


  // --- Handlers ---

  const handleAddBook = async (book: Book) => {
    try {
      if (editingBook) {
        // Optimistic update
        setBooks(books.map(b => b.id === book.id ? book : b));
        await bookApi.updateBook(book);
      } else {
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
    await supabase.auth.signOut();
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (preferences: ReadingPreferences) => {
    setReadingPreferences(preferences);
    setShowOnboarding(false);
    localStorage.setItem('libris-reading-preferences', JSON.stringify(preferences));
    
    // Sync to Supabase
    try {
      await supabase.auth.updateUser({
        data: { reading_preferences: preferences }
      });
      toast.success('Preferences saved! AI recommendations are now personalized.');
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
  };

  const handleOnboardingSkip = async () => {
    const skippedPrefs = { ...DEFAULT_PREFERENCES, hasCompletedOnboarding: true };
    setReadingPreferences(skippedPrefs);
    setShowOnboarding(false);
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
    
    // Update reading streak
    updateReadingStreak();
    
    // Check for achievements
    checkAchievements(updatedBooks, durationMinutes);
    
    // Find and update the book in the database
    const book = books.find(b => b.id === bookId);
    if (book) {
      try {
        await bookApi.updateBook({
          ...book,
          totalReadingMinutes: (book.totalReadingMinutes || 0) + durationMinutes
        });
        toast.success(`Added ${durationMinutes} minutes to your reading time!`);
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
    window.open(playStoreUrl, '_blank');
  };

  const openExternalLink = (url: string) => {
    window.open(url, '_blank');
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setView('add');
  };

  const updateGoal = async () => {
      const newGoal = prompt("Set your yearly reading goal:", readingGoal.toString());
      if (newGoal && !isNaN(parseInt(newGoal))) {
          const goalValue = parseInt(newGoal);
          setReadingGoal(goalValue);
          
          // Save to Supabase user metadata for cross-device sync
          try {
            await supabase.auth.updateUser({
              data: { reading_goal: goalValue }
            });
          } catch (error) {
            console.error('Failed to sync reading goal:', error);
          }
      }
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
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
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
            encoding: 'utf8'
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

  const handleGeminiAction = async (mode: 'recommend' | 'analyze') => {
    setAiLoading(true);
    setAiMode(mode);
    setAiResponse(null);
    setActiveTab('home'); // Switch to home tab to show results
    setView('library');
    
    try {
        let text = "";
        if (mode === 'recommend') {
            // Pass reading preferences for better recommendations
            text = await getBookRecommendations(books, readingPreferences);
        } else {
            text = await analyzeReadingHabits(books);
        }
        setAiResponse(text);
    } catch (e: any) {
        setAiResponse(`Error: ${e.message || "Failed to connect to AI service. Please try again."}`);
    } finally {
        setAiLoading(false);
    }
  };

  const handleBookSummary = async (book: Book) => {
      toast.info(`Generating summary for "${book.title}"...`);
      try {
        const summary = await getBookSummary(book.title, book.author);
        // For long content, we'll show a brief success message
        // The full summary could be displayed in a modal in the future
        toast.success(`Summary generated! Check console for details.`);
        console.log(`AI Summary for ${book.title}:\n\n${summary}`);
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
        return <strong key={index} className="font-semibold text-slate-900 dark:text-white">{part}</strong>;
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
                  return <div className="prose prose-sm dark:prose-invert text-slate-700 dark:text-slate-300 whitespace-pre-line">{renderFormattedText(aiResponse)}</div>;
              }

              return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {recommendations.map((rec: any, idx: number) => (
                          <div key={idx} className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{rec.title}</h4>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2 uppercase tracking-wide">{rec.author}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.reason}</p>
                          </div>
                      ))}
                  </div>
              );
          } catch (e) {
              return <div className="prose prose-sm dark:prose-invert text-slate-700 dark:text-slate-300 whitespace-pre-line">{renderFormattedText(aiResponse)}</div>;
          }
      }
      return (
          <div className="prose prose-sm dark:prose-invert text-slate-700 dark:text-slate-300 max-w-none whitespace-pre-line">
              {renderFormattedText(aiResponse)}
          </div>
      );
  };

  // --- Rendering ---

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Profile Screen Component
  const ProfileScreen = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Profile Header */}
      <div className="bg-brand-600 dark:bg-brand-700 pt-[env(safe-area-inset-top)] pb-8 px-4">
        <h1 className="text-xl font-bold text-white text-center mb-6 pt-4">Profile</h1>
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              )}
              {uploadingProfilePic && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer hover:bg-brand-400 transition-colors">
              <Camera className="h-4 w-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>
          <h2 className="text-xl font-bold text-white">{session.user.email?.split('@')[0]}</h2>
          <p className="text-brand-200 text-sm">{session.user.email}</p>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 -mt-4">
        {/* Stats Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{books.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Books</p>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{booksReadThisYear}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Read This Year</p>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{readingStreak.currentStreak}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Reading Streak */}
        <div className="mb-4">
          <StreakTracker streak={readingStreak} />
        </div>

        {/* Reading Goals */}
        <div className="mb-4">
          <ReadingGoals
            goals={readingGoals}
            completedBooks={booksReadThisYear}
            completedThisMonth={booksCompletedThisMonth}
            onUpdateGoal={handleUpdateGoal}
            onCreateGoal={handleCreateGoal}
          />
        </div>

        {/* Achievements */}
        <div className="mb-4">
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

        {/* Reading Insights & Analytics */}
        <div className="mb-4">
          <ReadingInsights
            books={books}
            readingSessions={readingSessions}
          />
        </div>

        {/* Book Collections */}
        <div className="mb-4">
          <BookCollections
            collections={collections}
            books={books}
            onCreateCollection={handleCreateCollection}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
            onViewCollection={handleViewCollection}
          />
        </div>

        {/* AI Assistant Section */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <BrainCircuit className="h-5 w-5" />
            <span>AI Assistant</span>
          </div>
          <p className="text-indigo-100 text-sm mb-3">Get smart insights powered by Gemini 2.5</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => handleGeminiAction('recommend')}>
              Recommend
            </Button>
            <Button size="sm" className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0" onClick={() => handleGeminiAction('analyze')}>
              Analyze Habits
            </Button>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">Appearance</p>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
              {(['light', 'system', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-colors ${
                    theme === t 
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-white font-medium' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t === 'light' && <Sun className="h-4 w-4" />}
                  {t === 'dark' && <Moon className="h-4 w-4" />}
                  {t === 'system' && <Laptop className="h-4 w-4" />}
                  <span className="text-sm capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">Data</p>
          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-white">Export Library</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Reading Reminders Section */}
        <div className="mb-4">
          <ReadingReminders />
        </div>

        {/* Reading Preferences Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">Personalization</p>
          <button 
            onClick={() => setShowOnboarding(true)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              <div className="text-left">
                <span className="text-slate-900 dark:text-white block">Update Reading Preferences</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {readingPreferences.hasCompletedOnboarding 
                    ? `${readingPreferences.favoriteGenres.length} genres selected` 
                    : 'Set up for better AI recommendations'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Feedback Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">Feedback</p>
          <button 
            onClick={handleRateApp}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-amber-500" />
              <span className="text-slate-900 dark:text-white">Rate App</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
          <div className="mx-4 border-t border-slate-100 dark:border-slate-700"></div>
          <button 
            onClick={() => openExternalLink('mailto:support@libris.app?subject=Feedback')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-white">Send Feedback</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Legal Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 pt-4 pb-2">Legal</p>
          <button 
            onClick={() => setActiveTab('privacy')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-white">Privacy Policy</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
          <div className="mx-4 border-t border-slate-100 dark:border-slate-700"></div>
          <button 
            onClick={() => setActiveTab('terms')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-900 dark:text-white">Terms of Service</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Sign Out */}
        <button 
          onClick={handleSignOut}
          className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mb-4"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
          <p>Libris v{APP_VERSION}</p>
          <p className="text-xs mt-1">Made with ❤️ for book lovers</p>
        </div>
      </div>
    </div>
  );

  // Privacy Policy Screen
  const PrivacyPolicyScreen = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy Policy for Libris</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Introduction</h3>
            <p className="mb-4">
              Libris ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App").
            </p>
            <p className="mb-4">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the App.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Information We Collect</h3>
            <p className="mb-4">
              <strong>Personal Information:</strong> When you create an account, we collect your email address and any profile information you choose to provide.
            </p>
            <p className="mb-4">
              <strong>Book Data:</strong> We collect information about the books you add to your library, including titles, authors, ratings, reading status, and notes you create.
            </p>
            <p className="mb-4">
              <strong>Usage Data:</strong> We may collect information about how you use the App, including your reading goals and preferences.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">How We Use Your Information</h3>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Provide, maintain, and improve the App</li>
              <li>Store and sync your book library across devices</li>
              <li>Provide AI-powered book recommendations and reading insights</li>
              <li>Send you updates and notifications (with your consent)</li>
              <li>Respond to your comments and questions</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Data Storage & Security</h3>
            <p className="mb-4">
              Your data is securely stored using Supabase, a trusted cloud infrastructure provider. We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Third-Party Services</h3>
            <p className="mb-4">
              We use Google's Gemini AI to provide book recommendations and reading analysis. When using these features, relevant book data is processed by Google's AI services in accordance with their privacy policies.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Your Rights</h3>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Access and export your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential data collection</li>
              <li>Update or correct your personal information</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Children's Privacy</h3>
            <p className="mb-4">
              The App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Changes to This Policy</h3>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">Contact Us</h3>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-[env(safe-area-inset-top)] sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => setActiveTab('profile')}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Terms of Service</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="mb-4">
              Welcome to Libris. By accessing or using our mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
            </p>
            <p className="mb-4">
              These Terms constitute a legally binding agreement between you and Libris ("we," "us," or "our"). By creating an account or using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">2. Description of Service</h3>
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

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">3. User Accounts</h3>
            <p className="mb-4">
              To use certain features of the App, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Providing accurate and complete information</li>
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">4. User Content</h3>
            <p className="mb-4">
              You retain ownership of any content you submit to the App, including book notes, reviews, and profile information. By submitting content, you grant us a non-exclusive license to use, store, and display that content as necessary to provide the Service.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">5. Acceptable Use</h3>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Use the App for any illegal purpose</li>
              <li>Violate any intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Upload malicious code or content</li>
              <li>Create multiple accounts for abusive purposes</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">6. AI Features</h3>
            <p className="mb-4">
              The App includes AI-powered features for book recommendations and reading analysis. These features are provided "as is" and recommendations are for informational purposes only. We do not guarantee the accuracy or suitability of AI-generated content.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">7. Intellectual Property</h3>
            <p className="mb-4">
              The App and its original content, features, and functionality are owned by Libris and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">8. Termination</h3>
            <p className="mb-4">
              We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">9. Disclaimer of Warranties</h3>
            <p className="mb-4">
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">10. Limitation of Liability</h3>
            <p className="mb-4">
              IN NO EVENT SHALL LIBRIS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">11. Changes to Terms</h3>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by updating the "Last Updated" date. Continued use of the App after changes constitutes acceptance of the modified Terms.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">12. Contact Information</h3>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <main className="p-4 md:p-6 pt-[calc(1rem+env(safe-area-inset-top))]">
        
        {/* Header */}
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BookOpen className="text-white h-5 w-5" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Libris</h1>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => { setView('library'); setEditingBook(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              view === 'library' 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Library
          </button>
          <button
            onClick={() => { setView('analytics'); setEditingBook(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              view === 'analytics' 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm appearance-none cursor-pointer"
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
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Gemini AI Insights</h3>
                    </div>
                    <button onClick={() => setAiResponse(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {aiLoading ? (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 animate-pulse">
                        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-75"></div>
                        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-150"></div>
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
              <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
            </div>
          }>
            <Analytics books={books} />
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

        {view === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoadingBooks ? (
               <div className="col-span-full flex justify-center py-12">
                   <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
               </div>
            ) : paginatedBooks.map(book => (
              <div 
                key={book.id} 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <div className="p-4 flex gap-4">
                  <div className="w-20 h-28 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded shadow-sm overflow-hidden relative group">
                    {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center p-1">No Cover</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate pr-2" title={book.title}>{book.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                            book.status === ReadingStatus.COMPLETED ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            book.status === ReadingStatus.IN_PROGRESS ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                            {book.status}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{book.author}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{book.genre} • {book.format}</p>
                    
                    {book.rating && book.rating > 0 ? (
                        <div className="flex items-center mt-2 text-amber-400 text-sm">
                            {'★'.repeat(Math.floor(book.rating))}
                            <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - Math.floor(book.rating))}</span>
                        </div>
                    ) : null}
                  </div>
                </div>
                
                {book.notes && (
                    <div className="px-4 pb-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">"{book.notes}"</p>
                    </div>
                )}

                <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                   <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-0" onClick={() => handleBookSummary(book)}>
                      AI Summary
                   </Button>
                   <div className="flex gap-1">
                        <button 
                            onClick={() => handleEdit(book)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(book.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                   </div>
                </div>
              </div>
            ))}
            
            {!isLoadingBooks && filteredAndSortedBooks.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No books found matching your criteria.</p>
                    {books.length === 0 && <p className="text-sm mt-2">Add a book to get started!</p>}
                </div>
            )}

            {/* Load More Button */}
            {!isLoadingBooks && hasMoreBooks && (
                <div className="col-span-full flex flex-col items-center gap-2 py-8">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
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
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Screen Content */}
      {activeTab === 'home' && <HomeScreen />}
      {activeTab === 'profile' && <ProfileScreen />}
      {activeTab === 'community' && session?.user && <Community currentUserId={session.user.id} />}
      {activeTab === 'privacy' && <PrivacyPolicyScreen />}
      {activeTab === 'terms' && <TermsOfServiceScreen />}

      {/* Bottom Navigation - Hide on legal pages */}
      {(activeTab === 'home' || activeTab === 'profile' || activeTab === 'community') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-50">
          <div className="flex items-center justify-around h-16">
            <button
              onClick={() => { setActiveTab('home'); setView('library'); }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'home' 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Home</span>
            </button>
            
            <button
              onClick={() => { setView('add'); setEditingBook(null); setActiveTab('home'); }}
              className="flex items-center justify-center w-14 h-14 -mt-5 bg-brand-600 rounded-full text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-colors"
            >
              <Plus className="h-7 w-7" />
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'community' 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Globe className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Community</span>
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === 'profile' 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : 'text-slate-400 dark:text-slate-500'
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