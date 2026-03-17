import { ref, watch } from 'vue';
import type { Video, Playlist } from '@/types';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

const playlists = ref<Playlist[]>([]);

const load = (): void => {
  const saved = storage.get<Playlist[]>(STORAGE_KEYS.PLAYLISTS);
  playlists.value = Array.isArray(saved) ? saved : [];
};

export function usePlaylists() {
  if (playlists.value.length === 0) {
    load();
  }

  watch(
    playlists,
    (val) => { storage.set(STORAGE_KEYS.PLAYLISTS, val); },
    { deep: true }
  );

  const createPlaylist = (name: string): Playlist => {
    const playlist: Playlist = {
      id: `pl_${Date.now()}`,
      name: name.trim(),
      videos: [],
      createdAt: new Date().toISOString()
    };
    playlists.value = [...playlists.value, playlist];
    return playlist;
  };

  const deletePlaylist = (id: string): void => {
    playlists.value = playlists.value.filter(p => p.id !== id);
  };

  const addVideo = (playlistId: string, video: Video): void => {
    playlists.value = playlists.value.map(p =>
      p.id === playlistId && !p.videos.some(v => v.videoId === video.videoId)
        ? { ...p, videos: [...p.videos, video] }
        : p
    );
  };

  const removeVideo = (playlistId: string, videoId: string): void => {
    playlists.value = playlists.value.map(p =>
      p.id === playlistId
        ? { ...p, videos: p.videos.filter(v => v.videoId !== videoId) }
        : p
    );
  };

  const moveVideo = (playlistId: string, fromIndex: number, toIndex: number): void => {
    playlists.value = playlists.value.map(p => {
      if (p.id !== playlistId) return p;
      const videos = [...p.videos];
      const [moved] = videos.splice(fromIndex, 1) as [typeof videos[0]];
      videos.splice(toIndex, 0, moved);
      return { ...p, videos };
    });
  };

  const isVideoInPlaylist = (playlistId: string, videoId: string): boolean => {
    return playlists.value.find(p => p.id === playlistId)?.videos.some(v => v.videoId === videoId) ?? false;
  };

  const getVideoPlaylists = (videoId: string): string[] => {
    return playlists.value.filter(p => p.videos.some(v => v.videoId === videoId)).map(p => p.id);
  };

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    addVideo,
    removeVideo,
    moveVideo,
    isVideoInPlaylist,
    getVideoPlaylists
  };
}
