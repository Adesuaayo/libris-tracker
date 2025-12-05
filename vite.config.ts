import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env but PRESERVE existing system variables (like those from GitHub Actions)
      'process.env': { ...process.env, ...env }
    },
    server: {
      port: 3000
    }
  };
});