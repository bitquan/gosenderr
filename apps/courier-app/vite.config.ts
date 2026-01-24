import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          'maps': ['mapbox-gl']
        }
      }
    }
  },
  server: {
    port: 5174,
    strictPort: true
  }
})
