import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Book, ReadingStatus, ViewMode, Theme } from './types';
import { Button } from './components/Button';
import { Auth } from './components/Auth';

// Lazy load heavy components for better initial load time
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const BookForm = lazy(() => import('./components/BookForm').then(m => ({ default: m.BookForm })));
import { supabase, bookApi } from './services/supabase';
import { BookOpen, BarChart2, Plus, Search, Trash2, Edit2, Download, BrainCircuit, X, Trophy, ArrowUpDown, CheckCircle2, Moon, Sun, Laptop, LogOut, Loader2, ExternalLink, Star, User, Camera, MessageSquare, Shield, ChevronRight, Home } from 'lucide-react';
import { getBookRecommendations, analyzeReadingHabits, getBookSummary } from './services/gemini';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToastActions } from './components/Toast';

const APP_VERSION = '1.0.0';

type SortOption = 'dateAdded' | 'rating' | 'title' | 'dateFinished';
type TabView = 'home' | 'profile';

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
      } else {
          setBooks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  // --- Mobile Back Button Handling ---
  useEffect(() => {
    const handleBackButton = async () => {
        CapApp.addListener('backButton', ({ canGoBack }) => {
            if (view !== 'library') {
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
  }, [view, activeTab]);


  // --- Handlers ---

  const handleAddBook = async (book: Book) => {
    try {
      if (editingBook) {
        // Optimistic update
        setBooks(books.map(b => b.id === book.id ? book : b));
        await bookApi.updateBook(book);
      } else {
        // Optimistic update (temp ID)
        const tempId = crypto.randomUUID();
        const tempBook = { ...book, id: tempId };
        setBooks([tempBook, ...books]);
        
        // Real update
        const realBook = await bookApi.addBook(book);
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

  const updateGoal = () => {
      const newGoal = prompt("Set your yearly reading goal:", readingGoal.toString());
      if (newGoal && !isNaN(parseInt(newGoal))) {
          setReadingGoal(parseInt(newGoal));
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
            // getBookRecommendations already returns a JSON string
            text = await getBookRecommendations(books);
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
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
              <span className="text-3xl font-bold text-white">
                {session.user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <Camera className="h-4 w-4 text-white" />
            </button>
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{readingGoal}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Goal</p>
            </div>
          </div>
        </div>

        {/* Reading Goal Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-slate-900 dark:text-white">{new Date().getFullYear()} Reading Challenge</span>
              </div>
              <button onClick={updateGoal} className="text-sm text-brand-600 dark:text-brand-400 font-medium">Edit</button>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{booksReadThisYear}</span>
              <span className="text-slate-500 dark:text-slate-400 mb-1">/ {readingGoal} books</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((booksReadThisYear / readingGoal) * 100, 100)}%` }}
              ></div>
            </div>
            {booksReadThisYear >= readingGoal && (
              <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Goal reached! 🎉
              </div>
            )}
          </div>
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
              Analyze
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
            onClick={() => openExternalLink('https://libris-privacy.example.com')}
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
            onClick={() => openExternalLink('https://libris-terms.example.com')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-slate-500 dark:text-slate-400" />
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
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search books..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm"
              />
            </div>
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

        {view === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoadingBooks ? (
               <div className="col-span-full flex justify-center py-12">
                   <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
               </div>
            ) : paginatedBooks.map(book => (
              <div key={book.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
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

                <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
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
      {activeTab === 'home' ? <HomeScreen /> : <ProfileScreen />}

      {/* Bottom Navigation */}
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
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Home</span>
          </button>
          
          <button
            onClick={() => { setView('add'); setEditingBook(null); setActiveTab('home'); }}
            className="flex items-center justify-center w-14 h-14 -mt-5 bg-brand-600 rounded-full text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-7 w-7" />
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'profile' 
                ? 'text-brand-600 dark:text-brand-400' 
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}