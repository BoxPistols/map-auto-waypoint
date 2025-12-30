import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/map-auto-waypoint/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: {
      // 国土交通省 不動産情報ライブラリ API
      '/api/reinfolib': {
        target: 'https://www.reinfolib.mlit.go.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reinfolib/, '/ex-api/external'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the API key header from client request
            const apiKey = req.headers['ocp-apim-subscription-key'];
            if (apiKey) {
              proxyReq.setHeader('Ocp-Apim-Subscription-Key', apiKey);
            }
          });
        }
      }
    }
  }
})
