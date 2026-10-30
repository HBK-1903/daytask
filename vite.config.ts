import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      workbox: { importScripts: ['/push-worker.js'] },
      manifest: {
        name: 'Violet Focus',
        short_name: 'Violet Focus',
        description: 'Planla, odaklan ve ilerle.',
        theme_color: '#f1eaff',
        background_color: '#f7f3ff',
        display: 'standalone',
        start_url: '/',
        lang: 'tr',
        shortcuts: [
          { name: 'Görev ekle', short_name: 'Görev ekle', description: 'Yeni bir görevi planla', url: '/?action=add-task', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Takvimi aç', short_name: 'Takvim', description: 'Haftalık planını görüntüle', url: '/?action=calendar', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Odak başlat', short_name: 'Odak', description: 'Serbest odak zamanlayıcısını başlat', url: '/?action=start-focus', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/violet-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ]
      }
    })
  ],
})
