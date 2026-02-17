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
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (
              id.includes('/src/pages/navigation/') ||
              id.includes('/src/pages/jobs/[jobId]/') ||
              id.includes('/src/components/v2/MapboxMap') ||
              id.includes('/src/lib/navigation/')
            ) {
              return 'map-features'
            }
            return undefined
          }

          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom') || id.includes('/node_modules/react-router-dom')) {
            return 'seller'
          }

          if (id.includes('/node_modules/firebase/functions/')) return 'firebase-functions'
          if (id.includes('/node_modules/firebase/')) return 'firebase-core'

          if (id.includes('/node_modules/mapbox-gl/')) return 'mapbox-core'
          if (id.includes('/node_modules/@mapbox/')) return 'mapbox-sdk'

          if (id.includes('/node_modules/@stripe/stripe-js') || id.includes('/node_modules/@stripe/react-stripe-js')) {
            return 'stripe'
          }

          return undefined
        }
      }
    }
  },
  server: {
    port: 5174,
    strictPort: true
  }
})
