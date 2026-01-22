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
  Info,
  RotateCcw,
  Plane,
  Ban,
  Home,
  Hash,
} from 'lucide-react';
import {
  hasApiKey,
  setApiKey,
  AVAILABLE_MODELS,
  getSelectedModel,
  setSelectedModel,
  testApiConnection,
  getLocalEndpoint,
  setLocalEndpoint,
  getLocalModelName,
  setLocalModelName,
  isLocalModel
} from '../../services/openaiService';
import { getSetting, setSetting, resetSettings, getWaypointNumberingMode, setWaypointNumberingMode } from '../../services/settingsService';
import ModelHelpModal from './ModelHelpModal';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import './ApiSettings.scss';

function ApiSettings({ isOpen, onClose, onApiStatusChange }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());
  const [selectedModelId, setSelectedModelId] = useState(getSelectedModel());
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | {success, message}
  const [isModelHelpOpen, setIsModelHelpOpen] = useState(false);
  const [avoidanceDistance, setAvoidanceDistance] = useState(getSetting('didAvoidanceDistance') || 100);
  const [didAvoidanceMode, setDidAvoidanceMode] = useState(getSetting('didAvoidanceMode') ?? false);
  const [didWarningOnly, setDidWarningOnly] = useState(getSetting('didWarningOnlyMode') ?? false);
  const [localEndpoint, setLocalEndpointState] = useState(getLocalEndpoint());
  const [localModelName, setLocalModelNameState] = useState(getLocalModelName());
  const [waypointNumbering, setWaypointNumbering] = useState(getWaypointNumberingMode());
  const modalRef = useRef(null);
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  // ローカルLLMが選択されているかどうか
  const isLocalSelected = isLocalModel(selectedModelId);

  // 設定変更の同期（他コンポーネントからの変更を反映）
  useEffect(() => {
    const handleStorageChange = () => {
      setAvoidanceDistance(getSetting('didAvoidanceDistance') || 100);
      setDidAvoidanceMode(getSetting('didAvoidanceMode') ?? false);
      setDidWarningOnly(getSetting('didWarningOnlyMode') ?? false);
      setWaypointNumbering(getWaypointNumberingMode());
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
  const handleDeleteApiKey = async () => {
    const confirmed = await showConfirm({
      title: 'APIキーの削除',
      message: 'OpenAI APIキーを削除しますか？',
      confirmText: '削除',
      cancelText: 'キャンセル',
      variant: 'danger'
    });
    if (confirmed) {
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
                      <Settings size={18} /> 設定
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

                      {/* ローカルLLM設定 */}
                      {isLocalSelected && (
                          <div className='local-llm-settings'>
                              <div className='local-setting-row'>
                                  <label>エンドポイント:</label>
                                  <input
                                      type='text'
                                      value={localEndpoint}
                                      onChange={(e) => {
                                          setLocalEndpointState(e.target.value);
                                          setLocalEndpoint(e.target.value);
                                      }}
                                      placeholder='http://localhost:1234/v1/chat/completions'
                                  />
                              </div>
                              <div className='local-setting-row'>
                                  <label>モデル名（任意）:</label>
                                  <input
                                      type='text'
                                      value={localModelName}
                                      onChange={(e) => {
                                          setLocalModelNameState(e.target.value);
                                          setLocalModelName(e.target.value);
                                      }}
                                      placeholder='local-model'
                                  />
                              </div>
                              <div className='settings-links'>
                                  <a
                                      href='https://lmstudio.ai/docs/developer'
                                      target='_blank'
                                      rel='noopener noreferrer'
                                  >
                                      <ExternalLink size={12} /> LM Studio ドキュメント
                                  </a>
                              </div>
                          </div>
                      )}

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
                      {(hasKey || isLocalSelected) && (
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

                      {/* 回避距離スライダー + DIDチェックボックス */}
                      <div className='avoidance-controls'>
                          <div className='slider-section'>
                              <label className='slider-label'>
                                  <span>回避距離:</span>
                                  <input
                                      type='number'
                                      min='5'
                                      max='300'
                                      step='5'
                                      value={avoidanceDistance}
                                      onChange={(e) => {
                                          const value = Math.min(300, Math.max(5, parseInt(e.target.value) || 5))
                                          setAvoidanceDistance(value)
                                          setSetting('didAvoidanceDistance', value)
                                          setSetting('airportAvoidanceMargin', value)
                                      }}
                                      className='distance-input'
                                  />
                                  <span className='unit'>m</span>
                              </label>
                              <input
                                  type='range'
                                  min='5'
                                  max='300'
                                  step='5'
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
                                  <span>5m</span>
                                  <span>100m</span>
                                  <span>200m</span>
                                  <span>300m</span>
                              </div>
                          </div>

                          <div className='did-checkboxes'>
                              <span className='did-label'><Home size={14} /> DID:</span>
                              <label className='checkbox-item'>
                                  <input
                                      type='checkbox'
                                      checked={didAvoidanceMode}
                                      onChange={(e) => {
                                          const checked = e.target.checked;
                                          setDidAvoidanceMode(checked);
                                          setSetting('didAvoidanceMode', checked);
                                          if (checked) {
                                              setDidWarningOnly(false);
                                              setSetting('didWarningOnlyMode', false);
                                          }
                                      }}
                                  />
                                  <span>回避</span>
                              </label>
                              <label className='checkbox-item'>
                                  <input
                                      type='checkbox'
                                      checked={didWarningOnly}
                                      disabled={didAvoidanceMode}
                                      onChange={(e) => {
                                          const checked = e.target.checked;
                                          setDidWarningOnly(checked);
                                          setSetting('didWarningOnlyMode', checked);
                                      }}
                                  />
                                  <span>警告のみ</span>
                              </label>
                          </div>
                      </div>

                      <hr className='settings-sub-divider' />

                      {/* 区域一覧 */}
                      <div className='zone-list'>
                          <div className='zone-item'>
                              <span className='zone-icon'><Plane size={14} /></span>
                              <span className='zone-name'>空港制限</span>
                              <span className='zone-status mandatory'>回避必須</span>
                          </div>
                          <div className='zone-item'>
                              <span className='zone-icon'><Ban size={14} /></span>
                              <span className='zone-name'>飛行禁止</span>
                              <span className='zone-status mandatory'>回避必須</span>
                          </div>
                          <div className='zone-item'>
                              <span className='zone-icon'><Home size={14} /></span>
                              <span className='zone-name'>DID</span>
                              <span className={`zone-status ${didAvoidanceMode ? 'avoidance' : didWarningOnly ? 'warning' : 'off'}`}>
                                  {didAvoidanceMode ? '回避推奨' : didWarningOnly ? '警告のみ' : 'OFF'}
                              </span>
                          </div>
                      </div>
                  </div>

                  <hr className='settings-divider' />

                  {/* Waypoint番号設定 */}
                  <div className='settings-section'>
                      <h3><Hash size={14} /> Waypoint番号</h3>
                      <div className='numbering-mode-selector'>
                          <label className='radio-item'>
                              <input
                                  type='radio'
                                  name='waypointNumbering'
                                  value='global'
                                  checked={waypointNumbering === 'global'}
                                  onChange={(e) => {
                                      setWaypointNumbering(e.target.value);
                                      setWaypointNumberingMode(e.target.value);
                                  }}
                              />
                              <span className='radio-label'>
                                  <strong>全体連番</strong>
                                  <small>WP1, WP2, ... WP20</small>
                              </span>
                          </label>
                          <label className='radio-item'>
                              <input
                                  type='radio'
                                  name='waypointNumbering'
                                  value='perPolygon'
                                  checked={waypointNumbering === 'perPolygon'}
                                  onChange={(e) => {
                                      setWaypointNumbering(e.target.value);
                                      setWaypointNumberingMode(e.target.value);
                                  }}
                              />
                              <span className='radio-label'>
                                  <strong>エリアごと連番</strong>
                                  <small>東京-WP1, 大阪-WP1, ...</small>
                              </span>
                          </label>
                      </div>
                  </div>

                  <div className='settings-footer'>
                      <p className='settings-note'>
                          ※ 設定はブラウザに保存（サーバー送信なし）
                      </p>
                      <button
                          className='reset-btn'
                          onClick={async () => {
                              const confirmed = await showConfirm({
                                  title: '設定リセット',
                                  message: '判定設定をデフォルトに戻しますか？（APIキーは削除されません）',
                                  confirmText: 'リセット',
                                  cancelText: 'キャンセル',
                                  variant: 'warning'
                              });
                              if (confirmed) {
                                  resetSettings();
                                  setAvoidanceDistance(100);
                                  setDidAvoidanceMode(false);
                                  setDidWarningOnly(false);
                                  setWaypointNumbering('global');
                              }
                          }}
                      >
                          <RotateCcw size={12} />
                          設定リセット
                      </button>
                  </div>
              </div>
          </div>
          {isModelHelpOpen && (
              <ModelHelpModal onClose={() => setIsModelHelpOpen(false)} />
          )}
          <ConfirmDialog
              isOpen={dialogState.isOpen}
              title={dialogState.title}
              message={dialogState.message}
              confirmText={dialogState.confirmText}
              cancelText={dialogState.cancelText}
              variant={dialogState.variant}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
          />
      </div>
  )
}

export default ApiSettings;
