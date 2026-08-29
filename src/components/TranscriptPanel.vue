<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { findActiveIndex, filterSegments, toPlainText, type TranscriptSegment, type TranscriptStatus } from '@/utils/transcript';
import { formatSeconds } from '@/utils/duration';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  segments: TranscriptSegment[];
  currentTime: number;
  status: TranscriptStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  seek: [seconds: number];
}>();

const query = ref('');
const copied = ref(false);
const listEl = ref<HTMLElement | null>(null);
/** Stops following the current line as soon as the user scrolls by themselves. */
const following = ref(true);
let autoScrolling = false;

/**
 * Pairs every visible cue with its position in the *full* list. Two cues can legitimately share
 * a `start`, so keying rows on the start instant collided in Vue's diff and lit up both rows at
 * once; the position in the full list is unique and, unlike the position in the filtered list,
 * does not move when the user types in the search box.
 */
const visibleRows = computed(() => {
  const visible = filterSegments(props.segments, query.value);
  let from = 0;
  return visible.map(segment => {
    const index = props.segments.indexOf(segment, from);
    from = index + 1;
    return { segment, index };
  });
});

const activeIndex = computed(() => findActiveIndex(props.segments, props.currentTime));

const statusMessage = computed(() => {
  switch (props.status) {
    case 'loading': return t.value.transcriptLoading;
    case 'pending': return t.value.transcriptPending;
    case 'empty': return t.value.transcriptEmpty;
    case 'quota': return t.value.transcriptQuota;
    case 'error': return t.value.transcriptError;
    default: return '';
  }
});

const onScroll = () => {
  if (autoScrolling) return;
  following.value = false;
};

const handleSeek = (seconds: number) => {
  following.value = true;
  emit('seek', seconds);
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(toPlainText(props.segments));
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // A browser that refuses clipboard access must not break the panel.
  }
};

watch(activeIndex, async () => {
  if (!following.value || props.status !== 'ok') return;
  await nextTick();
  const row = listEl.value?.querySelector('.transcript-line.active');
  if (!row) return;
  autoScrolling = true;
  row.scrollIntoView({ block: 'nearest' });
  setTimeout(() => { autoScrolling = false; }, 150);
});
</script>

<template>
  <div class="transcript-panel">
    <div v-if="status === 'ok'" class="transcript-toolbar">
      <div class="transcript-search">
        <input v-model="query" type="search" :placeholder="t.transcriptSearch" :aria-label="t.transcriptSearch" />
      </div>
      <button class="transcript-copy" @click="copy">
        {{ copied ? t.transcriptCopied : t.transcriptCopy }}
      </button>
    </div>

    <!-- A live region: without it a screen-reader user is never told the transcript arrived,
         is still being prepared, or failed. -->
    <p v-if="statusMessage" class="no-data" role="status" aria-live="polite">{{ statusMessage }}</p>

    <div v-else ref="listEl" class="transcript-list" @scroll="onScroll">
      <button
        v-for="row in visibleRows"
        :key="row.index"
        :class="['transcript-line', { active: row.index === activeIndex }]"
        :aria-current="row.index === activeIndex ? 'true' : undefined"
        @click="handleSeek(row.segment.start)"
      >
        <span class="transcript-time">{{ formatSeconds(row.segment.start) }}</span>
        <span class="transcript-text">{{ row.segment.text }}</span>
      </button>
      <p v-if="visibleRows.length === 0" class="no-data" role="status" aria-live="polite">{{ t.transcriptNoMatches }}</p>
    </div>
  </div>
</template>

<style scoped src="./TranscriptPanel.css"></style>
