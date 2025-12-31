/**
 * チャットログ保存サービス
 * localStorage を使用してチャット履歴を保存・管理
 */

const STORAGE_KEY = 'flight_assistant_chat_logs';

/**
 * 保存されているすべてのチャットログを取得
 * @returns {Array} チャットログの配列
 */
export const getAllChatLogs = () => {
  try {
    const logs = localStorage.getItem(STORAGE_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Failed to load chat logs:', error);
    return [];
  }
};

/**
 * 新しいチャットログを保存
 * @param {Object} chatLog - 保存するチャットログ
 * @param {string} chatLog.name - ログの名前
 * @param {Array} chatLog.messages - メッセージ配列
 * @param {Object} chatLog.assessmentResult - 判定結果（任意）
 * @returns {Object} 保存されたチャットログ（IDを含む）
 */
export const saveChatLog = (chatLog) => {
  try {
    const logs = getAllChatLogs();
    const newLog = {
      id: Date.now().toString(),
      name: chatLog.name || `チャットログ ${new Date().toLocaleString('ja-JP')}`,
      messages: chatLog.messages,
      assessmentResult: chatLog.assessmentResult || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    logs.unshift(newLog); // 新しいログを先頭に追加
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    return newLog;
  } catch (error) {
    console.error('Failed to save chat log:', error);
    throw error;
  }
};

/**
 * チャットログを更新
 * @param {string} id - 更新するログのID
 * @param {Object} updates - 更新内容
 * @returns {Object|null} 更新されたチャットログ
 */
export const updateChatLog = (id, updates) => {
  try {
    const logs = getAllChatLogs();
    const index = logs.findIndex(log => log.id === id);

    if (index === -1) {
      return null;
    }

    logs[index] = {
      ...logs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return logs[index];
  } catch (error) {
    console.error('Failed to update chat log:', error);
    throw error;
  }
};

/**
 * チャットログを削除
 * @param {string} id - 削除するログのID
 * @returns {boolean} 削除成功かどうか
 */
export const deleteChatLog = (id) => {
  try {
    const logs = getAllChatLogs();
    const filteredLogs = logs.filter(log => log.id !== id);

    if (filteredLogs.length === logs.length) {
      return false; // 削除対象が見つからなかった
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLogs));
    return true;
  } catch (error) {
    console.error('Failed to delete chat log:', error);
    throw error;
  }
};

/**
 * 特定のチャットログを取得
 * @param {string} id - 取得するログのID
 * @returns {Object|null} チャットログ
 */
export const getChatLog = (id) => {
  const logs = getAllChatLogs();
  return logs.find(log => log.id === id) || null;
};

/**
 * すべてのチャットログを削除
 */
export const clearAllChatLogs = () => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * チャットログをエクスポート（JSON形式）
 * @returns {string} JSON文字列
 */
export const exportChatLogs = () => {
  const logs = getAllChatLogs();
  return JSON.stringify(logs, null, 2);
};

/**
 * チャットログをインポート
 * @param {string} jsonString - インポートするJSON文字列
 * @param {boolean} merge - 既存のログとマージするかどうか
 * @returns {number} インポートされたログの数
 */
export const importChatLogs = (jsonString, merge = true) => {
  try {
    const importedLogs = JSON.parse(jsonString);

    if (!Array.isArray(importedLogs)) {
      throw new Error('Invalid format: expected an array');
    }

    if (merge) {
      const existingLogs = getAllChatLogs();
      const existingIds = new Set(existingLogs.map(log => log.id));
      const newLogs = importedLogs.filter(log => !existingIds.has(log.id));
      const mergedLogs = [...newLogs, ...existingLogs];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLogs));
      return newLogs.length;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedLogs));
      return importedLogs.length;
    }
  } catch (error) {
    console.error('Failed to import chat logs:', error);
    throw error;
  }
};
