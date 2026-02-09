<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  show: boolean;
  hasApiKey: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [key: string];
}>();

const apiKeyInput = ref('');

const handleSubmit = () => {
  if (apiKeyInput.value.trim()) {
    emit('save', apiKeyInput.value.trim());
    apiKeyInput.value = '';
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="api-key-modal" @click.stop>
        <div class="api-key-header">
          <h2 class="api-key-title">Configura chiave API di YouTube</h2>
          <p class="api-key-subtitle">
            Per utilizzare questa app, inserisci la tua chiave API YouTube Data v3
          </p>
        </div>
        <div class="api-key-body">
          <div class="api-key-info">
            <h3>Come ottenere una chiave API:</h3>
            <ol>
              <li>Vai su <a href="https://console.cloud.google.com" target="_blank" rel="noopener">Google Cloud
                  Console</a></li>
              <li>Crea un nuovo progetto o seleziona uno esistente</li>
              <li>Abilita "YouTube Data API v3"</li>
              <li>Vai in "Credenziali" → "Crea credenziali" → "Chiave API"</li>
              <li>Copia la chiave generata e incollala qui sotto</li>
            </ol>
            <p class="api-key-note">
              ℹ️ La chiave API sarà salvata localmente nel tuo browser in forma criptata.
              L'API gratuita offre 10.000 unità/giorno (~100 ricerche).
            </p>
          </div>
          <form @submit.prevent="handleSubmit" class="api-key-form">
            <input v-model="apiKeyInput" type="text" placeholder="Inserisci la tua chiave API di YouTube..."
              class="api-key-input" required />
            <div class="api-key-actions">
              <button type="submit" class="api-key-save-btn">
                Salva chiave API
              </button>
              <button v-if="hasApiKey" type="button" @click="emit('close')" class="api-key-cancel-btn">
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

.api-key-modal {
  width: 100%;
  max-width: 600px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.api-key-header {
  background: linear-gradient(135deg, #fa0000, #2563eb);
  padding: 1.5rem;
  color: #fff;
}

.api-key-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.api-key-subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.api-key-body {
  padding: 1.5rem;
}

.api-key-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.api-key-info h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #fff;
  font-weight: 600;
}

.api-key-info ol {
  margin: 0 0 1rem 0;
  padding-left: 1.5rem;
  color: #ccc;
  line-height: 1.6;
  font-size: 0.875rem;
}

.api-key-info ol li {
  margin-bottom: 0.4rem;
}

.api-key-info a {
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
}

.api-key-info a:hover {
  text-decoration: underline;
}

.api-key-note {
  margin: 0;
  font-size: 0.85rem;
  color: #888;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #fa0000;
}

.api-key-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-key-input {
  width: 100%;
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e0e0e0;
  outline: none;
  font-family: monospace;
  transition: all 0.2s ease;
}

.api-key-input:focus {
  border-color: rgba(234, 32, 32, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.api-key-actions {
  display: flex;
  gap: 0.75rem;
}

.api-key-save-btn,
.api-key-cancel-btn {
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

.api-key-save-btn {
  background: #fa0000;
  color: #fff;
}

.api-key-save-btn:hover {
  background: #2563eb;
}

.api-key-cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.api-key-cancel-btn:hover {
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
  .api-key-actions {
    flex-direction: column;
  }
}
</style>
