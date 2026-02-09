<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Video } from '@/types';

interface Props {
  video: Video | null;
  isMinimized?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  share: [];
  minimize: [];
  maximize: [];
}>();

const iframeUrl = ref('');

watch(() => props.video, (newVideo) => {
  if (newVideo) {
    iframeUrl.value = `https://www.youtube-nocookie.com/embed/${newVideo.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`;
  } else {
    iframeUrl.value = '';
  }
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="video && !isMinimized" class="modal-overlay" @click="emit('close')"></div>
    </Transition>

    <div v-if="video" :class="['player-container', { minimized: isMinimized }]" @click.stop>
      <div class="player-header">
        <component :is="isMinimized ? 'h3' : 'h2'" class="player-title">{{ video.title }}</component>
        <div class="player-actions">
          <button v-if="!isMinimized" @click="emit('minimize')" class="action-btn" title="Minimizza video">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button v-if="!isMinimized" @click="emit('share')" class="action-btn" title="Condividi video">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
          <button v-if="isMinimized" @click="emit('maximize')" class="action-btn" title="Espandi video">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button @click="emit('close')" class="action-btn close-btn" title="Chiudi">
            <svg xmlns="http://www.w3.org/2000/svg" :width="isMinimized ? 16 : 18" :height="isMinimized ? 16 : 18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="player-video">
        <iframe v-if="iframeUrl" :src="iframeUrl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 999;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Player Container - si adatta in base allo stato */
.player-container {
  position: fixed;
  z-index: 1000;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  /* Nessuna transizione per evitare il resize animato */
}

/* Modalità normale - centrato */
.player-container:not(.minimized) {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 2rem);
  max-width: 1200px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* Modalità minimizzata - basso a destra */
.player-container.minimized {
  bottom: 1rem;
  right: 1rem;
  top: auto;
  left: auto;
  transform: none;
  width: 400px;
  max-width: calc(100vw - 2rem);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.player-header {
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.player-container:not(.minimized) .player-header {
  padding: 1rem 1.5rem;
  gap: 1rem;
}

.player-container.minimized .player-header {
  padding: 0.75rem 1rem;
  gap: 0.5rem;
  cursor: grab;
}

.player-container.minimized .player-header:active {
  cursor: grabbing;
}

.player-actions {
  display: flex;
  align-items: center;
}

.player-container:not(.minimized) .player-actions {
  gap: 0.5rem;
}

.player-container.minimized .player-actions {
  gap: 0.25rem;
}

.player-title {
  margin: 0;
  font-weight: 600;
  color: #fff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-container:not(.minimized) .player-title {
  font-size: 1rem;
}

.player-container.minimized .player-title {
  font-size: 0.85rem;
}

.action-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: #e0e0e0;
}

.player-container:not(.minimized) .action-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
}

.player-container.minimized .action-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.player-video {
  position: relative;
  padding-top: 56.25%;
  background: #000;
}

.player-video iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

@media (max-width: 768px) {
  .player-container:not(.minimized) .player-title {
    font-size: 0.9rem;
  }

  .player-container.minimized {
    width: 320px;
    bottom: 0.5rem;
    right: 0.5rem;
  }

  .player-container.minimized .player-title {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .player-container.minimized {
    width: calc(100vw - 1rem);
    left: 0.5rem;
    right: 0.5rem;
  }
}
</style>
