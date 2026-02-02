# MCP Phase 1 実装計画

## Phase 1概要

**目標**: MCP基盤構築（2-3週間）
- MCP Client ライブラリ導入
- チャットインターフェース強化
- 基本的なTool呼び出しフロー確立

---

## 技術選定

### 1. MCP Client SDK

#### 推奨: `@modelcontextprotocol/sdk`

```bash
npm install @modelcontextprotocol/sdk
```

**特徴:**
- 公式SDKで長期サポート保証
- TypeScript完全対応
- WebSocket/HTTP/stdio transports
- Server/Client両対応

**代替案:**
- カスタム実装（非推奨: 保守コスト高）

### 2. Transport選定

| Transport | 用途 | 推奨度 |
|-----------|------|--------|
| **WebSocket** | ブラウザ ↔ Node.jsサーバー | ★★★★★ |
| HTTP/SSE | ブラウザ ↔ サーバーレス | ★★★☆☆ |
| stdio | CLIツール | ★☆☆☆☆ |

**Phase 1推奨: WebSocket**
- リアルタイム双方向通信
- Resource購読に最適
- Next.js/Vercel APIルートで実装可能

---

## アーキテクチャ設計

### 現状（モック実装）

```
React App
  ↓
mcpClient.js (モック)
  ↓
モック関数（ローカル実行）
```

### Phase 1目標

```
React App (Client)
  ↓ WebSocket
MCP Proxy Server (Node.js)
  ↓ MCP Protocol
MCP Servers (flight-data, risk-assessment等)
```

### ディレクトリ構造

```
map-auto-waypoint/
├── src/
│   ├── services/
│   │   ├── mcpClient.js          # 既存（モック → 実装に置き換え）
│   │   └── mcpWebSocketClient.js # 新規: WebSocket Client wrapper
│   ├── components/
│   │   └── FlightAssistant/
│   │       ├── FlightAssistant.jsx # 既存（強化）
│   │       └── ChatInterface.jsx   # 新規: MCP Tool呼び出し統合
│
├── server/ (新規)
│   ├── index.js                  # MCP Proxy Server entry point
│   ├── mcpProxy.js               # MCP Client → Server bridge
│   ├── config/
│   │   └── mcpServers.json       # MCP Server接続設定
│   └── package.json
│
└── docs/
    └── MCP_PHASE1_IMPLEMENTATION.md (このファイル)
```

---

## 実装ステップ

### Step 1: MCP Proxy Server構築

#### 1.1 サーバー初期化

```bash
mkdir server
cd server
npm init -y
npm install @modelcontextprotocol/sdk ws express
```

#### 1.2 `server/index.js`

```javascript
import express from 'express'
import { WebSocketServer } from 'ws'
import { MCPProxy } from './mcpProxy.js'

const app = express()
const PORT = process.env.MCP_PORT || 3001

// WebSocketサーバー
const server = app.listen(PORT, () => {
  console.log(`MCP Proxy Server listening on port ${PORT}`)
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('Client connected')
  const proxy = new MCPProxy(ws)
  proxy.initialize()
})
```

#### 1.3 `server/mcpProxy.js`

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import mcpServersConfig from './config/mcpServers.json' assert { type: 'json' }

export class MCPProxy {
  constructor(ws) {
    this.ws = ws
    this.mcpClients = new Map()
  }

