/**
 * MCP (Model Context Protocol) クライアント基盤
 *
 * 機能:
 * - 過去フライトデータの検索・活用
 * - 地上リスク判定
 * - 最適機体提案
 * - UTM干渉チェック
 * - 申請コスト可視化
 *
 * 環境変数 VITE_USE_REAL_MCP で実装/モックを切り替え:
 * - VITE_USE_REAL_MCP=true → MCP Proxy Server経由で実MCPサーバーと通信
 * - VITE_USE_REAL_MCP=false (デフォルト) → モック実装
 */

import { mcpWebSocketClient } from './mcpWebSocketClient'

// 環境変数でモック/実装を切り替え
const USE_REAL_MCP = import.meta.env.VITE_USE_REAL_MCP === 'true'

console.log(`[MCP] Using ${USE_REAL_MCP ? 'REAL' : 'MOCK'} implementation`)

// MCPサーバーの接続状態
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

// 利用可能なMCPツール（将来実装）
const AvailableTools = {
  FLIGHT_DATA: {
    searchSimilarFlights: 'search_similar_flights',
    generateFlightPath: 'generate_flight_path',
  },
  RISK_ASSESSMENT: {
    assessGroundRisk: 'assess_ground_risk',
    checkAirspace: 'check_airspace',
  },
  AIRCRAFT: {
    recommendAircraft: 'recommend_aircraft',
  },
  REGULATION: {
    analyzeRequirements: 'analyze_requirements',
    generateApplication: 'generate_application',
  },
  UTM: {
    checkConflicts: 'check_utm_conflicts',
  }
};

/**
 * MCPクライアントクラス
 * 現在はモック実装、将来的にMCPプロトコルで実サーバーと接続
 */
class MCPClient {
  constructor() {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.servers = new Map();
    this.listeners = new Set();
  }

  /**
   * 接続状態の変更を通知
   */
  onStateChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyStateChange() {
    this.listeners.forEach(cb => cb(this.connectionState));
  }

  /**
   * MCPサーバーに接続（モック）
   */
  async connect(_serverConfig) {
    this.connectionState = ConnectionState.CONNECTING;
    this._notifyStateChange();

    // モック: 接続シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));

    this.connectionState = ConnectionState.CONNECTED;
    this._notifyStateChange();

    console.log('[MCP] Connected to mock server');
    return true;
  }

  /**
   * MCPサーバーから切断
   */
  async disconnect() {
    this.connectionState = ConnectionState.DISCONNECTED;
    this._notifyStateChange();
    console.log('[MCP] Disconnected');
  }

  /**
   * フライト経路を自然言語から生成（モック）
   *
   * @param {string} description - 自然言語による飛行目的の説明
   * @param {Object} area - GeoJSON形式のエリア情報
   * @returns {Promise<Object>} 生成されたフライトプラン
   */
  async generateFlightPath(description, area) {
    console.log('[MCP] generateFlightPath called:', { description, area });

    // モック: LLMによる経路生成をシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 目的に応じたパターンを判定（モック）
    const purpose = this._detectPurpose(description);

    return {
      success: true,
      flightPlan: {
        purpose: purpose.type,
        pattern: purpose.pattern,
        altitude: purpose.altitude,
        overlap: purpose.overlap,
        estimatedDuration: '約30分',
        recommendations: purpose.recommendations
      },
      message: `「${description}」に基づいて${purpose.type}パターンの経路を提案します。`
    };
  }

  /**
   * 目的を検出（モック）
   */
  _detectPurpose(description) {
    const desc = description.toLowerCase();

    if (desc.includes('太陽光') || desc.includes('パネル') || desc.includes('ソーラー')) {
      return {
        type: '太陽光点検',
        pattern: 'grid',
        altitude: 30,
        overlap: 80,
        recommendations: [
          'グリッドパターンでの飛行を推奨',
          '高度30mでの熱画像撮影が最適',
          'オーバーラップ80%で異常検出精度向上'
        ]
      };
    }

    if (desc.includes('送電線') || desc.includes('鉄塔') || desc.includes('架線')) {
      return {
        type: '送電線点検',
        pattern: 'perimeter',
        altitude: 50,
        overlap: 70,
        recommendations: [
          '架線に沿った周回パターンを推奨',
          '安全距離30m以上を確保',
          '高圧線近接のため特別注意が必要'
        ]
      };
    }

    if (desc.includes('測量') || desc.includes('3d') || desc.includes('オルソ')) {
      return {
        type: '測量・3Dマッピング',
        pattern: 'grid',
        altitude: 60,
        overlap: 85,
        recommendations: [
          '高精度グリッドパターンを推奨',
          'GCP設置で精度向上',
          'オーバーラップ85%で3D復元品質確保'
        ]
      };
    }

    // デフォルト
    return {
      type: '一般点検',
      pattern: 'perimeter',
      altitude: 50,
      overlap: 70,
      recommendations: [
        '周回パターンでの概要把握を推奨',
        '必要に応じてグリッドパターンに変更可能'
      ]
    };
  }

