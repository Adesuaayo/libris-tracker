import { useState, useEffect, memo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Lock, 
  Globe,
  BookOpen,
  ChevronRight,
  MessageCircle,
  ArrowLeft,
  X,
  Crown,
  Trash2
} from 'lucide-react';
import { communityApi, BookClub, ClubMember, Discussion } from '../services/community';
import { useToastActions } from './Toast';

interface BookClubsListProps {
  currentUserId: string;
  onViewProfile: (userId: string) => void;
}

export const BookClubsList = memo<BookClubsListProps>(({ currentUserId, onViewProfile }) => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [myClubs, setMyClubs] = useState<BookClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-clubs'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<BookClub | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    setIsLoading(true);
    try {
      const [allClubs, userClubs] = await Promise.all([
        communityApi.clubs.getPublicClubs(),
        communityApi.clubs.getMyClubs()
      ]);
      setClubs(allClubs);
      setMyClubs(userClubs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClubCreated = (newClub: BookClub) => {
    setMyClubs(prev => [newClub, ...prev]);
    setShowCreateModal(false);
  };

  const filteredClubs = (activeTab === 'discover' ? clubs : myClubs).filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedClub) {
    return (
      <ClubDetailView 
        club={selectedClub}
        currentUserId={currentUserId}
        onBack={() => {
          setSelectedClub(null);
          loadClubs();
        }}
        onViewProfile={onViewProfile}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search book clubs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ring-violet-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'discover'
              ? 'bg-violet-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my-clubs')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'my-clubs'
              ? 'bg-violet-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          My Clubs
        </button>
      </div>

      {/* Create Club Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create a Book Club
      </button>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            {activeTab === 'my-clubs' ? 'No clubs yet' : 'No clubs found'}
          </h3>
          <p className="text-sm text-slate-500">
            {activeTab === 'my-clubs' 
              ? 'Create or join a book club to get started' 
              : 'Be the first to create a club!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClubs.map((club) => (
            <button
              key={club.id}
              onClick={() => setSelectedClub(club)}
              className="w-full flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all text-left"
            >
              {/* Club Cover */}
              {club.cover_image_url ? (
                <img 
                  src={club.cover_image_url} 
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Users className="w-8 h-8 text-violet-500" />
                </div>
              )}

              {/* Club Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {club.name}
                  </h3>
                  {club.is_public ? (
                    <Globe className="w-4 h-4 text-green-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {club.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {club.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {club.member_count || 0} members
                  </span>
                  {club.current_book_title && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Reading: {club.current_book_title}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      {showCreateModal && (
        <CreateClubModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClubCreated}
        />
      )}
    </div>
  );
});

BookClubsList.displayName = 'BookClubsList';

// =============================================
// CREATE CLUB MODAL
// =============================================

interface CreateClubModalProps {
  onClose: () => void;
  onCreated: (club: BookClub) => void;
}

function CreateClubModal({ onClose, onCreated }: CreateClubModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToastActions();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Club name is required');
      return;
    }

    setIsSaving(true);
    try {
      const club = await communityApi.clubs.createClub({
        name: name.trim(),
        description: description.trim() || undefined,
        cover_image_url: coverUrl.trim() || undefined,
        is_public: !isPrivate,
      });

      if (club) {
        toast.success('Book club created!');
        onCreated(club);
      }
    } catch (error) {
      toast.error('Failed to create club');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create Book Club</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Cover URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Club Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g., Sci-Fi Book Lovers"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What's your club about?"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              {!isPrivate ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {!isPrivate ? 'Public Club' : 'Private Club'}
                </p>
                <p className="text-xs text-slate-500">
                  {!isPrivate ? 'Anyone can join' : 'Members must be approved'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-7 rounded-full transition-colors ${
                !isPrivate ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                !isPrivate ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isSaving || !name.trim()}
            className="w-full py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Creating...' : 'Create Club'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// CLUB DETAIL VIEW
// =============================================

interface ClubDetailViewProps {
  club: BookClub;
  currentUserId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

function ClubDetailView({ club: initialClub, currentUserId, onBack, onViewProfile }: ClubDetailViewProps) {
  const [club] = useState(initialClub);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeTab, setActiveTab] = useState<'discussions' | 'members'>('discussions');
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);

  const toast = useToastActions();

  useEffect(() => {
    loadClubData();
  }, [club.id]);

  const loadClubData = async () => {
    setIsLoading(true);
    try {
      console.log('[ClubDetail] Loading data for club:', club.id);
      const [clubMembers, clubDiscussions, memberStatus] = await Promise.all([
        communityApi.clubs.getMembers(club.id),
        communityApi.discussions.getByClub(club.id),
        communityApi.clubs.isMember(club.id)
      ]);
      console.log('[ClubDetail] Loaded members:', clubMembers);
      console.log('[ClubDetail] Loaded discussions:', clubDiscussions);
      console.log('[ClubDetail] Member status:', memberStatus);
      setMembers(clubMembers);
      setDiscussions(clubDiscussions);
      setIsMember(memberStatus);
      
      // Check if current user is admin
      const currentMember = clubMembers.find((m: ClubMember) => m.user_id === currentUserId);
      setIsAdmin(currentMember?.role === 'admin');
    } catch (error) {
      console.error('[ClubDetail] Error loading club data:', error);
      toast.error('Failed to load club data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    const success = await communityApi.clubs.joinClub(club.id);
    if (success) {
      setIsMember(true);
      toast.success(`Joined ${club.name}!`);
      loadClubData();
    }
  };

  const handleLeave = async () => {
    await communityApi.clubs.leaveClub(club.id);
    setIsMember(false);
    toast.success(`Left ${club.name}`);
    loadClubData();
  };

  const handleDeleteClub = async () => {
    if (!confirm('Are you sure you want to delete this club? All discussions will be removed. This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await communityApi.clubs.deleteClub(club.id);
      if (success) {
        toast.success('Club deleted');
        onBack();
      } else {
        toast.error('Failed to delete club');
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      toast.error('Failed to delete club');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-40 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl overflow-hidden">
          {club.cover_image_url && (
            <img 
              src={club.cover_image_url} 
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>

        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 text-white hover:bg-black/40"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Club Info */}
        <div className="px-4 -mt-8 relative">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {club.name}
              </h1>
              {club.is_public ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400" />
              )}
            </div>

            {club.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {club.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {members.length} members
              </span>
              {club.current_book_title && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {club.current_book_title}
                </span>
              )}
            </div>

            {/* Join/Leave/Delete Buttons */}
            <div className="space-y-2">
              {isMember ? (
                <button
                  onClick={handleLeave}
                  className="w-full py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Leave Club
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  className="w-full py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors"
                >
                  Join Club
                </button>
              )}
              
              {/* Delete Club - Only for admin */}
              {isAdmin && (
                <button
                  onClick={handleDeleteClub}
                  disabled={isDeleting}
                  className="w-full py-2 flex items-center justify-center gap-2 border border-red-500 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Club'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('discussions')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'discussions'
              ? 'bg-violet-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          Discussions
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'bg-violet-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          Members
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {activeTab === 'discussions' && (
            <div className="space-y-3">
              {isMember && (
                <button
                  onClick={() => setShowNewDiscussion(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                  <Plus className="w-5 h-5" />
                  Start a Discussion
                </button>
              )}

              {discussions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-slate-500">No discussions yet</p>
                </div>
              ) : (
                discussions.map((discussion) => (
                  <button
                    key={discussion.id}
                    onClick={() => setSelectedDiscussion(discussion)}
                    className="w-full text-left p-4 bg-white dark:bg-slate-800 rounded-xl hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {discussion.title}
                    </h3>
                    {discussion.book_title && (
                      <p className="text-sm text-violet-600 dark:text-violet-400 mt-1">
                        About: {discussion.book_title}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {discussion.reply_count || 0} replies
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onViewProfile(member.user_id)}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {member.user?.avatar_url ? (
                    <img 
                      src={member.user.avatar_url} 
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-medium">
                      {member.user?.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {member.user?.display_name || 'Unknown'}
                      </p>
                      {member.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Discussion Detail View */}
      {selectedDiscussion && (
        <DiscussionDetailView
          discussion={selectedDiscussion}
          currentUserId={currentUserId}
          onBack={() => setSelectedDiscussion(null)}
          onViewProfile={onViewProfile}
          onDiscussionDeleted={() => {
            setDiscussions(prev => prev.filter(d => d.id !== selectedDiscussion.id));
            setSelectedDiscussion(null);
          }}
          onDiscussionUpdated={(updated) => {
            setDiscussions(prev => prev.map(d => d.id === updated.id ? updated : d));
          }}
        />
      )}

      {/* New Discussion Modal */}
      {showNewDiscussion && (
        <NewDiscussionModal 
          clubId={club.id}
          onClose={() => setShowNewDiscussion(false)}
          onCreated={(discussion) => {
            setDiscussions(prev => [discussion, ...prev]);
            setShowNewDiscussion(false);
          }}
        />
      )}
    </div>
  );
}

// =============================================
// NEW DISCUSSION MODAL
// =============================================

interface NewDiscussionModalProps {
  clubId: string;
  onClose: () => void;
  onCreated: (discussion: Discussion) => void;
}

function NewDiscussionModal({ clubId, onClose, onCreated }: NewDiscussionModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToastActions();

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      const discussion = await communityApi.discussions.create({
        club_id: clubId,
        title: title.trim(),
        content: content.trim(),
        book_title: bookTitle.trim() || undefined,
      });

      if (discussion) {
        toast.success('Discussion started!');
        onCreated(discussion);
      }
    } catch (error) {
      toast.error('Failed to create discussion');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Discussion</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              About a book? (optional)
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="Book title"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Your thoughts *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Share your thoughts..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="w-full py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Creating...' : 'Start Discussion'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// DISCUSSION DETAIL VIEW
// =============================================

interface DiscussionDetailViewProps {
  discussion: Discussion;
  currentUserId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
  onDiscussionDeleted: () => void;
  onDiscussionUpdated: (discussion: Discussion) => void;
}

function DiscussionDetailView({ discussion: initialDiscussion, currentUserId, onBack, onViewProfile, onDiscussionDeleted, onDiscussionUpdated }: DiscussionDetailViewProps) {
  const [discussion] = useState(initialDiscussion);
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToastActions();
  const isAuthor = currentUserId === discussion.author_id;

  useEffect(() => {
    loadReplies();
  }, [discussion.id]);

  const loadReplies = async () => {
    setIsLoading(true);
    try {
      const discussionReplies = await communityApi.discussions.getReplies(discussion.id);
      console.log('[DiscussionDetail] Loaded replies:', discussionReplies);
      setReplies(discussionReplies);
    } catch (error) {
      console.error('Error loading replies:', error);
      toast.error('Failed to load replies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setIsSavingReply(true);
    try {
      const reply = await communityApi.discussions.addReply(discussion.id, replyContent.trim());
      if (reply) {
        setReplies(prev => [...prev, reply]);
        setReplyContent('');
        toast.success('Reply posted!');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSavingReply(false);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!confirm('Are you sure you want to delete this discussion? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await communityApi.discussions.deleteDiscussion(discussion.id);
      if (success) {
        toast.success('Discussion deleted');
        onDiscussionDeleted();
      } else {
        toast.error('Failed to delete discussion');
      }
    } catch (error) {
      console.error('Error deleting discussion:', error);
      toast.error('Failed to delete discussion');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header with delete button */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:text-violet-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to discussions
          </button>
          {isAuthor && (
            <button
              onClick={handleDeleteDiscussion}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {discussion.title}
        </h1>

        {discussion.book_title && (
          <p className="text-sm text-violet-600 dark:text-violet-400 mb-3">
            About: {discussion.book_title}
          </p>
        )}
      </div>

      {/* Reply Form - PROMINENTLY at top */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <label className="block text-sm font-semibold text-violet-700 dark:text-violet-300 mb-2">
          💬 Add Your Reply
        </label>
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          rows={3}
          placeholder="Share your thoughts..."
          className="w-full px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none text-sm mb-3"
        />
        <button
          onClick={handleAddReply}
          disabled={isSavingReply || !replyContent.trim()}
          className="w-full py-3 bg-violet-500 text-white rounded-xl font-semibold hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
        >
          {isSavingReply ? 'Posting...' : '📤 Post Reply'}
        </button>
      </div>

      {/* Discussion Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {discussion.content}
        </p>
        <div className="flex items-center justify-between text-sm text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-700">
          <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
          <span>{replies.length} replies</span>
        </div>
      </div>

      {/* Replies */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-3 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : replies.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500">No replies yet. Be the first to respond!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {replies.map((reply) => (
            <div key={reply.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-start gap-3 mb-2">
                {reply.author?.avatar_url ? (
                  <img 
                    src={reply.author.avatar_url} 
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-medium">
                    {reply.author?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <button 
                    onClick={() => onViewProfile(reply.author_id)}
                    className="font-medium text-slate-900 dark:text-white hover:text-violet-600"
                  >
                    {reply.author?.display_name || 'Unknown'}
                  </button>
                  <p className="text-xs text-slate-500">
                    {new Date(reply.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

