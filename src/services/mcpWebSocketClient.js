/**
 * MCP WebSocket Client
 *
 * MCP Proxy Server との WebSocket 通信を管理するクライアント
 *
 * Usage:
 * ```javascript
 * import { mcpWebSocketClient } from './mcpWebSocketClient'
 *
 * await mcpWebSocketClient.connect()
 * const result = await mcpWebSocketClient.callTool('flight-data-server', 'search_similar_flights', params)
 * ```
 */

export class MCPWebSocketClient {
  constructor(url = null) {
    // 環境変数から URL を取得（デフォルトは localhost）
    this.url = url || import.meta.env.VITE_MCP_PROXY_URL || 'ws://localhost:3001'
    this.ws = null
    this.requestId = 0
    this.pendingRequests = new Map()
    this.connectionState = 'disconnected' // disconnected | connecting | connected | error
    this.listeners = new Set()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // 初期値1秒
    this.reconnectTimer = null
    this.connectedServers = []
  }

  /**
   * Proxy Server に接続
   *
   * @returns {Promise<void>}
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[MCP Client] Already connected')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.connectionState = 'connecting'
      this._notifyStateChange()

      console.log(`[MCP Client] Connecting to ${this.url}...`)

      try {
        this.ws = new WebSocket(this.url)
      } catch (error) {
        this.connectionState = 'error'
        this._notifyStateChange()
        reject(error)
        return
      }

      this.ws.onopen = () => {
        console.log('[MCP Client] Connected to MCP Proxy Server')
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        this._notifyStateChange()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this._handleMessage(message)
        } catch (error) {
          console.error('[MCP Client] Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[MCP Client] WebSocket error:', error)
        this.connectionState = 'error'
        this._notifyStateChange()
      }

      this.ws.onclose = (event) => {
        console.log(`[MCP Client] Disconnected (code: ${event.code}, reason: ${event.reason})`)
        this.connectionState = 'disconnected'
        this._notifyStateChange()

        // 自動再接続
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect()
        }
      }

      // 接続タイムアウト
      setTimeout(() => {
        if (this.connectionState === 'connecting') {
          console.error('[MCP Client] Connection timeout')
          this.ws.close()
          this.connectionState = 'error'
          this._notifyStateChange()
          reject(new Error('Connection timeout'))
        }
      }, 10000) // 10秒
    })
  }

  /**
   * 自動再接続をスケジュール
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000) // 最大30秒

    console.log(
      `[MCP Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[MCP Client] Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * 切断
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connectionState = 'disconnected'
    this._notifyStateChange()
    console.log('[MCP Client] Disconnected')
  }

  /**
   * Tool を呼び出し
   *
   * @param {string} serverName - MCPサーバー名
   * @param {string} toolName - Tool名
   * @param {Object} params - パラメータ
   * @param {number} timeout - タイムアウト (ms)
   * @returns {Promise<any>} Tool実行結果
   */
  async callTool(serverName, toolName, params = {}, timeout = 30000) {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to MCP Proxy Server')
    }

    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          type: 'callTool',
          requestId,
          serverName,
          toolName,
          params
        })
      )

      // タイムアウト処理
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error(`Tool call timeout: ${serverName}/${toolName}`))
        }
      }, timeout)
    })
  }

  /**
   * 利用可能な Tool 一覧を取得
   *
   * @param {string} serverName - MCPサーバー名 (省略時は全サーバー)
   * @returns {Promise<Object>} Tools一覧
   */
  async listTools(serverName = null) {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to MCP Proxy Server')
    }

    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          type: 'listTools',
          requestId,
          serverName
        })
      )

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('List tools timeout'))
        }
      }, 10000)
    })
  }

  /**
   * Resource一覧を取得
   *
   * @param {string} serverName - MCPサーバー名 (省略時は全サーバー)
   * @returns {Promise<Object>} Resources一覧
   */
  async listResources(serverName = null) {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to MCP Proxy Server')
    }

    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          type: 'listResources',
          requestId,
          serverName
        })
      )

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('List resources timeout'))
        }
      }, 10000)
    })
  }

  /**
   * Resourceを読み取り
   *
   * @param {string} serverName - MCPサーバー名
   * @param {string} uri - Resource URI
   * @returns {Promise<any>} Resource内容
   */
  async readResource(serverName, uri) {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to MCP Proxy Server')
    }

    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          type: 'readResource',
          requestId,
          serverName,
          uri
        })
      )

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Read resource timeout'))
        }
      }, 10000)
    })
  }

  /**
   * Ping を送信（接続確認）
   *
   * @returns {Promise<void>}
   */
  async ping() {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to MCP Proxy Server')
    }

    const requestId = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(
        JSON.stringify({
          type: 'ping',
          requestId
        })
      )

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Ping timeout'))
        }
      }, 5000)
    })
  }

  /**
   * メッセージを処理
   */
  _handleMessage(message) {
    const { type, requestId } = message

    // 初期化完了メッセージ
    if (type === 'initialization') {
      this.connectedServers = message.connectedServers || []
      console.log('[MCP Client] Connected MCP servers:', this.connectedServers)
      return
    }

    // Pong
    if (type === 'pong') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.resolve()
      }
      return
    }

    // Tool result
    if (type === 'toolResult') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.resolve(message.result)
      }
      return
    }

    // Tools list
    if (type === 'toolsList') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.resolve(message.tools)
      }
      return
    }

    // Resources list
    if (type === 'resourcesList') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.resolve(message.resources)
      }
      return
    }

    // Resource content
    if (type === 'resourceContent') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.resolve(message.content)
      }
      return
    }

    // Error
    if (type === 'error') {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.reject(new Error(message.error))
      }
      console.error('[MCP Client] Server error:', message.error)
      return
    }

    console.warn('[MCP Client] Unknown message type:', type)
  }

  /**
   * 接続状態変更を監視
   *
   * @param {Function} callback - コールバック関数
   * @returns {Function} 解除関数
   */
  onStateChange(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * 接続状態変更を通知
   */
  _notifyStateChange() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.connectionState)
      } catch (error) {
        console.error('[MCP Client] Error in state change listener:', error)
      }
    })
  }

  /**
   * 接続中のMCPサーバー一覧を取得
   *
   * @returns {string[]}
   */
  getConnectedServers() {
    return [...this.connectedServers]
  }
}

// シングルトンインスタンス
export const mcpWebSocketClient = new MCPWebSocketClient()
