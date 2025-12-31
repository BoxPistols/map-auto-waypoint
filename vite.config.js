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
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy] === Request intercepted ===');
            console.log('[Proxy] Original URL:', req.url);

            // Extract API key from query parameter
            const url = new URL(req.url, 'http://localhost');
            const apiKey = url.searchParams.get('_apiKey');

            if (apiKey) {
              console.log('[Proxy] API Key found:', apiKey.length, 'chars');

              // Set the API key header
              proxyReq.setHeader('Ocp-Apim-Subscription-Key', apiKey);

              // Remove _apiKey and rebuild path
              url.searchParams.delete('_apiKey');
              const newPath = '/ex-api/external' + url.pathname.replace('/api/reinfolib', '') + url.search;
              proxyReq.path = newPath;

              console.log('[Proxy] New path:', newPath);
            } else {
              console.log('[Proxy] No API key in URL!');
              // Fallback rewrite
              proxyReq.path = proxyReq.path.replace('/api/reinfolib', '/ex-api/external');
            }
          });

          proxy.on('error', (err) => {
            console.error('[Proxy] Error:', err.message);
          });
        }
      }
    }
  }
})
