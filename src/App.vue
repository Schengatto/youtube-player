<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Video } from '@/types';
import VideoCard from '@/components/VideoCard.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';
import ApiKeyModal from '@/components/ApiKeyModal.vue';
import PreferencesModal from '@/components/PreferencesModal.vue';
import ChannelsPanel from '@/components/ChannelsPanel.vue';
import ShareToast from '@/components/ShareToast.vue';
import { useYouTubeAPI } from './composables/useYouTubeAPI';
import { useSettings } from './composables/useSettings';

const {
  apiKey,
  savedChannels,
  userPreferences,
  loadApiKey,
  saveApiKey,
  loadChannels,
  saveChannel,
  removeChannel,
  isChannelSaved,
  loadPreferences,
  savePreferences
} = useSettings();

const searchQuery = ref('');
const videos = ref<Video[]>([]);
const selectedVideo = ref<Video | null>(null);
const isLoading = ref(false);
const showChannels = ref(false);
const showApiKeyModal = ref(false);
const showPreferencesModal = ref(false);
const showShareToast = ref(false);

const hasApiKey = computed(() => apiKey.value.length > 0);
const hasPreferences = computed(() => userPreferences.value.interests.length > 0);

onMounted(async () => {
  loadChannels();
  const hasKey = loadApiKey();
  const hasPrefs = loadPreferences();

  if (!hasKey) {
    showApiKeyModal.value = true;
  } else if (!hasPrefs) {
    showPreferencesModal.value = true;
  } else {
    await loadRecommendedVideos();
  }
});

const handleSaveApiKey = async (key: string) => {
  saveApiKey(key);
  showApiKeyModal.value = false;

  if (!hasPreferences.value) {
    showPreferencesModal.value = true;
  } else {
    await loadRecommendedVideos();
  }
};

const handleSavePreferences = async (interests: string[]) => {
  savePreferences(interests);
  showPreferencesModal.value = false;
  await loadRecommendedVideos();
};

