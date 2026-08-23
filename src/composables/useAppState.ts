import { ref, computed, onMounted } from 'vue';
import type { Video } from '@/types';
import type { Locale } from '@/i18n/translations';
import { useSettings } from '@/composables/useSettings';
import { useYouTubeAPI } from '@/composables/useYouTubeAPI';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import { useSavedVideos } from '@/composables/useSavedVideos';
import { extractVideoIdFromUrl, extractVideoIdFromSharedText, getVideoFromId } from '@/utils/youtube';
import { decodePlaylistFromUrl, getPlaylistShareUrl } from '@/utils/playlist-share';
import { nextIn, previousIn } from '@/utils/queue';
import { useI18n } from '@/composables/useI18n';
import { usePlaylists } from '@/composables/usePlaylists';
import { useBookmarks } from '@/composables/useBookmarks';
import { useYouTubeImport } from '@/composables/useYouTubeImport';
import { useDialog } from '@/composables/useDialog';
import { MOBILE_BREAKPOINT, PAGE_SIZE, TOAST_DURATION_MS, PAGINATION_HAS_MORE } from '@/utils/constants';

export const useAppState = () => {
  const { savedChannels, userPreferences, loadChannels,
    saveChannel, removeChannel, isChannelSaved, loadPreferences, savePreferences } = useSettings();
  const { savedVideos, isVideoSaved, toggleSaveVideo, removeVideo: removeSavedVideo, clearAllSavedVideos } = useSavedVideos();
  const { playlists, createPlaylist, deletePlaylist, addVideo: addVideoToPlaylist,
    removeVideo: removeVideoFromPlaylist, moveVideo: moveVideoInPlaylist, getVideoPlaylists } = usePlaylists();
  const { t, currentLocale, isLocaleSet, availableLocales, setLocale } = useI18n();
  const { bookmarks, removeBookmark, clearAllBookmarks } = useBookmarks();
  const { step: importStep, error: importError, result: importResult, startImport, reset: resetImport } = useYouTubeImport();
  const { confirm, alert } = useDialog();

  const showImportModal = ref(false);
  const showUserMenu = ref(false);
  const showMobileSidebar = ref(false);
  const searchQuery = ref('');
  const videos = ref<Video[]>([]);
  const selectedVideo = ref<Video | null>(null);
  const isMinimized = ref(false);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const showChannels = ref(false);
  const showSavedVideos = ref(false);
  const showPreferencesModal = ref(false);
  const showShareToast = ref(false);
  const showPlaylistsPanel = ref(false);
  const showAddToPlaylist = ref(false);
  const selectedVideoForPlaylist = ref<Video | null>(null);
  const showBookmarksPanel = ref(false);
  const pendingStartTime = ref<number | null>(null);
  const pendingImportPlaylist = ref<{ name: string; videos: Video[] } | null>(null);
  const activePlaylistVideos = ref<Video[]>([]);
  const playbackSource = ref<'none' | 'feed' | 'playlist'>('none');
  const nextPageToken = ref<string | undefined>(undefined);
  const currentChannelId = ref<string | undefined>(undefined);
  const viewMode = ref<'recommended' | 'search' | 'channel'>('recommended');
  const currentOffset = ref(0);

  const playbackQueue = computed<Video[]>(() => {
    if (playbackSource.value === 'feed') return videos.value;
    if (playbackSource.value === 'playlist') return activePlaylistVideos.value;
    return [];
  });

  const hasPreferences = computed(() => userPreferences.value.interests.length > 0);
  const canLoadMore = computed(() => !isLoading.value && !isLoadingMore.value && nextPageToken.value !== undefined);

  const shareOrCopy = async (url: string, title?: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showShareToast.value = true;
        setTimeout(() => { showShareToast.value = false; }, TOAST_DURATION_MS);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const selectVideo = (video: Video, startTime: number | null = null) => {
    selectedVideo.value = video;
    isMinimized.value = false;
    activePlaylistVideos.value = [];
    playbackSource.value = 'none';
    pendingStartTime.value = startTime;
    requestDocFullscreen();
  };

  const loadRecommendedVideos = async () => {
    if (!hasPreferences.value) return;
    searchQuery.value = '';
    isLoading.value = true;
    nextPageToken.value = undefined;
    currentChannelId.value = undefined;
    currentOffset.value = 0;
    viewMode.value = 'recommended';
    try {
      const api = useYouTubeAPI();
      const result = await api.getRecommendedPopular(userPreferences.value.interests, userPreferences.value.language, PAGE_SIZE.DEFAULT, 0);
      videos.value = result.videos;
      nextPageToken.value = result.hasMore ? PAGINATION_HAS_MORE : undefined;
    } catch (error) {
      console.error('Error loading popular videos:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const appendNewVideos = (newVideos: Video[]) => {
    const existingIds = new Set(videos.value.map(v => v.videoId));
    const unique = newVideos.filter(v => !existingIds.has(v.videoId));
    videos.value = [...videos.value, ...unique];
  };

  const loadMore = async () => {
    if (!nextPageToken.value || isLoadingMore.value) return;
    isLoadingMore.value = true;
    try {
      const api = useYouTubeAPI();
      if (viewMode.value === 'search' && searchQuery.value) {
        const result = await api.searchVideos(searchQuery.value, PAGE_SIZE.DEFAULT, nextPageToken.value);
        if (result) { appendNewVideos(result.videos); nextPageToken.value = result.nextPageToken; }
      } else if (viewMode.value === 'channel' && currentChannelId.value) {
        const result = await api.searchByChannel(currentChannelId.value, PAGE_SIZE.CHANNEL, nextPageToken.value);
        if (result) { appendNewVideos(result.videos); nextPageToken.value = result.nextPageToken; }
      } else if (viewMode.value === 'recommended' && hasPreferences.value) {
        currentOffset.value += PAGE_SIZE.DEFAULT;
        const result = await api.getRecommendedPopular(userPreferences.value.interests, userPreferences.value.language, PAGE_SIZE.DEFAULT, currentOffset.value);
        appendNewVideos(result.videos);
        nextPageToken.value = result.hasMore ? PAGINATION_HAS_MORE : undefined;
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      isLoadingMore.value = false;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.value.trim()) return;
    isLoading.value = true;
    currentChannelId.value = undefined;
    viewMode.value = 'search';
    try {
      const api = useYouTubeAPI();
      const result = await api.searchVideos(searchQuery.value);
      videos.value = result.videos;
      nextPageToken.value = result.nextPageToken;
    } catch (error) {
      console.error('Search error:', error);
      await alert(t.value.searchError);
    } finally {
      isLoading.value = false;
    }
  };

  const handleChannelSearch = async (channelId: string) => {
    showChannels.value = false;
    isLoading.value = true;
    currentChannelId.value = channelId;
    viewMode.value = 'channel';
    try {
      const api = useYouTubeAPI();
      const result = await api.searchByChannel(channelId, PAGE_SIZE.CHANNEL);
      videos.value = result.videos;
      nextPageToken.value = result.nextPageToken;
    } catch (error) {
      console.error('Channel search error:', error);
      await alert(t.value.channelError);
    } finally {
      isLoading.value = false;
    }
  };

  const toggleChannelSave = (name: string, id: string) => {
    if (isChannelSaved(id)) { removeChannel(id); } else { saveChannel(name, id); }
  };

  const handleLinkSubmit = async (input: string) => {
    const videoId = extractVideoIdFromUrl(input);
    if (!videoId) { await alert(t.value.invalidLink); return; }
    selectVideo(getVideoFromId(videoId));
  };

  const handleSharePlaylist = async (playlistId: string) => {
    const playlist = playlists.value.find(p => p.id === playlistId);
    if (!playlist) return;
    await shareOrCopy(getPlaylistShareUrl(playlist), playlist.name);
  };

  const handleShare = async (url: string) => {
    if (!selectedVideo.value) return;
    await shareOrCopy(url, selectedVideo.value.title);
  };

  const handleSavePreferences = async (interests: string[]) => {
    savePreferences(interests);
    showPreferencesModal.value = false;
    await loadRecommendedVideos();
  };

  const isMobile = () => 'ontouchstart' in window || window.innerWidth <= MOBILE_BREAKPOINT;

  const requestDocFullscreen = () => {
    if (!isMobile() || document.fullscreenElement) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const releaseDocFullscreen = () => {
    if (document.fullscreenElement === document.documentElement)
      document.exitFullscreen?.().catch(() => {});
  };

  const handleCloseVideo = () => {
    releaseDocFullscreen();
    selectedVideo.value = null;
    isMinimized.value = false;
    activePlaylistVideos.value = [];
    playbackSource.value = 'none';
  };

  const handleMinimize = () => {
    releaseDocFullscreen();
    isMinimized.value = true;
  };

  const handleMaximize = () => {
    isMinimized.value = false;
    requestDocFullscreen();
  };

  const handlePlayVideo = (video: Video) => {
    selectVideo(video);
    playbackSource.value = 'feed';
  };

  const handleSelectSavedVideo = (video: Video) => {
    showSavedVideos.value = false;
    selectVideo(video);
  };

  const handleRemoveSavedVideo = (videoId: string) => { removeSavedVideo(videoId); };

  const handleClearAllSavedVideos = async () => {
    if (await confirm(t.value.confirmClearAll)) clearAllSavedVideos();
  };

  const handleAddToPlaylist = (video: Video) => {
    selectedVideoForPlaylist.value = video;
    showAddToPlaylist.value = true;
  };

  const handleTogglePlaylist = (playlistId: string) => {
    if (!selectedVideoForPlaylist.value) return;
    const video = selectedVideoForPlaylist.value;
    const inPlaylists = getVideoPlaylists(video.videoId);
    if (inPlaylists.includes(playlistId)) { removeVideoFromPlaylist(playlistId, video.videoId); }
    else { addVideoToPlaylist(playlistId, video); }
  };

  const handleCreatePlaylist = (name: string) => {
    if (!selectedVideoForPlaylist.value) return;
    const playlist = createPlaylist(name);
    addVideoToPlaylist(playlist.id, selectedVideoForPlaylist.value);
  };

  const handleDeletePlaylist = async (id: string) => {
    if (await confirm(t.value.confirmDeletePlaylist)) deletePlaylist(id);
  };

  const handlePlaylistPlayVideo = (video: Video, playlistVideos?: Video[]) => {
    showPlaylistsPanel.value = false;
    selectVideo(video);
    if (playlistVideos && playlistVideos.length > 1) {
      activePlaylistVideos.value = playlistVideos;
      playbackSource.value = 'playlist';
    }
  };

  const handleImportPlaylistSave = () => {
    const pl = pendingImportPlaylist.value;
    if (!pl) return;
    const created = createPlaylist(pl.name);
    pl.videos.forEach(v => addVideoToPlaylist(created.id, v));
    pendingImportPlaylist.value = null;
  };

  const handleImportPlaylistWatch = () => {
    pendingImportPlaylist.value = null;
  };

  const handlePlayNext = () => {
    const next = nextIn(playbackQueue.value, selectedVideo.value?.videoId ?? null);
    if (next) selectedVideo.value = next;
  };

  const handlePlayPrevious = () => {
    const previous = previousIn(playbackQueue.value, selectedVideo.value?.videoId ?? null);
    if (previous) selectedVideo.value = previous;
  };

  const handleSelectBookmark = (bookmark: { videoId: string; timestamp: number; videoTitle: string; channel: string; thumbnail: string }) => {
    showBookmarksPanel.value = false;
    const video: Video = {
      videoId: bookmark.videoId,
      title: bookmark.videoTitle,
      channel: bookmark.channel,
      thumbnail: bookmark.thumbnail,
    };
    selectVideo(video, bookmark.timestamp);
  };

  const handleShareBookmark = async (url: string) => {
    await shareOrCopy(url);
  };

  const handleShareBookmarkFromPanel = async (bookmark: { videoId: string; timestamp: number; videoTitle: string }) => {
    const url = `${window.location.origin}${window.location.pathname}?v=${bookmark.videoId}&t=${Math.floor(bookmark.timestamp)}`;
    await shareOrCopy(url, bookmark.videoTitle);
  };

  const handleDeleteBookmark = (id: string) => {
    removeBookmark(id);
  };

  const handleClearAllBookmarks = async () => {
    if (await confirm(t.value.confirmClearAll)) clearAllBookmarks();
  };

  const handleStartYouTubeImport = () => {
    showImportModal.value = true;
    startImport().catch(() => { /* error handled by step/error refs */ });
  };

  const importSubscriptionsAsChannels = (subscriptions: { name: string; id: string }[]) => {
    for (const ch of subscriptions) {
      if (!isChannelSaved(ch.id)) saveChannel(ch.name, ch.id);
    }
  };

  const importPlaylistsLocally = (importedPlaylists: { name: string; videos: Video[] }[]) => {
    for (const pl of importedPlaylists) {
      const created = createPlaylist(pl.name);
      for (const video of pl.videos) addVideoToPlaylist(created.id, video);
    }
  };

  const handleConfirmImport = () => {
    const data = importResult.value;
    if (!data) return;
    importSubscriptionsAsChannels(data.subscriptions);
    importPlaylistsLocally(data.playlists);
    showImportModal.value = false;
    resetImport();
  };

  const handleCloseImport = () => {
    showImportModal.value = false;
    resetImport();
  };

  const handleRetryImport = () => {
    startImport().catch(() => {});
  };

  const handleSetLocale = (code: string) => setLocale(code as Locale);

  useInfiniteScroll(() => { if (canLoadMore.value) return loadMore(); });

  onMounted(async () => {
    loadChannels();
    const hasPrefs = loadPreferences();
    const urlParams = new URLSearchParams(window.location.search);
    const videoParam = urlParams.get('v');
    const timeParam = urlParams.get('t');
    if (videoParam) {
      selectedVideo.value = getVideoFromId(videoParam);
      if (timeParam) {
        pendingStartTime.value = parseInt(timeParam, 10) || null;
      }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    // Android share target: the shared link arrives as `url`, or inside `text` for apps
    // that only fill EXTRA_TEXT (the YouTube app being one of them).
    const sharedParam = urlParams.get('url') ?? urlParams.get('text');
    if (sharedParam) {
      const sharedVideoId = extractVideoIdFromSharedText(sharedParam);
      window.history.replaceState({}, '', window.location.pathname);
      if (sharedVideoId) {
        selectedVideo.value = getVideoFromId(sharedVideoId);
        return;
      }
    }
    const playlistParam = urlParams.get('playlist');
    if (playlistParam) {
      const decoded = decodePlaylistFromUrl(playlistParam);
      if (decoded) {
        pendingImportPlaylist.value = decoded;
        if (decoded.videos.length > 0) {
          selectedVideo.value = decoded.videos[0] ?? null;
          activePlaylistVideos.value = decoded.videos;
          playbackSource.value = 'playlist';
        }
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (hasPrefs) await loadRecommendedVideos();
  });

  return {
    savedChannels, isChannelSaved, removeChannel,
    savedVideos, isVideoSaved, toggleSaveVideo,
    playlists, getVideoPlaylists, removeVideoFromPlaylist, moveVideoInPlaylist,
    t, currentLocale, isLocaleSet, availableLocales, setLocale, handleSetLocale,
    showUserMenu, showMobileSidebar, showChannels, showSavedVideos,
    showPreferencesModal, showShareToast,
    showPlaylistsPanel, showBookmarksPanel, showAddToPlaylist, selectedVideoForPlaylist,
    searchQuery, videos, selectedVideo, isMinimized, isLoading, isLoadingMore,
    playbackQueue,
    hasPreferences,
    loadRecommendedVideos, handleSearch, handleChannelSearch,
    toggleChannelSave, handleLinkSubmit, handleShare,
    handleSavePreferences,
    handleCloseVideo, handleMinimize, handleMaximize, handlePlayVideo, handleSelectSavedVideo,
    handleRemoveSavedVideo, handleClearAllSavedVideos,
    handleAddToPlaylist, handleTogglePlaylist, handleCreatePlaylist,
    handleDeletePlaylist, handlePlaylistPlayVideo, handleSharePlaylist,
    handlePlayNext, handlePlayPrevious,
    pendingImportPlaylist, handleImportPlaylistSave, handleImportPlaylistWatch,
    bookmarks, handleSelectBookmark, handleShareBookmark, handleShareBookmarkFromPanel,
    handleDeleteBookmark, handleClearAllBookmarks,
    pendingStartTime,
    userPreferences,
    showImportModal, importStep, importError, importResult,
    handleStartYouTubeImport, handleConfirmImport, handleCloseImport, handleRetryImport,
  };
};
