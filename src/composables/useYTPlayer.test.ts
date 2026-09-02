import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useYTPlayer } from './useYTPlayer';

const setPlaybackRate = vi.fn();

interface PlayerConfig {
  events: { onReady: (event: { target: unknown }) => void };
}

let playerConfig: PlayerConfig;

const fakePlayer = {
  destroy: () => {},
  getCurrentTime: () => 0,
  seekTo: () => {},
  setPlaybackRate
};

beforeEach(() => {
  setPlaybackRate.mockClear();
  window.YT = {
    Player: vi.fn(function (this: unknown, _el: unknown, config: PlayerConfig) {
      playerConfig = config;
      return fakePlayer;
    }) as unknown as Window['YT']['Player'],
    PlayerState: {}
  };
});

const ready = () => playerConfig.events.onReady({ target: fakePlayer });

describe('useYTPlayer playback rate', () => {
  it('applies the requested speed once the player is ready', () => {
    const { createPlayer } = useYTPlayer(() => {}, () => true);
    createPlayer('abc', undefined, 1.5);
    ready();
    expect(setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  // Normal speed is what the player already does, so asking for it is pointless noise.
  it('leaves the player alone at normal speed', () => {
    const { createPlayer } = useYTPlayer(() => {}, () => true);
    createPlayer('abc', undefined, 1);
    ready();
    expect(setPlaybackRate).not.toHaveBeenCalled();
  });

  it('leaves the player alone when no speed is given', () => {
    const { createPlayer } = useYTPlayer(() => {}, () => true);
    createPlayer('abc');
    ready();
    expect(setPlaybackRate).not.toHaveBeenCalled();
  });
});
