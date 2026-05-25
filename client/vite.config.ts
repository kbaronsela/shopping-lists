import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/shopping-lists/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'רשימות קניות',
        short_name: 'קניות',
        description: 'ניהול רשימות קניות חכם',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/shopping-lists/',
        lang: 'he',
        dir: 'rtl',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
