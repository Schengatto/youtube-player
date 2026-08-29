<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Video, VideoDetails, VideoComment } from '@/types';
import { useYouTubeAPI } from '@/composables/useYouTubeAPI';
import { useYTPlayer } from '@/composables/useYTPlayer';
import { useBookmarks } from '@/composables/useBookmarks';
import { useI18n } from '@/composables/useI18n';
import { useSettings } from '@/composables/useSettings';
import { nextIn, previousIn } from '@/utils/queue';
import { formatRelativeTime } from '@/utils/date';
import { getChannelUrl, getChannelSubscribeUrl, buildVideoShareUrl } from '@/utils/youtube';
import { musicSeed, type TrackSeed } from '@/utils/music';

const { t } = useI18n();
const { addBookmark, removeBookmark, getVideoBookmarks, formatTimestamp } = useBookmarks();
const { userPreferences, isChannelSaved, saveChannel, removeChannel } = useSettings();

interface Props {
  video: Video | null;
  isMinimized?: boolean;
  queue?: Video[];
  startTime?: number | null;
  radioLoading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  share: [url: string];
  minimize: [];
  maximize: [];
  'play-next': [];
  'play-previous': [];
  'share-bookmark': [url: string];
  'radio-requested': [seed: TrackSeed];
}>();

const showShareMenu = ref(false);
const includeStartTime = ref(false);
const shareStartTime = ref(0);

/**
 * The time is frozen when the menu opens, not read when an entry is clicked:
 * the video keeps playing while the menu is up, so reading it later would share
 * a different point than the one the toggle names.
 */
function toggleShareMenu() {
  showShareMenu.value = !showShareMenu.value;
  if (!showShareMenu.value) return;
  shareStartTime.value = getCurrentTime();
  includeStartTime.value = false;
}

function shareUrl(type: 'youtube' | 'app') {
  if (!props.video) return;
  const url = buildVideoShareUrl(
    props.video.videoId,
    type,
    includeStartTime.value ? shareStartTime.value : null
  );
  showShareMenu.value = false;
  emit('share', url);
}

function toggleFollowChannel() {
  const channelId = props.video?.channelId;
  if (!channelId) return;
  if (isChannelSaved(channelId)) removeChannel(channelId);
  else saveChannel(props.video?.channel || channelId, channelId);
}

const queue = computed(() => props.queue ?? []);
const currentVideoId = computed(() => props.video?.videoId ?? null);
const currentIndex = computed(() => {
  const idx = queue.value.findIndex(v => v.videoId === currentVideoId.value);
  return idx >= 0 ? idx : 0;
});
const hasPrevious = computed(() => previousIn(queue.value, currentVideoId.value) !== null);
const hasNext = computed(() => nextIn(queue.value, currentVideoId.value) !== null);

const { loadYTApi, createPlayer, destroyPlayer, getCurrentTime, seekTo } = useYTPlayer(
  () => { if (userPreferences.value.autoplay && hasNext.value) emit('play-next'); },
  () => !!props.video
);

const details = ref<VideoDetails | null>(null);
const comments = ref<VideoComment[]>([]);
const commentsPageToken = ref<string | undefined>(undefined);
const isLoadingDetails = ref(false);
const isLoadingComments = ref(false);
const isLoadingMoreComments = ref(false);
const showDescription = ref(false);
const activeTab = ref<'comments' | 'bookmarks'>('comments');
const commentsError = ref(false);
const playerReady = ref(false);
const showBookmarkForm = ref(false);
const bookmarkLabel = ref('');
const bookmarkFeedback = ref(false);

const videoBookmarks = computed(() => {
  if (!props.video) return [];
  return getVideoBookmarks(props.video.videoId);
});

/** Non-null only for videos we can name as a song, which is what gates the radio button. */
const radioSeed = computed(() => musicSeed(props.video, details.value));

const requestRadio = () => {
  if (props.radioLoading) return;
  const seed = radioSeed.value;
  if (seed) emit('radio-requested', seed);
};

const handleAddBookmark = () => {
  if (!props.video) return;
  const time = getCurrentTime();
  const label = bookmarkLabel.value.trim() || `${t.value.bookmarkAtTime} ${formatTimestamp(time)}`;
  addBookmark(props.video, time, label);
  bookmarkLabel.value = '';
  showBookmarkForm.value = false;
  bookmarkFeedback.value = true;
  setTimeout(() => { bookmarkFeedback.value = false; }, 2000);
};

const handleSeekToBookmark = (seconds: number) => {
  seekTo(seconds);
};

const handleShareBookmark = (videoId: string, timestamp: number) => {
  emit('share-bookmark', buildVideoShareUrl(videoId, 'app', timestamp));
};

const handleDeleteBookmark = (id: string) => {
  removeBookmark(id);
};

