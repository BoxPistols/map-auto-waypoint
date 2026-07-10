/**
 * 統合された法的要件チェック
 * 3カテゴリすべての法令を一度にチェックする
 */

import { checkAviationLaw } from './aviationLaw';
import { checkSmallUASProhibitionLaw } from './smallUASLaw';
import { checkLandManagerRules } from './landManager';
import { generateRequiredProcedures } from './procedures';

/**
 * 3カテゴリすべての法的要件をチェック
 *
 * @param {Object} context - チェック対象の情報
 * @returns {Promise<Object>} 統合チェック結果
 */
export const checkAllLegalRequirements = async (context) => {
  const [aviationLaw, prohibitionLaw, landManager] = await Promise.all([
    checkAviationLaw(context),
    Promise.resolve(checkSmallUASProhibitionLaw(context)),
    Promise.resolve(checkLandManagerRules(context)),
  ]);

  // 全体のステータスを判定
  const allItems = [
    ...aviationLaw.items,
    ...prohibitionLaw.items,
    ...landManager.items,
  ];

  const hasError = allItems.some(item => item.status === 'error');
  const hasWarning = allItems.some(item => item.status === 'warning');

  let overallStatus = 'ok';
  let overallStatusText = '問題なし';

  if (hasError) {
    overallStatus = 'error';
    overallStatusText = '要対応';
  } else if (hasWarning) {
    overallStatus = 'warning';
    overallStatusText = '要確認';
  }

  // 必要な手続きをリストアップ
  const procedures = generateRequiredProcedures({
    aviationLaw,
    prohibitionLaw,
    landManager,
  });

  return {
    overallStatus,
    overallStatusText,
    categories: [aviationLaw, prohibitionLaw, landManager],
    procedures,
    checkedAt: new Date().toISOString(),
    context,
  };
};
