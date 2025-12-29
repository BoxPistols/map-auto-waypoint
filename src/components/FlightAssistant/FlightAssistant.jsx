import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Minimize2,
  Copy,
  Check,
  Expand,
  Shrink,
  Route
} from 'lucide-react';
import {
  hasApiKey,
  setApiKey,
  getFlightAdvice,
  generateFlightRoute,
  AVAILABLE_MODELS,
  getSelectedModel,
  setSelectedModel,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
  isLocalModel
} from '../../services/openaiService';
import { runFullAnalysis, generateOptimizationPlan, calculateApplicationCosts } from '../../services/flightAnalyzer';
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
function FlightAssistant({ polygons, waypoints, onApplyPlan, onOptimizationUpdate, onWaypointSelect }) {
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
      content: '**フライト判定アシスタント**\n\n地図上でエリア/Waypointを設定し、「判定！」ボタンで安全性を分析します。\n\n**判定内容:**\n• DID（人口集中地区）チェック\n• 空港・禁止区域チェック\n• 必要な許可の確認\n• Waypointの最適化提案'
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 400, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const [routePurpose, setRoutePurpose] = useState('');
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * テキスト内のWP番号をクリック可能なリンクに変換
   * マッチパターン: [WP21], WP21, WP 21, WP:21, WP: 21, 27, 28
   */
  const renderTextWithWPLinks = (text) => {
    if (typeof text !== 'string') return text;

    const parts = [];
    let remaining = text;
    let keyCounter = 0;

    // パターン1: WP + 番号（カンマ区切りの連続番号も含む）
    // 例: "WP: 21, 27, 28" や "WP 21" や "WP21"
    const wpGroupPattern = /(\[?WP\s*:?\s*)(\d+(?:\s*,\s*\d+)*)\]?/gi;

    let lastIndex = 0;
    let match;

    while ((match = wpGroupPattern.exec(text)) !== null) {
      // マッチ前のテキストを追加
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const prefix = match[1]; // "WP: " や "WP" など
      const numbersStr = match[2]; // "21, 27, 28" や "21"
      const fullMatch = match[0];

      // カンマ区切りの番号を分割してリンクに変換
      const numbers = numbersStr.split(/\s*,\s*/);
      numbers.forEach((numStr, idx) => {
        const wpIndex = parseInt(numStr.trim(), 10);
        if (idx === 0) {
          parts.push(prefix.replace(/\[/, '')); // 最初の番号の前にprefixを追加（ブラケット除去）
        } else {
          parts.push(', '); // 2番目以降はカンマを追加
        }
        parts.push(
          <span
            key={`wp-${keyCounter++}`}
            className="wp-link"
            onClick={() => onWaypointSelect?.(wpIndex)}
            title={`WP${wpIndex}を地図上で表示`}
          >
            {wpIndex}
          </span>
        );
      });

      // 閉じブラケットがある場合
      if (fullMatch.endsWith(']')) {
        parts.push(']');
      }

      lastIndex = match.index + fullMatch.length;
    }

    // 残りのテキストを追加
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  /**
   * ReactMarkdown用カスタムコンポーネント
   */
  const markdownComponents = {
    // テキストノードでWPリンクを変換
    p: ({ children }) => <p>{React.Children.map(children, child =>
      typeof child === 'string' ? renderTextWithWPLinks(child) : child
    )}</p>,
    li: ({ children }) => <li>{React.Children.map(children, child =>
      typeof child === 'string' ? renderTextWithWPLinks(child) : child
    )}</li>,
    td: ({ children }) => <td>{React.Children.map(children, child =>
      typeof child === 'string' ? renderTextWithWPLinks(child) : child
    )}</td>,
    strong: ({ children }) => <strong>{React.Children.map(children, child =>
      typeof child === 'string' ? renderTextWithWPLinks(child) : child
    )}</strong>,
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // リサイズハンドラー
  const handleResizeStart = useCallback((e, direction) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panelSize.width,
      startHeight: panelSize.height,
      direction
    };
  }, [panelSize]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing) return;

    const { startX, startY, startWidth, startHeight, direction } = resizeRef.current;
    const deltaX = startX - e.clientX;
    const deltaY = startY - e.clientY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    if (direction.includes('left')) {
      newWidth = Math.max(360, Math.min(window.innerWidth - 48, startWidth + deltaX));
    }
    if (direction.includes('top')) {
      newHeight = Math.max(300, Math.min(window.innerHeight - 48, startHeight + deltaY));
    }

    setPanelSize({ width: newWidth, height: newHeight });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // フルスクリーン切り替え
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsExpanded(false);
    }
  };

  // APIキー保存
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setHasKey(true);
      setApiKeyInput('');
      setShowSettings(false);
      setMessages(prev => [...prev, {
        role: 'system',
        content: '[OK] OpenAI APIキーを保存しました。AI分析が有効になりました。'
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
        content: '[OK] 国土交通省APIキーを保存しました。用途地域・都市計画情報が利用可能になりました。'
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
      content: `[OK] AIモデルを ${model?.name || modelId} に変更しました`
    }]);
  };

  // ローカルLLMエンドポイント保存
  const handleSaveLocalEndpoint = () => {
    setLocalEndpoint(localEndpoint);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `[OK] ローカルLLMエンドポイントを設定: ${localEndpoint}`
    }]);
  };

  // ローカルLLMモデル名保存
  const handleSaveLocalModelName = () => {
    setLocalModelName(localModelName);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `[OK] ローカルLLMモデル名を設定: ${localModelName}`
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
      // OpenAI APIキーがある場合のみAI応答を取得
      if (hasKey) {
        const response = await getFlightAdvice(userMessage, { polygons, waypoints });
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        // AI未設定時は判定機能への誘導
        let response = '現在、ローカル分析モードで動作しています。\n\n';

        if (polygons.length > 0 || waypoints.length > 0) {
          response += `**現在の設定:**\n`;
          response += `• エリア: ${polygons.length}件\n`;
          response += `• Waypoint: ${waypoints.length}件\n\n`;
          response += `「**判定！**」ボタンをクリックして安全性分析を実行してください。`;
        } else {
          response += `**使い方:**\n`;
          response += `1. 地図上でエリアまたはWaypointを設定\n`;
          response += `2. 「判定！」ボタンで安全性を分析\n\n`;
          response += `AI質問機能を使用するには、設定からOpenAI APIキーを登録してください。`;
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
        content: `[OK] ${modifiedCount}個のWaypointを安全な位置に移動しました。`
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
        content: '[!] 判定を行うには、まず地図上でエリア（ポリゴン）を設定してください。'
      }]);
      return;
    }

    setIsProcessing(true);
    setMessages(prev => [...prev, {
      role: 'system',
      content: '実データに基づく分析を実行中...'
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
      let response = `## 判定結果\n\n`;

      // リスクレベル
      const riskLabel = result.riskLevel === 'LOW' ? '[LOW]' :
        result.riskLevel === 'MEDIUM' ? '[MEDIUM]' :
          result.riskLevel === 'HIGH' ? '[HIGH]' : '[CRITICAL]';
      response += `### ${riskLabel} リスクレベル: ${result.riskLevel}\n`;
      response += `${result.summary}\n\n`;

      // リスク詳細
      if (result.risks.length > 0) {
        response += `### 検出されたリスク\n`;
        result.risks.forEach(r => {
          const label = r.severity === 'critical' ? '[CRITICAL]' :
            r.severity === 'high' ? '[HIGH]' :
              r.severity === 'medium' ? '[MEDIUM]' : '[LOW]';
          response += `${label} ${r.description}\n`;
        });
        response += '\n';
      }

      // 空港情報
      if (result.context?.nearestAirport) {
        const airport = result.context.nearestAirport;
        response += `### 最寄り空港\n`;
        response += `${airport.name}: ${(airport.distance / 1000).toFixed(1)}km\n\n`;
      }

      // DID情報
      if (result.context?.didInfo) {
        const did = result.context.didInfo;
        response += `### 人口集中地区（DID）\n`;
        if (did.isDID) {
          response += `[!] ${did.description}\n`;
          // DID内のWaypoint詳細を表示
          if (did.waypointDetails?.areaSummaries) {
            response += `\n**DID内のWaypoint:**\n`;
            for (const area of did.waypointDetails.areaSummaries) {
              response += `• ${area.area}: WP ${area.waypointIndices.join(', ')}\n`;
            }
          }
        } else {
          response += `[OK] ${did.description}\n`;
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
          response += `### 用途地域情報\n`;
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
        response += `### UTM干渉チェック\n`;
        if (utm.clearForFlight) {
          response += `[OK] ${utm.message}\n`;
        } else {
          response += `[!] ${utm.message}\n`;
          utm.conflicts.forEach(c => {
            response += `• ${c.operator}: ${c.recommendation}\n`;
          });
        }
        response += '\n';
      }

      // 機体推奨
      if (result.aircraftRecommendations && result.aircraftRecommendations.length > 0) {
        response += `### 推奨機体\n`;
        result.aircraftRecommendations.slice(0, 2).forEach((a, i) => {
          response += `${i + 1}. **${a.model}** (適合度: ${a.suitability}%)\n`;
          response += `   • ${a.reasons.slice(0, 2).join(', ')}\n`;
        });
        response += '\n';
      }

      // 推奨事項
      response += `### 推奨事項\n`;
      result.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
      response += '\n';

      // 必要な許可
      if (result.requiredPermissions.length > 0) {
        response += `### 必要な許可\n`;
        result.requiredPermissions.forEach(p => {
          response += `• ${p}\n`;
        });
        response += `\n承認取得目安: **${result.estimatedApprovalDays}日**\n`;
      }

      // 申請コスト詳細
      const applicationCosts = calculateApplicationCosts(result);
      if (applicationCosts.applications.length > 0) {
        response += `\n### 申請タイムライン\n`;
        applicationCosts.timeline.forEach(t => {
          response += `• Day ${t.day}: ${t.event}\n`;
        });
        response += `\n**必要書類**: ${applicationCosts.requiredDocuments.slice(0, 4).join('、')}\n`;
        if (applicationCosts.tips.length > 0) {
          response += `\nTIP: ${applicationCosts.tips[0]}\n`;
        }
      }

      // ギャップ分析と最適化提案（DID情報を渡す）
      console.log('[FlightAssistant] DID Info:', result.context?.didInfo);
      console.log('[FlightAssistant] DID waypointDetails:', result.context?.didInfo?.waypointDetails);
      const optimization = generateOptimizationPlan(polygons, waypoints, result.context?.didInfo);
      console.log('[FlightAssistant] Optimization result:', optimization);
      setOptimizationPlan(optimization);

      // 親コンポーネントに通知（マップオーバーレイ用）
      if (onOptimizationUpdate) {
        onOptimizationUpdate(optimization);
      }

      if (optimization.hasIssues) {
        response += `### プラン最適化の提案\n`;
        response += `${optimization.summary}\n\n`;

        // As-is / To-be 比較テーブル
        if (optimization.waypointAnalysis.gaps.length > 0) {
          response += `**As-is → To-be 比較:**\n\n`;
          response += `| WP | 問題 | 対応 |\n`;
          response += `|----|------|------|\n`;
          optimization.waypointAnalysis.gaps.forEach(gap => {
            const issue = gap.issues[0];
            let issueText;
            let actionText;
            if (issue.type === 'airport') {
              issueText = `空港: ${issue.zone}`;
              actionText = gap.moveDistance ? `${Math.round(gap.moveDistance)}m移動` : '要移動';
            } else if (issue.type === 'prohibited') {
              issueText = `禁止: ${issue.zone}`;
              actionText = gap.moveDistance ? `${Math.round(gap.moveDistance)}m移動` : '要移動';
            } else if (issue.type === 'did') {
              issueText = `DID: ${issue.zone}`;
              actionText = '許可申請必要';
            } else {
              issueText = issue.zone;
              actionText = '-';
            }
            response += `| [WP${gap.waypointIndex}] | ${issueText} | ${actionText} |\n`;
          });
          response += `\n`;
        }

        response += `**推奨アクション:**\n`;
        optimization.actions.forEach(action => {
          response += `• ${action}\n`;
        });

        // DID以外の問題がある場合のみ「推奨プランを適用」ボタンを表示
        const hasNonDIDIssues = optimization.waypointAnalysis.gaps.some(
          g => g.issues.some(i => i.type !== 'did')
        );
        if (hasNonDIDIssues) {
          response += `\n下の「推奨プランを適用」ボタンで自動修正できます\n`;
        }
        setShowOptimization(true);
      } else {
        response += `\n### プラン検証 [OK]\n`;
        response += `すべてのWaypointは安全な位置にあります。\n`;
        setShowOptimization(false);
      }

      // 連携状態
      response += `\n---\n`;
      const sources = [];
      if (result.mlitEnhanced) sources.push('[MLIT] 国交省API');
      if (result.aiEnhanced) sources.push('[AI] OpenAI');
      if (sources.length === 0) sources.push('[LOCAL] ローカル分析');
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
          content: `[ERROR] 分析中にエラーが発生しました: ${error.message}`
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * AI経路生成
   */
  const handleGenerateRoute = async () => {
    if (polygons.length === 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '[!] 経路を生成するには、まず地図上でエリア（ポリゴン）を設定してください。'
      }]);
      return;
    }

    if (!hasKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '[!] AI経路生成にはOpenAI APIキーが必要です。設定から登録してください。'
      }]);
      return;
    }

    const purpose = routePurpose.trim() || '一般点検飛行';
    setIsGeneratingRoute(true);
    setMessages(prev => [...prev, {
      role: 'system',
      content: `AI経路生成中... (目的: ${purpose})`
    }]);

    try {
      const result = await generateFlightRoute(polygons[0], purpose, {
        altitude: proposedPlan.altitude || 50,
        pattern: 'auto'
      });

      if (result.success && result.waypoints?.length > 0) {
        // 生成されたWaypointを適用
        const plan = {
          waypoints: result.waypoints.map(wp => ({
            ...wp,
            modified: true
          })),
          polygon: null
        };

        let response = `### AI経路生成完了\n\n`;
        response += `**パターン:** ${result.pattern}\n`;
        response += `**Waypoint数:** ${result.waypoints.length}個\n`;
        response += `**推定距離:** ${result.estimatedDistance}\n`;
        response += `**推定時間:** ${result.estimatedTime}\n\n`;

        if (result.recommendations?.length > 0) {
          response += `**推奨事項:**\n`;
          result.recommendations.forEach(rec => {
            response += `• ${rec}\n`;
          });
        }

        response += `\n「適用」ボタンで地図に反映できます。`;

        setMessages(prev => {
          const filtered = prev.filter(m => m.role !== 'system');
          return [...filtered, {
            role: 'assistant',
            content: response,
            generatedRoute: plan
          }];
        });
      } else {
        throw new Error('経路生成に失敗しました');
      }
    } catch (error) {
      console.error('[FlightAssistant] handleGenerateRoute error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.role !== 'system');
        return [...filtered, {
          role: 'assistant',
          content: `[ERROR] 経路生成エラー: ${error.message}`
        }];
      });
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  /**
   * 判定結果をMarkdown形式で生成
   */
  const generateAssessmentText = () => {
    if (!assessmentResult) return '';

    const now = new Date();
    let content = `# フライト判定結果\n\n`;
    content += `**判定日時:** ${now.toLocaleString('ja-JP')}\n\n`;
    content += `---\n\n`;

    // リスクレベル
    content += `## リスクレベル\n\n`;
    const riskEmoji = assessmentResult.riskLevel === 'LOW' ? '✅' :
      assessmentResult.riskLevel === 'MEDIUM' ? '⚠️' :
      assessmentResult.riskLevel === 'HIGH' ? '🔶' : '🚫';
    content += `**${riskEmoji} ${assessmentResult.riskLevel}** (スコア: ${assessmentResult.riskScore}/100)\n\n`;
    content += `${assessmentResult.summary}\n\n`;

    // 検出されたリスク
    if (assessmentResult.risks.length > 0) {
      content += `## 検出されたリスク\n\n`;
      content += `| 深刻度 | 説明 |\n`;
      content += `|--------|------|\n`;
      assessmentResult.risks.forEach(r => {
        const severityLabel = r.severity === 'critical' ? '🚫 CRITICAL' :
          r.severity === 'high' ? '🔶 HIGH' :
          r.severity === 'medium' ? '⚠️ MEDIUM' : '✅ LOW';
        content += `| ${severityLabel} | ${r.description} |\n`;
      });
      content += '\n';
    }

    // 最寄り空港
    if (assessmentResult.context?.nearestAirport) {
      content += `## 最寄り空港\n\n`;
      content += `- **名称:** ${assessmentResult.context.nearestAirport.name}\n`;
      content += `- **距離:** ${(assessmentResult.context.nearestAirport.distance / 1000).toFixed(1)}km\n\n`;
    }

    // DID情報
    if (assessmentResult.context?.didInfo) {
      const did = assessmentResult.context.didInfo;
      content += `## 人口集中地区（DID）\n\n`;
      if (did.isDID) {
        content += `> ⚠️ **注意:** ${did.description}\n\n`;
        if (did.waypointDetails?.areaSummaries) {
          content += `### DID内のWaypoint\n\n`;
          for (const area of did.waypointDetails.areaSummaries) {
            content += `- **${area.area}:** WP ${area.waypointIndices.join(', ')}\n`;
          }
          content += '\n';
        }
      } else {
        content += `✅ ${did.description}\n\n`;
      }
    }

    // 推奨事項
    content += `## 推奨事項\n\n`;
    assessmentResult.recommendations.forEach(rec => {
      content += `- ${rec}\n`;
    });
    content += '\n';

    // 必要な許可
    if (assessmentResult.requiredPermissions.length > 0) {
      content += `## 必要な許可\n\n`;
      assessmentResult.requiredPermissions.forEach(p => {
        content += `- ${p}\n`;
      });
      content += `\n**承認取得目安:** ${assessmentResult.estimatedApprovalDays}日\n\n`;
    }

    // Waypointデータ
    if (waypoints.length > 0) {
      content += `## Waypoint一覧\n\n`;
      content += `| No. | 緯度 | 経度 | 高度 |\n`;
      content += `|-----|------|------|------|\n`;
      waypoints.forEach((wp, i) => {
        const alt = wp.altitude ? `${wp.altitude}m` : '-';
        content += `| WP${i + 1} | ${wp.lat.toFixed(6)} | ${wp.lng.toFixed(6)} | ${alt} |\n`;
      });
      content += '\n';
    }

    // 最適化プラン（As-is / To-be 比較）
    if (optimizationPlan?.hasIssues && optimizationPlan?.waypointAnalysis?.gaps?.length > 0) {
      content += `## 最適化提案 (As-is → To-be)\n\n`;
      content += `> ${optimizationPlan.summary}\n\n`;
      content += `| WP | 問題 | 現在位置 (As-is) | 推奨位置 (To-be) | 移動距離 |\n`;
      content += `|----|------|------------------|------------------|----------|\n`;

      optimizationPlan.waypointAnalysis.gaps.forEach(gap => {
        const issue = gap.issues[0];
        const issueText = `${issue.zone} (${issue.type === 'airport' ? '空港' : '禁止区域'})`;
        const currentPos = `${gap.current.lat.toFixed(6)}, ${gap.current.lng.toFixed(6)}`;
        const recommendedPos = gap.recommended
          ? `${gap.recommended.lat.toFixed(6)}, ${gap.recommended.lng.toFixed(6)}`
          : '-';
        const moveDistance = gap.moveDistance ? `${Math.round(gap.moveDistance)}m` : '-';
        content += `| WP${gap.waypointIndex} | ${issueText} | ${currentPos} | ${recommendedPos} | ${moveDistance} |\n`;
      });
      content += '\n';

      content += `### 最適化アクション\n\n`;
      optimizationPlan.actions.forEach(action => {
        content += `- ${action}\n`;
      });
      content += '\n';
    }

    content += `---\n\n`;
    content += `**データソース:** ${assessmentResult.aiEnhanced ? 'OpenAI + ローカル分析' : 'ローカル分析'}\n`;

    return content;
  };

  /**
   * 判定結果をクリップボードにコピー
   */
  const handleCopyResult = async () => {
    const content = generateAssessmentText();
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // フォールバック: execCommand
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  /**
   * 判定結果をMarkdownファイルとしてエクスポート
   */
  const handleExportResult = () => {
    const content = generateAssessmentText();
    if (!content) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');

    // ダウンロード（Markdownファイル）
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-assessment-${dateStr}.md`;
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
          <h4>国土交通省 不動産情報ライブラリ</h4>
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
          <h4>OpenAI API（オプション）</h4>
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
                ※ LM Studioを起動し、サーバーを開始してください
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

  const panelStyle = isFullscreen ? {} : (isExpanded ? {} : {
    width: `${panelSize.width}px`,
    height: `${panelSize.height}px`
  });

  return (
    <div
      ref={panelRef}
      className={`flight-assistant ${isExpanded ? 'expanded' : ''} ${isFullscreen ? 'fullscreen' : ''} ${isResizing ? 'resizing' : ''}`}
      style={panelStyle}
    >
      {/* リサイズハンドル */}
      {!isFullscreen && !isExpanded && (
        <>
          <div
            className="resize-handle resize-left"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="resize-handle resize-top"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="resize-handle resize-corner"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
        </>
      )}

      <div className="flight-assistant-header">
        <div className="header-title">
          <Sparkles size={18} />
          <span>フライトアシスタント</span>
          {hasMlitKey && <span className="mlit-badge">国交省</span>}
          {hasKey && <span className="ai-badge">AI</span>}
        </div>
        <div className="header-actions">
          <button
            className="fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'ウィンドウ表示' : 'フルスクリーン'}
          >
            {isFullscreen ? <Shrink size={16} /> : <Expand size={16} />}
          </button>
          {!isFullscreen && (
            <button
              className="expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? '縮小' : '拡大'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
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
              <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
              {/* 生成されたルートの適用ボタン */}
              {msg.generatedRoute && (
                <button
                  className="apply-route-btn"
                  onClick={() => {
                    onApplyPlan(msg.generatedRoute);
                    setMessages(prev => [...prev, {
                      role: 'system',
                      content: `[OK] ${msg.generatedRoute.waypoints.length}個のWaypointを地図に適用しました`
                    }]);
                  }}
                >
                  <CheckCircle size={14} />
                  経路を適用
                </button>
              )}
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
          disabled={isProcessing || isGeneratingRoute || polygons.length === 0}
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

      {/* AI経路生成セクション */}
      {hasKey && polygons.length > 0 && (
        <div className="route-generation-section">
          <input
            type="text"
            value={routePurpose}
            onChange={(e) => setRoutePurpose(e.target.value)}
            placeholder="飛行目的（例: 太陽光パネル点検）"
            disabled={isGeneratingRoute}
          />
          <button
            className="generate-route-btn"
            onClick={handleGenerateRoute}
            disabled={isGeneratingRoute || isProcessing}
            title="AIでWaypointを自動生成"
          >
            <Route size={14} />
            {isGeneratingRoute ? '生成中...' : '経路生成'}
          </button>
        </div>
      )}

      <div className="flight-assistant-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={hasKey ? 'AIに質問...' : 'メッセージ...（AI未設定）'}
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
          {/* コピー/エクスポートボタンは常に表示 */}
          <div className="action-buttons-bar">
            <button className="copy-btn" onClick={handleCopyResult}>
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              {isCopied ? 'コピー完了' : 'コピー'}
            </button>
            <button className="export-btn" onClick={handleExportResult}>
              <Download size={14} />
              DL
            </button>
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
                {assessmentResult.aiEnhanced ? '[AI] AI分析' : '[LOCAL] ローカル分析'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlightAssistant;
