import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  // Use './' for Capacitor/Android builds, and '/' for Vercel/Web builds.
  // We can trigger this by setting an environment variable during build.
  // Vercel automatically sets VERCEL=1, and development server is always command === 'serve'
  const isWeb = process.env.VITE_PLATFORM === 'web' || process.env.VERCEL === '1' || command === 'serve';
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
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    }
  };
});
