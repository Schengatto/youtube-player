<script setup lang="ts">
import { ref } from 'vue';
import type { Video, Playlist } from '@/types';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  show: boolean;
  video: Video | null;
  playlists: Playlist[];
  videoPlaylists: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  toggle: [playlistId: string];
  create: [name: string];
}>();

const newName = ref('');

const handleCreate = () => {
  const name = newName.value.trim();
  if (!name) return;
  emit('create', name);
  newName.value = '';
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="modal-overlay" @click="emit('close')">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ t.addToPlaylist }}</h2>
            <button @click="emit('close')" class="close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div v-if="playlists.length > 0" class="playlists-list">
              <button v-for="pl in playlists" :key="pl.id"
                :class="['pl-row', { active: videoPlaylists.includes(pl.id) }]"
                @click="emit('toggle', pl.id)">
                <div class="pl-check">
                  <svg v-if="videoPlaylists.includes(pl.id)" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div class="pl-info">
                  <span class="pl-name">{{ pl.name }}</span>
                  <span class="pl-count">{{ pl.videos.length }} {{ t.videos }}</span>
                </div>
              </button>
            </div>

            <div class="create-section">
              <form @submit.prevent="handleCreate" class="create-form">
                <input v-model="newName" type="text" :placeholder="t.newPlaylistName" class="create-input" maxlength="60" />
                <button type="submit" class="create-btn" :disabled="!newName.trim()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {{ t.create }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./AddToPlaylistModal.css"></style>
