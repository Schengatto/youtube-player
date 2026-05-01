/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      base: '/',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Tube-Too Player',
        short_name: 'Tube-Too',
        description: 'Search and watch YouTube videos',
        theme_color: '#8b5cf6',
        background_color: '#0f0f0f',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.workers\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'proxy-apis',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 600 // 10 minutes
              }
            }
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 2592000 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  // @ts-expect-error - vitest types are not fully compatible with Vite's defineConfig in this version
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})
