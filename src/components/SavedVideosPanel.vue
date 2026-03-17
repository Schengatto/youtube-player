<script setup lang="ts">
import type { SavedVideo } from '@/composables/useSavedVideos';
import { formatRelativeTime } from '@/utils/date';
import { normalizeText } from '@/utils/string';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  show: boolean;
  videos: SavedVideo[];
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  selectVideo: [video: SavedVideo];
  removeVideo: [videoId: string];
  clearAll: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="show" class="drawer-overlay" @click="emit('close')">
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <div class="drawer-title-section">
              <h2 class="drawer-title">{{ t.savedForLater }}</h2>
              <span class="video-count">{{ videos.length }} {{ t.videos }}</span>
            </div>
            <div class="drawer-actions">
              <button v-if="videos.length > 0" @click="emit('clearAll')" class="clear-all-btn" :title="t.removeAll">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>{{ t.clearAll }}</span>
              </button>
              <button @click="emit('close')" class="close-btn" :title="t.close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="drawer-content">
            <p v-if="videos.length === 0" class="empty-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
              {{ t.noSavedVideos }}<br />
              {{ t.noSavedVideosDesc }}
            </p>

            <div v-else class="saved-videos-list">
              <div v-for="(video, index) in videos" :key="video.videoId" class="saved-video-item"
                :style="{ animationDelay: `${index * 0.05}s` }">
                <div class="video-thumbnail-small" @click="emit('selectVideo', video)">
                  <img :src="video.thumbnail" :alt="video.title" />
                  <div class="play-overlay-small">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>
                <div class="video-details" @click="emit('selectVideo', video)">
                  <h3 class="video-title-small">{{ normalizeText(video.title) }}</h3>
                  <p class="video-channel-small">{{ video.channel }}</p>
                  <p class="video-saved-time">{{ t.savedAgo }} {{ formatRelativeTime(video.savedAt) }}</p>
                </div>
                <button @click="emit('removeVideo', video.videoId)" class="remove-btn" :title="t.remove">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./SavedVideosPanel.css"></style>
