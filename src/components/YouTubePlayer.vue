<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

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

// Chiave per la criptazione (in produzione usa una chiave più robusta o derivata)
const CRYPTO_KEY = 'yt-player-secret-key-2024';

// Funzioni di criptazione/decriptazione semplici (Base64 + XOR)
const encrypt = (text: string): string => {
  const encrypted = text.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length));
  }).join('');
  return btoa(encrypted);
};

const decrypt = (encryptedText: string): string => {
  try {
    const decrypted = atob(encryptedText);
    return decrypted.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length));
    }).join('');
  } catch {
    return '';
  }
};

const hasApiKey = computed(() => apiKey.value.length > 0);

// Carica i canali salvati e l'API key al mount
onMounted(() => {
  const saved = localStorage.getItem('savedChannels');
  if (saved) {
    savedChannels.value = JSON.parse(saved);
  }

  const savedApiKey = localStorage.getItem('yt_api_key_encrypted');
  if (savedApiKey) {
    apiKey.value = decrypt(savedApiKey);
  } else {
    showApiKeyModal.value = true;
  }
});

const saveApiKey = (): void => {
  if (apiKeyInput.value.trim()) {
    const encrypted = encrypt(apiKeyInput.value.trim());
    localStorage.setItem('yt_api_key_encrypted', encrypted);
    apiKey.value = apiKeyInput.value.trim();
    showApiKeyModal.value = false;
    apiKeyInput.value = '';
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
      // Fallback: copia negli appunti
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
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery.value)}&type=video&key=${apiKey.value}`
    );

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
    alert('Errore nella ricerca. Verifica la tua API key.');
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
  const newChannel: SavedChannel = { name: channelName, id: channelId };
  savedChannels.value.push(newChannel);
  localStorage.setItem('savedChannels', JSON.stringify(savedChannels.value));
};

const removeChannel = (channelId: string): void => {
  savedChannels.value = savedChannels.value.filter(ch => ch.id !== channelId);
  localStorage.setItem('savedChannels', JSON.stringify(savedChannels.value));
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
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=12&order=date&type=video&key=${apiKey.value}`
    );

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
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="header">
      <div>
        <h1 class="title">Libre YouTube</h1>
        <p class="subtitle">→ Cerca e guarda video senza interruzioni</p>
      </div>
      <div class="header-buttons">
        <button class="channels-btn" :class="{ active: showChannels }" @click="showChannels = !showChannels">
          📺 Canali ({{ savedChannels.length }})
        </button>
        <button class="settings-btn" @click="changeApiKey"
          :title="hasApiKey ? 'Modifica API Key' : 'Configura API Key'">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z">
            </path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          {{ hasApiKey ? '' : 'API' }}
        </button>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="search-container">
      <form @submit.prevent="searchVideos" class="search-form">
        <input v-model="searchQuery" type="text" placeholder="Cerca video su YouTube..." class="search-input" />
        <button type="submit" :disabled="isLoading" class="search-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          {{ isLoading ? 'Cerco...' : 'Cerca' }}
        </button>
      </form>
    </div>

    <!-- Saved Channels Panel -->
    <div v-if="showChannels" class="channels-panel-container">
      <div class="channels-panel">
        <h2 class="channels-title">I Tuoi Canali</h2>
        <p v-if="savedChannels.length === 0" class="no-channels">
          Nessun canale salvato. Salva i canali dai video per accedervi rapidamente!
        </p>
        <div v-else class="channels-grid">
          <div v-for="(channel, index) in savedChannels" :key="index" class="channel-card">
            <button @click="searchChannelVideos(channel.id)" class="channel-name-btn">
              📺 {{ channel.name }}
            </button>
            <button @click="removeChannel(channel.id)" class="channel-remove-btn">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Video Grid -->
    <div v-if="videos.length > 0" class="videos-container">
      <div class="videos-grid">
        <div v-for="(video, index) in videos" :key="index" class="video-card"
          :style="{ animationDelay: `${index * 0.05}s` }" @click="playVideo(video)">
          <div class="video-thumbnail">
            <img :src="video.thumbnail" :alt="video.title" />
            <div class="play-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff"
                stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <div class="video-channel">
              <p class="channel-name">{{ video.channel }}</p>
              <button v-if="video.channelId" @click.stop="toggleChannelSave(video.channel, video.channelId)"
                class="save-channel-btn" :class="{ saved: isChannelSaved(video.channelId) }">
                {{ isChannelSaved(video.channelId) ? '★' : '☆' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Video Player Modal -->
    <Teleport to="body">
      <div v-if="selectedVideo" class="modal-overlay" @click="closePlayer">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ selectedVideo.title }}</h2>
            <div class="modal-actions">
              <button @click="shareVideo" class="modal-share-btn" title="Condividi video">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
              <button @click="closePlayer" class="modal-close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

      <!-- API Key Configuration Modal -->
      <div v-if="showApiKeyModal" class="modal-overlay" @click="showApiKeyModal = false">
        <div class="api-key-modal" @click.stop>
          <div class="api-key-header">
            <h2 class="api-key-title">🔑 Configura YouTube API Key</h2>
            <p class="api-key-subtitle">
              Per utilizzare l'app, inserisci la tua API key di YouTube Data API v3
            </p>
          </div>
          <div class="api-key-body">
            <div class="api-key-info">
              <h3>Come ottenere l'API Key:</h3>
              <ol>
                <li>Vai su <a href="https://console.cloud.google.com" target="_blank" rel="noopener">Google Cloud
                    Console</a></li>
                <li>Crea un nuovo progetto o selezionane uno esistente</li>
                <li>Abilita "YouTube Data API v3"</li>
                <li>Vai su "Credenziali" → "Crea credenziali" → "Chiave API"</li>
                <li>Copia la chiave generata e incollala qui sotto</li>
              </ol>
              <p class="api-key-note">
                ℹ️ L'API key verrà salvata localmente nel tuo browser in forma criptata.
                L'API gratuita offre 10.000 unità/giorno (~100 ricerche).
              </p>
            </div>
            <form @submit.prevent="saveApiKey" class="api-key-form">
              <input v-model="apiKeyInput" type="text" placeholder="Inserisci la tua YouTube API Key..."
                class="api-key-input" required />
              <div class="api-key-actions">
                <button type="submit" class="api-key-save-btn">
                  Salva API Key
                </button>
                <button v-if="hasApiKey" type="button" @click="showApiKeyModal = false" class="api-key-cancel-btn">
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Share Toast Notification -->
      <div v-if="showShareToast" class="share-toast">
        ✓ Link copiato negli appunti!
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
  background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%);
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  padding: 0;
  margin: 0;
}

