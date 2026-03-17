<script setup lang="ts">
import type { SavedChannel } from '@/types';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  channels: SavedChannel[];
  show: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  selectChannel: [id: string];
  removeChannel: [id: string];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="show" class="drawer-overlay" @click="emit('close')">
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <h2 class="drawer-title">{{ t.favoriteChannels }}</h2>
            <button @click="emit('close')" class="close-btn" :title="t.close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="drawer-content">
            <p v-if="channels.length === 0" class="no-channels">
              {{ t.noChannels }}
            </p>
            <div v-else class="channels-list">
              <div v-for="channel in channels" :key="channel.id" class="channel-item">
                <button @click="emit('selectChannel', channel.id)" class="channel-btn">
                  <div class="channel-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                      <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                  </div>
                  <span class="channel-name">{{ channel.name }}</span>
                </button>
                <button @click="emit('removeChannel', channel.id)" class="remove-btn" :title="t.removeChannelTitle">
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

<style scoped src="./ChannelsPanel.css"></style>
