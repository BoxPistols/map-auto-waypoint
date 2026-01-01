import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Clock,
  Plane,
  Info
} from 'lucide-react';
import {
  fetchWeatherData,
  evaluateFlightConditions,
  isMockMode,
  setMockMode,
  getMockPatterns,
  clearWeatherCache,
  simulateWeatherChange
} from '../../services/weatherService';
import './WeatherPanel.scss';

/**
 * 天候パネル - ドローン飛行用の天候情報を表示
 *
 * 機能:
 * - Open-Meteo APIから天候データを取得
 * - 飛行条件の評価（良好/注意/困難/禁止）
 * - 飛行可能時間帯の表示
 * - モックモード（デモ用）
 * - フライトシミュレーション連携
 */
function WeatherPanel({
  latitude,
  longitude,
  onConditionChange,
  compact = false,
  autoRefresh = true,
  refreshInterval = 1800000 // 30分
}) {
  const [weatherData, setWeatherData] = useState(null);
  const [flightConditions, setFlightConditions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(!compact);
  const [showSettings, setShowSettings] = useState(false);
  const [mockMode, setMockModeState] = useState(isMockMode());
  const [selectedPattern, setSelectedPattern] = useState('ideal');
  const [showForecast, setShowForecast] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);

  // 天候データを取得
  const loadWeather = useCallback(async () => {
    if (!latitude || !longitude) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWeatherData(latitude, longitude);
      setWeatherData(data);

      const conditions = evaluateFlightConditions(data);
      setFlightConditions(conditions);

      // 親コンポーネントに通知
      if (onConditionChange) {
        onConditionChange(conditions);
      }
    } catch (err) {
      console.error('[WeatherPanel] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, onConditionChange]);

  // 初期ロードと自動更新
  useEffect(() => {
    loadWeather();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(loadWeather, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadWeather, autoRefresh, refreshInterval]);

  // シミュレーションモード
  useEffect(() => {
    if (!simulationMode || !weatherData) return;

    const interval = setInterval(() => {
      setSimulationTime(prev => prev + 1);
      const simulated = simulateWeatherChange(weatherData, simulationTime + 1);
      const conditions = evaluateFlightConditions(simulated);
      setFlightConditions(conditions);

      if (onConditionChange) {
        onConditionChange(conditions);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulationMode, weatherData, simulationTime, onConditionChange]);

  // モックモード切り替え
  const handleMockModeChange = (enabled, pattern) => {
    setMockMode(enabled, pattern);
    setMockModeState(enabled);
    setSelectedPattern(pattern);
    clearWeatherCache();
    loadWeather();
  };

  // レベルに応じたスタイルクラス
  const getLevelClass = (level) => {
    switch (level) {
      case 'good': return 'level-good';
      case 'fair': return 'level-fair';
      case 'poor': return 'level-poor';
      case 'dangerous': return 'level-dangerous';
      default: return 'level-unknown';
    }
  };

  // レベルに応じたアイコン
  const getLevelIcon = (level) => {
    switch (level) {
      case 'good': return <CheckCircle size={16} />;
      case 'fair': return <Info size={16} />;
      case 'poor': return <AlertTriangle size={16} />;
      case 'dangerous': return <XCircle size={16} />;
      default: return <Cloud size={16} />;
    }
  };

  // 風向きを日本語に
  const getWindDirection = (degrees) => {
    const directions = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東',
      '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  if (!latitude || !longitude) {
    return (
      <div className={`weather-panel ${compact ? 'compact' : ''}`}>
        <div className="weather-panel-empty">
          <Cloud size={24} />
          <p>地図上で位置を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`weather-panel ${compact ? 'compact' : ''}`}>
      {/* ヘッダー */}
      <div className="weather-panel-header">
        <div className="header-left">
          <Cloud size={18} />
          <span className="title">天候情報</span>
          {mockMode && <span className="mock-badge">DEMO</span>}
        </div>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="設定"
          >
            <Settings size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={loadWeather}
            disabled={isLoading}
            title="更新"
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="weather-settings">
          <div className="setting-row">
            <label>
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => handleMockModeChange(e.target.checked, selectedPattern)}
              />
              デモモード（モックデータ使用）
            </label>
          </div>
          {mockMode && (
            <div className="setting-row">
              <label>天候パターン:</label>
              <select
                value={selectedPattern}
                onChange={(e) => handleMockModeChange(true, e.target.value)}
              >
                {getMockPatterns().map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="setting-row">
            <label>
              <input
                type="checkbox"
                checked={simulationMode}
                onChange={(e) => {
                  setSimulationMode(e.target.checked);
                  setSimulationTime(0);
                }}
              />
              シミュレーションモード（天候変化を再現）
            </label>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="weather-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ローディング */}
      {isLoading && !weatherData && (
        <div className="weather-loading">
          <RefreshCw size={20} className="spinning" />
          <span>天候データを取得中...</span>
        </div>
      )}

      {/* 飛行条件サマリー */}
      {flightConditions && (
        <div className={`flight-condition-summary ${getLevelClass(flightConditions.overall)}`}>
          <div className="condition-icon">
            {flightConditions.weatherInfo?.icon || '🌤️'}
          </div>
          <div className="condition-info">
            <div className="condition-status">
              {getLevelIcon(flightConditions.overall)}
              <span className="status-text">
                {flightConditions.canFly ? '飛行可能' : '飛行不可'}
              </span>
            </div>
            <div className="condition-message">
              {flightConditions.overallMessage}
            </div>
          </div>
          {!compact && (
            <button
              className="toggle-details"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      )}

      {/* 詳細情報 */}
      {showDetails && weatherData?.current && (
        <div className="weather-details">
          <div className="detail-grid">
            {/* 気温 */}
            <div className="detail-item">
              <Thermometer size={16} />
              <div className="detail-content">
                <span className="detail-label">気温</span>
                <span className="detail-value">{weatherData.current.temperature?.toFixed(1)}°C</span>
              </div>
            </div>

            {/* 風速 */}
            <div className={`detail-item ${getLevelClass(flightConditions?.factors?.find(f => f.name === '風速')?.level)}`}>
              <Wind size={16} />
              <div className="detail-content">
                <span className="detail-label">風速</span>
                <span className="detail-value">
                  {weatherData.current.windSpeed?.toFixed(1)}m/s
                  <small>（突風 {weatherData.current.windGusts?.toFixed(1)}m/s）</small>
                </span>
                <span className="detail-sub">
                  {getWindDirection(weatherData.current.windDirection)}の風
                </span>
              </div>
            </div>

            {/* 降水量 */}
            <div className={`detail-item ${getLevelClass(flightConditions?.factors?.find(f => f.name === '降水')?.level)}`}>
              <Droplets size={16} />
              <div className="detail-content">
                <span className="detail-label">降水量</span>
                <span className="detail-value">{weatherData.current.precipitation?.toFixed(1)}mm/h</span>
              </div>
            </div>

            {/* 視程 */}
            <div className={`detail-item ${getLevelClass(flightConditions?.factors?.find(f => f.name === '視程')?.level)}`}>
              <Eye size={16} />
              <div className="detail-content">
                <span className="detail-label">視程</span>
                <span className="detail-value">
                  {weatherData.current.visibility >= 1000
                    ? `${(weatherData.current.visibility / 1000).toFixed(1)}km`
                    : `${weatherData.current.visibility}m`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 推奨事項 */}
          {flightConditions?.recommendations?.length > 0 && (
            <div className="recommendations">
              <div className="recommendations-header">
                <AlertTriangle size={14} />
                <span>確認事項</span>
              </div>
              <ul>
                {flightConditions.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 飛行可能時間帯 */}
          {flightConditions?.flyableHours?.length > 0 && (
            <div className="flyable-hours">
              <button
                className="flyable-hours-toggle"
                onClick={() => setShowForecast(!showForecast)}
              >
                <Clock size={14} />
                <span>飛行可能時間帯</span>
                {showForecast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showForecast && (
                <div className="flyable-hours-list">
                  {flightConditions.flyableHours.map((slot, i) => (
                    <div key={i} className="flyable-slot">
                      <Plane size={12} />
                      <span>{slot.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* データソース */}
          <div className="weather-source">
            <span>
              データ: {weatherData.source === 'open-meteo' ? 'Open-Meteo' : 'デモデータ'}
            </span>
            {weatherData.fetchedAt && (
              <span>
                更新: {new Date(weatherData.fetchedAt).toLocaleTimeString('ja-JP')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherPanel;