/* Header */
.header {
  padding: 2rem;
  border-bottom: 2px solid rgba(255, 0, 100, 0.3);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.title {
  font-size: 2.5rem;
  font-weight: 900;
  background: linear-gradient(90deg, #ff0066, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

.subtitle {
  color: #999;
  font-size: 0.9rem;
  margin: 0;
  font-family: monospace;
}

.channels-btn,
.settings-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 0, 100, 0.3);
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.channels-btn.active,
.settings-btn:hover {
  background: linear-gradient(135deg, #ff0066, #ff3399);
}

.channels-btn:hover,
.settings-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(255, 0, 100, 0.4);
}

/* Search Bar */
.search-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.search-form {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1.2rem 3.5rem 1.2rem 1.5rem;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 0, 100, 0.3);
  border-radius: 12px;
  color: #fff;
  outline: none;
  font-family: inherit;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(255, 0, 100, 0.1);
}

.search-input:focus {
  border-color: #ff0066;
  box-shadow: 0 0 30px rgba(255, 0, 100, 0.3);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #ff0066, #ff3399);
  border: none;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.search-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.search-btn:not(:disabled):hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 5px 20px rgba(255, 0, 100, 0.4);
}

/* Channels Panel */
.channels-panel-container {
  padding: 0 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.channels-panel {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid rgba(255, 0, 100, 0.3);
}

.channels-title {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ff0066;
}

.no-channels {
  color: #999;
  margin: 0;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.channel-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.channel-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 0, 100, 0.3);
}

.channel-name-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  text-align: left;
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
}

