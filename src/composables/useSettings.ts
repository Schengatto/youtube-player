import { ref, watch } from 'vue';
import type { SavedChannel, UserPreferences } from '@/types';
import { storage } from '@/utils/storage';
import { encrypt, decrypt } from '@/utils/crypto';
import { STORAGE_KEYS } from '@/utils/constants';

const apiKey = ref('');
const savedChannels = ref<SavedChannel[]>([]);
const userPreferences = ref<UserPreferences>({
  interests: [],
  language: 'it'
});

export const useSettings = () => {
  const loadApiKey = (): boolean => {
    const encrypted = storage.get<string>(STORAGE_KEYS.API_KEY);
    if (encrypted) {
      apiKey.value = decrypt(encrypted);
      return true;
    }
    return false;
  };

  const saveApiKey = (key: string): void => {
    const encrypted = encrypt(key);
    storage.set(STORAGE_KEYS.API_KEY, encrypted);
    apiKey.value = key;
  };

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
    if (prefs && prefs.interests && prefs.interests.length > 0) {
      userPreferences.value = prefs;
      return true;
    }
    return false;
  };

  const savePreferences = (interests: string[]): void => {
    userPreferences.value.interests = interests;
    storage.set(STORAGE_KEYS.PREFERENCES, userPreferences.value);
  };

  watch(savedChannels, (newChannels) => {
    storage.set(STORAGE_KEYS.CHANNELS, newChannels);
  }, { deep: true });

  return {
    apiKey,
    savedChannels,
    userPreferences,
    loadApiKey,
    saveApiKey,
    loadChannels,
    saveChannel,
    removeChannel,
    isChannelSaved,
    loadPreferences,
    savePreferences
  };
};
