/* global process */
/**
 * Vercel Serverless Function - 国土交通省 不動産情報ライブラリ API Proxy
 *
 * CORS制限を回避するためのサーバーサイドプロキシ
 * 環境変数 VITE_REINFOLIB_API_KEY が必要
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.replace('/api/reinfolib/', '');

  // Get API key from environment
  const apiKey = process.env.VITE_REINFOLIB_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Build target URL
  const targetUrl = `https://www.reinfolib.mlit.go.jp/ex-api/external/${pathSegments}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
