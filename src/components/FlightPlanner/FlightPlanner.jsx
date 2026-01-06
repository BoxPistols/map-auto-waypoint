import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target,
  MapPin,
  Navigation,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Battery,
  FileText,
  Download,
  X,
  RefreshCw,
  Zap,
  Route,
  Plane,
  Shield,
  Info,
  ExternalLink,
  Search,
  Loader,
} from 'lucide-react';
import { USE_CASES, generateRouteOptions, getUseCaseById } from '../../services/routePlanner';
import { downloadFlightPlan } from '../../services/documentGenerator';
import { searchAddress } from '../../services/geocoding';
import './FlightPlanner.scss';

/**
 * フライトプランナー - 目的ベースOOUI
 *
 * 1. 出発地・目的地設定
 * 2. 飛行目的（ユースケース）選択
 * 3. ルート候補の生成・比較（A案/B案）
 * 4. 申請書類の生成
 */
function FlightPlanner({
  isOpen,
  onClose,
  polygons = [],
  waypoints = [],
  onApplyRoute,
  searchResult,
}) {
  // ステップ管理
  const [step, setStep] = useState(1);

  // ユースケース
  const [selectedUseCase, setSelectedUseCase] = useState(null);

  // 出発地・目的地
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [isSelectingStart, setIsSelectingStart] = useState(false);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);

  // 地名検索
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startResults, setStartResults] = useState([]);
  const [endResults, setEndResults] = useState([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);
  const searchTimeoutRef = useRef(null);

  // ルート
  const [routeOptions, setRouteOptions] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 詳細表示
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // 検索結果から初期値を設定
  useEffect(() => {
    if (searchResult && !endPoint) {
      setEndPoint({
        lat: searchResult.lat,
        lng: searchResult.lng,
        name: searchResult.displayName?.split(',')[0] || '目的地',
      });
    }
  }, [searchResult, endPoint]);

  // ポリゴンから初期値を設定
  useEffect(() => {
    if (polygons.length > 0 && !endPoint) {
      const polygon = polygons[0];
      const coords = polygon.geometry.coordinates[0];
      const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      setEndPoint({
        lat: centerLat,
        lng: centerLng,
        name: polygon.name || 'エリア中心',
      });
    }
  }, [polygons, endPoint]);

  // ルート生成
  const handleGenerateRoutes = useCallback(async () => {
    if (!selectedUseCase || !startPoint || !endPoint) return;

    setIsGenerating(true);
    try {
      const options = await generateRouteOptions(
        startPoint,
        endPoint,
        selectedUseCase,
        { altitude: selectedUseCase.recommendedAltitude }
      );
      setRouteOptions(options);
      setSelectedRoute(options.recommended);
      setStep(3);
    } catch (error) {
      console.error('Route generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedUseCase, startPoint, endPoint]);

  // ルート選択
  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
  };

  // ルート適用
  const handleApplyRoute = () => {
    if (!selectedRoute || !onApplyRoute) return;

    // Waypointに変換
    const newWaypoints = selectedRoute.waypoints.map((wp, idx) => ({
      id: `route-wp-${Date.now()}-${idx}`,
      lat: wp.lat,
      lng: wp.lng,
      index: idx + 1,
      name: wp.name,
      type: wp.type,
    }));

    onApplyRoute({
      waypoints: newWaypoints,
      route: selectedRoute,
      useCase: selectedUseCase,
    });

    onClose();
  };

  // 書類ダウンロード
  const handleDownload = (format) => {
    if (!selectedRoute) return;

    const flightPlan = {
      waypoints: selectedRoute.waypoints,
      polygons,
      route: selectedRoute,
      useCase: selectedUseCase,
      evaluation: selectedRoute.evaluation,
      altitude: selectedUseCase?.recommendedAltitude || 50,
      flightDate: new Date(),
      location: endPoint?.name || '-',
    };

    downloadFlightPlan(flightPlan, format);
    setShowExportOptions(false);
  };

  // 地名検索ハンドラー
  const handleSearch = useCallback(async (query, type) => {
    if (!query || query.trim().length < 2) {
      if (type === 'start') {
        setStartResults([]);
      } else {
        setEndResults([]);
      }
      return;
    }

    // 座標形式かチェック
    const coords = query.split(',').map(s => parseFloat(s.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      const point = { lat: coords[0], lng: coords[1], name: `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}` };
      if (type === 'start') {
        setStartPoint(point);
        setStartResults([]);
        setStartQuery('');
      } else {
        setEndPoint(point);
        setEndResults([]);
        setEndQuery('');
      }
      return;
    }

    // 地名検索
    if (type === 'start') {
      setIsSearchingStart(true);
    } else {
      setIsSearchingEnd(true);
    }

    try {
      const results = await searchAddress(query, { limit: 5 });
      if (type === 'start') {
        setStartResults(results);
      } else {
        setEndResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      if (type === 'start') {
        setIsSearchingStart(false);
      } else {
        setIsSearchingEnd(false);
      }
    }
  }, []);

  // デバウンス検索
  const debouncedSearch = useCallback((query, type) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query, type);
    }, 300);
  }, [handleSearch]);

  // 検索結果選択
  const handleSelectResult = (result, type) => {
    const point = {
      lat: result.lat,
      lng: result.lng,
      name: result.displayName.split(',')[0],
    };
    if (type === 'start') {
      setStartPoint(point);
      setStartResults([]);
      setStartQuery('');
    } else {
      setEndPoint(point);
      setEndResults([]);
      setEndQuery('');
    }
  };

  // リセット
  const handleReset = () => {
    setStep(1);
    setSelectedUseCase(null);
    setStartPoint(null);
    setEndPoint(null);
    setStartQuery('');
    setEndQuery('');
    setStartResults([]);
    setEndResults([]);
    setRouteOptions(null);
    setSelectedRoute(null);
  };

  if (!isOpen) return null;

  return (
    <div className="flight-planner">
      <div className="planner-header">
        <h2>
          <Target size={20} />
          フライトプランナー
        </h2>
        <div className="header-actions">
          {step > 1 && (
            <button className="reset-btn" onClick={handleReset} title="最初からやり直す">
              <RefreshCw size={16} />
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">地点</span>
        </div>
        <div className="step-connector" />
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">目的</span>
        </div>
        <div className="step-connector" />
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">ルート</span>
        </div>
      </div>

      <div className="planner-content">
        {/* Step 2: 飛行目的選択 */}
        {step === 2 && (
          <div className="step-content">
            <h3>飛行目的を選択</h3>
            <p className="step-description">
              目的に応じて最適なルートと必要な許可を提案します
            </p>

            <div className="usecase-grid">
              {USE_CASES.map((uc) => (
                <button
                  key={uc.id}
                  className={`usecase-card ${selectedUseCase?.id === uc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUseCase(uc)}
                >
                  <span className="usecase-icon">{uc.icon}</span>
                  <span className="usecase-name">{uc.name}</span>
                  <span className="usecase-desc">{uc.description}</span>
                </button>
              ))}
            </div>

            {selectedUseCase && (
              <div className="usecase-details">
                <h4>{selectedUseCase.icon} {selectedUseCase.name}</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <Clock size={14} />
                    <span>最大飛行時間: {selectedUseCase.maxFlightTime}分</span>
                  </div>
                  <div className="detail-item">
                    <Plane size={14} />
                    <span>推奨高度: {selectedUseCase.recommendedAltitude}m</span>
                  </div>
                </div>
                <div className="regulations">
                  <strong>関連規制:</strong>
                  <ul>
                    {selectedUseCase.regulations.map((reg, i) => (
                      <li key={i}>{reg}</li>
                    ))}
                  </ul>
                </div>
                {selectedUseCase.tips.length > 0 && (
                  <div className="tips">
                    <strong>Tips:</strong>
                    <ul>
                      {selectedUseCase.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="step-actions">
              <button className="secondary-btn" onClick={() => setStep(1)}>
                戻る
              </button>
              <button
                className="primary-btn"
                onClick={handleGenerateRoutes}
                disabled={!selectedUseCase || !startPoint || !endPoint || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    生成中...
                  </>
                ) : (
                  <>
                    ルート生成
                    <Zap size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 地点設定 */}
        {step === 1 && (
          <div className="step-content">
            <h3>出発地・目的地を設定</h3>
            <p className="step-description">
              地名・住所または座標を入力してください
            </p>

            <div className="point-inputs">
              <div className={`point-input ${isSelectingStart ? 'selecting' : ''}`}>
                <label>
                  <Navigation size={16} className="start-icon" />
                  出発地
                </label>
                {startPoint ? (
                  <div className="point-value">
                    <span className="point-name">{startPoint.name}</span>
                    <span className="point-coords">
                      {startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}
                    </span>
                    <button
                      className="clear-btn"
                      onClick={() => setStartPoint(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="point-search">
                    <div className="search-input-wrapper">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="地名・住所・座標で検索"
                        value={startQuery}
                        onFocus={() => setIsSelectingStart(true)}
                        onBlur={() => setTimeout(() => setIsSelectingStart(false), 200)}
                        onChange={(e) => {
                          setStartQuery(e.target.value);
                          debouncedSearch(e.target.value, 'start');
                        }}
                      />
                      {isSearchingStart && <Loader size={14} className="loading-icon" />}
                    </div>
                    {startResults.length > 0 && (
                      <div className="search-results">
                        {startResults.map((result, idx) => (
                          <button
                            key={idx}
                            className="search-result-item"
                            onClick={() => handleSelectResult(result, 'start')}
                          >
                            <MapPin size={12} />
                            <span className="result-name">{result.displayName.split(',')[0]}</span>
                            <span className="result-address">{result.displayName.split(',').slice(1, 3).join(',')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="point-connector">
                <Route size={20} />
              </div>

              <div className={`point-input ${isSelectingEnd ? 'selecting' : ''}`}>
                <label>
                  <MapPin size={16} className="end-icon" />
                  目的地
                </label>
                {endPoint ? (
                  <div className="point-value">
                    <span className="point-name">{endPoint.name}</span>
                    <span className="point-coords">
                      {endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}
                    </span>
                    <button
                      className="clear-btn"
                      onClick={() => setEndPoint(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="point-search">
                    <div className="search-input-wrapper">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="地名・住所・座標で検索"
                        value={endQuery}
                        onFocus={() => setIsSelectingEnd(true)}
                        onBlur={() => setTimeout(() => setIsSelectingEnd(false), 200)}
                        onChange={(e) => {
                          setEndQuery(e.target.value);
                          debouncedSearch(e.target.value, 'end');
                        }}
                      />
                      {isSearchingEnd && <Loader size={14} className="loading-icon" />}
                    </div>
                    {endResults.length > 0 && (
                      <div className="search-results">
                        {endResults.map((result, idx) => (
                          <button
                            key={idx}
                            className="search-result-item"
                            onClick={() => handleSelectResult(result, 'end')}
                          >
                            <MapPin size={12} />
                            <span className="result-name">{result.displayName.split(',')[0]}</span>
                            <span className="result-address">{result.displayName.split(',').slice(1, 3).join(',')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="step-actions">
              <button
                className="primary-btn"
                onClick={() => setStep(2)}
                disabled={!startPoint || !endPoint}
              >
                次へ: 飛行目的を選択
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: ルート比較 */}
        {step === 3 && routeOptions && (
          <div className="step-content">
            <h3>ルート候補</h3>
            <p className="step-description">
              {routeOptions.summary.distanceDiff > 0
                ? `DID回避ルートは直線より${routeOptions.summary.distanceDiffPercent}%長くなります`
                : '直線経路で問題ありません'}
            </p>

            <div className="route-cards">
              {routeOptions.routes.map((route, idx) => {
                const isSelected = selectedRoute?.name === route.name;
                const isRecommended = routeOptions.recommended?.name === route.name;
                const isExpanded = expandedRoute === route.name;

                return (
                  <div
                    key={idx}
                    className={`route-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                    onClick={() => handleSelectRoute(route)}
                  >
                    <div className="route-header">
                      <div className="route-title">
                        {isRecommended && (
                          <span className="recommend-badge">
                            <Star size={12} /> 推奨
                          </span>
                        )}
                        <span className="route-name">
                          {idx === 0 ? 'A案' : 'B案'}: {route.name}
                        </span>
                      </div>
                      <div className="route-score">
                        <span className={`score ${route.evaluation.score >= 70 ? 'good' : route.evaluation.score >= 40 ? 'warning' : 'bad'}`}>
                          {route.evaluation.score}点
                        </span>
                      </div>
                    </div>

                    <p className="route-description">{route.description}</p>

                    <div className="route-stats">
                      <div className="stat">
                        <Route size={14} />
                        <span>{(route.distance / 1000).toFixed(1)}km</span>
                      </div>
                      <div className="stat">
                        <Clock size={14} />
                        <span>{route.evaluation.flightTime}分</span>
                      </div>
                      <div className="stat">
                        <Battery size={14} />
                        <span>{route.evaluation.batteryUsage}%</span>
                      </div>
                    </div>

                    {/* Pros/Cons */}
                    <div className="pros-cons">
                      {route.evaluation.pros.length > 0 && (
                        <div className="pros">
                          {route.evaluation.pros.slice(0, 2).map((pro, i) => (
                            <span key={i} className="pro">
                              <CheckCircle size={12} /> {pro}
                            </span>
                          ))}
                        </div>
                      )}
                      {route.evaluation.cons.length > 0 && (
                        <div className="cons">
                          {route.evaluation.cons.slice(0, 2).map((con, i) => (
                            <span key={i} className="con">
                              <AlertTriangle size={12} /> {con}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 詳細トグル */}
                    <button
                      className="expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRoute(isExpanded ? null : route.name);
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      詳細
                    </button>

                    {isExpanded && (
                      <div className="route-details">
                        <div className="detail-section">
                          <h5>
                            <Shield size={14} /> 飛行カテゴリ
                          </h5>
                          <p>{route.evaluation.category}</p>
                        </div>

                        {route.evaluation.permits.length > 0 && (
                          <div className="detail-section">
                            <h5>
                              <FileText size={14} /> 必要な許可
                            </h5>
                            <ul>
                              {route.evaluation.permits.map((permit, i) => (
                                <li key={i}>{permit}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {route.evaluation.issues.length > 0 && (
                          <div className="detail-section">
                            <h5>
                              <AlertTriangle size={14} /> 注意事項
                            </h5>
                            <ul>
                              {route.evaluation.issues.map((issue, i) => (
                                <li key={i} className={issue.severity}>
                                  {issue.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="detail-section">
                          <h5>
                            <MapPin size={14} /> Waypoints ({route.waypoints.length})
                          </h5>
                          <div className="waypoint-list">
                            {route.waypoints.map((wp, i) => (
                              <span key={i} className="waypoint-badge">
                                {wp.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* アクション */}
            <div className="step-actions">
              <button className="secondary-btn" onClick={() => setStep(2)}>
                戻る
              </button>

              <div className="export-dropdown">
                <button
                  className="secondary-btn"
                  onClick={() => setShowExportOptions(!showExportOptions)}
                >
                  <Download size={16} />
                  書類出力
                  <ChevronDown size={14} />
                </button>
                {showExportOptions && (
                  <div className="export-menu">
                    <button onClick={() => handleDownload('html')}>
                      <FileText size={14} />
                      飛行計画書 (HTML/Word)
                    </button>
                    <button onClick={() => handleDownload('excel')}>
                      <FileText size={14} />
                      飛行計画書 (TSV/Excel)
                    </button>
                    <button onClick={() => handleDownload('csv')}>
                      <FileText size={14} />
                      DIPS申請用 (CSV)
                    </button>
                  </div>
                )}
              </div>

              <button
                className="primary-btn"
                onClick={handleApplyRoute}
                disabled={!selectedRoute}
              >
                <CheckCircle size={16} />
                このルートで計画作成
              </button>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="planner-footer">
        <a
          href="https://www.ossportal.dips-reg.mlit.go.jp/portal/top"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={12} />
          DIPS 2.0
        </a>
        <span className="divider">|</span>
        <a
          href="https://www.fiss.mlit.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={12} />
          FISS
        </a>
      </div>
    </div>
  );
}

export default FlightPlanner;
