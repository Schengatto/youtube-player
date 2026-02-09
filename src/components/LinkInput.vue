<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [input: string];
}>();

const linkInput = ref('');
const showInput = ref(false);

const handleSubmit = () => {
  if (linkInput.value.trim()) {
    emit('submit', linkInput.value.trim());
    linkInput.value = '';
    showInput.value = false;
  }
};

const toggleInput = () => {
  showInput.value = !showInput.value;
  if (showInput.value) {
    setTimeout(() => {
      const input = document.querySelector('.link-input') as HTMLInputElement;
      input?.focus();
    }, 100);
  }
};
</script>

<template>
  <div class="link-input-container">
    <button @click="toggleInput" class="link-btn" :class="{ active: showInput }" title="Apri video da link">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      <span class="btn-label">Link</span>
    </button>

    <Transition name="slide-down">
      <form v-if="showInput" @submit.prevent="handleSubmit" class="link-form">
        <input v-model="linkInput" type="text" class="link-input" placeholder="Incolla link YouTube o ID video..." />
        <button type="submit" class="submit-btn" :disabled="!linkInput.trim()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </form>
    </Transition>
  </div>
</template>

<style scoped>
.link-input-container {
  position: relative;
}

.link-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #e0e0e0;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.link-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.link-btn.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.btn-label {
  display: inline;
}

.link-form {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  gap: 0.5rem;
  background: #1a1a1a;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 200;
  min-width: 350px;
}

.link-input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e0e0e0;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.link-input:focus {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.link-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

.submit-btn {
  background: #8b5cf6;
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  flex-shrink: 0;
}

.submit-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .btn-label {
    display: none;
  }

  .link-btn {
    padding: 0.6rem;
  }

  .link-form {
    position: fixed;
    right: 0;
    left: 0;
  }
}
</style>
