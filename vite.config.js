import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Mark these as external so Vite doesn't try to bundle them.
      // This allows the browser to resolve them via the importmap in index.html
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'lucide-react',
        '@google/genai',
        'firebase/app',
        'firebase/firestore'
      ]
    }
  }
});