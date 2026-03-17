<script setup lang="ts">
import { useAppState } from '@/composables/useAppState';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import VideoCard from '@/components/VideoCard.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';
import PreferencesModal from '@/components/PreferencesModal.vue';
import ChannelsPanel from '@/components/ChannelsPanel.vue';
import SavedVideosPanel from '@/components/SavedVideosPanel.vue';
import ShareToast from '@/components/ShareToast.vue';
import LinkInput from '@/components/LinkInput.vue';
import LanguagePickerModal from '@/components/LanguagePickerModal.vue';
import PlaylistsPanel from '@/components/PlaylistsPanel.vue';
import AddToPlaylistModal from '@/components/AddToPlaylistModal.vue';
import AppMobileSidebar from '@/components/AppMobileSidebar.vue';
import AppSettingsDrawer from '@/components/AppSettingsDrawer.vue';
import BookmarksPanel from '@/components/BookmarksPanel.vue';
import ImportPlaylistModal from '@/components/ImportPlaylistModal.vue';
import ImportYouTubeModal from '@/components/ImportYouTubeModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import AlertModal from '@/components/AlertModal.vue';
import UpdateToast from '@/components/UpdateToast.vue';

const { isInstallable, installApp } = useInstallPrompt();

const {
  savedChannels, isChannelSaved, removeChannel,
  savedVideos, isVideoSaved, toggleSaveVideo,
  playlists, getVideoPlaylists, removeVideoFromPlaylist, moveVideoInPlaylist,
  t, currentLocale, isLocaleSet, availableLocales, handleSetLocale,
  showUserMenu, showMobileSidebar, showChannels, showSavedVideos,
  showPreferencesModal, showShareToast,
  showPlaylistsPanel, showBookmarksPanel, showAddToPlaylist, selectedVideoForPlaylist,
  searchQuery, videos, selectedVideo, isMinimized, isLoading, isLoadingMore,
  activePlaylistVideos,
  hasPreferences,
  loadRecommendedVideos, handleSearch, handleChannelSearch,
  toggleChannelSave, handleLinkSubmit, handleShare,
  handleSavePreferences,
  handleCloseVideo, handleMinimize, handleMaximize, handlePlayVideo, handleSelectSavedVideo,
  handleRemoveSavedVideo, handleClearAllSavedVideos,
  handleAddToPlaylist, handleTogglePlaylist, handleCreatePlaylist,
  handleDeletePlaylist, handlePlaylistPlayVideo, handleSharePlaylist,
  handlePlayNext, handlePlayPrevious,
  pendingImportPlaylist, handleImportPlaylistSave, handleImportPlaylistWatch,
  bookmarks, handleSelectBookmark, handleShareBookmark, handleShareBookmarkFromPanel,
  handleDeleteBookmark, handleClearAllBookmarks,
  pendingStartTime,
  userPreferences,
  showImportModal, importStep, importError, importResult,
  handleStartYouTubeImport, handleConfirmImport, handleCloseImport, handleRetryImport,
} = useAppState();
</script>

