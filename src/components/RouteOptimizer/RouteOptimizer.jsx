import { useState, useCallback, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  MapPin,
  Battery,
  Clock,
  Route,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Home,
  Plane,
  Navigation,
  Flame,
  Thermometer,
  Heart,
  Sun,
  Building2,
  Ruler,
  Wheat,
  Package,
  ShieldCheck,
  Target,
} from 'lucide-react';
import {
  getAllDrones,
  getFormattedSpecs,
  getRouteSettings,
  saveRouteSettings,
} from '../../services/droneSpecsService';
import { USE_CASES } from '../../services/routePlanner';
import { OPTIMIZATION_OBJECTIVES } from '../../services/optimizationObjectives';
import {
  optimizeRoute,
  formatDistance,
  formatTime,
} from '../../services/routeOptimizer';
import './RouteOptimizer.scss';

// アイコン名からコンポーネントへのマッピング
const ICON_MAP = {
  // ドローン用
  Plane,
  Navigation,
  MapPin,
  Flame,
  Thermometer,
  // ユースケース用
  Heart,
  Sun,
  Building2,
  Ruler,
  Wheat,
  Package,
  ShieldCheck,
  // 最適化目標用
  Target,
  Route,
  Clock,
  Battery,
};

// アイコンコンポーネントを取得
const getIcon = (iconName, size = 24) => {
  const IconComponent = ICON_MAP[iconName];
  return IconComponent ? <IconComponent size={size} /> : null;
};

