/**
 * Vercel Serverless Function - 国土交通省 不動産情報ライブラリ API Proxy
 *
 * CORS制限を回避するためのサーバーサイドプロキシ
 * 環境変数 VITE_REINFOLIB_API_KEY が必要
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get path from URL directly (more reliable)
  const urlPath = req.url.split('?')[0];
  const pathSegments = urlPath.replace('/api/reinfolib/', '');

  // Debug mode
  if (req.query.debug === '1') {
    return res.status(200).json({
      url: req.url,
      pathSegments,
      query: req.query,
      hasApiKey: !!process.env.VITE_REINFOLIB_API_KEY
    });
  }

  // Get API key from environment
  const apiKey = process.env.VITE_REINFOLIB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured',
      debug: 'VITE_REINFOLIB_API_KEY not set in Vercel environment'
    });
  }

  // Build query string (exclude internal params)
  const queryParams = new URLSearchParams();
  const excludeKeys = ['path', '...path', 'debug'];
  Object.entries(req.query).forEach(([key, value]) => {
    if (!excludeKeys.includes(key)) {
      queryParams.append(key, value);
    }
  });

  // Build target URL
  const targetUrl = `https://www.reinfolib.mlit.go.jp/ex-api/external/${pathSegments}${queryParams.toString() ? '?' + queryParams : ''}`;

  console.log('[reinfolib-proxy] Target URL:', targetUrl);
  console.log('[reinfolib-proxy] Path segments:', pathSegments);
  console.log('[reinfolib-proxy] Query:', queryParams.toString());

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    const data = await response.text();
    const contentType = response.headers.get('Content-Type') || 'application/json';

    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(data);
  } catch (error) {
    console.error('[reinfolib-proxy] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
