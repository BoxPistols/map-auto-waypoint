/**
 * MCP Proxy Server
 *
 * React App (Client) と MCP Servers の間の橋渡しを行う WebSocket サーバー
 *
 * Architecture:
 * React App ↔ [WebSocket] ↔ MCP Proxy Server ↔ [stdio] ↔ MCP Servers
 */

import express from 'express'
import { WebSocketServer } from 'ws'
import { MCPProxy } from './mcpProxy.js'

const app = express()
const PORT = process.env.MCP_PORT || 3001
const HOST = process.env.MCP_HOST || 'localhost'

// CORS設定（開発環境用）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// サーバー起動
const server = app.listen(PORT, HOST, () => {
  console.log(`[MCP Proxy] Server listening on ${HOST}:${PORT}`)
  console.log(`[MCP Proxy] WebSocket endpoint: ws://${HOST}:${PORT}`)
  console.log(`[MCP Proxy] Health check: http://${HOST}:${PORT}/health`)
})

// WebSocketサーバー
const wss = new WebSocketServer({ server })

// 接続数カウント
let connectionCount = 0

wss.on('connection', (ws, req) => {
  const clientId = ++connectionCount
  const clientIp = req.socket.remoteAddress

  console.log(`[MCP Proxy] Client #${clientId} connected from ${clientIp}`)

  // MCPProxyインスタンスを作成
  const proxy = new MCPProxy(ws, clientId)

  // 初期化
  proxy.initialize().catch(err => {
    console.error(`[MCP Proxy] Failed to initialize proxy for client #${clientId}:`, err)
    ws.close(1011, 'Initialization failed')
  })

  // 切断時のクリーンアップ
  ws.on('close', () => {
    console.log(`[MCP Proxy] Client #${clientId} disconnected`)
    proxy.cleanup()
  })

  ws.on('error', (error) => {
    console.error(`[MCP Proxy] WebSocket error for client #${clientId}:`, error)
  })
})

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('[MCP Proxy] SIGTERM received, closing server...')
  server.close(() => {
    console.log('[MCP Proxy] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[MCP Proxy] SIGINT received, closing server...')
  server.close(() => {
    console.log('[MCP Proxy] Server closed')
    process.exit(0)
  })
})

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('[MCP Proxy] Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MCP Proxy] Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
