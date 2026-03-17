<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useInstallPrompt } from '@/composables/useInstallPrompt';

interface LocaleOption { code: string; name: string; }

interface Props {
  show: boolean;
  savedCount: number;
  playlistCount: number;
  channelCount: number;
  bookmarkCount: number;
  availableLocales: LocaleOption[];
  currentLocale: string;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'open-saved': [];
  'open-playlists': [];
  'open-bookmarks': [];
  'open-channels': [];
  'open-preferences': [];
  'import-youtube': [];
  'set-locale': [code: string];
  'submit-link': [input: string];
}>();

const { t } = useI18n();
const { isInstallable, installApp, isIOS } = useInstallPrompt();
const showLanguageSidebar = ref(false);
const showIosInstallModal = ref(false);
const showLinkModal = ref(false);
const linkModalInput = ref('');

const handleLinkSubmit = () => {
  const input = linkModalInput.value.trim();
  if (!input) return;
  emit('submit-link', input);
  linkModalInput.value = '';
  showLinkModal.value = false;
};
</script>

<template>
  <Teleport to="body">
    <nav class="mobile-sidebar" :class="{ open: show }">
      <div class="sidebar-header">
        <h2 class="sidebar-title">{{ t.menu }}</h2>
        <button class="sidebar-close" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="sidebar-body">
        <div class="sidebar-section">
          <button class="sidebar-item" @click="showLinkModal = true; emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>{{ t.openFromLink }}</span>
          </button>
          <button class="sidebar-item" @click="emit('open-saved'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            <span>{{ t.saved }}</span>
            <span class="badge">{{ savedCount }}</span>
          </button>
          <button class="sidebar-item" @click="emit('open-playlists'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>{{ t.playlists }}</span>
            <span class="badge">{{ playlistCount }}</span>
          </button>
          <button class="sidebar-item" @click="emit('open-bookmarks'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
            <span>{{ t.bookmarks }}</span>
            <span class="badge">{{ bookmarkCount }}</span>
          </button>
          <button class="sidebar-item" @click="emit('open-channels'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            <span>{{ t.channels }}</span>
            <span class="badge">{{ channelCount }}</span>
          </button>
        </div>
        <div class="sidebar-divider"></div>
        <div class="sidebar-section">
          <button class="sidebar-item" @click="emit('open-preferences'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>{{ t.interests }}</span>
          </button>
          <button class="sidebar-item" @click="emit('import-youtube'); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{{ t.importYouTube }}</span>
          </button>
          <a class="sidebar-item" href="https://github.com/Schengatto/youtube-player/issues/new?template=bug_report.md" target="_blank" rel="noopener noreferrer" @click="emit('close')">
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
          <button class="sidebar-item" @click="showLanguageSidebar = true">
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
          <button v-if="isIOS" class="sidebar-item" @click="showIosInstallModal = true; emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{{ t.installApp }}</span>
          </button>
          <button v-if="isInstallable" class="sidebar-item" @click="installApp(); emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{{ t.installApp }}</span>
          </button>
        </div>
      </div>

      <div class="sidebar-subpanel" :class="{ open: showLanguageSidebar }">
        <div class="sidebar-header">
          <button class="sidebar-back" @click="showLanguageSidebar = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2 class="sidebar-title">{{ t.language }}</h2>
        </div>
        <div class="sidebar-body">
          <div class="sidebar-section">
            <button v-for="locale in availableLocales" :key="locale.code"
              :class="['sidebar-item', 'lang-option', { active: currentLocale === locale.code }]"
              @click="emit('set-locale', locale.code); showLanguageSidebar = false; emit('close')">
              {{ locale.name }}
            </button>
          </div>
        </div>
      </div>
    </nav>

    <Transition name="fade">
      <div v-if="showLinkModal" class="link-modal-overlay" @click="showLinkModal = false">
        <div class="link-modal" @click.stop>
          <h3 class="link-modal-title">{{ t.openFromLink }}</h3>
          <form @submit.prevent="handleLinkSubmit" class="link-modal-form">
            <input v-model="linkModalInput" type="text" class="link-modal-input"
              :placeholder="t.linkPlaceholder" autofocus />
            <div class="link-modal-actions">
              <button type="button" class="link-modal-cancel" @click="showLinkModal = false">{{ t.cancel }}</button>
              <button type="submit" class="link-modal-submit" :disabled="!linkModalInput.trim()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                {{ t.openFromLink }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="showIosInstallModal" class="link-modal-overlay" @click="showIosInstallModal = false">
        <div class="link-modal" @click.stop>
          <h3 class="link-modal-title">{{ t.iosInstallTitle }}</h3>
          <ol class="ios-install-steps">
            <li>{{ t.iosInstallStep1 }}</li>
            <li>{{ t.iosInstallStep2 }}</li>
            <li>{{ t.iosInstallStep3 }}</li>
          </ol>
          <div class="link-modal-actions">
            <button class="link-modal-submit" @click="showIosInstallModal = false">{{ t.close }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./AppMobileSidebar.css"></style>
