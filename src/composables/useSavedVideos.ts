import { ref, watch } from 'vue';
import type { Video } from '@/types';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

export interface SavedVideo extends Video {
  savedAt: string; // ISO timestamp
}

const savedVideos = ref<SavedVideo[]>([]);

const loadSavedVideos = (): void => {
  const saved = storage.get<SavedVideo[]>(STORAGE_KEYS.SAVED_VIDEOS);
  savedVideos.value = Array.isArray(saved) ? saved : [];
};

export function useSavedVideos() {
  if (savedVideos.value.length === 0) {
    loadSavedVideos();
  }

  watch(
    savedVideos,
    (newVideos) => {
      storage.set(STORAGE_KEYS.SAVED_VIDEOS, newVideos);
    },
    { deep: true }
  );

  const saveVideo = (video: Video): void => {
    if (!isVideoSaved(video.videoId)) {
      const savedVideo: SavedVideo = {
        ...video,
        savedAt: new Date().toISOString()
      };
      savedVideos.value = [savedVideo, ...savedVideos.value];
    }
  };

  const removeVideo = (videoId: string): void => {
    savedVideos.value = savedVideos.value.filter(v => v.videoId !== videoId);
  };

  const isVideoSaved = (videoId: string): boolean => {
    return savedVideos.value.some(v => v.videoId === videoId);
  };

  const toggleSaveVideo = (video: Video): void => {
    if (isVideoSaved(video.videoId)) {
      removeVideo(video.videoId);
    } else {
      saveVideo(video);
    }
  };

  const clearAllSavedVideos = (): void => {
    savedVideos.value = [];
  };

  return {
    savedVideos,
    saveVideo,
    removeVideo,
    isVideoSaved,
    toggleSaveVideo,
    clearAllSavedVideos
  };
}
