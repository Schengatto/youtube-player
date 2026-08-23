import { ref, watch } from 'vue';
import type { SavedChannel, UserPreferences } from '@/types';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

const savedChannels = ref<SavedChannel[]>([]);
const userPreferences = ref<UserPreferences>({
  interests: [],
  language: 'it',
  autoplay: true
});

export const useSettings = () => {
  const loadChannels = (): void => {
    const channels = storage.get<SavedChannel[]>(STORAGE_KEYS.CHANNELS);
    if (Array.isArray(channels)) {
      savedChannels.value = channels;
    }
  };

  const saveChannel = (name: string, id: string): void => {
    if (!savedChannels.value.some(ch => ch.id === id)) {
      savedChannels.value.push({ name, id });
    }
  };

  const removeChannel = (id: string): void => {
    savedChannels.value = savedChannels.value.filter(ch => ch.id !== id);
  };

  const isChannelSaved = (id: string): boolean => {
    return savedChannels.value.some(ch => ch.id === id);
  };

  const loadPreferences = (): boolean => {
    const prefs = storage.get<UserPreferences>(STORAGE_KEYS.PREFERENCES);
    if (!prefs) return false;
    const autoplay = prefs.autoplay ?? true;
    if (prefs.interests && prefs.interests.length > 0) {
      userPreferences.value = { ...prefs, autoplay };
      return true;
    }
    userPreferences.value.autoplay = autoplay;
    return false;
  };

  const savePreferences = (interests: string[]): void => {
    userPreferences.value.interests = interests;
    storage.set(STORAGE_KEYS.PREFERENCES, userPreferences.value);
  };

  const setAutoplay = (enabled: boolean): void => {
    userPreferences.value.autoplay = enabled;
    storage.set(STORAGE_KEYS.PREFERENCES, userPreferences.value);
  };

  watch(savedChannels, (newChannels) => {
    storage.set(STORAGE_KEYS.CHANNELS, newChannels);
  }, { deep: true });

  return {
    savedChannels,
    userPreferences,
    loadChannels,
    saveChannel,
    removeChannel,
    isChannelSaved,
    loadPreferences,
    savePreferences,
    setAutoplay
  };
};
