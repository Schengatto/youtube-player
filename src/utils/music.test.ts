import { describe, it, expect } from 'vitest';
import type { Video, VideoDetails } from '@/types';
import { parseTrack, musicSeed } from './music';

const video = (title: string, channel = 'Some Channel'): Video => ({
  title,
  videoId: 'abc',
  thumbnail: '',
  channel,
});

const details = (categoryId?: string): VideoDetails => ({
  description: '',
  viewCount: '0',
  likeCount: '0',
  commentCount: '0',
  categoryId,
});

describe('parseTrack', () => {
  it('reads the artist from a "- Topic" channel', () => {
    expect(parseTrack(video('Bohemian Rhapsody', 'Queen - Topic')))
      .toEqual({ artist: 'Queen', track: 'Bohemian Rhapsody' });
  });

  it('prefers the "- Topic" channel over splitting the title', () => {
    expect(parseTrack(video('Interlude - Reprise', 'Radiohead - Topic')))
      .toEqual({ artist: 'Radiohead', track: 'Interlude - Reprise' });
  });

  it('splits the title on a hyphen', () => {
    expect(parseTrack(video('Daft Punk - Around the World')))
      .toEqual({ artist: 'Daft Punk', track: 'Around the World' });
  });

  it('splits the title on an en dash', () => {
    expect(parseTrack(video('Daft Punk – Around the World')))
      .toEqual({ artist: 'Daft Punk', track: 'Around the World' });
  });

  it('splits the title on an em dash', () => {
    expect(parseTrack(video('Daft Punk — Around the World')))
      .toEqual({ artist: 'Daft Punk', track: 'Around the World' });
  });

  it('splits on the first separator only', () => {
    expect(parseTrack(video('Artist - Song - Live Version')))
      .toEqual({ artist: 'Artist', track: 'Song - Live Version' });
  });

  it('strips a parenthesised noise block', () => {
    expect(parseTrack(video('Adele - Hello (Official Video)')))
      .toEqual({ artist: 'Adele', track: 'Hello' });
  });

  it('strips a bracketed noise block', () => {
    expect(parseTrack(video('Adele - Hello [Lyrics]')))
      .toEqual({ artist: 'Adele', track: 'Hello' });
  });

  it('keeps a parenthesised block that is part of the title', () => {
    expect(parseTrack(video('Prince - Kiss (Extended Mix)')))
      .toEqual({ artist: 'Prince', track: 'Kiss (Extended Mix)' });
  });

  it('strips "feat." and what follows', () => {
    expect(parseTrack(video('Eminem - Stan feat. Dido')))
      .toEqual({ artist: 'Eminem', track: 'Stan' });
  });

  it('strips "ft." and what follows', () => {
    expect(parseTrack(video('Eminem - Stan ft. Dido')))
      .toEqual({ artist: 'Eminem', track: 'Stan' });
  });

  it('strips a parenthesised feat. credit', () => {
    expect(parseTrack(video('Eminem - Stan (feat. Dido)')))
      .toEqual({ artist: 'Eminem', track: 'Stan' });
  });

  it('strips a trailing label suffix', () => {
    expect(parseTrack(video('Adele - Hello | XL Recordings')))
      .toEqual({ artist: 'Adele', track: 'Hello' });
  });

  it('cleans the track of a "- Topic" upload too', () => {
    expect(parseTrack(video('Hello (Official Audio)', 'Adele - Topic')))
      .toEqual({ artist: 'Adele', track: 'Hello' });
  });

  it('returns null when the title has no separator', () => {
    expect(parseTrack(video('How to bake sourdough'))).toBeNull();
  });

  it('returns null when the track is empty after cleaning', () => {
    expect(parseTrack(video('Artist - (Official Video)'))).toBeNull();
  });

  it('returns null when the artist side is empty', () => {
    expect(parseTrack(video(' - Around the World'))).toBeNull();
  });

  it('returns null when the "- Topic" channel has no artist left', () => {
    expect(parseTrack(video('Hello', ' - Topic'))).toBeNull();
  });
});

describe('musicSeed', () => {
  it('returns the parsed seed when the title splits', () => {
    expect(musicSeed(video('Daft Punk - Around the World'), null))
      .toEqual({ artist: 'Daft Punk', track: 'Around the World' });
  });

  it('returns the parsed seed even when the category is not music', () => {
    expect(musicSeed(video('Daft Punk - Around the World'), details('22')))
      .toEqual({ artist: 'Daft Punk', track: 'Around the World' });
  });

  it('falls back to an artist-less seed on a music-category video', () => {
    expect(musicSeed(video('Blue Monday (Official Video)'), details('10')))
      .toEqual({ track: 'Blue Monday' });
  });

  it('returns null when the title does not split and the category is not music', () => {
    expect(musicSeed(video('How to bake sourdough'), details('22'))).toBeNull();
  });

  it('returns null when the title does not split and there are no details', () => {
    expect(musicSeed(video('How to bake sourdough'), null)).toBeNull();
  });

  it('returns null when a music-category title is empty after cleaning', () => {
    expect(musicSeed(video('(Official Video)'), details('10'))).toBeNull();
  });

  it('returns null when there is no video', () => {
    expect(musicSeed(null, details('10'))).toBeNull();
  });
});
