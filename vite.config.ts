import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [tailwindcss()],
  base: '/Event-Campus-Website/', // GitHub Pages: '/Event-Campus-Website/'
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eventDetail: resolve(__dirname, 'page/Event-Detail.html'),
        exploreEvent: resolve(__dirname, 'page/Explore-Event.html'),
        joinUs: resolve(__dirname, 'page/Join-Us.html'),
        myEvent: resolve(__dirname, 'page/My-Event.html'),
        notifications: resolve(__dirname, 'page/Notifications.html'),
      },
    },
  },
})