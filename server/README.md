# MCP Proxy Server

React App と MCP Servers の間の橋渡しを行う WebSocket プロキシサーバー。

## アーキテクチャ

```
React App (Client)
    ↓ WebSocket
MCP Proxy Server (このサーバー)
    ↓ stdio (Standard I/O)
MCP Servers (flight-data, risk-assessment, etc.)
```

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd server
npm install
```

### 2. MCP Servers 設定

`config/mcpServers.json` でMCPサーバーの接続設定を行います。

```json
{
  "flight-data-server": {
    "command": "node",
    "args": ["../mcp-servers/flight-data/index.js"],
    "env": {}
  }
}
```

**注意**: `_disabled: true` フィールドがあるサーバーは接続されません。

### 3. サーバー起動

```bash
# 開発モード（ファイル変更時に自動再起動）
npm run dev

# 本番モード
npm start
```

デフォルトで `http://localhost:3001` で起動します。

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `MCP_PORT` | WebSocketサーバーのポート | `3001` |
| `MCP_HOST` | ホスト名 | `localhost` |

## API

### WebSocket接続

```javascript
const ws = new WebSocket('ws://localhost:3001')
```

### メッセージ形式

#### Tool呼び出し

```json
{
  "type": "callTool",
  "requestId": 1,
  "serverName": "flight-data-server",
  "toolName": "search_similar_flights",
  "params": {
    "location": { "lat": 35.6585, "lng": 139.7454 }
  }
}
```

#### Tool一覧取得

```json
{
  "type": "listTools",
  "requestId": 2,
  "serverName": "flight-data-server" // optional: 省略時は全サーバー
}
```

#### Resource一覧取得

```json
{
  "type": "listResources",
  "requestId": 3,
  "serverName": "flight-data-server" // optional
}
```

#### Resource読み取り

```json
{
  "type": "readResource",
  "requestId": 4,
  "serverName": "flight-data-server",
  "uri": "flight://history/operator123"
}
```

#### Ping/Pong（接続確認）

```json
{
  "type": "ping",
  "requestId": 5
}
```

### レスポンス形式

#### Tool呼び出し結果

```json
{
  "type": "toolResult",
  "requestId": 1,
  "result": [
    {
      "type": "text",
      "text": "Similar flights found: ..."
    }
  ]
}
```

#### エラー

```json
{
  "type": "error",
  "requestId": 1,
  "error": "MCP server not found: unknown-server"
}
```

## ディレクトリ構造

```
server/
├── index.js              # エントリーポイント
├── mcpProxy.js           # MCPプロキシコア
├── config/
│   └── mcpServers.json   # MCPサーバー接続設定
├── package.json
└── README.md
```

## デバッグ

### ヘルスチェック

```bash
curl http://localhost:3001/health
```

### ログ確認

サーバーは標準出力にログを出力します：

```
[MCP Proxy] Server listening on localhost:3001
[MCP Proxy #1] Client connected from ::1
[MCP Proxy #1] Connected to MCP server: flight-data-server
[MCP Proxy #1] Calling tool: flight-data-server/search_similar_flights
```

## トラブルシューティング

### MCPサーバーに接続できない

1. `config/mcpServers.json` でサーバーが有効化されているか確認
2. MCPサーバーのパスが正しいか確認
3. MCPサーバーが実行可能か確認（`node path/to/server.js` で単体テスト）

### WebSocket接続エラー

1. ポートが使用中でないか確認: `lsof -i :3001`
2. ファイアウォール設定を確認
3. CORSエラーの場合は開発環境でのみ発生（本番環境では解消）

## 本番デプロイ

### Docker化

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Railway/Fly.io デプロイ

1. `Procfile` を作成:
   ```
   web: cd server && npm start
   ```

2. 環境変数を設定:
   - `MCP_HOST=0.0.0.0`
   - `MCP_PORT=$PORT` (プラットフォームが指定するポート)

## 次のステップ

1. MCPサーバーの実装（`../mcp-servers/` ディレクトリ）
2. React側のクライアント実装（`src/services/mcpWebSocketClient.js`）
3. 統合テスト

## 参考資料

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- `docs/MCP_PHASE1_IMPLEMENTATION.md` - 実装計画
