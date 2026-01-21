import { useState, useEffect, useCallback } from 'react';
import {
  Plane,
  Shield,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Clock,
  RefreshCw,
  Clipboard,
  Check,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  checkAllLegalRequirements,
  generateExternalLinks,
} from '../../services/legalRequirements';
import { getPolygonCenter } from '../../services/waypointGenerator';
import { GlassPanel } from '../GlassPanel';
import './FlightRequirements.scss';

/**
 * 飛行要件サマリーパネル
 *
 * 選択されたエリア/ポリゴンに対して3カテゴリの法的要件を表示:
 * 1. 航空法関連
 * 2. 小型無人機等飛行禁止法
 * 3. 土地・施設管理者ルール
 */
function FlightRequirements({
  polygon,
  altitude = 50,
  searchResult = null,
  isOpen,
  onClose,
  sidebarCollapsed = false,
}) {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    aviation_law: true,
    small_uas_prohibition: true,
    land_manager: false,
  });
  const [showProcedures, setShowProcedures] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [minimized, setMinimized] = useState(false);

  // チェック実行
  const runCheck = useCallback(async () => {
    if (!polygon && !searchResult) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 中心座標を取得
      let lat, lng;
      if (polygon) {
        const center = getPolygonCenter(polygon);
        if (center) {
          lat = center.lat;
          lng = center.lng;
        }
      } else if (searchResult) {
        lat = searchResult.lat;
        lng = searchResult.lng;
      }

      if (!lat || !lng) {
        throw new Error('座標を取得できません');
      }

      const context = {
        lat,
        lng,
        altitude,
        searchResult,
        polygons: polygon ? [polygon] : [],
      };

      const checkResults = await checkAllLegalRequirements(context);
      setResults(checkResults);
    } catch (err) {
      console.error('[FlightRequirements] Check error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [polygon, altitude, searchResult]);

  // ポリゴンまたは検索結果が変わったらチェック実行
  useEffect(() => {
    if (isOpen && (polygon || searchResult)) {
      runCheck();
    }
  }, [isOpen, polygon, searchResult, runCheck]);

  // カテゴリ展開/折りたたみ
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // ステータスアイコン
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="status-icon ok" size={16} />;
      case 'warning':
        return <AlertTriangle className="status-icon warning" size={16} />;
      case 'error':
        return <XCircle className="status-icon error" size={16} />;
      case 'info':
        return <Info className="status-icon info" size={16} />;
      default:
        return null;
    }
  };

  // カテゴリアイコン
  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'plane':
        return <Plane size={18} />;
      case 'shield':
        return <Shield size={18} />;
      case 'map-pin':
        return <MapPin size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  // カテゴリのステータスサマリー
  const getCategorySummary = (category) => {
    const items = category.items || [];
    const errorCount = items.filter((i) => i.status === 'error').length;
    const warningCount = items.filter((i) => i.status === 'warning').length;

    if (errorCount > 0) {
      return { status: 'error', text: `${errorCount}件の要対応` };
    }
    if (warningCount > 0) {
      return { status: 'warning', text: `${warningCount}件の要確認` };
    }
    return { status: 'ok', text: '問題なし' };
  };

  // 手続きをクリップボードにコピー
  const copyProcedure = async (procedure) => {
    const text = `【${procedure.name}】
カテゴリ: ${procedure.category === 'aviation_law' ? '航空法' : procedure.category === 'small_uas_prohibition' ? '小型無人機等禁止法' : '土地管理者'}
優先度: ${procedure.priority === 'critical' ? '最優先' : procedure.priority === 'high' ? '高' : '中'}
所要日数: 約${procedure.estimatedDays}日

${procedure.description}

【手順】
${procedure.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

【必要書類】
${procedure.documents?.map((d) => `・${d}`).join('\n') || 'なし'}

${procedure.notes ? `※ ${procedure.notes}` : ''}
${procedure.link ? `参考: ${procedure.link}` : ''}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(procedure.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  // ヘッダーアクション（最小化、更新ボタン）
  const headerActions = (
    <>
      <button
        className="header-action-btn"
        onClick={() => setMinimized(!minimized)}
        title={minimized ? '展開' : '最小化'}
      >
        {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
      </button>
      <button
        className="header-action-btn"
        onClick={runCheck}
        disabled={isLoading || (!polygon && !searchResult)}
        title={!polygon && !searchResult ? 'ポリゴンまたは検索結果が必要です' : '再チェック'}
      >
        <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
      </button>
    </>
  );

  // フッター
  const footer = results && (
    <div className="requirements-footer-content">
      <p className="disclaimer">
        ※ 本チェックは参考情報です。最終的な判断は
        <a
          href="https://www.ossportal.dips.mlit.go.jp/portal/top/"
          target="_blank"
          rel="noopener noreferrer"
        >
          DIPS 2.0
        </a>
        等の公式情報をご確認ください。
      </p>
      <p className="checked-at">
        チェック日時: {new Date(results.checkedAt).toLocaleString('ja-JP')}
      </p>
    </div>
  );

  return (
    <GlassPanel
      title="飛行要件サマリー"
      onClose={onClose}
      width={380}
      maxHeight={minimized ? 'auto' : '70vh'}
      bottom={20}
      left={sidebarCollapsed ? 80 : 340}
      headerActions={headerActions}
      footer={!minimized ? footer : null}
      className={`flight-requirements-panel ${minimized ? 'minimized' : ''}`}
    >
      {minimized ? (
        // 最小化時: ステータスのみ表示
        results && (
          <div className={`overall-status ${results.overallStatus}`}>
            {getStatusIcon(results.overallStatus)}
            <span className="status-text">{results.overallStatusText}</span>
          </div>
        )
      ) : (
        // 通常表示
        <div className="flight-requirements-content">
          {/* 全体ステータス */}
          {results && (
            <div className={`overall-status ${results.overallStatus}`}>
              {getStatusIcon(results.overallStatus)}
              <span className="status-text">{results.overallStatusText}</span>
              {results.procedures.length > 0 && (
                <span className="procedure-count">
                  {results.procedures.length}件の手続き
                </span>
              )}
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div className="loading-state">
              <RefreshCw className="spinning" size={24} />
              <span>チェック中...</span>
            </div>
          )}

          {/* エラー */}
          {error && (
            <div className="error-state">
              <XCircle size={20} />
              <span>{error}</span>
              <button onClick={runCheck}>再試行</button>
            </div>
          )}

          {/* カテゴリ別結果 */}
          {results && !isLoading && (
            <div className="categories">
              {results.categories.map((category) => {
                const summary = getCategorySummary(category);
                const isExpanded = expandedCategories[category.category];

                return (
                  <div
                    key={category.category}
                    className={`category ${summary.status}`}
                  >
                    <div
                      className="category-header"
                      onClick={() => toggleCategory(category.category)}
                    >
                      <div className="category-title">
                        {getCategoryIcon(category.categoryIcon)}
                        <span>{category.categoryName}</span>
                      </div>
                      <div className="category-summary">
                        {getStatusIcon(summary.status)}
                        <span className={`summary-text ${summary.status}`}>
                          {summary.text}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="category-items">
                        {category.items.map((item, idx) => (
                          <div key={idx} className={`item ${item.status}`}>
                            <div className="item-header">
                              {getStatusIcon(item.status)}
                              <span className="item-name">{item.name}</span>
                              <span className={`item-status ${item.status}`}>
                                {item.statusText}
                              </span>
                            </div>
                            {item.description && (
                              <p className="item-description">{item.description}</p>
                            )}
                            {item.action && (
                              <p className="item-action">
                                <span className="action-label">対応:</span>
                                {item.action}
                              </p>
                            )}
                            {item.notes && (
                              <ul className="item-notes">
                                {item.notes.map((note, i) => (
                                  <li key={i}>{note}</li>
                                ))}
                              </ul>
                            )}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="item-link"
                              >
                                {item.linkText || 'リンク'}
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 必要手続き一覧 */}
          {results && results.procedures.length > 0 && (
            <div className="procedures-section">
              <div
                className="procedures-header"
                onClick={() => setShowProcedures(!showProcedures)}
              >
                <h4>
                  <FileText size={16} />
                  必要な手続き
                  <span className="count">{results.procedures.length}</span>
                </h4>
                {showProcedures ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </div>

              {showProcedures && (
                <div className="procedures-list">
                  {results.procedures.map((procedure) => (
                    <div
                      key={procedure.id}
                      className={`procedure ${procedure.priority}`}
                    >
                      <div className="procedure-header">
                        <span
                          className={`priority-badge ${procedure.priority}`}
                        >
                          {procedure.priority === 'critical'
                            ? '最優先'
                            : procedure.priority === 'high'
                            ? '高'
                            : '中'}
                        </span>
                        <span className="procedure-name">{procedure.name}</span>
                        <button
                          className="copy-btn"
                          onClick={() => copyProcedure(procedure)}
                          title="コピー"
                        >
                          {copiedId === procedure.id ? (
                            <Check size={14} />
                          ) : (
                            <Clipboard size={14} />
                          )}
                        </button>
                      </div>

                      <p className="procedure-description">
                        {procedure.description}
                      </p>

                      <div className="procedure-meta">
                        <span className="estimated-days">
                          <Clock size={12} />
                          約{procedure.estimatedDays}日
                        </span>
                      </div>

                      <div className="procedure-steps">
                        <strong>手順:</strong>
                        <ol>
                          {procedure.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      {procedure.documents && procedure.documents.length > 0 && (
                        <div className="procedure-documents">
                          <strong>必要書類:</strong>
                          <ul>
                            {procedure.documents.map((doc, i) => (
                              <li key={i}>{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {procedure.notes && (
                        <p className="procedure-notes">※ {procedure.notes}</p>
                      )}

                      {procedure.link && (
                        <a
                          href={procedure.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="procedure-link"
                        >
                          {procedure.linkText}
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 外部リンク */}
          {results && (
            <div className="external-links">
              <h4>参考リンク</h4>
              <div className="links-grid">
                {generateExternalLinks(results).map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    <span className="link-name">{link.name}</span>
                    <span className="link-desc">{link.description}</span>
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

export default FlightRequirements;
