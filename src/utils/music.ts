import type { Video, VideoDetails } from '@/types';

/** What the radio needs to find similar songs. The artist is optional: without it the
 *  server resolves the canonical one from the track name alone. */
export interface TrackSeed {
  artist?: string;
  track: string;
}

const MUSIC_CATEGORY_ID = '10';

const TOPIC_CHANNEL = /^(.*?)\s*-\s*Topic$/;

/** ` - `, ` – ` or ` — `, non-greedy so only the first separator splits. */
const TITLE_SPLIT = /^(.+?)\s+[-–—]\s+(.+)$/;

/** Words that mark a bracketed block as packaging rather than part of the song name. */
const NOISE_WORDS = /\b(?:official|video|audio|lyrics?|visuali[sz]er|hd|4k|remaster(?:ed)?|live|clip\s+ufficiale|feat|ft)\b/i;

/** One `(...)` or `[...]` block with no nesting. */
const BRACKET_BLOCK = /[([][^()[\]]*[)\]]/g;

/** `feat. X` / `ft X` up to the next separator, so a trailing ` - Remix` survives. */
const FEAT_CREDIT = /\s*\b(?:feat|ft)\.?\s[^-–—|]*/i;

/** A trailing ` | Label`. */
const LABEL_SUFFIX = /\s*\|.*$/;

const cleanTrack = (raw: string): string =>
  raw
    .replace(BRACKET_BLOCK, block => (NOISE_WORDS.test(block) ? '' : block))
    .replace(FEAT_CREDIT, '')
    .replace(LABEL_SUFFIX, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reads "Artist - Title" out of a video, text only. A "<Artist> - Topic" channel is the
 * auto-generated YouTube Music upload and the most reliable signal, so it wins over the title.
 */
export const parseTrack = (video: Video): TrackSeed | null => {
  const topic = video.channel?.match(TOPIC_CHANNEL);
  const topicArtist = topic?.[1]?.trim();

  if (topicArtist) {
    const track = cleanTrack(video.title);
    return track ? { artist: topicArtist, track } : null;
  }

  const split = video.title.match(TITLE_SPLIT);
  if (!split) return null;

  const artist = split[1]!.trim();
  const track = cleanTrack(split[2]!);

  return artist && track ? { artist, track } : null;
};

/**
 * The seed to start a radio from, or null when the video is not a song we can name.
 * Falls back to an artist-less seed for videos YouTube tags as music but whose title
 * carries no separator to split on.
 */
export const musicSeed = (video: Video | null, details: VideoDetails | null): TrackSeed | null => {
  if (!video) return null;

  const parsed = parseTrack(video);
  if (parsed) return parsed;

  if (details?.categoryId !== MUSIC_CATEGORY_ID) return null;

  const track = cleanTrack(video.title);
  return track ? { track } : null;
};
