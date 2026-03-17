<script setup lang="ts">
import { ref } from 'vue';
import type { Playlist, Video } from '@/types';
import { useI18n } from '@/composables/useI18n';
import { normalizeText } from '@/utils/string';

const { t } = useI18n();

interface Props {
  show: boolean;
  playlists: Playlist[];
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  playVideo: [video: Video, playlistVideos: Video[]];
  deletePlaylist: [id: string];
  removeVideo: [playlistId: string, videoId: string];
  moveVideo: [playlistId: string, fromIndex: number, toIndex: number];
  sharePlaylist: [id: string];
}>();

const expandedId = ref<string | null>(null);

const toggle = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="show" class="drawer-overlay" @click="emit('close')">
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <h2 class="drawer-title">{{ t.playlists }}</h2>
            <button @click="emit('close')" class="close-btn" :title="t.close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="drawer-content">
            <p v-if="playlists.length === 0" class="no-playlists">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              {{ t.noPlaylists }}
            </p>

            <div v-else class="playlists-list">
              <div v-for="playlist in playlists" :key="playlist.id" class="playlist-item">
                <div class="playlist-row">
                  <button class="playlist-toggle" @click="toggle(playlist.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                      :style="{ transform: expandedId === playlist.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    <div class="playlist-info">
                      <span class="playlist-name">{{ playlist.name }}</span>
                      <span class="playlist-count">{{ playlist.videos.length }} {{ t.videos }}</span>
                    </div>
                  </button>
                  <button @click="emit('sharePlaylist', playlist.id)" class="share-btn" :title="t.sharePlaylist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                  <button @click="emit('deletePlaylist', playlist.id)" class="delete-btn" :title="t.deletePlaylist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>

                <Transition name="expand">
                  <div v-if="expandedId === playlist.id" class="playlist-videos">
                    <p v-if="playlist.videos.length === 0" class="empty-playlist">{{ t.emptyPlaylist }}</p>
                    <div v-else class="video-list">
                      <div v-for="(video, videoIndex) in playlist.videos" :key="video.videoId" class="video-row">
                        <div class="move-btns">
                          <button class="move-btn" :disabled="videoIndex === 0" :title="t.moveUp"
                            @click="emit('moveVideo', playlist.id, videoIndex, videoIndex - 1)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                          </button>
                          <button class="move-btn" :disabled="videoIndex === playlist.videos.length - 1" :title="t.moveDown"
                            @click="emit('moveVideo', playlist.id, videoIndex, videoIndex + 1)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        </div>
                        <button class="video-play-btn" @click="emit('playVideo', video, playlist.videos)">
                          <img :src="video.thumbnail" :alt="video.title" class="video-thumb" />
                          <div class="video-meta">
                            <span class="video-title">{{ normalizeText(video.title) }}</span>
                            <span class="video-channel">{{ video.channel }}</span>
                          </div>
                        </button>
                        <button @click="emit('removeVideo', playlist.id, video.videoId)"
                          class="remove-video-btn" :title="t.removeFromPlaylist">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./PlaylistsPanel.css"></style>
