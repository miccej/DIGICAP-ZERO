import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Use './' for Capacitor/Android builds, and '/' for Vercel/Web builds.
  // We can trigger this by setting an environment variable during build.
  // Vercel automatically sets VERCEL=1
  const isWeb = process.env.VITE_PLATFORM === 'web' || process.env.VERCEL === '1';
  const base = isWeb ? '/' : './';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    }
  };
});
