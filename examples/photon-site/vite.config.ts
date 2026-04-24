import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.BASE_URL': JSON.stringify(
      (process.env.BASE_URL || process.env.CF_PAGES_URL || 'https://photon.gravito.dev').replace(
        /\/$/,
        ''
      )
    ),
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/client/app.tsx'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    // Add origin for proper asset loading when accessed from Photon server
    origin: 'http://localhost:5173',
  },
})
