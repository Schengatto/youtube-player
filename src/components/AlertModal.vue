<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useDialog } from '@/composables/useDialog';
import './AlertModal.css';

const { t } = useI18n();
const { alertState, resolveAlert } = useDialog();
</script>

<template>
  <Teleport to="body">
    <div v-if="alertState" class="alert-overlay" @click.self="resolveAlert()">
      <div class="alert-modal" role="dialog" aria-modal="true">
        <p class="alert-message">{{ alertState.message }}</p>
        <div class="alert-actions">
          <button class="alert-btn-close" @click="resolveAlert()">{{ t.close }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
