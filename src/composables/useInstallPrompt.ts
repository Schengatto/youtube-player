import { ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstallable = ref(false);
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
  isInstallable.value = true;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt.value = null;
  isInstallable.value = false;
});

export const useInstallPrompt = () => {
  const installApp = async () => {
    if (!deferredPrompt.value) return;
    await deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.value = null;
      isInstallable.value = false;
    }
  };

  return { isInstallable, installApp, isIOS };
};
