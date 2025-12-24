import { useState, useEffect, useMemo } from 'react';
import { Book, ReadingStatus, ViewMode, Theme } from './types';
import { Analytics } from './components/Analytics';
import { BookForm } from './components/BookForm';
import { Button } from './components/Button';
import { Auth } from './components/Auth';
import { supabase, bookApi } from './services/supabase';
import { BookOpen, BarChart2, Plus, Search, Trash2, Edit2, Download, BrainCircuit, X, Trophy, ArrowUpDown, CheckCircle2, Moon, Sun, Laptop, Menu, LogOut, Loader2 } from 'lucide-react';
import { getBookRecommendations, analyzeReadingHabits, getBookSummary } from './services/gemini';
import { App as CapApp } from '@capacitor/app';

type SortOption = 'dateAdded' | 'rating' | 'title' | 'dateFinished';

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
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('dateAdded');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // AI State
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'recommend' | 'analyze' | null>(null);

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
            if (isSidebarOpen) {
                setIsSidebarOpen(false);
            } else if (view !== 'library') {
                setView('library');
                setEditingBook(null);
            } else {
                CapApp.exitApp();
            }
        });
    };
    handleBackButton();

    return () => {
        CapApp.removeAllListeners();
    };
  }, [isSidebarOpen, view]);


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
    } catch (error: any) {
      console.error("Error saving book:", error);
      // Show the real error message from Supabase
      alert(`Failed to save book: ${error.message || error.details || "Unknown error"}`);
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
      } catch (error: any) {
        console.error("Error deleting book:", error);
        alert(`Failed to delete book: ${error.message || error.details || "Unknown error"}`);
        setBooks(previousBooks);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

  const handleExport = () => {
    if (books.length === 0) {
      alert("No books to export.");
      return;
    }

    const headers = ['Title', 'Author', 'Genre', 'Status', 'Format', 'Rating', 'Date Started', 'Date Finished', 'Notes', 'Added At', 'ID', 'Cover URL'];
    const keys: (keyof Book)[] = ['title', 'author', 'genre', 'status', 'format', 'rating', 'dateStarted', 'dateFinished', 'notes', 'addedAt', 'id', 'coverUrl'];

    const csvRows = books.map(book => {
      return keys.map(key => {
        let val = book[key];
        if (val === undefined || val === null) val = '';
        let cell = String(val);
        if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'my_library.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeminiAction = async (mode: 'recommend' | 'analyze') => {
    setAiLoading(true);
    setAiMode(mode);
    setAiResponse(null);
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
      if(window.confirm(`Generate summary for ${book.title} using AI?`)) {
        const summary = await getBookSummary(book.title, book.author);
        alert(`AI Summary for ${book.title}:\n\n${summary}`);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Menu Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-30 h-full w-64 pt-[env(safe-area-inset-top)]
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
               <BookOpen className="text-white h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Libris</h1>
          </div>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => { setView('library'); setEditingBook(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'library' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <BookOpen className="h-5 w-5" />
            My Library
          </button>
          <button 
             onClick={() => { setView('analytics'); setEditingBook(null); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'analytics' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <BarChart2 className="h-5 w-5" />
            Analytics
          </button>
           <button 
             onClick={() => { setView('add'); setEditingBook(null); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'add' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Plus className="h-5 w-5" />
            Add Book
          </button>
        </nav>

        {/* Goal Tracker Widget */}
        <div className="px-4 py-2">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wide">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>{new Date().getFullYear()} Challenge</span>
                    </div>
                    <button onClick={updateGoal} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium">Edit</button>
                </div>
                <div className="flex items-end gap-1 mb-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{booksReadThisYear}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ {readingGoal} books</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((booksReadThisYear / readingGoal) * 100, 100)}%` }}
                    ></div>
                </div>
                {booksReadThisYear >= readingGoal && (
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Goal reached!
                    </div>
                )}
            </div>
        </div>

        <div className="p-4 mt-auto space-y-4 border-t border-slate-100 dark:border-slate-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
             {/* AI Section */}
             <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100 font-semibold mb-2">
                    <BrainCircuit className="h-4 w-4" />
                    <span>AI Assistant</span>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">Get smart insights powered by Gemini 2.5.</p>
                <div className="space-y-2">
                    <Button size="sm" variant="secondary" className="w-full text-xs bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 dark:text-slate-200" onClick={() => handleGeminiAction('recommend')}>
                        Recommend Books
                    </Button>
                    <Button size="sm" variant="secondary" className="w-full text-xs bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 dark:text-slate-200" onClick={() => handleGeminiAction('analyze')}>
                        Analyze Habits
                    </Button>
                </div>
             </div>
             
             {/* Theme Toggle */}
             <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {(['light', 'system', 'dark'] as Theme[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-1.5 rounded-md transition-colors ${theme === t ? 'bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title={`${t} mode`}
                    >
                        {t === 'light' && <Sun className="h-4 w-4" />}
                        {t === 'dark' && <Moon className="h-4 w-4" />}
                        {t === 'system' && <Laptop className="h-4 w-4" />}
                    </button>
                ))}
             </div>

             <Button variant="ghost" size="sm" onClick={handleExport} className="w-full justify-start text-slate-500 dark:text-slate-400">
                <Download className="h-4 w-4 mr-2" /> Export CSV
             </Button>

             <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
             </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen w-full pt-[calc(2rem+env(safe-area-inset-top))]">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
            </button>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
                    {view === 'add' ? (editingBook ? 'Edit Book' : 'Add New Book') : view}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {view === 'library' ? `${filteredAndSortedBooks.length} books found` : 'Track your reading progress'}
                </p>
            </div>
          </div>

          {view === 'library' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm"
                    />
                </div>
                <div className="relative w-full md:w-48">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select 
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm text-sm appearance-none cursor-pointer"
                    >
                        <option value="dateAdded">Recently Added</option>
                        <option value="rating">Highest Rated</option>
                        <option value="dateFinished">Date Finished</option>
                        <option value="title">Alphabetical</option>
                    </select>
                </div>
            </div>
          )}
        </header>

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
        {view === 'analytics' && <Analytics books={books} />}
        
        {view === 'add' && (
          <BookForm 
            initialData={editingBook || undefined} 
            onSubmit={handleAddBook} 
            onCancel={() => { setView('library'); setEditingBook(null); }} 
          />
        )}

        {view === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoadingBooks ? (
               <div className="col-span-full flex justify-center py-12">
                   <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
               </div>
            ) : filteredAndSortedBooks.map(book => (
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
          </div>
        )}
      </main>
    </div>
  );
}