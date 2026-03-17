import { onUnmounted } from 'vue';
import { MOBILE_BREAKPOINT } from '@/utils/constants';

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, config: Record<string, unknown>) => YTPlayer;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export const useYTPlayer = (onVideoEnd: () => void, getHasVideo: () => boolean) => {
  let ytPlayer: YTPlayer | null = null;

  const loadYTApi = (): Promise<void> => {
    if (window.YT?.Player) return Promise.resolve();
    return new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
  };

  const safeDestroyPlayer = () => {
    if (!ytPlayer) return;
    try { ytPlayer.destroy(); } catch { /* player already disposed */ }
    ytPlayer = null;
  };

  const createPlayer = (videoId: string, startSeconds?: number) => {
    safeDestroyPlayer();
    const playerVars: Record<string, unknown> = { autoplay: 1, modestbranding: 1, rel: 0, enablejsapi: 1 };
    if (startSeconds && startSeconds > 0) playerVars.start = Math.floor(startSeconds);
    ytPlayer = new window.YT.Player('yt-player', {
      videoId,
      width: '100%',
      height: '100%',
      host: 'https://www.youtube-nocookie.com',
      playerVars,
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === 0) onVideoEnd();
        },
      },
    } as Record<string, unknown>);
  };

  const destroyPlayer = () => safeDestroyPlayer();

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT || 'ontouchstart' in window;

  const handleOrientationChange = () => {
    if (!getHasVideo() || !isMobile()) return;
    const isLandscape = screen.orientation?.type?.startsWith('landscape')
      ?? window.innerWidth > window.innerHeight;
    const iframe = document.querySelector('#yt-player, .player-video iframe') as HTMLElement | null;
    if (!iframe) return;
    if (isLandscape && !document.fullscreenElement) {
      iframe.requestFullscreen?.().catch(() => {});
    } else if (!isLandscape && document.fullscreenElement && document.fullscreenElement !== document.documentElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const orientationTarget: EventTarget = (screen.orientation as EventTarget | null) ?? window;
  const orientationEventName = screen.orientation ? 'change' : 'resize';
  orientationTarget.addEventListener(orientationEventName, handleOrientationChange);

  onUnmounted(() => {
    destroyPlayer();
    orientationTarget.removeEventListener(orientationEventName, handleOrientationChange);
  });

  const getCurrentTime = (): number => {
    if (!ytPlayer) return 0;
    try { return ytPlayer.getCurrentTime(); } catch { return 0; }
  };

  const seekTo = (seconds: number): void => {
    if (!ytPlayer) return;
    try { ytPlayer.seekTo(seconds, true); } catch { /* ignore */ }
  };

  return { loadYTApi, createPlayer, destroyPlayer, getCurrentTime, seekTo };
};
