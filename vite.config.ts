import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [tailwindcss()],
  base: '/', // GitHub Pages: '/Event-Campus-Website/'
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        eventDetail: resolve(import.meta.dirname, 'page/Event-Detail.html'),
        exploreEvent: resolve(import.meta.dirname, 'page/Explore-Event.html'),
        joinUs: resolve(import.meta.dirname, 'page/Join-Us.html'),
        myEvent: resolve(import.meta.dirname, 'page/My-Event.html'),
        notifications: resolve(import.meta.dirname, 'page/Notifications.html'),
        favorites: resolve(import.meta.dirname, 'page/Favorites.html'),
        profile: resolve(import.meta.dirname, 'page/Profile.html'),
      },
    },
  },
})