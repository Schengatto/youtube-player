import { describe, it, expect } from 'vitest';
import type { Video } from '@/types';
import { nextIn, previousIn } from './queue';

const video = (videoId: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel'
});

const queue = [video('a'), video('b'), video('c')];

describe('nextIn', () => {
  it('returns the following video', () => {
    expect(nextIn(queue, 'a')).toEqual(video('b'));
    expect(nextIn(queue, 'b')).toEqual(video('c'));
  });

  it('returns null on the last video', () => {
    expect(nextIn(queue, 'c')).toBeNull();
  });

  it('returns null when the queue is empty', () => {
    expect(nextIn([], 'a')).toBeNull();
  });

  it('returns null when the queue holds a single video', () => {
    expect(nextIn([video('a')], 'a')).toBeNull();
  });

  it('returns null when the current video is not in the queue', () => {
    expect(nextIn(queue, 'z')).toBeNull();
  });

  it('returns null when there is no current video', () => {
    expect(nextIn(queue, null)).toBeNull();
  });
});

describe('previousIn', () => {
  it('returns the preceding video', () => {
    expect(previousIn(queue, 'b')).toEqual(video('a'));
    expect(previousIn(queue, 'c')).toEqual(video('b'));
  });

  it('returns null on the first video', () => {
    expect(previousIn(queue, 'a')).toBeNull();
  });

  it('returns null when the queue is empty', () => {
    expect(previousIn([], 'a')).toBeNull();
  });

  it('returns null when the queue holds a single video', () => {
    expect(previousIn([video('a')], 'a')).toBeNull();
  });

  it('returns null when the current video is not in the queue', () => {
    expect(previousIn(queue, 'z')).toBeNull();
  });

  it('returns null when there is no current video', () => {
    expect(previousIn(queue, null)).toBeNull();
  });
});
