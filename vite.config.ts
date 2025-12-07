import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Build a safe, minimal environment object with only the variables we need.
  // For GitHub Actions: process.env takes priority (secrets injected via env:)
  // For local dev: loadEnv reads from .env.local
  const safeEnv: Record<string, string> = {};
  
  // Manually pick VITE_ variables (Vite convention)
  const keysToInclude = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_GEMINI_API_KEY',
  ];
  
  // Check both process.env (GitHub Actions/CI - takes priority) and loaded .env file (local dev)
  for (const key of keysToInclude) {
    // process.env has priority because GitHub Actions injects secrets there
    if (process.env[key]) {
      safeEnv[key] = process.env[key];
    } else if (env[key]) {
      safeEnv[key] = env[key];
    }
  }

  // Debug: log what we found (will appear in build logs)
  console.log('[Vite] Environment variables loaded:');
  console.log(`  VITE_GEMINI_API_KEY: ${safeEnv.VITE_GEMINI_API_KEY ? safeEnv.VITE_GEMINI_API_KEY.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`  VITE_SUPABASE_URL: ${safeEnv.VITE_SUPABASE_URL ? 'FOUND' : 'MISSING'}`);

  // Build the define object with each env var properly stringified
  const defineVars: Record<string, string> = {};
  
  // Method 1: Inject as import.meta.env.* (for standard Vite/web)
  for (const [key, value] of Object.entries(safeEnv)) {
    defineVars[`import.meta.env.${key}`] = JSON.stringify(value);
  }
  
  // Method 2: Also inject as globalThis.VITE_* (for Capacitor/Android compatibility)
  // This ensures the values are accessible even if import.meta is not available
  for (const [key, value] of Object.entries(safeEnv)) {
    defineVars[`globalThis.${key}`] = JSON.stringify(value);
  }
  
  // Add standard Vite env vars
  defineVars['import.meta.env.MODE'] = JSON.stringify(mode);
  defineVars['import.meta.env.DEV'] = mode === 'development' ? 'true' : 'false';
  defineVars['import.meta.env.PROD'] = mode === 'production' ? 'true' : 'false';
  defineVars['import.meta.env.SSR'] = 'false';

  return {
    plugins: [react()],
    define: defineVars,
    server: {
      port: 3000
    }
  };
});