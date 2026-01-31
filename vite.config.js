import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildKokuareaProxyPath = (path) => {
  try {
    const url = new URL(path, 'http://localhost')
    const z = url.searchParams.get('z')
    const x = url.searchParams.get('x')
    const y = url.searchParams.get('y')
    if (!z || !x || !y) return '/xyz/kokuarea/0/0/0.geojson'
    return `/xyz/kokuarea/${z}/${x}/${y}.geojson`
  } catch {
    return path
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]]
      }
    })
  ],
  base: '/map-auto-waypoint/',
  server: {
    proxy: {
      '/api/kokuarea': {
        target: 'https://maps.gsi.go.jp',
        changeOrigin: true,
        rewrite: buildKokuareaProxyPath
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  }
})
