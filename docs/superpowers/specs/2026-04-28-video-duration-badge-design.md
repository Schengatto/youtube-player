# Video Duration Badge — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Goal

Display video duration in the bottom-right corner of each VideoCard thumbnail, matching the YouTube UI pattern. Duration must appear for all video sources: trending, search results, and channel videos.

## Data Layer (Worker)

### Type changes

Add `duration?: string` (ISO 8601, e.g. `"PT1H2M3S"`) to `Video` in both:
- `worker/src/types.ts`
- `src/types/index.ts`

### Worker enrichment strategy

**Shared helper** `fetchDurations(apiKey, ids: string[]): Promise<Map<string, string>>`
- Calls `/videos?part=contentDetails&id=id1,id2,...` (one batch call, max 50 IDs)
- Returns `Map<videoId, duration>`

**Trending** (`getTrending`):
- Add `contentDetails` to the `part` parameter: `part=snippet,contentDetails`
- Read `item.contentDetails.duration` directly in `mapVideoItem` — zero extra API calls

**Search** (`searchVideos`):
- After fetching search results, call `fetchDurations` with all returned `videoId`s
- Merge: set `video.duration = durationsMap.get(video.videoId)`

**Channel** (`searchByChannel`):
- Same pattern as search: call `fetchDurations` after `playlistItems` fetch, then merge

### Quota impact

- Trending: 0 extra units (just expanding `part`)
- Search: +1 unit per search call (vs 100 for the search itself — negligible)
- Channel: +1 unit per channel page load

## Frontend

### New utility: `src/utils/duration.ts`

`formatDuration(iso: string): string`

Parses ISO 8601 duration string:
- `PT1H2M3S` → `"1:02:03"`
- `PT5M30S` → `"5:30"`
- `PT45S` → `"0:45"`
- `PT1H` → `"1:00:00"`
- Empty / malformed → returns `""` (badge hidden)

### VideoCard.vue

Inside `.video-thumbnail`, after the existing buttons:
```html
<span v-if="video.duration" class="duration-badge">
  {{ formatDuration(video.duration) }}
</span>
```

### VideoCard.css

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

## Files to Create / Modify

| File | Action |
|------|--------|
| `worker/src/types.ts` | Add `duration?: string` to `Video` |
| `worker/src/youtube-api.ts` | Add `fetchDurations`, enrich all three endpoints |
| `src/types/index.ts` | Add `duration?: string` to `Video` |
| `src/utils/duration.ts` | New — `formatDuration` utility |
| `src/components/VideoCard.vue` | Add duration badge element |
| `src/components/VideoCard.css` | Add `.duration-badge` styles |

## Testing

- Unit test `formatDuration` for: full `H:MM:SS`, `M:SS`, `0:SS`, empty string, malformed input
- Manual: verify badge appears on trending, search, and channel video cards