<template>
  <div class="app-container">
    <header>
      <div class="header">
        <div class="header-content">
          <h1 class="title" @click="loadRecommendedVideos" style="cursor: pointer;"><span class="red">Tube</span>-Too</h1>
        </div>
        <div class="header-buttons desktop-only">
          <LinkInput @submit="handleLinkSubmit" />
          <button class="icon-btn" :class="{ active: showSavedVideos }" @click="showSavedVideos = !showSavedVideos"
            :title="`${t.savedForLater} (${savedVideos.length})`">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
            </svg>
            <span class="btn-label">{{ t.saved }}</span>
            <span class="badge">{{ savedVideos.length }}</span>
          </button>
          <button class="icon-btn" :class="{ active: showPlaylistsPanel }" @click="showPlaylistsPanel = !showPlaylistsPanel"
            :title="`${t.playlists} (${playlists.length})`">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span class="btn-label">{{ t.playlists }}</span>
            <span class="badge">{{ playlists.length }}</span>
          </button>
          <button class="icon-btn" :class="{ active: showBookmarksPanel }" @click="showBookmarksPanel = !showBookmarksPanel"
            :title="`${t.bookmarks} (${bookmarks.length})`">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
            <span class="btn-label">{{ t.bookmarks }}</span>
            <span class="badge">{{ bookmarks.length }}</span>
          </button>
          <button class="icon-btn channels-btn" :class="{ active: showChannels }" @click="showChannels = !showChannels"
            :title="`${t.channels} (${savedChannels.length})`">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            <span class="btn-label">{{ t.channels }}</span>
            <span class="badge">{{ savedChannels.length }}</span>
          </button>
          <button v-if="isInstallable" class="icon-btn" @click="installApp" :title="t.installApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="btn-label">{{ t.installApp }}</span>
          </button>
          <button class="icon-btn" :class="{ active: showUserMenu }" @click="showUserMenu = !showUserMenu" :title="t.settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span class="btn-label">{{ t.settings }}</span>
          </button>
        </div>
        <button class="icon-btn mobile-menu-btn" @click="showMobileSidebar = true" :title="t.menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>

    <AppMobileSidebar
      :show="showMobileSidebar"
      :saved-count="savedVideos.length"
      :playlist-count="playlists.length"
      :channel-count="savedChannels.length"
      :bookmark-count="bookmarks.length"
      :available-locales="availableLocales"
      :current-locale="currentLocale"
      @close="showMobileSidebar = false"
      @open-saved="showSavedVideos = true"
      @open-playlists="showPlaylistsPanel = true"
      @open-bookmarks="showBookmarksPanel = true"
      @open-channels="showChannels = true"
      @open-preferences="showPreferencesModal = true"
      @set-locale="handleSetLocale"
      @submit-link="handleLinkSubmit"
    />

    <div class="search-container">
      <form @submit.prevent="handleSearch" class="search-form">
        <input v-model="searchQuery" type="text" :placeholder="t.searchPlaceholder" class="search-input" />
        <button type="submit" :disabled="isLoading" class="search-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>{{ isLoading ? t.searching : t.search }}</span>
        </button>
      </form>
      <p class="powered-by">by <a href="https://enricoschintu.com" target="_blank" rel="noopener">Enrico Schintu</a></p>
    </div>

    <ChannelsPanel :show="showChannels" :channels="savedChannels" @close="showChannels = false"
      @select-channel="handleChannelSearch" @remove-channel="(id: string) => removeChannel(id)" />

    <SavedVideosPanel :show="showSavedVideos" :videos="savedVideos" @close="showSavedVideos = false"
      @select-video="handleSelectSavedVideo" @remove-video="handleRemoveSavedVideo"
      @clear-all="handleClearAllSavedVideos" />

    <AppSettingsDrawer
      :show="showUserMenu"
      :available-locales="availableLocales"
      :current-locale="currentLocale"
      @close="showUserMenu = false"
      @open-preferences="showPreferencesModal = true"
      @set-locale="handleSetLocale"
      @import-youtube="handleStartYouTubeImport"
    />

    <div v-if="isLoading && videos.length === 0" class="loading-state">
      <div class="loader"></div>
      <p>{{ t.loadingVideos }}</p>
    </div>

    <div v-if="videos.length > 0" class="videos-container">
      <div class="highlights-title">
        <h2 v-if="!searchQuery" class="section-title">{{ t.recommendedVideos }}</h2>
        <button v-if="videos.length > 0" @click="loadRecommendedVideos" class="refresh-btn" :disabled="isLoading"
          :title="t.refreshRecommended">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          <span>{{ t.refreshRecommended }}</span>
        </button>
      </div>
      <div class="videos-grid">
        <VideoCard v-for="(video, index) in videos" :key="video.videoId" :video="video" :index="index"
          :is-channel-saved="video.channelId ? isChannelSaved(video.channelId) : false"
          :is-video-saved="isVideoSaved(video.videoId)"
          :is-in-playlist="getVideoPlaylists(video.videoId).length > 0"
          @play="handlePlayVideo" @toggle-channel="toggleChannelSave"
          @toggle-save-video="toggleSaveVideo" @add-to-playlist="handleAddToPlaylist" />
      </div>
      <div v-if="isLoadingMore" class="loading-more">
        <div class="loader-small"></div>
        <p>{{ t.loadingMore }}</p>
      </div>
    </div>

    <div v-if="!isLoading && videos.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      <h2>{{ t.startExploring }}</h2>
      <p>{{ t.startExploringDesc }}</p>
      <button v-if="!hasPreferences" class="setup-interests-btn" @click="showPreferencesModal = true">
        {{ t.setInterests }}
      </button>
    </div>

    <VideoPlayer :video="selectedVideo" :is-minimized="isMinimized"
      :playlist="activePlaylistVideos" :start-time="pendingStartTime"
      @close="handleCloseVideo" @share="handleShare" @share-bookmark="handleShareBookmark"
      @minimize="handleMinimize" @maximize="handleMaximize"
      @play-next="handlePlayNext" @play-previous="handlePlayPrevious" />

    <PreferencesModal :show="showPreferencesModal" :current-interests="userPreferences.interests"
      :has-preferences="hasPreferences" @close="showPreferencesModal = false" @save="handleSavePreferences" />

    <ShareToast :show="showShareToast" />

    <LanguagePickerModal v-if="!isLocaleSet" @done="() => {}" />

    <BookmarksPanel :show="showBookmarksPanel" :bookmarks="bookmarks"
      @close="showBookmarksPanel = false" @select-bookmark="handleSelectBookmark"
      @delete-bookmark="handleDeleteBookmark" @share-bookmark="handleShareBookmarkFromPanel"
      @clear-all="handleClearAllBookmarks" />

    <PlaylistsPanel :show="showPlaylistsPanel" :playlists="playlists"
      @close="showPlaylistsPanel = false" @play-video="handlePlaylistPlayVideo"
      @delete-playlist="handleDeletePlaylist" @remove-video="removeVideoFromPlaylist"
      @move-video="moveVideoInPlaylist" @share-playlist="handleSharePlaylist" />

    <AddToPlaylistModal :show="showAddToPlaylist" :video="selectedVideoForPlaylist" :playlists="playlists"
      :video-playlists="selectedVideoForPlaylist ? getVideoPlaylists(selectedVideoForPlaylist.videoId) : []"
      @close="showAddToPlaylist = false" @toggle="handleTogglePlaylist" @create="handleCreatePlaylist" />

    <ImportPlaylistModal :playlist="pendingImportPlaylist"
      @save="handleImportPlaylistSave" @watch-only="handleImportPlaylistWatch" />

    <ImportYouTubeModal
      :show="showImportModal"
      :step="importStep"
      :error="importError"
      :result="importResult"
      @confirm="handleConfirmImport"
      @close="handleCloseImport"
      @retry="handleRetryImport"
    />

    <ConfirmModal />
    <AlertModal />
    <UpdateToast />

    <footer>
      <p class="footer-disclaimer">{{ t.disclaimer }}</p>
      <p class="footer-copy">&copy; {{ new Date().getFullYear() }} <a href="https://enricoschintu.com">Enrico Schintu</a>. {{ t.allRightsReserved }}</p>
    </footer>
  </div>
</template>

<style scoped src="./App.css"></style>
