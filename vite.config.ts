import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import * as fs from 'fs';
import * as path from 'path';

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
  
  // Check both process.env (GitHub Actions/CI - takes priority) and loaded .env file (local dev)
  for (const key of keysToInclude) {
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

  // Generate config.ts with actual environment values
  const configContent = `// Auto-generated at build time - DO NOT EDIT
export const ENV_CONFIG = {
  VITE_GEMINI_API_KEY: '${safeEnv.VITE_GEMINI_API_KEY || ''}',
  VITE_SUPABASE_URL: '${safeEnv.VITE_SUPABASE_URL || ''}',
  VITE_SUPABASE_ANON_KEY: '${safeEnv.VITE_SUPABASE_ANON_KEY || ''}',
};
`;

  const srcDir = path.join(process.cwd(), 'src');
  const configPath = path.join(srcDir, 'config.ts');
  
  // Ensure src directory exists
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, configContent);
  console.log('[Vite] Generated src/config.ts with environment variables');

  return {
    plugins: [react()],
    define: {
      // Add standard Vite env vars for reference only
      'import.meta.env.MODE': JSON.stringify(mode),
      'import.meta.env.DEV': mode === 'development' ? 'true' : 'false',
      'import.meta.env.PROD': mode === 'production' ? 'true' : 'false',
      'import.meta.env.SSR': 'false',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - split large dependencies
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-charts': ['recharts'],
            'vendor-ai': ['@google/genai'],
          },
        },
      },
      // Increase chunk size warning limit since we're code splitting
      chunkSizeWarningLimit: 600,
    },
    server: {
      port: 3000
    }
  };
});