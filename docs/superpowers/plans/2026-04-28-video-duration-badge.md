# Video Duration Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display video duration as a badge on each VideoCard thumbnail (bottom-right), for trending, search, and channel video sources.

**Architecture:** The Cloudflare Worker enriches all `Video` objects with `duration` (ISO 8601 string) before returning them to the frontend. Trending adds `contentDetails` to an existing `/videos` call for free; search and channel videos get a batch `videos?part=contentDetails` call after their primary fetch. The frontend formats and renders the badge.

**Tech Stack:** TypeScript, Cloudflare Workers, Vue 3 + `<script setup>`, Vite, Vitest (to be installed)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add Vitest devDependency + test script |
| `vite.config.ts` | Modify | Add Vitest config block |
| `src/types/index.ts` | Modify | Add `duration?: string` to `Video` |
| `worker/src/types.ts` | Modify | Add `duration?: string` to `Video` |
| `worker/src/youtube-api.ts` | Modify | `fetchDurations` helper + enrich all 3 endpoints |
| `src/utils/duration.ts` | Create | `formatDuration(iso: string): string` |
| `src/utils/duration.test.ts` | Create | Unit tests for `formatDuration` |
| `src/components/VideoCard.vue` | Modify | Add `.duration-badge` span |
| `src/components/VideoCard.css` | Modify | Add `.duration-badge` styles |

---

### Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest @vue/test-utils happy-dom
```

- [ ] **Step 2: Add test script to package.json**

Open `package.json` and add `"test": "vitest run"` to the `scripts` block:

```json
"scripts": {
  "dev": "vite",
  "dev:worker": "cd worker && npx wrangler dev",
  "dev:all": "run-p dev dev:worker",
  "build": "run-p type-check \"build-only {@}\" --",
  "preview": "vite preview",
  "build-only": "vite build",
  "type-check": "vue-tsc --build",
  "test": "vitest run",
  "lint": "run-s lint:*",
  "lint:oxlint": "oxlint . --fix",
  "lint:eslint": "eslint . --fix --cache"
}
```

- [ ] **Step 3: Read current vite.config.ts**

Read `vite.config.ts` to see the current content before modifying.

- [ ] **Step 4: Add Vitest config to vite.config.ts**

Add the `test` block to the existing Vite config. The file should end up looking like this (preserve all existing content, only add the `test` property and the `/// <reference types="vitest" />` triple-slash directive at the top):

```ts
/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// ... any other existing imports

export default defineConfig({
  // ... all existing config properties ...
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Verify config works**

```bash
pnpm test
```

Expected: "No test files found" (or similar) — just confirm Vitest runs without error.

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts pnpm-lock.yaml
git commit -m "chore: add Vitest test setup"
```

---

### Task 2: Add duration field to Video types

**Files:**
- Modify: `src/types/index.ts`
- Modify: `worker/src/types.ts`

- [ ] **Step 1: Add field to frontend types**

In `src/types/index.ts`, update the `Video` interface:

```ts
export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  duration?: string;
}
```

- [ ] **Step 2: Add field to worker types**

In `worker/src/types.ts`, update the `Video` interface:

```ts
export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  duration?: string;
}
```

