/**
 * Vercel Serverless Function - GSI kokuarea タイルプロキシ
 *
 * クライアントからのCORS制限を回避し、GSIのGeoJSONタイルを取得する。
 */
const KOKUAREA_BASE_URL = 'https://maps.gsi.go.jp/xyz/kokuarea'

const parseTileParams = (reqUrl) => {
  const url = new URL(reqUrl, 'http://localhost')
  const z = Number(url.searchParams.get('z'))
  const x = Number(url.searchParams.get('x'))
  const y = Number(url.searchParams.get('y'))

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false }
  }

  if (z < 0 || z > 18 || x < 0 || y < 0) {
    return { ok: false }
  }

  return { ok: true, z, x, y }
}

export default async function handler(req, res) {
  // CORS（公開データのため簡易許可）
  const requestOrigin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', requestOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = parseTileParams(req.url || '')
  if (!params.ok) {
    return res.status(400).json({ error: 'Invalid tile parameters' })
  }

  const tileUrl = `${KOKUAREA_BASE_URL}/${params.z}/${params.x}/${params.y}.geojson`

  try {
    const response = await fetch(tileUrl)
    if (!response.ok) {
      return res.status(response.status).end()
    }

    const contentType = response.headers.get('content-type') || 'application/json'
    const body = await response.text()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    return res.status(200).send(body)
  } catch (error) {
    console.error('[KOKUAREA Proxy] Error:', error)
    return res.status(500).json({
      error: 'Proxy error',
      detail: error?.message || 'Unknown error'
    })
  }
}
