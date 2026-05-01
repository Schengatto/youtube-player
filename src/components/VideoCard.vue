<script setup lang="ts">
import type { Video } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import { normalizeText } from "@/utils/string";
import { useI18n } from '@/composables/useI18n';
import { formatDuration } from '@/utils/duration';

const { t } = useI18n();

interface Props {
  video: Video;
  index: number;
  isChannelSaved: boolean;
  isVideoSaved: boolean;
  isInPlaylist: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  play: [video: Video];
  toggleChannel: [name: string, id: string];
  toggleSaveVideo: [video: Video];
  addToPlaylist: [video: Video];
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
      <button @click.stop="emit('addToPlaylist', video)" class="playlist-video-btn" :class="{ active: isInPlaylist }"
        :title="t.addToPlaylist">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
      <button @click.stop="emit('toggleSaveVideo', video)" class="save-video-btn" :class="{ saved: isVideoSaved }"
        :title="isVideoSaved ? t.removeFromSaved : t.saveForLater">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          :fill="isVideoSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
        </svg>
      </button>
      <span v-if="video.duration" class="duration-badge">
        {{ formatDuration(video.duration) }}
      </span>
    </div>
    <div class="video-info">
      <h3 class="video-title">{{ normalizeText(video.title) }}</h3>
      <div class="video-channel">
        <p class="channel-name">{{ video.channel }}</p>
        <button v-if="video.channelId" @click.stop="emit('toggleChannel', video.channel, video.channelId)"
          class="save-channel-btn" :class="{ saved: isChannelSaved }"
          :title="isChannelSaved ? t.removeChannel : t.saveChannel">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            :fill="isChannelSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
      <p v-if="video.publishedAt" class="video-date">
        {{ formatRelativeTime(video.publishedAt) }}
      </p>
    </div>
  </div>
</template>

<style scoped src="./VideoCard.css"></style>