- [ ] **Step 3: Verify type-check passes**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts worker/src/types.ts
git commit -m "feat: add duration field to Video type"
```

---

### Task 3: Create formatDuration utility with tests

**Files:**
- Create: `src/utils/duration.ts`
- Create: `src/utils/duration.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/duration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('formats hours, minutes, seconds', () => {
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03');
  });

  it('formats minutes and seconds without hours', () => {
    expect(formatDuration('PT5M30S')).toBe('5:30');
  });

  it('formats seconds only', () => {
    expect(formatDuration('PT45S')).toBe('0:45');
  });

  it('formats hours only', () => {
    expect(formatDuration('PT1H')).toBe('1:00:00');
  });

  it('formats hours and minutes without seconds', () => {
    expect(formatDuration('PT1H30M')).toBe('1:30:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration('PT3M5S')).toBe('3:05');
  });

  it('returns empty string for empty input', () => {
    expect(formatDuration('')).toBe('');
  });

  it('returns empty string for malformed input', () => {
    expect(formatDuration('invalid')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — "Cannot find module './duration'"

- [ ] **Step 3: Implement formatDuration**

Create `src/utils/duration.ts`:

```ts
export function formatDuration(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';

  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);

  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/duration.ts src/utils/duration.test.ts
git commit -m "feat: add formatDuration utility"
```

---

### Task 4: Enrich Worker — trending endpoint

**Files:**
- Modify: `worker/src/youtube-api.ts`

- [ ] **Step 1: Add contentDetails to YTVideoItem interface**

In `worker/src/youtube-api.ts`, update the `YTVideoItem` interface to include `contentDetails`:

```ts
interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    description: string;
    thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    publishedAt: string;
    liveBroadcastContent?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration: string;
  };
}
```

- [ ] **Step 2: Update mapVideoItem to include duration**

Replace the existing `mapVideoItem` function:

```ts
function mapVideoItem(item: YTVideoItem): Video {
  return {
    title: decodeHtmlEntities(item.snippet.title),
    videoId: item.id,
    thumbnail: selectThumbnail(item.snippet.thumbnails),
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
    duration: item.contentDetails?.duration,
  };
}
```

- [ ] **Step 3: Add contentDetails to getTrending part parameter**

Replace the existing `getTrending` function:

```ts
export async function getTrending(apiKey: string, regionCode: string, maxResults: number): Promise<SearchResult> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    chart: 'mostPopular',
    regionCode,
    maxResults: String(maxResults),
  });

  const res = await ytFetch(`/videos?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTVideoItem[] };

  const videos = (data.items || []).map(mapVideoItem);
  return { videos };
}
```

- [ ] **Step 4: Verify worker type-check**

```bash
cd worker && npx tsc --noEmit && cd ..
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add worker/src/youtube-api.ts
git commit -m "feat: include duration in trending videos"
```

---

### Task 5: Enrich Worker — search and channel endpoints

**Files:**
- Modify: `worker/src/youtube-api.ts`

- [ ] **Step 1: Add fetchDurations helper**

In `worker/src/youtube-api.ts`, add this function after the existing interface definitions and before the first `export` function:

```ts
async function fetchDurations(apiKey: string, videoIds: string[]): Promise<Map<string, string>> {
  if (videoIds.length === 0) return new Map();

  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds.join(','),
  });

  const res = await ytFetch(`/videos?${params}`, apiKey);
  if (!res.ok) return new Map();

  const data = await res.json() as { items?: Array<{ id: string; contentDetails?: { duration: string } }> };

  const map = new Map<string, string>();
  for (const item of data.items || []) {
    if (item.contentDetails?.duration) {
      map.set(item.id, item.contentDetails.duration);
    }
  }
  return map;
}
```

- [ ] **Step 2: Enrich searchVideos with duration**

Replace the existing `searchVideos` export function:

```ts
export async function searchVideos(apiKey: string, query: string, maxResults: number, pageToken?: string): Promise<SearchResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    videoEmbeddable: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await ytFetch(`/search?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTSearchItem[]; nextPageToken?: string };

  const videos = (data.items || [])
    .filter(item => item.id.videoId && item.snippet.liveBroadcastContent !== 'live')
    .map(mapSearchItem);

  const durations = await fetchDurations(apiKey, videos.map(v => v.videoId));
  for (const video of videos) {
    video.duration = durations.get(video.videoId);
  }

  return { videos, nextPageToken: data.nextPageToken };
}
```

- [ ] **Step 3: Enrich searchByChannel with duration**

Replace the existing `searchByChannel` export function:

```ts
export async function searchByChannel(apiKey: string, channelId: string, maxResults: number, pageToken?: string): Promise<SearchResult> {
  const uploadsPlaylistId = deriveUploadsPlaylistId(channelId);

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await ytFetch(`/playlistItems?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTPlaylistItem[]; nextPageToken?: string };

  const videos = (data.items || [])
    .filter(item => item.snippet.resourceId.kind === 'youtube#video' && item.snippet.title !== PRIVATE_VIDEO_TITLE && item.snippet.title !== DELETED_VIDEO_TITLE)
    .map(mapPlaylistItem);

  const durations = await fetchDurations(apiKey, videos.map(v => v.videoId));
  for (const video of videos) {
    video.duration = durations.get(video.videoId);
  }

  return { videos, nextPageToken: data.nextPageToken };
}
```

- [ ] **Step 4: Verify worker type-check**

```bash
cd worker && npx tsc --noEmit && cd ..
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add worker/src/youtube-api.ts
git commit -m "feat: add duration enrichment to search and channel endpoints"
```

---

### Task 6: Add duration badge to VideoCard

**Files:**
- Modify: `src/components/VideoCard.vue`
- Modify: `src/components/VideoCard.css`

- [ ] **Step 1: Import formatDuration in VideoCard.vue**

In the `<script setup>` block of `src/components/VideoCard.vue`, add the import:

```ts
import { formatDuration } from '@/utils/duration';
```

The full script block should look like:

```ts
import type { Video } from '@/types';
import { formatRelativeTime } from '@/utils/date';
import { normalizeText } from "@/utils/string";
import { useI18n } from '@/composables/useI18n';
import { formatDuration } from '@/utils/duration';

