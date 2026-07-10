/**
 * ドローン飛行に関する法的要件チェック (集約モジュール)
 *
 * 3つのカテゴリで飛行要件を判定:
 * 1. 航空法関連（DID、空港周辺、150m以上） - aviationLaw
 * 2. 小型無人機等飛行禁止法（重要施設、原発、米軍基地等） - smallUASLaw
 * 3. 土地・施設管理者ルール（公園、私有地等） - landManager
 *
 * 参考: https://naka4.com/drone/flightflow/
 */

import { checkAviationLaw } from './aviationLaw';
import { checkSmallUASProhibitionLaw } from './smallUASLaw';
import { checkLandManagerRules } from './landManager';
import { checkAllLegalRequirements } from './integratedCheck';
import { generateExternalLinks } from './externalLinks';
import { generateRequiredProcedures } from './procedures';

export { checkAviationLaw } from './aviationLaw';
export { checkSmallUASProhibitionLaw } from './smallUASLaw';
export { checkLandManagerRules } from './landManager';
export { checkAllLegalRequirements } from './integratedCheck';
export { generateExternalLinks } from './externalLinks';
export { generateRequiredProcedures } from './procedures';

export default {
  checkAviationLaw,
  checkSmallUASProhibitionLaw,
  checkLandManagerRules,
  checkAllLegalRequirements,
  generateExternalLinks,
  generateRequiredProcedures,
};
