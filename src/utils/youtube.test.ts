import { describe, it, expect, beforeEach } from 'vitest';
import { parseYouTubeUrl, extractVideoIdFromUrl, extractVideoIdFromSharedText, getChannelUrl, getChannelSubscribeUrl, buildVideoShareUrl } from './youtube';

describe('parseYouTubeUrl', () => {
  it('reads the v param from a watch url', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a youtu.be url', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a youtu.be url with tracking params', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc123')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a shorts url', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from a live url', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('reads the id from an embed url', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a youtube url without a video', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/@somechannel')).toBeNull();
  });

  it('returns null for a non-youtube url', () => {
    expect(parseYouTubeUrl('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for a malformed url', () => {
    expect(parseYouTubeUrl('not a url')).toBeNull();
  });
});

describe('extractVideoIdFromUrl', () => {
  it('accepts a bare video id', () => {
    expect(extractVideoIdFromUrl('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('trims surrounding whitespace', () => {
    expect(extractVideoIdFromUrl('  https://youtu.be/dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for an 11-char string with invalid characters', () => {
    expect(extractVideoIdFromUrl('hello world')).toBeNull();
  });
});

describe('extractVideoIdFromSharedText', () => {
  it('extracts the id from a bare shared url', () => {
    expect(extractVideoIdFromSharedText('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from the YouTube Android share text', () => {
    const text = 'Guarda "Never Gonna Give You Up" su YouTube https://youtu.be/dQw4w9WgXcQ?si=xYz';
    expect(extractVideoIdFromSharedText(text)).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id when the url is followed by punctuation', () => {
    expect(extractVideoIdFromSharedText('Bel video: https://youtu.be/dQw4w9WgXcQ.')).toBe('dQw4w9WgXcQ');
  });

  it('extracts a shorts id shared as text', () => {
    const text = '#shorts https://www.youtube.com/shorts/dQw4w9WgXcQ';
    expect(extractVideoIdFromSharedText(text)).toBe('dQw4w9WgXcQ');
  });

  it('skips non-youtube urls and finds the youtube one', () => {
    const text = 'https://example.com/foo poi https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoIdFromSharedText(text)).toBe('dQw4w9WgXcQ');
  });

  it('returns null when the text has no youtube url', () => {
    expect(extractVideoIdFromSharedText('Ciao, guarda https://example.com/foo')).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(extractVideoIdFromSharedText('')).toBeNull();
  });
});

describe('getChannelUrl', () => {
  it('builds the channel page url', () => {
    expect(getChannelUrl('UCuAXFkgsw1L7xaCfnd5JJOw'))
      .toBe('https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw');
  });
});

describe('getChannelSubscribeUrl', () => {
  it('adds the subscribe confirmation param', () => {
    expect(getChannelSubscribeUrl('UCuAXFkgsw1L7xaCfnd5JJOw'))
      .toBe('https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw?sub_confirmation=1');
  });
});

describe('buildVideoShareUrl', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('builds a plain youtube watch url', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'youtube'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('appends the youtube start time with the seconds suffix', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'youtube', 134))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=134s');
  });

  it('builds a plain app url on the current origin', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'app'))
      .toBe(`${window.location.origin}/?v=dQw4w9WgXcQ`);
  });

  it('appends the app start time as bare seconds', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'app', 134))
      .toBe(`${window.location.origin}/?v=dQw4w9WgXcQ&t=134`);
  });

  it('keeps the app url on the current path', () => {
    window.history.replaceState({}, '', '/player');
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'app'))
      .toBe(`${window.location.origin}/player?v=dQw4w9WgXcQ`);
  });

  it('truncates the fractional seconds the player reports', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'youtube', 134.87))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=134s');
  });

  it('omits the start time at the very beginning of the video', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'youtube', 0))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('omits the start time when it rounds down to zero', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'youtube', 0.4))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('omits the start time when there is none', () => {
    expect(buildVideoShareUrl('dQw4w9WgXcQ', 'app', null))
      .toBe(`${window.location.origin}/?v=dQw4w9WgXcQ`);
  });
});
