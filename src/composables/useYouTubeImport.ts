import { ref } from 'vue';
import type { Video } from '@/types';
import { POPUP_CHECK_INTERVAL_MS } from '@/utils/constants';

interface ImportedChannel {
  name: string;
  id: string;
}

interface ImportedPlaylist {
  name: string;
  videos: Video[];
}

export interface ImportResult {
  subscriptions: ImportedChannel[];
  playlists: ImportedPlaylist[];
}

export type ImportStep = 'idle' | 'authenticating' | 'importing' | 'done' | 'error';

const API_BASE = import.meta.env.VITE_API_PROXY_URL as string || 'http://localhost:8787';

export function useYouTubeImport() {
  const step = ref<ImportStep>('idle');
  const error = ref<string | null>(null);
  const result = ref<ImportResult | null>(null);

  const startImport = (): Promise<ImportResult> => {
    return new Promise((resolve, reject) => {
      step.value = 'authenticating';
      error.value = null;
      result.value = null;

      const popup = window.open(
        `${API_BASE}/auth/login?origin=${encodeURIComponent(window.location.origin)}`,
        'youtube-auth',
        'width=500,height=600,scrollbars=yes'
      );

      if (!popup) {
        step.value = 'error';
        error.value = 'popup_blocked';
        reject(new Error('Popup blocked'));
        return;
      }

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'youtube-oauth') {
          cleanup();
          const accessToken = event.data.accessToken as string;
          step.value = 'importing';

          try {
            const res = await fetch(`${API_BASE}/youtube/import`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) throw new Error(`Import failed: ${res.status}`);

            const data = await res.json() as ImportResult;
            result.value = data;
            step.value = 'done';
            resolve(data);
          } catch (err) {
            step.value = 'error';
            error.value = err instanceof Error ? err.message : 'Import failed';
            reject(err);
          }
        } else if (event.data?.type === 'youtube-oauth-error') {
          cleanup();
          step.value = 'error';
          error.value = event.data.error;
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (step.value === 'authenticating') {
            cleanup();
            step.value = 'idle';
          }
        }
      }, POPUP_CHECK_INTERVAL_MS);
    });
  };

  const reset = () => {
    step.value = 'idle';
    error.value = null;
    result.value = null;
  };

  return { step, error, result, startImport, reset };
}
