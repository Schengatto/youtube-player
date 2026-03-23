import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

export function usePostHog() {
  if (!POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  });
}
