import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gosenderr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@gosenderr/ui': path.resolve(__dirname, '../../packages/ui/src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'seller': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'maps': ['mapbox-gl']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: false
  }
})
