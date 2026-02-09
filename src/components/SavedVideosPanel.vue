<script setup lang="ts">
import type { SavedVideo } from '@/composables/useSavedVideos';
import { formatRelativeTime } from '@/utils/date';
import { normalizeText } from '@/utils/string';

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
  <div v-if="show" class="panel-overlay" @click="emit('close')">
    <div class="panel-container" @click.stop>
      <div class="panel-header">
        <div class="panel-title-section">
          <h2 class="panel-title">Salvati per dopo</h2>
          <span class="video-count">{{ videos.length }} video</span>
        </div>
        <div class="panel-actions">
          <button v-if="videos.length > 0" @click="emit('clearAll')" class="clear-all-btn" title="Rimuovi tutti">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Cancella tutto</span>
          </button>
          <button @click="emit('close')" class="close-btn" title="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="panel-content">
        <p v-if="videos.length === 0" class="empty-message">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
          </svg>
          Nessun video salvato per dopo.<br />
          Salva i video che vuoi guardare più tardi!
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
              <p class="video-saved-time">Salvato {{ formatRelativeTime(video.savedAt) }}</p>
            </div>
            <button @click="emit('removeVideo', video.videoId)" class="remove-btn" title="Rimuovi">
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
</template>

<style scoped>
.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.panel-container {
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
  margin: auto;
}

.panel-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.panel-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.video-count {
  background: rgba(250, 0, 0, 0.15);
  color: #fa0000;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.clear-all-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 0.5rem 0.9rem;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.clear-all-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #e0e0e0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.empty-message svg {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.saved-videos-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.saved-video-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: all 0.2s ease;
  animation: fadeIn 0.4s ease backwards;
}

.saved-video-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(250, 0, 0, 0.3);
}

.video-thumbnail-small {
  position: relative;
  width: 120px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: #000;
}

.video-thumbnail-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.saved-video-item:hover .video-thumbnail-small img {
  transform: scale(1.05);
}

.play-overlay-small {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #fff;
}

.saved-video-item:hover .play-overlay-small {
  opacity: 1;
}

.video-details {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.video-title-small {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 0.4rem 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.video-channel-small {
  font-size: 0.8rem;
  color: #888;
  margin: 0 0 0.25rem 0;
}

.video-saved-time {
  font-size: 0.75rem;
  color: #666;
  margin: 0;
}

.remove-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: #ef4444;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .panel-container {
    width: 95%;
    max-height: 85vh;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .panel-actions {
    width: 100%;
    justify-content: space-between;
  }

  .clear-all-btn span {
    display: none;
  }

  .video-thumbnail-small {
    width: 100px;
    height: 56px;
  }

  .saved-video-item {
    gap: 0.75rem;
  }
}
</style>
