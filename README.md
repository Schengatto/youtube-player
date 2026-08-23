# Tube-Too Player

A personalized YouTube player built as a Progressive Web App. Search videos, save channels, create playlists, bookmark moments, and get recommendations based on your interests — all from a clean, distraction-free interface.

**Live:** [tube-too.netlify.app](https://tube-too.netlify.app)

## Features

### Personalized Recommendations

Choose your interests on first launch and get a curated video feed. Change them anytime from settings.

### Search & Browse

- Full-text video search
- Browse channel videos directly
- Paste any YouTube URL or video ID to play instantly
- Infinite scroll pagination

### Channels

Save your favorite channels for quick access. Browse their latest uploads without leaving the app.

### Playlists

Create custom playlists, add/remove/reorder videos, and play them in sequence. Share playlists via URL — recipients can import them with one click.

### Bookmarks

Bookmark specific moments in a video (with timestamp). Jump back to any bookmark later, or share it as a link with `?v=ID&t=seconds`.

### Saved Videos

Save individual videos for later viewing. Manage your library from the saved videos panel.

### YouTube Import

Import your YouTube subscriptions, playlists, and liked videos via Google OAuth. One-click import, no credentials stored — the token is used once and discarded.

### Video Sharing

Share videos and bookmarks via native share (mobile) or clipboard copy. Shared links include rich previews (Open Graph + Twitter Card) for Telegram, WhatsApp, Slack, Discord, and other platforms.

### Minimized Player

Minimize the video player to keep browsing while watching. The player stays visible in a corner of the screen.

### Multi-Language

Available in 9 languages: Italian, English, French, German, Spanish, Portuguese, Chinese, Japanese, Hindi. Language is selected on first launch and can be changed in settings.

### PWA & Offline

Installable as a native app on mobile and desktop. Auto-update notifications when a new version is deployed.

### Background Playback (Android)

Audio keeps playing with the screen off only in **Firefox for Android** with the
[Video Background Play Fix](https://addons.mozilla.org/firefox/addon/video-background-play-fix/)
add-on installed. Install the add-on, open the app in Firefox, start a video, and lock the screen.

This is a browser-side setting, not an app feature — there is nothing to enable in Tube-Too.

**What does not work, and why:** the YouTube embedded player pauses itself when the page becomes
hidden (Page Visibility API), and the media session is torn down a moment later. In Chrome for
Android the media notification appears for about a second after locking the screen and then
disappears. The app cannot override this: the video runs inside a cross-origin YouTube iframe, so
the `<video>` element is not reachable, and the Media Session API cannot grant background playback
on its own — it only decorates a notification for media the system already allows to play. The
Firefox add-on works because it neutralises the visibility signal the embed reacts to.

On iOS there is no equivalent: Safari suspends iframe media on screen lock. Official background
playback is a YouTube Premium feature.

## Tech Stack

| Layer | Technology |
| ----- | --------- |
| Frontend | Vue 3 + Composition API (`<script setup>`) |
| Language | TypeScript 5.9 (strict) |
| Build | Vite + vue-tsc |
| PWA | vite-plugin-pwa (Workbox) |
| Backend | Cloudflare Worker (API proxy) |
| Hosting | Netlify (frontend) + Cloudflare (worker) |
| Lint | ESLint + oxlint |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm

### Install

```sh
pnpm install
```

### Development

```sh
# Frontend only
pnpm dev

# Frontend + Worker (requires wrangler setup)
pnpm dev:all
```

### Build

```sh
pnpm build
```

### Lint

```sh
pnpm lint
```

## Project Structure

```txt
src/
├── components/       # Vue components (18 total)
├── composables/      # Stateful composables (singleton pattern)
├── i18n/             # Translations (9 locales)
├── types/            # TypeScript type definitions
├── utils/            # Pure utility functions
├── assets/css/       # Component-level CSS
├── App.vue           # Root component (orchestrator)
└── main.ts           # Entry point

worker/
├── src/
│   ├── index.ts      # Routing, caching, rate limiting, CORS
│   ├── youtube-api.ts    # YouTube Data API v3 calls
│   ├── youtube-oauth.ts  # Google OAuth + YouTube import
│   └── types.ts      # Shared types
└── wrangler.toml     # Cloudflare Worker config
```

## Architecture

The app follows a **single-page architecture** with no router — all view state is managed by the `useAppState` composable.

**State management** uses singleton composables: module-level `ref()` values are shared across all consumers and auto-persisted to localStorage via `watch`.

**Backend proxy**: the frontend never calls YouTube directly. All API requests go through a Cloudflare Worker that handles authentication, caching (10min TTL via CF Cache API), rate limiting (60 req/min/IP), and CORS.

## Worker Setup

The worker requires the following secrets (set via `wrangler secret put`):

- `YOUTUBE_API_KEY` — YouTube Data API v3 key
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (for YouTube import)
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret

Configuration in `wrangler.toml`:

- `ALLOWED_ORIGIN` — Frontend URL for CORS
- `CACHE_TTL` — Cache duration in seconds
- `RATE_LIMIT_*` — Rate limiting config

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

See [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) for reporting issues.
