import { useState, useRef, useEffect } from 'react';
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
  Key,
  Trash2,
  ExternalLink,
  Shield,
  MapPin
} from 'lucide-react';
import { hasApiKey, setApiKey, getFlightAdvice } from '../../services/openaiService';
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
      // 実データに基づく分析を実行
      const result = await runFullAnalysis(polygons, waypoints, {
        altitude: 50,
        purpose: '点検飛行',
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

      // 用途地域情報（国土交通省API）
      if (result.context?.mlitInfo?.success) {
        const mlit = result.context.mlitInfo;
        response += `### 🏛️ 用途地域情報\n`;
        if (mlit.useZone?.zoneName) {
          response += `• ${mlit.useZone.zoneName}\n`;
        }
        if (mlit.urbanArea?.areaName) {
          response += `• ${mlit.urbanArea.areaName}\n`;
        }
        response += '\n';
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

          {hasKey ? (
            <div className="api-key-status">
              <div className="status-row">
                <CheckCircle size={16} className="success" />
                <span>設定済み</span>
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
            <span className="separator">|</span>
            <span className="model-info">gpt-4o-mini</span>
          </div>
        </div>

        <p className="settings-note">
          ※ APIキーはブラウザに保存（サーバー送信なし）
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
    <div className="flight-assistant">
      <div className="flight-assistant-header">
        <div className="header-title">
          <Sparkles size={18} />
          <span>フライトアシスタント</span>
          {hasMlitKey && <span className="mlit-badge">国交省</span>}
          {hasKey && <span className="ai-badge">AI</span>}
        </div>
        <div className="header-actions">
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
              {msg.content.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return <h3 key={i}>{line.replace('## ', '')}</h3>;
                }
                if (line.startsWith('### ')) {
                  return <h4 key={i}>{line.replace('### ', '')}</h4>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <strong key={i}>{line.replace(/\*\*/g, '')}</strong>;
                }
                if (line.startsWith('• ') || line.startsWith('- ')) {
                  return <div key={i} className="bullet-item">{line}</div>;
                }
                if (line.startsWith('---')) {
                  return <hr key={i} />;
                }
                return line ? <p key={i}>{line}</p> : null;
              })}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightAssistant;
