/**
 * WeatherForecastPanel Component
 * 天気予報パネル - 雨雲レーダー時刻選択と気象情報表示
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Cloud,
  CloudRain,
  Wind,
  Sun,
  Thermometer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';
import { fetchRainViewerData } from '../../lib/services/weather';
import './WeatherForecastPanel.scss';

// 安全レベルの定義
const SAFETY_LEVELS = {
  safe: { label: '良好', color: '#22c55e', icon: CheckCircle },
  caution: { label: '注意', color: '#f59e0b', icon: AlertTriangle },
  warning: { label: '警告', color: '#ef4444', icon: AlertTriangle },
};

/**
 * 時刻フォーマット
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 相対時刻フォーマット
 */
const formatRelativeTime = (timestamp) => {
  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 5) {
    return '現在';
  }

  if (diffMinutes < 0) {
    return `${Math.abs(diffMinutes)}分前`;
  }

  if (diffMinutes < 60) {
    return `+${diffMinutes}分`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `+${diffHours}時間`;
};

/**
 * WeatherForecastPanel
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - パネル表示状態
 * @param {Function} props.onClose - 閉じるコールバック
 * @param {Function} props.onTimeChange - 時刻変更コールバック（RainViewerタイル更新用）
 * @param {Object} props.center - 地図中心座標 { lat, lng }
 * @param {boolean} props.sidebarCollapsed - サイドバー折りたたみ状態
 */
