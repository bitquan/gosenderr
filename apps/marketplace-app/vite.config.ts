import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

const devPort = Number(process.env.VITE_PORT ?? process.env.PORT ?? 5173);

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
              id.includes('/src/pages/request-delivery/') ||
              id.includes('/src/pages/checkout/') ||
              id.includes('/src/pages/payment/') ||
              id.includes('/src/lib/navigation/')
            ) {
              return 'map-features'
            }
            return undefined
          }

          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom') || id.includes('/node_modules/react-router-dom')) {
            return 'vendor'
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
    port: devPort,
    strictPort: true
  }
})
