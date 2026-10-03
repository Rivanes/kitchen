import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/kitchen/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/kitchen-192.png', 'icons/kitchen-512.png'],
      manifest: {
        name: 'Kitchen',
        short_name: 'Kitchen',
        description: 'Personal kitchen inventory, recipes and shopping list.',
        theme_color: '#f7f7f2',
        background_color: '#f7f7f2',
        display: 'standalone',
        start_url: '/kitchen/',
        scope: '/kitchen/',
        icons: [
          {
            src: '/kitchen/icons/kitchen-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/kitchen/icons/kitchen-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/kitchen/icons/kitchen-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
