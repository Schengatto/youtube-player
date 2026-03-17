import { ref, computed } from 'vue';
import { translations, LOCALE_NAMES, LOCALE_REGION, type Locale } from '@/i18n/translations';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';

const storedLocale = storage.get<Locale>(STORAGE_KEYS.LOCALE);
const currentLocale = ref<Locale>(storedLocale ?? 'en');
const isLocaleSet = ref(storedLocale !== null);

const availableLocales = Object.entries(LOCALE_NAMES).map(([code, name]) => ({
  code: code as Locale,
  name
}));

const updateSeo = (locale: Locale) => {
  const tr = translations[locale];
  const region = LOCALE_REGION[locale];
  const ogLocale = `${locale}_${region}`;

  document.documentElement.lang = locale;
  document.title = tr.pageTitle;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector(selector) as HTMLMetaElement | null;
    if (el) el.content = content;
  };

  setMeta('meta[name="description"]', tr.pageDescription);
  setMeta('meta[property="og:title"]', tr.pageTitle);
  setMeta('meta[property="og:description"]', tr.pageDescription);
  setMeta('meta[property="og:locale"]', ogLocale);
};

updateSeo(currentLocale.value);

export const useI18n = () => {
  const t = computed(() => translations[currentLocale.value]);

  const regionCode = computed(() => LOCALE_REGION[currentLocale.value]);

  const setLocale = (locale: Locale) => {
    currentLocale.value = locale;
    storage.set(STORAGE_KEYS.LOCALE, locale);
    isLocaleSet.value = true;
    updateSeo(locale);
  };

  return {
    t,
    currentLocale,
    regionCode,
    isLocaleSet,
    availableLocales,
    setLocale
  };
};
