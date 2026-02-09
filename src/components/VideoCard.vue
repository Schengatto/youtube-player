<script setup lang="ts">
import type { Video } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import {normalizeText} from "@/utils/string";

interface Props {
  video: Video;
  index: number;
  isChannelSaved: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  play: [video: Video];
  toggleChannel: [name: string, id: string];
}>();
</script>

<template>
  <div class="video-card" :style="{ animationDelay: `${index * 0.05}s` }" @click="emit('play', video)">
    <div class="video-thumbnail">
      <img :src="video.thumbnail" :alt="video.title" />
      <div class="play-overlay">
        <div class="play-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      </div>
    </div>
    <div class="video-info">
      <h3 class="video-title">{{ normalizeText(video.title) }}</h3>
      <div class="video-channel">
        <p class="channel-name">{{ video.channel }}</p>
        <button v-if="video.channelId" @click.stop="emit('toggleChannel', video.channel, video.channelId)"
          class="save-channel-btn" :class="{ saved: isChannelSaved }"
          :title="isChannelSaved ? 'Rimuovi dai salvati' : 'Salva canale'">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            :fill="isChannelSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
          </svg>
        </button>
      </div>
      <p v-if="video.publishedAt" class="video-date">
        {{ formatRelativeTime(video.publishedAt) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.video-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: fadeIn 0.4s ease backwards;
}

.video-card:hover {
  transform: translateY(-4px);
  border-color: rgba(234, 32, 32, 0.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.video-card:hover .play-overlay {
  opacity: 1;
}

.video-thumbnail {
  position: relative;
  padding-top: 56.25%;
  background: #000;
  overflow: hidden;
}

.video-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.video-card:hover .video-thumbnail img {
  transform: scale(1.05);
}

.play-overlay {
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
}

.play-icon {
  background: #fa0000;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.video-info {
  padding: 1rem;
}

.video-title {
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: #fff;
}

.video-channel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.channel-name {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-date {
  font-size: 0.75rem;
  color: #666;
  margin: 0.25rem 0 0 0;
}

.save-channel-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 4px;
  padding: 0.35rem;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.save-channel-btn.saved {
  background: rgba(237, 237, 237, 0.96);
  color: #fa0000;
}

.save-channel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.save-channel-btn.saved:hover {
  background: rgba(237, 237, 237, 0.96);
  color: #fa0000;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