const { t } = useI18n();
// ... rest unchanged
```

- [ ] **Step 2: Add duration badge to template**

Inside `.video-thumbnail` div, after the `save-video-btn` button and before the closing `</div>`, add:

```html
<span v-if="video.duration" class="duration-badge">
  {{ formatDuration(video.duration) }}
</span>
```

The `.video-thumbnail` block should end like this:

```html
    <div class="video-thumbnail">
      <img :src="video.thumbnail" :alt="video.title" />
      <div class="play-overlay">
        <div class="play-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
      </div>
      <button @click.stop="emit('addToPlaylist', video)" class="playlist-video-btn" :class="{ active: isInPlaylist }"
        :title="t.addToPlaylist">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
      <button @click.stop="emit('toggleSaveVideo', video)" class="save-video-btn" :class="{ saved: isVideoSaved }"
        :title="isVideoSaved ? t.removeFromSaved : t.saveForLater">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          :fill="isVideoSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
        </svg>
      </button>
      <span v-if="video.duration" class="duration-badge">
        {{ formatDuration(video.duration) }}
      </span>
    </div>
```

- [ ] **Step 3: Add duration-badge styles to VideoCard.css**

Append to `src/components/VideoCard.css`:

```css
.duration-badge {
  position: absolute;
  bottom: 0.4rem;
  right: 0.4rem;
  background: var(--black-85);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2;
}
```

- [ ] **Step 4: Verify build and type-check**

```bash
pnpm type-check && pnpm build-only
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/VideoCard.vue src/components/VideoCard.css
git commit -m "feat: show duration badge on video card thumbnails"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `duration?: string` added to both `Video` types (Task 2)
- [x] `fetchDurations` batch helper for search + channel (Task 5)
- [x] Trending uses `contentDetails` part directly (Task 4)
- [x] `formatDuration` utility with full test suite (Task 3)
- [x] Duration badge in VideoCard with correct position (Task 6)
- [x] `.duration-badge` CSS (Task 6)
- [x] Vitest set up (Task 1)

**Placeholder scan:** No TBDs, no "similar to Task N", all steps have code.

**Type consistency:**
- `duration?: string` is consistent across `Video` in types.ts, worker types.ts, mapVideoItem, fetchDurations, and VideoCard template.
- `formatDuration` is named identically in duration.ts, duration.test.ts, and VideoCard.vue import.
