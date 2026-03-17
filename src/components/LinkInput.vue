<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const emit = defineEmits<{
  submit: [input: string];
}>();

const linkInput = ref('');
const showModal = ref(false);

const closeModal = () => {
  showModal.value = false;
  linkInput.value = '';
};

const handleSubmit = () => {
  if (linkInput.value.trim()) {
    emit('submit', linkInput.value.trim());
    linkInput.value = '';
    showModal.value = false;
  }
};

const openModal = async () => {
  showModal.value = true;
  await nextTick();
  const input = document.querySelector('.link-modal-input') as HTMLInputElement;
  input?.focus();
};

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeModal();
};

watch(showModal, (val) => {
  if (val) document.addEventListener('keydown', handleEsc);
  else document.removeEventListener('keydown', handleEsc);
});
</script>

<template>
  <div class="link-input-container">
    <button @click="openModal" class="link-btn" :title="t.openFromLink">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      <span class="btn-label">Link</span>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click="closeModal">
          <div class="modal" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">{{ t.openFromLink }}</h2>
              <button @click="closeModal" class="close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="handleSubmit" class="link-form">
                <input v-model="linkInput" type="text" class="link-modal-input" :placeholder="t.linkPlaceholder" />
                <button type="submit" class="submit-btn" :disabled="!linkInput.trim()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped src="./LinkInput.css"></style>
