<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useSettings } from '@/composables/useSettings';

interface LocaleOption { code: string; name: string; }

interface Props {
  show: boolean;
  availableLocales: LocaleOption[];
  currentLocale: string;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'open-preferences': [];
  'set-locale': [code: string];
  'import-youtube': [];
}>();

const { t } = useI18n();
const { userPreferences, setAutoplay } = useSettings();
const showLanguagePanel = ref(false);
</script>

<template>
  <Teleport to="body">
    <Transition name="settings-drawer">
      <div v-if="show" class="settings-overlay" @click="emit('close'); showLanguagePanel = false">
        <div class="settings-panel" @click.stop>
          <div class="settings-header">
            <h2 class="settings-title">{{ t.settings }}</h2>
            <button @click="emit('close')" class="settings-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="settings-content">
            <div class="settings-section">
              <button class="settings-item" @click="emit('open-preferences'); emit('close')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>{{ t.interests }}</span>
              </button>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-section">
              <button class="settings-item" role="switch" :aria-checked="userPreferences.autoplay"
                @click="setAutoplay(!userPreferences.autoplay)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <span>{{ t.autoplay }}</span>
                <span class="settings-switch" :class="{ on: userPreferences.autoplay }"></span>
              </button>
              <p class="settings-hint">{{ t.autoplayHint }}</p>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-section">
              <button class="settings-item" @click="emit('import-youtube'); emit('close')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>{{ t.importYouTube }}</span>
              </button>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-section">
              <a class="settings-item" href="https://github.com/Schengatto/youtube-player/issues/new?template=bug_report.md" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{{ t.reportIssue }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;opacity:0.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-section">
              <button class="settings-item" @click="showLanguagePanel = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>{{ t.language }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <div class="settings-subpanel" :class="{ open: showLanguagePanel }">
            <div class="settings-header">
              <button class="settings-back" @click="showLanguagePanel = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <h2 class="settings-title">{{ t.language }}</h2>
            </div>
            <div class="settings-content">
              <div class="settings-section">
                <button v-for="locale in availableLocales" :key="locale.code"
                  :class="['settings-item', 'lang-option', { active: currentLocale === locale.code }]"
                  @click="emit('set-locale', locale.code); showLanguagePanel = false; emit('close')">
                  {{ locale.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./AppSettingsDrawer.css"></style>
