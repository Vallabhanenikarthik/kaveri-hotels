import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/properties': 'http://127.0.0.1:8000',
      '/rooms': 'http://127.0.0.1:8000',
      '/room-types': 'http://127.0.0.1:8000',
      '/bookings': 'http://127.0.0.1:8000',
      '/payments': 'http://127.0.0.1:8000',
      '/reviews': 'http://127.0.0.1:8000',
    },
  },
})
