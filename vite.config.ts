import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
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