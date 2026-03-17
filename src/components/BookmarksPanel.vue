<script setup lang="ts">
import { computed } from 'vue';
import type { Bookmark } from '@/types';
import { useBookmarks } from '@/composables/useBookmarks';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const { formatTimestamp } = useBookmarks();

interface Props {
  show: boolean;
  bookmarks: Bookmark[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  'select-bookmark': [bookmark: Bookmark];
  'delete-bookmark': [id: string];
  'share-bookmark': [bookmark: Bookmark];
  'clear-all': [];
}>();

interface BookmarkGroup {
  videoId: string;
  videoTitle: string;
  channel: string;
  thumbnail: string;
  bookmarks: Bookmark[];
}

const groupedBookmarks = computed<BookmarkGroup[]>(() => {
  const groups = new Map<string, BookmarkGroup>();
  for (const bm of props.bookmarks) {
    let group = groups.get(bm.videoId);
    if (!group) {
      group = {
        videoId: bm.videoId,
        videoTitle: bm.videoTitle,
        channel: bm.channel,
        thumbnail: bm.thumbnail,
        bookmarks: [],
      };
      groups.set(bm.videoId, group);
    }
    group.bookmarks.push(bm);
  }
  // Sort bookmarks within each group by timestamp
  for (const group of groups.values()) {
    group.bookmarks.sort((a, b) => a.timestamp - b.timestamp);
  }
  return Array.from(groups.values());
});
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="show" class="drawer-overlay" @click="emit('close')">
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <div class="drawer-title-section">
              <h2 class="drawer-title">{{ t.bookmarks }}</h2>
              <span class="bookmark-count">{{ bookmarks.length }}</span>
            </div>
            <div class="drawer-actions">
              <button v-if="bookmarks.length > 0" @click="emit('clear-all')" class="clear-all-btn" :title="t.clearAll">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>{{ t.clearAll }}</span>
              </button>
              <button @click="emit('close')" class="close-btn" :title="t.close">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="drawer-content">
            <p v-if="bookmarks.length === 0" class="empty-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                <line x1="12" y1="8" x2="12" y2="14"></line>
                <line x1="9" y1="11" x2="15" y2="11"></line>
              </svg>
              {{ t.noBookmarks }}<br />
              {{ t.noBookmarksDesc }}
            </p>

            <div v-else class="bookmark-groups">
              <div v-for="group in groupedBookmarks" :key="group.videoId" class="bookmark-group">
                <div class="bookmark-group-header">
                  <img :src="group.thumbnail" :alt="group.videoTitle" class="group-thumbnail" />
                  <div class="group-info">
                    <h3 class="group-title">{{ group.videoTitle }}</h3>
                    <p class="group-channel">{{ group.channel }}</p>
                  </div>
                </div>
                <div class="group-bookmarks">
                  <div v-for="bookmark in group.bookmarks" :key="bookmark.id" class="panel-bookmark-item"
                    @click="emit('select-bookmark', bookmark)">
                    <button class="panel-bookmark-timestamp" :title="t.goToTimestamp">
                      {{ formatTimestamp(bookmark.timestamp) }}
                    </button>
                    <span class="panel-bookmark-label">{{ bookmark.label }}</span>
                    <div class="panel-bookmark-actions" @click.stop>
                      <button class="panel-bookmark-action" @click="emit('share-bookmark', bookmark)" :title="t.shareBookmark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                      </button>
                      <button class="panel-bookmark-action danger" @click="emit('delete-bookmark', bookmark.id)" :title="t.deleteBookmark">
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
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./BookmarksPanel.css"></style>
