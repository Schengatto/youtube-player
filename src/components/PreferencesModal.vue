<script setup lang="ts">
import { ref, watch } from 'vue';
import { DEFAULT_CATEGORIES } from '@/utils/constants';

interface Props {
  show: boolean;
  currentInterests: string[];
  hasPreferences: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [interests: string[]];
}>();

const tempInterests = ref('');

watch(() => props.show, (show) => {
  if (show) {
    tempInterests.value = props.currentInterests.join(', ');
  }
});

const addInterest = (category: string) => {
  const current = tempInterests.value
    .split(',')
    .map(i => i.trim())
    .filter(i => i.length > 0);

  if (!current.includes(category)) {
    if (tempInterests.value) {
      tempInterests.value += ', ' + category;
    } else {
      tempInterests.value = category;
    }
  }
};

const handleSubmit = () => {
  const interests = tempInterests.value
    .split(',')
    .map(i => i.trim())
    .filter(i => i.length > 0);

  if (interests.length === 0) {
    alert('Inserisci almeno un interesse!');
    return;
  }

  emit('save', interests);
  tempInterests.value = '';
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="preferences-modal" @click.stop>
        <div class="preferences-header">
          <h2 class="preferences-title">I tuoi interessi</h2>
          <p class="preferences-subtitle">
            Personalizza i video consigliati in base ai tuoi interessi
          </p>
        </div>
        <div class="preferences-body">
          <div class="preferences-info">
            <h3>Categorie suggerite:</h3>
            <div class="category-chips">
              <button v-for="category in DEFAULT_CATEGORIES" :key="category" @click="addInterest(category)"
                class="category-chip" type="button">
                {{ category }}
              </button>
            </div>
          </div>
          <form @submit.prevent="handleSubmit" class="preferences-form">
            <label for="interests" class="preferences-label">
              I tuoi interessi (separati da virgola):
            </label>
            <textarea v-model="tempInterests" id="interests" placeholder="Es: tecnologia, musica, gaming, cucina..."
              class="preferences-input" rows="3" required />
            <p class="preferences-hint">
              💡 Questi interessi saranno usati per mostrarti video personalizzati all'avvio
            </p>
            <div class="preferences-actions">
              <button type="submit" class="preferences-save-btn">
                Salva interessi
              </button>
              <button v-if="hasPreferences" type="button" @click="emit('close')" class="preferences-cancel-btn">
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.preferences-modal {
  width: 100%;
  max-width: 600px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.preferences-header {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  padding: 1.5rem;
  color: #fff;
}

.preferences-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.preferences-subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.preferences-body {
  padding: 1.5rem;
}

.preferences-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preferences-info h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #fff;
  font-weight: 600;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-chip {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  padding: 0.4rem 0.9rem;
  color: #a78bfa;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: inherit;
}

.category-chip:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-1px);
}

.preferences-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preferences-label {
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: block;
}

.preferences-input {
  width: 100%;
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e0e0e0;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
  resize: vertical;
  min-height: 80px;
}

.preferences-input:focus {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.preferences-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #888;
  background: rgba(139, 92, 246, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #8b5cf6;
}

.preferences-actions {
  display: flex;
  gap: 0.75rem;
}

.preferences-save-btn,
.preferences-cancel-btn {
  flex: 1;
  padding: 0.9rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.preferences-save-btn {
  background: #8b5cf6;
  color: #fff;
}

.preferences-save-btn:hover {
  background: #7c3aed;
}

.preferences-cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preferences-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .preferences-actions {
    flex-direction: column;
  }

  .category-chips {
    gap: 0.4rem;
  }

  .category-chip {
    font-size: 0.8rem;
    padding: 0.35rem 0.75rem;
  }
}
</style>
