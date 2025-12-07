import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Build a safe, minimal environment object with only the variables we need.
  // This prevents leaking sensitive system info and avoids circular reference crashes.
  const safeEnv: Record<string, string> = {};
  
  // Manually pick VITE_ variables (Vite convention) and GEMINI_API_KEY
  const keysToInclude = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GEMINI_API_KEY',
  ];
  
  // Check both process.env (GitHub Actions/CI) and loaded .env file
  for (const key of keysToInclude) {
    if (process.env[key]) {
      safeEnv[key] = process.env[key];
    } else if (env[key]) {
      safeEnv[key] = env[key];
    }
  }

  return {
    plugins: [react()],
    define: {
      // Only inject the minimal, safe set of environment variables.
      // Vite will automatically make these available as import.meta.env.* in the client code.
      'import.meta.env': JSON.stringify(safeEnv)
    },
    server: {
      port: 3000
    }
  };
});