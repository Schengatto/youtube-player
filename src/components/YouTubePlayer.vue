<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';

interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
}

interface SavedChannel {
  name: string;
  id: string;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      channelId: string;
      thumbnails: {
        medium: {
          url: string;
        };
      };
    };
  }>;
}

interface UserPreferences {
  interests: string[];
  language: string;
}

const searchQuery = ref<string>('');
const videos = ref<Video[]>([]);
const selectedVideo = ref<Video | null>(null);
const isLoading = ref<boolean>(false);
const savedChannels = ref<SavedChannel[]>([]);
const showChannels = ref<boolean>(false);
const apiKey = ref<string>('');
const showApiKeyModal = ref<boolean>(false);
const apiKeyInput = ref<string>('');
const showShareToast = ref<boolean>(false);
const showPreferencesModal = ref<boolean>(false);
const userPreferences = ref<UserPreferences>({
  interests: [],
  language: 'en'
});
const tempInterests = ref<string>('');

const K = 'yt-player-secret-key-2024';

const DEFAULT_CATEGORIES = [
  'tecnologia',
  'musica',
  'gaming',
  'cucina',
  'sport',
  'scienza',
  'arte',
  'viaggi',
  'fitness',
  'tutorial'
];

const encrypt = (text: string): string => {
  const encrypted = text.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ K.charCodeAt(i % K.length));
  }).join('');
  return btoa(encrypted);
};

const decrypt = (encryptedText: string): string => {
  try {
    const decrypted = atob(encryptedText);
    return decrypted.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ K.charCodeAt(i % K.length));
    }).join('');
  } catch {
    return '';
  }
};

const hasApiKey = computed(() => apiKey.value.length > 0);
const hasPreferences = computed(() => userPreferences.value.interests.length > 0);

onMounted(() => {
  loadSavedChannels();
  loadApiKey();
  loadUserPreferences();
});

watch(savedChannels, (newChannels) => {
  try {
    localStorage.setItem('savedChannels', JSON.stringify(newChannels));
  } catch (error) {
    console.error('Error saving channels:', error);
  }
}, { deep: true });

