import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3500',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3500',
        ws: true
      },
      '/apps': {
        target: 'http://localhost:3500',
        changeOrigin: true
      },
      '/iphone': {
        target: 'http://localhost:3500',
        changeOrigin: true
      },
      '/descargas': {
        target: 'http://localhost:3500',
        changeOrigin: true
      },
      '/apk': {
        target: 'http://localhost:3500',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
