// vite.config.js - Aggiungi questo al tuo file esistente
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
      registerType: 'autoUpdate',
      base: '/',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'LibreTube Player',
        short_name: 'LT Player',
        description: 'Search and watch YouTube videos',
        theme_color: '#3b82f6',
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
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-apis',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 86400 // 1 day
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
  ]
})
