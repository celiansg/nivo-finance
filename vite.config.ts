import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory'))
              return 'charts';
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore'))
              return 'firebase-firestore';
            if (id.includes('@firebase/auth') || id.includes('firebase/auth'))
              return 'firebase-auth';
            if (id.includes('@firebase/analytics') || id.includes('firebase/analytics'))
              return 'firebase-analytics';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase-core';
            if (id.includes('framer-motion') || id.includes('motion-')) return 'motion';
            if (id.includes('lucide')) return 'icons';
            return 'vendor';
          }
        },
      },
    },
  },
});
