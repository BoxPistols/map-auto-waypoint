import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  CheckCircle,
  Trash2,
  ExternalLink,
  Zap,
  AlertCircle,
  Loader,
  Info
} from 'lucide-react';
import {
  hasApiKey,
  setApiKey,
  AVAILABLE_MODELS,
  getSelectedModel,
  setSelectedModel,
  testApiConnection
} from '../../services/openaiService';
import { getSetting, setSetting } from '../../services/settingsService';
import ModelHelpModal from './ModelHelpModal';
import './ApiSettings.scss';

function ApiSettings({ isOpen, onClose, onApiStatusChange }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());
  const [selectedModelId, setSelectedModelId] = useState(getSelectedModel());
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | {success, message}
  const [isModelHelpOpen, setIsModelHelpOpen] = useState(false);
  const [didAvoidanceMode, setDidAvoidanceMode] = useState(getSetting('didAvoidanceMode'));
  const [didWarningOnlyMode, setDidWarningOnlyMode] = useState(getSetting('didWarningOnlyMode'));
  const [avoidanceDistance, setAvoidanceDistance] = useState(getSetting('didAvoidanceDistance') || 100);
  const [_airportMargin, _setAirportMargin] = useState(getSetting('airportAvoidanceMargin') || 300);
  const modalRef = useRef(null);

  // 設定変更の同期（他コンポーネントからの変更を反映）
  useEffect(() => {
    const handleStorageChange = () => {
      setDidAvoidanceMode(getSetting('didAvoidanceMode'));
      setDidWarningOnlyMode(getSetting('didWarningOnlyMode'));
      setAvoidanceDistance(getSetting('didAvoidanceDistance') || 100);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // 状態変更を親に通知
  const notifyStatusChange = (type, status) => {
    if (onApiStatusChange) {
      onApiStatusChange({ type, status });
    }
  };

  // OpenAI APIキー保存
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setHasKey(true);
      setApiKeyInput('');
      notifyStatusChange('openai', 'saved');
    }
  };

  // OpenAI APIキー削除
  const handleDeleteApiKey = () => {
    if (confirm('OpenAI APIキーを削除しますか？')) {
      localStorage.removeItem('openai_api_key');
      setHasKey(false);
      notifyStatusChange('openai', 'deleted');
    }
  };

  // モデル変更
  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    setSelectedModelId(modelId);
    notifyStatusChange('model', modelId);
  };

  // 接続テスト
  const handleTestConnection = async () => {
    setTestStatus('testing');
    const result = await testApiConnection();
    setTestStatus(result);
    // 5秒後にステータスをクリア
    setTimeout(() => setTestStatus(null), 5000);
  };

  if (!isOpen) return null;

  return (
      <div className='api-settings-overlay'>
          <div className='api-settings-modal' ref={modalRef}>
              <div className='modal-header'>
                  <h2>
                      <Settings size={18} /> API設定
                  </h2>
                  <button className='close-btn' onClick={onClose}>
                      <X size={18} />
                  </button>
              </div>

              <div className='modal-content'>
                  {/* OpenAI API */}
                  <div className='settings-section'>
                      <h3>OpenAI API（オプション）</h3>
                      <div className='settings-info'>
                          <p>高度なAI分析が有効になります：</p>
                          <ul>
                              <li>自然言語での質問応答</li>
                              <li>詳細なアドバイス生成</li>
                          </ul>
                      </div>

                      {/* モデル選択 */}
                      <div className='model-selector'>
                          <div className='model-label'>
                              <label>AIモデル:</label>
                              <button
                                  type='button'
                                  className='model-help-btn'
                                  onClick={() => setIsModelHelpOpen(true)}
                                  aria-label='AIモデルの違いを表示'
                              >
                                  <Info size={16} />
                              </button>
                          </div>
                          <select
                              value={selectedModelId}
                              onChange={(e) =>
                                  handleModelChange(e.target.value)
                              }
                          >
                              {AVAILABLE_MODELS.map((model) => (
                                  <option key={model.id} value={model.id}>
                                      {model.name} ({model.cost}) -{' '}
                                      {model.description}
                                  </option>
                              ))}
                          </select>
                      </div>

                      {hasKey ? (
                          <div className='api-key-status'>
                              <div className='status-row'>
                                  <CheckCircle size={16} className='success' />
                                  <span>APIキー設定済み</span>
                              </div>
                              <button className='delete-btn' onClick={handleDeleteApiKey}>
                                  <Trash2 size={14} /> 削除
                              </button>
                          </div>
                      ) : (
                          <div className='api-key-input'>
                              <input
                                  type='password'
                                  value={apiKeyInput}
                                  onChange={(e) => setApiKeyInput(e.target.value)}
                                  placeholder='sk-...'
                              />
                              <button
                                  className='save-btn'
                                  onClick={handleSaveApiKey}
                                  disabled={!apiKeyInput.trim()}
                              >
                                  保存
                              </button>
                          </div>
                      )}

                      <div className='settings-links'>
                          <a
                              href='https://platform.openai.com/api-keys'
                              target='_blank'
                              rel='noopener noreferrer'
                          >
                              <ExternalLink size={12} /> APIキーを取得
                          </a>
                      </div>

                      {/* 接続テストボタン */}
                      {hasKey && (
                          <div className='connection-test'>
                              <button
                                  className={`test-btn ${
                                      testStatus === 'testing' ? 'testing' : ''
                                  }`}
                                  onClick={handleTestConnection}
                                  disabled={testStatus === 'testing'}
                              >
                                  {testStatus === 'testing' ? (
                                      <>
                                          <Loader size={14} className='spin' />{' '}
                                          テスト中...
                                      </>
                                  ) : (
                                      <>
                                          <Zap size={14} /> 接続テスト
                                      </>
                                  )}
                              </button>
                              {testStatus && testStatus !== 'testing' && (
                                  <div
                                      className={`test-result ${
                                          testStatus.success
                                              ? 'success'
                                              : 'error'
                                      }`}
                                  >
                                      {testStatus.success ? (
                                          <>
                                              <CheckCircle size={14} />{' '}
                                              {testStatus.message} (
                                              {testStatus.model})
                                          </>
                                      ) : (
                                          <>
                                              <AlertCircle size={14} />{' '}
                                              {testStatus.message}
                                          </>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <hr className='settings-divider' />

                  {/* 判定設定 */}
                  <div className='settings-section'>
                      <h3>回避設定</h3>

                      {/* 回避距離スライダー */}
                      <div className='slider-setting'>
                          <label className='slider-label'>
                              <span>
                                  回避距離:{' '}
                                  <strong>{avoidanceDistance}m</strong>
                              </span>
                          </label>
                          <input
                              type='range'
                              min='50'
                              max='300'
                              step='10'
                              value={avoidanceDistance}
                              onChange={(e) => {
                                  const value = parseInt(e.target.value)
                                  setAvoidanceDistance(value)
                                  setSetting('didAvoidanceDistance', value)
                                  setSetting('airportAvoidanceMargin', value)
                              }}
                              className='distance-slider'
                          />
                          <div className='slider-labels'>
                              <span>最小 50m</span>
                              <span>標準 100m</span>
                              <span>安全 200m</span>
                              <span>300m</span>
                          </div>
                          <p className='slider-description'>
                              制限区域境界からの推奨離隔距離
                          </p>
                      </div>

                      <hr className='settings-sub-divider' />

                      {/* DID設定 */}
                      <div className='toggle-setting'>
                          <label className='toggle-label'>
                              <input
                                  type='checkbox'
                                  checked={didAvoidanceMode}
                                  onChange={(e) => {
                                      const enabled = e.target.checked
                                      setDidAvoidanceMode(enabled)
                                      setSetting('didAvoidanceMode', enabled)
                                      if (enabled) {
                                          setDidWarningOnlyMode(false)
                                          setSetting(
                                              'didWarningOnlyMode',
                                              false
                                          )
                                      }
                                      notifyStatusChange(
                                          'didAvoidance',
                                          enabled
                                      )
                                  }}
                              />
                              <span className='toggle-text'>DID回避モード</span>
                          </label>
                          <p className='toggle-description'>
                              DID内のWPに対して回避位置をサジェスト
                          </p>
                      </div>

                      {!didAvoidanceMode && (
                          <div className='toggle-setting sub-setting'>
                              <label className='toggle-label'>
                                  <input
                                      type='checkbox'
                                      checked={didWarningOnlyMode}
                                      onChange={(e) => {
                                          const enabled = e.target.checked
                                          setDidWarningOnlyMode(enabled)
                                          setSetting(
                                              'didWarningOnlyMode',
                                              enabled
                                          )
                                      }}
                                  />
                                  <span className='toggle-text'>
                                      DID警告のみ
                                  </span>
                              </label>
                              <p className='toggle-description'>
                                  回避提案なし（DIPS許可申請前提）
                              </p>
                          </div>
                      )}

                      <hr className='settings-sub-divider' />

                      {/* 空港回避（常にON） */}
                      <div className='info-setting'>
                          <span className='setting-icon'>✈️</span>
                          <div className='setting-content'>
                              <span className='setting-title'>
                                  空港制限区域
                              </span>
                              <p className='setting-description'>
                                  回避必須（{avoidanceDistance}m離隔）
                              </p>
                          </div>
                      </div>

                      <div className='info-setting'>
                          <span className='setting-icon'>⛔</span>
                          <div className='setting-content'>
                              <span className='setting-title'>
                                  飛行禁止区域
                              </span>
                              <p className='setting-description'>
                                  回避必須（{avoidanceDistance}m離隔）
                              </p>
                          </div>
                      </div>
                  </div>

                  <p className='settings-note'>
                      ※ 設定はブラウザに保存（サーバー送信なし）
                  </p>
              </div>
          </div>
          {isModelHelpOpen && (
              <ModelHelpModal onClose={() => setIsModelHelpOpen(false)} />
          )}
      </div>
  )
}

export default ApiSettings;
