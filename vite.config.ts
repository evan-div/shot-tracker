/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  build: {
    rolldownOptions: {
      output: {
        // Firestore is most of the bundle and changes only when the SDK is
        // upgraded. Keeping it in its own chunk means shipping an app tweak
        // mid-event doesn't make phones re-download it.
        manualChunks(id: string) {
          if (id.includes('@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase'
          }
        },
      },
    },
  },
})