watch(() => props.video, async (newVideo) => {
  details.value = null;
  comments.value = [];
  commentsPageToken.value = undefined;
  showDescription.value = false;
  activeTab.value = 'comments';
  commentsError.value = false;
  playerReady.value = false;
  showShareMenu.value = false;

  if (newVideo) {
    await loadYTApi();
    await nextTick();
    const startSec = props.startTime ?? undefined;
    createPlayer(newVideo.videoId, startSec);
    playerReady.value = true;

    const api = useYouTubeAPI();
    isLoadingDetails.value = true;
    isLoadingComments.value = true;

    const [detailsResult, commentsResult] = await Promise.all([
      api.getVideoDetails(newVideo.videoId).catch(() => null),
      api.getVideoComments(newVideo.videoId).catch(() => ({ comments: [], nextPageToken: undefined }))
    ]);

    details.value = detailsResult;
    isLoadingDetails.value = false;
    comments.value = commentsResult.comments;
    commentsPageToken.value = commentsResult.nextPageToken;
    commentsError.value = commentsResult.comments.length === 0 && !commentsResult.nextPageToken;
    isLoadingComments.value = false;
  } else {
    destroyPlayer();
  }
}, { immediate: true });

const loadMoreComments = async () => {
  if (!props.video || !commentsPageToken.value || isLoadingMoreComments.value) return;
  isLoadingMoreComments.value = true;
  const api = useYouTubeAPI();
  try {
    const result = await api.getVideoComments(props.video.videoId, 20, commentsPageToken.value);
    comments.value = [...comments.value, ...result.comments];
    commentsPageToken.value = result.nextPageToken;
  } catch { /* ignore */ } finally {
    isLoadingMoreComments.value = false;
  }
};

const formatCount = (count: string): string => {
  const n = parseInt(count, 10);
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};
</script>