watch(userPreferences, (newPrefs) => {
  try {
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}, { deep: true });

const loadSavedChannels = (): void => {
  try {
    const saved = localStorage.getItem('savedChannels');
    if (saved) {
      const parsed = JSON.parse(saved);
      savedChannels.value = Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Error loading channels:', error);
    savedChannels.value = [];
  }
};

const loadUserPreferences = (): void => {
  try {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      userPreferences.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
};

const loadApiKey = async (): Promise<void> => {
  try {
    const savedApiKey = localStorage.getItem('yt_api_key_encrypted');
    if (savedApiKey) {
      apiKey.value = decrypt(savedApiKey);

      if (!hasPreferences.value) {
        showPreferencesModal.value = true;
      } else {
        await loadRecommendedVideos();
      }
    } else {
      showApiKeyModal.value = true;
    }
  } catch (error) {
    console.error('Error loading API key:', error);
    showApiKeyModal.value = true;
  }
};

const saveApiKey = async (): Promise<void> => {
  if (apiKeyInput.value.trim()) {
    try {
      const encrypted = encrypt(apiKeyInput.value.trim());
      localStorage.setItem('yt_api_key_encrypted', encrypted);
      apiKey.value = apiKeyInput.value.trim();
      showApiKeyModal.value = false;
      apiKeyInput.value = '';

      if (!hasPreferences.value) {
        showPreferencesModal.value = true;
      } else {
        await loadRecommendedVideos();
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Errore nel salvataggio della chiave API. Riprova.');
    }
  }
};

const savePreferences = async (): Promise<void> => {
  const interests = tempInterests.value
    .split(',')
    .map(i => i.trim())
    .filter(i => i.length > 0);

  if (interests.length === 0) {
    alert('Inserisci almeno un interesse!');
    return;
  }

  userPreferences.value.interests = interests;
  showPreferencesModal.value = false;
  tempInterests.value = '';

  await loadRecommendedVideos();
};

const openPreferencesModal = (): void => {
  tempInterests.value = userPreferences.value.interests.join(', ');
  showPreferencesModal.value = true;
};

const addInterestFromCategory = (category: string): void => {
  const current = tempInterests.value.split(',').map(i => i.trim()).filter(i => i.length > 0);
  if (!current.includes(category)) {
    if (tempInterests.value) {
      tempInterests.value += ', ' + category;
    } else {
      tempInterests.value = category;
    }
  }
};

const loadRecommendedVideos = async (): Promise<void> => {
  if (!hasApiKey.value || !hasPreferences.value) return;

  isLoading.value = true;
  const allVideos: Video[] = [];

  try {
    for (const interest of userPreferences.value.interests.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(interest)}&type=video&relevanceLanguage=${userPreferences.value.language}&order=relevance&key=${apiKey.value}`
        );

        if (response.ok) {
          const data: YouTubeSearchResponse = await response.json();
          if (data.items) {
            const newVideos = data.items.map(item => ({
              title: item.snippet.title,
              videoId: item.id.videoId,
              thumbnail: item.snippet.thumbnails.medium.url,
              channel: item.snippet.channelTitle,
              channelId: item.snippet.channelId
            }));
            allVideos.push(...newVideos);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error loading videos for ${interest}:`, error);
      }
    }

    const uniqueVideos = allVideos.filter((video, index, self) =>
      index === self.findIndex(v => v.videoId === video.videoId)
    );

    videos.value = uniqueVideos.sort(() => Math.random() - 0.5).slice(0, 12);
  } catch (error) {
    console.error('Error loading recommended videos:', error);
  } finally {
    isLoading.value = false;
  }
};

const changeApiKey = (): void => {
  apiKeyInput.value = '';
  showApiKeyModal.value = true;
};

const shareVideo = async (): Promise<void> => {
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

const searchVideos = async (): Promise<void> => {
  if (!searchQuery.value.trim()) return;
  if (!hasApiKey.value) {
    showApiKeyModal.value = true;
    return;
  }

  isLoading.value = true;
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(searchQuery.value)}&type=video&key=${apiKey.value}`
    );

    if (!response.ok) {
      throw new Error('Ricerca fallita. Controlla la tua chiave API.');
    }

    const data: YouTubeSearchResponse = await response.json();

    if (data.items) {
      videos.value = data.items.map(item => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId
      }));
    }
  } catch (error) {
    console.error('Search error:', error);
    alert('Errore nella ricerca. Controlla la tua chiave API.');
  } finally {
    isLoading.value = false;
  }
};

const playVideo = (video: Video): void => {
  selectedVideo.value = video;
};

const closePlayer = (): void => {
  selectedVideo.value = null;
};

const saveChannel = (channelName: string, channelId: string): void => {
  if (!isChannelSaved(channelId)) {
    const newChannel: SavedChannel = { name: channelName, id: channelId };
    savedChannels.value = [...savedChannels.value, newChannel];
  }
};

const removeChannel = (channelId: string): void => {
  savedChannels.value = savedChannels.value.filter(ch => ch.id !== channelId);
};

const isChannelSaved = (channelId: string): boolean => {
  return savedChannels.value.some(ch => ch.id === channelId);
};

const toggleChannelSave = (channelName: string, channelId: string): void => {
  if (isChannelSaved(channelId)) {
    removeChannel(channelId);
  } else {
    saveChannel(channelName, channelId);
  }
};

const searchChannelVideos = async (channelId: string): Promise<void> => {
  if (!hasApiKey.value) {
    showApiKeyModal.value = true;
    return;
  }

  isLoading.value = true;
  showChannels.value = false;
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=6&order=date&type=video&key=${apiKey.value}`
    );

    if (!response.ok) {
      throw new Error('Ricerca canale fallita');
    }

    const data: YouTubeSearchResponse = await response.json();

    if (data.items) {
      videos.value = data.items.map(item => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId
      }));
    }
  } catch (error) {
    console.error('Search error:', error);
    alert('Errore nel caricamento dei video del canale');
  } finally {
    isLoading.value = false;
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
        <button class="icon-btn" @click="openPreferencesModal" title="I tuoi interessi">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="btn-label">Interessi</span>
        </button>
        <button class="icon-btn channels-btn" :class="{ active: showChannels }" @click="showChannels = !showChannels"
          :title="`Canali salvati (${savedChannels.length})`">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
          <span class="btn-label">Canali</span>
          <span class="badge">{{ savedChannels.length }}</span>
        </button>
        <button class="icon-btn settings-btn" @click="changeApiKey"
          :title="hasApiKey ? 'Cambia chiave API' : 'Configura chiave API'">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
            </path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span class="btn-label">API</span>
        </button>
      </div>
    </header>

    <div class="search-container">
      <form @submit.prevent="searchVideos" class="search-form">
        <input v-model="searchQuery" type="text" placeholder="Cerca video su YouTube..." class="search-input" />
        <button type="submit" :disabled="isLoading" class="search-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>{{ isLoading ? 'Ricerca...' : 'Cerca' }}</span>
        </button>
      </form>
      <button v-if="videos.length > 0" @click="loadRecommendedVideos" class="refresh-btn" :disabled="isLoading"
        title="Ricarica consigliati">
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

    <div v-if="showChannels" class="channels-panel-container">
      <div class="channels-panel">
        <h2 class="channels-title">I tuoi canali salvati</h2>
        <p v-if="savedChannels.length === 0" class="no-channels">
          Nessun canale salvato. Salva i canali dai video per accedervi rapidamente!
        </p>
        <div v-else class="channels-grid">
          <div v-for="channel in savedChannels" :key="channel.id" class="channel-card">
            <button @click="searchChannelVideos(channel.id)" class="channel-name-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
              {{ channel.name }}
            </button>
            <button @click="removeChannel(channel.id)" class="channel-remove-btn" title="Rimuovi canale">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading && videos.length === 0" class="loading-state">
      <div class="loader"></div>
      <p>Caricamento video...</p>
    </div>

    <div v-if="videos.length > 0" class="videos-container">
      <h2 v-if="!searchQuery" class="section-title">Video consigliati per te</h2>
      <div class="videos-grid">
        <div v-for="(video, index) in videos" :key="video.videoId" class="video-card"
          :style="{ animationDelay: `${index * 0.05}s` }" @click="playVideo(video)">
          <div class="video-thumbnail">
            <img :src="video.thumbnail" :alt="video.title" />
            <div class="play-overlay">
              <div class="play-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <div class="video-channel">
              <p class="channel-name">{{ video.channel }}</p>
              <button v-if="video.channelId" @click.stop="toggleChannelSave(video.channel, video.channelId)"
                class="save-channel-btn" :class="{ saved: isChannelSaved(video.channelId) }"
                :title="isChannelSaved(video.channelId) ? 'Rimuovi dai salvati' : 'Salva canale'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  :fill="isChannelSaved(video.channelId) ? 'currentColor' : 'none'" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
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

    <Teleport to="body">
      <div v-if="selectedVideo" class="modal-overlay" @click="closePlayer">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ selectedVideo.title }}</h2>
            <div class="modal-actions">
              <button @click="shareVideo" class="modal-action-btn" title="Condividi video">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
              <button @click="closePlayer" class="modal-action-btn close-btn" title="Chiudi">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="video-player">
            <iframe
              :src="`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}?autoplay=1&modestbranding=1&rel=0`"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen />
          </div>
        </div>
      </div>

      <div v-if="showApiKeyModal" class="modal-overlay" @click="showApiKeyModal = false">
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
            <form @submit.prevent="saveApiKey" class="api-key-form">
              <input v-model="apiKeyInput" type="text" placeholder="Inserisci la tua chiave API di YouTube..."
                class="api-key-input" required />
              <div class="api-key-actions">
                <button type="submit" class="api-key-save-btn">
                  Salva chiave API
                </button>
                <button v-if="hasApiKey" type="button" @click="showApiKeyModal = false" class="api-key-cancel-btn">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div v-if="showPreferencesModal" class="modal-overlay" @click="showPreferencesModal = false">
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
                <button v-for="category in DEFAULT_CATEGORIES" :key="category" @click="addInterestFromCategory(category)"
                  class="category-chip" type="button">
                  {{ category }}
                </button>
              </div>
            </div>
            <form @submit.prevent="savePreferences" class="preferences-form">
              <label for="interests" class="preferences-label">
                I tuoi interessi (separati da virgola):
              </label>
              <textarea v-model="tempInterests" id="interests"
                placeholder="Es: tecnologia, musica, gaming, cucina..." class="preferences-input" rows="3"
                required></textarea>
              <p class="preferences-hint">
                💡 Questi interessi saranno usati per mostrarti video personalizzati all'avvio
              </p>
              <div class="preferences-actions">
                <button type="submit" class="preferences-save-btn">
                  Salva interessi
                </button>
                <button v-if="hasPreferences" type="button" @click="showPreferencesModal = false"
                  class="preferences-cancel-btn">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div v-if="showShareToast" class="share-toast">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Link copiato negli appunti!
      </div>
    </Teleport>
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

