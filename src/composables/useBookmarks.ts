import { ref, watch } from 'vue';
import type { Bookmark, Video } from '@/types';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

const bookmarks = ref<Bookmark[]>([]);
let loaded = false;

const loadBookmarks = (): void => {
  const saved = storage.get<Bookmark[]>(STORAGE_KEYS.BOOKMARKS);
  bookmarks.value = Array.isArray(saved) ? saved : [];
  loaded = true;
};

export function useBookmarks() {
  if (!loaded) loadBookmarks();

  watch(
    bookmarks,
    (val) => storage.set(STORAGE_KEYS.BOOKMARKS, val),
    { deep: true }
  );

  const addBookmark = (video: Video, timestamp: number, label: string): Bookmark => {
    const bookmark: Bookmark = {
      id: `bm_${Date.now()}`,
      videoId: video.videoId,
      videoTitle: video.title,
      channel: video.channel,
      thumbnail: video.thumbnail,
      timestamp,
      label,
      createdAt: new Date().toISOString(),
    };
    bookmarks.value = [bookmark, ...bookmarks.value];
    return bookmark;
  };

  const removeBookmark = (id: string): void => {
    bookmarks.value = bookmarks.value.filter(b => b.id !== id);
  };

  const getVideoBookmarks = (videoId: string): Bookmark[] => {
    return bookmarks.value
      .filter(b => b.videoId === videoId)
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const hasBookmarks = (videoId: string): boolean => {
    return bookmarks.value.some(b => b.videoId === videoId);
  };

  const clearAllBookmarks = (): void => {
    bookmarks.value = [];
  };

  const formatTimestamp = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    getVideoBookmarks,
    hasBookmarks,
    clearAllBookmarks,
    formatTimestamp,
  };
}
