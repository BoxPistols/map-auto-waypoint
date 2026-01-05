/**
 * Vercel Serverless Function - OpenAI Chat API Proxy
 *
 * This function securely proxies requests to OpenAI API.
 * The API key is stored as a server-side environment variable (OPENAI_API_KEY),
 * which is NOT exposed to the client.
 */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// 許可するオリジンを環境変数から取得（カンマ区切り）
const getAllowedOrigins = () => {
  const origins = process.env.CORS_ALLOWED_ORIGINS || '';
  return origins.split(',').map(o => o.trim()).filter(o => o.length > 0);
};

export default async function handler(req, res) {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.origin || '';

  // オリジン検証（環境変数未設定の場合は拒否）
  if (allowedOrigins.length === 0) {
    return res.status(403).json({
      error: 'CORS not configured. Set CORS_ALLOWED_ORIGINS environment variable.',
      code: 'CORS_NOT_CONFIGURED'
    });
  }

  const isOriginAllowed = allowedOrigins.includes(requestOrigin);
  if (!isOriginAllowed && req.method !== 'OPTIONS') {
    return res.status(403).json({ error: 'Origin not allowed', code: 'ORIGIN_NOT_ALLOWED' });
  }

  // CORS headers（許可されたオリジンのみ）
  if (isOriginAllowed) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    if (isOriginAllowed) {
      return res.status(200).end();
    }
    return res.status(403).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server-side environment variable (NOT VITE_)
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'OpenAI API key not configured on server',
      code: 'API_KEY_NOT_CONFIGURED'
    });
  }

  try {
    const { model, messages, temperature, max_tokens, max_completion_tokens } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'The `messages` field is required and must be a non-empty array.',
        code: 'INVALID_REQUEST'
      });
    }

    // Build request body
    const requestBody = {
      model: model || 'gpt-4.1-nano',
      messages
    };

    // Add optional parameters
    if (typeof temperature === 'number') {
      requestBody.temperature = temperature;
    }
    if (typeof max_completion_tokens === 'number') {
      requestBody.max_completion_tokens = max_completion_tokens;
    } else if (typeof max_tokens === 'number') {
      requestBody.max_tokens = max_tokens;
    }

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI API error',
        code: data.error?.code || 'OPENAI_ERROR'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('[API Proxy] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}