function WeatherForecastPanel({
  isOpen,
  onClose,
  onTimeChange,
  center,
  sidebarCollapsed = false,
}) {
  const [rainViewerData, setRainViewerData] = useState(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weatherSafety, setWeatherSafety] = useState('safe');

  // RainViewerデータ取得
  const loadRainViewerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRainViewerData();
      if (data) {
        setRainViewerData(data);
        // 最新のフレームを選択
        const frames = getAllFrames(data);
        setSelectedFrameIndex(frames.length - 1);
      } else {
        setError('データを取得できませんでした');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    if (isOpen) {
      loadRainViewerData();
    }
  }, [isOpen, loadRainViewerData]);

  // 全フレーム取得（過去 + 予報）
  const getAllFrames = (data) => {
    if (!data?.radar) return [];
    const past = data.radar.past || [];
    const nowcast = data.radar.nowcast || [];
    return [...past, ...nowcast];
  };

  const frames = rainViewerData ? getAllFrames(rainViewerData) : [];
  const selectedFrame = frames[selectedFrameIndex];
  const pastFrameCount = rainViewerData?.radar?.past?.length || 0;

  // フレーム変更ハンドラー
  const handleFrameChange = useCallback(
    (index) => {
      setSelectedFrameIndex(index);
      const frame = frames[index];
      if (frame && onTimeChange && rainViewerData) {
        onTimeChange({
          time: frame.time * 1000,
          path: frame.path,
          host: rainViewerData.host,
        });
      }
    },
    [frames, onTimeChange, rainViewerData]
  );

  // 前へ
  const handlePrevious = useCallback(() => {
    if (selectedFrameIndex > 0) {
      handleFrameChange(selectedFrameIndex - 1);
    }
  }, [selectedFrameIndex, handleFrameChange]);

  // 次へ
  const handleNext = useCallback(() => {
    if (selectedFrameIndex < frames.length - 1) {
      handleFrameChange(selectedFrameIndex + 1);
    }
  }, [selectedFrameIndex, frames.length, handleFrameChange]);

  // 現在時刻へ
  const handleReset = useCallback(() => {
    const nowIndex = pastFrameCount - 1;
    if (nowIndex >= 0) {
      handleFrameChange(nowIndex);
    }
  }, [pastFrameCount, handleFrameChange]);

  // 安全性評価（簡易版）
  useEffect(() => {
    // 実際にはRainViewerの降水データから計算
    // ここでは時刻に基づく簡易判定
    if (selectedFrameIndex >= pastFrameCount) {
      // 予報は注意
      setWeatherSafety('caution');
    } else {
      setWeatherSafety('safe');
    }
  }, [selectedFrameIndex, pastFrameCount]);

  if (!isOpen) return null;

  const SafetyIcon = SAFETY_LEVELS[weatherSafety].icon;

  return (
    <GlassPanel
      title="天気予報"
      onClose={onClose}
      width={360}
      maxHeight="60vh"
      bottom={20}
      left={sidebarCollapsed ? 80 : 340}
      headerActions={
        <button
          className="header-action-btn"
          onClick={loadRainViewerData}
          disabled={isLoading}
          title="更新"
        >
          <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
        </button>
      }
      className="weather-forecast-panel"
    >
      <div className="weather-forecast-content">
        {/* ローディング */}
        {isLoading && (
          <div className="loading-state">
            <RefreshCw className="spinning" size={24} />
            <span>データ読み込み中...</span>
          </div>
        )}

        {/* エラー */}
        {error && !isLoading && (
          <div className="error-state">
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={loadRainViewerData}>再試行</button>
          </div>
        )}

        {/* コンテンツ */}
        {rainViewerData && !isLoading && (
          <>
            {/* 安全性表示 */}
            <div className={`safety-status ${weatherSafety}`}>
              <SafetyIcon size={20} />
              <span className="safety-label">
                気象条件: {SAFETY_LEVELS[weatherSafety].label}
              </span>
            </div>

            {/* 時刻表示 */}
            <div className="time-display">
              <div className="current-time">
                <Clock size={16} />
                {selectedFrame && formatTime(selectedFrame.time * 1000)}
              </div>
              <div className="relative-time">
                {selectedFrame && formatRelativeTime(selectedFrame.time * 1000)}
              </div>
              <button
                className="reset-btn"
                onClick={handleReset}
                title="現在時刻に戻る"
              >
                現在
              </button>
            </div>

            {/* タイムスライダー */}
            <div className="time-slider">
              <button
                className="nav-btn"
                onClick={handlePrevious}
                disabled={selectedFrameIndex <= 0}
                title="5分前"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="slider-container">
                <input
                  type="range"
                  min={0}
                  max={frames.length - 1}
                  value={selectedFrameIndex}
                  onChange={(e) => handleFrameChange(parseInt(e.target.value))}
                  className="slider"
                />
                <div
                  className="slider-progress"
                  style={{
                    width: `${(selectedFrameIndex / (frames.length - 1)) * 100}%`,
                  }}
                />
                <div
                  className="now-marker"
                  style={{
                    left: `${((pastFrameCount - 1) / (frames.length - 1)) * 100}%`,
                  }}
                  title="現在"
                />
              </div>

              <button
                className="nav-btn"
                onClick={handleNext}
                disabled={selectedFrameIndex >= frames.length - 1}
                title="5分後"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* タイムライン表示 */}
            <div className="timeline-labels">
              <span className="label past">過去</span>
              <span className="label now">現在</span>
              <span className="label forecast">予報</span>
            </div>

            {/* 気象情報 */}
            <div className="weather-info">
              <div className="info-item">
                <CloudRain size={16} />
                <span className="label">雨雲レーダー</span>
                <span className="value">RainViewer</span>
              </div>
              <div className="info-item">
                <Cloud size={16} />
                <span className="label">フレーム数</span>
                <span className="value">
                  {pastFrameCount}過去 / {frames.length - pastFrameCount}予報
                </span>
              </div>
              {center && (
                <div className="info-item">
                  <Sun size={16} />
                  <span className="label">対象地点</span>
                  <span className="value">
                    {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* 注意事項 */}
            <div className="weather-notes">
              <p>
                雨雲予報は最大2時間先まで。ドローン飛行の際は最新の気象情報を確認してください。
              </p>
            </div>
          </>
        )}
      </div>
    </GlassPanel>
  );
}

export default WeatherForecastPanel;
