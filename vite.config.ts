import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Combine system environment variables (from GitHub Actions) with local .env variables
  const combinedEnv = { ...process.env, ...env };

  return {
    plugins: [react()],
    define: {
      // CRITICAL FIX: We must JSON.stringify the environment object.
      // Without this, Vite inserts raw variable names instead of string values, causing "undefined" errors on the phone.
      'process.env': JSON.stringify(combinedEnv)
    },
    server: {
      port: 3000
    }
  };
});