const loadRecommendedVideos = async () => {
  if (!hasApiKey.value || !hasPreferences.value) return;

  isLoading.value = true;
  try {
    const api = useYouTubeAPI(apiKey.value);
    videos.value = await api.searchRecommended(
      userPreferences.value.interests,
      userPreferences.value.language
    );
  } catch (error) {
    console.error('Error loading recommended videos:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = async () => {
  if (!searchQuery.value.trim() || !hasApiKey.value) return;

  isLoading.value = true;
  try {
    const api = useYouTubeAPI(apiKey.value);
    videos.value = await api.searchVideos(searchQuery.value);
  } catch (error) {
    console.error('Search error:', error);
    alert('Errore nella ricerca. Controlla la tua chiave API.');
  } finally {
    isLoading.value = false;
  }
};

const handleChannelSearch = async (channelId: string) => {
  if (!hasApiKey.value) return;

  isLoading.value = true;
  showChannels.value = false;

  try {
    const api = useYouTubeAPI(apiKey.value);
    videos.value = await api.searchByChannel(channelId);
  } catch (error) {
    console.error('Channel search error:', error);
    alert('Errore nel caricamento dei video del canale');
  } finally {
    isLoading.value = false;
  }
};

const toggleChannelSave = (name: string, id: string) => {
  if (isChannelSaved(id)) {
    removeChannel(id);
  } else {
    saveChannel(name, id);
  }
};

const handleShare = async () => {
  if (!selectedVideo.value) return;

  const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.value.videoId}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: selectedVideo.value.title,
        text: `Guarda questo video: ${selectedVideo.value.title}`,
        url: videoUrl
      });
    } else {
      await navigator.clipboard.writeText(videoUrl);
      showShareToast.value = true;
      setTimeout(() => {
        showShareToast.value = false;
      }, 3000);
    }
  } catch (error) {
    console.error('Share error:', error);
  }
};
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content">
        <h1 class="title">LibreTube</h1>
        <p class="subtitle">Video personalizzati per i tuoi interessi</p>
      </div>
      <div class="header-buttons">
        <button class="icon-btn" @click="showPreferencesModal = true" title="I tuoi interessi">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="btn-label">Interessi</span>
        </button>
        <button
          class="icon-btn channels-btn"
          :class="{ active: showChannels }"
          @click="showChannels = !showChannels"
          :title="`Canali salvati (${savedChannels.length})`"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
          <span class="btn-label">Canali</span>
          <span class="badge">{{ savedChannels.length }}</span>
        </button>
        <button
          class="icon-btn settings-btn"
          @click="showApiKeyModal = true"
          :title="hasApiKey ? 'Cambia chiave API' : 'Configura chiave API'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span class="btn-label">API</span>
        </button>
      </div>
    </header>

    <div class="search-container">
      <form @submit.prevent="handleSearch" class="search-form">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cerca video su YouTube..."
          class="search-input"
        />
        <button type="submit" :disabled="isLoading" class="search-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>{{ isLoading ? 'Ricerca...' : 'Cerca' }}</span>
        </button>
      </form>
      <button
        v-if="videos.length > 0"
        @click="loadRecommendedVideos"
        class="refresh-btn"
        :disabled="isLoading"
        title="Ricarica consigliati"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
        Aggiorna consigliati
      </button>
    </div>

    <ChannelsPanel
      v-if="showChannels"
      :channels="savedChannels"
      @select-channel="handleChannelSearch"
      @remove-channel="removeChannel"
    />

    <div v-if="isLoading && videos.length === 0" class="loading-state">
      <div class="loader"></div>
      <p>Caricamento video...</p>
    </div>

    <div v-if="videos.length > 0" class="videos-container">
      <h2 v-if="!searchQuery" class="section-title">Video consigliati per te</h2>
      <div class="videos-grid">
        <VideoCard
          v-for="(video, index) in videos"
          :key="video.videoId"
          :video="video"
          :index="index"
          :is-channel-saved="video.channelId ? isChannelSaved(video.channelId) : false"
          @play="selectedVideo = $event"
          @toggle-channel="toggleChannelSave"
        />
      </div>
    </div>

    <div v-if="!isLoading && videos.length === 0 && hasApiKey && hasPreferences" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      <h2>Inizia a esplorare</h2>
      <p>Cerca video o aggiorna i tuoi interessi per vedere contenuti personalizzati</p>
    </div>

    <VideoPlayer
      :video="selectedVideo"
      @close="selectedVideo = null"
      @share="handleShare"
    />

    <ApiKeyModal
      :show="showApiKeyModal"
      :has-api-key="hasApiKey"
      @close="showApiKeyModal = false"
      @save="handleSaveApiKey"
    />

    <PreferencesModal
      :show="showPreferencesModal"
      :current-interests="userPreferences.interests"
      :has-preferences="hasPreferences"
      @close="showPreferencesModal = false"
      @save="handleSavePreferences"
    />

    <ShareToast :show="showShareToast" />
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  padding: 0;
  margin: 0;
}

.header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  flex: 1;
  min-width: 200px;
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #888;
  font-size: 0.85rem;
  margin: 0;
  font-weight: 400;
}

.icon-btn {
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

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.icon-btn.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.btn-label {
  display: inline;
}

.search-container {
  padding: 1.5rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.search-form {
  position: relative;
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-input {
  flex: 1;
  padding: 0.9rem 1rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e0e0e0;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-btn {
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  padding: 0.9rem 1.5rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.search-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.search-btn:not(:disabled):hover {
  background: #2563eb;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  font-family: inherit;
  margin-top: 0.5rem;
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.refresh-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 1rem;
}

.loader {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  color: #888;
  font-size: 0.95rem;
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  color: #888;
}

.empty-state svg {
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #fff;
}

.empty-state p {
  margin: 0;
  font-size: 0.95rem;
  max-width: 400px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 1rem 0;
  padding: 0 1rem;
}

.videos-container {
  padding: 0 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  .btn-label {
    display: none;
  }

  .icon-btn {
    padding: 0.6rem;
  }

  .search-container {
    padding: 1rem;
  }

  .search-form {
    flex-direction: column;
  }

  .search-btn {
    width: 100%;
    justify-content: center;
  }

  .videos-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .videos-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
