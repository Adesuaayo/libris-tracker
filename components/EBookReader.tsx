import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Sun, 
  Moon,
  Type,
  Loader2,
  List
} from 'lucide-react';
import ePub, { Book as EpubBook, Rendition, NavItem } from 'epubjs';

interface EBookReaderProps {
  fileData: string; // Base64 encoded file
  fileType: 'epub' | 'pdf';
  fileName: string;
  bookTitle: string;
  onClose: () => void;
  onProgressUpdate?: (currentPage: number, totalPages: number) => void;
}

interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  fontFamily: string;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 100,
  theme: 'light',
  fontFamily: 'serif'
};

export function EBookReader({ 
  fileData, 
  fileType, 
  fileName, 
  bookTitle, 
  onClose,
  onProgressUpdate 
}: EBookReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('libris-reader-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('libris-reader-settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize EPUB reader
  useEffect(() => {
    if (fileType !== 'epub' || !viewerRef.current) return;

    const initEpub = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Convert base64 to ArrayBuffer
        const binaryString = atob(fileData.split(',')[1] || fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        // Create ePub book
        const book = ePub(arrayBuffer);
        bookRef.current = book;

        // Wait for book to be ready
        await book.ready;

        // Get table of contents
        const navigation = await book.loaded.navigation;
        setToc(navigation.toc);

        // Create rendition
        const rendition = book.renderTo(viewerRef.current!, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated'
        });
        renditionRef.current = rendition;

        // Apply initial theme
        applyTheme(settings.theme);
        applyFontSize(settings.fontSize);

        // Display book
        await rendition.display();

        // Track location changes
        rendition.on('locationChanged', (location: any) => {
          const currentCfi = location.start?.cfi;
          if (currentCfi) {
            localStorage.setItem(`libris-epub-location-${fileName}`, currentCfi);
          }

          // Calculate progress
          if (book.locations.length()) {
            const percent = book.locations.percentageFromCfi(currentCfi);
            setProgress(Math.round(percent * 100));
            
            const currentPage = Math.round(percent * book.locations.length());
            onProgressUpdate?.(currentPage, book.locations.length());
          }
        });

        // Generate locations for progress tracking
        await book.locations.generate(1024);

        // Restore last position
        const savedLocation = localStorage.getItem(`libris-epub-location-${fileName}`);
        if (savedLocation) {
          await rendition.display(savedLocation);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading EPUB:', err);
        setError('Failed to load the eBook. The file might be corrupted.');
        setIsLoading(false);
      }
    };

    initEpub();

    return () => {
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [fileData, fileType, fileName]);

  const applyTheme = useCallback((theme: 'light' | 'dark' | 'sepia') => {
    if (!renditionRef.current) return;

    const themes: Record<string, { body: Record<string, string> }> = {
      light: {
        body: { 
          background: '#ffffff', 
          color: '#1a1a1a' 
        }
      },
      dark: {
        body: { 
          background: '#1a1a2e', 
          color: '#e4e4e7' 
        }
      },
      sepia: {
        body: { 
          background: '#f4ecd8', 
          color: '#5c4b37' 
        }
      }
    };

    renditionRef.current.themes.default(themes[theme]);
  }, []);

  const applyFontSize = useCallback((size: number) => {
    if (!renditionRef.current) return;
    renditionRef.current.themes.fontSize(`${size}%`);
  }, []);

  const goToPrev = () => {
    renditionRef.current?.prev();
  };

  const goToNext = () => {
    renditionRef.current?.next();
  };

  const goToChapter = (href: string) => {
    renditionRef.current?.display(href);
    setShowToc(false);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'sepia') => {
    setSettings(prev => ({ ...prev, theme }));
    applyTheme(theme);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(80, Math.min(150, settings.fontSize + delta));
    setSettings(prev => ({ ...prev, fontSize: newSize }));
    applyFontSize(newSize);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle swipe gestures
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  const getThemeStyles = () => {
    switch (settings.theme) {
      case 'dark':
        return 'bg-[#1a1a2e] text-zinc-200';
      case 'sepia':
        return 'bg-[#f4ecd8] text-[#5c4b37]';
      default:
        return 'bg-white text-slate-900';
    }
  };

  if (fileType === 'pdf') {
    return (
      <div className="fixed inset-0 z-[80] bg-slate-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-medium truncate max-w-[60%]">{bookTitle}</h3>
          <div className="w-10" />
        </div>
        <div className="flex-1 overflow-auto">
          <iframe
            src={fileData}
            className="w-full h-full"
            title={bookTitle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[80] flex flex-col ${getThemeStyles()}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        settings.theme === 'dark' 
          ? 'bg-slate-800 border-slate-700' 
          : settings.theme === 'sepia'
          ? 'bg-[#e6dcc6] border-[#d4c5a9]'
          : 'bg-slate-100 border-slate-200'
      }`}>
        <button 
          onClick={onClose} 
          className={`p-2 rounded-lg transition-colors ${
            settings.theme === 'dark' 
              ? 'hover:bg-slate-700 text-white' 
              : 'hover:bg-slate-200 text-slate-700'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-sm font-medium truncate max-w-[50%]">{bookTitle}</h3>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowToc(!showToc)}
            className={`p-2 rounded-lg transition-colors ${
              settings.theme === 'dark' 
                ? 'hover:bg-slate-700 text-white' 
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              settings.theme === 'dark' 
                ? 'hover:bg-slate-700 text-white' 
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`absolute top-14 right-4 z-10 p-4 rounded-xl shadow-xl border ${
          settings.theme === 'dark' 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          <h4 className="font-medium mb-3">Reading Settings</h4>
          
          {/* Theme Selection */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Theme</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-2 rounded-lg flex items-center gap-1 text-xs ${
                  settings.theme === 'light' 
                    ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500' 
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => handleThemeChange('sepia')}
                className={`p-2 rounded-lg flex items-center gap-1 text-xs ${
                  settings.theme === 'sepia' 
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' 
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Sepia
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-2 rounded-lg flex items-center gap-1 text-xs ${
                  settings.theme === 'dark' 
                    ? 'bg-slate-600 text-white ring-2 ring-slate-400' 
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Font Size</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleFontSizeChange(-10)}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <Type className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium">{settings.fontSize}%</span>
              <button
                onClick={() => handleFontSizeChange(10)}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <Type className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showToc && (
        <div className={`absolute top-14 left-4 right-4 max-h-[60vh] z-10 rounded-xl shadow-xl border overflow-hidden ${
          settings.theme === 'dark' 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <h4 className="font-medium">Table of Contents</h4>
          </div>
          <div className="overflow-y-auto max-h-[50vh]">
            {toc.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No table of contents available</p>
            ) : (
              toc.map((item, index) => (
                <button
                  key={index}
                  onClick={() => goToChapter(item.href)}
                  className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 transition-colors ${
                    settings.theme === 'dark' 
                      ? 'border-slate-700 hover:bg-slate-700' 
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reader Content */}
      <div 
        ref={viewerRef}
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading eBook...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-medium text-lg mb-2">Error Loading Book</h3>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className={`flex items-center justify-between px-4 py-3 border-t ${
        settings.theme === 'dark' 
          ? 'bg-slate-800 border-slate-700' 
          : settings.theme === 'sepia'
          ? 'bg-[#e6dcc6] border-[#d4c5a9]'
          : 'bg-slate-100 border-slate-200'
      }`}>
        <button 
          onClick={goToPrev}
          className={`p-3 rounded-lg transition-colors ${
            settings.theme === 'dark' 
              ? 'hover:bg-slate-700 text-white' 
              : 'hover:bg-slate-200 text-slate-700'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className={`h-1 rounded-full ${
            settings.theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
          }`}>
            <div 
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center mt-1 opacity-60">{progress}%</p>
        </div>

        <button 
          onClick={goToNext}
          className={`p-3 rounded-lg transition-colors ${
            settings.theme === 'dark' 
              ? 'hover:bg-slate-700 text-white' 
              : 'hover:bg-slate-200 text-slate-700'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