  async initialize() {
    // 設定ファイルから各MCPサーバーに接続
    for (const [serverName, config] of Object.entries(mcpServersConfig)) {
      try {
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: config.env
        })

        const client = new Client({
          name: `map-auto-waypoint-proxy`,
          version: '1.0.0'
        }, {
          capabilities: {}
        })

        await client.connect(transport)
        this.mcpClients.set(serverName, client)
        console.log(`Connected to MCP server: ${serverName}`)
      } catch (error) {
        console.error(`Failed to connect to ${serverName}:`, error)
      }
    }

    // WebSocketメッセージハンドラー
    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data)
        await this.handleClientMessage(message)
      } catch (error) {
        this.ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }))
      }
    })
  }

  async handleClientMessage(message) {
    const { type, serverName, toolName, params } = message

    if (type === 'callTool') {
      const client = this.mcpClients.get(serverName)
      if (!client) {
        throw new Error(`MCP server not found: ${serverName}`)
      }

      const result = await client.callTool({
        name: toolName,
        arguments: params
      })

      this.ws.send(JSON.stringify({
        type: 'toolResult',
        requestId: message.requestId,
        result: result.content
      }))
    }

    if (type === 'listTools') {
      const tools = {}
      for (const [name, client] of this.mcpClients.entries()) {
        const serverTools = await client.listTools()
        tools[name] = serverTools.tools
      }

      this.ws.send(JSON.stringify({
        type: 'toolsList',
        requestId: message.requestId,
        tools
      }))
    }
  }
}
```

#### 1.4 `server/config/mcpServers.json`

```json
{
  "flight-data-server": {
    "command": "node",
    "args": ["../mcp-servers/flight-data/index.js"],
    "env": {}
  },
  "risk-assessment-server": {
    "command": "node",
    "args": ["../mcp-servers/risk-assessment/index.js"],
    "env": {}
  }
}
```

---

### Step 2: React Client統合

#### 2.1 `src/services/mcpWebSocketClient.js`

```javascript
/**
 * MCP WebSocket Client
 * Proxy Serverとの通信を管理
 */
export class MCPWebSocketClient {
  constructor(url = 'ws://localhost:3001') {
    this.url = url
    this.ws = null
    this.requestId = 0
    this.pendingRequests = new Map()
    this.connectionState = 'disconnected'
    this.listeners = new Set()
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[MCP] Connected to proxy server')
        this.connectionState = 'connected'
        this._notifyStateChange()
        resolve()
      }

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        this._handleMessage(message)
      }

      this.ws.onerror = (error) => {
        console.error('[MCP] WebSocket error:', error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log('[MCP] Disconnected from proxy server')
        this.connectionState = 'disconnected'
        this._notifyStateChange()
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  async callTool(serverName, toolName, params) {
    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(JSON.stringify({
        type: 'callTool',
        requestId,
        serverName,
        toolName,
        params
      }))

      // タイムアウト処理
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }

  async listTools() {
    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(JSON.stringify({
        type: 'listTools',
        requestId
      }))
    })
  }

  _handleMessage(message) {
    if (message.type === 'toolResult' || message.type === 'toolsList') {
      const pending = this.pendingRequests.get(message.requestId)
      if (pending) {
        this.pendingRequests.delete(message.requestId)
        pending.resolve(message.result || message.tools)
      }
    }

    if (message.type === 'error') {
      const pending = this.pendingRequests.get(message.requestId)
      if (pending) {
        this.pendingRequests.delete(message.requestId)
        pending.reject(new Error(message.error))
      }
    }
  }

  onStateChange(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  _notifyStateChange() {
    this.listeners.forEach(cb => cb(this.connectionState))
  }
}

// シングルトン
export const mcpWebSocketClient = new MCPWebSocketClient()
```

#### 2.2 `src/services/mcpClient.js` の更新

```javascript
import { mcpWebSocketClient } from './mcpWebSocketClient'

// 環境変数でモック/実装を切り替え
const USE_REAL_MCP = import.meta.env.VITE_USE_REAL_MCP === 'true'

class MCPClient {
  constructor() {
    this.client = USE_REAL_MCP ? mcpWebSocketClient : new MCPClientMock()
    this.connectionState = 'disconnected'
  }

  async connect() {
    return this.client.connect()
  }

  async generateFlightPath(description, area) {
    if (USE_REAL_MCP) {
      return this.client.callTool(
        'flight-data-server',
        'generate_flight_path',
        { description, area }
      )
    }
    // フォールバック: モック実装
    return this._mockGenerateFlightPath(description, area)
  }

  // ... 他のメソッドも同様に実装
}

