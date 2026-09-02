import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS } from '@/utils/constants';

const loadSettings = async () => {
  vi.resetModules();
  const { useSettings } = await import('./useSettings');
  return useSettings();
};

describe('useSettings autoplay', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to enabled when nothing is stored', async () => {
    const { userPreferences, loadPreferences } = await loadSettings();
    loadPreferences();
    expect(userPreferences.value.autoplay).toBe(true);
  });

  it('defaults to enabled for preferences saved before the setting existed', async () => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify({ interests: ['music'], language: 'it' }));
    const { userPreferences, loadPreferences } = await loadSettings();
    expect(loadPreferences()).toBe(true);
    expect(userPreferences.value.autoplay).toBe(true);
  });

  it('restores a disabled setting even without interests', async () => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify({ interests: [], language: 'it', autoplay: false }));
    const { userPreferences, loadPreferences } = await loadSettings();
    expect(loadPreferences()).toBe(false);
    expect(userPreferences.value.autoplay).toBe(false);
  });

  it('persists the setting when toggled', async () => {
    const { userPreferences, setAutoplay } = await loadSettings();
    setAutoplay(false);
    expect(userPreferences.value.autoplay).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) ?? '{}');
    expect(stored.autoplay).toBe(false);
  });

  it('keeps the setting when interests are saved afterwards', async () => {
    const { setAutoplay, savePreferences } = await loadSettings();
    setAutoplay(false);
    savePreferences(['gaming']);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) ?? '{}');
    expect(stored.autoplay).toBe(false);
    expect(stored.interests).toEqual(['gaming']);
  });
});

describe('useSettings playback rate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to normal speed when nothing is stored', async () => {
    const { userPreferences, loadPreferences } = await loadSettings();
    loadPreferences();
    expect(userPreferences.value.playbackRate).toBe(1);
  });

  it('defaults to normal speed for preferences saved before the setting existed', async () => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify({ interests: ['music'], language: 'it' }));
    const { userPreferences, loadPreferences } = await loadSettings();
    expect(loadPreferences()).toBe(true);
    expect(userPreferences.value.playbackRate).toBe(1);
  });

  it('restores a stored speed even without interests', async () => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify({ interests: [], language: 'it', playbackRate: 1.5 }));
    const { userPreferences, loadPreferences } = await loadSettings();
    expect(loadPreferences()).toBe(false);
    expect(userPreferences.value.playbackRate).toBe(1.5);
  });

  it('persists the speed when it changes', async () => {
    const { userPreferences, setPlaybackRate } = await loadSettings();
    setPlaybackRate(2);
    expect(userPreferences.value.playbackRate).toBe(2);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) ?? '{}');
    expect(stored.playbackRate).toBe(2);
  });

  it('keeps the speed when interests are saved afterwards', async () => {
    const { setPlaybackRate, savePreferences } = await loadSettings();
    setPlaybackRate(1.25);
    savePreferences(['gaming']);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) ?? '{}');
    expect(stored.playbackRate).toBe(1.25);
    expect(stored.interests).toEqual(['gaming']);
  });
});
