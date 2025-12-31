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

            // Extract API key from query parameter
            const url = new URL(req.url, 'http://localhost');
            const apiKey = url.searchParams.get('_apiKey');

            if (apiKey) {
              // Remove browser headers that might cause 403
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');

              // Remove _apiKey and rebuild path
              url.searchParams.delete('_apiKey');
              const newPath = '/ex-api/external' + url.pathname.replace('/api/reinfolib', '') + url.search;
              proxyReq.path = newPath;

              // Set the API key header
              proxyReq.setHeader('Ocp-Apim-Subscription-Key', apiKey);

              // Log what we're sending
              console.log('[Proxy] Path:', newPath);
              console.log('[Proxy] Header set:', proxyReq.getHeader('Ocp-Apim-Subscription-Key')?.substring(0, 8) + '...');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Proxy] Response status:', proxyRes.statusCode);
          });

          proxy.on('error', (err) => {
            console.error('[Proxy] Error:', err.message);
          });
        }
      }
    }
  }
})
