import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_API_URL is set in Netlify/Vercel dashboard to your Render backend URL
// e.g. https://relay-api.onrender.com
// In dev it falls back to localhost:4000 via the proxy below.
const PROD_API = process.env.VITE_API_URL || '';

export default defineConfig({
  plugins: [react()],

  // Inject VITE_API_URL into the client bundle
  define: {
    __API_URL__: JSON.stringify(PROD_API),
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
    // Dev-only proxy — in production the frontend talks directly to Render
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react: ['react', 'react-dom'],
          xyflow: ['@xyflow/react'],
          socketio: ['socket.io-client'],
        },
      },
    },
  },
});
