<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { Locale } from '@/i18n/translations';

const { t, currentLocale, availableLocales, setLocale } = useI18n();

const emit = defineEmits<{ done: [] }>();

const selectLanguage = (code: Locale) => {
  setLocale(code);
  emit('done');
};
</script>

<template>
  <Teleport to="body">
    <div class="picker-overlay">
      <div class="picker-box">
        <div class="picker-header">
          <div class="picker-logo"><span class="red">Tube</span>-Too</div>
          <h1 class="picker-title">{{ t.chooseLanguage }}</h1>
          <p class="picker-subtitle">{{ t.chooseLanguageDesc }}</p>
        </div>
        <div class="lang-grid">
          <button
            v-for="locale in availableLocales"
            :key="locale.code"
            :class="['lang-card', { active: currentLocale === locale.code }]"
            @click="selectLanguage(locale.code)"
          >
            <span class="lang-name">{{ locale.name }}</span>
            <span class="lang-code">{{ locale.code.toUpperCase() }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="./LanguagePickerModal.css"></style>