const RouteOptimizer = ({
  isOpen,
  onClose,
  waypoints,
  onApplyRoute,
  selectedUseCase: propSelectedUseCase, // MainLayout から渡される
}) => {
  // 飛行目的が既に選択されていれば、Step 2 から開始
  const [step, setStep] = useState(propSelectedUseCase ? 2 : 1);
  const [selectedUseCase, setLocalSelectedUseCase] = useState(propSelectedUseCase);
  const [selectedDroneId, setSelectedDroneId] = useState(null);

  // 飛行目的に応じたデフォルト最適化目標を決定
  const getDefaultObjective = () => {
    if (!selectedUseCase) return 'balanced';
    const useCase = USE_CASES.find(uc => uc.id === selectedUseCase);
    return useCase?.defaultOptimization || 'balanced';
  };

  const [options, setOptions] = useState({
    autoSplit: true,
    checkRegulations: true,
    algorithm: 'nearest-neighbor',
    safetyMargin: 0.2,
    objective: getDefaultObjective(), // 目的から推奨される最適化目標
  });
  const [homePointMode, setHomePointMode] = useState('auto');
  const [customHomePoint, _setCustomHomePoint] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [expandedFlight, setExpandedFlight] = useState(null);
  const [error, setError] = useState(null);

  // 初期化
  useEffect(() => {
    if (isOpen) {
      const settings = getRouteSettings();
      setSelectedDroneId(settings.selectedDroneId);
      setOptions({
        autoSplit: settings.autoSplitEnabled,
        checkRegulations: settings.checkRegulationsEnabled,
        algorithm: settings.optimizationAlgorithm,
        safetyMargin: settings.safetyMargin,
      });
      setStep(1);
      setLocalSelectedUseCase(null);
      setOptimizationResult(null);
      setError(null);
    }
  }, [isOpen]);

  const drones = getAllDrones();

  const handleDroneSelect = useCallback((droneId) => {
    setSelectedDroneId(droneId);
    saveRouteSettings({ selectedDroneId: droneId });
  }, []);

  const handleOptimize = useCallback(async () => {
    if (!selectedDroneId || waypoints.length === 0) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const homePoint = homePointMode === 'custom' && customHomePoint
        ? customHomePoint
        : null;

      const result = await optimizeRoute(waypoints, {
        droneId: selectedDroneId,
        homePoint,
        algorithm: options.algorithm,
        checkRegulations: options.checkRegulations,
        autoSplit: options.autoSplit,
        objective: options.objective, // NEW: 最適化目標
      });

      if (result.success) {
        setOptimizationResult(result);
        setStep(4);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || '最適化に失敗しました');
    } finally {
      setIsOptimizing(false);
    }
  }, [selectedDroneId, waypoints, homePointMode, customHomePoint, options]);

  const handleApply = useCallback(() => {
    if (optimizationResult && onApplyRoute) {
      onApplyRoute(optimizationResult);
      onClose();
    }
  }, [optimizationResult, onApplyRoute, onClose]);

  const handleReset = useCallback(() => {
    setStep(1);
    setOptimizationResult(null);
    setError(null);
  }, []);

  if (!isOpen) return null;

  const selectedDroneSpecs = selectedDroneId ? getFormattedSpecs(selectedDroneId) : null;

  return (
    <div className="route-optimizer">
      <div className="route-optimizer__overlay" onClick={onClose} />
      <div className="route-optimizer__modal">
        {/* ヘッダー */}
        <div className="route-optimizer__header">
          <div className="route-optimizer__header-content">
            <Route size={20} />
            <h2>最適巡回ルートプランナー</h2>
          </div>
          <div className="route-optimizer__header-actions">
            {step > 1 && (
              <button
                className="route-optimizer__reset-btn"
                onClick={handleReset}
                title="最初からやり直す"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              className="route-optimizer__close-btn"
              onClick={onClose}
              title="閉じる"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="route-optimizer__steps">
          <div className={`route-optimizer__step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="route-optimizer__step-number">1</span>
            <span className="route-optimizer__step-label">飛行目的</span>
          </div>
          <div className="route-optimizer__step-connector" />
          <div className={`route-optimizer__step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="route-optimizer__step-number">2</span>
            <span className="route-optimizer__step-label">ドローン</span>
          </div>
          <div className="route-optimizer__step-connector" />
          <div className={`route-optimizer__step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
            <span className="route-optimizer__step-number">3</span>
            <span className="route-optimizer__step-label">オプション</span>
          </div>
          <div className="route-optimizer__step-connector" />
          <div className={`route-optimizer__step ${step >= 4 ? 'active' : ''}`}>
            <span className="route-optimizer__step-number">4</span>
            <span className="route-optimizer__step-label">結果</span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="route-optimizer__content">
          {/* Step 1: 飛行目的選択 */}
          {step === 1 && (
            <div className="route-optimizer__step-content">
              <h3>飛行目的を選択</h3>
              <p className="route-optimizer__description">
                目的に応じて最適なドローンと設定を提案します
              </p>

              <div className="route-optimizer__usecase-grid">
                {USE_CASES.map((useCase) => (
                  <div
                    key={useCase.id}
                    className={`route-optimizer__usecase-card ${selectedUseCase === useCase.id ? 'selected' : ''}`}
                    onClick={() => setLocalSelectedUseCase(useCase.id)}
                  >
                    <div className="route-optimizer__usecase-icon">
                      {getIcon(useCase.icon, 24)}
                    </div>
                    <div className="route-optimizer__usecase-info">
                      <div className="route-optimizer__usecase-name">{useCase.name}</div>
                      <div className="route-optimizer__usecase-desc">{useCase.description}</div>
                    </div>
                    {selectedUseCase === useCase.id && (
                      <CheckCircle className="route-optimizer__usecase-check" size={20} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: ドローン選択 */}
          {step === 2 && (
            <div className="route-optimizer__step-content">
              <h3>使用するドローンを選択</h3>
              <p className="route-optimizer__description">
                ドローンの飛行時間・航続距離に基づいてルートを最適化します
              </p>

              <div className="route-optimizer__drone-grid">
                {drones.map((drone) => (
                  <div
                    key={drone.id}
                    className={`route-optimizer__drone-card ${selectedDroneId === drone.id ? 'selected' : ''}`}
                    onClick={() => handleDroneSelect(drone.id)}
                  >
                    <div className="route-optimizer__drone-icon">{getIcon(drone.icon, 20)}</div>
                    <div className="route-optimizer__drone-info">
                      <div className="route-optimizer__drone-model">{drone.model}</div>
                      <div className="route-optimizer__drone-specs">
                        <span><Clock size={12} /> {drone.maxFlightTime}分</span>
                        <span><Route size={12} /> {(drone.maxRange / 1000).toFixed(1)}km</span>
                      </div>
                    </div>
                    {selectedDroneId === drone.id && (
                      <CheckCircle className="route-optimizer__drone-check" size={20} />
                    )}
                  </div>
                ))}
              </div>

              {selectedDroneSpecs && (
                <div className="route-optimizer__drone-detail">
                  <h4>選択中: {selectedDroneSpecs.model}</h4>
                  <p>{selectedDroneSpecs.description}</p>
                  <div className="route-optimizer__drone-detail-grid">
                    <div><Clock size={14} /> 飛行時間: {selectedDroneSpecs.flightTime}</div>
                    <div><Battery size={14} /> 有効時間: {selectedDroneSpecs.effectiveTime}</div>
                    <div><Route size={14} /> 航続距離: {selectedDroneSpecs.maxRange}</div>
                    <div><Plane size={14} /> 巡航速度: {selectedDroneSpecs.cruiseSpeed}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: オプション設定 */}
          {step === 3 && (
            <div className="route-optimizer__step-content">
              <h3>最適化オプション</h3>

              {/* 最適化目標選択 */}
              <div className="route-optimizer__option-group">
                <label>最適化目標</label>
                <p className="route-optimizer__option-desc">
                  どの観点を優先して最適化しますか
                </p>

                <div className="route-optimizer__objective-grid">
                  {OPTIMIZATION_OBJECTIVES.map((objective) => (
                    <div
                      key={objective.id}
                      className={`route-optimizer__objective-card ${options.objective === objective.id ? 'selected' : ''}`}
                      onClick={() => setOptions({ ...options, objective: objective.id })}
                    >
                      <div className="route-optimizer__objective-icon">
                        {getIcon(objective.icon, 20)}
                      </div>
                      <div className="route-optimizer__objective-info">
                        <div className="route-optimizer__objective-name">{objective.name}</div>
                        <div className="route-optimizer__objective-desc">{objective.description}</div>
                      </div>
                      {options.objective === objective.id && (
                        <CheckCircle className="route-optimizer__objective-check" size={16} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="route-optimizer__option-group">
                <label>ホームポイント（離発着地点）</label>
                <div className="route-optimizer__radio-group">
                  <label className="route-optimizer__radio">
                    <input
                      type="radio"
                      name="homePoint"
                      checked={homePointMode === 'auto'}
                      onChange={() => setHomePointMode('auto')}
                    />
                    <span>自動提案（最適な出発点を計算）</span>
                  </label>
                  <label className="route-optimizer__radio">
                    <input
                      type="radio"
                      name="homePoint"
                      checked={homePointMode === 'first'}
                      onChange={() => setHomePointMode('first')}
                    />
                    <span>最初のウェイポイントを使用</span>
                  </label>
                </div>
              </div>

              <div className="route-optimizer__option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={options.autoSplit}
                    onChange={(e) => setOptions({ ...options, autoSplit: e.target.checked })}
                  />
                  バッテリー自動分割
                </label>
                <p className="route-optimizer__option-desc">
                  バッテリー残量を考慮して、帰還ポイントを自動挿入します
                </p>
              </div>

              <div className="route-optimizer__option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={options.checkRegulations}
                    onChange={(e) => setOptions({ ...options, checkRegulations: e.target.checked })}
                  />
                  規制区域チェック
                </label>
                <p className="route-optimizer__option-desc">
                  DID、空港周辺、飛行禁止区域をチェックします
                </p>
              </div>

              <div className="route-optimizer__option-group">
                <label>安全マージン</label>
                <div className="route-optimizer__slider-group">
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={options.safetyMargin * 100}
                    onChange={(e) => setOptions({ ...options, safetyMargin: parseInt(e.target.value) / 100 })}
                  />
                  <span className="route-optimizer__slider-value">{Math.round(options.safetyMargin * 100)}%</span>
                </div>
                <p className="route-optimizer__option-desc">
                  バッテリー残量をこの割合まで残して帰還します
                </p>
              </div>

              <div className="route-optimizer__waypoint-info">
                <MapPin size={16} />
                <span>{waypoints.length}個のウェイポイントを最適化します</span>
              </div>

              {error && (
                <div className="route-optimizer__error">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: 結果表示 */}
          {step === 4 && optimizationResult && (
            <div className="route-optimizer__step-content">
              <h3>最適化結果</h3>

              {/* 選択した目標 */}
              {(() => {
                const selectedObjective = OPTIMIZATION_OBJECTIVES.find(o => o.id === options.objective);
                return selectedObjective ? (
                  <div className="route-optimizer__selected-objective">
                    <div className="route-optimizer__objective-badge">
                      {getIcon(selectedObjective.icon, 16)}
                      <span>{selectedObjective.name}</span>
                    </div>
                    <p>{selectedObjective.description}</p>
                  </div>
                ) : null;
              })()}

              {/* サマリー */}
              <div className="route-optimizer__summary">
                <div className="route-optimizer__summary-item">
                  <Route size={20} />
                  <div>
                    <span className="route-optimizer__summary-value">
                      {formatDistance(optimizationResult.totalDistance)}
                    </span>
                    <span className="route-optimizer__summary-label">総距離</span>
                  </div>
                </div>
                <div className="route-optimizer__summary-item">
                  <Clock size={20} />
                  <div>
                    <span className="route-optimizer__summary-value">
                      {formatTime(optimizationResult.totalTime)}
                    </span>
                    <span className="route-optimizer__summary-label">総飛行時間</span>
                  </div>
                </div>
                <div className="route-optimizer__summary-item">
                  <Plane size={20} />
                  <div>
                    <span className="route-optimizer__summary-value">
                      {optimizationResult.totalFlights}回
                    </span>
                    <span className="route-optimizer__summary-label">フライト数</span>
                  </div>
                </div>
                <div className="route-optimizer__summary-item">
                  <Battery size={20} />
                  <div>
                    <span className="route-optimizer__summary-value">
                      {optimizationResult.summary.batteryChanges}回
                    </span>
                    <span className="route-optimizer__summary-label">バッテリー交換</span>
                  </div>
                </div>
              </div>

              {optimizationResult.summary.improvement > 0 && (
                <div className="route-optimizer__improvement">
                  <CheckCircle size={16} />
                  ルート距離を{optimizationResult.summary.improvement}%短縮しました
                </div>
              )}

              {/* 各メトリクスの内訳 */}
              {optimizationResult.metrics && (
                <div className="route-optimizer__metrics">
                  <h4>最適化メトリクス</h4>
                  <div className="route-optimizer__metrics-grid">
                    <div className="route-optimizer__metric">
                      <Route size={16} />
                      <span className="route-optimizer__metric-label">距離</span>
                      <span className="route-optimizer__metric-value">{formatDistance(optimizationResult.metrics.distance)}</span>
                      {optimizationResult.metrics.distanceScore && (
                        <span className="route-optimizer__metric-score">スコア: {optimizationResult.metrics.distanceScore.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="route-optimizer__metric">
                      <Clock size={16} />
                      <span className="route-optimizer__metric-label">時間</span>
                      <span className="route-optimizer__metric-value">{formatTime(optimizationResult.metrics.time)}</span>
                      {optimizationResult.metrics.timeScore && (
                        <span className="route-optimizer__metric-score">スコア: {optimizationResult.metrics.timeScore.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="route-optimizer__metric">
                      <Battery size={16} />
                      <span className="route-optimizer__metric-label">バッテリー</span>
                      <span className="route-optimizer__metric-value">{optimizationResult.metrics.batteryUsage?.toFixed(1)}%</span>
                      {optimizationResult.metrics.batteryScore && (
                        <span className="route-optimizer__metric-score">スコア: {optimizationResult.metrics.batteryScore.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="route-optimizer__metric">
                      <ShieldCheck size={16} />
                      <span className="route-optimizer__metric-label">安全性</span>
                      <span className="route-optimizer__metric-value">{optimizationResult.metrics.riskLabel || '低'}</span>
                      {optimizationResult.metrics.riskScore && (
                        <span className="route-optimizer__metric-score">スコア: {optimizationResult.metrics.riskScore.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 選択した目標の達成度 */}
              {optimizationResult.objectiveAchievement && (
                <div className="route-optimizer__achievement">
                  <h4>目標達成度</h4>
                  <div className="route-optimizer__achievement-bar">
                    <div
                      className="route-optimizer__achievement-fill"
                      style={{ width: `${optimizationResult.objectiveAchievement}%` }}
                    >
                      {optimizationResult.objectiveAchievement > 10 && (
                        <span className="route-optimizer__achievement-text">
                          {optimizationResult.objectiveAchievement.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="route-optimizer__achievement-description">
                    {(() => {
                      const obj = OPTIMIZATION_OBJECTIVES.find(o => o.id === options.objective);
                      return obj ? `${obj.name}の観点で${optimizationResult.objectiveAchievement.toFixed(0)}%達成` : '';
                    })()}
                  </p>
                </div>
              )}

              {/* トレードオフの可視化 */}
              {optimizationResult.tradeoffs && optimizationResult.tradeoffs.length > 0 && (
                <div className="route-optimizer__tradeoffs">
                  <h4>トレードオフ分析</h4>
                  {optimizationResult.tradeoffs.map((tradeoff, _idx) => (
                    <div key={_idx} className="route-optimizer__tradeoff">
                      <div className="route-optimizer__tradeoff-item route-optimizer__tradeoff-gain">
                        <span className="route-optimizer__tradeoff-metric">{tradeoff.gain.metric}</span>
                        <span className="route-optimizer__tradeoff-change">
                          {tradeoff.gain.change > 0 ? '+' : ''}{tradeoff.gain.change.toFixed(1)}%
                        </span>
                      </div>
                      <span className="route-optimizer__tradeoff-arrow">⇄</span>
                      <div className="route-optimizer__tradeoff-item route-optimizer__tradeoff-cost">
                        <span className="route-optimizer__tradeoff-metric">{tradeoff.cost.metric}</span>
                        <span className="route-optimizer__tradeoff-change">
                          {tradeoff.cost.change > 0 ? '+' : ''}{tradeoff.cost.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ホームポイント情報 */}
              <div className="route-optimizer__home-info">
                <Home size={16} />
                <span>
                  ホームポイント: {optimizationResult.homePoint.lat.toFixed(6)}, {optimizationResult.homePoint.lng.toFixed(6)}
                </span>
                {optimizationResult.optimalStartPoint?.reason && (
                  <span className="route-optimizer__home-reason">
                    ({optimizationResult.optimalStartPoint.reason})
                  </span>
                )}
              </div>

              {/* フライト詳細 */}
              <div className="route-optimizer__flights">
                {optimizationResult.flights.map((flight) => (
                  <div key={flight.flightNumber} className="route-optimizer__flight">
                    <div
                      className="route-optimizer__flight-header"
                      onClick={() => setExpandedFlight(
                        expandedFlight === flight.flightNumber ? null : flight.flightNumber
                      )}
                    >
                      <div className="route-optimizer__flight-title">
                        <span
                          className="route-optimizer__flight-badge"
                          style={{
                            backgroundColor: flight.flightNumber === 1 ? '#2563eb' :
                              flight.flightNumber === 2 ? '#16a34a' : '#dc2626'
                          }}
                        >
                          Flight {flight.flightNumber}
                        </span>
                        <span className="route-optimizer__flight-stats">
                          {formatTime(flight.estimatedTime)} / {formatDistance(flight.totalDistance)}
                        </span>
                      </div>
                      <div className="route-optimizer__flight-battery">
                        <Battery size={14} />
                        <span>{Math.round(flight.batteryUsage)}%</span>
                        {expandedFlight === flight.flightNumber ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>

                    {expandedFlight === flight.flightNumber && (
                      <div className="route-optimizer__flight-detail">
                        <div className="route-optimizer__flight-route">
                          <span className="route-optimizer__flight-home">
                            <Home size={12} /> Home
                          </span>
                          {flight.waypoints.map((wp) => (
                            <span key={wp.id} className="route-optimizer__flight-wp">
                              <ChevronRight size={12} />
                              WP{wp.optimizedOrder || wp.index}
                            </span>
                          ))}
                          <span className="route-optimizer__flight-home">
                            <ChevronRight size={12} />
                            <Home size={12} /> Home
                          </span>
                        </div>

                        {flight.restrictions.length > 0 && (
                          <div className="route-optimizer__flight-warnings">
                            {flight.restrictions.map((r, idx) => (
                              <div key={idx} className="route-optimizer__flight-warning">
                                <AlertTriangle size={12} />
                                {r.description}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 規制警告 */}
              {optimizationResult.restrictions.length > 0 && (
                <div className="route-optimizer__warnings">
                  <AlertTriangle size={16} />
                  <span>{optimizationResult.restrictions.length}件の規制区域警告があります</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="route-optimizer__footer">
          {step === 1 && (
            <button
              className="route-optimizer__btn route-optimizer__btn--primary"
              onClick={() => setStep(2)}
              disabled={!selectedUseCase}
            >
              次へ <ChevronRight size={16} />
            </button>
          )}

          {step === 2 && (
            <>
              <button
                className="route-optimizer__btn route-optimizer__btn--secondary"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={16} /> 戻る
              </button>
              <button
                className="route-optimizer__btn route-optimizer__btn--primary"
                onClick={() => setStep(3)}
                disabled={!selectedDroneId}
              >
                次へ <ChevronRight size={16} />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                className="route-optimizer__btn route-optimizer__btn--secondary"
                onClick={() => setStep(2)}
              >
                <ChevronLeft size={16} /> 戻る
              </button>
              <button
                className="route-optimizer__btn route-optimizer__btn--primary"
                onClick={handleOptimize}
                disabled={isOptimizing || waypoints.length === 0}
              >
                {isOptimizing ? '最適化中...' : '最適化実行'}
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <button
                className="route-optimizer__btn route-optimizer__btn--secondary"
                onClick={handleReset}
              >
                やり直す
              </button>
              <button
                className="route-optimizer__btn route-optimizer__btn--primary"
                onClick={handleApply}
              >
                <CheckCircle size={16} /> ルートを適用
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
