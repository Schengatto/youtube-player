<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  show: boolean;
}

defineProps<Props>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="share-toast">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      {{ t.linkCopied }}
    </div>
  </Teleport>
</template>

<style scoped src="./ShareToast.css"></style>
