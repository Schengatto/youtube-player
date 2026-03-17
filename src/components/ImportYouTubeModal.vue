<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { ImportStep, ImportResult } from '@/composables/useYouTubeImport';

interface Props {
  show: boolean;
  step: ImportStep;
  error: string | null;
  result: ImportResult | null;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  confirm: [];
  retry: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="import-overlay" @click="step === 'done' || step === 'error' ? emit('close') : undefined">
        <div class="import-modal" @click.stop>
          <div class="import-header">
            <h2 class="import-title">{{ t.importYouTube }}</h2>
            <button v-if="step === 'done' || step === 'error' || step === 'idle'" class="import-close" @click="emit('close')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="import-body">
            <!-- Authenticating -->
            <div v-if="step === 'authenticating'" class="import-status">
              <div class="loader"></div>
              <p>{{ t.importAuthenticating }}</p>
            </div>

            <!-- Importing -->
            <div v-if="step === 'importing'" class="import-status">
              <div class="loader"></div>
              <p>{{ t.importing }}</p>
            </div>

            <!-- Error -->
            <div v-if="step === 'error'" class="import-status error">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <p>{{ t.importError }}</p>
              <p v-if="error === 'popup_blocked'" class="import-hint">{{ t.importPopupBlocked }}</p>
              <button class="import-btn" @click="emit('retry')">{{ t.importRetry }}</button>
            </div>

            <!-- Done -->
            <div v-if="step === 'done' && result" class="import-status success">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <p class="import-complete-title">{{ t.importComplete }}</p>
              <div class="import-summary">
                <div v-if="result.subscriptions.length > 0" class="import-summary-item">
                  <span class="import-count">{{ result.subscriptions.length }}</span>
                  <span>{{ t.channelsImported }}</span>
                </div>
                <div v-if="result.playlists.length > 0" class="import-summary-item">
                  <span class="import-count">{{ result.playlists.length }}</span>
                  <span>{{ t.playlistsImported }}</span>
                </div>
              </div>
              <button class="import-btn primary" @click="emit('confirm')">{{ t.importConfirm }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./ImportYouTubeModal.css"></style>
