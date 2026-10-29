import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Violet Focus',
        short_name: 'Violet Focus',
        description: 'Planla, odaklan ve ilerle.',
        theme_color: '#f1eaff',
        background_color: '#f7f3ff',
        display: 'standalone',
        start_url: '/',
        lang: 'tr',
        icons: [{ src: '/violet-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      }
    })
  ],
})