<template>
  <Transition name="fade">
    <div v-if="video && !isMinimized" class="modal-overlay" @click="emit('close')"></div>
  </Transition>

  <div v-if="video" :class="['player-container', { minimized: isMinimized }]" @click.stop>
      <div class="player-header">
        <component :is="isMinimized ? 'h3' : 'h2'" class="player-title">{{ video.title }}</component>
        <div class="player-actions">
          <button v-if="!isMinimized" @click="emit('minimize')" class="action-btn" :title="t.minimize">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <div v-if="showShareMenu" class="share-menu-overlay" @click="showShareMenu = false"></div>
          <button v-if="!isMinimized && playerReady" @click="showBookmarkForm = !showBookmarkForm" class="action-btn" :title="t.addBookmark">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
          </button>
          <div v-if="!isMinimized" class="share-menu-wrapper">
            <button @click="toggleShareMenu" class="action-btn" :title="t.share" data-test="share-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
            <div v-if="showShareMenu" class="share-menu">
              <button class="share-menu-toggle" role="switch" :aria-checked="includeStartTime"
                @click="includeStartTime = !includeStartTime" data-test="share-start-toggle">
                <span>{{ t.shareStartAt }} {{ formatTimestamp(shareStartTime) }}</span>
                <span class="share-switch" :class="{ on: includeStartTime }"></span>
              </button>
              <button class="share-menu-item" @click="shareUrl('youtube')" data-test="share-youtube">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
                {{ t.shareYouTube }}
              </button>
              <button class="share-menu-item" @click="shareUrl('app')" data-test="share-app">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                {{ t.shareApp }}
              </button>
            </div>
          </div>
          <button v-if="isMinimized" @click="emit('maximize')" class="action-btn" :title="t.expand">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          <button @click="emit('close')" class="action-btn close-btn" :title="t.close">
            <svg xmlns="http://www.w3.org/2000/svg" :width="isMinimized ? 16 : 18" :height="isMinimized ? 16 : 18"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="showBookmarkForm && !isMinimized" class="bookmark-form-overlay" @click="showBookmarkForm = false"></div>
      </Transition>
      <div v-if="showBookmarkForm && !isMinimized" class="bookmark-form">
        <div class="bookmark-form-header">
          <span>{{ t.addBookmark }} - {{ formatTimestamp(getCurrentTime()) }}</span>
          <button @click="showBookmarkForm = false" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form @submit.prevent="handleAddBookmark" class="bookmark-form-body">
          <input v-model="bookmarkLabel" type="text" :placeholder="t.bookmarkLabelPlaceholder" class="bookmark-input" autofocus />
          <button type="submit" class="bookmark-submit-btn">{{ t.addBookmark }}</button>
        </form>
      </div>
      <Transition name="fade">
        <div v-if="bookmarkFeedback" class="bookmark-feedback">{{ t.bookmarkAdded }}</div>
      </Transition>

      <div class="player-content">
        <div class="player-left">
          <div class="player-video" :key="video.videoId">
            <div id="yt-player"></div>
          </div>

          <div v-if="!isMinimized" class="player-main">
          <div v-if="queue.length > 1" class="playlist-nav">
            <button @click="emit('play-previous')" :disabled="!hasPrevious" class="nav-btn" :title="t.previousVideo">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
              <span>{{ t.previousVideo }}</span>
            </button>
            <span class="nav-position">{{ currentIndex + 1 }} / {{ queue.length }}</span>
            <button @click="emit('play-next')" :disabled="!hasNext" class="nav-btn" :title="t.nextVideo">
              <span>{{ t.nextVideo }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
          </div>

          <div class="tab-content">
            <div v-if="isLoadingDetails" class="loading-inline">
              <div class="loader-small"></div>
              <span>{{ t.loadingDescription }}</span>
            </div>
            <div v-else-if="details" class="description-content">
              <div v-if="video.channel" class="channel-row">
                <a v-if="video.channelId" :href="getChannelUrl(video.channelId)" target="_blank" rel="noopener"
                  class="channel-name channel-link" :title="t.openChannelOnYouTube">{{ video.channel }}</a>
                <span v-else class="channel-name">{{ video.channel }}</span>

                <div v-if="video.channelId" class="channel-actions">
                  <button class="channel-action" :class="{ following: isChannelSaved(video.channelId) }"
                    @click="toggleFollowChannel">
                    {{ isChannelSaved(video.channelId) ? t.following : t.follow }}
                  </button>
                  <a :href="getChannelSubscribeUrl(video.channelId)" target="_blank" rel="noopener"
                    class="channel-action subscribe">{{ t.subscribeOnYouTube }}</a>
                </div>

                <button v-if="radioSeed" data-test="radio-btn" class="channel-action radio"
                  :disabled="radioLoading" @click="requestRadio">
                  {{ radioLoading ? t.loadingSimilar : t.similarTracks }}
                </button>
              </div>
              <p v-if="video.publishedAt" class="publish-date">{{ t.publishedAgo }} {{ formatRelativeTime(video.publishedAt) }}</p>
              <div class="description-text" :class="{ expanded: showDescription }">
                <pre>{{ details.description || t.noDescription }}</pre>
              </div>
              <button v-if="details.description && details.description.length > 200"
                @click="showDescription = !showDescription" class="show-more-btn">
                {{ showDescription ? t.showLess : t.showMore }}
              </button>
            </div>
            <p v-else class="no-data">{{ t.descriptionNotAvailable }}</p>
          </div>
          </div>
        </div>

        <div v-if="!isMinimized" class="player-details">
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'comments' }]" @click="activeTab = 'comments'">
              {{ t.comments }}
              <span v-if="details" class="tab-count">{{ formatCount(details.commentCount) }}</span>
            </button>
            <button :class="['tab', { active: activeTab === 'bookmarks' }]" @click="activeTab = 'bookmarks'">
              {{ t.bookmarks }}
              <span v-if="videoBookmarks.length > 0" class="tab-count">{{ videoBookmarks.length }}</span>
            </button>
          </div>

          <div v-if="activeTab === 'comments'" class="tab-content">
            <div v-if="isLoadingComments" class="loading-inline">
              <div class="loader-small"></div>
              <span>{{ t.loadingComments }}</span>
            </div>
            <div v-else-if="commentsError" class="no-data">{{ t.commentsDisabled }}</div>
            <div v-else-if="comments.length > 0" class="comments-list">
              <div v-for="(comment, index) in comments" :key="index" class="comment-item">
                <img :src="comment.authorAvatar" :alt="comment.authorName" class="comment-avatar" referrerpolicy="no-referrer" />
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-author">{{ comment.authorName }}</span>
                    <span class="comment-date">{{ formatRelativeTime(comment.publishedAt) }}</span>
                  </div>
                  <p class="comment-text" v-html="comment.text"></p>
                  <div v-if="comment.likeCount > 0" class="comment-likes">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"></path>
                      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    {{ comment.likeCount }}
                  </div>
                </div>
              </div>
              <button v-if="commentsPageToken" @click="loadMoreComments" :disabled="isLoadingMoreComments"
                class="load-more-btn">
                <div v-if="isLoadingMoreComments" class="loader-small"></div>
                <span>{{ isLoadingMoreComments ? t.loading : t.loadMoreComments }}</span>
              </button>
            </div>
            <p v-else class="no-data">{{ t.noCommentsAvailable }}</p>
          </div>

          <div v-if="activeTab === 'bookmarks'" class="tab-content">
            <div v-if="videoBookmarks.length > 0" class="bookmarks-list">
              <div v-for="bookmark in videoBookmarks" :key="bookmark.id" class="bookmark-item">
                <button class="bookmark-timestamp" @click="handleSeekToBookmark(bookmark.timestamp)" :title="t.goToTimestamp">
                  {{ formatTimestamp(bookmark.timestamp) }}
                </button>
                <span class="bookmark-label">{{ bookmark.label }}</span>
                <div class="bookmark-actions">
                  <button class="bookmark-action-btn" @click="handleShareBookmark(bookmark.videoId, bookmark.timestamp)" :title="t.shareBookmark">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                  <button class="bookmark-action-btn danger" @click="handleDeleteBookmark(bookmark.id)" :title="t.deleteBookmark">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="no-data">{{ t.noBookmarks }}</p>
          </div>
        </div>
      </div>

    </div>
</template>

<style scoped src="./VideoPlayer.css"></style>