.channel-remove-btn {
  background: rgba(255, 0, 100, 0.2);
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  color: #ff0066;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.channel-remove-btn:hover {
  background: rgba(255, 0, 100, 0.4);
}

/* Videos Grid */
.videos-container {
  padding: 0 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.video-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.05);
  animation: fadeIn 0.5s ease backwards;
}

.video-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255, 0, 100, 0.5);
  box-shadow: 0 10px 30px rgba(255, 0, 100, 0.2);
}

.video-card:hover .play-icon {
  opacity: 1;
}

.video-thumbnail {
  position: relative;
  padding-top: 56.25%;
  background: #000;
}

.video-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 100, 0.9);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-info {
  padding: 1rem;
}

.video-title {
  font-size: 0.95rem;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.video-channel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.channel-name {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
  font-family: monospace;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-channel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.save-channel-btn.saved {
  background: linear-gradient(135deg, #ff0066, #ff3399);
}

.save-channel-btn:hover {
  transform: scale(1.05);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  width: 100%;
  max-width: 1200px;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255, 0, 100, 0.3);
  box-shadow: 0 20px 60px rgba(255, 0, 100, 0.3);
  animation: slideUp 0.4s ease;
}

.modal-header {
  background: linear-gradient(90deg, #ff0066, #00ffff);
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #000;
  flex: 1;
  margin-right: 1rem;
}

.modal-share-btn,
.modal-close-btn {
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.modal-share-btn:hover,
.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: scale(1.1);
}

.video-player {
  position: relative;
  padding-top: 56.25%;
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
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* API Key Modal */
.api-key-modal {
  width: 100%;
  max-width: 600px;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255, 0, 100, 0.3);
  box-shadow: 0 20px 60px rgba(255, 0, 100, 0.3);
  animation: slideUp 0.4s ease;
}

.api-key-header {
  background: linear-gradient(135deg, #ff0066, #00ffff);
  padding: 1.5rem;
  color: #000;
}

.api-key-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.api-key-subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.api-key-body {
  padding: 1.5rem;
}

.api-key-info {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 0, 100, 0.2);
}

.api-key-info h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #ff0066;
}

.api-key-info ol {
  margin: 0 0 1rem 0;
  padding-left: 1.5rem;
  color: #ccc;
  line-height: 1.6;
}

.api-key-info ol li {
  margin-bottom: 0.5rem;
}

.api-key-info a {
  color: #00ffff;
  text-decoration: none;
  font-weight: 600;
}

.api-key-info a:hover {
  text-decoration: underline;
}

.api-key-note {
  margin: 0;
  font-size: 0.85rem;
  color: #999;
  background: rgba(0, 255, 255, 0.1);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #00ffff;
}

.api-key-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-key-input {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 0, 100, 0.3);
  border-radius: 8px;
  color: #fff;
  outline: none;
  font-family: monospace;
  transition: all 0.3s ease;
}

.api-key-input:focus {
  border-color: #ff0066;
  box-shadow: 0 0 20px rgba(255, 0, 100, 0.3);
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
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.api-key-save-btn {
  background: linear-gradient(135deg, #ff0066, #ff3399);
  color: #fff;
}

.api-key-save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 0, 100, 0.4);
}

.api-key-cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.api-key-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Share Toast */
.share-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #00ffff, #0099ff);
  color: #000;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
  z-index: 10000;
  animation: slideUp 0.3s ease;
}
</style>
