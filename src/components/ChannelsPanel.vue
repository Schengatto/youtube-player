<script setup lang="ts">
import type { SavedChannel } from '@/types';

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
            <h2 class="drawer-title">I tuoi canali preferiti</h2>
            <button @click="emit('close')" class="close-btn" title="Chiudi">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="drawer-content">
            <p v-if="channels.length === 0" class="no-channels">
              Nessun canale preferito. Imposta i canali come preferiti dai video per accedervi rapidamente!
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
                <button @click="emit('removeChannel', channel.id)" class="remove-btn" title="Rimuovi canale">
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

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 100%;
  max-width: 600px;
  height: 100%;
  background: #1a1a1a;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.3);
}

.drawer-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  flex: 1;
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
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.drawer-content::-webkit-scrollbar {
  width: 8px;
}

.drawer-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.drawer-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.drawer-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.no-channels {
  color: #888;
  margin: 2rem 0;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.6;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.5rem;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.channel-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.channel-btn {
  flex: 1;
  background: none;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.channel-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.channel-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 237, 237, 0.96);
  border-radius: 8px;
  color: #fa0000;
}

.channel-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.05);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .drawer-panel {
    max-width: 100%;
  }

  .drawer-header {
    padding: 1rem;
  }

  .drawer-title {
    font-size: 1.1rem;
  }
}
</style>
