<script setup lang="ts">
import type { Video } from '@/types';
import { useI18n } from '@/composables/useI18n';
import './ImportPlaylistModal.css';

const { t } = useI18n();

interface Props {
  playlist: { name: string; videos: Video[] } | null;
}

defineProps<Props>();

const emit = defineEmits<{
  save: [];
  watchOnly: [];
}>();
</script>

<template>
  <div v-if="playlist" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">{{ t.importPlaylistTitle }}</span>
      </div>
      <div class="modal-body">
        <p class="playlist-name">{{ playlist.name }}</p>
        <p class="playlist-count">{{ playlist.videos.length }} video</p>
      </div>
      <div class="modal-actions">
        <button class="btn-watch" @click="emit('watchOnly')">{{ t.importPlaylistWatchOnly }}</button>
        <button class="btn-save" @click="emit('save')">{{ t.importPlaylistSave }}</button>
      </div>
    </div>
  </div>
</template>
