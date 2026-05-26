import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL ?? 'http://localhost:3001'

  return {
    plugins: [react()],
    server: {
      port: 8080,
      host: true,
      strictPort: true,
      proxy: {
        // /api/* → ptas168-api (backend listens on :3001; override via BACKEND_URL in .env.local)
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    base: '/Ptas168_Frontend/',
    // Pre-bundle the workspace SDK + contracts via esbuild so CJS named
    // exports (e.g. `import { ServiceTypeSchema } from '@ptas/contracts'`)
    // resolve in the browser. Without this, dev hits "exports is not defined".
    optimizeDeps: {
      include: ['@ptas/contracts', '@ptas/sdk'],
    },
    ssr: {
      noExternal: ['@ptas/contracts', '@ptas/sdk'],
    },
  }
})
