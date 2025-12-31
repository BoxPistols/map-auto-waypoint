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
            // Extract API key from query parameter and set as header
            const url = new URL(req.url, 'http://localhost');
            const apiKey = url.searchParams.get('_apiKey');

            console.log('[Proxy] Request URL:', req.url);
            console.log('[Proxy] API Key found:', !!apiKey, apiKey ? `(${apiKey.length} chars)` : '');

            if (apiKey) {
              // Set the API key header
              proxyReq.setHeader('Ocp-Apim-Subscription-Key', apiKey);

              // Remove _apiKey from the forwarded URL
              url.searchParams.delete('_apiKey');
              const cleanPath = url.pathname + url.search;
              proxyReq.path = cleanPath.replace(/^\/api\/reinfolib/, '/ex-api/external');

              console.log('[Proxy] Header set, clean path:', proxyReq.path);
            }
          });
        }
      }
    }
  }
})