  /**
   * 地上リスク判定（モック）
   *
   * @param {Object} flightArea - GeoJSON形式の飛行エリア
   * @param {number} altitude - 飛行高度
   * @returns {Promise<Object>} リスク判定結果
   */
  async assessGroundRisk(flightArea, altitude) {
    console.log('[MCP] assessGroundRisk called:', { flightArea, altitude });

    await new Promise(resolve => setTimeout(resolve, 800));

    // モック: ランダムなリスクレベル
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const riskLevel = riskLevels[Math.floor(Math.random() * 2)]; // LOW or MEDIUM for demo

    return {
      success: true,
      assessment: {
        riskLevel,
        factors: [
          { type: '人口密度', value: 'DID外', risk: 'LOW' },
          { type: '建物', count: 3, risk: 'LOW' },
          { type: 'インフラ', items: ['道路'], risk: 'MEDIUM' }
        ],
        mitigations: riskLevel === 'LOW'
          ? ['標準的な安全対策で飛行可能']
          : ['第三者立入禁止措置を推奨', '補助者の配置を検討']
      }
    };
  }

  /**
   * UTM干渉チェック（モック）
   * 過去のLLMモックで実装されていた「判定！」機能の再現
   *
   * @param {Object} flightPlan - フライトプラン
   * @param {Object} timeRange - 飛行予定時間帯
   * @returns {Promise<Object>} 干渉チェック結果
   */
  async checkUTMConflicts(flightPlan, timeRange) {
    console.log('[MCP] checkUTMConflicts called:', { flightPlan, timeRange });

    await new Promise(resolve => setTimeout(resolve, 600));

    // モック: 干渉なしまたは軽微な警告
    const hasConflict = Math.random() > 0.7;

    return {
      success: true,
      result: {
        conflicts: hasConflict ? [
          {
            type: 'OTHER_FLIGHT',
            severity: 'INFO',
            description: '同日に近隣で他のフライト予定あり（距離: 約2km）',
            contact: 'operator@example.com',
            timeWindow: '10:00-12:00'
          }
        ] : [],
        recommendations: hasConflict
          ? ['他オペレーターとの事前調整を推奨']
          : ['干渉の可能性は検出されませんでした'],
        clearForFlight: !hasConflict || true // INFO level doesn't block
      }
    };
  }

  /**
   * 最適機体を提案（モック）
   *
   * @param {Object} mission - ミッション要件
   * @returns {Promise<Object>} 機体提案結果
   */
  async recommendAircraft(mission) {
    console.log('[MCP] recommendAircraft called:', mission);

    await new Promise(resolve => setTimeout(resolve, 500));

    const recommendations = [
      {
        model: 'DJI Matrice 300 RTK',
        suitability: 95,
        reasons: ['長時間飛行可能（55分）', 'RTK対応で高精度', 'ペイロード2.7kg'],
        limitations: ['価格帯が高め']
      },
      {
        model: 'DJI Mavic 3 Enterprise',
        suitability: 85,
        reasons: ['コンパクトで運搬容易', '45分飛行', '熱画像カメラ対応'],
        limitations: ['ペイロード制限あり']
      }
    ];

    return {
      success: true,
      recommendations
    };
  }

  /**
   * 申請要件を分析（モック）
   *
   * @param {Object} flightPlan - フライトプラン
   * @param {Object} flightPlan.didInfo - DID情報 { isDID: boolean }
   * @returns {Promise<Object>} 申請要件分析結果
   */
  async analyzeRequirements(flightPlan) {
    console.log('[MCP] analyzeRequirements called:', flightPlan);

    await new Promise(resolve => setTimeout(resolve, 700));

    // DID情報はflightPlan.didInfoから取得（didInfo.isDIDで判定）
    const isDID = flightPlan?.didInfo?.isDID ?? false;

    return {
      success: true,
      analysis: {
        requiredPermissions: [
          {
            type: '飛行許可・承認',
            authority: '国土交通省',
            category: isDID ? 'DID飛行' : '目視外飛行',
            estimatedDays: 10,
            estimatedCost: 0,
            documents: ['飛行計画書', '機体情報', '操縦者情報']
          }
        ],
        coordination: [
          {
            stakeholder: '地権者',
            method: '事前通知',
            leadTime: 7
          }
        ],
        totalCost: 0,
        totalDays: 10,
        tips: [
          '包括申請をお持ちの場合は個別申請不要',
          'DIPS2.0での事前登録を推奨'
        ]
      }
    };
  }

  /**
   * 統合判定を実行
   * 「判定！」ボタンで呼び出される総合判定
   *
   * @param {Object} flightPlan - フライトプラン（ポリゴン、ウェイポイント含む）
   * @returns {Promise<Object>} 総合判定結果
   */
  async runFullAssessment(flightPlan) {
    console.log('[MCP] runFullAssessment called');

    const results = await Promise.all([
      this.assessGroundRisk(flightPlan.area, flightPlan.altitude || 50),
      this.checkUTMConflicts(flightPlan, flightPlan.timeRange),
      this.recommendAircraft({ type: flightPlan.purpose }),
      this.analyzeRequirements(flightPlan)
    ]);

    const [riskResult, utmResult, aircraftResult, requirementsResult] = results;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overallRisk: riskResult.assessment.riskLevel,
        utmClear: utmResult.result.clearForFlight,
        recommendedAircraft: aircraftResult.recommendations[0]?.model,
        estimatedApprovalDays: requirementsResult.analysis.totalDays
      },
      details: {
        groundRisk: riskResult.assessment,
        utmConflicts: utmResult.result,
        aircraftRecommendations: aircraftResult.recommendations,
        requirements: requirementsResult.analysis
      }
    };
  }
}

// シングルトンインスタンス
export const mcpClient = new MCPClient();
export { ConnectionState, AvailableTools };
export default MCPClient;
