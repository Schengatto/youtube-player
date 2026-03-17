<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }
  }
});

const update = () => updateServiceWorker();
const dismiss = () => { needRefresh.value = false; };
</script>

<template>
  <Teleport to="body">
    <Transition name="update-toast">
      <div v-if="needRefresh" class="update-toast">
        <span class="update-toast-text">{{ t.newVersionAvailable }}</span>
        <button class="update-toast-btn" @click="update">{{ t.updateNow }}</button>
        <button class="update-toast-dismiss" @click="dismiss" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./UpdateToast.css"></style>
