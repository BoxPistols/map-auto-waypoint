/**
 * MCP Proxy
 *
 * WebSocketクライアントとMCPサーバー間の通信を管理
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class MCPProxy {
  constructor(ws, clientId) {
    this.ws = ws
    this.clientId = clientId
    this.mcpClients = new Map()
    this.isInitialized = false
  }

  /**
   * MCPサーバーへの接続を初期化
   */
  async initialize() {
    console.log(`[MCP Proxy #${this.clientId}] Initializing...`)

    // 設定ファイルを読み込み
    let mcpServersConfig
    try {
      const configPath = join(__dirname, 'config', 'mcpServers.json')
      const configContent = await readFile(configPath, 'utf-8')
      mcpServersConfig = JSON.parse(configContent)
    } catch (error) {
      console.error(`[MCP Proxy #${this.clientId}] Failed to load config:`, error.message)
      // 設定ファイルがない場合はモックモードで動作
      mcpServersConfig = {}
    }

    // 各MCPサーバーに接続
    const connectionPromises = Object.entries(mcpServersConfig).map(
      async ([serverName, config]) => {
        try {
          // stdio transportでMCPサーバーに接続
          const transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: { ...process.env, ...config.env }
          })

          const client = new Client(
            {
              name: `map-auto-waypoint-proxy-${this.clientId}`,
              version: '1.0.0'
            },
            {
              capabilities: {}
            }
          )

          await client.connect(transport)
          this.mcpClients.set(serverName, client)
          console.log(`[MCP Proxy #${this.clientId}] Connected to MCP server: ${serverName}`)

          return { serverName, success: true }
        } catch (error) {
          console.error(
            `[MCP Proxy #${this.clientId}] Failed to connect to ${serverName}:`,
            error.message
          )
          return { serverName, success: false, error: error.message }
        }
      }
    )

    const results = await Promise.allSettled(connectionPromises)

    // 接続結果をクライアントに通知
    this.sendMessage({
      type: 'initialization',
      connectedServers: Array.from(this.mcpClients.keys()),
      results: results.map(r => (r.status === 'fulfilled' ? r.value : { success: false }))
    })

    // WebSocketメッセージハンドラーを設定
    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        await this.handleClientMessage(message)
      } catch (error) {
        console.error(`[MCP Proxy #${this.clientId}] Message handling error:`, error)
        this.sendError(null, error.message)
      }
    })

    this.isInitialized = true
    console.log(`[MCP Proxy #${this.clientId}] Initialization complete`)
  }

  /**
   * クライアントからのメッセージを処理
   */
  async handleClientMessage(message) {
    const { type, requestId } = message

    try {
      switch (type) {
        case 'callTool':
          await this.handleCallTool(message)
          break

        case 'listTools':
          await this.handleListTools(message)
          break

        case 'listResources':
          await this.handleListResources(message)
          break

        case 'readResource':
          await this.handleReadResource(message)
          break

        case 'ping':
          this.sendMessage({ type: 'pong', requestId })
          break

        default:
          throw new Error(`Unknown message type: ${type}`)
      }
    } catch (error) {
      console.error(`[MCP Proxy #${this.clientId}] Error handling ${type}:`, error)
      this.sendError(requestId, error.message)
    }
  }

  /**
   * Tool呼び出しを処理
   */
  async handleCallTool(message) {
    const { requestId, serverName, toolName, params } = message

    const client = this.mcpClients.get(serverName)
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`)
    }

    console.log(
      `[MCP Proxy #${this.clientId}] Calling tool: ${serverName}/${toolName}`,
      params
    )

    const result = await client.callTool({
      name: toolName,
      arguments: params || {}
    })

    this.sendMessage({
      type: 'toolResult',
      requestId,
      result: result.content
    })
  }

  /**
   * 利用可能なToolのリストを取得
   */
  async handleListTools(message) {
    const { requestId, serverName } = message

    if (serverName) {
      // 特定のサーバーのツールのみ
      const client = this.mcpClients.get(serverName)
      if (!client) {
        throw new Error(`MCP server not found: ${serverName}`)
      }

      const serverTools = await client.listTools()
      this.sendMessage({
        type: 'toolsList',
        requestId,
        tools: { [serverName]: serverTools.tools }
      })
    } else {
      // 全サーバーのツール
      const tools = {}
      for (const [name, client] of this.mcpClients.entries()) {
        try {
          const serverTools = await client.listTools()
          tools[name] = serverTools.tools
        } catch (error) {
          console.error(
            `[MCP Proxy #${this.clientId}] Failed to list tools for ${name}:`,
            error
          )
          tools[name] = []
        }
      }

      this.sendMessage({
        type: 'toolsList',
        requestId,
        tools
      })
    }
  }

  /**
   * 利用可能なResourceのリストを取得
   */
  async handleListResources(message) {
    const { requestId, serverName } = message

    if (serverName) {
      const client = this.mcpClients.get(serverName)
      if (!client) {
        throw new Error(`MCP server not found: ${serverName}`)
      }

      const serverResources = await client.listResources()
      this.sendMessage({
        type: 'resourcesList',
        requestId,
        resources: { [serverName]: serverResources.resources }
      })
    } else {
      const resources = {}
      for (const [name, client] of this.mcpClients.entries()) {
        try {
          const serverResources = await client.listResources()
          resources[name] = serverResources.resources
        } catch (error) {
          console.error(
            `[MCP Proxy #${this.clientId}] Failed to list resources for ${name}:`,
            error
          )
          resources[name] = []
        }
      }

      this.sendMessage({
        type: 'resourcesList',
        requestId,
        resources
      })
    }
  }

  /**
   * Resourceを読み取り
   */
  async handleReadResource(message) {
    const { requestId, serverName, uri } = message

    const client = this.mcpClients.get(serverName)
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`)
    }

    console.log(`[MCP Proxy #${this.clientId}] Reading resource: ${serverName}/${uri}`)

    const result = await client.readResource({ uri })

    this.sendMessage({
      type: 'resourceContent',
      requestId,
      content: result.contents
    })
  }

  /**
   * メッセージをクライアントに送信
   */
  sendMessage(message) {
    if (this.ws.readyState === 1) {
      // OPEN
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * エラーメッセージを送信
   */
  sendError(requestId, errorMessage) {
    this.sendMessage({
      type: 'error',
      requestId,
      error: errorMessage
    })
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    console.log(`[MCP Proxy #${this.clientId}] Cleaning up...`)

    for (const [name, client] of this.mcpClients.entries()) {
      try {
        await client.close()
        console.log(`[MCP Proxy #${this.clientId}] Closed connection to ${name}`)
      } catch (error) {
        console.error(`[MCP Proxy #${this.clientId}] Error closing ${name}:`, error)
      }
    }

    this.mcpClients.clear()
  }
}
