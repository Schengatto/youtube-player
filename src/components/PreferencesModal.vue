<script setup lang="ts">
import { ref, watch } from 'vue';
import { DEFAULT_CATEGORIES } from '@/utils/constants';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

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
  const current = tempInterests.value.split(',').map(i => i.trim()).filter(i => i.length > 0);
  if (!current.includes(category)) {
    tempInterests.value = tempInterests.value ? `${tempInterests.value}, ${category}` : category;
  }
};

const handleSubmit = () => {
  const interests = tempInterests.value.split(',').map(i => i.trim()).filter(i => i.length > 0);
  emit('save', interests);
  tempInterests.value = '';
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="emit('close')">
      <div class="preferences-modal" @click.stop>
        <div class="preferences-header">
          <h2 class="preferences-title">{{ t.yourInterests }}</h2>
          <p class="preferences-subtitle">{{ t.personalizeDesc }}</p>
        </div>
        <div class="preferences-body">
          <div class="preferences-info">
            <h3>{{ t.suggestedCategories }}</h3>
            <div class="category-chips">
              <button v-for="category in DEFAULT_CATEGORIES" :key="category" @click="addInterest(category)"
                class="category-chip" type="button">
                {{ category }}
              </button>
            </div>
          </div>
          <form @submit.prevent="handleSubmit" class="preferences-form">
            <label for="interests" class="preferences-label">{{ t.interestsLabel }}</label>
            <textarea v-model="tempInterests" id="interests" :placeholder="t.interestsPlaceholder"
              class="preferences-input" rows="3" />
            <p class="preferences-hint">{{ t.interestsHint }}</p>
            <div class="preferences-actions">
              <button type="submit" class="preferences-save-btn">{{ t.saveInterests }}</button>
              <button type="button" @click="emit('close')" class="preferences-cancel-btn">
                {{ hasPreferences ? t.cancel : t.skip }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="./PreferencesModal.css"></style>
