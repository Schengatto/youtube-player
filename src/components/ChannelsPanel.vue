<script setup lang="ts">
import type { SavedChannel } from '@/types';

interface Props {
  channels: SavedChannel[];
}

defineProps<Props>();

const emit = defineEmits<{
  selectChannel: [id: string];
  removeChannel: [id: string];
}>();
</script>

<template>
  <div class="channels-panel-container">
    <div class="channels-panel">
      <h2 class="channels-title">I tuoi canali salvati</h2>
      <p v-if="channels.length === 0" class="no-channels">
        Nessun canale salvato. Salva i canali dai video per accedervi rapidamente!
      </p>
      <div v-else class="channels-grid">
        <div v-for="channel in channels" :key="channel.id" class="channel-card">
          <button @click="emit('selectChannel', channel.id)" class="channel-name-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            {{ channel.name }}
          </button>
          <button @click="emit('removeChannel', channel.id)" class="channel-remove-btn" title="Rimuovi canale">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.channels-panel-container {
  padding: 0 1rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.channels-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.channels-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.no-channels {
  color: #888;
  margin: 0;
  font-size: 0.9rem;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.channel-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.channel-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.channel-name-btn {
  background: none;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-name-btn:hover {
  color: #fff;
}

.channel-remove-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 4px;
  padding: 0.4rem;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.channel-remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

@media (max-width: 768px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }
}
</style>