export const mcpClient = new MCPClient()
```

---

### Step 3: チャットインターフェース強化

#### 3.1 MCP Tool呼び出しUI

```javascript
// src/components/FlightAssistant/ToolCallDisplay.jsx
const ToolCallDisplay = ({ toolCall }) => {
  const { serverName, toolName, params, result, status } = toolCall

  return (
    <div className={styles.toolCall}>
      <div className={styles.toolHeader}>
        <Tool size={16} />
        <span>{serverName} / {toolName}</span>
        {status === 'loading' && <Loader size={14} className="spin" />}
        {status === 'success' && <CheckCircle size={14} />}
        {status === 'error' && <XCircle size={14} />}
      </div>

      <details className={styles.toolDetails}>
        <summary>パラメータ</summary>
        <pre>{JSON.stringify(params, null, 2)}</pre>
      </details>

      {result && (
        <div className={styles.toolResult}>
          <h4>結果</h4>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
```

#### 3.2 FlightAssistant統合

```javascript
// src/components/FlightAssistant/FlightAssistant.jsx
const FlightAssistant = () => {
  const [toolCalls, setToolCalls] = useState([])
  const [mcpConnected, setMcpConnected] = useState(false)

  useEffect(() => {
    const unsubscribe = mcpClient.onStateChange((state) => {
      setMcpConnected(state === 'connected')
    })
    return unsubscribe
  }, [])

  const handleAnalyze = async () => {
    // Tool呼び出しを記録
    const toolCallId = Date.now()
    setToolCalls(prev => [...prev, {
      id: toolCallId,
      serverName: 'risk-assessment-server',
      toolName: 'assess_ground_risk',
      params: { flightArea, altitude },
      status: 'loading'
    }])

    try {
      const result = await mcpClient.assessGroundRisk(flightArea, altitude)

      setToolCalls(prev => prev.map(tc =>
        tc.id === toolCallId
          ? { ...tc, status: 'success', result }
          : tc
      ))
    } catch (error) {
      setToolCalls(prev => prev.map(tc =>
        tc.id === toolCallId
          ? { ...tc, status: 'error', error: error.message }
          : tc
      ))
    }
  }

  return (
    <div className={styles.assistant}>
      <div className={styles.header}>
        <Plane size={20} />
        <h2>フライトアシスタント</h2>
        <StatusIndicator connected={mcpConnected} />
      </div>

      {/* Chat messages */}
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Tool calls */}
      {toolCalls.map(tc => (
        <ToolCallDisplay key={tc.id} toolCall={tc} />
      ))}

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
```

---

### Step 4: 開発環境セットアップ

#### 4.1 `package.json` スクリプト追加

```json
{
  "scripts": {
    "dev": "vite",
    "dev:with-mcp": "concurrently \"npm run dev\" \"npm run mcp:server\"",
    "mcp:server": "cd server && node index.js",
    "build": "vite build",
    "build:vercel": "vite build --base=/"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

#### 4.2 環境変数

```bash
# .env.local
VITE_USE_REAL_MCP=false  # 開発中はfalse、MCPサーバー準備後にtrue
VITE_MCP_PROXY_URL=ws://localhost:3001
```

---

## テスト戦略

### 1. Unit Tests

```javascript
// src/services/mcpWebSocketClient.test.js
import { describe, it, expect, vi } from 'vitest'
import { MCPWebSocketClient } from './mcpWebSocketClient'

describe('MCPWebSocketClient', () => {
  it('should connect to WebSocket', async () => {
    const client = new MCPWebSocketClient('ws://localhost:3001')
    // Mock WebSocket
    global.WebSocket = vi.fn(() => ({
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn()
    }))

    await client.connect()
    expect(client.connectionState).toBe('connected')
  })
})
```

### 2. Integration Tests

```javascript
// server/mcpProxy.test.js
import { describe, it, expect } from 'vitest'
import { MCPProxy } from './mcpProxy.js'

describe('MCPProxy', () => {
  it('should route tool calls to correct MCP server', async () => {
    // モックWebSocket
    const mockWs = {
      send: vi.fn(),
      on: vi.fn()
    }

    const proxy = new MCPProxy(mockWs)
    await proxy.initialize()

    // Tool呼び出しシミュレーション
    await proxy.handleClientMessage({
      type: 'callTool',
      requestId: 1,
      serverName: 'flight-data-server',
      toolName: 'search_similar_flights',
      params: { location: { lat: 35, lng: 139 } }
    })

    expect(mockWs.send).toHaveBeenCalled()
  })
})
```

### 3. E2E Tests (Playwright)

```javascript
// e2e/mcp-integration.spec.js
import { test, expect } from '@playwright/test'

test('should call MCP tool from UI', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // チャットを開く
  await page.click('[data-testid="chat-toggle"]')

  // 分析ボタンをクリック
  await page.click('[data-testid="analyze-button"]')

  // Tool呼び出しが表示されることを確認
  await expect(page.locator('.toolCall')).toBeVisible()
})
```

---

## Serena活用によるコード品質保証

### リファクタリング時のSerena活用

```bash
# 1. mcpClient.js のシンボル概要を取得
get_symbols_overview("src/services/mcpClient.js", depth=1)

# 2. 既存のモック関数を特定
find_symbol("MCPClient/*", include_body=false)

# 3. 実装に置き換える前に依存関係を確認
find_referencing_symbols("generateFlightPath")

# 4. 段階的に置き換え
replace_symbol_body で安全に移行
```

### コードレビュー自動化

```bash
# 新規作成したファイルをレビュー
get_symbols_overview("src/services/mcpWebSocketClient.js")
find_symbol("MCPWebSocketClient/callTool", include_body=true)
```

---

## デプロイ戦略

### 開発環境
- ローカル: `npm run dev:with-mcp`
- MCP Proxy Server: ローカル起動

### ステージング環境
- Vercel Preview Deployment
- MCP Proxy Server: Docker Container (Railway/Fly.io)

### 本番環境
- Vercel Production
- MCP Proxy Server: AWS ECS / Google Cloud Run
- 環境変数: `VITE_USE_REAL_MCP=true`

### インフラ構成（Phase 1目標）

```
[React App on Vercel]
         ↓ WebSocket
[MCP Proxy on Railway]
         ↓ stdio
[MCP Servers (Docker)]
```

---

## マイルストーン

### Week 1: Infrastructure
- [x] MCP SDK導入
- [ ] MCP Proxy Server実装
- [ ] WebSocket通信確立

### Week 2: Client Integration
- [ ] mcpWebSocketClient実装
- [ ] mcpClient統合（モック/実装切り替え）
- [ ] 環境変数設定

### Week 3: UI Enhancement
- [ ] ToolCallDisplay実装
- [ ] FlightAssistant統合
- [ ] エラーハンドリング

### Week 4: Testing & Documentation
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] ドキュメント整備
- [ ] デプロイ準備

---

## 成功基準

### 機能要件
- ✅ WebSocketでMCP Proxy Serverに接続できる
- ✅ Tool呼び出しが正常に動作する
- ✅ Tool呼び出し履歴がUIに表示される
- ✅ エラー時のフォールバック（モック）が機能する

### 非機能要件
- ✅ WebSocket接続の安定性（再接続機能）
- ✅ レスポンスタイム < 3秒
- ✅ テストカバレッジ > 80%

---

## リスクと対策

### リスク1: WebSocket接続の不安定性
**対策:**
- 自動再接続機能の実装
- Heartbeat/Ping-Pong実装
- タイムアウト処理

### リスク2: MCPサーバーの未完成
**対策:**
- モック実装の継続利用
- 段階的な実MCPサーバー導入
- `VITE_USE_REAL_MCP` フラグで切り替え

### リスク3: デプロイの複雑化
**対策:**
- Docker化
- Vercel + Railway/Fly.ioの組み合わせ
- CI/CD自動化

---

## 次のアクション

1. **Week 1開始**: MCP Proxy Server実装
2. **パッケージインストール**: `@modelcontextprotocol/sdk`
3. **ブランチ作成**: `feature/mcp-phase1`
4. **Serena練習**: 小規模リファクタリングで操作確認

---

## 参考資料

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- `docs/MCP_INTEGRATION_VISION.md` - 全体ビジョン
- `docs/UTM_U_SPACE_DESIGN_PATTERNS.md` - UTM設計パターン
