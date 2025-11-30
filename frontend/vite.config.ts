/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // AI libraries chunk
          ai: ['@google/generative-ai', 'openai'],
          // Supabase chunk
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size limit to 800kb
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
