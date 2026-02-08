import { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  Loader2,
  Headphones,
  Library,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { 
  getBookSources, 
  checkGoogleBooksAvailability,
  checkOpenLibraryAvailability,
  BookSource 
} from '../services/bookSources';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

interface ReadOnlineProps {
  bookTitle: string;
  bookAuthor: string;
  onClose: () => void;
}

interface SourceAvailability {
  googleBooks: { hasPreview: boolean; previewUrl?: string } | null;
  openLibrary: { hasReadable: boolean; readUrl?: string } | null;
  loading: boolean;
}

export function ReadOnline({ bookTitle, bookAuthor, onClose }: ReadOnlineProps) {
  const [sources] = useState<BookSource[]>(() => getBookSources(bookTitle, bookAuthor));
  const [availability, setAvailability] = useState<SourceAvailability>({
    googleBooks: null,
    openLibrary: null,
    loading: true
  });
  const [openingSource, setOpeningSource] = useState<string | null>(null);
  const [inAppUrl, setInAppUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const [googleResult, openLibraryResult] = await Promise.all([
          checkGoogleBooksAvailability(bookTitle, bookAuthor),
          checkOpenLibraryAvailability(bookTitle, bookAuthor)
        ]);

        setAvailability({
          googleBooks: googleResult,
          openLibrary: openLibraryResult,
          loading: false
        });
      } catch (error) {
        console.error('Error checking availability:', error);
        setAvailability(prev => ({ ...prev, loading: false }));
      }
    };

    checkAvailability();
  }, [bookTitle, bookAuthor]);

  const handleOpenSource = async (source: BookSource, openInApp: boolean = false) => {
    setOpeningSource(source.id);
    
    try {
      // Use direct preview URL if available
      let url = source.url;
      
      if (source.id === 'google-books' && availability.googleBooks?.previewUrl) {
        url = availability.googleBooks.previewUrl;
      } else if (source.id === 'open-library' && availability.openLibrary?.readUrl) {
        url = availability.openLibrary.readUrl;
      }

      // Open in-app using iframe (for web-like experience)
      if (openInApp) {
        setIframeLoading(true);
        setInAppUrl(url);
        setOpeningSource(null);
        return;
      }

      // Open in external browser
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ 
          url,
          presentationStyle: 'popover',
          toolbarColor: '#6366f1'
        });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening source:', error);
    } finally {
      setOpeningSource(null);
    }
  };

  const handleOpenExternal = async () => {
    if (inAppUrl) {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ 
          url: inAppUrl,
          presentationStyle: 'popover',
          toolbarColor: '#6366f1'
        });
      } else {
        window.open(inAppUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const getSourceIcon = (source: BookSource) => {
    switch (source.id) {
      case 'librivox':
        return <Headphones className="w-5 h-5" />;
      case 'open-library':
      case 'internet-archive':
        return <Library className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getAvailabilityBadge = (source: BookSource) => {
    if (availability.loading) return null;

    if (source.id === 'google-books' && availability.googleBooks) {
      return availability.googleBooks.hasPreview ? (
        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">
          Preview Available
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-surface-base text-text-muted text-xs rounded-full">
          Search
        </span>
      );
    }

    if (source.id === 'open-library' && availability.openLibrary) {
      return availability.openLibrary.hasReadable ? (
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
          Available
        </span>
      ) : (
        <span className="px-2 py-0.5 bg-surface-base text-text-muted text-xs rounded-full">
          Search
        </span>
      );
    }

    if (source.id === 'project-gutenberg') {
      return (
        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
          Public Domain
        </span>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Read Online</h2>
              <p className="text-white/80 text-sm line-clamp-1">{bookTitle}</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              These sources search for free or preview versions of your book. Availability depends on the book and source.
            </p>
          </div>
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {availability.loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500 mr-2" />
              <span className="text-sm text-text-muted">
                Checking availability...
              </span>
            </div>
          )}

          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-surface-base rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`p-3 rounded-xl ${
                  source.id === 'google-books' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                  source.id === 'open-library' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                  source.id === 'project-gutenberg' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                  source.id === 'internet-archive' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                  source.id === 'annas-archive' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                  'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {getSourceIcon(source)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text-primary">
                      {source.name}
                    </span>
                    <span className="text-lg">{source.icon}</span>
                    {getAvailabilityBadge(source)}
                  </div>
                  <p className="text-sm text-text-muted">
                    {source.description}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex border-t border-surface-border">
                <button
                  onClick={() => handleOpenSource(source, true)}
                  disabled={openingSource !== null}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50 border-r border-surface-border"
                >
                  {openingSource === source.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  Read In-App
                </button>
                <button
                  onClick={() => handleOpenSource(source, false)}
                  disabled={openingSource !== null}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-border transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open External
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border p-4 bg-surface-base">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-border text-text-secondary rounded-xl font-medium hover:bg-surface-border/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* In-App Reader */}
      {inAppUrl && (
        <div className="fixed inset-0 z-[70] bg-surface-card flex flex-col">
          {/* Reader Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white safe-area-top">
            <button
              onClick={() => setInAppUrl(null)}
              className="flex items-center gap-2 text-white/90 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <h3 className="text-sm font-medium truncate max-w-[40%]">{bookTitle}</h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIframeLoading(true);
                  const iframe = document.getElementById('reader-iframe') as HTMLIFrameElement;
                  if (iframe) iframe.src = iframe.src;
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenExternal}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Open in browser"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {iframeLoading && (
            <div className="absolute inset-0 top-14 flex items-center justify-center bg-surface-card z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
                <p className="text-sm text-text-muted">Loading reader...</p>
              </div>
            </div>
          )}

          {/* Iframe Reader */}
          <iframe
            id="reader-iframe"
            src={inAppUrl}
            className="flex-1 w-full border-0"
            onLoad={() => setIframeLoading(false)}
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          />
        </div>
      )}
    </div>
  );
}
