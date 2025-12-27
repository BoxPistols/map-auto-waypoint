import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  X,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Plane,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings,
  Trash2,
  ExternalLink,
  Shield,
  MapPin,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  hasApiKey,
  setApiKey,
  getFlightAdvice,
  AVAILABLE_MODELS,
  getSelectedModel,
  setSelectedModel,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
  isLocalModel
} from '../../services/openaiService';
import { runFullAnalysis, getFlightRecommendations, generateOptimizationPlan, calculateApplicationCosts } from '../../services/flightAnalyzer';
import { hasReinfolibApiKey, setReinfolibApiKey } from '../../services/reinfolibService';
import './FlightAssistant.scss';

/**
 * フライトアシスタント - AIによるフライト計画支援
 *
 * 機能:
 * - 自然言語でフライト目的を入力
 * - 実データに基づくリスク判定（空港、禁止区域）
 * - OpenAI連携による高度な分析
 * - 「判定！」ボタンで総合判定
 */
function FlightAssistant({ polygons, waypoints, onApplyPlan, onOptimizationUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());
  const [mlitKeyInput, setMlitKeyInput] = useState('');
  const [hasMlitKey, setHasMlitKey] = useState(hasReinfolibApiKey());
  const [selectedModelId, setSelectedModelId] = useState(getSelectedModel());
  const [localEndpoint, setLocalEndpointState] = useState(getLocalEndpoint());
  const [localModelName, setLocalModelNameState] = useState(getLocalModelName());
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'こんにちは！フライト計画のお手伝いをします。\n\n飛行目的を教えてください。例：\n• 「太陽光発電所のパネル点検」\n• 「送電線の架線点検」\n• 「建設現場の測量」'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [showAssessmentDetail, setShowAssessmentDetail] = useState(false);
  const [optimizationPlan, setOptimizationPlan] = useState(null);
  const [showOptimization, setShowOptimization] = useState(false);
  const [proposedPlan, setProposedPlan] = useState({ altitude: 50, purpose: '点検飛行' });
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // APIキー保存
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setHasKey(true);
      setApiKeyInput('');
      setShowSettings(false);
      setMessages(prev => [...prev, {
        role: 'system',
        content: '✅ OpenAI APIキーを保存しました。AI分析が有効になりました。'
      }]);
    }
  };

  // APIキー削除
  const handleDeleteApiKey = () => {
    if (confirm('OpenAI APIキーを削除しますか？')) {
      localStorage.removeItem('openai_api_key');
      setHasKey(false);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'OpenAI APIキーを削除しました。'
      }]);
    }
  };

  // 国土交通省APIキー保存
  const handleSaveMlitKey = () => {
    if (mlitKeyInput.trim()) {
      setReinfolibApiKey(mlitKeyInput.trim());
      setHasMlitKey(true);
      setMlitKeyInput('');
      setMessages(prev => [...prev, {
        role: 'system',
        content: '✅ 国土交通省APIキーを保存しました。用途地域・都市計画情報が利用可能になりました。'
      }]);
    }
  };

  // 国土交通省APIキー削除
  const handleDeleteMlitKey = () => {
    if (confirm('国土交通省APIキーを削除しますか？')) {
      localStorage.removeItem('reinfolib_api_key');
      setHasMlitKey(false);
      setMessages(prev => [...prev, {
        role: 'system',
        content: '国土交通省APIキーを削除しました。'
      }]);
    }
  };

  // OpenAIモデル変更
  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    setSelectedModelId(modelId);
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `✅ AIモデルを ${model?.name || modelId} に変更しました`
    }]);
  };

  // ローカルLLMエンドポイント保存
  const handleSaveLocalEndpoint = () => {
    setLocalEndpoint(localEndpoint);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `✅ ローカルLLMエンドポイントを設定しました: ${localEndpoint}`
    }]);
  };

  // ローカルLLMモデル名保存
  const handleSaveLocalModelName = () => {
    setLocalModelName(localModelName);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `✅ ローカルLLMモデル名を設定しました: ${localModelName}`
    }]);
  };

  // メッセージ送信
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      // OpenAI APIキーがある場合はAI応答を取得
      if (hasKey) {
        const response = await getFlightAdvice(userMessage, { polygons, waypoints });
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        // ローカル推奨パラメータを取得
        const recommendations = await getFlightRecommendations(userMessage);

        // 推奨パラメータをproposedPlanに保存（判定時に使用）
        setProposedPlan({
          altitude: recommendations.altitude,
          purpose: recommendations.purpose || userMessage,
          pattern: recommendations.pattern,
          camera: recommendations.camera
        });

        let response = `**推奨パラメータ**\n\n`;
        response += `📍 **パターン**: ${recommendations.pattern === 'grid' ? 'グリッド' : '周回'}\n`;
        response += `🛫 **推奨高度**: ${recommendations.altitude}m\n`;
        response += `📷 **カメラ**: ${recommendations.camera}\n`;
        response += `⏱️ **推定時間**: ${recommendations.estimatedFlightTime}\n\n`;
        response += `**推奨機体**:\n`;
        recommendations.recommendedAircraft.forEach(a => {
          response += `• ${a}\n`;
        });
        response += `\n**Tips**:\n`;
        recommendations.tips.forEach(t => {
          response += `• ${t}\n`;
        });

        if (polygons.length > 0) {
          response += `\n✅ ポリゴンが設定済み。「判定！」で詳細分析できます。`;
        } else {
          response += `\n⚠️ まず地図上でエリアを設定してください。`;
        }

        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('[FlightAssistant] handleSend error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `エラーが発生しました: ${error.message}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 推奨プランを適用
   */
  const handleApplyOptimization = () => {
    if (!optimizationPlan?.hasIssues) return;

    const plan = {
      waypoints: optimizationPlan.recommendedWaypoints,
      polygon: optimizationPlan.recommendedPolygon
    };

    // 適用前に確認
    const modifiedCount = plan.waypoints.filter(w => w.modified).length;
    const message = `${modifiedCount}個のWaypointを安全な位置に移動します。適用しますか？`;

    if (confirm(message)) {
      onApplyPlan(plan);
      setOptimizationPlan(null);
      setShowOptimization(false);

      setMessages(prev => [...prev, {
        role: 'system',
        content: `✅ ${modifiedCount}個のWaypointを安全な位置に移動しました。`
      }]);
    }
  };

  /**
   * 「判定！」ボタン - 総合判定を実行
   */
  const handleAssessment = async () => {
    if (polygons.length === 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 判定を行うには、まず地図上でエリア（ポリゴン）を設定してください。'
      }]);
      return;
    }

    setIsProcessing(true);
    setMessages(prev => [...prev, {
      role: 'system',
      content: '🔍 実データに基づく分析を実行中...'
    }]);

    try {
      // 実データに基づく分析を実行（proposedPlanから高度・目的を取得）
      const result = await runFullAnalysis(polygons, waypoints, {
        altitude: proposedPlan.altitude || 50,
        purpose: proposedPlan.purpose || '点検飛行',
        useAI: hasKey
      });

      setAssessmentResult(result);

      // 結果をメッセージに整形
      let response = `## 📋 判定結果\n\n`;

      // リスクレベル
      const riskIcon = result.riskLevel === 'LOW' ? '🟢' :
        result.riskLevel === 'MEDIUM' ? '🟡' :
          result.riskLevel === 'HIGH' ? '🟠' : '🔴';
      response += `### ${riskIcon} リスクレベル: ${result.riskLevel}\n`;
      response += `${result.summary}\n\n`;

      // リスク詳細
      if (result.risks.length > 0) {
        response += `### ⚠️ 検出されたリスク\n`;
        result.risks.forEach(r => {
          const icon = r.severity === 'critical' ? '🔴' :
            r.severity === 'high' ? '🟠' :
              r.severity === 'medium' ? '🟡' : '🟢';
          response += `${icon} ${r.description}\n`;
        });
        response += '\n';
      }

      // 空港情報
      if (result.context?.nearestAirport) {
        const airport = result.context.nearestAirport;
        response += `### 🛫 最寄り空港\n`;
        response += `${airport.name}: ${(airport.distance / 1000).toFixed(1)}km\n\n`;
      }

      // DID情報
      if (result.context?.didInfo) {
        const did = result.context.didInfo;
        response += `### 🏘️ 人口集中地区（DID）\n`;
        if (did.isDID) {
          response += `⚠️ ${did.description}\n`;
        } else {
          response += `✅ ${did.description}\n`;
        }
        response += '\n';
      }

      // 用途地域情報（国土交通省API）- エラーでないもののみ表示
      if (result.context?.mlitInfo?.success) {
        const mlit = result.context.mlitInfo;
        const useZoneName = mlit.useZone?.success && mlit.useZone?.zoneName && mlit.useZone.zoneName !== '取得エラー'
          ? mlit.useZone.zoneName : null;
        const urbanAreaName = mlit.urbanArea?.success && mlit.urbanArea?.areaName && mlit.urbanArea.areaName !== '取得エラー'
          ? mlit.urbanArea.areaName : null;

        if (useZoneName || urbanAreaName) {
          response += `### 🏛️ 用途地域情報\n`;
          if (useZoneName) {
            response += `• ${useZoneName}\n`;
          }
          if (urbanAreaName) {
            response += `• ${urbanAreaName}\n`;
          }
          response += '\n';
        }
      }

      // UTM干渉チェック
      if (result.utmCheck?.checked) {
        const utm = result.utmCheck;
        response += `### 📡 UTM干渉チェック\n`;
        if (utm.clearForFlight) {
          response += `✅ ${utm.message}\n`;
        } else {
          response += `⚠️ ${utm.message}\n`;
          utm.conflicts.forEach(c => {
            response += `• ${c.operator}: ${c.recommendation}\n`;
          });
        }
        response += '\n';
      }

      // 機体推奨
      if (result.aircraftRecommendations && result.aircraftRecommendations.length > 0) {
        response += `### 🚁 推奨機体\n`;
        result.aircraftRecommendations.slice(0, 2).forEach((a, i) => {
          response += `${i + 1}. **${a.model}** (適合度: ${a.suitability}%)\n`;
          response += `   • ${a.reasons.slice(0, 2).join(', ')}\n`;
        });
        response += '\n';
      }

      // 推奨事項
      response += `### 💡 推奨事項\n`;
      result.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
      response += '\n';

      // 必要な許可
      if (result.requiredPermissions.length > 0) {
        response += `### 📝 必要な許可\n`;
        result.requiredPermissions.forEach(p => {
          response += `• ${p}\n`;
        });
        response += `\n承認取得目安: **${result.estimatedApprovalDays}日**\n`;
      }

      // 申請コスト詳細
      const applicationCosts = calculateApplicationCosts(result);
      if (applicationCosts.applications.length > 0) {
        response += `\n### 📋 申請タイムライン\n`;
        applicationCosts.timeline.forEach(t => {
          response += `• Day ${t.day}: ${t.event}\n`;
        });
        response += `\n**必要書類**: ${applicationCosts.requiredDocuments.slice(0, 4).join('、')}\n`;
        if (applicationCosts.tips.length > 0) {
          response += `\n💡 ${applicationCosts.tips[0]}\n`;
        }
      }

      // ギャップ分析と最適化提案
      const optimization = generateOptimizationPlan(polygons, waypoints);
      setOptimizationPlan(optimization);

      // 親コンポーネントに通知（マップオーバーレイ用）
      if (onOptimizationUpdate) {
        onOptimizationUpdate(optimization);
      }

      if (optimization.hasIssues) {
        response += `### 🔧 プラン最適化の提案\n`;
        response += `${optimization.summary}\n`;
        optimization.actions.forEach(action => {
          response += `• ${action}\n`;
        });

        // ギャップの詳細
        if (optimization.waypointAnalysis.gaps.length > 0) {
          response += `\n**Waypointの問題:**\n`;
          optimization.waypointAnalysis.gaps.slice(0, 3).forEach(gap => {
            response += `• WP${gap.waypointIndex}: ${gap.issues[0].zone}から${gap.moveDistance}m移動が必要\n`;
          });
          if (optimization.waypointAnalysis.gaps.length > 3) {
            response += `• ...他${optimization.waypointAnalysis.gaps.length - 3}件\n`;
          }
        }

        response += `\n⬇️ 下の「推奨プランを適用」ボタンで自動修正できます\n`;
        setShowOptimization(true);
      } else {
        response += `\n### ✅ プラン検証\n`;
        response += `すべてのWaypointは安全な位置にあります。\n`;
        setShowOptimization(false);
      }

      // 連携状態
      response += `\n---\n`;
      const sources = [];
      if (result.mlitEnhanced) sources.push('🏛️国交省API');
      if (result.aiEnhanced) sources.push('🤖OpenAI');
      if (sources.length === 0) sources.push('📊ローカル');
      response += `データソース: ${sources.join(' + ')}`;

      setMessages(prev => {
        const filtered = prev.filter(m => m.role !== 'system');
        return [...filtered, { role: 'assistant', content: response, isAssessment: true }];
      });

    } catch (error) {
      console.error('[FlightAssistant] handleAssessment error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.role !== 'system');
        return [...filtered, {
          role: 'assistant',
          content: `❌ 分析中にエラーが発生しました: ${error.message}`
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 判定結果をエクスポート
   */
  const handleExportResult = () => {
    if (!assessmentResult) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');

    // テキスト形式でエクスポート
    let content = `フライト判定結果\n`;
    content += `================\n`;
    content += `日時: ${now.toLocaleString('ja-JP')}\n\n`;

    content += `【リスクレベル】\n`;
    content += `${assessmentResult.riskLevel} (スコア: ${assessmentResult.riskScore}/100)\n`;
    content += `${assessmentResult.summary}\n\n`;

    if (assessmentResult.risks.length > 0) {
      content += `【検出されたリスク】\n`;
      assessmentResult.risks.forEach(r => {
        content += `- [${r.severity}] ${r.description}\n`;
      });
      content += '\n';
    }

    if (assessmentResult.context?.nearestAirport) {
      content += `【最寄り空港】\n`;
      content += `${assessmentResult.context.nearestAirport.name}: ${(assessmentResult.context.nearestAirport.distance / 1000).toFixed(1)}km\n\n`;
    }

    if (assessmentResult.context?.didInfo) {
      content += `【DID情報】\n`;
      content += `${assessmentResult.context.didInfo.description}\n\n`;
    }

    content += `【推奨事項】\n`;
    assessmentResult.recommendations.forEach(rec => {
      content += `- ${rec}\n`;
    });
    content += '\n';

    if (assessmentResult.requiredPermissions.length > 0) {
      content += `【必要な許可】\n`;
      assessmentResult.requiredPermissions.forEach(p => {
        content += `- ${p}\n`;
      });
      content += `承認取得目安: ${assessmentResult.estimatedApprovalDays}日\n\n`;
    }

    // Waypointデータ
    if (waypoints.length > 0) {
      content += `【Waypoint一覧】\n`;
      waypoints.forEach((wp, i) => {
        content += `WP${i + 1}: ${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}`;
        if (wp.altitude) content += ` (高度: ${wp.altitude}m)`;
        content += '\n';
      });
      content += '\n';
    }

    content += `================\n`;
    content += `データソース: ${assessmentResult.aiEnhanced ? 'OpenAI + ローカル' : 'ローカル分析'}\n`;

    // ダウンロード
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-assessment-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'LOW':
        return <span className="risk-badge low"><CheckCircle size={12} /> 低リスク</span>;
      case 'MEDIUM':
        return <span className="risk-badge medium"><AlertTriangle size={12} /> 中リスク</span>;
      case 'HIGH':
        return <span className="risk-badge high"><AlertTriangle size={12} /> 高リスク</span>;
      case 'CRITICAL':
        return <span className="risk-badge critical"><Shield size={12} /> 飛行禁止</span>;
      default:
        return <span className="risk-badge"><Info size={12} /> 不明</span>;
    }
  };

  // 設定パネル
  const renderSettings = () => (
    <div className="settings-panel">
      <div className="settings-header">
        <h3><Settings size={16} /> API設定</h3>
        <button className="close-btn" onClick={() => setShowSettings(false)}>
          <X size={16} />
        </button>
      </div>

      <div className="settings-content">
        {/* 国土交通省API */}
        <div className="settings-section">
          <h4>🏛️ 国土交通省 不動産情報ライブラリ</h4>
          <div className="settings-info">
            <p>用途地域・都市計画情報を取得できます：</p>
            <ul>
              <li>住居/商業/工業地域の判定</li>
              <li>市街化区域/調整区域の判定</li>
              <li>DID（人口集中地区）の参考情報</li>
            </ul>
          </div>

          {hasMlitKey ? (
            <div className="api-key-status">
              <div className="status-row">
                <CheckCircle size={16} className="success" />
                <span>設定済み</span>
              </div>
              <button className="delete-btn" onClick={handleDeleteMlitKey}>
                <Trash2 size={14} /> 削除
              </button>
            </div>
          ) : (
            <div className="api-key-input">
              <input
                type="text"
                value={mlitKeyInput}
                onChange={(e) => setMlitKeyInput(e.target.value)}
                placeholder="APIキー"
              />
              <button
                className="save-btn"
                onClick={handleSaveMlitKey}
                disabled={!mlitKeyInput.trim()}
              >
                保存
              </button>
            </div>
          )}

          <div className="settings-links">
            <a
              href="https://www.reinfolib.mlit.go.jp/api/request/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={12} /> APIキーを申請
            </a>
          </div>
        </div>

        <hr className="settings-divider" />

        {/* OpenAI API */}
        <div className="settings-section">
          <h4>🤖 OpenAI API（オプション）</h4>
          <div className="settings-info">
            <p>高度なAI分析が有効になります：</p>
            <ul>
              <li>自然言語での質問応答</li>
              <li>詳細なアドバイス生成</li>
            </ul>
          </div>

          {/* モデル選択（常に表示） */}
          <div className="model-selector">
            <label>AIモデル:</label>
            <select
              value={selectedModelId}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.cost}) - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* ローカルLLM設定 */}
          {isLocalModel(selectedModelId) ? (
            <div className="local-llm-settings">
              <div className="settings-info">
                <p>LM Studio等のローカルLLMサーバーを使用：</p>
              </div>
              <div className="local-input-group">
                <label>エンドポイント:</label>
                <input
                  type="text"
                  value={localEndpoint}
                  onChange={(e) => setLocalEndpointState(e.target.value)}
                  placeholder="http://localhost:1234/v1/chat/completions"
                />
                <button
                  className="save-btn"
                  onClick={handleSaveLocalEndpoint}
                >
                  保存
                </button>
              </div>
              <div className="local-input-group">
                <label>モデル名:</label>
                <input
                  type="text"
                  value={localModelName}
                  onChange={(e) => setLocalModelNameState(e.target.value)}
                  placeholder="local-model"
                />
                <button
                  className="save-btn"
                  onClick={handleSaveLocalModelName}
                >
                  保存
                </button>
              </div>
              <p className="settings-note local-note">
                💡 LM Studioを起動し、サーバーを開始してください
              </p>
            </div>
          ) : (
            <>
              {/* OpenAI APIキー設定 */}
              {hasKey ? (
                <div className="api-key-status">
                  <div className="status-row">
                    <CheckCircle size={16} className="success" />
                    <span>APIキー設定済み</span>
                  </div>
                  <button className="delete-btn" onClick={handleDeleteApiKey}>
                    <Trash2 size={14} /> 削除
                  </button>
                </div>
              ) : (
                <div className="api-key-input">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                  />
                  <button
                    className="save-btn"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    保存
                  </button>
                </div>
              )}

              <div className="settings-links">
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={12} /> APIキーを取得
                </a>
              </div>
            </>
          )}
        </div>

        <p className="settings-note">
          ※ 設定はブラウザに保存（サーバー送信なし）
        </p>
      </div>
    </div>
  );

  if (!isOpen) {
    return (
      <button
        className="flight-assistant-fab"
        onClick={() => setIsOpen(true)}
        title="フライトアシスタント"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className={`flight-assistant ${isExpanded ? 'expanded' : ''}`}>
      <div className="flight-assistant-header">
        <div className="header-title">
          <Sparkles size={18} />
          <span>フライトアシスタント</span>
          {hasMlitKey && <span className="mlit-badge">国交省</span>}
          {hasKey && <span className="ai-badge">AI</span>}
        </div>
        <div className="header-actions">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '縮小' : '拡大'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            className={`settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="設定"
          >
            <Settings size={16} />
          </button>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>

      {showSettings && renderSettings()}

      <div className="flight-assistant-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">
                <Sparkles size={14} />
              </div>
            )}
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant">
            <div className="message-avatar">
              <Sparkles size={14} />
            </div>
            <div className="message-content typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flight-assistant-actions">
        <button
          className="assessment-btn"
          onClick={handleAssessment}
          disabled={isProcessing || polygons.length === 0}
          title={polygons.length === 0 ? 'まずエリアを設定してください' : '実データに基づく総合判定'}
        >
          <Zap size={16} />
          判定！
        </button>
        <div className="action-info">
          <MapPin size={12} />
          <span>{polygons.length}エリア / {waypoints.length}WP</span>
        </div>
      </div>

      <div className="flight-assistant-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={hasKey ? '質問を入力...' : '飛行目的を入力...'}
          rows={1}
          disabled={isProcessing}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Optimization Panel */}
      {showOptimization && optimizationPlan?.hasIssues && (
        <div className="optimization-panel">
          <div className="optimization-header">
            <AlertTriangle size={14} className="warning" />
            <span>プラン最適化が可能</span>
          </div>
          <div className="optimization-content">
            <p className="optimization-summary">{optimizationPlan.summary}</p>
            <ul className="optimization-actions">
              {optimizationPlan.actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
            <button
              className="apply-optimization-btn"
              onClick={handleApplyOptimization}
            >
              <Zap size={14} />
              推奨プランを適用
            </button>
          </div>
        </div>
      )}

      {assessmentResult && (
        <div className="assessment-summary">
          <div
            className="summary-header"
            onClick={() => setShowAssessmentDetail(!showAssessmentDetail)}
          >
            <span>最新の判定結果</span>
            {getRiskBadge(assessmentResult.riskLevel)}
            {showAssessmentDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {showAssessmentDetail && (
            <div className="summary-detail">
              <div className="detail-row">
                <Shield size={14} />
                <span>スコア: {assessmentResult.riskScore}/100</span>
              </div>
              {assessmentResult.context?.nearestAirport && (
                <div className="detail-row">
                  <Plane size={14} />
                  <span>最寄空港: {assessmentResult.context.nearestAirport.name}</span>
                </div>
              )}
              <div className="detail-row">
                <FileText size={14} />
                <span>承認目安: {assessmentResult.estimatedApprovalDays}日</span>
              </div>
              <div className="detail-row source">
                {assessmentResult.aiEnhanced ? '🤖 AI分析' : '📊 ローカル分析'}
              </div>
              <button className="export-btn" onClick={handleExportResult}>
                <Download size={14} />
                結果をエクスポート
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightAssistant;
