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

const visibleSegments = computed(() => filterSegments(props.segments, query.value));

/** Compares the start instant rather than the index, because search changes positions. */
const activeStart = computed(() => {
  const index = findActiveIndex(props.segments, props.currentTime);
  return index === -1 ? null : props.segments[index]!.start;
});

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

watch(activeStart, async () => {
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
        <input v-model="query" type="search" :placeholder="t.transcriptSearch" />
      </div>
      <button class="transcript-copy" @click="copy">
        {{ copied ? t.transcriptCopied : t.transcriptCopy }}
      </button>
    </div>

    <p v-if="statusMessage" class="no-data">{{ statusMessage }}</p>

    <div v-else ref="listEl" class="transcript-list" @scroll="onScroll">
      <button
        v-for="segment in visibleSegments"
        :key="segment.start"
        :class="['transcript-line', { active: segment.start === activeStart }]"
        @click="handleSeek(segment.start)"
      >
        <span class="transcript-time">{{ formatSeconds(segment.start) }}</span>
        <span class="transcript-text">{{ segment.text }}</span>
      </button>
      <p v-if="visibleSegments.length === 0" class="no-data">{{ t.transcriptNoMatches }}</p>
    </div>
  </div>
</template>

<style scoped src="./TranscriptPanel.css"></style>
