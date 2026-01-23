import { memo, useState } from 'react';
import { Share2, Twitter, Facebook, Link, Check, MessageCircle, Send } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToastActions } from './Toast';

interface SocialShareProps {
  title: string;
  text: string;
  url?: string;
  type: 'book' | 'progress' | 'achievement';
}

export const SocialShare = memo<SocialShareProps>(({ title, text, url, type }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToastActions();

  const shareUrl = url || 'https://libris.app';
  const fullText = `${text}\n\n${shareUrl}`;

  const handleNativeShare = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title,
          text,
          url: shareUrl,
          dialogTitle: 'Share your reading journey'
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to web share API
      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text,
            url: shareUrl
          });
        } catch (error) {
          // User cancelled or error
          console.log('Share cancelled or failed');
        }
      } else {
        setShowOptions(!showOptions);
      }
    }
  };

  const handleTwitterShare = () => {
    const tweetText = encodeURIComponent(text);
    const tweetUrl = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank');
    setShowOptions(false);
  };

  const handleFacebookShare = () => {
    const fbUrl = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${fbUrl}`, '_blank');
    setShowOptions(false);
  };

  const handleWhatsAppShare = () => {
    const waText = encodeURIComponent(fullText);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
    setShowOptions(false);
  };

  const handleTelegramShare = () => {
    const tgText = encodeURIComponent(text);
    const tgUrl = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${tgUrl}&text=${tgText}`, '_blank');
    setShowOptions(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
    setShowOptions(false);
  };

  const getShareIcon = () => {
    switch (type) {
      case 'book':
        return '📚';
      case 'progress':
        return '📖';
      case 'achievement':
        return '🏆';
      default:
        return '📚';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-md"
      >
        <Share2 className="w-4 h-4" />
        Share {getShareIcon()}
      </button>

      {/* Share Options Dropdown (Web fallback) */}
      {showOptions && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase">
              Share to
            </p>

            <button
              onClick={handleTwitterShare}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                <Twitter className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Twitter / X</span>
            </button>

            <button
              onClick={handleFacebookShare}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center">
                <Facebook className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Facebook</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp</span>
            </button>

            <button
              onClick={handleTelegramShare}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#0088cc] flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Telegram</span>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Link className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                )}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {copied ? 'Copied!' : 'Copy link'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
});

SocialShare.displayName = 'SocialShare';

// =============================================
// SHARE TEMPLATES
// =============================================

export const createBookShareText = (title: string, author: string, status: string) => {
  const statusEmojis: Record<string, string> = {
    'to-read': '📚',
    'reading': '📖',
    'completed': '✅'
  };
  const emoji = statusEmojis[status] || '📚';
  
  return {
    title: `${title} by ${author}`,
    text: `${emoji} ${status === 'completed' ? 'Just finished' : status === 'reading' ? 'Currently reading' : 'Want to read'} "${title}" by ${author}! #Libris #BookTracker #Reading`,
    type: 'book' as const
  };
};

export const createProgressShareText = (title: string, pagesRead: number, totalPages: number) => {
  const percentage = Math.round((pagesRead / totalPages) * 100);
  return {
    title: `Reading Progress: ${title}`,
    text: `📖 ${percentage}% through "${title}"! (${pagesRead}/${totalPages} pages) #Libris #ReadingProgress`,
    type: 'progress' as const
  };
};

export const createAchievementShareText = (achievementName: string, description: string) => {
  return {
    title: `Unlocked: ${achievementName}`,
    text: `🏆 Achievement unlocked on Libris: ${achievementName}! ${description} #Libris #ReadingGoals`,
    type: 'achievement' as const
  };
};

export const createStreakShareText = (currentStreak: number) => {
  return {
    title: `${currentStreak} Day Reading Streak!`,
    text: `🔥 I'm on a ${currentStreak} day reading streak on Libris! Join me in building a daily reading habit. #Libris #ReadingStreak`,
    type: 'achievement' as const
  };
};