/* Header */
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

/* Search Bar */
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
  border-color: rgba(234, 32, 32, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-btn {
  background: #fa0000;
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

/* Loading State */
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
  border-top-color: #fa0000;
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

/* Empty State */
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

/* Section Title */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 1rem 0;
  padding: 0 1rem;
}

/* Channels Panel */
.channels-panel-container {
  padding: 0 1rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.channels-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.channels-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.no-channels {
  color: #888;
  margin: 0;
  font-size: 0.9rem;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.channel-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.channel-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.channel-name-btn {
  background: none;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-name-btn:hover {
  color: #fff;
}

.channel-remove-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 4px;
  padding: 0.4rem;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.channel-remove-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* Videos Grid */
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

.video-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: fadeIn 0.4s ease backwards;
}

.video-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.video-card:hover .play-overlay {
  opacity: 1;
}

.video-thumbnail {
  position: relative;
  padding-top: 56.25%;
  background: #000;
  overflow: hidden;
}

.video-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.video-card:hover .video-thumbnail img {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.play-icon {
  background: #fa0000;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.video-info {
  padding: 1rem;
}

.video-title {
  font-size: 0.9rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: #fff;
}

.video-channel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.channel-name {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-channel-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 4px;
  padding: 0.35rem;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.save-channel-btn.saved {
  background: rgba(59, 130, 246, 0.15);
  color: #fa0000;
}

.save-channel-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.save-channel-btn.saved:hover {
  background: rgba(59, 130, 246, 0.25);
  color: #60a5fa;
}

/* Modal */
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

.modal-content {
  width: 100%;
  max-width: 1200px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.modal-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-action-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: #e0e0e0;
}

.modal-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.modal-action-btn.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.video-player {
  position: relative;
  padding-top: 56.25%;
  background: #000;
}

.video-player iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Animations */
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

/* API Key Modal */
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

/* Preferences Modal */
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

/* Share Toast */
.share-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fa0000;
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  animation: slideUp 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Mobile Responsive */
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

  .search-btn span {
    display: inline;
  }

  .videos-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
  }

  .channels-grid {
    grid-template-columns: 1fr;
  }

  .modal-title {
    font-size: 0.9rem;
  }

  .api-key-actions,
  .preferences-actions {
    flex-direction: column;
  }

  .share-toast {
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    transform: none;
  }

  .category-chips {
    gap: 0.4rem;
  }

  .category-chip {
    font-size: 0.8rem;
    padding: 0.35rem 0.75rem;
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
