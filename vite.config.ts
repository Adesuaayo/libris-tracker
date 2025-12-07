import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Build a safe, minimal environment object with only the variables we need.
  const safeEnv: Record<string, string> = {};
  
  // Manually pick VITE_ variables (Vite convention)
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

  // Build the define object with each env var properly stringified
  const defineVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(safeEnv)) {
    defineVars[`import.meta.env.${key}`] = JSON.stringify(value);
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