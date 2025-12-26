import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
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
  Sparkles
} from 'lucide-react';
import { mcpClient } from '../../services/mcpClient';
import './FlightAssistant.scss';

/**
 * フライトアシスタント - 自然言語によるフライト計画支援
 *
 * 機能:
 * - 自然言語でフライト目的を入力
 * - 経路パターンの自動提案
 * - 「判定！」ボタンで総合判定（UTM干渉、リスク、申請要件）
 */
function FlightAssistant({ polygons, waypoints, onApplyPlan }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'こんにちは！フライト計画のお手伝いをします。\n\n飛行目的を教えてください。例：\n• 「静岡県の太陽光発電所、パネル点検」\n• 「送電線の架線点検」\n• 「建設現場の測量」'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [showAssessmentDetail, setShowAssessmentDetail] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      // MCPクライアントで経路生成を呼び出し
      const result = await mcpClient.generateFlightPath(
        userMessage,
        polygons.length > 0 ? polygons[0].geometry : null
      );

      if (result.success) {
        const plan = result.flightPlan;
        let response = `**${plan.purpose}**の経路を提案します。\n\n`;
        response += `📍 **推奨パターン**: ${plan.pattern === 'grid' ? 'グリッド' : '周回'}\n`;
        response += `🛫 **推奨高度**: ${plan.altitude}m\n`;
        response += `📐 **オーバーラップ**: ${plan.overlap}%\n`;
        response += `⏱️ **推定飛行時間**: ${plan.estimatedDuration}\n\n`;
        response += `**アドバイス:**\n`;
        plan.recommendations.forEach(rec => {
          response += `• ${rec}\n`;
        });

        if (polygons.length > 0) {
          response += `\n✅ ポリゴンが設定済みです。「判定！」ボタンで詳細なリスク判定ができます。`;
        } else {
          response += `\n⚠️ まず地図上でエリアを設定してください。`;
        }

        setMessages(prev => [...prev, { role: 'assistant', content: response, plan }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'すみません、処理中にエラーが発生しました。もう一度お試しください。'
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
      content: '🔍 総合判定を実行中...'
    }]);

    try {
      const result = await mcpClient.runFullAssessment({
        area: polygons[0].geometry,
        waypoints: waypoints,
        altitude: 50,
        purpose: '点検飛行'
      });

      setAssessmentResult(result);

      // 結果サマリーをメッセージに追加
      const summary = result.summary;
      const details = result.details;

      let response = `## 📋 判定結果\n\n`;

      // 総合リスク
      const riskIcon = summary.overallRisk === 'LOW' ? '🟢' :
        summary.overallRisk === 'MEDIUM' ? '🟡' : '🔴';
      response += `### ${riskIcon} 地上リスク: ${summary.overallRisk}\n`;
      details.groundRisk.factors.forEach(f => {
        response += `• ${f.type}: ${f.value || f.count || f.items?.join(', ')} (${f.risk})\n`;
      });
      response += '\n';

      // UTM干渉
      const utmIcon = summary.utmClear ? '✅' : '⚠️';
      response += `### ${utmIcon} UTM干渉チェック\n`;
      if (details.utmConflicts.conflicts.length === 0) {
        response += `• 干渉なし - 飛行可能\n`;
      } else {
        details.utmConflicts.conflicts.forEach(c => {
          response += `• ${c.description}\n`;
        });
      }
      response += '\n';

      // 推奨機体
      response += `### 🚁 推奨機体\n`;
      response += `• **${summary.recommendedAircraft}** (適合度: ${details.aircraftRecommendations[0]?.suitability}%)\n`;
      response += '\n';

      // 申請要件
      response += `### 📝 申請要件\n`;
      response += `• 承認取得目安: **${summary.estimatedApprovalDays}日**\n`;
      details.requirements.tips.forEach(tip => {
        response += `• ${tip}\n`;
      });

      setMessages(prev => {
        // システムメッセージを削除して結果を追加
        const filtered = prev.filter(m => m.role !== 'system');
        return [...filtered, { role: 'assistant', content: response, isAssessment: true }];
      });

    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.role !== 'system');
        return [...filtered, {
          role: 'assistant',
          content: '❌ 判定中にエラーが発生しました。'
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
      default:
        return <span className="risk-badge"><Info size={12} /> 不明</span>;
    }
  };

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
          <span className="beta-badge">BETA</span>
        </div>
        <button className="close-btn" onClick={() => setIsOpen(false)}>
          <X size={18} />
        </button>
      </div>

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
                if (line.startsWith('• ')) {
                  return <div key={i} className="bullet-item">{line}</div>;
                }
                return <p key={i}>{line}</p>;
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
          title={polygons.length === 0 ? 'まずエリアを設定してください' : '総合判定を実行'}
        >
          <Zap size={16} />
          判定！
        </button>
      </div>

      <div className="flight-assistant-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="飛行目的を入力..."
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

      {assessmentResult && (
        <div className="assessment-summary">
          <div
            className="summary-header"
            onClick={() => setShowAssessmentDetail(!showAssessmentDetail)}
          >
            <span>最新の判定結果</span>
            {getRiskBadge(assessmentResult.summary.overallRisk)}
            {showAssessmentDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {showAssessmentDetail && (
            <div className="summary-detail">
              <div className="detail-row">
                <Plane size={14} />
                <span>推奨機体: {assessmentResult.summary.recommendedAircraft}</span>
              </div>
              <div className="detail-row">
                <FileText size={14} />
                <span>承認目安: {assessmentResult.summary.estimatedApprovalDays}日</span>
              </div>
              <div className="detail-row">
                {assessmentResult.summary.utmClear ?
                  <CheckCircle size={14} className="success" /> :
                  <AlertTriangle size={14} className="warning" />
                }
                <span>UTM: {assessmentResult.summary.utmClear ? '干渉なし' : '要確認'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightAssistant;
