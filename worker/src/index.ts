import type { Env } from './types';
import * as youtube from './youtube-api';

import { handleLogin, handleCallback, handleImport } from './youtube-oauth';
import { escapeHtml } from './html';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, max: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  const isAllowed = origin === allowedOrigin
    || origin.startsWith('http://localhost:')
    || origin.startsWith('http://127.0.0.1:');

  if (!isAllowed) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function errorResponse(message: string, status: number, cors: Record<string, string>): Response {
  return json({ error: message }, status, cors);
}

function getCacheKey(url: URL): string {
  const params = new URLSearchParams(url.searchParams);
  params.delete('_');
  return `${url.pathname}?${params.toString()}`;
}

const BOT_USER_AGENTS = ['TelegramBot', 'Twitterbot', 'facebookexternalhit', 'WhatsApp', 'Slackbot', 'LinkedInBot', 'Discordbot', 'Googlebot'];

function isBot(userAgent: string): boolean {
  return BOT_USER_AGENTS.some(bot => userAgent.includes(bot));
}

async function handleShare(request: Request, videoId: string, env: Env): Promise<Response> {
  const appUrl = `${env.ALLOWED_ORIGIN}/?v=${videoId}`;
  const ua = request.headers.get('User-Agent') || '';

  if (!isBot(ua)) {
    return Response.redirect(appUrl, 302);
  }

  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  let title = 'Watch on Tube-Too';
  let description = 'Watch this video on Tube-Too';

  try {
    const meta = await youtube.getVideoMeta(env.YOUTUBE_API_KEY, videoId);
    if (meta) {
      title = meta.title;
      if (meta.description) description = meta.description.slice(0, 200);
    }
  } catch { /* use defaults */ }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="video.other" />
<meta property="og:url" content="${appUrl}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${thumbnail}" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="720" />
<meta property="og:video" content="${embedUrl}" />
<meta property="og:video:secure_url" content="${embedUrl}" />
<meta property="og:video:type" content="text/html" />
<meta property="og:video:width" content="1280" />
<meta property="og:video:height" content="720" />
<meta name="twitter:card" content="player" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:image" content="${thumbnail}" />
<meta name="twitter:player" content="${embedUrl}" />
<meta name="twitter:player:width" content="1280" />
<meta name="twitter:player:height" content="720" />
<meta http-equiv="refresh" content="0;url=${appUrl}" />
</head><body><p>Redirecting to <a href="${appUrl}">Tube-Too</a>...</p></body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

const AES_GCM_IV_LENGTH = 12;

async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret.padEnd(32, '\0').slice(0, 32));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptToken(token: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const encoded = new TextEncoder().encode(token);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decryptToken(encrypted: string, secret: string): Promise<string | null> {
  try {
    const key = await deriveKey(secret);
    const b64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv = combined.slice(0, AES_GCM_IV_LENGTH);
    const ciphertext = combined.slice(AES_GCM_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function encryptResponseTokens(data: unknown, secret: string): Promise<unknown> {
  if (!data || typeof data !== 'object') return data;
  const obj = data as Record<string, unknown>;
  if (typeof obj.nextPageToken === 'string') {
    obj.nextPageToken = await encryptToken(obj.nextPageToken, secret);
  }
  return obj;
}

type Handler = (url: URL, env: Env) => Promise<unknown>;

const routes: Record<string, Handler> = {
  '/search': async (url, env) => {
    const query = url.searchParams.get('q');
    if (!query) throw { status: 400, message: 'Missing q parameter' };
    const maxResults = parseInt(url.searchParams.get('maxResults') || '12');
    const rawPage = url.searchParams.get('page') || undefined;
    const pageToken = rawPage ? (await decryptToken(rawPage, env.TOKEN_SECRET)) ?? rawPage : undefined;

    return youtube.searchVideos(env.YOUTUBE_API_KEY, query, maxResults, pageToken);
  },

  '/trending': async (url, env) => {
    const region = url.searchParams.get('region') || 'IT';
    const maxResults = parseInt(url.searchParams.get('maxResults') || '12');

    return youtube.getTrending(env.YOUTUBE_API_KEY, region, maxResults);
  },
};

function matchRoute(pathname: string): { handler: string; params: Record<string, string> } | null {
  // /channel/:id/videos
  let match = pathname.match(/^\/channel\/([^/]+)\/videos$/);
  if (match) return { handler: 'channelVideos', params: { id: match[1]! } };

  // /video/:id/comments
  match = pathname.match(/^\/video\/([^/]+)\/comments$/);
  if (match) return { handler: 'videoComments', params: { id: match[1]! } };

  // /video/:id
  match = pathname.match(/^\/video\/([^/]+)$/);
  if (match) return { handler: 'videoDetails', params: { id: match[1]! } };

  return null;
}

const dynamicHandlers: Record<string, (url: URL, env: Env, params: Record<string, string>) => Promise<unknown>> = {
  channelVideos: async (url, env, params) => {
    const maxResults = parseInt(url.searchParams.get('maxResults') || '50');
    const rawPage = url.searchParams.get('page') || undefined;
    const pageToken = rawPage ? (await decryptToken(rawPage, env.TOKEN_SECRET)) ?? rawPage : undefined;

    return youtube.searchByChannel(env.YOUTUBE_API_KEY, params.id!, maxResults, pageToken);
  },

  videoDetails: async (_url, env, params) => {
    return youtube.getVideoDetails(env.YOUTUBE_API_KEY, params.id!);
  },

  videoComments: async (url, env, params) => {
    const maxResults = parseInt(url.searchParams.get('maxResults') || '20');
    const rawPage = url.searchParams.get('page') || undefined;
    const pageToken = rawPage ? (await decryptToken(rawPage, env.TOKEN_SECRET)) ?? rawPage : undefined;

    return youtube.getVideoComments(env.YOUTUBE_API_KEY, params.id!, maxResults, pageToken);
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'GET') {
      return errorResponse('Method not allowed', 405, cors);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateMax = parseInt(env.RATE_LIMIT_MAX || '60');
    const rateWindow = parseInt(env.RATE_LIMIT_WINDOW || '60');
    if (!checkRateLimit(clientIp, rateMax, rateWindow)) {
      return errorResponse('Rate limit exceeded', 429, cors);
    }

    if (url.pathname === '/health') {
      return json({ status: 'ok' }, 200, cors);
    }

    const shareMatch = url.pathname.match(/^\/share\/([a-zA-Z0-9_-]+)$/);
    if (shareMatch) {
      return handleShare(request, shareMatch[1]!, env);
    }

    if (url.pathname === '/auth/login') {
      return handleLogin(url, env);
    }
    if (url.pathname === '/auth/callback') {
      return handleCallback(url, env);
    }

    if (url.pathname === '/youtube/import') {
      try {
        const data = await handleImport(request);
        return json(data, 200, cors);
      } catch (err: unknown) {
        const typed = err as { status?: number; message?: string };
        return errorResponse(typed.message || 'Import failed', typed.status || 500, cors);
      }
    }

    const cacheTtl = parseInt(env.CACHE_TTL || '600');
    const cacheKey = new Request(`https://cache${getCacheKey(url)}`, request);
    const cache = caches.default;
    let cached = await cache.match(cacheKey);
    if (cached) {
      const newHeaders = new Headers(cached.headers);
      Object.entries(cors).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(cached.body, { status: cached.status, headers: newHeaders });
    }

    try {
      let data: unknown;

      const staticHandler = routes[url.pathname];
      if (staticHandler) {
        data = await staticHandler(url, env);
      } else {
        const matched = matchRoute(url.pathname);
        if (!matched) {
          return errorResponse('Not found', 404, cors);
        }
        const dynHandler = dynamicHandlers[matched.handler];
        if (!dynHandler) {
          return errorResponse('Not found', 404, cors);
        }
        data = await dynHandler(url, env, matched.params);
      }

      if (env.TOKEN_SECRET) {
        data = await encryptResponseTokens(data, env.TOKEN_SECRET);
      }

      const response = json(data, 200, {
        ...cors,
        'Cache-Control': `public, max-age=${cacheTtl}`,
      });

      const cacheResponse = response.clone();
      await cache.put(cacheKey, cacheResponse);

      return response;
    } catch (err: unknown) {
      const typed = err as { status?: number; message?: string };
      if (typed.status) {
        return errorResponse(typed.message || 'Bad request', typed.status, cors);
      }
      console.error('Worker error:', err);
      return errorResponse('Internal server error', 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
