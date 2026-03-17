<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useDialog } from '@/composables/useDialog';
import './ConfirmModal.css';

const { t } = useI18n();
const { confirmState, resolveConfirm } = useDialog();
</script>

<template>
  <Teleport to="body">
    <div v-if="confirmState" class="confirm-overlay" @click.self="resolveConfirm(false)">
      <div class="confirm-modal" role="dialog" aria-modal="true">
        <p class="confirm-message">{{ confirmState.message }}</p>
        <div class="confirm-actions">
          <button class="confirm-btn-cancel" @click="resolveConfirm(false)">{{ t.cancel }}</button>
          <button class="confirm-btn-danger" @click="resolveConfirm(true)">{{ t.remove }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
